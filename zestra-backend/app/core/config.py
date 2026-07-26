from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Zestra Backend"
    ENV: str = "development"

    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/zestra"
    )
    REDIS_URL: str = (
        "rediss://default:your_upstash_password@your-endpoint.upstash.io:6379"
    )

    JWT_SECRET: str = "change_this_to_a_secure_secret_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = (
        "http://localhost:8000/api/v1/auth/google/callback"
    )

    FRONTEND_BASE_URL: str = "http://localhost:5173"

    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            if "sslmode=" in v:
                v = v.replace("sslmode=", "ssl=")
        return v

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("https://"):
                return v.replace("https://", "rediss://", 1)
            if v.startswith("http://"):
                return v.replace("http://", "redis://", 1)
        return v


settings = Settings()
