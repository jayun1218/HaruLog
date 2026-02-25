from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    diaries = relationship("Diary", back_populates="owner")
    categories = relationship("Category", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="categories")
    diaries = relationship("Diary", back_populates="category")

class Diary(Base):
    __tablename__ = "diaries"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    raw_audio_url = Column(String, nullable=True)
    mood = Column(String, nullable=True)      # 사용자 선택 기분 이모지 (ex: "😊")
    is_pinned = Column(Boolean, default=False)  # 즐겨찾기
    image_url = Column(String, nullable=True)    # 첨부 이미지
    is_locked = Column(Boolean, default=False)   # 잠금 여부
    pin_hash = Column(String, nullable=True)     # 잠금 PIN 해시
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="diaries")
    category = relationship("Category", back_populates="diaries")
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
