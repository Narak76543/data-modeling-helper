import pytest
from fastapi.testclient import TestClient

from app.services.validation.models import SeverityEnum
from app.services.validation.rules.primary_key import check_missing_primary_key
from app.services.validation.rules.foreign_key import check_orphan_foreign_keys
from app.services.validation.rules.naming import check_naming_conventions
from app.services.validation.rules.normalization import check_normalization_smells
from app.services.validation.engine import ValidationEngine


def test_missing_primary_key_detected():
    entity_no_pk = {
        "id": "e1",
        "name": "users",
        "fields": [
            {"id": "f1", "name": "email", "is_primary_key": False},
            {"id": "f2", "name": "age", "is_primary_key": False},
        ],
    }
    issues = check_missing_primary_key([entity_no_pk])
    assert len(issues) == 1
    assert issues[0].rule_id == "missing_primary_key"
    assert issues[0].severity == SeverityEnum.ERROR
    assert "Add a primary key" in issues[0].message


def test_primary_key_present_no_issue():
    entity_with_pk = {
        "id": "e1",
        "name": "users",
        "fields": [
            {"id": "f1", "name": "id", "is_primary_key": True},
            {"id": "f2", "name": "email", "is_primary_key": False},
        ],
    }
    issues = check_missing_primary_key([entity_with_pk])
    assert len(issues) == 0


def test_orphan_foreign_key_detected():
    entities = [
        {
            "id": "e_orders",
            "name": "orders",
            "fields": [
                {
                    "id": "f_user_id",
                    "name": "user_id",
                    "is_foreign_key": True,
                    "references_entity_id": "non_existent_entity",
                    "references_field_id": "non_existent_field",
                }
            ],
        }
    ]
    issues = check_orphan_foreign_keys(entities)
    assert len(issues) == 1
    assert issues[0].rule_id == "orphan_foreign_key"
    assert issues[0].severity == SeverityEnum.ERROR


def test_valid_foreign_key_no_error():
    entities = [
        {
            "id": "e_users",
            "name": "users",
            "fields": [
                {"id": "f_users_id", "name": "id", "is_primary_key": True, "is_unique": True}
            ],
        },
        {
            "id": "e_orders",
            "name": "orders",
            "fields": [
                {
                    "id": "f_orders_user_id",
                    "name": "user_id",
                    "is_foreign_key": True,
                    "references_entity_id": "e_users",
                    "references_field_id": "f_users_id",
                }
            ],
        },
    ]
    issues = check_orphan_foreign_keys(entities)
    assert len(issues) == 0


def test_naming_convention_warning():
    entities = [
        {
            "id": "e1",
            "name": "User Profile",
            "fields": [
                {"id": "f1", "name": "First Name"},
                {"id": "f2", "name": "order"},  # Reserved keyword
            ],
        }
    ]
    issues = check_naming_conventions(entities)
    assert len(issues) >= 2
    assert any(i.rule_id == "naming_convention" for i in issues)


def test_normalization_repeating_groups():
    entities = [
        {
            "id": "e1",
            "name": "customers",
            "fields": [
                {"id": "f1", "name": "id", "is_primary_key": True},
                {"id": "f2", "name": "phone_1"},
                {"id": "f3", "name": "phone_2"},
                {"id": "f4", "name": "phone_3"},
            ],
        }
    ]
    issues = check_normalization_smells(entities)
    assert len(issues) == 1
    assert issues[0].rule_id == "normalization_repeating_groups"
    assert "Repeating fields" in issues[0].message


def test_validation_engine_aggregation():
    entities = [
        {
            "id": "e1",
            "name": "users",
            "fields": [
                {"id": "f1", "name": "id", "is_primary_key": True},
                {"id": "f2", "name": "email"},
            ],
        }
    ]
    result = ValidationEngine.validate_model(entities)
    assert result.is_valid is True
    assert result.summary.errors == 0


def test_validation_api_endpoint(client: TestClient):
    payload = {
        "entities": [
            {
                "name": "invalid_entity",
                "pos_x": 0,
                "pos_y": 0,
                "fields": [
                    {"name": "field_a", "is_primary_key": False}
                ],
            }
        ]
    }
    response = client.post("/api/v1/validation/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert data["summary"]["errors"] >= 1
    assert len(data["issues"]) >= 1
