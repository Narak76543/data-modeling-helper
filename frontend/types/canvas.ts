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
  referencesEntityId?: string;
  referencesFieldId?: string;
  isNullable?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
}

export type Severity = "error" | "warning";

export interface ValidationIssue {
  ruleId: string;
  severity: Severity;
  entityId: string;
  fieldId?: string;
  entityName?: string;
  fieldName?: string;
  message: string;
}

export interface ValidationSummary {
  totalIssues: number;
  errors: number;
  warnings: number;
}

export interface ValidationResult {
  isValid: boolean;
  summary: ValidationSummary;
  issues: ValidationIssue[];
}

export interface EntityNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  fields: EntityField[];
  issues?: ValidationIssue[];
  allNodes?: EntityNode[];
  onNameChange?: (name: string) => void;
  onDelete?: () => void;
  onAddField?: () => void;
  onUpdateField?: (fieldId: string, updates: Partial<EntityField>) => void;
  onDeleteField?: (fieldId: string) => void;
}

export type EntityNode = Node<EntityNodeData, "entity">;
export type RelationshipEdge = Edge;
