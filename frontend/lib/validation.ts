import type { EntityNode, ValidationIssue, ValidationResult } from "@/types/canvas";

const SQL_RESERVED_KEYWORDS = new Set([
  "order", "table", "select", "insert", "update", "delete", "where",
  "from", "group", "by", "having", "join", "inner", "outer", "left",
  "right", "limit", "offset", "index", "constraint", "primary", "foreign",
  "key", "check", "default", "null", "unique", "view", "database", "schema"
]);

const SNAKE_CASE_PATTERN = /^[a-z][a-z0-9_]*$/;
const REPEATING_PATTERN = /^([a-zA-Z_]+?)(?:_)?([0-9]+)$/;

export function validateModelClientSide(nodes: EntityNode[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Build entity and field lookup index
  const entityMap = new Map<string, string>();
  const fieldsMap = new Map<string, Map<string, { id: string; name: string; isPK?: boolean; isUnique?: boolean }>>();

  for (const node of nodes) {
    const eId = node.id;
    const eName = node.data.name || "entity";
    entityMap.set(eId, eName);

    const fieldSubMap = new Map();
    for (const f of node.data.fields || []) {
      fieldSubMap.set(f.id, {
        id: f.id,
        name: f.name,
        isPK: f.isPrimaryKey,
        isUnique: f.isUnique,
      });
    }
    fieldsMap.set(eId, fieldSubMap);
  }

  // Iterate over each entity node
  for (const node of nodes) {
    const eId = node.id;
    const eName = node.data.name || "entity";
    const fields = node.data.fields || [];

    // Rule 1: Missing Primary Key
    const hasPK = fields.some((f) => f.isPrimaryKey);
    if (!hasPK) {
      issues.push({
        ruleId: "missing_primary_key",
        severity: "error",
        entityId: eId,
        entityName: eName,
        message: "Add a primary key to this entity.",
      });
    }

    // Rule 3: Naming Convention (Entity Name)
    if (!SNAKE_CASE_PATTERN.test(eName)) {
      issues.push({
        ruleId: "naming_convention",
        severity: "warning",
        entityId: eId,
        entityName: eName,
        message: `Use snake_case for entity name (e.g. '${eName.toLowerCase().replace(/[\s-]+/g, "_")}').`,
      });
    }

    if (SQL_RESERVED_KEYWORDS.has(eName.toLowerCase())) {
      issues.push({
        ruleId: "naming_convention",
        severity: "warning",
        entityId: eId,
        entityName: eName,
        message: `Entity name '${eName}' is a reserved SQL keyword. Consider using a plural noun.`,
      });
    }

    // Field-level checks
    const stemGroups = new Map<string, Array<{ id: string; name: string }>>();

    for (const field of fields) {
      const fId = field.id;
      const fName = field.name || "column";

      // Rule 3: Naming Convention (Field Name)
      if (!SNAKE_CASE_PATTERN.test(fName)) {
        issues.push({
          ruleId: "naming_convention",
          severity: "warning",
          entityId: eId,
          fieldId: fId,
          entityName: eName,
          fieldName: fName,
          message: `Use snake_case for field name (e.g. '${fName.toLowerCase().replace(/[\s-]+/g, "_")}').`,
        });
      }

      if (SQL_RESERVED_KEYWORDS.has(fName.toLowerCase())) {
        issues.push({
          ruleId: "naming_convention",
          severity: "warning",
          entityId: eId,
          fieldId: fId,
          entityName: eName,
          fieldName: fName,
          message: `Field name '${fName}' is a reserved SQL keyword. Consider renaming.`,
        });
      }

      // Rule 2: Foreign Key Target Validation
      if (field.isForeignKey) {
        if (!field.referencesEntityId) {
          issues.push({
            ruleId: "invalid_foreign_key",
            severity: "error",
            entityId: eId,
            fieldId: fId,
            entityName: eName,
            fieldName: fName,
            message: "Specify a target entity for this foreign key.",
          });
        } else if (!entityMap.has(field.referencesEntityId)) {
          issues.push({
            ruleId: "orphan_foreign_key",
            severity: "error",
            entityId: eId,
            fieldId: fId,
            entityName: eName,
            fieldName: fName,
            message: "Referenced target entity no longer exists.",
          });
        } else {
          const targetEName = entityMap.get(field.referencesEntityId);
          const targetFieldMap = fieldsMap.get(field.referencesEntityId);

          if (!field.referencesFieldId) {
            issues.push({
              ruleId: "invalid_foreign_key",
              severity: "error",
              entityId: eId,
              fieldId: fId,
              entityName: eName,
              fieldName: fName,
              message: `Specify a target field in '${targetEName}'.`,
            });
          } else if (!targetFieldMap?.has(field.referencesFieldId)) {
            issues.push({
              ruleId: "orphan_foreign_key",
              severity: "error",
              entityId: eId,
              fieldId: fId,
              entityName: eName,
              fieldName: fName,
              message: `Referenced target field in '${targetEName}' no longer exists.`,
            });
          } else {
            const targetFieldObj = targetFieldMap.get(field.referencesFieldId);
            if (!targetFieldObj?.isPK && !targetFieldObj?.isUnique) {
              issues.push({
                ruleId: "invalid_foreign_key",
                severity: "warning",
                entityId: eId,
                fieldId: fId,
                entityName: eName,
                fieldName: fName,
                message: "Referenced field should be a primary key or unique constraint.",
              });
            }
          }
        }
      }

      // Normalization stem grouping
      const match = REPEATING_PATTERN.exec(fName);
      if (match) {
        const stem = match[1].replace(/_+$/, "");
        const group = stemGroups.get(stem) || [];
        group.push({ id: fId, name: fName });
        stemGroups.set(stem, group);
      }
    }

    // Rule 4: Normalization (Repeating Groups)
    for (const [, group] of stemGroups.entries()) {
      if (group.length >= 2) {
        const fieldNames = group.map((g) => g.name).slice(0, 3).join(", ");
        issues.push({
          ruleId: "normalization_repeating_groups",
          severity: "warning",
          entityId: eId,
          fieldId: group[0].id,
          entityName: eName,
          fieldName: group[0].name,
          message: `Repeating fields (${fieldNames}) suggest a normalization smell. Consider extracting to a related entity (1:many).`,
        });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  return {
    isValid: errors === 0,
    summary: {
      totalIssues: issues.length,
      errors,
      warnings,
    },
    issues,
  };
}
