import os
from typing import Annotated
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlmodel import Field, Session, SQLModel, create_engine, select
from datetime import datetime

load_dotenv()

class GiftCardBase(SQLModel):
    brand: str = Field(index=True)
    category: str | None = Field(default=None, index=True)
    expiration_date: datetime | None = Field(default=None, index=True)
    logo_url: str | None = None

class GiftCard(GiftCardBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    card_number: str
    pin: str
    original_balance: float
    balance: float
    last_used: datetime | None = None

class GiftCardPublic(GiftCardBase):
    id: int
    balance: float
    original_balance: float
    last_used: datetime | None
    # card_number and pin intentionally excluded

class GiftCardCreate(GiftCardBase):
    user_id: int
    card_number: str
    pin: str
    original_balance: float
    # balance is derived from original_balance on creation, so omit it here

class GiftCardRead(GiftCardBase):
    id: int
    user_id: int
    balance: float
    original_balance: float
    last_used: datetime | None

class GiftCardUpdate(SQLModel):  # all fields optional for PATCH semantics
    brand: str | None = None
    category: str | None = None
    expiration_date: datetime | None = None
    logo_url: str | None = None
    card_number: str | None = None
    pin: str | None = None
    balance: float | None = None
    last_used: datetime | None = None

class Transaction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    gift_card_id: int = Field(foreign_key="giftcard.id", index=True)
    amount_spent: float
    balance_after: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(SQLModel):
    gift_card_id: int
    amount_spent: float

class TransactionRead(SQLModel):
    id: int
    gift_card_id: int
    amount_spent: float
    balance_after: float
    created_at: datetime


DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Giftcards

@app.post("/giftcards/", response_model=GiftCardPublic)
def create_giftcard(giftcard: GiftCardCreate, session: SessionDep) -> GiftCard:
    db_giftcard = GiftCard.model_validate(giftcard)
    db_giftcard.balance = giftcard.original_balance
    session.add(db_giftcard)
    session.commit()
    session.refresh(db_giftcard)
    return db_giftcard

@app.get("/giftcards/", response_model=list[GiftCardPublic])
def read_cards(session: SessionDep, offset: int = 0, limit: Annotated[int, Query(le=100)] = 100) -> list[GiftCard]:
    giftcards = session.exec(select(GiftCard).offset(offset).limit(limit)).all()
    return giftcards

@app.get("/giftcards/{giftcard_id}", response_model=GiftCardPublic)
def get_giftcard(giftcard_id: int, session: SessionDep) -> GiftCard:
    giftcard = session.get(GiftCard, giftcard_id)
    if not giftcard:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    return giftcard

@app.patch("/giftcards{giftcard_id}", response_model=GiftCardPublic)
def update_giftcard(giftcard_id: int, giftcard: GiftCardUpdate, session: SessionDep):
    giftcard_db = session.get(GiftCard, giftcard_id)
    if not giftcard_db:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    giftcard_data = giftcard.model_dump(exclude_unset=True)
    giftcard_db.sqlmodel_update(giftcard_data)
    session.add(giftcard_db)
    session.commit()
    session.refresh(giftcard_db)
    return giftcard_db

@app.delete("/giftcards/{giftcard_id}")
def delete_giftcard(giftcard_id: int, session: SessionDep):
    giftcard = session.get(GiftCard, giftcard_id)
    if not giftcard:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    session.delete(giftcard)
    session.commit()
    return {"ok": True}


# Transactions

@app.post("/giftcards/{giftcard_id}/transactions", response_model=TransactionRead)
def log_transaction(giftcard_id: int, transaction: TransactionCreate, session: SessionDep):
    giftcard = session.get(GiftCard, giftcard_id)
    if not giftcard:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    if transaction.amount_spent > giftcard.balance:
        raise HTTPException(status_code=404, detail="Amount exceeds remaining balance")

    new_balance = giftcard.balance - transaction.amonut_spend
    giftcard.balance = new_balance
    giftcard.last_used = datetime.utcnow()

    db_transaction = Transaction(
        gift_card_id=giftcard_id,
        amount_spent =transaction.amount_spent,
        balance_after=new_balance
    )
    session.add(giftcard)
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    return db_transaction

@app.get("/giftcards/{giftcard_id}/transaction", response_model = list[TransactionRead])
def get_transactions(giftcard_id: int, session: SessionDep):
    transactions = session.exec(
        select(Transaction).where(Transaction.gift_card_id == giftcard_id)
    )
    return transactions

# Sorting

@app.get("/giftcards/expiring/soon", response_model=list[GiftCardPublic])
def get_expiring_cards(session: SessionDep, days: int = 7):
    from datetime import timezone, timedelta
    cutoff = datetime.now(timezone.utc) + timedelta(days=days)
    cards = session.exec(
        select(GiftCard).where(GiftCard.expiration_date <= cutoff)
    ).all()
    return cards

@app.get("/giftcards/by-retailer/{brand}", response_model=list[GiftCardPublic])
def get_cards_by_retailer(brand: str, session: SessionDep):
    cards = session.exec(
        select(GiftCard).where(GiftCard.brand.ilike(f"%{brand}%"))
    ).all()
    return cards

@app.get("/giftcards/summary")
def get_summary(session: SessionDep):
    cards = session.exec(select(GiftCard)).all()
    return {
        "total_balance": sum(c.balance for c in cards if c.balance),
        "total_cards": len(cards),
        "expiring_soon": sum(1 for c in cards if c.expiration_date and 
                            c.expiration_date <= datetime.utcnow() + timedelta(days=7))

    }

@app.get("/giftcards/", response_model=list[GiftCardPublic])
def read_cards(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
    category: str | None = None,
    sort_by: str = "expiration_date"  # or "balance", "last_used"
):
    query = select(GiftCard)
    if category:
        query = query.where(GiftCard.category == category)
    if sort_by == "balance":
        query = query.order_by(GiftCard.balance.desc())
    elif sort_by == "last_used":
        query = query.order_by(GiftCard.last_used.asc())
    else:
        query = query.order_by(GiftCard.expiration_date.asc())
    return session.exec(query.offset(offset).limit(limit)).all()