from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.api import api_router
from app.core.config import settings
from app.db.session import get_db
from app.schemas.common import HealthResponse


def create_application() -> FastAPI:
    """Application factory for FastAPI."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
    )

    # Set up CORS middleware
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Mount API v1 router
    application.include_router(api_router, prefix=settings.API_V1_STR)

    @application.get("/", include_in_schema=False)
    def root_redirect():
        """Redirect root to Swagger documentation."""
        return RedirectResponse(url=f"{settings.API_V1_STR}/docs")

    @application.get("/docs", include_in_schema=False)
    def docs_redirect():
        """Redirect /docs to versioned API documentation."""
        return RedirectResponse(url=f"{settings.API_V1_STR}/docs")

    @application.get("/health", response_model=HealthResponse, tags=["health"])
    def health_check(db: Session = Depends(get_db)) -> HealthResponse:
        """Health check endpoint to verify backend service and database connectivity."""
        db_status = "connected"
        try:
            db.execute(text("SELECT 1"))
        except Exception:
            db_status = "disconnected"

        return HealthResponse(
            status="healthy" if db_status == "connected" else "degraded",
            project=settings.PROJECT_NAME,
            database=db_status,
        )

    return application


app = create_application()


