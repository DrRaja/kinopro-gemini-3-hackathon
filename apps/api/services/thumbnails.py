from __future__ import annotations

import os
from typing import Iterable


def pick_sharpest(candidates: Iterable[str]) -> str:
    candidates = list(candidates)
    if not candidates:
        raise ValueError("No thumbnail candidates provided")

    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ImportError:
        return max(candidates, key=os.path.getsize)

    best_path = candidates[0]
    best_score = -1.0
    for path in candidates:
        image = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            continue
        score = float(cv2.Laplacian(image, cv2.CV_64F).var())
        if score > best_score:
            best_score = score
            best_path = path

    return best_path
