from typing import Any, Dict, List, Union
from app.services.validation.models import SeverityEnum, ValidationIssue


def check_missing_primary_key(
    entities: List[Union[Dict[str, Any], Any]]
) -> List[ValidationIssue]:
    """Rule: Every entity must have at least one primary key."""
    issues: List[ValidationIssue] = []

    for entity in entities:
        if isinstance(entity, dict):
            entity_id = entity.get("id") or entity.get("entity_id", "unknown")
            entity_name = entity.get("name", "unnamed_entity")
            fields = entity.get("fields", [])
        else:
            entity_id = getattr(entity, "id", "unknown")
            entity_name = getattr(entity, "name", "unnamed_entity")
            fields = getattr(entity, "fields", [])

        has_pk = False
        for field in fields:
            if isinstance(field, dict):
                if field.get("is_primary_key"):
                    has_pk = True
                    break
            else:
                if getattr(field, "is_primary_key", False):
                    has_pk = True
                    break

        if not has_pk:
            issues.append(
                ValidationIssue(
                    rule_id="missing_primary_key",
                    severity=SeverityEnum.ERROR,
                    entity_id=str(entity_id),
                    entity_name=entity_name,
                    field_id=None,
                    field_name=None,
                    message="Add a primary key to this entity.",
                )
            )

    return issues
