from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SeverityEnum(str, Enum):
    ERROR = "error"
    WARNING = "warning"


class ValidationIssue(BaseModel):
    rule_id: str = Field(..., description="Unique code identifying the validation rule")
    severity: SeverityEnum = Field(..., description="Issue severity: error or warning")
    entity_id: str = Field(..., description="ID of the entity where the issue occurred")
    field_id: Optional[str] = Field(None, description="Optional ID of the specific field")
    entity_name: Optional[str] = Field(None, description="Name of the affected entity")
    field_name: Optional[str] = Field(None, description="Name of the affected field")
    message: str = Field(..., description="Concise, actionable advice in active voice")


class ValidationSummary(BaseModel):
    total_issues: int = 0
    errors: int = 0
    warnings: int = 0


class ValidationResult(BaseModel):
    is_valid: bool
    summary: ValidationSummary
    issues: List[ValidationIssue] = []
