from app.database import SessionLocal, engine
from app import models
from app.api import get_openai_client
from sqlalchemy import text
import json
import os
from dotenv import load_dotenv

# .env 파일 로드 (루트 디렉토리)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

def run_fix():
    db = SessionLocal()
    
    # 기존 분석 삭제
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM emotion_analyses"))
        conn.commit()
    print("Existing analyses cleared.")

    diaries = db.query(models.Diary).all()
    client = get_openai_client()
    
    if not client:
        print("Error: OpenAI Client not initialized.")
        return

    for diary in diaries:
        print(f"Analyzing Diary {diary.id}: {diary.title}...")
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "너는 사용자의 일기를 분석하는 AI 카운슬러야. 응답 본문은 반드시 한국어로 작성하되, JSON의 키값은 반드시 다음 영문명을 사용해: summary, emotions, keywords, card_message, positive_points (잘한 일 3가지 리스트), improvement_points (개선점 문자열). emotions 객체의 키값은 반드시 [기쁨, 슬픔, 불안, 분노, 평온] 중 하나를 사용해. JSON 형식으로만 응답해."},
                    {"role": "user", "content": f"일기 제목: {diary.title}\n내용: {diary.content}"}
                ],
                response_format={ "type": "json_object" }
            )
            
            content = response.choices[0].message.content
            print(f"AI Response for {diary.id}: {content}")
            analysis_data = json.loads(content)
            
            db_analysis = models.EmotionAnalysis(
                diary_id=diary.id,
                summary=analysis_data.get("summary", ""),
                emotions=analysis_data.get("emotions", {}),
                keywords=analysis_data.get("keywords", []),
                card_message=analysis_data.get("card_message", ""),
                positive_points=analysis_data.get("positive_points", []),
                improvement_points=analysis_data.get("improvement_points", "")
            )
            db.add(db_analysis)
            db.commit()
            print(f"Success: Analysis for Diary {diary.id} added.")
        except Exception as e:
            print(f"Failed to analyze Diary {diary.id}: {e}")
    
    db.close()

if __name__ == "__main__":
    run_fix()
