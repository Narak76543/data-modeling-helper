from app.core.config import Settings


def test_cors_origins_parsing():
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000,http://localhost:8080")
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
    assert "http://localhost:8080" in settings.BACKEND_CORS_ORIGINS


def test_api_prefix():
    settings = Settings()
    assert settings.API_V1_STR == "/api/v1"
