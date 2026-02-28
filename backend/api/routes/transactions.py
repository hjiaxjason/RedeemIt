from fastapi import APIRouter, HTTPException
from sqlmodel import select
from datetime import datetime
from api.models import Transaction, TransactionCreate, TransactionRead, GiftCard
from api.dependencies import SessionDep, CurrentUser

router = APIRouter(prefix="/giftcards", tags=["transactions"])

@router.post("/{giftcard_id}/transactions", response_model=TransactionRead)
def log_transaction(giftcard_id: int, transaction: TransactionCreate, session: SessionDep, current_user: CurrentUser):
    giftcard = session.get(GiftCard, giftcard_id)
    if not giftcard or giftcard.user_id != current_user:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    if transaction.amount_spent > giftcard.balance:
        raise HTTPException(status_code=400, detail="Amount exceeds remaining balance")

    new_balance = giftcard.balance - transaction.amount_spent
    giftcard.balance = new_balance
    giftcard.last_used = datetime.utcnow()

    db_transaction = Transaction(
        gift_card_id=giftcard_id,
        amount_spent=transaction.amount_spent,
        balance_after=new_balance
    )
    session.add(giftcard)
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    return db_transaction

@router.get("/{giftcard_id}/transactions", response_model=list[TransactionRead])
def get_transactions(giftcard_id: int, session: SessionDep, current_user: CurrentUser):
    giftcard = session.get(GiftCard, giftcard_id)
    if not giftcard or giftcard.user_id != current_user:
        raise HTTPException(status_code=404, detail="Giftcard not found")
    transactions = session.exec(
        select(Transaction).where(Transaction.gift_card_id == giftcard_id)
    ).all()
    return transactions