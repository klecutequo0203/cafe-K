const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => console.log("✅ Đã kết nối WebSocket!");

let menuItems = []; 
let cart = [];

// Tải menu từ Server
async function fetchMenuFromServer() {
    const response = await fetch("http://localhost:8000/api/menu");
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
    await fetch("http://localhost:8000/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

// Gửi order qua WebSocket
function sendOrder(tableName) {
    if (cart.length === 0) return alert("Chưa chọn món nào!");
    
    // Đã bổ sung 'totalAmount' và 'timestamp' vào gói hàng gửi đi
    const orderData = { 
        type: "NEW_ORDER", 
        table: tableName, 
        items: cart,
        totalAmount: calculateTotal(), // Python cần cái này để ghi sổ!
        timestamp: new Date().toISOString() // Barista cần cái này để hiện giờ!
    };
    
    ws.send(JSON.stringify(orderData));
    alert("Đã gửi đơn thành công!");
    cart = [];
    updateCartUI();
}

// Chạy lần đầu tiên khi mở web
fetchMenuFromServer();
// ==========================================
// PHẦN 4: THỐNG KÊ DOANH THU (Dành cho Quản lý)
// ==========================================
async function checkRevenue() {
    try {
        // Gửi yêu cầu lấy doanh thu từ Python
        const response = await fetch("http://localhost:8000/api/revenue");
        
        if (response.ok) {
            const data = await response.json();
            // Định dạng số tiền có dấu phẩy cho dễ nhìn
            const formattedRevenue = data.total_revenue.toLocaleString("vi-VN");
            
            // Hiển thị lên màn hình
            document.getElementById("revenue-display").innerText = formattedRevenue;
            alert(`Tổng doanh thu hiện tại là: ${formattedRevenue} VNĐ`);
        }
    } catch (error) {
        console.error("❌ Lỗi khi tải doanh thu:", error);
        alert("Không thể kết nối với máy chủ để lấy doanh thu!");
    }
}