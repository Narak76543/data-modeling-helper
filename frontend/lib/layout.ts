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
  if (node.data.isCollapsed) {
    return HEADER_HEIGHT + 4;
  }

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
 * Systematic Muted Color Palette for relationship lines (Issue 3 / ui-style-guide.md).
 * Deterministically color-codes edges by source entity.
 */
export const EDGE_PALETTE = [
  { light: "#1E3A5F", dark: "#6FA0C9" }, // Slate Blue (Default)
  { light: "#2E6F68", dark: "#6AB8AF" }, // Steel Teal
  { light: "#5C4D82", dark: "#9D8BC9" }, // Muted Violet
  { light: "#8C6527", dark: "#C7A263" }, // Muted Ochre
  { light: "#8E4B3E", dark: "#C97E72" }, // Muted Rust
];

export function getEdgeColor(sourceIdOrName: string, isDark: boolean = false): string {
  if (!sourceIdOrName) return isDark ? EDGE_PALETTE[0].dark : EDGE_PALETTE[0].light;
  let hash = 0;
  for (let i = 0; i < sourceIdOrName.length; i++) {
    hash = (hash << 5) - hash + sourceIdOrName.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % EDGE_PALETTE.length;
  return isDark ? EDGE_PALETTE[idx].dark : EDGE_PALETTE[idx].light;
}

/**
 * Determine the optimal field-level handles for an edge with fallback.
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

  const sourceFields: EntityField[] = sourceNode.data.fields || [];
  const targetFields: EntityField[] = targetNode.data.fields || [];

  // Check 1: Explicit field IDs in edge data or handles
  const explicitSourceFieldId = (edge.data as any)?.sourceFieldId;
  const explicitTargetFieldId = (edge.data as any)?.targetFieldId;

  let sourceField = sourceFields.find((f) => f.id === explicitSourceFieldId);
  let targetField = targetFields.find((f) => f.id === explicitTargetFieldId);

  // Check 2: Bidirectional foreign key lookup
  if (!sourceField || !targetField) {
    // Normal direction: source has FK pointing to target
    const fkInSource = sourceFields.find(
      (f) =>
        f.isForeignKey &&
        (f.referencesEntityId === targetNode.id ||
          f.referencesEntityId === targetNode.data.name ||
          (edge.data as any)?.sourceField === f.name)
    );
    if (fkInSource) {
      sourceField = fkInSource;
      targetField =
        targetFields.find(
          (f) => (fkInSource.referencesFieldId && f.id === fkInSource.referencesFieldId) || f.isPrimaryKey
        ) || targetFields[0];
    } else {
      // Reverse direction: target has FK pointing to source
      const fkInTarget = targetFields.find(
        (f) =>
          f.isForeignKey &&
          (f.referencesEntityId === sourceNode.id ||
            f.referencesEntityId === sourceNode.data.name ||
            (edge.data as any)?.targetField === f.name)
      );
      if (fkInTarget) {
        targetField = fkInTarget;
        sourceField =
          sourceFields.find(
            (f) => (fkInTarget.referencesFieldId && f.id === fkInTarget.referencesFieldId) || f.isPrimaryKey
          ) || sourceFields[0];
      }
    }
  }

  // Fallback to first PK or first field if still undefined
  if (!sourceField) {
    sourceField = sourceFields.find((f) => f.isPrimaryKey) || sourceFields[0];
  }
  if (!targetField) {
    targetField = targetFields.find((f) => f.isPrimaryKey) || targetFields[0];
  }

  const isTargetToTheRight = targetCenter.x >= sourceCenter.x;

  // Use horizontal field connection handles
  if (sourceField && targetField) {
    if (isTargetToTheRight) {
      return {
        sourceHandle: `field-source-right-${sourceField.id}`,
        targetHandle: `field-target-left-${targetField.id}`,
      };
    } else {
      return {
        sourceHandle: `field-source-left-${sourceField.id}`,
        targetHandle: `field-target-right-${targetField.id}`,
      };
    }
  }

  // Card-level fallback only if entities have 0 fields
  const dx = targetCenter.x - sourceCenter.x;
  return dx >= 0
    ? { sourceHandle: "source-right", targetHandle: "target-left" }
    : { sourceHandle: "source-left", targetHandle: "target-right" };
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
    nodesep: direction === "TB" ? 100 : 90, // Spacious horizontal channel width between sibling nodes
    ranksep: direction === "TB" ? 150 : 170, // Vertical rank corridor for clean orthogonal routing
    edgesep: 30, // Minimum separation between parallel edges to prevent overlapping
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
