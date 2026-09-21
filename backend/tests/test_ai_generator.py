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
                assert len(entity.fields) == 4
                assert entity.fields[0].name == "id"
                assert entity.fields[0].is_primary_key is True

    asyncio.run(_test())
