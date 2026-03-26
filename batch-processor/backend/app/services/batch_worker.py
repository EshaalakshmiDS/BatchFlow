import csv
import threading
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.job import Job
from app.models.transaction import Transaction
from app.core.validators import validate_row
from app.config import settings

BATCH_SIZE = settings.BATCH_SIZE


def process_job(job_id: str, file_path: str):
    """Entry point called in a new Thread."""
    thread = threading.Thread(
        target=_run_processing,
        args=(job_id, file_path),
        daemon=True,
        name=f"worker-{job_id}"
    )
    thread.start()


def _run_processing(job_id: str, file_path: str):
    db = SessionLocal()
    try:
        # Count total rows first (for accurate progress)
        with open(file_path, "r") as f:
            total = sum(1 for _ in csv.DictReader(f))

        # Mark job as running
        job = db.get(Job, job_id)
        job.status = "running"
        job.total_records = total
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        seen_txn_ids: set[str] = set()
        batch: list[Transaction] = []
        processed = valid = invalid = 0

        with open(file_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                result = validate_row(row, seen_txn_ids)

                txn = Transaction(
                    job_id=job_id,
                    transaction_id=row.get("transaction_id", "").strip(),
                    user_id=row.get("user_id", "").strip(),
                    amount=float(result.amount) if result.amount is not None else None,
                    timestamp=result.timestamp,
                    is_valid=result.is_valid,
                    is_suspicious=result.is_suspicious,
                    validation_errors=result.errors if result.errors else None,
                )
                batch.append(txn)
                processed += 1
                if result.is_valid:
                    valid += 1
                else:
                    invalid += 1

                # Commit every BATCH_SIZE rows
                if len(batch) >= BATCH_SIZE:
                    db.bulk_save_objects(batch)
                    _update_job_progress(db, job_id, total, processed, valid, invalid)
                    batch = []

            # Flush remaining rows
            if batch:
                db.bulk_save_objects(batch)
                _update_job_progress(db, job_id, total, processed, valid, invalid)

        # Mark complete
        job = db.get(Job, job_id)
        job.status = "completed"
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as exc:
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            job.status = "failed"
            job.error_message = str(exc)
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


def _update_job_progress(db, job_id, total, processed, valid, invalid):
    job = db.get(Job, job_id)
    job.processed_records = processed
    job.valid_records = valid
    job.invalid_records = invalid
    job.progress_percent = round((processed / total) * 100, 2) if total else 0
    job.updated_at = datetime.now(timezone.utc)
    db.commit()
