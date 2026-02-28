from fastapi import APIRouter, HTTPException, Query
from typing import Annotated
from sqlmodel import select
from datetime import datetime, timezone, timedelta
from api.models import GiftCard, GiftCardCreate, GiftCardUpdate, GiftCardPublic, GiftCardRead, Transaction
from api.dependencies import SessionDep, CurrentUser
from fastapi import UploadFile, File, Depends

router = APIRouter(prefix="/giftcards", tags=["giftcards"])

@router.post("/", response_model=GiftCardPublic)
def create_giftcard(giftcard: GiftCardCreate, session: SessionDep, current_user: CurrentUser):
    db_giftcard = GiftCard(
        **giftcard.model_dump(),
        user_id=current_user,
        balance=giftcard.original_balance,
    )
    session.add(db_giftcard)
    session.commit()
    session.refresh(db_giftcard)
    return db_giftcard

@router.post("/scan", response_model=GiftCardPublic)
async def scan_giftcard(file: UploadFile, session: SessionDep, current_user: CurrentUser):
    # Read the raw image bytes from the upload
    image_bytes = await file.read()

    # ── PARSER PLACEHOLDER ─────────────────────────────────────────
    # When your teammate finishes the parser, replace these two lines:
    #
    #   from utils.parser import parse_giftcard_image
    #   parsed = parse_giftcard_image(image_bytes)
    #
    # parsed should return a dict like:
    #   { "brand": "Nike", "card_number": "1234", "original_balance": 50.00,
    #     "expiration_date": "2025-12-31", "category": "clothing" }
    # ──────────────────────────────────────────────────────────────
    raise HTTPException(status_code=503, detail="Parser not ready yet")

    db_giftcard = GiftCard(
        **parsed,
        user_id=current_user,
        balance=parsed["original_balance"],
    )
    session.add(db_giftcard)
    session.commit()
    session.refresh(db_giftcard)
    return db_giftcard

@router.get("/summary")
def get_summary(session: SessionDep, current_user: CurrentUser):
    cards = session.exec(select(GiftCard).where(GiftCard.user_id == current_user)).all()
    return {
        "total_balance": sum(c.balance for c in cards if c.balance),
        "total_cards": len(cards),
        "expiring_soon": sum(1 for c in cards if c.expiration_date and
                            c.expiration_date <= datetime.utcnow() + timedelta(days=7))
    }

@router.get("/stats")
def get_stats(session: SessionDep, current_user: CurrentUser):
    """Alias for /summary - matches test_api.sh."""
    return get_summary(session, current_user)

@router.get("/expiring", response_model=list[GiftCardPublic])
def get_expiring(session: SessionDep, current_user: CurrentUser, days: int = 7):
    """Get expiring cards - matches test_api.sh path."""
    cutoff = datetime.now(timezone.utc) + timedelta(days=days)
    cards = session.exec(
        select(GiftCard)
        .where(GiftCard.user_id == current_user)
        .where(GiftCard.expiration_date <= cutoff)
    ).all()
    return cards

@router.get("/expiring/soon", response_model=list[GiftCardPublic])
def get_expiring_cards(session: SessionDep, current_user: CurrentUser, days: int = 7):
    cutoff = datetime.now(timezone.utc) + timedelta(days=days)
    cards = session.exec(
        select(GiftCard)
        .where(GiftCard.user_id == current_user)
        .where(GiftCard.expiration_date <= cutoff)
    ).all()
    return cards

@router.get("/by-retailer/{brand}", response_model=list[GiftCardPublic])
def get_cards_by_retailer(brand: str, session: SessionDep, current_user: CurrentUser):
    cards = session.exec(
        select(GiftCard)
        .where(GiftCard.user_id == current_user)
        .where(GiftCard.brand.ilike(f"%{brand}%"))
    ).all()
    return cards

@router.get("/", response_model=list[GiftCardPublic])
def read_cards(
    session: SessionDep,
    current_user: CurrentUser,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
    category: str | None = None,
    sort_by: str = "expiration_date"
):
    query = select(GiftCard).where(GiftCard.user_id == current_user)
    if category:
        query = query.where(GiftCard.category == category)
    if sort_by == "balance":
        query = query.order_by(GiftCard.balance.desc())
    elif sort_by == "last_used":
        query = query.order_by(GiftCard.last_used.asc())
    else:
        query = query.order_by(GiftCard.expiration_date.asc())
    return session.exec(query.offset(offset).limit(limit)).all()

@router.get("/{giftcard_id}", response_model=GiftCardRead)
def get_giftcard(giftcard_id: int, session: SessionDep, current_user: CurrentUser):
    giftcard = session.get(GiftCard, giftcard_id)
    if not giftcard or giftcard.user_id != current_user:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    return giftcard

@router.patch("/{giftcard_id}", response_model=GiftCardPublic)
def update_giftcard(giftcard_id: int, giftcard: GiftCardUpdate, session: SessionDep, current_user: CurrentUser):
    giftcard_db = session.get(GiftCard, giftcard_id)
    if not giftcard_db or giftcard_db.user_id != current_user:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    giftcard_data = giftcard.model_dump(exclude_unset=True)
    giftcard_db.sqlmodel_update(giftcard_data)
    session.add(giftcard_db)
    session.commit()
    session.refresh(giftcard_db)
    return giftcard_db

@router.delete("/{giftcard_id}")
def delete_giftcard(giftcard_id: int, session: SessionDep, current_user: CurrentUser):
    giftcard = session.get(GiftCard, giftcard_id)
    if not giftcard or giftcard.user_id != current_user:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    # Delete associated transactions first
    transactions = session.exec(select(Transaction).where(Transaction.gift_card_id == giftcard_id)).all()
    for txn in transactions:
        session.delete(txn)
    session.flush()  # Flush transaction deletions before deleting giftcard
    session.delete(giftcard)
    session.commit()
    return {"ok": True}