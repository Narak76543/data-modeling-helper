from fastapi import APIRouter
from app.api.v1.routers import validation, export, ai

api_router = APIRouter()

# Mount API routers
api_router.include_router(validation.router, prefix="/validation", tags=["validation"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
