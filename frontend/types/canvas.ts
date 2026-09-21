import type { Node, Edge } from "@xyflow/react";

export type SQLDataType =
  | "INTEGER"
  | "BIGINT"
  | "VARCHAR"
  | "TEXT"
  | "BOOLEAN"
  | "TIMESTAMP"
  | "DATE"
  | "NUMERIC"
  | "UUID"
  | "JSONB";

export const SQL_DATA_TYPES: SQLDataType[] = [
  "INTEGER",
  "BIGINT",
  "VARCHAR",
  "TEXT",
  "BOOLEAN",
  "TIMESTAMP",
  "DATE",
  "NUMERIC",
  "UUID",
  "JSONB",
];

export interface EntityField {
  id: string;
  name: string;
  dataType: SQLDataType;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
}

export interface EntityNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  fields: EntityField[];
  onNameChange?: (name: string) => void;
  onDelete?: () => void;
  onAddField?: () => void;
  onUpdateField?: (fieldId: string, updates: Partial<EntityField>) => void;
  onDeleteField?: (fieldId: string) => void;
}

export type EntityNode = Node<EntityNodeData, "entity">;
export type RelationshipEdge = Edge;
