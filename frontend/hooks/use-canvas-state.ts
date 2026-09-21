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
import type { EntityNode, RelationshipEdge, EntityField } from "@/types/canvas";

const INITIAL_NODES: EntityNode[] = [
  {
    id: "entity-users",
    type: "entity",
    position: { x: 120, y: 100 },
    data: {
      id: "entity-users",
      name: "users",
      fields: [
        {
          id: "field-users-id",
          name: "id",
          dataType: "INTEGER",
          isPrimaryKey: true,
          isNullable: false,
          isUnique: true,
        },
        {
          id: "field-users-email",
          name: "email",
          dataType: "VARCHAR",
          isPrimaryKey: false,
          isNullable: false,
          isUnique: true,
        },
      ],
    },
  },
  {
    id: "entity-orders",
    type: "entity",
    position: { x: 460, y: 100 },
    data: {
      id: "entity-orders",
      name: "orders",
      fields: [
        {
          id: "field-orders-id",
          name: "id",
          dataType: "INTEGER",
          isPrimaryKey: true,
          isNullable: false,
          isUnique: true,
        },
        {
          id: "field-orders-user-id",
          name: "user_id",
          dataType: "INTEGER",
          isForeignKey: true,
          isNullable: false,
        },
      ],
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
          fields: [
            {
              id: `field-${Date.now()}-id`,
              name: "id",
              dataType: "INTEGER",
              isPrimaryKey: true,
              isNullable: false,
              isUnique: true,
            },
          ],
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

  const addField = useCallback((entityId: string, customField?: Partial<EntityField>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === entityId) {
          const currentFields = node.data.fields || [];
          const nextIndex = currentFields.length + 1;
          const newField: EntityField = {
            id: `field-${Date.now()}`,
            name: `column_${nextIndex}`,
            dataType: "VARCHAR",
            isNullable: true,
            isPrimaryKey: false,
            isForeignKey: false,
            isUnique: false,
            ...customField,
          };
          return {
            ...node,
            data: {
              ...node.data,
              fields: [...currentFields, newField],
            },
          };
        }
        return node;
      })
    );
  }, []);

  const updateField = useCallback(
    (entityId: string, fieldId: string, updates: Partial<EntityField>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === entityId) {
            return {
              ...node,
              data: {
                ...node.data,
                fields: (node.data.fields || []).map((f) =>
                  f.id === fieldId ? { ...f, ...updates } : f
                ),
              },
            };
          }
          return node;
        })
      );
    },
    []
  );

  const deleteField = useCallback((entityId: string, fieldId: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === entityId) {
          return {
            ...node,
            data: {
              ...node.data,
              fields: (node.data.fields || []).filter((f) => f.id !== fieldId),
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
    addField,
    updateField,
    deleteField,
  };
}
