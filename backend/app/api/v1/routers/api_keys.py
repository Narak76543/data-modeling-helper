from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse, ApiKeyReorder
from app.core.security import encrypt_api_key, mask_api_key

router = APIRouter()


@router.get("", response_model=List[ApiKeyResponse], summary="List all saved API keys (masked only)")
def list_api_keys(db: Session = Depends(get_db)):
    """
    Retrieve all configured Gemini API keys in priority order (order_index ascending).
    Never exposes plaintext keys.
    """
    keys = db.query(ApiKey).order_by(ApiKey.order_index.asc(), ApiKey.created_at.asc()).all()
    return keys


@router.post("", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED, summary="Add a new API key")
def create_api_key(payload: ApiKeyCreate, db: Session = Depends(get_db)):
    """
    Adds a new Gemini API key. Encrypts the key at rest and computes a masked preview.
    """
    raw_key = payload.api_key.strip()
    if not raw_key:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail      = "API key cannot be empty",
        )               
    # Determine next order_index
    max_order = db.query(func.max(ApiKey.order_index)).scalar()
    next_order = (max_order + 1) if max_order is not None else 0

    encrypted_key = encrypt_api_key(raw_key)
    masked_key = mask_api_key(raw_key)

    new_key = ApiKey(
        label         = payload.label.strip(),
        encrypted_key = encrypted_key,
        masked_key    = masked_key,
        order_index   = next_order,
        is_active     = True,
    )

    db.add(new_key)
    db.commit()
    db.refresh(new_key)

    return new_key


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an API key")
def delete_api_key(key_id: str, db: Session = Depends(get_db)):
    """
    Removes an API key from storage.
    """
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail      = f"API key with ID '{key_id}' not found",
        )

    db.delete(key)
    db.commit()
    return None


@router.put("/reorder", response_model=List[ApiKeyResponse], summary="Reorder API keys by priority")
def reorder_api_keys(payload: ApiKeyReorder, db: Session = Depends(get_db)):
    """
    Updates the priority order of API keys based on the provided list of IDs.
    """
    for index, key_id in enumerate(payload.key_ids):
        key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
        if key:
            key.order_index = index

    db.commit()

    # Return updated list in sorted order
    updated_keys = db.query(ApiKey).order_by(ApiKey.order_index.asc(), ApiKey.created_at.asc()).all()
    return updated_keys
