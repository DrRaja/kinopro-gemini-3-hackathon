# FFmpeg Commands (KinoPro MVP)

## Clip extraction

Default (CPU, dev):

```bash
ffmpeg -y -ss {START_TC} -to {END_TC} -i {INPUT} \
  -c:v libx264 -preset veryfast -crf 20 \
  -c:a aac -b:a 192k {OUTPUT}
```

Production (CPU, CRF 18):

```bash
ffmpeg -y -ss {START_TC} -to {END_TC} -i {INPUT} \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k {OUTPUT}
```

Optional (NVENC, GPU only):

```bash
ffmpeg -y -ss {START_TC} -to {END_TC} -i {INPUT} \
  -c:v h264_nvenc -preset p1 -tune ll -rc vbr -cq 23 -b:v 0 \
  -c:a aac -b:a 192k {OUTPUT}
```

## Thumbnail candidates (thumbnail_tc +/- 8 frames)

Compute `candidate_tc = thumbnail_tc + (offset_frames / fps)` and extract three frames:

```bash
ffmpeg -y -ss {CANDIDATE_TC} -i {INPUT} \
  -frames:v 1 -vf "scale=1280:-2" -c:v libwebp -quality 80 {OUTPUT}
```

Offsets used: `-8`, `0`, `+8` frames.

## Sharpest selection (Laplacian variance)

```python
import cv2
from pathlib import Path

def sharpness(path: Path) -> float:
    image = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    return float(cv2.Laplacian(image, cv2.CV_64F).var())

paths = [Path("thumb_m8.webp"), Path("thumb_p0.webp"), Path("thumb_p8.webp")]
best = max(paths, key=sharpness)
print(best)
```
