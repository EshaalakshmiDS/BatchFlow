import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from dataclasses import dataclass, field

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)
REQUIRED_FIELDS = {"transaction_id", "user_id", "amount", "timestamp"}


@dataclass
class ValidationResult:
    is_valid: bool = True
    is_suspicious: bool = False
    errors: list[str] = field(default_factory=list)
    amount: Decimal | None = None
    timestamp: datetime | None = None

    def fail(self, msg: str):
        self.errors.append(msg)
        self.is_valid = False


def validate_row(row: dict, seen_transaction_ids: set[str]) -> ValidationResult:
    result = ValidationResult()

    for f in REQUIRED_FIELDS:
        if not row.get(f, "").strip():
            result.fail(f"Missing required field: {f}")

    if not result.is_valid:
        # Still register the transaction_id so duplicates are caught even when other fields are missing
        txn_id_early = row.get("transaction_id", "").strip()
        if txn_id_early:
            seen_transaction_ids.add(txn_id_early)
        return result

    txn_id = row["transaction_id"].strip()
    user_id = row["user_id"].strip()
    amount_raw = row["amount"].strip()
    timestamp_raw = row["timestamp"].strip()

    if not UUID_PATTERN.match(txn_id):
        result.fail("transaction_id must be a valid UUID/GUID")

    if txn_id in seen_transaction_ids:
        result.fail("transaction_id is duplicate within this job")
    else:
        seen_transaction_ids.add(txn_id)

    if not UUID_PATTERN.match(user_id):
        result.fail("user_id must be a valid UUID/GUID")

    try:
        amount = Decimal(amount_raw)
        if not amount.is_finite() or abs(amount) >= Decimal('1E13'):
            raise InvalidOperation
        result.amount = amount
        if amount < 0 or amount > 50_000:
            result.is_suspicious = True
    except InvalidOperation:
        result.fail("amount must be a numeric value")

    try:
        result.timestamp = datetime.fromisoformat(timestamp_raw)
    except ValueError:
        result.fail("timestamp must be a valid ISO 8601 datetime")

    return result
