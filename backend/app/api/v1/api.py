from fastapi import APIRouter
from app.api.v1.routers import validation

api_router = APIRouter()

# Mount validation router
api_router.include_router(validation.router, prefix="/validation", tags=["validation"])
