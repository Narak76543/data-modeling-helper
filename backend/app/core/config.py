from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Data Modeling Helper API"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/data_modeling_helper"

    # Gemini AI Configuration
    GEMINI_API_KEY: Union[str, None] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # API Key Encryption Secret (at-rest)
    API_KEY_ENCRYPTION_SECRET: str = "dev-insecure-encryption-secret-key-change-in-production"


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
