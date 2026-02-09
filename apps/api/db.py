import os
import sqlite3
from pathlib import Path


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    resolved_path = db_path or os.getenv("KINO_DB_PATH", "data/kinopro.db")
    path = Path(resolved_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn
