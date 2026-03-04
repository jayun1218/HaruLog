from sqlalchemy import create_engine, inspect, text
import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://jayun@localhost:5432/mindtrace")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
inspector = inspect(engine)

columns = inspector.get_columns('ai_chats')
column_names = [c['name'] for c in columns]

print(f"Columns in 'ai_chats': {column_names}")

if 'mood' not in column_names:
    print("Column 'mood' is MISSING! Adding it now...")
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE ai_chats ADD COLUMN mood VARCHAR"))
        conn.commit()
    print("Column 'mood' added successfully.")
else:
    print("Column 'mood' already exists.")
