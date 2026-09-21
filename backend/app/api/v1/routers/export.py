from typing import List, Optional
from fastapi import APIRouter, Response
from pydantic import BaseModel, Field

from app.schemas.entity import EntityCreate
from app.services.export import DataDictionaryGenerator, ExcelExportGenerator
from app.services.validation import ValidationEngine

router = APIRouter()


class ExportMarkdownRequest(BaseModel):
    project_name      : str = Field(default="Data Modeling Helper Project")
    entities          : List[EntityCreate]
    include_validation: bool = True


class ExportMarkdownResponse(BaseModel):
    markdown: str
    filename: str


class ExportExcelRequest(BaseModel):
    project_name: str = Field(default="Data Modeling Helper Project")
    entities    : List[EntityCreate]


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


@router.post("/excel", tags=["export"])
def export_field_spec_excel(payload: ExportExcelRequest):
    """Generate and download a styled Excel (.xlsx) field-specification workbook from entities."""
    excel_bytes = ExcelExportGenerator.generate_workbook(
        entities     = payload.entities,
        project_name = payload.project_name,
    )

    safe_name = payload.project_name.lower().replace(" ", "_")
    filename = f"{safe_name}_field_spec.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

