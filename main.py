from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2 # Thay cho sqlite3
from psycopg2.extras import RealDictCursor
import json
import os

app = FastAPI()

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ĐƯỜNG LINK NEON CỦA BẠN
DATABASE_URL = "postgresql://neondb_owner:npg_KEn3RW5jfZcL@ep-delicate-leaf-aie33mol-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

def get_db_connection():
    # Hàm này giúp kết nối tới két sắt Neon trên mây
    return psycopg2.connect(DATABASE_URL)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    # Tạo bảng menu (PostgreSQL dùng cú pháp SERIAL thay cho AUTOINCREMENT)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS menu (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            category TEXT NOT NULL
        )
    ''')
    # Tạo bảng orders
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            table_name TEXT NOT NULL,
            items_summary TEXT NOT NULL,
            total_amount INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    cursor.close()
    conn.close()

init_db()

class MenuItem(BaseModel):
    name: str
    price: int
    category: str

@app.get("/api/menu")
def get_menu():
    conn = get_db_connection()
    # RealDictCursor giúp trả về dữ liệu dạng Dictionary giống JSON
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id, name, price, category FROM menu")
    items = cursor.fetchall()
    cursor.close()
    conn.close()
    return items

@app.post("/api/menu")
def add_menu_item(item: MenuItem):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO menu (name, price, category) VALUES (%s, %s, %s)", (item.name, item.price, item.category))
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Success"}

@app.get("/api/revenue")
def get_total_revenue():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT SUM(total_amount) FROM orders")
    total = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return {"total_revenue": total if total else 0}

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                order_dict = json.loads(data)
                if order_dict.get("type") == "NEW_ORDER":
                    items_str = ", ".join([f"{item['quantity']}x {item['name']}" for item in order_dict['items']])
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO orders (table_name, items_summary, total_amount) VALUES (%s, %s, %s)", 
                        (order_dict.get('table', 'Bàn Khách'), items_str, order_dict['totalAmount'])
                    )
                    conn.commit()
                    cursor.close()
                    conn.close()
            except Exception as e:
                print(f"Error: {e}")
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)