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

// Hàm vẽ các nút bấm thực đơn lên màn hình HTML (Bản nâng cấp có nút Xóa)
function renderMenuUI() {
    const container = document.getElementById("menu-container");
    container.innerHTML = ""; // Xóa các nút cũ đi

    menuItems.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "menu-item-btn";
        btn.style.position = "relative"; // Bật chế độ để căn chỉnh nút Xóa
        
        // Nội dung tên món và giá tiền
        btn.innerHTML = `<strong>${item.name}</strong><br><br>${item.price.toLocaleString("vi-VN")} đ`;
        
        // Khi bấm vào nền của nút thì gọi hàm thêm vào giỏ hàng
        btn.onclick = () => addToCart(item.id, item.name, item.price);

        // --- CHẾ TẠO NÚT XÓA (❌) GÓC TRÊN CÙNG BÊN PHẢI ---
        const deleteBtn = document.createElement("span");
        deleteBtn.innerHTML = "❌";
        deleteBtn.style.position = "absolute";
        deleteBtn.style.top = "5px";
        deleteBtn.style.right = "5px";
        deleteBtn.style.background = "transparent";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.fontSize = "14px";
        
        // Lệnh kích hoạt khi bấm chữ ❌
        deleteBtn.onclick = (event) => {
            event.stopPropagation(); // Lệnh cực kỳ quan trọng: Ngăn không cho "bấm nhầm" nảy món vào giỏ hàng
            deleteMenuItem(item.id);
        };

        // Gắn nút Xóa vào nút Món ăn, rồi gắn tất cả lên màn hình
        btn.appendChild(deleteBtn);
        container.appendChild(btn);
    });
}

// Hàm gửi lệnh Xóa lên Server Python
async function deleteMenuItem(itemId) {
    // Bật hộp thoại hỏi lại cho chắc ăn
    const confirmDelete = confirm("⚠️ Bạn có chắc chắn muốn xóa món này khỏi Menu không?");
    if (!confirmDelete) return;

    try {
        await fetch(`https://cafe-k.onrender.com/api/menu/${itemId}`, {
            method: "DELETE"
        });
        
        alert("Đã xóa món thành công!");
        fetchMenuFromServer(); // Gọi điện thoại tải lại danh sách món mới nhất
    } catch (error) {
        alert("Lỗi mạng: Không thể xóa món!");
    }
}

// 1. HÀM THÊM MÓN VÀO GIỎ (CỘNG)
function addToCart(itemId, itemName, itemPrice) {
    const existing = cart.find(i => i.id === itemId);
    if (existing) {
        existing.quantity += 1; // Nếu đã có trong giỏ thì cộng thêm 1
    } else {
        cart.push({ id: itemId, name: itemName, price: itemPrice, quantity: 1 });
    }
    updateCartUI();
}

// 2. HÀM XỬ LÝ NÚT TRỪ (GIẢM ĐÚNG 1 SỐ LƯỢNG MỖI LẦN BẤM)
function decreaseQuantity(itemId) {
    const itemIndex = cart.findIndex(i => i.id === itemId);
    
    if (itemIndex !== -1) {
        // Nếu số lượng đang lớn hơn 1 -> Chỉ trừ đi 1 ly
        if (cart[itemIndex].quantity > 1) {
            cart[itemIndex].quantity -= 1; 
        } 
        // Nếu số lượng đang là 1 -> Xóa hoàn toàn món đó khỏi giỏ
        else {
            cart.splice(itemIndex, 1); 
        }
        updateCartUI(); // Vẽ lại màn hình ngay lập tức
    }
}

// 3. HÀM VẼ LẠI GIỎ HÀNG LÊN MÀN HÌNH HTML
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

        // Cột trái: Tên món + số lượng
        const info = document.createElement("div");
        info.innerHTML = `<strong style="font-size: 16px;">${item.name}</strong><br><span style="color: #7f8c8d; font-size: 14px;">${item.price.toLocaleString("vi-VN")} đ (x${item.quantity})</span>`;

        // Cột phải: 2 Nút bấm Trừ và Cộng
        const actionBox = document.createElement("div");

        // --- Nút Trừ (−) ---
        const btnMinus = document.createElement("button");
        btnMinus.innerText = "−";
        btnMinus.style.width = "35px";
        btnMinus.style.height = "35px";
        btnMinus.style.background = "#e74c3c"; // Màu đỏ
        btnMinus.style.color = "white";
        btnMinus.style.border = "none";
        btnMinus.style.borderRadius = "5px";
        btnMinus.style.fontSize = "18px";
        btnMinus.style.cursor = "pointer";
        btnMinus.onclick = () => decreaseQuantity(item.id);

        // --- Nút Cộng (+) ---
        const btnPlus = document.createElement("button");
        btnPlus.innerText = "+";
        btnPlus.style.width = "35px";
        btnPlus.style.height = "35px";
        btnPlus.style.background = "#27ae60"; // Màu xanh lá
        btnPlus.style.color = "white";
        btnPlus.style.border = "none";
        btnPlus.style.borderRadius = "5px";
        btnPlus.style.fontSize = "18px";
        btnPlus.style.cursor = "pointer";
        btnPlus.style.marginLeft = "10px"; // Cách nút trừ ra một chút cho dễ bấm
        btnPlus.onclick = () => addToCart(item.id, item.name, item.price);

        // Lắp ráp mọi thứ vào
        actionBox.appendChild(btnMinus);
        actionBox.appendChild(btnPlus);
        
        li.appendChild(info);
        li.appendChild(actionBox);
        
        cartList.appendChild(li);
    });
    
    // Cập nhật lại dòng tổng tiền
    document.getElementById("total-price").innerText = calculateTotal().toLocaleString("vi-VN");
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
function sendOrder() {
    if (cart.length === 0) return alert("Chưa chọn món nào!");
    
    const floor = document.getElementById("floor-select").value;
    const tableNum = document.getElementById("table-select").value;
    const finalTableName = `${floor} - Bàn ${tableNum}`; 
    
    // Lấy nội dung ghi chú
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
    
    // Reset lại giỏ hàng và giao diện
    cart = [];
    updateCartUI();
    
    // 🔴 DÒNG LỆNH QUAN TRỌNG: Tự động xóa trắng ô ghi chú
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

// ==========================================
// HÀM XÓA MÓN ĂN KHỎI MENU
// ==========================================
async function deleteMenuItem(itemId) {
    // Bật hộp thoại hỏi lại cho chắc ăn, lỡ tay bấm nhầm thì còn cứu được
    const confirmDelete = confirm("⚠️ Bạn có chắc chắn muốn xóa vĩnh viễn món này khỏi Menu không?");
    if (!confirmDelete) return; // Nếu bấm Hủy (Cancel) thì dừng lại ngay

    try {
        // Gửi lệnh DELETE thẳng lên Render
        const response = await fetch(`https://cafe-k.onrender.com/api/menu/${itemId}`, {
            method: "DELETE"
        });
        
        if (response.ok) {
            alert("✅ Đã xóa món thành công!");
            // Gọi hàm tải lại menu để màn hình tự động cập nhật (mất nút món ăn đó đi)
            fetchMenuFromServer(); 
        } else {
            alert("❌ Lỗi: Máy chủ từ chối xóa món này!");
        }
    } catch (error) {
        console.error("Lỗi xóa món:", error);
        alert("❌ Lỗi mạng: Không thể kết nối tới máy chủ Render!");
    }
}