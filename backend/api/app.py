from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.database import create_db_and_tables
from api.routes import auth, giftcards, transactions

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(giftcards.router)
app.include_router(transactions.router)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# SUPABASE_URL=https://gcyrecutvltciobynxjp.supabase.co
# SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_JWT_SECRET=your_jwt_secret