from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "dev"
    DATABASE_URL: str
    COMPANY_SEED_NAME: str = "MC-MAXWELL"
    COMPANY_SEED_CODE: str = "MCMAXWELL"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
