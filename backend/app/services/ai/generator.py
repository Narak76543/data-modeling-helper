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
from app.services.ai.models import AIGeneratedEntity, AIGeneratedField

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert relational database architect for the "Data Modeling Helper" tool.
Your job is to generate EXACTLY ONE production-grade relational database table based on the user's short prompt.

CRITICAL ENGINEERING CONSTRAINTS:
1. Return EXACTLY ONE entity matching the requested domain. Never generate multiple tables.
2. NEVER generate foreign keys or relationships to other tables (FR-14: relationships remain a manual user step for single tables).
3. Primary Key: Always include an `id` Primary Key (e.g. `INTEGER` or `UUID`). In the field's `description`, explicitly state the PK strategy reasoning (e.g. "Sequential integer primary key" or "UUID primary key for distributed security").
4. Human Labels & Descriptions: Every field MUST have a clean, human-readable `label` (e.g. "Unit Price", "Email Address") and a clear technical/business `description` explaining its purpose and constraints.
5. Type Precision & Sizing:
   - Monetary/Currency/Financial amounts: MUST use `NUMERIC` with explicit length/precision (e.g. `10,2` or `12,2`) and sensible default (e.g. "0.00"). NEVER use bare `INTEGER` or unparameterized `NUMERIC`.
   - Event Timestamps vs Calendar Dates: Use `TIMESTAMP` for exact event moments with default "CURRENT_TIMESTAMP". Use `DATE` only for pure calendar dates without time (e.g. `birth_date`).
   - String Lengths: Specify sensible length for `VARCHAR` (e.g. `255`, `100`, `50`).
6. Audit Columns: Standard entities MUST include `created_at` and `updated_at` (`TIMESTAMP`, `is_nullable: false`, `default_value: "CURRENT_TIMESTAMP"`).
   - Exception rule: Small static lookup/reference tables (e.g. `status_types`) may omit `updated_at`.
7. Allowed SQL Types: INTEGER, BIGINT, VARCHAR, TEXT, BOOLEAN, TIMESTAMP, DATE, NUMERIC, UUID, JSONB.
8. Naming: Table name (plural) and column names must strictly use snake_case.

Output strictly valid JSON matching this schema:
{
  "name": "string (table name in snake_case, plural)",
  "fields": [
    {
      "name": "string (column name in snake_case)",
      "label": "string (human-readable label, e.g. 'Email Address')",
      "description": "string (business/technical description)",
      "data_type": "INTEGER | BIGINT | VARCHAR | TEXT | BOOLEAN | TIMESTAMP | DATE | NUMERIC | UUID | JSONB",
      "length": "string or null (e.g. '255', '10,2', '36')",
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
    def _format_label(cls, name: str) -> str:
        tokens = name.replace("-", "_").split("_")
        formatted = []
        acronyms = {"id", "fk", "pk", "url", "ip", "api", "uuid", "sql", "db", "lc", "doc", "uri"}
        for t in tokens:
            if t.lower() in acronyms:
                formatted.append(t.upper())
            else:
                formatted.append(t.capitalize())
        return " ".join(formatted)

    @classmethod
    def _post_process_entity(cls, entity: AIGeneratedEntity) -> AIGeneratedEntity:
        """
        Auto-correct and enrich entity fields with developer-level defaults (FR-33, FR-34, FR-35, FR-37):
        - Ensure label, description, and length are populated.
        - Ensure primary key exists (injects 'id' if omitted).
        - Enforce NUMERIC length/precision for monetary fields.
        - Ensure standard audit columns (created_at, updated_at) are present unless pure lookup.
        """
        fields = list(entity.fields)

        # 1. Primary Key check (FR-37)
        has_pk = any(f.is_primary_key for f in fields)
        if not has_pk:
            pk_field = AIGeneratedField(
                name="id",
                data_type="INTEGER",
                label="ID",
                description="Primary key auto-increment integer identifier",
                length=None,
                is_primary_key=True,
                is_nullable=False,
                is_unique=True,
            )
            fields.insert(0, pk_field)

        # 2. Enrich and normalize each field
        for f in fields:
            if not f.label:
                f.label = cls._format_label(f.name)
            if not f.description:
                if f.is_primary_key:
                    f.description = f"Primary key identifier for {entity.name}"
                elif f.is_foreign_key:
                    f.description = f"Foreign key reference to {f.references_entity or 'related table'}"
                else:
                    f.description = f"{f.label} attribute"

            # Precision/length defaults
            if f.data_type == "NUMERIC" and not f.length:
                f.length = "10,2"
            elif f.data_type == "VARCHAR" and not f.length:
                f.length = "255"
            elif f.data_type == "UUID" and not f.length:
                f.length = "36"

        # 3. Audit columns (FR-35)
        lookup_suffixes = ("status", "statuses", "type", "types", "role", "roles", "category", "categories", "lookup", "enum")
        is_lookup_name = any(entity.name.lower().endswith(suffix) or entity.name.lower() == suffix for suffix in lookup_suffixes)
        is_lookup = is_lookup_name and len(fields) <= 3
        existing_names = {f.name.lower() for f in fields}

        if not is_lookup:
            if "created_at" not in existing_names:
                fields.append(
                    AIGeneratedField(
                        name="created_at",
                        data_type="TIMESTAMP",
                        label="Created At",
                        description="Timestamp when the record was created",
                        is_nullable=False,
                        default_value="CURRENT_TIMESTAMP",
                    )
                )
            if "updated_at" not in existing_names:
                fields.append(
                    AIGeneratedField(
                        name="updated_at",
                        data_type="TIMESTAMP",
                        label="Updated At",
                        description="Timestamp when the record was last modified",
                        is_nullable=False,
                        default_value="CURRENT_TIMESTAMP",
                    )
                )

        return AIGeneratedEntity(
            name=entity.name,
            description=getattr(entity, "description", None),
            fields=fields,
        )

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
                    entity = EntityAIGenerator._post_process_entity(entity)
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
