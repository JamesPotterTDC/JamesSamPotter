#!/usr/bin/env python
"""Generate a Fernet encryption key for token storage."""

from cryptography.fernet import Fernet

if __name__ == '__main__':
    key = Fernet.generate_key()
    print("Add this to your .env file:")
    print(f"ENCRYPTION_KEY={key.decode()}")
