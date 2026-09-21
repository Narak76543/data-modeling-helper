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
import type { AIGeneratedProject } from "@/types/project";
import { getLayoutedElements, type LayoutDirection } from "@/lib/layout";

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
    position: { x: 480, y: 100 },
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
          referencesEntityId: "entity-users",
          referencesFieldId: "field-users-id",
          isNullable: false,
        },
      ],
    },
  },
];

const INITIAL_EDGES: RelationshipEdge[] = [
  {
    id: "edge-users-orders",
    source: "entity-orders",
    target: "entity-users",
    sourceHandle: "source-left",
    targetHandle: "target-right",
    type: "orthogonal",
  },
];

export interface PreviewBatchInfo {
  id: string;
  projectName: string;
  tableCount: number;
}

export function useCanvasState() {
  const [nodes, setNodes] = useState<EntityNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<RelationshipEdge[]>(INITIAL_EDGES);
  const [previewBatch, setPreviewBatch] = useState<PreviewBatchInfo | null>(null);

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

  const addAiPreviewEntity = useCallback((entity: { name: string; fields: any[] }) => {
    setNodes((nds) => {
      const id = `ai-preview-${Date.now()}`;
      const lastNode = nds[nds.length - 1];
      const position = lastNode
        ? { x: lastNode.position.x + 50, y: lastNode.position.y + 50 }
        : { x: 200, y: 150 };

      const previewFields: EntityField[] = entity.fields.map((f, idx) => ({
        id: `field-ai-${Date.now()}-${idx}`,
        name: f.name,
        dataType: f.dataType,
        isPrimaryKey: f.isPrimaryKey || false,
        isNullable: f.isNullable !== undefined ? f.isNullable : true,
        isUnique: f.isUnique || false,
        defaultValue: f.defaultValue,
      }));

      const newPreviewNode: EntityNode = {
        id,
        type: "previewEntity",
        position,
        data: {
          id,
          name: entity.name,
          fields: previewFields,
          isPreview: true,
        },
      };

      return [...nds, newPreviewNode];
    });
  }, []);

  // Multi-table project preview generator (FR-18, FR-19)
  const addProjectPreview = useCallback((project: AIGeneratedProject) => {
    const batchId = `batch-${Date.now()}`;
    const entityNameToId: Record<string, string> = {};
    const entityFieldMap: Record<string, Record<string, string>> = {};

    // 1. Assign deterministic IDs for this preview batch
    project.entities.forEach((entity) => {
      const nodeId = `entity-${batchId}-${entity.name}`;
      entityNameToId[entity.name] = nodeId;
      entityFieldMap[nodeId] = {};

      entity.fields.forEach((f, fIdx) => {
        const fieldId = `field-${batchId}-${entity.name}-${f.name || fIdx}`;
        entityFieldMap[nodeId][f.name] = fieldId;
      });
    });

    // 2. Build preview nodes arranged in a responsive grid layout
    const newPreviewNodes: EntityNode[] = project.entities.map((entity, index) => {
      const nodeId = entityNameToId[entity.name];
      const col = index % 3;
      const row = Math.floor(index / 3);
      const position = {
        x: 80 + col * 360,
        y: 120 + row * 420,
      };

      const fields: EntityField[] = entity.fields.map((f) => {
        const fieldId = entityFieldMap[nodeId][f.name];
        let refEntityId: string | undefined = undefined;
        let refFieldId: string | undefined = undefined;

        if (f.referencesEntity && entityNameToId[f.referencesEntity]) {
          refEntityId = entityNameToId[f.referencesEntity];
          const targetField = f.referencesField || "id";
          refFieldId = entityFieldMap[refEntityId]?.[targetField];
        }

        return {
          id: fieldId,
          name: f.name,
          dataType: f.dataType,
          isPrimaryKey: f.isPrimaryKey || false,
          isForeignKey: f.isForeignKey || false,
          referencesEntityId: refEntityId,
          referencesFieldId: refFieldId,
          isNullable: f.isNullable !== undefined ? f.isNullable : true,
          isUnique: f.isUnique || false,
          defaultValue: f.defaultValue,
        };
      });

      return {
        id: nodeId,
        type: "previewEntity",
        position,
        data: {
          id: nodeId,
          name: entity.name,
          fields,
          isPreview: true,
          previewBatchId: batchId,
        },
      };
    });

    // 3. Build preview relationship edges connecting the tables
    const newPreviewEdges: RelationshipEdge[] = (project.relationships || [])
      .map((rel, rIdx) => {
        const sourceNodeId = entityNameToId[rel.source_entity];
        const targetNodeId = entityNameToId[rel.target_entity];

        if (!sourceNodeId || !targetNodeId) return null;

        return {
          id: `edge-${batchId}-${rIdx}`,
          source: sourceNodeId,
          target: targetNodeId,
          type: "orthogonal",
          style: {
            strokeDasharray: "4 4",
            stroke: "#1E3A5F",
          },
        } as RelationshipEdge;
      })
      .filter(Boolean) as RelationshipEdge[];

    // 4. Automatically organize newly generated preview nodes with hierarchical layout
    const layouted = getLayoutedElements(newPreviewNodes, newPreviewEdges, "TB");

    setNodes((prev) => [...prev, ...layouted.nodes]);
    setEdges((prev) => [...prev, ...layouted.edges]);
    setPreviewBatch({
      id: batchId,
      projectName: project.project_name,
      tableCount: project.entities.length,
    });
  }, []);

  // Batch Accept All (FR-20)
  const commitProjectPreview = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.data.isPreview) {
          return {
            ...node,
            type: "entity" as const,
            data: {
              ...node.data,
              isPreview: false,
              previewBatchId: undefined,
            },
          };
        }
        return node;
      })
    );

    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        style: undefined, // solid line
      }))
    );

    setPreviewBatch(null);
  }, []);

  // Batch Discard All (FR-20)
  const discardProjectPreview = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.data.isPreview));
    setEdges((eds) =>
      eds.filter((e) => {
        // Keep edge only if neither source nor target is a preview node
        return true;
      })
    );
    setPreviewBatch(null);
  }, []);

  // Individual Node Commit (FR-20)
  const commitPreviewEntity = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const updated: EntityNode[] = nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            type: "entity" as const,
            data: {
              ...node.data,
              isPreview: false,
              previewBatchId: undefined,
            },
          };
        }
        return node;
      });

      const remainingPreviews = updated.filter((n) => n.data.isPreview);
      if (remainingPreviews.length === 0) {
        setPreviewBatch(null);
      }
      return updated;
    });

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source === nodeId || edge.target === nodeId) {
          return {
            ...edge,
            style: undefined,
          };
        }
        return edge;
      })
    );
  }, []);

  // Individual Node Discard (FR-20)
  const discardPreviewEntity = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const updated = nds.filter((n) => n.id !== nodeId);
      const remainingPreviews = updated.filter((n) => n.data.isPreview);
      if (remainingPreviews.length === 0) {
        setPreviewBatch(null);
      }
      return updated;
    });

    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
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

  const applyAutoLayout = useCallback((direction: LayoutDirection = "TB") => {
    setNodes((currentNodes) => {
      const layouted = getLayoutedElements(currentNodes, edges, direction);
      setEdges(layouted.edges);
      return layouted.nodes;
    });
  }, [edges]);

  return {
    nodes,
    edges,
    previewBatch,
    onNodesChange,
    onEdgesChange,
    onConnect,
    applyAutoLayout,
    addEntity,
    addAiPreviewEntity,
    addProjectPreview,
    commitProjectPreview,
    discardProjectPreview,
    commitPreviewEntity,
    discardPreviewEntity,
    deleteEntity,
    renameEntity,
    addField,
    updateField,
    deleteField,
  };
}
