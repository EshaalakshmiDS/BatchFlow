from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionPage

router = APIRouter()


@router.get("/{job_id}/transactions", response_model=TransactionPage)
def list_transactions(
    job_id: UUID,
    db: Session = Depends(get_db),
    filter: str = Query("all", pattern="^(all|valid|invalid|suspicious)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    q = select(Transaction).where(Transaction.job_id == job_id)

    if filter == "valid":
        q = q.where(Transaction.is_valid == True)
    elif filter == "invalid":
        q = q.where(Transaction.is_valid == False)
    elif filter == "suspicious":
        q = q.where(Transaction.is_suspicious == True)

    count_q = select(func.count()).select_from(q.subquery())
    total = db.scalar(count_q)

    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = db.execute(q).scalars().all()

    return TransactionPage(
        total=total,
        page=page,
        page_size=page_size,
        results=rows
    )
