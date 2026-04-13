from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from core.database import Base
from passlib.context import CryptContext

# FIX: Added Passlib CryptContext for secure password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRole(str, enum.Enum):
    GUEST = "guest"
    RESEARCHER = "researcher"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    
    # FIX: Changed 'hashed_password' to store hashed passwords securely using Passlib
    hashed_password = Column(String, nullable=True)
    
    role = Column(Enum(UserRole), default=UserRole.RESEARCHER, nullable=False)
    is_active = Column(Boolean, default=True)
    google_id = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # FIX: Added method to hash password using Passlib
    def set_password(self, password: str):
        self.hashed_password = pwd_context.hash(password)

    # FIX: Added method to verify password using Passlib
    def verify_password(self, password: str) -> bool:
        return pwd_context.verify(password, self.hashed_password)