from fastapi import APIRouter, Depends, File, UploadFile

from routes.auth import require_basic_auth
from services.storage import get_project_dir

router = APIRouter(tags=["uploads"])

# UploadThing integration (commented for MVP).
# from uploadthing import UploadThingClient
# uploadthing = UploadThingClient(api_key=os.getenv("UPLOADTHING_SECRET"))


@router.post("/uploads/{project_id}")
def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    _: str = Depends(require_basic_auth),
) -> dict:
    project_dir = get_project_dir(project_id)
    target_path = project_dir / file.filename
    with target_path.open("wb") as handle:
        handle.write(file.file.read())
    return {"status": "stored", "path": str(target_path)}
