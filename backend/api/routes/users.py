from fastapi import APIRouter, HTTPException
from sqlmodel import select
from datetime import datetime, timedelta
from api.models import (
    User, UserRead, UserUpdate, UserGiftCardCollection,
    GiftCard, GiftCardPublic
)
from api.dependencies import SessionDep, CurrentUser

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserRead)
def get_current_user_profile(session: SessionDep, current_user: CurrentUser):
    """Get the current user's profile"""
    user = session.get(User, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/me", response_model=UserRead)
def update_current_user_profile(
    user_update: UserUpdate,
    session: SessionDep,
    current_user: CurrentUser
):
    """Update the current user's profile"""
    user = session.get(User, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.get("/me/collection", response_model=UserGiftCardCollection)
def get_user_collection(session: SessionDep, current_user: CurrentUser):
    """Get the current user's complete gift card collection with stats"""
    user = session.get(User, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all user's gift cards
    cards = session.exec(
        select(GiftCard).where(GiftCard.user_id == current_user)
    ).all()
    
    # Calculate stats
    total_balance = sum(card.balance for card in cards)
    
    # Count expiring soon (within 7 days)
    now = datetime.utcnow()
    week_from_now = now + timedelta(days=7)
    expiring_soon = sum(
        1 for card in cards 
        if card.expiration_date and now <= card.expiration_date <= week_from_now
    )
    
    # Get unique categories
    categories = list(set(card.category for card in cards if card.category))
    
    # Convert to public models
    public_cards = [GiftCardPublic.model_validate(card) for card in cards]
    
    return UserGiftCardCollection(
        user=UserRead.model_validate(user),
        cards=public_cards,
        total_balance=total_balance,
        total_cards=len(cards),
        expiring_soon=expiring_soon,
        categories=categories
    )

@router.delete("/me", status_code=204)
def delete_current_user(session: SessionDep, current_user: CurrentUser):
    """Delete the current user and all their data"""
    user = session.get(User, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete all user's gift cards (transactions cascade)
    cards = session.exec(
        select(GiftCard).where(GiftCard.user_id == current_user)
    ).all()
    for card in cards:
        session.delete(card)
    
    session.delete(user)
    session.commit()
