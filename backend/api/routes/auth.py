import os
from fastapi import APIRouter, HTTPException
from supabase import create_client, Client
from sqlmodel import Session
from api.models import SignUpRequest, LoginRequest, User, UserRead
from api.database import engine
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)

def sync_user_to_db(user_id: str, email: str, first_name: str = None, last_name: str = None):
    """Sync Supabase user to local database"""
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            user = User(
                id=user_id,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            session.add(user)
        else:
            user.last_login = datetime.utcnow()
            session.add(user)
        session.commit()
        session.refresh(user)
        return user

@router.post("/signup")
def signup(request: SignUpRequest):
    try:
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })
        
        if response.user:
            # Sync user to local database
            sync_user_to_db(
                user_id=response.user.id,
                email=request.email,
                first_name=request.first_name,
                last_name=request.last_name
            )
        
        return {"message": "Signup successful, check your email to confirm", "user_id": response.user.id if response.user else None}
    except Exception as e:
        if "already registered" in str(e).lower():
            raise HTTPException(status_code=400, detail="User already registered")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login(request: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        # Sync user to local database on login
        user = sync_user_to_db(
            user_id=response.user.id,
            email=request.email
        )
        
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user": UserRead.model_validate(user)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/logout")
def logout():
    supabase.auth.sign_out()
    return {"message": "Logged out"}