import asyncio
import json
import logging
import uuid
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.ai.generator import (
    EntityAIGenerator,
    _send_gemini_request,
    _extract_text_from_interaction_response,
    GeminiRequestError,
)
from app.services.ai.project_models import (
    AIGeneratedProject,
    AIGeneratedProjectEntity,
    AIGeneratedRelationship,
    AIGeneratedField,
)
from app.services.validation.engine import ValidationEngine

logger = logging.getLogger(__name__)

STEP1_DECOMPOSITION_PROMPT = """You are an expert relational database architect for the "Data Modeling Helper" tool.
Analyze the user's project prompt and decompose it into 4 to 8 core relational database tables (never exceed 10).

CRITICAL ARCHITECTURE CONSTRAINTS (M:N RELATIONSHIP RESOLUTION):
1. Return between 4 and 8 core tables (maximum 10).
2. Many-to-Many Detection: Identify any many-to-many relationships in the domain (e.g. students <-> classes, users <-> roles, orders <-> products, doctors <-> patients).
3. Junction Tables: You MUST explicitly create a dedicated junction/pivot table (e.g. `student_enrollments`, `user_roles`, `order_items`, `doctor_appointments`) to bridge every many-to-many relationship, rather than leaving an unresolved direct M:N connection. Mark these with `is_junction: true`.
4. Table names must strictly use snake_case and standard plural naming (e.g. `users`, `products`, `orders`, `order_items`).

Output strictly valid JSON matching this schema:
{
  "project_name": "string (readable title)",
  "description": "string (brief summary of domain)",
  "tables": [
    {
      "name": "string (table name in snake_case, plural)",
      "purpose": "string (brief explanation of table purpose)",
      "is_junction": boolean,
      "bridges_tables": ["string (table1)", "string (table2)"]
    }
  ]
}
"""

STEP2_SYNTHESIS_PROMPT = """You are an expert relational database architect for the "Data Modeling Helper" tool.
Given the project domain and its core tables, generate the complete production-grade relational schema with fields, SQL types, primary keys, human-readable labels, descriptions, and explicit foreign key relationships.

CRITICAL ENGINEERING CONSTRAINTS:
1. Generate every table listed in the prompt.
2. Primary Key: Every table MUST have an `id` Primary Key (e.g. `INTEGER` or `UUID`). In the field's `description`, explicitly state the PK strategy reasoning.
3. Human Labels & Descriptions: Every field MUST include a human-readable `label` (e.g. "Total Amount", "Student ID") and a technical/business `description` explaining its purpose and constraints.
4. Type Precision & Sizing:
   - Monetary/Currency (e.g. price, total_amount, fee, cost, price_at_purchase): MUST use `data_type: "NUMERIC"` with explicit `length: "10,2"` (or `"12,2"`) and `default_value: "0.00"`. NEVER use bare `INTEGER` or unparameterized `NUMERIC`.
   - Timestamps vs Dates: Use `TIMESTAMP` with default "CURRENT_TIMESTAMP" for event moments; use `DATE` only for pure calendar dates (e.g. `birth_date`).
   - String Lengths: Provide sensible length for `VARCHAR` (e.g. `255`, `100`, `50`).
5. Audit Columns: Standard tables MUST include `created_at` and `updated_at` (`TIMESTAMP`, `is_nullable: false`, `default_value: "CURRENT_TIMESTAMP"`). Small static lookup tables may omit `updated_at`.
6. Junction Tables & Relationships:
   - For junction tables (e.g. `order_items`, `user_roles`), include explicit Foreign Keys pointing to each parent table with `1:many` relationships originating from the parent tables.
   - NEVER emit direct `many:many` relationship edges in the `relationships` array; all M:N relationships must be represented via their intermediate junction table.
7. Allowed SQL Types: INTEGER, BIGINT, VARCHAR, TEXT, BOOLEAN, TIMESTAMP, DATE, NUMERIC, UUID, JSONB.
8. Naming: Table names and column names must strictly use snake_case.

Output strictly valid JSON matching this schema:
{
  "project_name": "string",
  "description": "string",
  "entities": [
    {
      "name": "string (snake_case, plural)",
      "description": "string (table purpose)",
      "fields": [
        {
          "name": "string (column name in snake_case)",
          "label": "string (human-readable label, e.g. 'Unit Price')",
          "description": "string (business/technical description, e.g. 'Base unit price in USD')",
          "data_type": "INTEGER | BIGINT | VARCHAR | TEXT | BOOLEAN | TIMESTAMP | DATE | NUMERIC | UUID | JSONB",
          "length": "string or null (MUST be '10,2' for NUMERIC currency fields, '255' for VARCHAR)",
          "is_primary_key": boolean,
          "is_foreign_key": boolean,
          "references_entity": "target_table_name or null",
          "references_field": "id or null",
          "is_nullable": boolean,
          "is_unique": boolean,
          "default_value": "string or null (e.g. '0.00' for currency fields)"
        }
      ]
    }
  ],
  "relationships": [
    {
      "source_entity": "table_containing_foreign_key",
      "source_field": "fk_column_name",
      "target_entity": "referenced_table_name",
      "target_field": "id",
      "cardinality": "1:1 | 1:many"
    }
  ]
}
"""



class ProjectAIGenerator:
    """Service generating multi-table relational schema drafts via a two-step Gemini process."""

    @classmethod
    async def _call_gemini_with_fallback(
        cls,
        system_instruction: str,
        user_input: str,
        db: Optional[Session] = None,
    ) -> dict:
        """Invokes Gemini Interactions API with automatic multi-key and multi-model failover."""
        candidate_keys = EntityAIGenerator._get_candidate_keys(db)
        if not candidate_keys:
            raise ValueError(
                "No Gemini API keys configured. Please add an API key in Settings or set GEMINI_API_KEY in .env"
            )

        candidate_models = EntityAIGenerator._get_candidate_models()
        last_error: Optional[Exception] = None

        for key_index, (label, api_key) in enumerate(candidate_keys):
            url = f"https://generativelanguage.googleapis.com/v1beta/interactions?key={api_key}"

            for model_name in candidate_models:
                request_body = {
                    "model": model_name,
                    "input": user_input,
                    "system_instruction": system_instruction,
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

                    # Clean markdown code fences if any
                    cleaned_text = raw_text.strip()
                    if cleaned_text.startswith("```"):
                        lines = cleaned_text.splitlines()
                        if lines and lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].startswith("```"):
                            lines = lines[:-1]
                        cleaned_text = "\n".join(lines).strip()

                    return json.loads(cleaned_text)

                except GeminiRequestError as ge:
                    if ge.status_code == 503:
                        logger.warning(
                            f"Model '{model_name}' returned 503. Retrying with fallback model..."
                        )
                        last_error = ge
                        continue

                    logger.warning(
                        f"Gemini API key '{label}' failed with status {ge.status_code}. Rotating key..."
                    )
                    last_error = ge
                    break

                except (ConnectionError, TimeoutError) as ce:
                    logger.warning(
                        f"Network error on model '{model_name}' with key '{label}': {ce}. Retrying..."
                    )
                    last_error = ce
                    continue

                except ValueError as ve:
                    if "Malformed AI response" in str(ve) or "validation error" in str(ve).lower():
                        raise ve
                    last_error = ve
                    continue

                except Exception as e:
                    logger.error(f"Unexpected error with model '{model_name}' on key '{label}': {e}")
                    last_error = e
                    continue

        raise RuntimeError(f"All API keys/models failed during project generation. Last error: {str(last_error)}")

    @classmethod
    def _run_pre_validation(cls, project: AIGeneratedProject) -> dict:
        """
        Executes the full FR-4 validation engine across all generated tables and cross-entity FKs (FR-21, FR-37).
        """
        mock_entities: List[Dict[str, Any]] = []

        for e in project.entities:
            entity_id = e.name
            mock_fields: List[Dict[str, Any]] = []

            for idx, f in enumerate(e.fields):
                field_id = f"{e.name}_{f.name}"
                ref_entity_id = f.references_entity if f.references_entity else None
                ref_field_id = f"{f.references_entity}_{f.references_field or 'id'}" if ref_entity_id else None

                mock_fields.append({
                    "id": field_id,
                    "entity_id": entity_id,
                    "name": f.name,
                    "label": f.label,
                    "description": f.description,
                    "length": f.length,
                    "data_type": f.data_type,
                    "is_primary_key": f.is_primary_key,
                    "is_foreign_key": f.is_foreign_key,
                    "references_entity_id": ref_entity_id,
                    "references_field_id": ref_field_id,
                    "is_nullable": f.is_nullable,
                    "is_unique": f.is_unique,
                    "default_value": f.default_value,
                    "order_index": idx,
                })

            mock_entities.append({
                "id": entity_id,
                "name": e.name,
                "fields": mock_fields,
            })

        val_result = ValidationEngine.validate_model(mock_entities)
        return val_result.model_dump()

    @classmethod
    async def generate_project(cls, prompt: str, db: Optional[Session] = None) -> AIGeneratedProject:
        """
        Two-step generation process (FR-18):
        Step 1: Domain decomposition -> extract 4-8 core tables with M:N junction table detection.
        Step 2: Relational schema synthesis -> fields, types, constraints, and relationships.
        Runs multi-entity post-processing and full pre-validation (FR-21, FR-33..37) before returning.
        """
        clean_prompt = prompt.strip()
        if not clean_prompt:
            raise ValueError("Project prompt cannot be empty")

        # Step 1: Decompose domain into entities
        logger.info(f"Project Generation Step 1: Decomposing domain prompt '{clean_prompt}'")
        step1_res = await cls._call_gemini_with_fallback(
            system_instruction=STEP1_DECOMPOSITION_PROMPT,
            user_input=f"Project Domain Prompt: {clean_prompt}",
            db=db,
        )

        tables_meta = step1_res.get("tables", [])
        if not tables_meta:
            raise ValueError("Step 1 failed: Gemini did not return any entity tables")

        # Cap tables to 8-10 max (FR-19)
        tables_meta = tables_meta[:10]
        tables_summary = json.dumps(tables_meta)
        project_title = step1_res.get("project_name", clean_prompt.title())
        project_desc = step1_res.get("description", "")

        # Step 2: Synthesize full fields, types, and cross-table relationships
        logger.info(f"Project Generation Step 2: Synthesizing schema for tables: {[t.get('name') for t in tables_meta]}")
        step2_input = (
            f"Project Title: {project_title}\n"
            f"Domain Description: {project_desc}\n"
            f"Target Tables: {tables_summary}\n\n"
            f"Generate all columns, SQL types, primary keys, and foreign key relationships connecting these tables."
        )

        step2_res = await cls._call_gemini_with_fallback(
            system_instruction=STEP2_SYNTHESIS_PROMPT,
            user_input=step2_input,
            db=db,
        )

        # Validate with Pydantic
        project = AIGeneratedProject.model_validate(step2_res)

        # Ensure project name and description are preserved
        if not project.project_name:
            project.project_name = project_title
        if not project.description:
            project.description = project_desc

        # Post-process all entities (FR-33, FR-34, FR-35)
        entity_name_set = {e.name.lower() for e in project.entities}
        processed_entities: List[AIGeneratedProjectEntity] = []
        for e in project.entities:
            # Auto-correct orphan FK references on field level before post-processing
            for f in e.fields:
                if f.is_foreign_key and f.references_entity:
                    if f.references_entity.lower() not in entity_name_set:
                        # Orphan foreign key reference to a table not in project
                        f.is_foreign_key = False
                        f.references_entity = None
                        f.references_field = None
            processed_e = EntityAIGenerator._post_process_entity(e)
            processed_entities.append(
                AIGeneratedProjectEntity(
                    name=processed_e.name,
                    description=e.description,
                    fields=processed_e.fields,
                )
            )
        project.entities = processed_entities

        # Normalize and filter relationships (FR-36):
        valid_rels: List[AIGeneratedRelationship] = []
        for rel in project.relationships:
            if rel.source_entity.lower() in entity_name_set and rel.target_entity.lower() in entity_name_set:
                # If AI emitted direct 'many:many' instead of 1:many to junction table, normalize to 1:many
                if rel.cardinality == "many:many":
                    rel.cardinality = "1:many"
                valid_rels.append(rel)
        project.relationships = valid_rels

        # Step 3: Run full server-side validation (FR-21, FR-37)
        try:
            val_summary = cls._run_pre_validation(project)
            project.validation_summary = val_summary
        except Exception as ex:
            logger.error(f"Pre-preview validation failed to compute: {ex}")

        return project
