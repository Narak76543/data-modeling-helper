from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.ai import AIGeneratedEntity, EntityAIGenerator

router = APIRouter()


class GenerateEntityRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Short prompt describing the table to generate (e.g. 'address table')",
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
