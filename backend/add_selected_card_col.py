from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# .env 로드
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://jayun@localhost:5432/mindtrace")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Adding selected_card column to ai_chats table...")
        try:
            conn.execute(text("ALTER TABLE ai_chats ADD COLUMN selected_card INTEGER;"))
            print("Successfully added selected_card column.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column selected_card already exists.")
            else:
                print(f"Error: {e}")
        conn.commit()

if __name__ == "__main__":
    migrate()
