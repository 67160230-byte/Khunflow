from pydantic_settings import BaseSettings

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

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
