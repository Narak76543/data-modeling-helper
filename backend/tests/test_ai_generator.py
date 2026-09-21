import pytest
from app.services.ai.models import AIGeneratedEntity, AIGeneratedField


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
