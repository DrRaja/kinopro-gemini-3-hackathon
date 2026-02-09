from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    username: str
    status: str
