import hashlib


def hash_name(name: str) -> str:
    return hashlib.sha256(name.encode()).hexdigest()[:8]
