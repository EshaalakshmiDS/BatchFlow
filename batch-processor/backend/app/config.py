from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/batchdb"
    UPLOAD_DIR: str = "./uploads"
    BATCH_SIZE: int = 100
    MAX_CONCURRENT_JOBS: int = 3
    BATCH_SLEEP_MS: int = 0  # Set >0 in .env to slow batches for demo visibility

    class Config:
        env_file = ".env"

settings = Settings()
