import asyncio
import json
import logging
import urllib.request
import urllib.error
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decrypt_api_key
from app.models.api_key import ApiKey
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


class GeminiRequestError(Exception):
    """Custom exception for Gemini API HTTP failures with status code."""
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _send_gemini_request(url: str, request_body: dict) -> dict:
    """Send HTTP request to Gemini API using Python standard library."""
    data_bytes = json.dumps(request_body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15.0) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        logger.warning(f"Gemini API HTTPError {e.code}: {error_body}")
        raise GeminiRequestError(status_code=e.code, message=f"Gemini API error ({e.code}): {error_body}")
    except urllib.error.URLError as e:
        logger.warning(f"Gemini API URLError: {e.reason}")
        raise ConnectionError(f"Failed to connect to Gemini API: {e.reason}")
    except TimeoutError:
        raise TimeoutError("Gemini API request timed out after 15 seconds")


class EntityAIGenerator:
    """Service invoking Gemini API to generate single entity definitions with multi-key rotation."""

    @classmethod
    def _get_candidate_keys(cls, db: Optional[Session] = None) -> List[Tuple[str, str]]:
        """
        Retrieves ordered candidate API keys: [(label, plaintext_key), ...].
        Priority order: Active DB keys (order_index ASC) -> env fallback GEMINI_API_KEY.
        """
        candidates: List[Tuple[str, str]] = []

        if db is not None:
            db_keys = (
                db.query(ApiKey)
                .filter(ApiKey.is_active == True)
                .order_by(ApiKey.order_index.asc(), ApiKey.created_at.asc())
                .all()
            )
            for k in db_keys:
                try:
                    decrypted = decrypt_api_key(k.encrypted_key)
                    if decrypted:
                        candidates.append((k.label, decrypted))
                except Exception as ex:
                    logger.error(f"Failed to decrypt stored API key '{k.label}' (id={k.id}): {ex}")

        # Fallback to environment variable if no database keys configured or as final backup
        env_key = settings.GEMINI_API_KEY
        if env_key and env_key != "your-gemini-api-key-here":
            if not any(c[1] == env_key for c in candidates):
                candidates.append(("Environment Key", env_key))

        return candidates

    @classmethod
    async def generate_entity(cls, prompt: str, db: Optional[Session] = None) -> AIGeneratedEntity:
        """
        Call Gemini API with automatic key rotation and return a validated AIGeneratedEntity.
        Retries across keys if a rate-limit (429), quota (403), or invalid key (400/401) error occurs.
        """
        clean_prompt = prompt.strip()
        if not clean_prompt:
            raise ValueError("Prompt cannot be empty")

        candidates = cls._get_candidate_keys(db)
        if not candidates:
            raise ValueError(
                "No Gemini API keys configured. Please add an API key in Settings or set GEMINI_API_KEY in .env"
            )

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

        last_error: Optional[Exception] = None

        for index, (label, api_key) in enumerate(candidates):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={api_key}"
            logger.info(f"Attempting entity generation using key '{label}' (index {index + 1}/{len(candidates)})")

            try:
                data = await asyncio.to_thread(_send_gemini_request, url, request_body)

                candidates_res = data.get("candidates", [])
                if not candidates_res:
                    raise ValueError("Gemini API returned no content candidates")

                raw_text = candidates_res[0]["content"]["parts"][0]["text"]
                parsed_json = json.loads(raw_text)

                # Strict Pydantic validation
                entity = AIGeneratedEntity.model_validate(parsed_json)
                return entity

            except GeminiRequestError as ge:
                # Key rotation eligible on 429 (rate limit), 403 (quota/forbidden), 400/401 (invalid key/auth)
                logger.warning(
                    f"Gemini API key '{label}' failed with status {ge.status_code}. Rotating to next key..."
                )
                last_error = ge
                continue
            except (ConnectionError, TimeoutError) as ce:
                logger.warning(
                    f"Network error on key '{label}': {ce}. Rotating to next key..."
                )
                last_error = ce
                continue
            except ValueError as ve:
                # If it's a parsing/validation error from a successful response, do not rotate blindly
                if "Malformed AI response" in str(ve) or "validation error" in str(ve).lower():
                    raise ve
                last_error = ve
                continue
            except Exception as e:
                logger.error(f"Unexpected error with key '{label}': {e}")
                last_error = e
                continue

        # If all keys failed
        error_msg = f"All {len(candidates)} Gemini API key(s) failed. Last error: {str(last_error)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)
