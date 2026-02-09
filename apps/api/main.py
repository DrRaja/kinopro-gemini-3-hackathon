import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes.auth import router as auth_router
from routes.storyboards import router as storyboard_router
from routes.uploads import router as uploads_router
from services.auth import create_user, user_exists
from services.storage import get_storage_root

app = FastAPI(title="KinoPro API", version="0.1.0")

cors_origins = os.getenv("KINO_CORS_ORIGINS", "*")
origins = ["*"] if cors_origins.strip() == "*" else [o.strip() for o in cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(storyboard_router, prefix="/v1")
app.include_router(auth_router, prefix="/v1")
app.include_router(uploads_router, prefix="/v1")

app.mount("/media", StaticFiles(directory=str(get_storage_root())), name="media")


@app.on_event("startup")
def ensure_demo_user() -> None:
    if not user_exists("demouser"):
        create_user("demouser", "demouser")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
