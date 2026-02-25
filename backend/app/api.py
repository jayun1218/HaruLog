from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json
from openai import OpenAI
from jose import jwt, JWTError

from app.database import get_db
from app import models, schemas

router = APIRouter()

# OpenAI Client
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        return None
    return OpenAI(api_key=api_key)

# JWT Secret (NextAuth와 공유)
SECRET_KEY = os.getenv("NEXTAUTH_SECRET", "yoursecret")
ALGORITHM = "HS256"

def get_current_user_id(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    # 1. 토큰이 없는 경우 (개발/테스트용) - 기본 사용자 'guest' 보장
    if not authorization:
        user = db.query(models.User).filter(models.User.id == 1).first()
        if not user:
            user = models.User(id=1, email="guest@harulog.com")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user.id
    
    try:
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_signature": False})
        except:
            return 1
            
        email = payload.get("email") or payload.get("sub")
        if not email:
            return 1
            
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            user = models.User(email=email)
            db.add(user)
            db.commit()
            db.refresh(user)
        return user.id
    except Exception as e:
        print(f"Auth error: {e}")
        return 1

@router.get("/status")
async def get_status():
    return {"status": "Analysis service is online"}

# --- Category API ---
@router.get("/categories", response_model=List[schemas.Category])
def get_categories(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return db.query(models.Category).filter(models.Category.user_id == user_id).all()

@router.post("/categories", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    db_category = models.Category(name=category.name, user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    db_category = db.query(models.Category).filter(
        models.Category.id == category_id, 
        models.Category.user_id == user_id
    ).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # 이 카테고리에 속한 일기들 조회
    diaries = db.query(models.Diary).filter(
        models.Diary.category_id == category_id,
        models.Diary.user_id == user_id
    ).all()
    
    # 일기별로 감정 분석 결과 먼저 삭제 (외래키 제약 조건)
    for diary in diaries:
        db.query(models.EmotionAnalysis).filter(
            models.EmotionAnalysis.diary_id == diary.id
        ).delete()
        db.delete(diary)
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category and related diaries deleted", "deleted_diaries": len(diaries)}

# --- STT API ---
@router.post("/stt", response_model=schemas.STTResponse)
async def speech_to_text(file: UploadFile = File(...)):
    current_client = get_openai_client()
    if not current_client:
        return {"text": "음성 인식 테스트 결과입니다. (OpenAI API 키가 설정되지 않았습니다)"}
    
    try:
        temp_file = f"temp_{file.filename}"
        with open(temp_file, "wb") as buffer:
            buffer.write(await file.read())
        
        with open(temp_file, "rb") as audio_file:
            transcript = current_client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                language="ko"
            )
        
        os.remove(temp_file)
        return {"text": transcript.text}
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(status_code=500, detail=str(e))

# --- Diary API ---
@router.post("/diaries", response_model=schemas.Diary)
def create_diary(diary: schemas.DiaryCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    db_diary = models.Diary(
        title=diary.title,
        content=diary.content,
        category_id=diary.category_id,
        user_id=user_id
    )
    db.add(db_diary)
    db.commit()
    db.refresh(db_diary)

    current_client = get_openai_client()
    if current_client:
        try:
            response = current_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "너는 사용자의 일기를 분석하는 AI 카운슬러야. 반드시 한국어로만 응답해. 일기 내용을 2~3문장으로 요약하고, 감정(기쁨, 슬픔, 불안, 분노, 평온) 점수를 0~1 사이로 매기고, 오늘 잘한 일 3가지를 도출하고, 개선할 점을 제안해줘. 모든 텍스트 필드는 반드시 한국어로 작성해. JSON 형식으로만 응답해. 예시: {\"summary\": \"오늘 하루를 잘 마무리했다...\", \"emotions\": {\"기쁨\": 0.7, \"평온\": 0.5}, \"positive_points\": [\"꾸준히 공부했다\", \"친구에게 먼저 연락했다\", \"건강한 식사를 했다\"], \"improvement_points\": \"더 일찍 자는 습관을 길러보세요.\"}"},
                    {"role": "user", "content": f"일기 제목: {diary.title}\n내용: {diary.content}"}
                ],
                response_format={ "type": "json_object" }
            )
            
            analysis_data = json.loads(response.choices[0].message.content)
            db_analysis = models.EmotionAnalysis(
                diary_id=db_diary.id,
                summary=analysis_data.get("summary", ""),
                emotions=analysis_data.get("emotions", {}),
                positive_points=analysis_data.get("positive_points", []),
                improvement_points=analysis_data.get("improvement_points", "")
            )
            db.add(db_analysis)
            db.commit()
        except Exception as e:
            print(f"AI Analysis failed: {e}")

    return db_diary

@router.get("/diaries", response_model=List[schemas.Diary])
def get_diaries(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return db.query(models.Diary).filter(models.Diary.user_id == user_id).order_by(models.Diary.created_at.desc()).all()

@router.get("/statistics")
def get_statistics(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    analyses = db.query(models.EmotionAnalysis).join(models.Diary).filter(models.Diary.user_id == user_id).all()
    
    if not analyses:
        return {"emotion_distribution": {}, "total_count": 0}

    total_count = len(analyses)
    emotion_totals = {}
    for analysis in analyses:
        for emotion, score in analysis.emotions.items():
            emotion_totals[emotion] = emotion_totals.get(emotion, 0) + score
            
    return {
        "emotion_distribution": {k: v / total_count for k, v in emotion_totals.items()},
        "total_count": total_count,
        "recent_positive_points": [a.positive_points for a in analyses[-3:] if a.positive_points]
    }
