import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "butustvgyyiel4gqhcuc-mysql.services.clever-cloud.com"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "ubwq4pkaon6lxzoe"),
            password=os.getenv("DB_PASSWORD", "AapkaCleverCloudPasswordYahanBhiDaalDein"),
            database=os.getenv("DB_NAME", "butustvgyyiel4gqhcuc"),
            connect_timeout=15
        )
        return conn
    except Exception as err:
        print(f"Database connection error: {err}")
        raise err