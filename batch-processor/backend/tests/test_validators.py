import pytest
from app.core.validators import validate_row

VALID_TXN_ID = "550e8400-e29b-41d4-a716-446655440000"
VALID_USER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"


def base_row(**overrides):
    return {
        "transaction_id": VALID_TXN_ID,
        "user_id": VALID_USER_ID,
        "amount": "100.00",
        "timestamp": "2025-01-01T10:00:00",
        **overrides
    }


def test_valid_row():
    r = validate_row(base_row(), set())
    assert r.is_valid and not r.is_suspicious


def test_suspicious_negative():
    r = validate_row(base_row(amount="-10"), set())
    assert r.is_valid and r.is_suspicious


def test_suspicious_over_limit():
    r = validate_row(base_row(amount="60000"), set())
    assert r.is_valid and r.is_suspicious


def test_invalid_amount():
    r = validate_row(base_row(amount="abc"), set())
    assert not r.is_valid


def test_invalid_timestamp():
    r = validate_row(base_row(timestamp="not-a-date"), set())
    assert not r.is_valid


def test_invalid_txn_id():
    r = validate_row(base_row(transaction_id="not-a-guid"), set())
    assert not r.is_valid


def test_duplicate_txn_id():
    seen = {VALID_TXN_ID}
    r = validate_row(base_row(), seen)
    assert not r.is_valid
    assert any("duplicate" in e for e in r.errors)


def test_missing_field():
    r = validate_row({"transaction_id": "", "user_id": VALID_USER_ID, "amount": "10", "timestamp": "2025-01-01T10:00:00"}, set())
    assert not r.is_valid


def test_invalid_user_id():
    r = validate_row(base_row(user_id="not-a-guid"), set())
    assert not r.is_valid
    assert any("user_id" in e for e in r.errors)
