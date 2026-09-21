"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { EntityNodeComponent } from "./entity-node";
import { OrthogonalEdge } from "./orthogonal-edge";
import type { EntityNode, RelationshipEdge, EntityField } from "@/types/canvas";

interface CanvasProps {
  nodes: EntityNode[];
  edges: RelationshipEdge[];
  onNodesChange: OnNodesChange<EntityNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onRenameEntity: (nodeId: string, name: string) => void;
  onDeleteEntity: (nodeId: string) => void;
  onAddField: (entityId: string, field?: Partial<EntityField>) => void;
  onUpdateField: (entityId: string, fieldId: string, updates: Partial<EntityField>) => void;
  onDeleteField: (entityId: string, fieldId: string) => void;
}

export function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onRenameEntity,
  onDeleteEntity,
  onAddField,
  onUpdateField,
  onDeleteField,
}: CanvasProps) {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      entity: EntityNodeComponent,
    }),
    []
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      orthogonal: OrthogonalEdge,
    }),
    []
  );

  // Inject callbacks into node data
  const enrichedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onNameChange: (newName: string) => onRenameEntity(node.id, newName),
          onDelete: () => onDeleteEntity(node.id),
          onAddField: () => onAddField(node.id),
          onUpdateField: (fieldId: string, updates: Partial<EntityField>) =>
            onUpdateField(node.id, fieldId, updates),
          onDeleteField: (fieldId: string) => onDeleteField(node.id, fieldId),
        },
      })),
    [nodes, onRenameEntity, onDeleteEntity, onAddField, onUpdateField, onDeleteField]
  );

  return (
    <div className="w-full h-full bg-bg relative">
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
        className="data-modeling-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="var(--color-ink-muted)"
          style={{ opacity: 0.35 }}
        />
        <Controls
          showInteractive={false}
          className="!bg-surface !border !border-ink/20 !rounded-[2px] !shadow-none [&>button]:!border-b [&>button]:!border-ink/10 [&>button]:!text-ink [&>button:hover]:!bg-bg"
        />
      </ReactFlow>
    </div>
  );
}
