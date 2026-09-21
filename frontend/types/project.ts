import type { SQLDataType } from "./canvas";

export interface AIGeneratedField {
  name: string;
  dataType: SQLDataType;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencesEntity?: string;
  referencesField?: string;
  isNullable?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
}

export interface AIGeneratedProjectEntity {
  name: string;
  description?: string;
  fields: AIGeneratedField[];
}

export interface AIGeneratedRelationship {
  source_entity: string;
  source_field: string;
  target_entity: string;
  target_field: string;
  cardinality: "1:1" | "1:many" | "many:many";
}

export interface AIGeneratedProject {
  project_name: string;
  description?: string;
  entities: AIGeneratedProjectEntity[];
  relationships: AIGeneratedRelationship[];
  validation_summary?: {
    is_valid: boolean;
    summary: {
      total_issues: number;
      errors: number;
      warnings: number;
    };
    issues: Array<{
      rule_id: string;
      severity: "error" | "warning" | "info";
      entity_id: string;
      entity_name: string;
      field_id?: string;
      field_name?: string;
      message: string;
    }>;
  };
}
