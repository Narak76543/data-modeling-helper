import asyncio
import pytest
from unittest.mock import patch
from app.services.ai.models import AIGeneratedEntity, AIGeneratedField
from app.services.ai.generator import (
    EntityAIGenerator,
    _extract_text_from_interaction_response,
)


def test_ai_generated_field_validation():
    field = AIGeneratedField(
        name="User Email Address",
        data_type="varchar",
        is_primary_key=False,
        is_nullable=False,
        is_unique=True,
    )
    assert field.name == "user_email_address"
    assert field.data_type == "VARCHAR"
    assert field.is_unique is True


def test_ai_generated_field_type_mapping():
    field_int = AIGeneratedField(name="count", data_type="int4")
    assert field_int.data_type == "INTEGER"

    field_json = AIGeneratedField(name="metadata", data_type="json")
    assert field_json.data_type == "JSONB"


def test_ai_generated_entity_validation():
    data = {
        "name": "Order Invoices",
        "fields": [
            {"name": "id", "data_type": "INTEGER", "is_primary_key": True},
            {"name": "total_amount", "data_type": "NUMERIC", "is_nullable": False},
        ],
    }
    entity = AIGeneratedEntity.model_validate(data)
    assert entity.name == "order_invoices"
    assert len(entity.fields) == 2
    assert entity.fields[0].is_primary_key is True


def test_ai_generated_entity_empty_fields_rejected():
    with pytest.raises(Exception):
        AIGeneratedEntity.model_validate({"name": "empty_table", "fields": []})


def test_extract_text_from_steps_schema():
    data = {
        "id": "int_123",
        "steps": [
            {
                "type": "model_output",
                "content": [
                    {
                        "type": "text",
                        "text": '{"name": "addresses", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": true}]}',
                    }
                ],
            }
        ],
    }
    text = _extract_text_from_interaction_response(data)
    assert "addresses" in text


def test_extract_text_from_outputs_schema():
    data = {
        "id": "int_456",
        "outputs": [
            {
                "type": "text",
                "text": '{"name": "users", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": true}]}',
            }
        ],
    }
    text = _extract_text_from_interaction_response(data)
    assert "users" in text


def test_generate_entity_with_interactions_api_steps():
    async def _test():
        steps_response = {
            "id": "int_789",
            "steps": [
                {
                    "type": "model_output",
                    "content": [
                        {
                            "type": "text",
                            "text": '{"name": "addresses", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": true}, {"name": "street", "data_type": "VARCHAR", "is_nullable": false}, {"name": "city", "data_type": "VARCHAR", "is_nullable": false}, {"name": "postal_code", "data_type": "VARCHAR", "is_nullable": true}]}',
                        }
                    ],
                }
            ],
        }

        mock_candidates = [("Test Key", "fake_key_123")]
        with patch.object(EntityAIGenerator, "_get_candidate_keys", return_value=mock_candidates):
            with patch("app.services.ai.generator._send_gemini_request", return_value=steps_response):
                entity = await EntityAIGenerator.generate_entity("address table")
                assert entity.name == "addresses"
                # 4 original fields + 2 audit fields (created_at, updated_at) = 6
                assert len(entity.fields) == 6
                assert entity.fields[0].name == "id"
                assert entity.fields[0].is_primary_key is True
                assert entity.fields[0].label == "ID"
                assert "addresses" in entity.fields[0].description
                # Audit columns
                field_names = [f.name for f in entity.fields]
                assert "created_at" in field_names
                assert "updated_at" in field_names

    asyncio.run(_test())


def test_generate_entity_with_model_503_fallback():
    """Verify that when primary model returns 503 (high demand), it seamlessly falls back to next model."""
    from app.services.ai.generator import GeminiRequestError
    async def _test():
        steps_response = {
            "id": "int_fallback_success",
            "steps": [
                {
                    "type": "model_output",
                    "content": [
                        {
                            "type": "text",
                            "text": '{"name": "status_types", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": true}, {"name": "code", "data_type": "VARCHAR"}]}',
                        }
                    ],
                }
            ],
        }

        call_log = []

        def mock_send(url, request_body, api_key=None):
            model = request_body.get("model")
            call_log.append(model)
            if model == "gemini-3.5-flash":
                raise GeminiRequestError(status_code=503, message="Model is currently experiencing high demand")
            return steps_response

        mock_candidates = [("Test Key", "fake_key_123")]
        with patch.object(EntityAIGenerator, "_get_candidate_keys", return_value=mock_candidates):
            with patch("app.services.ai.generator._send_gemini_request", side_effect=mock_send):
                entity = await EntityAIGenerator.generate_entity("status table")
                assert entity.name == "status_types"
                assert len(call_log) >= 2
                assert call_log[0] == "gemini-3.5-flash"

    asyncio.run(_test())


def test_post_process_entity_enrichment():
    """Test developer-level field enrichment: PK injection, label/description, NUMERIC precision, audit fields."""
    raw_entity = AIGeneratedEntity(
        name="products",
        fields=[
            AIGeneratedField(name="unit_price", data_type="NUMERIC"),
            AIGeneratedField(name="sku_code", data_type="VARCHAR"),
        ],
    )
    processed = EntityAIGenerator._post_process_entity(raw_entity)
    field_dict = {f.name: f for f in processed.fields}

    # Injected PK
    assert "id" in field_dict
    assert field_dict["id"].is_primary_key is True

    # Numeric precision (FR-34)
    assert field_dict["unit_price"].length == "10,2"
    assert field_dict["unit_price"].label == "Unit Price"
    assert field_dict["unit_price"].description is not None

    # String length
    assert field_dict["sku_code"].length == "255"

    # Audit fields (FR-35)
    assert "created_at" in field_dict
    assert "updated_at" in field_dict
    assert field_dict["created_at"].data_type == "TIMESTAMP"
    assert field_dict["created_at"].default_value == "CURRENT_TIMESTAMP"

