import { toPng } from "html-to-image";
import type { EntityNode, ValidationResult } from "@/types/canvas";

export function generateClientMarkdown(
  nodes: EntityNode[],
  validationResult?: ValidationResult,
  projectName = "Data Modeling Helper Project"
): string {
  const entityMap = new Map<string, string>();
  const fieldsMap = new Map<string, Map<string, string>>();
  let totalFields = 0;
  let totalRelationships = 0;

  for (const node of nodes) {
    const eId = node.id;
    const eName = node.data.name || "entity";
    entityMap.set(eId, eName);

    const fMap = new Map<string, string>();
    for (const f of node.data.fields || []) {
      totalFields++;
      fMap.set(f.id, f.name);
      if (f.isForeignKey) totalRelationships++;
    }
    fieldsMap.set(eId, fMap);
  }

  const lines: string[] = [];
  lines.push(`# Data Dictionary — ${projectName}`);
  lines.push("");
  lines.push(`*Generated on ${new Date().toUTCString()}*`);
  lines.push("");

  // 1. Overview
  lines.push("## 1. Model Overview");
  lines.push("");
  lines.push(`- **Total Entities (Tables):** ${nodes.length}`);
  lines.push(`- **Total Fields (Columns):** ${totalFields}`);
  lines.push(`- **Total Relationships:** ${totalRelationships}`);
  lines.push("");

  // 2. Validation & Handoff Readiness
  lines.push("## 2. Validation & Handoff Readiness");
  lines.push("");
  if (validationResult && !validationResult.isValid) {
    lines.push("> [!WARNING]");
    lines.push(
      `> **Handoff Attention Required: ${validationResult.summary.errors} error(s) and ${validationResult.summary.warnings} warning(s) detected.**`
    );
    lines.push("> Please address the unresolved issues below before implementation:");
    for (const issue of validationResult.issues) {
      const loc = `\`${issue.entityName}\`` + (issue.fieldName ? `.\`${issue.fieldName}\`` : "");
      const icon = issue.severity === "error" ? "⚠️ [ERROR]" : "ℹ️ [WARNING]";
      lines.push(`> - ${icon} **${loc}**: ${issue.message}`);
    }
    lines.push("");
  } else if (validationResult && validationResult.summary.warnings > 0) {
    lines.push("> [!NOTE]");
    lines.push(`> **Model is structurally valid with ${validationResult.summary.warnings} advisory warning(s).**`);
    for (const issue of validationResult.issues) {
      const loc = `\`${issue.entityName}\`` + (issue.fieldName ? `.\`${issue.fieldName}\`` : "");
      lines.push(`> - ℹ️ **${loc}**: ${issue.message}`);
    }
    lines.push("");
  } else {
    lines.push("> [!NOTE]");
    lines.push("> ✓ **Handoff Ready**: The data model passed all structural and relational validation checks.");
    lines.push("");
  }

  // 3. Entity Definitions
  lines.push("## 3. Entity Definitions");
  lines.push("");

  for (const node of nodes) {
    const eName = node.data.name || "entity";
    const fields = node.data.fields || [];

    lines.push(`### Entity: \`${eName}\``);
    lines.push("");

    if (fields.length === 0) {
      lines.push("*No fields defined for this entity.*");
      lines.push("");
      continue;
    }

    lines.push("| Column | Data Type | Constraints | References / Default |");
    lines.push("| :--- | :--- | :--- | :--- |");

    for (const f of fields) {
      const constraints: string[] = [];
      if (f.isPrimaryKey) constraints.push("**PK**");
      if (f.isForeignKey) constraints.push("**FK**");
      if (!f.isNullable) constraints.push("NOT NULL");
      if (f.isUnique && !f.isPrimaryKey) constraints.push("UNIQUE");

      const constraintsStr = constraints.length > 0 ? constraints.join(", ") : "—";
      const refOrDefault: string[] = [];

      if (f.isForeignKey) {
        const targetEName = f.referencesEntityId ? entityMap.get(f.referencesEntityId) : null;
        const targetFName =
          f.referencesEntityId && f.referencesFieldId
            ? fieldsMap.get(f.referencesEntityId)?.get(f.referencesFieldId)
            : null;

        if (targetEName && targetFName) {
          refOrDefault.push(`→ \`${targetEName}.${targetFName}\``);
        } else if (targetEName) {
          refOrDefault.push(`→ \`${targetEName}\``);
        } else {
          refOrDefault.push("*(Orphan FK)*");
        }
      }

      if (f.defaultValue) {
        refOrDefault.push(`Default: \`${f.defaultValue}\``);
      }

      const refStr = refOrDefault.length > 0 ? refOrDefault.join("; ") : "—";
      lines.push(`| \`${f.name}\` | \`${f.dataType}\` | ${constraintsStr} | ${refStr} |`);
    }

    lines.push("");
  }

  // 4. Plain-Language Relationships
  lines.push("## 4. Plain-Language Relationship Descriptions");
  lines.push("");

  let relIndex = 0;
  for (const node of nodes) {
    const eName = node.data.name || "entity";
    for (const f of node.data.fields || []) {
      if (f.isForeignKey) {
        relIndex++;
        const targetEName = f.referencesEntityId ? entityMap.get(f.referencesEntityId) : null;
        const targetFName =
          f.referencesEntityId && f.referencesFieldId
            ? fieldsMap.get(f.referencesEntityId)?.get(f.referencesFieldId)
            : null;

        if (targetEName && targetFName) {
          lines.push(`${relIndex}. **\`${eName}.${f.name}\` → \`${targetEName}.${targetFName}\`**:`);
          lines.push(
            `   - Each record in \`${eName}\` references the \`${targetFName}\` column in \`${targetEName}\` via \`${f.name}\` (Many-to-One / 1:many relationship).`
          );
        } else if (targetEName) {
          lines.push(`${relIndex}. **\`${eName}.${f.name}\` → \`${targetEName}\`**:`);
          lines.push(`   - \`${eName}.${f.name}\` points to \`${targetEName}\`, but target field is unselected.`);
        } else {
          lines.push(`${relIndex}. **\`${eName}.${f.name}\` (Orphan Foreign Key)**:`);
          lines.push(`   - \`${eName}.${f.name}\` is marked as a foreign key but target entity does not exist.`);
        }
        lines.push("");
      }
    }
  }

  if (relIndex === 0) {
    lines.push("*No relationships mapped in this data model.*");
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadMarkdownFile(content: string, filename = "data_dictionary.md") {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportCanvasAsPng(containerSelector = ".react-flow__viewport", filename = "erd_diagram.png") {
  const element = document.querySelector(containerSelector) as HTMLElement;
  if (!element) {
    throw new Error("Canvas container element not found");
  }

  const dataUrl = await toPng(element, {
    backgroundColor: "#F7F8F7",
    quality: 0.95,
    pixelRatio: 2, // High-res export
  });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadFieldSpecExcel(
  nodes: EntityNode[],
  projectName = "Data Modeling Helper Project"
): Promise<void> {
  const payload = {
    project_name: projectName,
    entities: nodes.map((n) => ({
      name: n.data.name || "entity",
      pos_x: n.position.x || 0,
      pos_y: n.position.y || 0,
      fields: (n.data.fields || []).map((f, idx) => ({
        name: f.name,
        data_type: f.dataType,
        label: f.label || undefined,
        description: f.description || undefined,
        length: f.length || undefined,
        is_primary_key: Boolean(f.isPrimaryKey),
        is_foreign_key: Boolean(f.isForeignKey),
        references_entity_id: f.referencesEntityId || undefined,
        references_field_id: f.referencesFieldId || undefined,
        is_nullable: f.isNullable !== undefined ? f.isNullable : true,
        is_unique: Boolean(f.isUnique),
        default_value: f.defaultValue || undefined,
        order_index: idx,
      })),
    })),
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const response = await fetch(`${API_BASE_URL}/export/excel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = "Failed to export Excel field specification";
    try {
      const err = await response.json();
      if (err?.detail) errMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    } catch {}
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  link.download = `${safeName}_field_spec.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

