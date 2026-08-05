from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

_key = os.getenv("ENCRYPTION_KEY")
fernet = Fernet(_key.encode()) if _key else None


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns plaintext if no key configured."""
    if not fernet:
        return plaintext
    return fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a string value. Returns ciphertext if no key configured."""
    if not fernet:
        return ciphertext
    return fernet.decrypt(ciphertext.encode()).decode()