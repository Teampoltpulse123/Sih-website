import os
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

load_dotenv()

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "geoframe_db"),
    "port": int(os.getenv("DB_PORT", 3306)),
}

try:
    connection_pool = pooling.MySQLConnectionPool(
        pool_name="geoframe_pool",
        pool_size=10,
        pool_reset_session=True,
        **db_config
    )
    print(f"Connected to MySQL database: {db_config['database']}")
except mysql.connector.Error as err:
    print(f"MySQL Connection Error: {err}")
    connection_pool = None

def get_db_connection():
    if connection_pool:
        return connection_pool.get_connection()
    raise Exception("Database connection pool is not initialized")