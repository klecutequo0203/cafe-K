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

// ==========================================
// QUẢN LÝ MENU (THÊM, HIỂN THỊ, XÓA MÓN)
// ==========================================

async function fetchMenuFromServer() {
    const response = await fetch("https://cafe-k.onrender.com/api/menu");
    if (response.ok) {
        menuItems = await response.json();
        renderMenuUI(); 
    }
}

function submitNewItem() {
    const name = document.getElementById("item-name").value;
    const price = document.getElementById("item-price").value;
    const category = document.getElementById("item-category").value;

    if(name && price && category) {
        addNewMenuItem(name, parseInt(price), category);
        document.getElementById("item-name").value = "";
        document.getElementById("item-price").value = "";
        document.getElementById("item-category").value = "";
    } else {
        alert("Vui lòng điền đầy đủ tên, giá và nhóm món!");
    }
}

async function addNewMenuItem(name, price, category) {
    await fetch("https://cafe-k.onrender.com/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, category })
    });
    fetchMenuFromServer(); 
}

function renderMenuUI() {
    const container = document.getElementById("menu-container");
    container.innerHTML = ""; 

    menuItems.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "menu-item-btn";
        btn.style.position = "relative"; 
        
        btn.innerHTML = `<strong>${item.name}</strong><br><br>${item.price.toLocaleString("vi-VN")} đ`;
        btn.onclick = () => addToCart(item.id, item.name, item.price);

        const deleteBtn = document.createElement("span");
        deleteBtn.innerHTML = "❌";
        deleteBtn.style.position = "absolute";
        deleteBtn.style.top = "5px";
        deleteBtn.style.right = "8px";
        deleteBtn.style.background = "transparent";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.fontSize = "16px";
        
        deleteBtn.onclick = (event) => {
            event.stopPropagation(); 
            deleteMenuItem(item.id);
        };

        btn.appendChild(deleteBtn);
        container.appendChild(btn);
    });
}

async function deleteMenuItem(itemId) {
    const confirmDelete = confirm("⚠️ Bạn có chắc chắn muốn xóa vĩnh viễn món này khỏi Menu không?");
    if (!confirmDelete) return; 

    try {
        const response = await fetch(`https://cafe-k.onrender.com/api/menu/${itemId}`, {
            method: "DELETE"
        });
        
        if (response.ok) {
            alert("✅ Đã xóa món thành công!");
            fetchMenuFromServer(); 
        } else {
            alert("❌ Lỗi: Máy chủ từ chối xóa món này!");
        }
    } catch (error) {
        console.error("Lỗi xóa món:", error);
        alert("❌ Lỗi mạng: Không thể kết nối tới máy chủ Render!");
    }
}

// ==========================================
// QUẢN LÝ GIỎ HÀNG (CỘNG, TRỪ, TÍNH TIỀN)
// ==========================================

function addToCart(itemId, itemName, itemPrice) {
    const existing = cart.find(i => i.id === itemId);
    if (existing) {
        existing.quantity += 1; 
    } else {
        cart.push({ id: itemId, name: itemName, price: itemPrice, quantity: 1 });
    }
    updateCartUI();
}

function decreaseQuantity(itemId) {
    const itemIndex = cart.findIndex(i => i.id === itemId);
    
    if (itemIndex !== -1) {
        if (cart[itemIndex].quantity > 1) {
            cart[itemIndex].quantity -= 1; 
        } else {
            cart.splice(itemIndex, 1); 
        }
        updateCartUI(); 
    }
}

function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function updateCartUI() {
    const cartList = document.getElementById("cart-list");
    cartList.innerHTML = "";
    
    cart.forEach(item => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.padding = "10px 0";
        li.style.borderBottom = "1px dashed #bdc3c7";

        const info = document.createElement("div");
        info.innerHTML = `<strong style="font-size: 16px;">${item.name}</strong><br><span style="color: #7f8c8d; font-size: 14px;">${item.price.toLocaleString("vi-VN")} đ (x${item.quantity})</span>`;

        const actionBox = document.createElement("div");

        const btnMinus = document.createElement("button");
        btnMinus.innerText = "−";
        btnMinus.style.width = "35px";
        btnMinus.style.height = "35px";
        btnMinus.style.background = "#e74c3c"; 
        btnMinus.style.color = "white";
        btnMinus.style.border = "none";
        btnMinus.style.borderRadius = "5px";
        btnMinus.style.fontSize = "18px";
        btnMinus.style.cursor = "pointer";
        btnMinus.onclick = () => decreaseQuantity(item.id);

        const btnPlus = document.createElement("button");
        btnPlus.innerText = "+";
        btnPlus.style.width = "35px";
        btnPlus.style.height = "35px";
        btnPlus.style.background = "#27ae60"; 
        btnPlus.style.color = "white";
        btnPlus.style.border = "none";
        btnPlus.style.borderRadius = "5px";
        btnPlus.style.fontSize = "18px";
        btnPlus.style.cursor = "pointer";
        btnPlus.style.marginLeft = "10px"; 
        btnPlus.onclick = () => addToCart(item.id, item.name, item.price);

        actionBox.appendChild(btnMinus);
        actionBox.appendChild(btnPlus);
        
        li.appendChild(info);
        li.appendChild(actionBox);
        
        cartList.appendChild(li);
    });
    
    document.getElementById("total-price").innerText = calculateTotal().toLocaleString("vi-VN");
}

function sendOrder() {
    if (cart.length === 0) return alert("Chưa chọn món nào!");
    
    const floor = document.getElementById("floor-select").value;
    const tableNum = document.getElementById("table-select").value;
    const finalTableName = `${floor} - Bàn ${tableNum}`; 
    
    const noteContent = document.getElementById("order-note").value;
    
    const orderData = { 
        type: "NEW_ORDER", 
        table: finalTableName, 
        items: cart,
        totalAmount: calculateTotal(), 
        timestamp: new Date().toISOString(),
        note: noteContent 
    };
    
    ws.send(JSON.stringify(orderData));
    alert(`Đã gửi đơn của ${finalTableName} thành công!`);
    
    cart = [];
    updateCartUI();
    document.getElementById("order-note").value = "";
}

// ==========================================
// TÍNH NĂNG CHỐT SỔ
// ==========================================
async function getRevenue() {
    try {
        const response = await fetch("https://cafe-k.onrender.com/api/revenue");
        if (response.ok) {
            const data = await response.json();
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

// Chạy lần đầu tiên khi mở web
fetchMenuFromServer();