from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router as api_router
from app.database import engine, Base
import app.models  # 모델을 임포트하여 Base가 모든 테이블을 인식하도록 함

Base.metadata.create_all(bind=engine)

# 기존 DB에 새 컬럼 자동 추가 (IF NOT EXISTS)
def run_migrations():
    migrations = [
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS mood VARCHAR",
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE",
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS image_url VARCHAR",
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE",
        "ALTER TABLE diaries ADD COLUMN IF NOT EXISTS pin_hash VARCHAR",
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
