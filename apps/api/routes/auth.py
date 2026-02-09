from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from models.auth import AuthResponse, UserCreate
from services.auth import authenticate_user, create_user, user_exists

router = APIRouter(tags=["auth"])
security = HTTPBasic()

# Clerk integration (commented for MVP).
# from clerk_backend_api import Clerk
# clerk_client = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))


def require_basic_auth(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user.username


@router.post("/auth/register", response_model=AuthResponse)
def register(payload: UserCreate) -> AuthResponse:
    if user_exists(payload.username):
        raise HTTPException(status_code=409, detail="User already exists")
    user = create_user(payload.username, payload.password)
    return AuthResponse(username=user.username, status="created")


@router.post("/auth/login", response_model=AuthResponse)
def login(username: str = Depends(require_basic_auth)) -> AuthResponse:
    return AuthResponse(username=username, status="ok")
