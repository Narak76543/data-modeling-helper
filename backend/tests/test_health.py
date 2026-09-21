from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "project" in data



def test_openapi_schema(client: TestClient):
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["info"]["title"] == "Data Modeling Helper API"


def test_docs_redirects(client: TestClient):
    res_root = client.get("/", follow_redirects=False)
    assert res_root.status_code == 307
    assert res_root.headers["location"] == "/api/v1/docs"

    res_docs = client.get("/docs", follow_redirects=False)
    assert res_docs.status_code == 307
    assert res_docs.headers["location"] == "/api/v1/docs"

