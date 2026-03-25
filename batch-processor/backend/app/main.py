from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import jobs, transactions
import os
from app.config import settings

app = FastAPI(title="Batch Processor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(transactions.router, prefix="/jobs", tags=["transactions"])

@app.get("/health")
def health():
    return {"status": "ok"}
