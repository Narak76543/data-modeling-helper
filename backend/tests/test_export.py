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


def test_excel_generation_and_styling():
    import io
    import openpyxl
    from app.services.export import ExcelExportGenerator
    from app.schemas.entity import EntityCreate
    from app.schemas.field import FieldCreate

    entities = [
        EntityCreate(
            name="users",
            fields=[
                FieldCreate(name="id", data_type="INTEGER", is_primary_key=True, is_nullable=False),
                FieldCreate(name="email_address", data_type="VARCHAR", is_unique=True, is_nullable=False, label="Email"),
                FieldCreate(name="bio", data_type="TEXT", is_nullable=True),
            ],
        ),
        EntityCreate(
            name="orders",
            fields=[
                FieldCreate(name="id", data_type="UUID", is_primary_key=True, is_nullable=False),
                FieldCreate(name="user_id", data_type="INTEGER", is_foreign_key=True, is_nullable=False),
                FieldCreate(name="total_amount", data_type="NUMERIC", length="12,2", default_value="0.00"),
            ],
        ),
    ]

    excel_bytes = ExcelExportGenerator.generate_workbook(entities=entities, project_name="Store Model")
    assert len(excel_bytes) > 0

    # Verify openpyxl can load the generated workbook
    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
    assert "Field Specification" in wb.sheetnames
    ws = wb["Field Specification"]

    # Table 1 Header
    assert ws.cell(row=1, column=1).value == "Table: users"
    # Column headers
    assert ws.cell(row=2, column=1).value == "No"
    assert ws.cell(row=2, column=2).value == "Field Label"
    assert ws.cell(row=2, column=3).value == "Field Name"
    assert ws.cell(row=2, column=4).value == "Data Type"
    assert ws.cell(row=2, column=5).value == "Length"
    assert ws.cell(row=2, column=6).value == "Man.Opt"
    assert ws.cell(row=2, column=7).value == "LOV"
    assert ws.cell(row=2, column=8).value == "Default Value"
    assert ws.cell(row=2, column=9).value == "Description"

    # Field 1: users.id
    assert ws.cell(row=3, column=1).value == 1
    assert ws.cell(row=3, column=2).value == "ID"
    assert ws.cell(row=3, column=3).value == "id"
    assert ws.cell(row=3, column=4).value == "Integer"
    assert ws.cell(row=3, column=6).value == "M, PK"
    assert ws.cell(row=3, column=9).value == "Primary key identifier"

    # Field 2: users.email_address (explicit label 'Email')
    assert ws.cell(row=4, column=1).value == 2
    assert ws.cell(row=4, column=2).value == "Email"
    assert ws.cell(row=4, column=3).value == "email_address"
    assert ws.cell(row=4, column=4).value == "String"
    assert ws.cell(row=4, column=5).value == "255"
    assert ws.cell(row=4, column=6).value == "M"

    # Table 2: orders
    # Row 6: Table: orders
    assert ws.cell(row=8, column=1).value == "Table: orders"


def test_export_excel_api_endpoint(client: TestClient):
    payload = {
        "project_name": "Ecommerce Backend",
        "entities": [
            {
                "name": "products",
                "pos_x": 0,
                "pos_y": 0,
                "fields": [
                    {"name": "id", "data_type": "INTEGER", "is_primary_key": True, "is_nullable": False},
                    {"name": "sku_code", "data_type": "VARCHAR", "is_nullable": False},
                    {"name": "unit_price", "data_type": "NUMERIC", "length": "10,2", "default_value": "0.00"},
                ],
            }
        ],
    }

    response = client.post("/api/v1/export/excel", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "ecommerce_backend_field_spec.xlsx" in response.headers["content-disposition"]
    assert len(response.content) > 100

