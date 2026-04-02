from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from core.config import settings

DATABASE_URL = (
    settings.DATABASE_URL
    .replace("postgresql://", "postgresql+asyncpg://")
    .replace("?sslmode=require", "")
    .replace("&channel_binding=require", "")
    .replace("?channel_binding=require", "")
)

engine = create_async_engine(DATABASE_URL, echo=True, connect_args={"ssl": True})

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session          
            await session.commit() 
        except Exception:
            await session.rollback() 
            raise