# BatchFlow — Batch Processing System

A full-stack system for uploading CSVs of financial transactions, processing them in the background, and viewing live progress and results in the browser.

Built with FastAPI + PostgreSQL + SQLAlchemy + React 18 + Tailwind CSS.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│  UploadForm → JobMonitor (polling) → ResultsTable       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (REST)
┌────────────────────────▼────────────────────────────────┐
│                    FastAPI Backend                       │
│                                                         │
│  POST /jobs          → saves file, creates Job row      │
│  POST /jobs/:id/start → spawns worker Thread            │
│  GET  /jobs/:id      → returns job status + progress    │
│  GET  /jobs/:id/transactions → paginated, filtered      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Worker Thread (daemon)              │   │
│  │  reads CSV → validates rows → batch INSERT       │   │
│  │  commits every 100 rows → updates progress       │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ SQLAlchemy ORM
┌────────────────────────▼────────────────────────────────┐
│                     PostgreSQL                           │
│   jobs table          transactions table                 │
└─────────────────────────────────────────────────────────┘
```

The backend is split into clear layers — routers handle HTTP only, services handle processing logic, `core/validators.py` is pure Python with no framework imports. The worker thread is completely isolated from the request lifecycle.

---
### How a Job Flows Through the System

  When a CSV is uploaded, the file is saved to disk and a Job row is created with status pending. The upload and start are intentionally two separate API calls — this gives the client control over when processing begins, and keeps the upload endpoint fast and simple.

  When start is called, the router does a quick sanity check — is the job already running? are we at the concurrency limit? — then spawns a daemon thread and returns immediately. The HTTP response doesn't wait for processing to finish.

  The worker thread opens its own database session (sessions aren't thread-safe), counts the total rows   for progress calculation, then streams through the CSV row by row. Every 100 rows it bulk-inserts the batch and commits — so progress is real and queryable mid-job, not just a number that jumps to 100% at the end.

  On the frontend, a useJobPoller hook polls GET /jobs/{id} every 2 seconds and updates the progress bar. When the status hits completed, the hook stops polling and the results table loads. The progress bar animates smoothly using CSS transitions between poll ticks — so even with a 2-second interval it doesn't feel janky.

  If a job fails mid-file, the error is stored on the job row and the worker exits cleanly. The user can retry — which clears the partial rows and reruns from scratch.

---

## Project Structure

```
batch-processor/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration
│   │   ├── config.py            # All config via pydantic-settings (.env)
│   │   ├── database.py          # SQLAlchemy engine, SessionLocal, Base
│   │   ├── models/              # ORM models (Job, Transaction)
│   │   ├── schemas/             # Pydantic response schemas
│   │   ├── routers/             # Thin HTTP handlers — no business logic
│   │   ├── services/
│   │   │   └── batch_worker.py  # Thread spawning + batch processing
│   │   └── core/
│   │       └── validators.py    # Pure validation — no FastAPI/SQLAlchemy
│   ├── alembic/                 # Migrations
│   ├── tests/                   # Unit tests for validators
│   ├── uploads/                 # Uploaded CSVs (runtime)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/client.js        # All fetch calls centralised
│       ├── hooks/useJobPoller.js # Polling hook, auto-stops on completion
│       └── components/
│           ├── UploadForm.jsx
│           ├── JobMonitor.jsx
│           └── ResultsTable.jsx
└── README.md
```

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally

### 1. Create the database

```sql
CREATE DATABASE batchdb;
```

### 2. Backend — virtual environment

```bash
cd backend

python -m venv venv
source venv/Scripts/activate    # Windows (Git Bash)
# source venv/bin/activate      # Mac / Linux

pip install -r requirements.txt
```

### 3. Environment variables

```bash
cp .env.example .env
```

Open `.env` and set your values:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/batchdb
UPLOAD_DIR=./uploads
BATCH_SIZE=100
MAX_CONCURRENT_JOBS=3
BATCH_SLEEP_MS=0
```

`BATCH_SLEEP_MS` is a demo aid — setting it to `500` slows batch commits so the progress bar animates visibly. Leave it at `0` otherwise.

### 4. Run database migrations

```bash
cd backend
alembic upgrade head
```

Alembic reads `DATABASE_URL` from `.env` — `alembic.ini` contains no credentials. The single migration creates the full schema:

**`jobs` table**
```
id                UUID          PRIMARY KEY
status            VARCHAR(20)   pending | running | completed | failed
file_path         TEXT          path to uploaded CSV on disk
total_records     INTEGER       set when worker starts
processed_records INTEGER       updated after each batch commit
valid_records     INTEGER       updated after each batch commit
invalid_records   INTEGER       updated after each batch commit
progress_percent  NUMERIC(5,2)  0.00 → 100.00
error_message     TEXT          populated on failure
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

**`transactions` table**
```
id                UUID          PRIMARY KEY
job_id            UUID          FK → jobs.id ON DELETE CASCADE
transaction_id    TEXT          raw value from CSV
user_id           TEXT          raw value from CSV
amount            NUMERIC(15,2) NULL for invalid rows where amount couldn't be parsed
timestamp         TIMESTAMPTZ   NULL for invalid rows
is_valid          BOOLEAN
is_suspicious     BOOLEAN
validation_errors JSONB         array of error strings, NULL if valid
created_at        TIMESTAMPTZ
```

**Indexes:**
```
idx_jobs_status                    ON jobs(status)
idx_transactions_job_id            ON transactions(job_id)
idx_transactions_job_status        ON transactions(job_id, is_valid, is_suspicious)
idx_transactions_txn_per_job       ON transactions(job_id, transaction_id)  ← UNIQUE
```

To roll back: `alembic downgrade base`

### 5. Frontend

```bash
cd frontend
npm install
```

---

## Running

```bash
# Terminal 1 — backend
cd backend
source venv/Scripts/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

- UI: http://localhost:5173
- API + interactive docs: http://localhost:8000/docs

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

Tests cover the validation layer entirely — valid rows, missing fields, bad UUIDs, NaN/Infinity amounts, bad timestamps, duplicates, and suspicious flagging. No database or HTTP server needed since validators are pure Python.

---

## API

| Method | Endpoint | Status | Description |
|---|---|---|---|
| GET | `/health` | 200 | Health check |
| POST | `/jobs` | 201 | Upload CSV, create job |
| POST | `/jobs/{id}/start` | 200 | Start processing |
| GET | `/jobs/{id}` | 200 | Job status and progress |
| GET | `/jobs/{id}/transactions` | 200 | Paginated transaction results |

`GET /jobs/{id}/transactions` query params:
- `filter`: `all` (default), `valid`, `invalid`, `suspicious`
- `page`: default `1`
- `page_size`: default `50`, max `200`

Error responses:
- `404` — job not found
- `409` — job already running or completed
- `429` — concurrency limit reached (shows current/max in message)
- `422` — invalid query parameter (e.g. unrecognised filter value)

---

## Design Decisions

**NUMERIC(15,2), not float.**
`float` can't represent most decimals exactly — `0.1 + 0.2` in Python is `0.30000000000000004`. All amounts use Python `Decimal` end-to-end: CSV parsing → validation → ORM → Pydantic schema → JSON response. The DB column is `NUMERIC(15,2)`.

**Batch commits every 100 rows.**
The worker streams the CSV with `csv.DictReader` (no full file load into memory), batches up 100 `Transaction` objects, and calls `bulk_save_objects` then commits. This keeps memory flat for large files, makes progress genuinely observable mid-job, and limits data loss to at most 100 rows if the worker crashes.

**Worker uses an isolated SQLAlchemy session.**
SQLAlchemy sessions are not thread-safe. The background worker opens its own `SessionLocal()` entirely separate from the request session, and closes it in a `finally` block. Sharing the request session across threads causes race conditions.

**Validators are pure Python with no framework imports.**
`core/validators.py` only uses the standard library (`re`, `datetime`, `decimal`, `dataclasses`). This means the validation layer can be fully unit-tested without spinning up FastAPI, a database, or any mocks.

**Validation errors stored as JSONB on the transaction row.**
Each row that fails validation stores the error messages as a JSON array on the row itself. No separate errors table, no extra joins — the API returns errors inline with the transaction.

**Per-job uniqueness on transaction_id.**
The unique index is on `(job_id, transaction_id)` rather than globally on `transaction_id`. The same transaction can legitimately appear across different upload jobs (re-uploads, corrections). The constraint only enforces uniqueness within one processing run.

**Suspicious ≠ Invalid.**
Amounts below 0 or above $50,000 set `is_suspicious = True` but leave `is_valid = True`. These are real transactions that warrant review, not data errors — treating them as invalid would discard legitimate data.

**Concurrency control using the database.**
Before spawning a worker thread, the router queries `COUNT(*) WHERE status = 'running'`. If it hits `MAX_CONCURRENT_JOBS`, it returns 429. Using the DB as the source of truth means the count is accurate across restarts — an in-memory counter would reset.

**Polling over WebSockets.**
The frontend polls `GET /jobs/{id}` every 2 seconds via a `useJobPoller` hook. The hook auto-stops on terminal states and cleans up the interval on unmount. For batch job progress, 2-second latency is acceptable and polling avoids the need for persistent connections or server-side push infrastructure.

---

## Validation Logic

Each row is validated by `validate_row()` in `core/validators.py`. All errors are collected (not fail-fast), so a row with three problems reports all three.

| Field | Rule | Error message |
|---|---|---|
| All | Present and non-empty | `Missing required field: {field}` |
| `transaction_id` | Valid UUID v4 format | `transaction_id must be a valid UUID/GUID` |
| `transaction_id` | Unique within this job | `transaction_id is duplicate within this job` |
| `user_id` | Valid UUID v4 format | `user_id must be a valid UUID/GUID` |
| `amount` | Finite numeric value | `amount must be a numeric value` |
| `amount` | Less than 10^13 (fits NUMERIC(15,2)) | `amount must be a numeric value` |
| `timestamp` | Valid ISO 8601 | `timestamp must be a valid ISO 8601 datetime` |

Suspicious flagging (row stays valid): `amount < 0` or `amount > 50,000`

A few non-obvious cases handled:
- `"NaN"` passes `Decimal()` without raising — an explicit `is_finite()` check catches it
- Rows with missing fields still register their `transaction_id` in the seen-set, so a later valid row with the same ID is still caught as a duplicate
- Duplicate rows are stored with a generated UUID as the DB key (to satisfy the unique constraint) while retaining the original validation error message

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Empty CSV (headers only) | Completes with 0 records |
| NaN / Infinity as amount | Rejected by `is_finite()` check, stored as invalid |
| Astronomically large amount (e.g. `1e999`) | Rejected by overflow guard, stored as invalid |
| Duplicate transaction_id in same file | Stored as invalid with error message |
| Starting an already-running job | HTTP 409 |
| Retrying a failed job | Deletes partial rows, resets counters, re-runs from scratch |
| Worker crashes mid-file | Job marked `failed`, error message stored in DB |
| Concurrent job limit reached | HTTP 429 with current/max counts in message |

---

## Assumptions

- CSV is UTF-8 with a header row: `transaction_id, user_id, amount, timestamp`
- `transaction_id` and `user_id` are UUID v4 format
- `amount` is plain decimal — not formatted like `$1,000.00`
- `timestamp` is ISO 8601 (e.g. `2025-06-01T12:00:00`)
- Single-node deployment — no distributed queue needed at this scale
- File storage is local disk

---

## Sample Files

Eight CSV fixtures in `backend/uploads/` cover the main test scenarios:

| File | Rows | What it tests |
|---|---|---|
| `sample_large_1000.csv` | 1000 | Scale — mix of valid, suspicious, invalid |
| `sample_negative_amounts.csv` | 100 | Suspicious flagging |
| `sample_duplicates.csv` | 100 | Duplicate transaction ID handling |
| `sample_bad_timestamps.csv` | 100 | Timestamp validation |
| `sample_mixed_errors.csv` | 200 | All error types interleaved |
| `sample_all_suspicious.csv` | 150 | All valid, all suspicious |
| `sample_mostly_invalid.csv` | 100 | 90% invalid rows |
| `sample_empty.csv` | 0 | Empty file edge case |
