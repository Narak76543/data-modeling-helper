import asyncio
import json
import logging
import socket
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

FALLBACK_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash-lite",
]


class GeminiRequestError(Exception):
    """Custom exception for Gemini API HTTP failures with status code."""
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _send_gemini_request(url: str, request_body: dict, api_key: Optional[str] = None) -> dict:
    """Send HTTP request to Gemini API using Python standard library with 60s timeout."""
    data_bytes = json.dumps(request_body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Api-Revision": "2026-05-20",
    }
    if api_key:
        headers["x-goog-api-key"] = api_key

    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60.0) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        logger.warning(f"Gemini API HTTPError {e.code}: {error_body}")
        raise GeminiRequestError(status_code=e.code, message=f"Gemini API error ({e.code}): {error_body}")
    except urllib.error.URLError as e:
        logger.warning(f"Gemini API URLError: {e.reason}")
        if isinstance(e.reason, socket.timeout):
            raise TimeoutError("Gemini API request timed out after 60 seconds")
        raise ConnectionError(f"Failed to connect to Gemini API: {e.reason}")
    except (TimeoutError, socket.timeout):
        raise TimeoutError("Gemini API request timed out after 60 seconds")


def _extract_text_from_interaction_response(data: dict) -> str:
    """
    Extracts raw text payload from Gemini Interactions API response.
    Supports both new 'steps' schema, 'outputs' schema, and fallback fields.
    """
    # 1. New schema: 'steps' array with 'model_output'
    if "steps" in data and isinstance(data["steps"], list):
        for step in reversed(data["steps"]):
            if isinstance(step, dict):
                content = step.get("content", [])
                if isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text" and part.get("text"):
                            return part["text"]
                        elif isinstance(part, dict) and "text" in part:
                            return part["text"]
                        elif isinstance(part, str):
                            return part
                elif isinstance(step.get("text"), str):
                    return step["text"]

    # 2. Legacy schema: 'outputs' array
    if "outputs" in data and isinstance(data["outputs"], list):
        for output in reversed(data["outputs"]):
            if isinstance(output, dict) and output.get("text"):
                return output["text"]
            elif isinstance(output, str):
                return output

    # 3. Direct output_text convenience
    if "output_text" in data and isinstance(data["output_text"], str):
        return data["output_text"]

    # 4. GenerateContent backward-compatibility fallback ('candidates')
    if "candidates" in data and isinstance(data["candidates"], list) and data["candidates"]:
        parts = data["candidates"][0].get("content", {}).get("parts", [])
        if parts and isinstance(parts[0], dict) and parts[0].get("text"):
            return parts[0]["text"]

    raise ValueError("Gemini API response did not contain any valid text output in steps/outputs")


class EntityAIGenerator:
    """Service invoking Gemini Interactions API to generate single entity definitions with multi-key & multi-model fallback."""

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
    def _get_candidate_models(cls) -> List[str]:
        """Returns ordered list of models to try, starting with primary configured model."""
        primary = settings.GEMINI_MODEL.strip()
        models = [primary]
        for m in FALLBACK_MODELS:
            if m != primary and m not in models:
                models.append(m)
        return models

    @classmethod
    async def generate_entity(cls, prompt: str, db: Optional[Session] = None) -> AIGeneratedEntity:
        """
        Call Gemini Interactions API with automatic multi-key and multi-model fallback.
        Seamlessly falls back to secondary models on 503 (high demand / busy) and rotates keys on 429/403.
        """
        clean_prompt = prompt.strip()
        if not clean_prompt:
            raise ValueError("Prompt cannot be empty")

        candidate_keys = cls._get_candidate_keys(db)
        if not candidate_keys:
            raise ValueError(
                "No Gemini API keys configured. Please add an API key in Settings or set GEMINI_API_KEY in .env"
            )

        candidate_models = cls._get_candidate_models()
        last_error: Optional[Exception] = None

        for key_index, (label, api_key) in enumerate(candidate_keys):
            url = f"https://generativelanguage.googleapis.com/v1beta/interactions?key={api_key}"

            for model_name in candidate_models:
                logger.info(
                    f"Attempting entity generation using key '{label}' ({key_index + 1}/{len(candidate_keys)}) with model '{model_name}'"
                )

                request_body = {
                    "model": model_name,
                    "input": clean_prompt,
                    "system_instruction": SYSTEM_PROMPT,
                    "response_format": {
                        "type": "text",
                        "mime_type": "application/json",
                    },
                    "generation_config": {
                        "temperature": 0.2,
                    },
                }

                try:
                    data = await asyncio.to_thread(_send_gemini_request, url, request_body, api_key)

                    raw_text = _extract_text_from_interaction_response(data)

                    # Clean markdown fences if any
                    cleaned_text = raw_text.strip()
                    if cleaned_text.startswith("```"):
                        lines = cleaned_text.splitlines()
                        if lines and lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].startswith("```"):
                            lines = lines[:-1]
                        cleaned_text = "\n".join(lines).strip()

                    parsed_json = json.loads(cleaned_text)

                    # Strict Pydantic validation
                    entity = AIGeneratedEntity.model_validate(parsed_json)
                    return entity

                except GeminiRequestError as ge:
                    # If model is specifically busy / experiencing high demand (503), try next fallback model on same key
                    if ge.status_code == 503:
                        logger.warning(
                            f"Model '{model_name}' returned status 503 ({ge.message}). Trying fallback model..."
                        )
                        last_error = ge
                        continue

                    # If key is rate-limited (429) or invalid (400/401/403), rotate immediately to next key
                    logger.warning(
                        f"Gemini API key '{label}' failed with status {ge.status_code} ({ge.message}). Rotating to next key..."
                    )
                    last_error = ge
                    break

                except (ConnectionError, TimeoutError) as ce:
                    logger.warning(
                        f"Network error on model '{model_name}' with key '{label}': {ce}. Trying fallback model..."
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
                    logger.error(f"Unexpected error with model '{model_name}' on key '{label}': {e}")
                    last_error = e
                    continue

        # If all keys and models failed
        error_msg = f"All {len(candidate_keys)} Gemini API key(s) / fallback models failed. Last error: {str(last_error)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)
