from __future__ import annotations

import os
from pathlib import Path


def get_storage_root() -> Path:
    root = Path(os.getenv("KINO_STORAGE_DIR", "data/uploads"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_project_dir(project_id: str) -> Path:
    path = get_storage_root() / project_id
    path.mkdir(parents=True, exist_ok=True)
    return path
