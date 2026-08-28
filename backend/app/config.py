from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "KhumFlow API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Database — default ใช้สำหรับ Docker Compose
    DATABASE_URL: str = "postgresql+asyncpg://khumflow:khumflow_secret@postgres:5432/khumflow"
    SYNC_DATABASE_URL: str = "postgresql://khumflow:khumflow_secret@postgres:5432/khumflow"

    # JWT
    JWT_SECRET: str = "khumflow_super_secret_jwt_key_change_in_production_12345"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 วัน

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            # แปลง postgres:// หรือ postgresql:// ให้ใช้ asyncpg driver เสมอ
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
