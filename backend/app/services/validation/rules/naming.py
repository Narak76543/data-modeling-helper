import re
from typing import Any, Dict, List, Union
from app.services.validation.models import SeverityEnum, ValidationIssue

SQL_RESERVED_KEYWORDS = {
    "order", "table", "select", "insert", "update", "delete", "where",
    "from", "group", "by", "having", "join", "inner", "outer", "left",
    "right", "limit", "offset", "index", "constraint", "primary", "foreign",
    "key", "check", "default", "null", "unique", "view", "database", "schema"
}

SNAKE_CASE_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


def check_naming_conventions(
    entities: List[Union[Dict[str, Any], Any]],
    convention: str = "snake_case"
) -> List[ValidationIssue]:
    """Rule: Entity and field names should follow standard naming conventions."""
    issues: List[ValidationIssue] = []

    for entity in entities:
        if isinstance(entity, dict):
            e_id = str(entity.get("id") or entity.get("entity_id", ""))
            e_name = entity.get("name", "")
            raw_fields = entity.get("fields", [])
        else:
            e_id = str(getattr(entity, "id", ""))
            e_name = getattr(entity, "name", "")
            raw_fields = getattr(entity, "fields", [])

        # Check entity name
        if not SNAKE_CASE_PATTERN.match(e_name):
            issues.append(
                ValidationIssue(
                    rule_id="naming_convention",
                    severity=SeverityEnum.WARNING,
                    entity_id=e_id,
                    entity_name=e_name,
                    field_id=None,
                    field_name=None,
                    message=f"Use snake_case for entity name (e.g., '{e_name.lower().replace(' ', '_')}').",
                )
            )

        if e_name.lower() in SQL_RESERVED_KEYWORDS:
            issues.append(
                ValidationIssue(
                    rule_id="naming_convention",
                    severity=SeverityEnum.WARNING,
                    entity_id=e_id,
                    entity_name=e_name,
                    field_id=None,
                    field_name=None,
                    message=f"Entity name '{e_name}' is a reserved SQL keyword. Consider using a plural noun.",
                )
            )

        # Check field names
        for f in raw_fields:
            if isinstance(f, dict):
                f_id = str(f.get("id") or f.get("field_id", ""))
                f_name = f.get("name", "")
            else:
                f_id = str(getattr(f, "id", ""))
                f_name = getattr(f, "name", "")

            if not SNAKE_CASE_PATTERN.match(f_name):
                issues.append(
                    ValidationIssue(
                        rule_id="naming_convention",
                        severity=SeverityEnum.WARNING,
                        entity_id=e_id,
                        entity_name=e_name,
                        field_id=f_id,
                        field_name=f_name,
                        message=f"Use snake_case for field name (e.g., '{f_name.lower().replace(' ', '_')}').",
                    )
                )

            if f_name.lower() in SQL_RESERVED_KEYWORDS:
                issues.append(
                    ValidationIssue(
                        rule_id="naming_convention",
                        severity=SeverityEnum.WARNING,
                        entity_id=e_id,
                        entity_name=e_name,
                        field_id=f_id,
                        field_name=f_name,
                        message=f"Field name '{f_name}' is a reserved SQL keyword. Consider renaming (e.g., '{f_name}_value').",
                    )
                )

    return issues
