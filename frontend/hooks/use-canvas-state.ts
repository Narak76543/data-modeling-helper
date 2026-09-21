"use client";

import { useState, useCallback } from "react";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from "@xyflow/react";
import type { EntityNode, RelationshipEdge } from "@/types/canvas";

const INITIAL_NODES: EntityNode[] = [
  {
    id: "entity-users",
    type: "entity",
    position: { x: 120, y: 100 },
    data: {
      id: "entity-users",
      name: "users",
      fields: [],
    },
  },
  {
    id: "entity-orders",
    type: "entity",
    position: { x: 420, y: 100 },
    data: {
      id: "entity-orders",
      name: "orders",
      fields: [],
    },
  },
];

const INITIAL_EDGES: RelationshipEdge[] = [
  {
    id: "edge-users-orders",
    source: "entity-users",
    target: "entity-orders",
    type: "orthogonal",
  },
];

export function useCanvasState() {
  const [nodes, setNodes] = useState<EntityNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<RelationshipEdge[]>(INITIAL_EDGES);

  const onNodesChange: OnNodesChange<EntityNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "orthogonal",
          },
          eds
        )
      );
    },
    []
  );

  const addEntity = useCallback((customName?: string) => {
    setNodes((nds) => {
      const nextIndex = nds.length + 1;
      const id = `entity-${Date.now()}`;
      const name = customName?.trim() || `entity_${nextIndex}`;

      // Calculate cascading position for new node
      const lastNode = nds[nds.length - 1];
      const position = lastNode
        ? { x: lastNode.position.x + 40, y: lastNode.position.y + 40 }
        : { x: 150, y: 120 };

      const newNode: EntityNode = {
        id,
        type: "entity",
        position,
        data: {
          id,
          name,
          fields: [],
        },
      };

      return [...nds, newNode];
    });
  }, []);

  const deleteEntity = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
    );
  }, []);

  const renameEntity = useCallback((nodeId: string, newName: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              name: newName,
            },
          };
        }
        return node;
      })
    );
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addEntity,
    deleteEntity,
    renameEntity,
  };
}
