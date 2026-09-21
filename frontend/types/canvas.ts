import type { Node, Edge } from "@xyflow/react";

export interface EntityField {
  id: string;
  name: string;
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
}

export interface EntityNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  fields: EntityField[];
  onNameChange?: (name: string) => void;
  onDelete?: () => void;
}

export type EntityNode = Node<EntityNodeData, "entity">;
export type RelationshipEdge = Edge;
