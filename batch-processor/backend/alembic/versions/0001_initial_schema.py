"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("file_path", sa.Text, nullable=False),
        sa.Column("total_records", sa.Integer, nullable=False, server_default="0"),
        sa.Column("processed_records", sa.Integer, nullable=False, server_default="0"),
        sa.Column("valid_records", sa.Integer, nullable=False, server_default="0"),
        sa.Column("invalid_records", sa.Integer, nullable=False, server_default="0"),
        sa.Column("progress_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_jobs_status", "jobs", ["status"])

    op.create_table(
        "transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_id", sa.Text, nullable=False),
        sa.Column("user_id", sa.Text, nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_valid", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_suspicious", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("validation_errors", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_transactions_job_id", "transactions", ["job_id"])
    op.create_index("idx_transactions_job_status", "transactions", ["job_id", "is_valid", "is_suspicious"])
    op.create_index(
        "idx_transactions_txn_per_job",
        "transactions",
        ["job_id", "transaction_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("jobs")
