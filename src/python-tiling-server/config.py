"""
Configuration module for the FastAPI Tiling Server
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", "8000"))
    
    # Backend API Configuration
    backend_base_url: str = os.getenv("BACKEND_BASE_URL", "http://localhost:8080")
    
    # Logging Configuration
    log_level: str = "INFO"
    
    # Cache Configuration
    cache_ttl: int = 300  # 5 minutes
    cache_max_size: int = 1000
    
    # Tile Server Configuration
    default_tile_size: int = 256
    zoom_extra_levels: int = 0
    max_tile_size: int = 512
    
    # Development/Production Mode
    environment: str = "development"
    
    # CORS Configuration
    allowed_origins: List[str] = ["*"]  # Configure for production
    
    # Performance Settings
    workers: int = 4
    max_concurrent_requests: int = 100
    
    # Timeouts (seconds)
    metadata_timeout: int = 300  # wait longer for backend /info (300s)
    
    # Security Settings
    api_key_header: str = "X-API-Key"
    require_auth: bool = False
    
    # Google Cloud Storage (if needed for direct access)
    gcs_bucket_name: Optional[str] = None
    gcs_project_id: Optional[str] = None
    gcs_keyfile_path: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()

# Environment-specific configurations
def get_settings() -> Settings:
    """Get application settings"""
    return settings

def is_development() -> bool:
    """Check if running in development mode"""
    return settings.environment.lower() == "development"

def is_production() -> bool:
    """Check if running in production mode"""
    return settings.environment.lower() == "production" 