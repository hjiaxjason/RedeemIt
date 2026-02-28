from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
from typing import Optional

# ============== USER MODELS ==============

class UserBase(SQLModel):
    """Base user class with common fields"""
    email: str = Field(unique=True, index=True)
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class User(UserBase, table=True):
    """User table - synced with Supabase Auth"""
    id: str = Field(primary_key=True)  # UUID from Supabase
    updated_at: datetime | None = None
    last_login: datetime | None = None
    
    # Relationship to gift cards
    gift_cards: list["GiftCard"] = Relationship(back_populates="owner")

class UserCreate(SQLModel):
    """For creating a user (email/password handled by Supabase)"""
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None

class UserRead(UserBase):
    """Public user data returned by API"""
    id: str

class UserUpdate(SQLModel):
    """For updating user profile"""
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None

# ============== GIFT CARD MODELS ==============

class GiftCardBase(SQLModel):
    brand: str = Field(index=True)
    category: str | None = Field(default=None, index=True)
    expiration_date: datetime | None = Field(default=None, index=True)
    logo_url: str | None = None

class GiftCard(GiftCardBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    card_number: str
    pin: str
    original_balance: float
    balance: float
    last_used: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship back to user
    owner: Optional[User] = Relationship(back_populates="gift_cards")
    # Relationship to transactions
    transactions: list["Transaction"] = Relationship(back_populates="gift_card")

class GiftCardPublic(GiftCardBase):
    """Safe to return in lists (no card_number, no pin)"""
    id: int
    balance: float
    original_balance: float
    last_used: datetime | None
    created_at: datetime | None = None

class GiftCardCreate(GiftCardBase):
    card_number: str
    pin: str
    original_balance: float

class GiftCardRead(GiftCardBase):
    """Full detail for individual card page"""
    id: int
    user_id: str
    card_number: str
    pin: str
    balance: float
    original_balance: float
    last_used: datetime | None
    created_at: datetime | None = None

class GiftCardUpdate(SQLModel):
    brand: str | None = None
    category: str | None = None
    expiration_date: datetime | None = None
    logo_url: str | None = None
    card_number: str | None = None
    pin: str | None = None
    balance: float | None = None
    last_used: datetime | None = None

# ============== USER GIFT CARD COLLECTION ==============

class UserGiftCardCollection(SQLModel):
    """Represents a user's complete gift card collection with stats"""
    user: UserRead
    cards: list[GiftCardPublic]
    total_balance: float
    total_cards: int
    expiring_soon: int
    categories: list[str]

# ============== TRANSACTION MODELS ==============

class Transaction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    gift_card_id: int = Field(foreign_key="giftcard.id", index=True)
    amount_spent: float
    balance_after: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship back to gift card
    gift_card: Optional[GiftCard] = Relationship(back_populates="transactions")

class TransactionCreate(SQLModel):
    amount_spent: float

class TransactionRead(SQLModel):
    id: int
    gift_card_id: int
    amount_spent: float
    balance_after: float
    created_at: datetime

# ============== AUTH MODELS ==============

class SignUpRequest(SQLModel):
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None

class LoginRequest(SQLModel):
    email: str
    password: str

class AuthResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead