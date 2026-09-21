import pytest
from app.models.entity import Entity, Field
from app.schemas.entity import EntityCreate, EntityResponse
from app.schemas.field import FieldCreate, FieldResponse


def test_entity_model_instantiation():
    entity = Entity(name="users", pos_x=100.0, pos_y=200.0)
    assert entity.name == "users"
    assert entity.pos_x == 100.0
    assert entity.pos_y == 200.0


def test_field_model_instantiation():
    field = Field(
        entity_id="dummy-id",
        name="email",
        data_type="VARCHAR",
        is_primary_key=False,
        is_nullable=False,
        is_unique=True,
    )
    assert field.name == "email"
    assert field.data_type == "VARCHAR"
    assert field.is_unique is True
    assert field.is_nullable is False


def test_pydantic_entity_schema():
    payload = {
        "name": "orders",
        "pos_x": 300.0,
        "pos_y": 150.0,
        "fields": [
            {
                "name": "id",
                "data_type": "INTEGER",
                "is_primary_key": True,
                "is_nullable": False,
                "is_unique": True,
            },
            {
                "name": "user_id",
                "data_type": "INTEGER",
                "is_foreign_key": True,
                "is_nullable": False,
            },
        ],
    }
    schema = EntityCreate(**payload)
    assert schema.name == "orders"
    assert len(schema.fields) == 2
    assert schema.fields[0].is_primary_key is True
    assert schema.fields[1].is_foreign_key is True
