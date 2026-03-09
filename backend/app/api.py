from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel as PydanticBaseModel
import os
import json
from openai import OpenAI
from jose import jwt, JWTError
from dotenv import load_dotenv

# .env 로드
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

from app.database import get_db
from app import models, schemas

router = APIRouter()

# OpenAI Client
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        return None
    return OpenAI(api_key=api_key)

# JWT Secret (NextAuth와 공유 - 직접 서명)
SECRET_KEY = os.getenv("NEXTAUTH_SECRET", "yoursecret")
ALGORITHM = "HS256"

def create_backend_token(email: str, name: str = None, picture: str = None, provider: str = "social") -> str:
    """백엔드가 직접 서명한 JWT 토큰 생성 (python-jose 사용)"""
    from datetime import datetime, timedelta
    payload = {
        "email": email,
        "name": name,
        "picture": picture,
        "provider": provider,
        "exp": datetime.utcnow() + timedelta(days=30),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_id(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    # 디버깅: 받은 헤더 로그 확인
    print(f"DEBUG: Received Authorization Header: {authorization}")
    
    # 1. 토큰이 없는 경우 - 보안을 위해 예외 발생
    if not authorization:
        print("DEBUG: Authorization header is missing")
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    
    try:
        # "Bearer <token>" 형식 처리
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            print(f"DEBUG: Invalid authorization format: {parts}")
            raise HTTPException(status_code=401, detail="잘못된 인증 형식입니다.")
            
        token = parts[1]
        
        # NextAuth JWT 디코드 (시크릿 검증 필수)
        try:
            # 디버깅: 시크릿 키 로드 확인
            actual_secret = os.getenv("NEXTAUTH_SECRET", "yoursecret")
            print(f"DEBUG: SECRET_KEY from env - Length: {len(actual_secret)}, Prefix: {actual_secret[:3]}...")
            
            # 먼저 검증 없이 디코딩해서 구조 확인 (디버깅용)
            try:
                unverified = jwt.get_unverified_claims(token)
                print(f"DEBUG: Unverified Payload: {unverified}")
            except Exception as e:
                print(f"DEBUG: Failed to read unverified claims: {e}")

            # NextAuth 토큰에는 aud(audience)가 포함되어 있을 수 있으므로 verify_aud=False로 유연하게 처리
            # 만약 실패하면 기본값(yoursecret)으로도 한번 더 시도 (환경변수 로딩 문제 확인용)
            try:
                payload = jwt.decode(token, actual_secret, algorithms=[ALGORITHM], options={"verify_aud": False})
            except JWTError:
                if actual_secret != "yoursecret":
                    print("DEBUG: Retry with default 'yoursecret'...")
                    payload = jwt.decode(token, "yoursecret", algorithms=[ALGORITHM], options={"verify_aud": False})
                else:
                    raise

            print(f"DEBUG: JWT Decoded successfully. Email: {payload.get('email')}")
        except JWTError as e:
            print(f"DEBUG: JWT Verification failed: {e}")
            raise HTTPException(status_code=401, detail=f"유효하지 않은 토큰입니다: {str(e)}")
            
        email = payload.get("email")
        name = payload.get("name")
        picture = payload.get("picture") or payload.get("image")
        provider = payload.get("provider", "social")
        
        if not email:
            print("DEBUG: Email missing in token payload")
            raise HTTPException(status_code=401, detail="토큰에 이메일 정보가 없습니다.")
            
        # DB에서 사용자 확인 및 자동 생성 (Sync)
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"DEBUG: Creating new user for email: {email}")
            user = models.User(
                email=email,
                name=name,
                profile_image=picture,
                provider=provider
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # 정보 업데이트
            update_needed = False
            if name and user.name != name:
                user.name = name
                update_needed = True
            if picture and user.profile_image != picture:
                user.profile_image = picture
                update_needed = True
            if update_needed:
                db.commit()
            
        return user.id
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"DEBUG: Auth error: {e}")
        raise HTTPException(status_code=401, detail="인증 처리 중 오류가 발생했습니다.")

@router.get("/status")
async def get_status():
    return {"status": "Analysis service is online"}

# --- 소셜 로그인 → 백엔드 JWT 발급 ---
class SocialLoginRequest(PydanticBaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    provider: str = "google"

@router.post("/auth/token")
def issue_backend_token(body: SocialLoginRequest, db: Session = Depends(get_db)):
    """구글 등 소셜 로그인 후, 백엔드가 직접 서명한 JWT를 발급합니다."""
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user:
        user = models.User(
            email=body.email,
            name=body.name,
            profile_image=body.picture,
            provider=body.provider,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        update_needed = False
        if body.name and user.name != body.name:
            user.name = body.name; update_needed = True
        if body.picture and user.profile_image != body.picture:
            user.profile_image = body.picture; update_needed = True
        if update_needed:
            db.commit()

    token = create_backend_token(
        email=user.email,
        name=user.name,
        picture=user.profile_image,
        provider=user.provider or "social"
    )
    return {"token": token, "user_id": user.id}

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
async def speech_to_text(file: UploadFile = File(...), user_id: int = Depends(get_current_user_id)):
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
        mood_counts=diary.mood_counts,
        color_code=diary.color_code,
        color_name=diary.color_name,
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
    query = db.query(models.Diary).options(joinedload(models.Diary.analysis)).filter(models.Diary.user_id == user_id)
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
    # 사용자의 일기와 연결된 감정 분석 결과만 조회
    analyses = db.query(models.EmotionAnalysis).join(models.Diary).filter(
        models.Diary.user_id == user_id
    ).order_by(models.EmotionAnalysis.created_at.desc()).all()
    
    if not analyses:
        return {"emotion_distribution": {}, "total_count": 0, "recent_positive_points": []}

    total_count = len(analyses)
    emotion_totals = {}
    for analysis in analyses:
        if not analysis.emotions: continue
        for emotion, score in analysis.emotions.items():
            # 감정 키값 표준화 (한글/영어 혼용 대응)
            emotion_totals[emotion] = emotion_totals.get(emotion, 0) + score
            
    return {
        "emotion_distribution": {k: v / total_count for k, v in emotion_totals.items()},
        "total_count": total_count,
        "recent_positive_points": [a.positive_points for a in analyses[:3] if a.positive_points]
    }

# --- 이미지 업로드 ---
@router.post("/upload")
async def upload_image(file: UploadFile = File(...), diary_id: int = None, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    import shutil, uuid
    # Mac/Local 로컬 개발 환경용 업로드 경로 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base_dir, "uploads")
    
    try:
        os.makedirs(upload_dir, exist_ok=True)
    except Exception as e:
        print(f"Directory creation error: {e}")
        # 권한 문제 대비 대체 경로 (현재 작업 디렉토리 하위)
        upload_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(upload_dir, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    
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

# --- AI Agent Chat API ---
@router.post("/tts")
async def text_to_speech(body: schemas.TTSRequest, user_id: int = Depends(get_current_user_id)):
    current_client = get_openai_client()
    if not current_client:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    try:
        response = current_client.audio.speech.create(
            model="tts-1",
            voice="alloy", # 따뜻한 목소리
            input=body.text
        )
        # 바이너리 데이터를 직접 반환 (프론트에서 활용)
        from fastapi.responses import Response
        return Response(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggest-title")
async def suggest_title(body: dict, user_id: int = Depends(get_current_user_id)):
    """일기 내용을 바탕으로 AI 제목 3개를 추천합니다."""
    current_client = get_openai_client()
    content = body.get("content", "")
    if not content.strip():
        raise HTTPException(status_code=400, detail="내용이 없습니다.")
    if not current_client:
        return {"titles": ["오늘의 이야기", "나의 하루", "소중한 순간"]}
    
    try:
        response = current_client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": (
                    f"아래 일기 내용을 읽고, 어울리는 감성적이고 짧은 제목 3개를 추천해줘.\n"
                    f"JSON 형식으로: {{\"titles\": [\"제목1\", \"제목2\", \"제목3\"]}}\n"
                    f"각 제목은 15자 이내. 반드시 한국어.\n\n일기 내용:\n{content[:1000]}"
                )
            }],
            response_format={"type": "json_object"},
            max_tokens=200,
        )
        import json as _json
        result = _json.loads(response.choices[0].message.content)
        return {"titles": result.get("titles", ["오늘의 기록"])}
    except Exception as e:
        return {"titles": ["오늘의 이야기", "나의 하루", "소중한 순간"]}

@router.post("/tarot-image")
async def generate_tarot_image(body: dict, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """DALL-E 3로 타로 카드 이미지를 생성합니다."""
    current_client = get_openai_client()
    if not current_client:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    card_number = body.get("card_number", 1)
    position = body.get("position", "현재")  # 과거, 현재, 미래
    theme = body.get("theme", "신비로운 달빛")  # 카드 테마
    
    theme_prompts = {
        "신비로운 달빛": "mystical moonlight, dark blue and silver, ethereal glowing moon",
        "불꽃": "fire and flame, vivid red and orange, dramatic energy",
        "자연": "lush nature, green forest, peaceful earth elements",
        "우주": "cosmic space, nebula colors, stars and galaxies",
    }
    theme_detail = theme_prompts.get(theme, theme_prompts["신비로운 달빛"])
    
    prompt = (
        f"A beautiful tarot card illustration, card number {card_number}, representing '{position}' position, "
        f"themed with {theme_detail}. "
        f"Ornate decorative border, mystical symbols, high quality digital art, vertical card format, "
        f"no text, no words, artistic and symbolic."
    )
    
    try:
        response = current_client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1
        )
        image_url = response.data[0].url
        return {"image_url": image_url, "card_number": card_number, "position": position}
    except Exception as e:
        print(f"DALL-E Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai-chat/archive", response_model=List[schemas.AIChatArchiveResponse])
def get_ai_chat_archive(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    # 운세나 타로 기록이 있는 페이지만 날짜 역순으로 조회
    chats = db.query(models.AIChat).filter(
        models.AIChat.user_id == user_id,
        (models.AIChat.fortune != None) | (models.AIChat.tarot != None)
    ).order_by(models.AIChat.date.desc()).all()
    return chats

@router.post("/ai-chat", response_model=schemas.AIChatResponse)
def post_ai_chat(body: schemas.AIChatCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    from datetime import datetime, date
    today = date.today().isoformat()
    
    # 1. 기존의 오늘 대화방 조회
    chat = db.query(models.AIChat).filter(
        models.AIChat.user_id == user_id,
        models.AIChat.date == today
    ).first()
    
    if not chat:
        chat = models.AIChat(user_id=user_id, date=today, messages=[])
        db.add(chat)
        db.commit()
        db.refresh(chat)
    
    current_messages = list(chat.messages) if chat.messages else []
    current_messages.append({"role": "user", "content": body.message})
    
    current_client = get_openai_client()
    
    # 2. 오늘의 일기 데이터가 있다면 컨텍스트로 추가 (프롬프트 보강)
    diary = db.query(models.Diary).filter(
        models.Diary.user_id == user_id,
        models.Diary.created_at >= today + " 00:00:00",
        models.Diary.created_at <= today + " 23:59:59"
    ).first()
    
    diary_context = ""
    if diary and diary.analysis:
        try:
            # db.query로 가져온 analysis는 이미 모델 인스턴스일 수 있으므로 처리
            summary = diary.analysis.summary if hasattr(diary.analysis, 'summary') else ""
            if summary:
                diary_context = f"\n\n[참고: 오늘 사용자의 일기 요약: '{summary}']\n이 내용을 바탕으로 사용자에게 오늘 하루 고생했다는 공감이나 관련 언급을 자연스럽게 섞어서 다정하게 대화해줘."
        except Exception as e:
            print(f"Diary context error: {e}")

    if not current_client:
        # API 키가 없는 경우 더미 응답
        reply = "안녕하세요! 지금은 테스트 모드예요. OpenAI API 키를 설정하면 더 똑똑한 대화와 운세, 타로를 봐드릴 수 있어요! ✨"
        current_messages.append({"role": "assistant", "content": reply})
        chat.messages = current_messages
        chat.mood = "NORMAL" # 기본 무드 설정
        db.commit()
        return chat
        
    try:
        # 2. 오늘의 운세 요청 시 페르소나 간섭을 원천 차단
        is_fortune_request = body.message and "오늘의 운세" in body.message
        
        import random
        random_themes = ["몽환적인 숲", "미래 지향적 사이버펑크", "따뜻한 코타츠 속", "영국식 정원", "신비로운 우주 정거장", "고전적인 타로 카페", "평화로운 시골 마을", "활기찬 뉴욕 거리"]
        random_style = ["우아하고 품격 있는", "귀엽고 발랄한", "진중하고 신중한", "엉뚱하고 재미있는", "다정하고 따뜻한"]
        selected_theme = random.choice(random_themes)
        selected_style = random.choice(random_style)

        if is_fortune_request:
            # 운세 전용 시스템 프롬프트 (안사말, 마스코트 설명 일절 금지)
            system_content = (
                f"[SYSTEM_COMMAND_ID: {datetime.now().strftime('%Y%m%d%H%M%S')}]\n"
                "너는 운세 데이터 생성 엔진이야. 인사말이나 안내 문구를 모두 배제해.\n"
                "오직 아래의 세 가지 항목만 'reply' 필드에 담아. 다른 설명은 절대 추가하지 마.\n\n"
                "### 필수 출력 항목 (반드시 이 명칭을 사용하고 줄바꿈으로 구분할 것):\n"
                "- 행운의 색 : [구체적인 색 이름]\n"
                "- 행운의 장소 : [장소 묘사]\n"
                "- 행운의 한마디 : [오늘의 조언]\n\n"
                "### 주의사항:\n"
                f"1. 테마: {selected_theme}, 스타일: {selected_style}를 반영하여 조언을 작성해.\n"
                "2. '안녕하세요', '물론이죠', '보안 코드' 등 어떤 부가 텍스트도 reply에 포함하지 마.\n"
                "3. 오직 요청받은 운세 데이터만 전송해.\n"
            )
        else:
            # 일반 대화 및 타로용 시스템 프롬프트
            system_content = (
                "너는 'HaruLog'라는 일기 앱의 마스코트인 따뜻한 구름 AI야. "
                "사용자의 일상 대화와 고민 상담을 해줘. 친절하고 다정하며 이모지를 사용해줘.\n"
                "1. 일상 대화: 사용자의 말에 공감하고 따뜻한 위로를 건네줘." + diary_context + "\n"
                "2. 타로 점보기: 선택한 카드의 의미와 조언을 신비롭고 명확하게 전달해줘."
            )

        system_msg = {
            "role": "system", 
            "content": system_content + "\n\n**[응답 형식]**: 반드시 json 형식으로만 답해줘. 필드는 'reply' (답변 내용)와 'mood' (NORMAL, HAPPY, SAD, COOL, THINKING) 2가지야."
        }
        
        # 운세 요청일 때는 이전 대화 기록을 과감히 생략
        final_history = current_messages[-10:] if not is_fortune_request else []

        response = current_client.chat.completions.create(
            model="gpt-4o",
            messages=[system_msg] + final_history,
            response_format={ "type": "json_object" },
            max_tokens=800,
            temperature=1.2 if is_fortune_request else 1.0 # 온도를 다시 1.2로 상향하여 창의성 확보
        )
        
        raw_content = response.choices[0].message.content
        try:
            result = json.loads(raw_content)
            reply = result.get("reply", raw_content)
            mood_val = result.get("mood", "NORMAL").upper()
        except:
            reply = raw_content
            mood_val = "NORMAL"

        if mood_val not in ["NORMAL", "HAPPY", "SAD", "COOL", "THINKING"]:
            mood_val = "NORMAL"
        chat.mood = mood_val
        
        current_messages.append({"role": "assistant", "content": reply})
        chat.messages = current_messages
        
        # 운세 또는 타로 결과 저장
        if "오늘의 운세" in body.message:
            chat.fortune = reply
        elif "타로" in body.message:
            chat.tarot = reply
            import re
            # 3장 스프레드: "과거 3번, 현재 1번, 미래 5번" 형태 파싱
            spread_match = re.search(r"과거[:\s]*(\d+)번.*현재[:\s]*(\d+)번.*미래[:\s]*(\d+)번", body.message)
            if spread_match:
                cards = [int(spread_match.group(1)), int(spread_match.group(2)), int(spread_match.group(3))]
                chat.selected_cards = cards
                chat.selected_card = cards[1]  # 현재 카드를 대표 카드로
            else:
                # 단일 카드 파싱 (기존 방식)
                single_match = re.search(r"타로 카드 (\d+)번", body.message)
                if single_match:
                    chat.selected_card = int(single_match.group(1))
            
        db.commit()
        db.refresh(chat)
        return chat
    except Exception as e:
        import traceback
        print(f"AI Chat error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI 대화 중 오류가 발생했습니다: {str(e)}")

@router.get("/ai-chat/{date_str}", response_model=schemas.AIChatResponse)
def get_ai_chat(date_str: str, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    chat = db.query(models.AIChat).filter(
        models.AIChat.user_id == user_id,
        models.AIChat.date == date_str
    ).first()
    if not chat:
        return {"messages": [], "date": date_str}
    return chat
