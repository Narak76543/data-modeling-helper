import base64
import hashlib
import hmac
import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from cryptography.fernet import Fernet
    HAS_CRYPTOGRAPHY = True
except ImportError:
    Fernet = None  # type: ignore
    HAS_CRYPTOGRAPHY = False


def _get_key_bytes() -> bytes:
    secret = settings.API_KEY_ENCRYPTION_SECRET.encode("utf-8")
    return hashlib.sha256(secret).digest()


def _get_fernet_cipher():
    if not HAS_CRYPTOGRAPHY or Fernet is None:
        return None
    key_bytes = _get_key_bytes()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def _stdlib_encrypt(raw_bytes: bytes) -> str:
    """Standard library authenticated keystream encryption (zero external dependencies)."""
    key = _get_key_bytes()
    nonce = os.urandom(16)

    # Generate keystream using HMAC-SHA256
    keystream = bytearray()
    counter = 0
    while len(keystream) < len(raw_bytes):
        block = hmac.new(key, nonce + counter.to_bytes(4, "big"), hashlib.sha256).digest()
        keystream.extend(block)
        counter += 1

    # XOR plaintext with keystream
    ciphertext = bytes(b ^ k for b, k in zip(raw_bytes, keystream))

    # Compute authentication tag
    tag = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()

    payload = nonce + tag + ciphertext
    return "std:" + base64.urlsafe_b64encode(payload).decode("utf-8")


def _stdlib_decrypt(token: str) -> str:
    """Standard library authenticated keystream decryption."""
    raw_token = token[4:] if token.startswith("std:") else token
    try:
        payload = base64.urlsafe_b64decode(raw_token.encode("utf-8"))
    except Exception as e:
        raise ValueError(f"Invalid base64 payload: {e}")

    if len(payload) < 48:  # 16 nonce + 32 tag
        raise ValueError("Invalid ciphertext length")

    key = _get_key_bytes()
    nonce = payload[:16]
    expected_tag = payload[16:48]
    ciphertext = payload[48:]

    computed_tag = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
    if not hmac.compare_digest(computed_tag, expected_tag):
        raise ValueError("Authentication tag verification failed")

    keystream = bytearray()
    counter = 0
    while len(keystream) < len(ciphertext):
        block = hmac.new(key, nonce + counter.to_bytes(4, "big"), hashlib.sha256).digest()
        keystream.extend(block)
        counter += 1

    plaintext = bytes(b ^ k for b, k in zip(ciphertext, keystream))
    return plaintext.decode("utf-8")


def encrypt_api_key(raw_key: str) -> str:
    """
    Encrypts a plaintext API key for safe database storage at rest.
    Uses Fernet if cryptography is installed, otherwise falls back to stdlib authenticated keystream encryption.
    """
    if not raw_key:
        raise ValueError("Cannot encrypt an empty API key")

    raw_bytes = raw_key.strip().encode("utf-8")
    cipher = _get_fernet_cipher()
    if cipher is not None:
        encrypted = cipher.encrypt(raw_bytes)
        return encrypted.decode("utf-8")

    return _stdlib_encrypt(raw_bytes)


def decrypt_api_key(encrypted_key: str) -> str:
    """
    Decrypts an encrypted API key back to its plaintext representation for in-memory use.
    """
    if not encrypted_key:
        raise ValueError("Cannot decrypt an empty key string")

    token = encrypted_key.strip()
    if token.startswith("std:"):
        return _stdlib_decrypt(token)

    cipher = _get_fernet_cipher()
    if cipher is not None:
        try:
            decrypted = cipher.decrypt(token.encode("utf-8"))
            return decrypted.decode("utf-8")
        except Exception:
            # Fallback to stdlib decryption if not Fernet
            return _stdlib_decrypt(token)

    return _stdlib_decrypt(token)


def mask_api_key(raw_key: str) -> str:
    """
    Generates a masked representation of an API key for safe client presentation.
    Never exposes the full plaintext.
    Example: AIzaSyD9...1234 -> AIza••••••••1234
    """
    key = raw_key.strip()
    if len(key) <= 8:
        return "••••••••" + key[-2:] if len(key) >= 2 else "••••••••"

    if key.startswith("AIza"):
        prefix = "AIza"
        suffix = key[-4:]
        return f"{prefix}••••••••{suffix}"

    prefix = key[:4]
    suffix = key[-4:]
    return f"{prefix}••••••••{suffix}"
