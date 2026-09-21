import dagre from "@dagrejs/dagre";
import type { EntityNode, RelationshipEdge, EntityField } from "@/types/canvas";

export type LayoutDirection = "TB" | "LR";

const NODE_WIDTH = 280;
const HEADER_HEIGHT = 44;
const FIELD_ROW_HEIGHT = 34;
const FOOTER_HEIGHT = 36;
const EXTRA_PADDING = 16;

/**
 * Estimate node height dynamically based on fields count, issues, and preview state.
 */
export function estimateNodeHeight(node: EntityNode): number {
  const fields = node.data.fields || [];
  const fieldsCount = fields.length;
  const issuesCount = node.data.issues?.length || 0;
  const isPreview = Boolean(node.data.isPreview);

  // Calculate height including expanded FK selectors
  const expandedFkCount = fields.filter((f) => f.isForeignKey).length;
  const fkSelectorHeight = expandedFkCount * 28;

  let height = HEADER_HEIGHT + fieldsCount * FIELD_ROW_HEIGHT + fkSelectorHeight + FOOTER_HEIGHT + EXTRA_PADDING;
  if (issuesCount > 0) height += 28;
  if (isPreview) height += 24;

  return Math.max(height, 130);
}

/**
 * Determine the optimal field-level or card-level handles for an edge.
 */
export function resolveEdgeHandles(
  edge: RelationshipEdge,
  nodesById: Map<string, EntityNode>,
  nodeCenterMap: Map<string, { x: number; y: number }>,
  direction: LayoutDirection = "TB"
): { sourceHandle: string; targetHandle: string } {
  const sourceNode = nodesById.get(edge.source);
  const targetNode = nodesById.get(edge.target);
  const sourceCenter = nodeCenterMap.get(edge.source);
  const targetCenter = nodeCenterMap.get(edge.target);

  if (!sourceNode || !targetNode || !sourceCenter || !targetCenter) {
    return { sourceHandle: "source-right", targetHandle: "target-left" };
  }

  // 1. Look for specific FK field in source pointing to target
  const sourceFields: EntityField[] = sourceNode.data.fields || [];
  const targetFields: EntityField[] = targetNode.data.fields || [];

  const fkField = sourceFields.find(
    (f) => f.isForeignKey && (f.referencesEntityId === targetNode.id || f.referencesEntityId === targetNode.data.name)
  );

  const pkField = targetFields.find(
    (f) => (fkField?.referencesFieldId && f.id === fkField.referencesFieldId) || f.isPrimaryKey
  ) || targetFields[0];

  const isTargetToTheRight = targetCenter.x >= sourceCenter.x;
  const isTargetBelow = targetCenter.y >= sourceCenter.y;

  // 2. If both fields exist, use field-level horizontal connection ports
  if (fkField && pkField) {
    if (isTargetToTheRight) {
      return {
        sourceHandle: `field-source-right-${fkField.id}`,
        targetHandle: `field-target-left-${pkField.id}`,
      };
    } else {
      return {
        sourceHandle: `field-source-left-${fkField.id}`,
        targetHandle: `field-target-right-${pkField.id}`,
      };
    }
  }

  // 3. Fallback to card-level handles if no specific FK field is matched
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  if (direction === "TB") {
    if (Math.abs(dy) > Math.abs(dx) * 1.2) {
      // Primarily vertical
      return dy < 0
        ? { sourceHandle: "source-top", targetHandle: "target-bottom" }
        : { sourceHandle: "source-bottom", targetHandle: "target-top" };
    } else {
      // Primarily horizontal
      return dx < 0
        ? { sourceHandle: "source-left", targetHandle: "target-right" }
        : { sourceHandle: "source-right", targetHandle: "target-left" };
    }
  } else {
    // Primarily horizontal (LR)
    if (Math.abs(dx) > Math.abs(dy) * 1.2) {
      return dx < 0
        ? { sourceHandle: "source-left", targetHandle: "target-right" }
        : { sourceHandle: "source-right", targetHandle: "target-left" };
    } else {
      return dy < 0
        ? { sourceHandle: "source-top", targetHandle: "target-bottom" }
        : { sourceHandle: "source-bottom", targetHandle: "target-top" };
    }
  }
}

/**
 * Smart Auto Layout using Dagre relationship-aware ranking and crossing minimization.
 */
export function getLayoutedElements(
  nodes: EntityNode[],
  edges: RelationshipEdge[],
  direction: LayoutDirection = "TB"
): { nodes: EntityNode[]; edges: RelationshipEdge[] } {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    ranker: "network-simplex", // Optimal network-simplex ranking to minimize line length & crossings
    nodesep: direction === "TB" ? 90 : 80, // Horizontal channel width between sibling nodes
    ranksep: direction === "TB" ? 140 : 160, // Vertical rank corridor for clean orthogonal routing
    marginx: 80,
    marginy: 80,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodesById = new Map<string, EntityNode>();
  const nodeDimensions = new Map<string, { width: number; height: number }>();

  nodes.forEach((node) => {
    nodesById.set(node.id, node);
    const width = NODE_WIDTH;
    const height = estimateNodeHeight(node);
    nodeDimensions.set(node.id, { width, height });
    g.setNode(node.id, { width, height });
  });

  // Set edges in Dagre: Orient from Referenced Parent -> Dependent Child
  // with higher weight for tightly-coupled tables
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      // Parent (target) -> Child (source)
      g.setEdge(edge.target, edge.source, {
        weight: 2, // High weight keeps connected tables grouped in adjacent columns
        minlen: 1,
      });
    }
  });

  dagre.layout(g);

  // Position nodes
  const nodeCenterMap = new Map<string, { x: number; y: number }>();

  const layoutedNodes: EntityNode[] = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    const dims = nodeDimensions.get(node.id) || { width: NODE_WIDTH, height: 160 };

    if (!dagreNode) {
      return node;
    }

    const x = Math.round(dagreNode.x - dims.width / 2);
    const y = Math.round(dagreNode.y - dims.height / 2);

    nodeCenterMap.set(node.id, { x: dagreNode.x, y: dagreNode.y });

    return {
      ...node,
      position: { x, y },
    };
  });

  // Resolve optimal field-level handles for all edges
  const layoutedEdges: RelationshipEdge[] = edges.map((edge) => {
    const { sourceHandle, targetHandle } = resolveEdgeHandles(
      edge,
      nodesById,
      nodeCenterMap,
      direction
    );

    return {
      ...edge,
      sourceHandle,
      targetHandle,
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
