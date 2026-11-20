from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    database_url: str = "sqlite:///./payguard.db"
    frontend_origin: str = "http://localhost:3001"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
settings = Settings()
