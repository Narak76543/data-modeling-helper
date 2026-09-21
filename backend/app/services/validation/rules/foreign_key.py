from typing import Any, Dict, List, Union
from app.services.validation.models import SeverityEnum, ValidationIssue


def check_orphan_foreign_keys(
    entities: List[Union[Dict[str, Any], Any]]
) -> List[ValidationIssue]:
    """Rule: Every foreign key must reference an existing entity and field."""
    issues: List[ValidationIssue] = []

    # Build entity and field lookup index
    entity_map: Dict[str, Any] = {}
    fields_map: Dict[str, Dict[str, Any]] = {}

    for entity in entities:
        if isinstance(entity, dict):
            e_id = str(entity.get("id") or entity.get("entity_id", ""))
            e_name = entity.get("name", "")
            raw_fields = entity.get("fields", [])
        else:
            e_id = str(getattr(entity, "id", ""))
            e_name = getattr(entity, "name", "")
            raw_fields = getattr(entity, "fields", [])

        entity_map[e_id] = e_name
        fields_map[e_id] = {}

        for f in raw_fields:
            if isinstance(f, dict):
                f_id = str(f.get("id") or f.get("field_id", ""))
                fields_map[e_id][f_id] = f
            else:
                f_id = str(getattr(f, "id", ""))
                fields_map[e_id][f_id] = f

    # Validate foreign keys
    for entity in entities:
        if isinstance(entity, dict):
            e_id = str(entity.get("id") or entity.get("entity_id", ""))
            e_name = entity.get("name", "")
            raw_fields = entity.get("fields", [])
        else:
            e_id = str(getattr(entity, "id", ""))
            e_name = getattr(entity, "name", "")
            raw_fields = getattr(entity, "fields", [])

        for f in raw_fields:
            if isinstance(f, dict):
                is_fk = f.get("is_foreign_key", False)
                f_id = str(f.get("id") or f.get("field_id", ""))
                f_name = f.get("name", "")
                target_entity_id = f.get("references_entity_id")
                target_field_id = f.get("references_field_id")
            else:
                is_fk = getattr(f, "is_foreign_key", False)
                f_id = str(getattr(f, "id", ""))
                f_name = getattr(f, "name", "")
                target_entity_id = getattr(f, "references_entity_id", None)
                target_field_id = getattr(f, "references_field_id", None)

            if not is_fk:
                continue

            # 1. Missing target entity reference
            if not target_entity_id:
                issues.append(
                    ValidationIssue(
                        rule_id="invalid_foreign_key",
                        severity=SeverityEnum.ERROR,
                        entity_id=e_id,
                        entity_name=e_name,
                        field_id=f_id,
                        field_name=f_name,
                        message="Specify a target entity for this foreign key.",
                    )
                )
                continue

            target_e_id_str = str(target_entity_id)

            # 2. Target entity does not exist (orphan)
            if target_e_id_str not in entity_map:
                issues.append(
                    ValidationIssue(
                        rule_id="orphan_foreign_key",
                        severity=SeverityEnum.ERROR,
                        entity_id=e_id,
                        entity_name=e_name,
                        field_id=f_id,
                        field_name=f_name,
                        message="Referenced target entity no longer exists.",
                    )
                )
                continue

            # 3. Missing target field reference
            if not target_field_id:
                issues.append(
                    ValidationIssue(
                        rule_id="invalid_foreign_key",
                        severity=SeverityEnum.ERROR,
                        entity_id=e_id,
                        entity_name=e_name,
                        field_id=f_id,
                        field_name=f_name,
                        message=f"Specify a target field in '{entity_map[target_e_id_str]}'.",
                    )
                )
                continue

            target_f_id_str = str(target_field_id)

            # 4. Target field does not exist
            if target_f_id_str not in fields_map[target_e_id_str]:
                issues.append(
                    ValidationIssue(
                        rule_id="orphan_foreign_key",
                        severity=SeverityEnum.ERROR,
                        entity_id=e_id,
                        entity_name=e_name,
                        field_id=f_id,
                        field_name=f_name,
                        message=f"Referenced target field in '{entity_map[target_e_id_str]}' no longer exists.",
                    )
                )
                continue

            # 5. Target field is not PK or Unique
            target_field_obj = fields_map[target_e_id_str][target_f_id_str]
            if isinstance(target_field_obj, dict):
                target_is_pk = target_field_obj.get("is_primary_key", False)
                target_is_uq = target_field_obj.get("is_unique", False)
            else:
                target_is_pk = getattr(target_field_obj, "is_primary_key", False)
                target_is_uq = getattr(target_field_obj, "is_unique", False)

            if not target_is_pk and not target_is_uq:
                issues.append(
                    ValidationIssue(
                        rule_id="invalid_foreign_key",
                        severity=SeverityEnum.WARNING,
                        entity_id=e_id,
                        entity_name=e_name,
                        field_id=f_id,
                        field_name=f_name,
                        message="Referenced field should be a primary key or unique constraint.",
                    )
                )

    return issues
