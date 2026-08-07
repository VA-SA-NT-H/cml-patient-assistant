from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

_key = os.getenv("ENCRYPTION_KEY")
if not _key:
    raise RuntimeError(
        "ENCRYPTION_KEY environment variable is required. "
        "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    )
fernet = Fernet(_key.encode())


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value using Fernet symmetric encryption."""
    return fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a Fernet-encrypted string value."""
    return fernet.decrypt(ciphertext.encode()).decode()
