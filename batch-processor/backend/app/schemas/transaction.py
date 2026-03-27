from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

class TransactionOut(BaseModel):
    id: UUID
    transaction_id: str
    user_id: str
    amount: Decimal | None
    timestamp: datetime | None
    is_valid: bool
    is_suspicious: bool
    validation_errors: list[str] | None

    model_config = {"from_attributes": True}

class TransactionPage(BaseModel):
    total: int
    page: int
    page_size: int
    results: list[TransactionOut]
