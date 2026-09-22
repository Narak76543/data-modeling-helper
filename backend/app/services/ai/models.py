import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

ALLOWED_SQL_TYPES = {
    "INTEGER", "BIGINT", "VARCHAR", "TEXT", "BOOLEAN",
    "TIMESTAMP", "DATE", "NUMERIC", "UUID", "JSONB"
}

SNAKE_CASE_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


class AIGeneratedField(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Column name in snake_case")
    data_type: str = Field(default="VARCHAR", description="SQL data type from standard list")
    label: Optional[str] = Field(default=None, description="Human-readable column label")
    description: Optional[str] = Field(default=None, description="Business or technical purpose of field")
    length: Optional[str] = Field(default=None, description="Length or precision constraint (e.g. 255, 10,2, 36)")
    is_primary_key: bool = False
    is_foreign_key: bool = False
    references_entity: Optional[str] = None
    references_field: Optional[str] = None
    is_nullable: bool = True
    is_unique: bool = False
    default_value: Optional[str] = None


    @field_validator("name")
    @classmethod
    def validate_field_name(cls, v: str) -> str:
        clean = v.strip().lower().replace(" ", "_").replace("-", "_")
        if not SNAKE_CASE_PATTERN.match(clean):
            # Fallback cleanup
            clean = re.sub(r"[^a-z0-9_]", "", clean) or "column"
        return clean

    @field_validator("data_type")
    @classmethod
    def validate_data_type(cls, v: str) -> str:
        upper = v.strip().upper()
        if upper in ALLOWED_SQL_TYPES:
            return upper
        # Map common aliases
        if "INT" in upper:
            return "INTEGER"
        if "CHAR" in upper or "STRING" in upper:
            return "VARCHAR"
        if "BOOL" in upper:
            return "BOOLEAN"
        if "TIME" in upper or "DATETIME" in upper:
            return "TIMESTAMP"
        if "FLOAT" in upper or "DECIMAL" in upper or "DOUBLE" in upper:
            return "NUMERIC"
        if "JSON" in upper:
            return "JSONB"
        return "VARCHAR"


class AIGeneratedEntity(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Entity name in snake_case")
    description: Optional[str] = None
    fields: List[AIGeneratedField] = Field(..., min_length=1, description="List of columns for this entity")

    @field_validator("name")
    @classmethod
    def validate_entity_name(cls, v: str) -> str:
        clean = v.strip().lower().replace(" ", "_").replace("-", "_")
        if not SNAKE_CASE_PATTERN.match(clean):
            clean = re.sub(r"[^a-z0-9_]", "", clean) or "entity"
        return clean

