from sqlmodel import Field, SQLModel
from datetime import datetime

class GiftCardBase(SQLModel):
    brand: str = Field(index=True)
    category: str | None = Field(default=None, index=True)
    expiration_date: datetime | None = Field(default=None, index=True)
    logo_url: str | None = None

class GiftCard(GiftCardBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)  # changed to str to match Supabase UUID
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

class GiftCardCreate(GiftCardBase):
    card_number: str
    pin: str
    original_balance: float
    # user_id comes from the auth token, not the request body

class GiftCardRead(GiftCardBase):
    id: int
    user_id: str
    balance: float
    original_balance: float
    last_used: datetime | None

class GiftCardUpdate(SQLModel):
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
    amount_spent: float

class TransactionRead(SQLModel):
    id: int
    gift_card_id: int
    amount_spent: float
    balance_after: float
    created_at: datetime

class SignUpRequest(SQLModel):
    email: str
    password: str

class LoginRequest(SQLModel):
    email: str
    password: str