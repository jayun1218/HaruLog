from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import router as api_router
from app.database import engine, Base
import app.models
import os
from dotenv import load_dotenv

# .env 파일 로드 (루트 디렉토리)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

Base.metadata.create_all(bind=engine)

# 기존 DB에 새 컬럼 자동 추가 (IF NOT EXISTS)
def run_migrations():
    migrations = [
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS mood VARCHAR",
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE",
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS image_url VARCHAR",
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE",
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS pin_hash VARCHAR",
        "ALTER TABLE emotion_analysis ADD COLUMN IF NOT EXISTS keywords JSON",
        "ALTER TABLE emotion_analysis ADD COLUMN IF NOT EXISTS card_message TEXT",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(__import__("sqlalchemy").text(sql))
                conn.commit()
            except Exception as e:
                print(f"Migration skip: {e}")

run_migrations()

app = FastAPI(title="MindTrace API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to MindTrace API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(api_router, prefix="/api")

# 업로드 이미지 정적 파일 서빙
upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
