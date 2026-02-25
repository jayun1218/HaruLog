from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    diaries = relationship("Diary", back_populates="owner")

class Diary(Base):
    __tablename__ = "diaries"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    raw_audio_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="diaries")
    analysis = relationship("EmotionAnalysis", back_populates="diary", uselist=False)

class EmotionAnalysis(Base):
    __tablename__ = "emotion_analyses"

    id = Column(Integer, primary_key=True, index=True)
    diary_id = Column(Integer, ForeignKey("diaries.id"))
    summary = Column(Text)
    emotions = Column(JSON)  # e.g., {"happiness": 0.8, "sadness": 0.1}
    positive_points = Column(JSON)  # List of 3 good things
    improvement_points = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    diary = relationship("Diary", back_populates="analysis")
