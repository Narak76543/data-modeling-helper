from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field as PydanticField
from app.schemas.field import FieldCreate, FieldResponse


class EntityBase(BaseModel):
    name: str = PydanticField(..., min_length=1, max_length=100, description="Entity/table name")
    pos_x: float = 0.0
    pos_y: float = 0.0


class EntityCreate(EntityBase):
    fields: Optional[List[FieldCreate]] = None


class EntityUpdate(BaseModel):
    name: Optional[str] = PydanticField(None, min_length=1, max_length=100)
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None


class EntityResponse(EntityBase):
    id: str
    created_at: datetime
    updated_at: datetime
    fields: List[FieldResponse] = []

    model_config = ConfigDict(from_attributes=True)
