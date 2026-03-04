from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
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
async def text_to_speech(body: schemas.TTSRequest):
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
    from datetime import date
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
        system_msg = {
            "role": "system", 
            "content": (
                "너는 'HaruLog'라는 일기 앱의 마스코트인 따뜻한 구름 AI야. "
                "사용자의 일상 대화, 고민 상담뿐만 아니라 오늘의 운세나 타로 점을 봐주기도 해. "
                "항상 친절하고 다정하며, 이모지를 적절히 사용하여 귀엽게 말해줘.\n\n"
                "1. 일상 대화: 사용자의 말에 공감하고 따뜻한 위로를 건네줘." + diary_context + "\n"
                "2. 오늘의 운세: 반드시 아래 형식을 지키고 각 항목 뒤에 줄바꿈(\\n)을 넣어줘. '물론이지' 같은 서두는 절대 금지야.\n"
                "오늘의 운세 쪽지\n"
                "행운의 컬러 : [컬러]\n"
                "행운의 장소 : [장소]\n"
                "오늘의 메시지 : [메시지]\n"
                "3. 타로 점보기: 선택한 카드의 의미와 조언을 신비롭고 명확하게 전달하며, 가독성을 위해 줄바꿈을 자주 사용해줘.\n\n"
                "**[중요] 응답 형식**: 반드시 json 형식으로만 답해줘. 필드는 'reply' (답변 내용)와 'mood' (현재 감정 상태) 두 가지야.\n"
                "감정 상태(mood)는 다음 중 하나만 선택해: NORMAL, HAPPY, SAD, COOL, THINKING.\n"
                "진심을 담아 따뜻하게 답변하고, 반드시 한국어로만 답해."
            )
        }
        
        response = current_client.chat.completions.create(
            model="gpt-4o",
            messages=[system_msg] + current_messages[-10:], # 최근 10개 메시지만 문맥으로 전달
            response_format={ "type": "json_object" },
            max_tokens=800
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
        elif "타로 카드" in body.message:
            chat.tarot = reply
            # 메시지에서 카드 번호 추출 (예: "타로 카드 3번을 골랐어")
            import re
            match = re.search(r"타로 카드 (\d+)번", body.message)
            if match:
                chat.selected_card = int(match.group(1))
            
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
