from app.database import SessionLocal
from app import models
from app.api import get_openai_client
import json
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

def reanalyze():
    db = SessionLocal()
    diaries = db.query(models.Diary).all()
    client = get_openai_client()
    
    if not client:
        print("Error: OpenAI Client not initialized. Check API Key.")
        return

    for diary in diaries:
        # 이미 분석이 있는 경우 스킵
        if diary.analysis:
            print(f"Diary {diary.id} already has analysis. Skipping.")
            continue
            
        print(f"Analyzing Diary {diary.id}: {diary.title}...")
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "너는 사용자의 일기를 분석하는 AI 카운슬러야. 반드시 한국어로만 응답해. 일기 내용을 2~3문장으로 요약하고, 감정(기쁨, 슬픔, 불안, 분노, 평온) 점수를 0~1 사이로 매기고, 오늘 잘한 일 3가지를 도출하고, 개선할 점을 제안해줘. 추가로 일기의 핵심 키워드 3개를 리스트 형태로 추출하고, 사용자를 위한 따뜻한 한 줄 응원 메시지(card_message)를 작성해줘. 모든 텍스트 필드는 반드시 한국어로 작성해. JSON 형식으로만 응답해."},
                    {"role": "user", "content": f"일기 제목: {diary.title}\n내용: {diary.content}"}
                ],
                response_format={ "type": "json_object" }
            )
            
            analysis_data = json.loads(response.choices[0].message.content)
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
    reanalyze()
