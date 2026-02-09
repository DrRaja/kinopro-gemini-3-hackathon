from __future__ import annotations

import hashlib
import os
import secrets
import sqlite3
from dataclasses import dataclass

from db import get_connection


@dataclass(frozen=True)
class User:
    username: str


def ensure_users_table() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL
            )
            """
        )
        conn.commit()


def hash_password(password: str, salt: bytes | None = None) -> tuple[str, str]:
    salt_bytes = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 120_000)
    return digest.hex(), salt_bytes.hex()


def create_user(username: str, password: str) -> User:
    ensure_users_table()
    password_hash, salt = hash_password(password)
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
            (username, password_hash, salt),
        )
        conn.commit()
    return User(username=username)


def authenticate_user(username: str, password: str) -> User | None:
    ensure_users_table()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT username, password_hash, salt FROM users WHERE username = ?",
            (username,),
        ).fetchone()
    if not row:
        return None

    computed_hash, _ = hash_password(password, bytes.fromhex(row["salt"]))
    if secrets.compare_digest(computed_hash, row["password_hash"]):
        return User(username=row["username"])
    return None


def user_exists(username: str) -> bool:
    ensure_users_table()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT username FROM users WHERE username = ?",
            (username,),
        ).fetchone()
    return row is not None


def update_password(username: str, password: str) -> None:
    password_hash, salt = hash_password(password)
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ?, salt = ? WHERE username = ?",
            (password_hash, salt, username),
        )
        conn.commit()
