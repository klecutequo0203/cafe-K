from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import json

app = FastAPI()

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. CẤU HÌNH CƠ SỞ DỮ LIỆU SQLITE (Sổ cái)
# ==========================================
def init_db():
    conn = sqlite3.connect("coffee_shop.db")
    cursor = conn.cursor()
    # Bảng menu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            category TEXT NOT NULL
        )
    ''')
    # Bảng lịch sử đơn hàng
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name TEXT NOT NULL,
            items_summary TEXT NOT NULL,
            total_amount INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ==========================================
# 2. QUẢN LÝ THỰC ĐƠN (REST API)
# ==========================================
class MenuItem(BaseModel):
    name: str
    price: int
    category: str

@app.get("/api/menu")
def get_menu():
    conn = sqlite3.connect("coffee_shop.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, price, category FROM menu")
    items = cursor.fetchall()
    conn.close()
    return [{"id": row[0], "name": row[1], "price": row[2], "category": row[3]} for row in items]

@app.post("/api/menu")
def add_menu_item(item: MenuItem):
    conn = sqlite3.connect("coffee_shop.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO menu (name, price, category) VALUES (?, ?, ?)", (item.name, item.price, item.category))
    conn.commit()
    conn.close()
    return {"message": f"Đã thêm món {item.name} thành công!"}

# API Lấy tổng doanh thu (Dành cho chủ quán)
@app.get("/api/revenue")
def get_total_revenue():
    conn = sqlite3.connect("coffee_shop.db")
    cursor = conn.cursor()
    # Lệnh SQL SUM để cộng tất cả các giá trị trong cột total_amount
    cursor.execute("SELECT SUM(total_amount) FROM orders")
    total = cursor.fetchone()[0]
    conn.close()
    
    # Nếu chưa bán được đơn nào, SQL sẽ trả về None, ta chuyển nó thành 0
    if total is None:
        total = 0
        
    return {"total_revenue": total}
# ==========================================
# 3. WEBSOCKET (Đường truyền thời gian thực)
# ==========================================
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
            
            # Xử lý ghi sổ doanh thu
            try:
                order_dict = json.loads(data)
                if order_dict.get("type") == "NEW_ORDER":
                    items_str = ", ".join([f"{item['quantity']}x {item['name']}" for item in order_dict['items']])
                    total_money = order_dict['totalAmount']
                    table = order_dict.get('table', 'Bàn Khách')
                    
                    conn = sqlite3.connect("coffee_shop.db")
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO orders (table_name, items_summary, total_amount) VALUES (?, ?, ?)", 
                        (table, items_str, total_money)
                    )
                    conn.commit()
                    conn.close()
                    print(f"💰 Đã ghi sổ doanh thu: {table} - {total_money} VNĐ")
            except Exception as e:
                print(f"❌ Lỗi xử lý ghi sổ: {e}")

            # Phát lại đơn hàng cho quầy pha chế
            await manager.broadcast(data)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)