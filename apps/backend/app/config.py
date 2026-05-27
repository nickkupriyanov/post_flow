from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./postflow.db"
    jwt_secret: str = "change-this-in-production"
    access_token_expire_minutes: int = 1440
    timeweb_ai_token: str | None = None
    timeweb_ai_agent_id: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
