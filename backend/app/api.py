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
    from datetime import datetime, timezone
    custom_dt = None
    if diary.date:
        try:
            custom_dt = datetime.strptime(diary.date, "%Y-%m-%d").replace(
                hour=12, minute=0, second=0, tzinfo=timezone.utc
            )
        except ValueError:
            custom_dt = None

    db_diary = models.Diary(
        title=diary.title,
        content=diary.content,
        category_id=diary.category_id,
        mood=diary.mood,
        user_id=user_id
    )
    if custom_dt:
        db_diary.created_at = custom_dt
    db.add(db_diary)
    db.commit()
    db.refresh(db_diary)

    current_client = get_openai_client()
    if current_client:
        try:
            response = current_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "너는 사용자의 일기를 분석하는 AI 카운슬러야. 응답 본문은 반드시 한국어로 작성하되, JSON의 키값은 반드시 다음 영문명을 사용해: summary, emotions, keywords, card_message, positive_points (잘한 일 3가지 리스트), improvement_points (개선점 문자열). emotions 객체의 키값은 반드시 [기쁨, 슬픔, 불안, 분노, 평온] 중 하나를 사용해. JSON 형식으로만 응답해."},
                    {"role": "user", "content": f"일기 제목: {diary.title}\n내용: {diary.content}"}
                ],
                response_format={ "type": "json_object" }
            )
            
            analysis_data = json.loads(response.choices[0].message.content)
            db_analysis = models.EmotionAnalysis(
                diary_id=db_diary.id,
                summary=analysis_data.get("summary", ""),
                emotions=analysis_data.get("emotions", {}),
                keywords=analysis_data.get("keywords", []),
                card_message=analysis_data.get("card_message", ""),
                positive_points=analysis_data.get("positive_points", []),
                improvement_points=analysis_data.get("improvement_points", "")
            )
            db.add(db_analysis)
            db.commit()
            db.refresh(db_diary)  # 분석 결과를 포함하여 다시 읽기
        except Exception as e:
            print(f"AI Analysis failed: {e}")

    return db_diary

@router.get("/diaries", response_model=List[schemas.Diary])
def get_diaries(
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    query = db.query(models.Diary).filter(models.Diary.user_id == user_id)
    if q:
        query = query.filter(
            models.Diary.title.ilike(f"%{q}%") | models.Diary.content.ilike(f"%{q}%")
        )
    if category_id:
        query = query.filter(models.Diary.category_id == category_id)
    return query.order_by(models.Diary.is_pinned.desc(), models.Diary.created_at.desc()).all()

@router.patch("/diaries/{diary_id}/pin")
def toggle_pin(diary_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    diary = db.query(models.Diary).filter(
        models.Diary.id == diary_id,
        models.Diary.user_id == user_id
    ).first()
    if not diary:
        raise HTTPException(status_code=404, detail="Diary not found")
    diary.is_pinned = not diary.is_pinned
    db.commit()
    db.refresh(diary)
    return {"is_pinned": diary.is_pinned}

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

# --- 이미지 업로드 ---
@router.post("/upload")
async def upload_image(file: UploadFile = File(...), diary_id: int = None, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    import shutil, uuid
    upload_dir = "/app/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"{upload_dir}/{filename}"
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    image_url = f"/uploads/{filename}"

    if diary_id:
        diary = db.query(models.Diary).filter(models.Diary.id == diary_id, models.Diary.user_id == user_id).first()
        if diary:
            diary.image_url = image_url
            db.commit()
    return {"image_url": image_url}

# --- AI 대화형 일기 ---
class ChatMessage(schemas.BaseModel):
    messages: List[dict]

@router.post("/diaries/{diary_id}/chat")
def diary_chat(diary_id: int, body: ChatMessage, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    diary = db.query(models.Diary).filter(models.Diary.id == diary_id, models.Diary.user_id == user_id).first()
    if not diary:
        raise HTTPException(status_code=404, detail="Diary not found")
    current_client = get_openai_client()
    if not current_client:
        return {"reply": "OpenAI API 키가 필요해요. 잠시 후 다시 시도해주세요."}
    try:
        system_msg = {"role": "system", "content": f"너는 사용자의 일기를 읽고 공감하며 대화하는 따뜻한 AI 카운슬러야. 반드시 한국어로만 답해. 일기 내용:\n제목: {diary.title}\n내용: {diary.content}"}
        response = current_client.chat.completions.create(
            model="gpt-4o",
            messages=[system_msg] + body.messages,
            max_tokens=300
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 월간 AI 리포트 ---
@router.get("/report/monthly")
def monthly_report(year: int, month: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    from datetime import date
    start = f"{year}-{str(month).zfill(2)}-01"
    end_day = (date(year, month % 12 + 1, 1) if month < 12 else date(year + 1, 1, 1)).isoformat()
    diaries = db.query(models.Diary).filter(
        models.Diary.user_id == user_id,
        models.Diary.created_at >= start,
        models.Diary.created_at < end_day
    ).all()
    if not diaries:
        return {"report": "이번 달 일기가 없어요. 소중한 하루하루를 기록해보세요!"}
    current_client = get_openai_client()
    if not current_client:
        return {"report": f"이번 달 {len(diaries)}개의 일기를 작성하셨어요. OpenAI API 연동 시 상세 리포트를 제공해드릴게요."}
    diary_summary = "\n\n".join([f"[{d.created_at.strftime('%m/%d')}] {d.title}: {d.content[:100]}" for d in diaries])
    try:
        response = current_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "너는 사용자의 한 달 일기를 분석하는 AI 카운슬러야. 반드시 한국어로만 답해. 이번 달의 감정 흐름, 주요 사건, 칭찬할 점, 내달의 제안을 따뜻하게 요약해줘. 400자 이내로."},
                {"role": "user", "content": f"{year}년 {month}월 일기:\n{diary_summary}"}
            ],
            max_tokens=500
        )
        return {"report": response.choices[0].message.content, "diary_count": len(diaries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 일기 잠금 / 해제 ---
class LockRequest(schemas.BaseModel):
    pin: str

@router.post("/diaries/{diary_id}/lock")
def lock_diary(diary_id: int, body: LockRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    import hashlib
    diary = db.query(models.Diary).filter(models.Diary.id == diary_id, models.Diary.user_id == user_id).first()
    if not diary:
        raise HTTPException(status_code=404, detail="Diary not found")
    diary.is_locked = True
    diary.pin_hash = hashlib.sha256(body.pin.encode()).hexdigest()
    db.commit()
    return {"is_locked": True}

@router.post("/diaries/{diary_id}/unlock")
def unlock_diary(diary_id: int, body: LockRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    import hashlib
    diary = db.query(models.Diary).filter(models.Diary.id == diary_id, models.Diary.user_id == user_id).first()
    if not diary:
        raise HTTPException(status_code=404, detail="Diary not found")
    if diary.pin_hash != hashlib.sha256(body.pin.encode()).hexdigest():
        raise HTTPException(status_code=403, detail="PIN이 올바르지 않습니다")
    diary.is_locked = False
    diary.pin_hash = None
    db.commit()
    return {"is_locked": False}
