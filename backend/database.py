from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from typing import List
import os

# Ścieżka do bazy danych
DATABASE_DIR = "/app/data"
DATABASE_URL = f"sqlite:///{DATABASE_DIR}/travian.db"

# Upewnij się, że folder data istnieje
os.makedirs(DATABASE_DIR, exist_ok=True)

# SQLAlchemy setup
Base = declarative_base()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Models
class DBSnapshot(Base):
    __tablename__ = "snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    created_at = Column(String)
    villages_count = Column(Integer)
    
    villages = relationship("DBVillage", back_populates="snapshot", cascade="all, delete-orphan")

class DBVillage(Base):
    __tablename__ = "villages"
    
    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("snapshots.id"))
    
    village_id = Column(Integer)
    x = Column(Integer)
    y = Column(Integer)
    tribe = Column(Integer)
    player_id = Column(Integer)
    village_name = Column(String)
    owner_id = Column(Integer)
    owner_name = Column(String, index=True)
    alliance_id = Column(Integer)
    alliance_tag = Column(String)
    population = Column(Integer)
    region = Column(String)
    is_capital = Column(Boolean)
    is_city = Column(Boolean)
    is_harbor = Column(Boolean)
    wonder = Column(Integer)
    
    snapshot = relationship("DBSnapshot", back_populates="villages")

class DBInactiveList(Base):
    """Zapisana lista nieaktywnych graczy"""
    __tablename__ = "inactive_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)  # Nazwa listy nadana przez użytkownika
    created_at = Column(String)
    old_snapshot_name = Column(String)  # Starszy snapshot
    new_snapshot_name = Column(String)  # Nowszy snapshot
    center_x = Column(Integer, nullable=True)  # Środek promienia (opcjonalny)
    center_y = Column(Integer, nullable=True)
    radius = Column(Float, nullable=True)  # Promień wyszukiwania
    data = Column(Text)  # JSON z wynikami analizy

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
