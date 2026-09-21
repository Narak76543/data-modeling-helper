from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.ai import (
    AIGeneratedEntity,
    EntityAIGenerator,
    AIGeneratedProject,
    ProjectAIGenerator,
)

router = APIRouter()


class GenerateEntityRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Short prompt describing the table to generate (e.g. 'address table')",
    )


class GenerateProjectRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Prompt describing the project or domain to generate (e.g. 'School management system')",
    )


@router.post(
    "/generate-entity",
    response_model=AIGeneratedEntity,
    tags=["ai"],
    summary="Generate a single entity via Gemini AI",
)
async def generate_entity_with_ai(
    payload: GenerateEntityRequest,
    db: Session = Depends(get_db),
) -> AIGeneratedEntity:
    """Generate a single relational database table schema from natural language prompt."""
    try:
        entity = await EntityAIGenerator.generate_entity(payload.prompt, db=db)
        return entity
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AI_INVALID_PROMPT", "message": str(ve)},
        )
    except TimeoutError as te:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={"code": "AI_TIMEOUT", "message": str(te)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AI_GENERATION_FAILED", "message": str(e)},
        )


@router.post(
    "/generate-project",
    response_model=AIGeneratedProject,
    tags=["ai"],
    summary="Generate a multi-table project draft via Gemini AI (FR-18)",
)
async def generate_project_with_ai(
    payload: GenerateProjectRequest,
    db: Session = Depends(get_db),
) -> AIGeneratedProject:
    """
    Generate a full multi-table starting relational schema (4-8 tables with fields and relationships)
    from a domain description using a two-step Gemini pipeline and pre-validation.
    """
    try:
        project = await ProjectAIGenerator.generate_project(payload.prompt, db=db)
        return project
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AI_INVALID_PROMPT", "message": str(ve)},
        )
    except TimeoutError as te:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={"code": "AI_TIMEOUT", "message": str(te)},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AI_PROJECT_GENERATION_FAILED", "message": str(e)},
        )
