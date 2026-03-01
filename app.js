let ws;

function connectWebSocket() {
    ws = new WebSocket("wss://cafe-k.onrender.com/ws");

    ws.onopen = () => console.log("✅ Đã kết nối WebSocket!");

    ws.onclose = () => {
        console.log("⚠️ Mất kết nối. Đang kết nối lại...");
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error("Lỗi WebSocket:", error);
        ws.close();
    };
}

// Khởi động kết nối
connectWebSocket();


let menuItems = []; 
let cart = [];

// Tải menu từ Server
async function fetchMenuFromServer() {
    const response = await fetch("https://cafe-k.onrender.com/api/menu");
    if (response.ok) {
        menuItems = await response.json();
        renderMenuUI(); // Vẽ lại giao diện
    }
}

// Xử lý nút bấm "Thêm vào Menu" trên giao diện
function submitNewItem() {
    const name = document.getElementById("item-name").value;
    const price = document.getElementById("item-price").value;
    const category = document.getElementById("item-category").value;

    if(name && price && category) {
        addNewMenuItem(name, parseInt(price), category);
        // Xóa trắng ô nhập liệu sau khi thêm
        document.getElementById("item-name").value = "";
        document.getElementById("item-price").value = "";
        document.getElementById("item-category").value = "";
    } else {
        alert("Vui lòng điền đầy đủ tên, giá và nhóm món!");
    }
}

// Gửi lệnh lưu món mới lên Server
async function addNewMenuItem(name, price, category) {
    await fetch("https://cafe-k.onrender.com/api/menu", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json" 
        },
        body: JSON.stringify({ name, price, category })
    });
    
    fetchMenuFromServer(); // Load lại menu ngay
}

// Hàm vẽ các nút bấm thực đơn lên màn hình HTML
function renderMenuUI() {
    const container = document.getElementById("menu-container");
    container.innerHTML = ""; // Xóa các nút cũ đi

    menuItems.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "menu-item-btn";
        // Định dạng số tiền có dấu phẩy cho dễ đọc
        btn.innerHTML = `<strong>${item.name}</strong><br><br>${item.price.toLocaleString("vi-VN")} đ`;
        // Khi bấm vào nút này thì gọi hàm thêm vào giỏ hàng
        btn.onclick = () => addToCart(item.id, item.name, item.price);
        container.appendChild(btn);
    });
}

// Thêm món vào giỏ
function addToCart(itemId, itemName, itemPrice) {
    const existing = cart.find(i => i.id === itemId);
    if (existing) existing.quantity += 1;
    else cart.push({ id: itemId, name: itemName, price: itemPrice, quantity: 1 });
    updateCartUI();
}

// Tính tổng tiền
function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Hàm vẽ lại danh sách giỏ hàng trên HTML
function updateCartUI() {
    const cartList = document.getElementById("cart-list");
    cartList.innerHTML = "";
    
    cart.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.name} (x${item.quantity}) - ${(item.price * item.quantity).toLocaleString("vi-VN")} đ`;
        cartList.appendChild(li);
    });
    
    document.getElementById("total-price").innerText = calculateTotal().toLocaleString("vi-VN");
}

// Gửi order qua WebSocket (Đã cập nhật tính năng Ghi chú)
function sendOrder() {
    if (cart.length === 0) return alert("Chưa chọn món nào!");
    
    const floor = document.getElementById("floor-select").value;
    const tableNum = document.getElementById("table-select").value;
    const finalTableName = `${floor} - Bàn ${tableNum}`; 
    
    // Lấy nội dung khách dặn dò
    const noteContent = document.getElementById("order-note").value;
    
    const orderData = { 
        type: "NEW_ORDER", 
        table: finalTableName, 
        items: cart,
        totalAmount: calculateTotal(), 
        timestamp: new Date().toISOString(),
        note: noteContent // Bỏ thêm tờ giấy ghi chú vào gói hàng!
    };
    
    ws.send(JSON.stringify(orderData));
    alert(`Đã gửi đơn của ${finalTableName} thành công!`);
    
    cart = [];
    updateCartUI();
    // Xóa trắng ô ghi chú để đón khách tiếp theo
    document.getElementById("order-note").value = "";
}

// Chạy lần đầu tiên khi mở web
fetchMenuFromServer();

// ==========================================
// TÍNH NĂNG CHỐT SỔ (XEM TỔNG DOANH THU)
// ==========================================
async function getRevenue() {
    try {
        const response = await fetch("https://cafe-k.onrender.com/api/revenue");
        if (response.ok) {
            const data = await response.json();
            // Nếu data.total_revenue bị null (chưa có đơn nào), gán mặc định là 0
            const total = data.total_revenue || 0; 
            alert(`💰 TỔNG DOANH THU ĐẾN HIỆN TẠI:\n${total.toLocaleString("vi-VN")} đ`);
        } else {
            alert("❌ Lỗi: Không thể lấy được dữ liệu chốt sổ!");
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("❌ Lỗi mạng: Không kết nối được tới máy chủ Render!");
    }
}
