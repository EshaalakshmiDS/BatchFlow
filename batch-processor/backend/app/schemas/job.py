from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class JobResponse(BaseModel):
    id: UUID
    status: str
    total_records: int
    processed_records: int
    valid_records: int
    invalid_records: int
    progress_percent: float
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
