import pytest
from unittest.mock import patch, MagicMock
from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key
from app.services.ai.generator import EntityAIGenerator, GeminiRequestError
from app.models.api_key import ApiKey


def test_security_encryption_roundtrip():
    secret = "AIzaSyD_my_super_secret_gemini_api_key_12345"
    encrypted = encrypt_api_key(secret)
    assert encrypted != secret
    assert len(encrypted) > 20

    decrypted = decrypt_api_key(encrypted)
    assert decrypted == secret


def test_security_masking():
    # Gemini standard key
    key1 = "AIzaSyD_my_secret_key_1234"
    masked1 = mask_api_key(key1)
    assert masked1.startswith("AIza")
    assert masked1.endswith("1234")
    assert "my_secret_key" not in masked1

    # Generic key
    key2 = "sk-1234567890abcdef"
    masked2 = mask_api_key(key2)
    assert masked2.startswith("sk-1")
    assert masked2.endswith("cdef")
    assert "567890ab" not in masked2


def test_api_keys_crud_endpoints(client):
    # 1. Create Key 1
    res1 = client.post(
        "/api/v1/keys",
        json={"label": "Primary Key", "api_key": "AIzaSyTestKeyAlpha1111"},
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["label"] == "Primary Key"
    assert "AIza" in data1["masked_key"]
    assert "1111" in data1["masked_key"]
    assert "encrypted_key" not in data1
    key1_id = data1["id"]

    # 2. Create Key 2
    res2 = client.post(
        "/api/v1/keys",
        json={"label": "Backup Key", "api_key": "AIzaSyTestKeyBeta2222"},
    )
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["label"] == "Backup Key"
    key2_id = data2["id"]

    # 3. List Keys
    res_list = client.get("/api/v1/keys")
    assert res_list.status_code == 200
    keys_list = res_list.json()
    assert len(keys_list) >= 2
    # Ensure plaintext is never returned in any response
    for k in keys_list:
        assert "encrypted_key" not in k
        assert "api_key" not in k

    # 4. Reorder Keys
    res_reorder = client.put(
        "/api/v1/keys/reorder",
        json={"key_ids": [key2_id, key1_id]},
    )
    assert res_reorder.status_code == 200
    reordered = res_reorder.json()
    # Check that key2 is now before key1
    ids_in_order = [k["id"] for k in reordered if k["id"] in (key1_id, key2_id)]
    assert ids_in_order == [key2_id, key1_id]

    # 5. Delete Keys
    del_res1 = client.delete(f"/api/v1/keys/{key1_id}")
    assert del_res1.status_code == 204
    del_res2 = client.delete(f"/api/v1/keys/{key2_id}")
    assert del_res2.status_code == 204

    # 6. Verify Deletion
    del_res_404 = client.delete(f"/api/v1/keys/{key1_id}")
    assert del_res_404.status_code == 404


import asyncio

def test_key_rotation_on_rate_limit():
    """Test that EntityAIGenerator rotates to the second key when the first key encounters rate limiting (429)."""
    async def _run_test():
        # Mock candidate keys
        mock_candidates = [
            ("Key 1 (Rate Limited)", "key_1_plaintext"),
            ("Key 2 (Valid)", "key_2_plaintext"),
        ]

        success_response = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": '{"name": "customers", "fields": [{"name": "id", "data_type": "INTEGER", "is_primary_key": true}]}'
                            }
                        ]
                    }
                }
            ]
        }

        call_count = 0

        def mock_send_request(url, request_body):
            nonlocal call_count
            call_count += 1
            if "key_1_plaintext" in url:
                raise GeminiRequestError(status_code=429, message="Resource exhausted: rate limit exceeded")
            elif "key_2_plaintext" in url:
                return success_response
            raise RuntimeError("Unexpected URL")

        with patch.object(EntityAIGenerator, "_get_candidate_keys", return_value=mock_candidates):
            with patch("app.services.ai.generator._send_gemini_request", side_effect=mock_send_request):
                entity = await EntityAIGenerator.generate_entity("customer table")
                assert entity.name == "customers"
                assert len(entity.fields) == 1
                assert entity.fields[0].name == "id"
                assert call_count == 2

    asyncio.run(_run_test())
