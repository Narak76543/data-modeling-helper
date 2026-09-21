from typing import List
from fastapi import APIRouter
from pydantic import BaseModel

from app.schemas.entity import EntityCreate
from app.services.validation import ValidationEngine, ValidationResult

router = APIRouter()


class ValidateModelRequest(BaseModel):
    entities: List[EntityCreate]


@router.post("/validate", response_model=ValidationResult, tags=["validation"])
def validate_data_model(payload: ValidateModelRequest) -> ValidationResult:
    """Validate a complete data model schema against structural and relational best practices."""
    return ValidationEngine.validate_model(payload.entities)
