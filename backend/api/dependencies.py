import os
from typing import Annotated
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from sqlmodel import Session
from api.database import get_session
import httpx

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    try:
        # Verify token directly with Supabase instead of decoding locally
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}",
                     "apikey": os.getenv("SUPABASE_ANON_KEY")}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.json()["id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

SessionDep = Annotated[Session, Depends(get_session)]
CurrentUser = Annotated[str, Depends(get_current_user)]