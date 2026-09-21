from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field as PydanticField


class FieldBase(BaseModel):
    name: str = PydanticField(..., min_length=1, max_length=100, description="Column name")
    data_type: str = PydanticField(default="VARCHAR", max_length=50, description="SQL data type")
    is_primary_key: bool = False
    is_foreign_key: bool = False
    references_entity_id: Optional[str] = None
    references_field_id: Optional[str] = None
    is_nullable: bool = True
    is_unique: bool = False
    default_value: Optional[str] = None
    order_index: int = 0


class FieldCreate(FieldBase):
    pass


class FieldUpdate(BaseModel):
    name: Optional[str] = PydanticField(None, min_length=1, max_length=100)
    data_type: Optional[str] = None
    is_primary_key: Optional[bool] = None
    is_foreign_key: Optional[bool] = None
    references_entity_id: Optional[str] = None
    references_field_id: Optional[str] = None
    is_nullable: Optional[bool] = None
    is_unique: Optional[bool] = None
    default_value: Optional[str] = None
    order_index: Optional[int] = None



class FieldResponse(FieldBase):
    id: str
    entity_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
