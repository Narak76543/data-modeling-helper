import re
from collections import defaultdict
from typing import Any, Dict, List, Union
from app.services.validation.models import SeverityEnum, ValidationIssue

REPEATING_PATTERN = re.compile(r"^([a-zA-Z_]+?)(?:_)?([0-9]+)$")


def check_normalization_smells(
    entities: List[Union[Dict[str, Any], Any]]
) -> List[ValidationIssue]:
    """Rule: Warn on likely normalization smells (e.g. repeating groups)."""
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

        # Group field names by stem
        stem_groups = defaultdict(list)
        for f in raw_fields:
            if isinstance(f, dict):
                f_id = str(f.get("id") or f.get("field_id", ""))
                f_name = f.get("name", "")
            else:
                f_id = str(getattr(f, "id", ""))
                f_name = getattr(f, "name", "")

            match = REPEATING_PATTERN.match(f_name)
            if match:
                stem = match.group(1).rstrip("_")
                num = match.group(2)
                stem_groups[stem].append((f_id, f_name, num))

        for stem, matched_fields in stem_groups.items():
            if len(matched_fields) >= 2:
                field_names = [mf[1] for mf in matched_fields]
                joined_names = ", ".join(field_names[:3])
                issues.append(
                    ValidationIssue(
                        rule_id="normalization_repeating_groups",
                        severity=SeverityEnum.WARNING,
                        entity_id=e_id,
                        entity_name=e_name,
                        field_id=matched_fields[0][0],
                        field_name=matched_fields[0][1],
                        message=f"Repeating fields ({joined_names}) suggest a normalization smell. Consider extracting them into a related entity (1:many).",
                    )
                )

    return issues
