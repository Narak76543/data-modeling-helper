from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    """Standardized error envelope per project-rules.md."""
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: str
    project: str
    database: str

