import asyncio
import pytest
from unittest.mock import patch
from app.services.ai.project_models import (
    AIGeneratedProject,
    AIGeneratedProjectEntity,
    AIGeneratedRelationship,
    AIGeneratedField,
)
from app.services.ai.project_generator import ProjectAIGenerator


def test_project_model_validation():
    data = {
        "project_name": "Library Management",
        "description": "System for tracking books, members, and loans",
        "entities": [
            {
                "name": "books",
                "fields": [
                    {"name": "id", "data_type": "INTEGER", "is_primary_key": True},
                    {"name": "title", "data_type": "VARCHAR", "is_nullable": False},
                ],
            },
            {
                "name": "loans",
                "fields": [
                    {"name": "id", "data_type": "INTEGER", "is_primary_key": True},
                    {"name": "book_id", "data_type": "INTEGER", "is_foreign_key": True, "references_entity": "books", "references_field": "id"},
                ],
            },
        ],
        "relationships": [
            {
                "source_entity": "loans",
                "source_field": "book_id",
                "target_entity": "books",
                "target_field": "id",
                "cardinality": "1:many",
            }
        ],
    }

    project = AIGeneratedProject.model_validate(data)
    assert project.project_name == "Library Management"
    assert len(project.entities) == 2
    assert len(project.relationships) == 1
    assert project.relationships[0].source_entity == "loans"
    assert project.relationships[0].target_entity == "books"


def test_project_pre_validation():
    data = {
        "project_name": "E-Commerce",
        "entities": [
            {
                "name": "customers",
                "fields": [
                    {"name": "id", "data_type": "INTEGER", "is_primary_key": True},
                ],
            },
            {
                "name": "orders",
                "fields": [
                    {"name": "id", "data_type": "INTEGER", "is_primary_key": True},
                    {"name": "customer_id", "data_type": "INTEGER", "is_foreign_key": True, "references_entity": "customers"},
                ],
            },
        ],
        "relationships": [
            {
                "source_entity": "orders",
                "source_field": "customer_id",
                "target_entity": "customers",
                "target_field": "id",
                "cardinality": "1:many",
            }
        ],
    }
    project = AIGeneratedProject.model_validate(data)
    summary = ProjectAIGenerator._run_pre_validation(project)
    assert summary is not None
    assert summary["is_valid"] is True
    assert summary["summary"]["errors"] == 0


def test_two_step_project_generation():
    async def _test():
        step1_response = {
            "id": "int_step1",
            "steps": [
                {
                    "type": "model_output",
                    "content": [
                        {
                            "type": "text",
                            "text": '{"project_name": "School App", "description": "Student management", "tables": [{"name": "students", "purpose": "Store student profiles"}, {"name": "courses", "purpose": "Catalog of courses"}, {"name": "enrollments", "purpose": "Student course mapping"}]}',
                        }
                    ],
                }
            ],
        }

        step2_response = {
            "id": "int_step2",
            "steps": [
                {
                    "type": "model_output",
                    "content": [
                        {
                            "type": "text",
                            "text": '{"project_name": "School App", "description": "Student management", "entities": [{"name": "students", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": true}, {"name": "full_name", "data_type": "VARCHAR"}]}, {"name": "courses", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": true}, {"name": "title", "data_type": "VARCHAR"}]}, {"name": "enrollments", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": true}, {"name": "student_id", "data_type": "INTEGER", "is_foreign_key": true, "references_entity": "students"}, {"name": "course_id", "data_type": "INTEGER", "is_foreign_key": true, "references_entity": "courses"}]}], "relationships": [{"source_entity": "enrollments", "source_field": "student_id", "target_entity": "students", "target_field": "id", "cardinality": "1:many"}, {"source_entity": "enrollments", "source_field": "course_id", "target_entity": "courses", "target_field": "id", "cardinality": "1:many"}]}',
                        }
                    ],
                }
            ],
        }

        call_index = 0

        def mock_send(url, request_body, api_key=None):
            nonlocal call_index
            call_index += 1
            if call_index == 1:
                return step1_response
            return step2_response

        mock_candidates = [("Test Key", "fake_key_123")]
        with patch.object(ProjectAIGenerator, "_call_gemini_with_fallback", side_effect=[
            {"project_name": "School App", "description": "Student management", "tables": [{"name": "students"}, {"name": "courses"}]},
            {
                "project_name": "School App",
                "description": "Student management",
                "entities": [
                    {"name": "students", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": True}]},
                    {"name": "courses", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": True}]},
                ],
                "relationships": [],
            }
        ]):
            project = await ProjectAIGenerator.generate_project("school management system")
            assert project.project_name == "School App"
            assert len(project.entities) == 2
            assert project.validation_summary is not None

    asyncio.run(_test())


def test_generate_project_endpoint(client):
    mock_project = {
        "project_name": "Fitness Tracking",
        "description": "Workouts and exercises",
        "entities": [
            {
                "name": "users",
                "fields": [
                    {"name": "id", "data_type": "INTEGER", "is_primary_key": True},
                ],
            },
            {
                "name": "workouts",
                "fields": [
                    {"name": "id", "data_type": "INTEGER", "is_primary_key": True},
                    {"name": "user_id", "data_type": "INTEGER", "is_foreign_key": True, "references_entity": "users"},
                ],
            },
        ],
        "relationships": [
            {
                "source_entity": "workouts",
                "source_field": "user_id",
                "target_entity": "users",
                "target_field": "id",
                "cardinality": "1:many",
            }
        ],
        "validation_summary": {
            "is_valid": True,
            "summary": {"total_issues": 0, "errors": 0, "warnings": 0},
            "issues": [],
        },
    }

    with patch.object(ProjectAIGenerator, "generate_project", return_value=AIGeneratedProject.model_validate(mock_project)):
        res = client.post("/api/v1/ai/generate-project", json={"prompt": "Fitness workout app"})
        assert res.status_code == 200
        data = res.json()
        assert data["project_name"] == "Fitness Tracking"
        assert len(data["entities"]) == 2
        assert len(data["relationships"]) == 1
