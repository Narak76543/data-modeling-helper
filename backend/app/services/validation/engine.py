from typing import Any, Dict, List, Union
from app.services.validation.models import SeverityEnum, ValidationIssue, ValidationResult, ValidationSummary
from app.services.validation.rules.primary_key import check_missing_primary_key
from app.services.validation.rules.foreign_key import check_orphan_foreign_keys
from app.services.validation.rules.naming import check_naming_conventions
from app.services.validation.rules.normalization import check_normalization_smells


class ValidationEngine:
    """Master validation engine coordinating data model best-practice checks."""

    @classmethod
    def validate_model(
        cls,
        entities: List[Union[Dict[str, Any], Any]],
    ) -> ValidationResult:
        """Run all validation rules against the given entities."""
        issues: List[ValidationIssue] = []

        # 1. Primary key rule
        issues.extend(check_missing_primary_key(entities))

        # 2. Foreign key rule
        issues.extend(check_orphan_foreign_keys(entities))

        # 3. Naming convention rule
        issues.extend(check_naming_conventions(entities))

        # 4. Normalization smells rule
        issues.extend(check_normalization_smells(entities))

        errors_count = sum(1 for i in issues if i.severity == SeverityEnum.ERROR)
        warnings_count = sum(1 for i in issues if i.severity == SeverityEnum.WARNING)

        return ValidationResult(
            is_valid=(errors_count == 0),
            summary=ValidationSummary(
                total_issues=len(issues),
                errors=errors_count,
                warnings=warnings_count,
            ),
            issues=issues,
        )
