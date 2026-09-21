import json
import logging
from typing import Optional
import httpx

from app.core.config import settings
from app.services.ai.models import AIGeneratedEntity

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert relational database designer for the "Data Modeling Helper" tool.
Your job is to generate EXACTLY ONE relational database table/entity based on the user's short prompt.

STRICT CONSTRAINTS (CRITICAL):
1. Return EXACTLY ONE entity matching the requested domain.
2. NEVER generate multiple entities or tables.
3. NEVER generate foreign keys or relationships to other tables (FR-14: relationships must remain a manual user step).
4. Always include at least one Primary Key field (e.g. `id` INTEGER or UUID).
5. Only use these standard SQL types: INTEGER, BIGINT, VARCHAR, TEXT, BOOLEAN, TIMESTAMP, DATE, NUMERIC, UUID, JSONB.
6. Table name and column names must strictly use snake_case.
7. Output strictly valid JSON matching this schema:
{
  "name": "string (table name in snake_case)",
  "fields": [
    {
      "name": "string (column name in snake_case)",
      "data_type": "INTEGER | BIGINT | VARCHAR | TEXT | BOOLEAN | TIMESTAMP | DATE | NUMERIC | UUID | JSONB",
      "is_primary_key": boolean,
      "is_nullable": boolean,
      "is_unique": boolean,
      "default_value": "string or null"
    }
  ]
}
"""


class EntityAIGenerator:
    """Service invoking Gemini API to generate single entity definitions."""

    @classmethod
    async def generate_entity(cls, prompt: str) -> AIGeneratedEntity:
        """Call Gemini API and return a validated AIGeneratedEntity."""
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key == "your-gemini-api-key-here":
            raise ValueError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env"
            )

        clean_prompt = prompt.strip()
        if not clean_prompt:
            raise ValueError("Prompt cannot be empty")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={api_key}"

        request_body = {
            "contents": [
                {
                    "parts": [
                        {"text": clean_prompt}
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [
                    {"text": SYSTEM_PROMPT}
                ]
            },
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(url, json=request_body)
            except httpx.TimeoutException:
                raise TimeoutError("Gemini API request timed out after 15 seconds")
            except Exception as e:
                logger.error(f"Network error calling Gemini API: {e}")
                raise ConnectionError(f"Failed to connect to Gemini API: {str(e)}")

        if response.status_code != 200:
            logger.error(f"Gemini API returned error {response.status_code}: {response.text}")
            raise RuntimeError(f"Gemini API error ({response.status_code}): {response.text}")

        data = response.json()
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("Gemini API returned no content candidates")

            raw_text = candidates[0]["content"]["parts"][0]["text"]
            parsed_json = json.loads(raw_text)

            # Strict Pydantic validation
            entity = AIGeneratedEntity.model_validate(parsed_json)
            return entity
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            raise ValueError(f"Malformed AI response: {str(e)}")
