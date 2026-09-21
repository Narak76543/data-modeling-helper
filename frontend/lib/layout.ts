import dagre from "@dagrejs/dagre";
import type { EntityNode, RelationshipEdge } from "@/types/canvas";

export type LayoutDirection = "TB" | "LR";

const NODE_WIDTH = 290;
const HEADER_HEIGHT = 44;
const FIELD_ROW_HEIGHT = 33;
const FOOTER_HEIGHT = 36;
const EXTRA_PADDING = 20;

/**
 * Estimate node height dynamically based on fields count, issues, and preview state.
 */
export function estimateNodeHeight(node: EntityNode): number {
  const fieldsCount = node.data.fields?.length || 0;
  const issuesCount = node.data.issues?.length || 0;
  const isPreview = Boolean(node.data.isPreview);

  let height = HEADER_HEIGHT + fieldsCount * FIELD_ROW_HEIGHT + FOOTER_HEIGHT + EXTRA_PADDING;
  if (issuesCount > 0) height += 28;
  if (isPreview) height += 26;

  return Math.max(height, 120);
}

/**
 * Determine the optimal sourceHandle and targetHandle based on relative center positions.
 */
export function resolveOptimalHandles(
  sourceCenter: { x: number; y: number },
  targetCenter: { x: number; y: number },
  direction: LayoutDirection = "TB"
): { sourceHandle: string; targetHandle: string } {
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  if (direction === "TB") {
    // Primarily vertical relationship
    if (dy < -60) {
      // Target is significantly above source
      return { sourceHandle: "source-top", targetHandle: "target-bottom" };
    } else if (dy > 60) {
      // Target is significantly below source
      return { sourceHandle: "source-bottom", targetHandle: "target-top" };
    } else {
      // Relatively horizontal
      if (dx < 0) {
        return { sourceHandle: "source-left", targetHandle: "target-right" };
      } else {
        return { sourceHandle: "source-right", targetHandle: "target-left" };
      }
    }
  } else {
    // Primarily horizontal relationship (LR)
    if (dx < -60) {
      // Target is significantly to the left
      return { sourceHandle: "source-left", targetHandle: "target-right" };
    } else if (dx > 60) {
      // Target is significantly to the right
      return { sourceHandle: "source-right", targetHandle: "target-left" };
    } else {
      // Relatively vertical
      if (dy < 0) {
        return { sourceHandle: "source-top", targetHandle: "target-bottom" };
      } else {
        return { sourceHandle: "source-bottom", targetHandle: "target-top" };
      }
    }
  }
}

/**
 * Layout nodes and edges using Dagre DAG algorithm.
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
    nodesep: direction === "TB" ? 70 : 80,
    ranksep: direction === "TB" ? 90 : 110,
    marginx: 60,
    marginy: 60,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Map of estimated node dimensions
  const nodeDimensions = new Map<string, { width: number; height: number }>();

  nodes.forEach((node) => {
    const width = NODE_WIDTH;
    const height = estimateNodeHeight(node);
    nodeDimensions.set(node.id, { width, height });
    g.setNode(node.id, { width, height });
  });

  // In relational DB schemas, a FK points from dependent/child table (source) to parent table (target).
  // In Dagre top-to-bottom hierarchy, we want parent tables at the top and dependent child tables below.
  // Setting edge target -> source places the referenced parent higher in rank.
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      if (direction === "TB") {
        g.setEdge(edge.target, edge.source);
      } else {
        g.setEdge(edge.target, edge.source);
      }
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

    const x = dagreNode.x - dims.width / 2;
    const y = dagreNode.y - dims.height / 2;

    nodeCenterMap.set(node.id, { x: dagreNode.x, y: dagreNode.y });

    return {
      ...node,
      position: { x, y },
    };
  });

  // Resolve optimal handles for all edges based on computed coordinates
  const layoutedEdges: RelationshipEdge[] = edges.map((edge) => {
    const sourceCenter = nodeCenterMap.get(edge.source);
    const targetCenter = nodeCenterMap.get(edge.target);

    if (!sourceCenter || !targetCenter) {
      return edge;
    }

    const { sourceHandle, targetHandle } = resolveOptimalHandles(
      sourceCenter,
      targetCenter,
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
