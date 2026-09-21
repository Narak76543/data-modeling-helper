from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.schemas.entity import EntityCreate
from app.services.export import DataDictionaryGenerator
from app.services.validation import ValidationEngine

router = APIRouter()


class ExportMarkdownRequest(BaseModel):
    project_name      : str = Field(default="Data Modeling Helper Project")
    entities          : List[EntityCreate]
    include_validation: bool = True


class ExportMarkdownResponse(BaseModel):
    markdown: str
    filename: str


@router.post("/markdown", response_model=ExportMarkdownResponse, tags=["export"])
def export_data_dictionary_markdown(payload: ExportMarkdownRequest) -> ExportMarkdownResponse:
    """Generate and return a plain-language Markdown data dictionary from entities."""
    validation_result = (
        ValidationEngine.validate_model(payload.entities)
        if payload.include_validation
        else None
    )

    markdown_doc = DataDictionaryGenerator.generate_markdown(
        entities          = payload.entities,
        project_name      = payload.project_name,
        validation_result = validation_result,
    )

    safe_name = payload.project_name.lower().replace(" ", "_")
    filename = f"{safe_name}_data_dictionary.md"

    return ExportMarkdownResponse(
        markdown = markdown_doc,
        filename = filename,
    )
