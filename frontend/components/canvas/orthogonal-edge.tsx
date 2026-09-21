"use client";

import React from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";

export function OrthogonalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<Edge<{ isDimmed?: boolean; isHighlighted?: boolean }>>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4, // Clean 90° orthogonal turns with subtle smoothing
    offset: 24, // Consistent channel offset from table borders
  });

  const isDimmed = Boolean(data?.isDimmed);
  const isHighlighted = Boolean(data?.isHighlighted);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: "var(--color-accent)",
        strokeWidth: isHighlighted ? 2.5 : 1.5,
        opacity: isDimmed ? 0.15 : 1,
        transition: "opacity 150ms ease, stroke-width 150ms ease",
        ...style,
      }}
    />
  );
}
