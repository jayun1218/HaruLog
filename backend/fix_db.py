from sqlalchemy import create_engine, text
import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://jayun@localhost:5432/mindtrace")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def fix():
    with engine.connect() as conn:
        print("Checking ai_chats table columns...")
        # Check if columns exist (PostgreSQL specific way or just try catch)
        try:
            conn.execute(text("ALTER TABLE ai_chats ADD COLUMN fortune TEXT;"))
            print("Added fortune column.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Fortune column already exists.")
            else:
                print(f"Error adding fortune: {e}")
            
        try:
            conn.execute(text("ALTER TABLE ai_chats ADD COLUMN tarot TEXT;"))
            print("Added tarot column.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Tarot column already exists.")
            else:
                print(f"Error adding tarot: {e}")
        
        conn.commit()
    print("Database fix completed.")

if __name__ == "__main__":
    fix()
