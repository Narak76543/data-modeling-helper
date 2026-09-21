from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    """Schema for adding a new API key."""
    label: str = Field(..., min_length=1, max_length=100, description="Human-readable label for the key")
    api_key: str = Field(..., min_length=5, max_length=255, description="Plaintext API key (never stored as plaintext)")


class ApiKeyResponse(BaseModel):
    """Schema for presenting an API key (safely masked, zero plaintext)."""
    id: str
    label: str
    masked_key: str
    order_index: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApiKeyReorder(BaseModel):
    """Schema for reordering keys by priority."""
    key_ids: List[str] = Field(..., description="Ordered list of API key IDs reflecting priority from highest to lowest")
