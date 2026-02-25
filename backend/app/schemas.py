from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict

# Category Schemas
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# EmotionAnalysis Schemas
class EmotionAnalysisBase(BaseModel):
    summary: str
    emotions: Dict[str, float]
    positive_points: List[str]
    improvement_points: str

class EmotionAnalysis(EmotionAnalysisBase):
    id: int
    diary_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Diary Schemas
class DiaryBase(BaseModel):
    title: str
    content: str
    category_id: Optional[int] = None

class DiaryCreate(DiaryBase):
    pass

class Diary(DiaryBase):
    id: int
    user_id: int
    created_at: datetime
    raw_audio_url: Optional[str] = None
    analysis: Optional[EmotionAnalysis] = None

    class Config:
        from_attributes = True

# STT Schemas
class STTResponse(BaseModel):
    text: str

# Token Schemas (for later Auth if needed)
class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
