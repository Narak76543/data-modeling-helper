from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from app.services.validation.models import SeverityEnum, ValidationResult


class DataDictionaryGenerator:
    """Service to synthesize plain-language documentation & data dictionary from data models."""

    @classmethod
    def generate_markdown(
        cls,
        entities: List[Union[Dict[str, Any], Any]],
        project_name: str = "Data Modeling Helper Project",
        validation_result: Optional[ValidationResult] = None,
    ) -> str:
        """Generate a complete Markdown data dictionary from entities and validation state."""
        # Index entities and fields
        entity_map: Dict[str, str] = {}
        fields_map: Dict[str, Dict[str, Dict[str, Any]]] = {}
        total_fields = 0
        total_relationships = 0

        for entity in entities:
            if isinstance(entity, dict):
                e_id = str(entity.get("id") or entity.get("entity_id", ""))
                e_name = entity.get("name", "unnamed_entity")
                raw_fields = entity.get("fields", [])
            else:
                e_id = str(getattr(entity, "id", ""))
                e_name = getattr(entity, "name", "unnamed_entity")
                raw_fields = getattr(entity, "fields", [])

            entity_map[e_id] = e_name
            fields_map[e_id] = {}

            for f in raw_fields:
                total_fields += 1
                if isinstance(f, dict):
                    f_id = str(f.get("id") or f.get("field_id", ""))
                    f_dict = f
                else:
                    f_id = str(getattr(f, "id", ""))
                    f_dict = {
                        "id": f_id,
                        "name": getattr(f, "name", ""),
                        "data_type": getattr(f, "data_type", "VARCHAR"),
                        "is_primary_key": getattr(f, "is_primary_key", False),
                        "is_foreign_key": getattr(f, "is_foreign_key", False),
                        "references_entity_id": getattr(f, "references_entity_id", None),
                        "references_field_id": getattr(f, "references_field_id", None),
                        "is_nullable": getattr(f, "is_nullable", True),
                        "is_unique": getattr(f, "is_unique", False),
                        "default_value": getattr(f, "default_value", None),
                    }

                fields_map[e_id][f_id] = f_dict
                if f_dict.get("is_foreign_key"):
                    total_relationships += 1

        # Build Markdown Document
        lines: List[str] = []
        lines.append(f"# Data Dictionary — {project_name}")
        lines.append("")
        lines.append(f"*Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}*")
        lines.append("")

        # 1. Executive Summary
        lines.append("## 1. Model Overview")
        lines.append("")
        lines.append(f"- **Total Entities (Tables):** {len(entities)}")
        lines.append(f"- **Total Fields (Columns):** {total_fields}")
        lines.append(f"- **Total Relationships:** {total_relationships}")
        lines.append("")

        # 2. Handoff & Validation Status
        lines.append("## 2. Validation & Handoff Readiness")
        lines.append("")
        if validation_result and not validation_result.is_valid:
            lines.append("> [!WARNING]")
            lines.append(
                f"> **Handoff Attention Required: {validation_result.summary.errors} error(s) and {validation_result.summary.warnings} warning(s) detected.**"
            )
            lines.append("> Please address the unresolved issues below before database implementation:")
            for issue in validation_result.issues:
                prefix = "⚠️ [ERROR]" if issue.severity == SeverityEnum.ERROR else "ℹ️ [WARNING]"
                loc = f"`{issue.entity_name}`" + (f".`{issue.field_name}`" if issue.field_name else "")
                lines.append(f"> - {prefix} **{loc}**: {issue.message}")
            lines.append("")
        elif validation_result and validation_result.is_valid and validation_result.summary.warnings > 0:
            lines.append("> [!NOTE]")
            lines.append(
                f"> **Model is structurally valid with {validation_result.summary.warnings} advisory warning(s).**"
            )
            for issue in validation_result.issues:
                loc = f"`{issue.entity_name}`" + (f".`{issue.field_name}`" if issue.field_name else "")
                lines.append(f"> - ℹ️ **{loc}**: {issue.message}")
            lines.append("")
        else:
            lines.append("> [!NOTE]")
            lines.append("> ✓ **Handoff Ready**: The data model passed all structural and relational validation checks.")
            lines.append("")

        # 3. Entity Tables
        lines.append("## 3. Entity Definitions")
        lines.append("")

        for entity in entities:
            if isinstance(entity, dict):
                e_id = str(entity.get("id") or entity.get("entity_id", ""))
                e_name = entity.get("name", "unnamed_entity")
                raw_fields = entity.get("fields", [])
            else:
                e_id = str(getattr(entity, "id", ""))
                e_name = getattr(entity, "name", "unnamed_entity")
                raw_fields = getattr(entity, "fields", [])

            lines.append(f"### Entity: `{e_name}`")
            lines.append("")

            if not raw_fields:
                lines.append("*No fields defined for this entity.*")
                lines.append("")
                continue

            lines.append("| Column | Data Type | Constraints | References / Default |")
            lines.append("| :--- | :--- | :--- | :--- |")

            for f in raw_fields:
                if isinstance(f, dict):
                    f_dict = f
                else:
                    f_dict = {
                        "name": getattr(f, "name", ""),
                        "data_type": getattr(f, "data_type", "VARCHAR"),
                        "length": getattr(f, "length", None),
                        "is_primary_key": getattr(f, "is_primary_key", False),
                        "is_foreign_key": getattr(f, "is_foreign_key", False),
                        "references_entity_id": getattr(f, "references_entity_id", None),
                        "references_field_id": getattr(f, "references_field_id", None),
                        "is_nullable": getattr(f, "is_nullable", True),
                        "is_unique": getattr(f, "is_unique", False),
                        "default_value": getattr(f, "default_value", None),
                    }

                col_name = f"`{f_dict.get('name')}`"
                raw_dt = f_dict.get("data_type", "VARCHAR")
                len_val = f_dict.get("length")
                dt_str = f"{raw_dt}({len_val})" if len_val else raw_dt
                dt = f"`{dt_str}`"

                constraints: List[str] = []
                if f_dict.get("is_primary_key"):
                    constraints.append("**PK**")
                if f_dict.get("is_foreign_key"):
                    constraints.append("**FK**")
                if not f_dict.get("is_nullable"):
                    constraints.append("NOT NULL")
                if f_dict.get("is_unique") and not f_dict.get("is_primary_key"):
                    constraints.append("UNIQUE")

                constraints_str = ", ".join(constraints) if constraints else "—"

                ref_or_default = []
                if f_dict.get("is_foreign_key"):
                    target_e_id = str(f_dict.get("references_entity_id") or "")
                    target_f_id = str(f_dict.get("references_field_id") or "")
                    target_e_name = entity_map.get(target_e_id)
                    target_f_name = (
                        fields_map.get(target_e_id, {}).get(target_f_id, {}).get("name")
                        if target_e_name
                        else None
                    )

                    if target_e_name and target_f_name:
                        ref_or_default.append(f"→ `{target_e_name}.{target_f_name}`")
                    elif target_e_name:
                        ref_or_default.append(f"→ `{target_e_name}`")
                    else:
                        ref_or_default.append("*(Orphan FK)*")

                if f_dict.get("default_value"):
                    ref_or_default.append(f"Default: `{f_dict.get('default_value')}`")

                ref_str = "; ".join(ref_or_default) if ref_or_default else "—"

                lines.append(f"| {col_name} | {dt} | {constraints_str} | {ref_str} |")

            lines.append("")

        # 4. Plain-Language Relationships Section
        lines.append("## 4. Plain-Language Relationship Descriptions")
        lines.append("")

        rel_count = 0
        for entity in entities:
            if isinstance(entity, dict):
                e_id = str(entity.get("id") or entity.get("entity_id", ""))
                e_name = entity.get("name", "unnamed_entity")
                raw_fields = entity.get("fields", [])
            else:
                e_id = str(getattr(entity, "id", ""))
                e_name = getattr(entity, "name", "unnamed_entity")
                raw_fields = getattr(entity, "fields", [])

            for f in raw_fields:
                if isinstance(f, dict):
                    f_dict = f
                else:
                    f_dict = {
                        "name": getattr(f, "name", ""),
                        "is_foreign_key": getattr(f, "is_foreign_key", False),
                        "references_entity_id": getattr(f, "references_entity_id", None),
                        "references_field_id": getattr(f, "references_field_id", None),
                    }

                if f_dict.get("is_foreign_key"):
                    rel_count += 1
                    target_e_id = str(f_dict.get("references_entity_id") or "")
                    target_f_id = str(f_dict.get("references_field_id") or "")
                    target_e_name = entity_map.get(target_e_id)
                    target_f_name = (
                        fields_map.get(target_e_id, {}).get(target_f_id, {}).get("name")
                        if target_e_name
                        else None
                    )
                    f_name = f_dict.get("name")

                    if target_e_name and target_f_name:
                        lines.append(
                            f"{rel_count}. **`{e_name}.{f_name}` → `{target_e_name}.{target_f_name}`**:"
                        )
                        lines.append(
                            f"   - Each record in `{e_name}` references the `{target_f_name}` column in `{target_e_name}` via `{f_name}` (Many-to-One / 1:many relationship)."
                        )
                    elif target_e_name:
                        lines.append(
                            f"{rel_count}. **`{e_name}.{f_name}` → `{target_e_name}`**:"
                        )
                        lines.append(
                            f"   - `{e_name}.{f_name}` points to `{target_e_name}`, but a target column is not selected yet."
                        )
                    else:
                        lines.append(
                            f"{rel_count}. **`{e_name}.{f_name}` (Orphan Foreign Key)**:"
                        )
                        lines.append(
                            f"   - `{e_name}.{f_name}` is marked as a foreign key but does not specify an existing target entity."
                        )
                    lines.append("")

        if rel_count == 0:
            lines.append("*No relationships mapped in this data model.*")
            lines.append("")

        return "\n".join(lines)
