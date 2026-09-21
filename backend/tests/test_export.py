import pytest
from fastapi.testclient import TestClient

from app.services.export import DataDictionaryGenerator
from app.services.validation import ValidationEngine


def test_markdown_generation_valid_model():
    entities = [
        {
            "id": "e_users",
            "name": "users",
            "fields": [
                {"id": "f_u_id", "name": "id", "data_type": "INTEGER", "is_primary_key": True},
                {"id": "f_u_email", "name": "email", "data_type": "VARCHAR", "is_unique": True},
            ],
        },
        {
            "id": "e_orders",
            "name": "orders",
            "fields": [
                {"id": "f_o_id", "name": "id", "data_type": "INTEGER", "is_primary_key": True},
                {
                    "id": "f_o_uid",
                    "name": "user_id",
                    "data_type": "INTEGER",
                    "is_foreign_key": True,
                    "references_entity_id": "e_users",
                    "references_field_id": "f_u_id",
                },
            ],
        },
    ]

    validation_result = ValidationEngine.validate_model(entities)
    doc = DataDictionaryGenerator.generate_markdown(
        entities=entities,
        project_name="E-Commerce Model",
        validation_result=validation_result,
    )

    assert "# Data Dictionary — E-Commerce Model" in doc
    assert "### Entity: `users`" in doc
    assert "### Entity: `orders`" in doc
    assert "Each record in `orders` references the `id` column in `users` via `user_id`" in doc
    assert "Handoff Ready" in doc


def test_markdown_generation_with_warnings():
    entities = [
        {
            "id": "e_users",
            "name": "users",
            "fields": [
                {"id": "f_u_email", "name": "email", "is_primary_key": False}  # Missing PK
            ],
        }
    ]

    validation_result = ValidationEngine.validate_model(entities)
    doc = DataDictionaryGenerator.generate_markdown(
        entities=entities,
        project_name="Flawed Model",
        validation_result=validation_result,
    )

    assert "Handoff Attention Required" in doc
    assert "Add a primary key to this entity" in doc


def test_export_api_endpoint(client: TestClient):
    payload = {
        "project_name": "Test App",
        "entities": [
            {
                "name": "customers",
                "pos_x": 0,
                "pos_y": 0,
                "fields": [
                    {"name": "id", "data_type": "INTEGER", "is_primary_key": True}
                ],
            }
        ],
        "include_validation": True,
    }

    response = client.post("/api/v1/export/markdown", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "markdown" in data
    assert data["filename"] == "test_app_data_dictionary.md"
    assert "### Entity: `customers`" in data["markdown"]
