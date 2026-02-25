from app.database import engine, Base
from app.models import User, Diary, EmotionAnalysis

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Database initialized!")
