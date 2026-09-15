import os
import mysql.connector
from dotenv import load_dotenv

# .env file load karein
load_dotenv()

def run_schema():
    schema_path = os.path.join(os.path.dirname(__file__), "data", "schema.sql")
    if not os.path.exists(schema_path):
        print(f"Error: {schema_path} file nahi mili!")
        return

    # Direct connection parameters from .env with fallback
    host = os.getenv("DB_HOST", "butustvgyyiel4gqhcuc-mysql.services.clever-cloud.com")
    port = int(os.getenv("DB_PORT", 3306))
    user = os.getenv("DB_USER", "ubwq4pkaon6lxzoe")
    password = os.getenv("DB_PASSWORD")
    database = os.getenv("DB_NAME", "butustvgyyiel4gqhcuc")

    print(f"Connecting directly to Clever Cloud MySQL ({host})...")
    try:
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
    except Exception as e:
        print(f"Connection Failed: {e}")
        print("Tip: Check karein ki Backend/.env file me DB_PASSWORD theek se set hai ya nahi.")
        return

    cursor = conn.cursor()

    with open(schema_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    sql_commands = [cmd.strip() for cmd in sql_content.split(";") if cmd.strip()]

    print("Tables aur data import ho raha hai...")
    for cmd in sql_commands:
        try:
            cursor.execute(cmd)
        except Exception as err:
            print(f"Query warning: {err}")

    conn.commit()
    cursor.close()
    conn.close()
    print("Success: Saari tables aur mock data Clever Cloud me import ho gaya!")

if __name__ == "__main__":
    run_schema()