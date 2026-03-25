from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/batchdb"
    UPLOAD_DIR: str = "./uploads"
    BATCH_SIZE: int = 100

    class Config:
        env_file = ".env"

settings = Settings()
