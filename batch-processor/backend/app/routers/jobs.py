import os
import shutil
import uuid
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.job import Job
from app.models.transaction import Transaction
from app.services.batch_worker import process_job
from app.schemas.job import JobResponse
from app.config import settings

router = APIRouter()


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Generate ID in Python so file_path can be set before INSERT
    job_id = uuid.uuid4()
    file_path = os.path.join(settings.UPLOAD_DIR, f"{job_id}.csv")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job = Job(id=job_id, file_path=file_path)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/start", response_model=JobResponse)
def start_job(job_id: UUID, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("running", "completed"):
        raise HTTPException(
            status_code=409,
            detail=f"Job cannot be started: current status is '{job.status}'"
        )

    # Concurrency control — cap simultaneous running jobs
    running_count = db.scalar(
        select(func.count()).select_from(Job).where(Job.status == "running")
    )
    if running_count >= settings.MAX_CONCURRENT_JOBS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many running jobs ({running_count}/{settings.MAX_CONCURRENT_JOBS}). Wait for one to complete."
        )

    # Retry — clean up partial rows and reset counters from the previous failed run
    if job.status == "failed":
        db.execute(
            Transaction.__table__.delete().where(Transaction.job_id == job_id)
        )
        job.processed_records = 0
        job.valid_records = 0
        job.invalid_records = 0
        job.progress_percent = 0
        job.error_message = None
        job.status = "pending"
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

    process_job(str(job_id), job.file_path)
    return job


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
