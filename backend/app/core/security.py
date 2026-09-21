import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings


def _get_fernet_cipher() -> Fernet:
    """
    Derives a consistent 32-byte Fernet key from settings.API_KEY_ENCRYPTION_SECRET
    using SHA-256 and URL-safe base64 encoding.
    """
    secret = settings.API_KEY_ENCRYPTION_SECRET.encode("utf-8")
    key_bytes = hashlib.sha256(secret).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_api_key(raw_key: str) -> str:
    """
    Encrypts a plaintext API key for safe database storage at rest.
    """
    if not raw_key:
        raise ValueError("Cannot encrypt an empty API key")
    cipher = _get_fernet_cipher()
    encrypted = cipher.encrypt(raw_key.strip().encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_api_key(encrypted_key: str) -> str:
    """
    Decrypts an encrypted API key back to its plaintext representation for in-memory use.
    """
    if not encrypted_key:
        raise ValueError("Cannot decrypt an empty key string")
    cipher = _get_fernet_cipher()
    decrypted = cipher.decrypt(encrypted_key.encode("utf-8"))
    return decrypted.decode("utf-8")


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
