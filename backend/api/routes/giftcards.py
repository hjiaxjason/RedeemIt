import sys
from pathlib import Path

# Add project root to path for imageparsing import
project_root = Path(__file__).parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from typing import Annotated
from sqlmodel import select
from datetime import datetime, timezone, timedelta
from api.models import GiftCard, GiftCardCreate, GiftCardUpdate, GiftCardPublic, GiftCardRead, Transaction, GiftCardParseResult
from api.dependencies import SessionDep, CurrentUser
from imageparsing.card_reader import GiftCardReader
from imageparsing.groq_parser import parse_gift_card_image as groq_parse

router = APIRouter(prefix="/giftcards", tags=["giftcards"])

# Initialize the card reader (LLM used as fallback if GOOGLE_API_KEY is set)
card_reader = GiftCardReader(use_llm=True)


@router.post("/upload", response_model=GiftCardParseResult)
async def upload_giftcard_image(
    file: UploadFile = File(...),
    current_user: str = None,  # Optional auth - can be used without login for parsing
):
    """
    Upload a gift card image and extract card information using Groq Llama vision model.
    
    Returns extracted data for user to review/edit before saving.
    Does NOT save to database - use POST /giftcards/ with the returned data.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read image bytes
    image_bytes = await file.read()
    
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    try:
        # Extract card info using Groq
        card_info = groq_parse(image_bytes)
        
        # Convert to response model
        return GiftCardParseResult(
            brand=card_info.brand,
            card_number=card_info.card_number,
            pin=card_info.pin,
            balance=card_info.balance,
            expiration_date=card_info.expiration_date.isoformat() if card_info.expiration_date else None,
            confidence=card_info.confidence,
            raw_text=card_info.raw_text,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process image with Groq: {str(e)}")


@router.post("/parse-image", response_model=GiftCardParseResult)
async def parse_giftcard_image(
    file: UploadFile = File(...),
    current_user: str = None,  # Optional auth - can be used without login for parsing
):
    """
    Alias for /upload - Parse a gift card image and extract card information using Groq Llama vision model.
    
    Returns extracted data for user to review/edit before saving.
    Does NOT save to database - use POST /giftcards/ with the returned data.
    """
    return await upload_giftcard_image(file, current_user)


@router.post("/parse-groq", response_model=GiftCardParseResult)
async def parse_giftcard_with_groq(
    file: UploadFile = File(...),
    current_user: str = None,  # Optional auth - can be used without login for parsing
):
    """
    Parse a gift card image using Groq's Llama vision model.
    
    Returns extracted data for user to review/edit before saving.
    Does NOT save to database - use POST /giftcards/ with the returned data.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read image bytes
    image_bytes = await file.read()
    
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    try:
        # Extract card info using Groq
        card_info = groq_parse(image_bytes)
        
        # Convert to response model
        return GiftCardParseResult(
            brand=card_info.brand,
            card_number=card_info.card_number,
            pin=card_info.pin,
            balance=card_info.balance,
            expiration_date=card_info.expiration_date.isoformat() if card_info.expiration_date else None,
            confidence=card_info.confidence,
            raw_text=card_info.raw_text,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process image with Groq: {str(e)}")


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