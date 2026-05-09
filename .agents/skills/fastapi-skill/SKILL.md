---
name: fastapi-skill
description: Production-tested patterns for FastAPI with Pydantic v2, SQLAlchemy 2.0 async, and JWT authentication.
---

# FastAPI Skill

Production-tested patterns for FastAPI with Pydantic v2, SQLAlchemy 2.0 async, and JWT authentication.

**Latest Versions** (verified January 2026):
- FastAPI: 0.128.0
- Pydantic: 2.11.7
- SQLAlchemy: 2.0.30
- Uvicorn: 0.35.0
- python-jose: 3.3.0

**Requirements**:
- Python 3.9+ (Python 3.8 support dropped in FastAPI 0.125.0)
- Pydantic v2.7.0+ (Pydantic v1 support completely removed in FastAPI 0.128.0)

---

## Quick Start

### Project Setup with uv

```bash
# Create project
uv init my_fastapi_project
cd my_fastapi_project

# Create a virtual environment and activate it
uv venv
source .venv/bin/activate

# Install core dependencies
uv pip install fastapi uvicorn pydantic pydantic-settings sqlalchemy asyncpg python-jose[cryptography] passlib[bcrypt]
```

## Project Structure

A scalable production-ready folder structure:

```text
├── app/
│   ├── main.py              # Application entry point
│   ├── core/
│   │   ├── config.py        # Pydantic v2 settings
│   │   └── security.py      # Password hashing and JWT
│   ├── api/
│   │   └── dependencies.py  # Reusable dependency injections
│   ├── models/              # SQLAlchemy 2.0 declarative models
│   ├── schemas/             # Pydantic v2 models (requests/responses)
│   ├── crud/                # Create, Read, Update, Delete operations
│   └── database.py          # SQLAlchemy async engine and session maker
└── pyproject.toml
```

## SQLAlchemy 2.0 Async Pattern

### Database Connection (`app/database.py`)

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

## Pydantic v2 Patterns

In Pydantic v2, `BaseSettings` has been moved to `pydantic-settings`. Model definitions use `model_config` instead of `Config`.

### Settings (`app/core/config.py`)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI App"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
```

### Schemas (`app/schemas/user.py`)

```python
from pydantic import BaseModel, EmailStr, ConfigDict

class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True) # Replaces orm_mode=True
```

## Authentication and Dependencies (`app/api/dependencies.py`)

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.config import settings
from jose import JWTError, jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Fetch user from db
    # user = await crud.user.get(db, id=int(user_id))
    # if user is None:
    #     raise credentials_exception
    # return user
    return {"user_id": user_id}
```
