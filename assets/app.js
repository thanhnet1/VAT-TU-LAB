// Đóng/Mở các node trong menu dạng cây
function toggleTreeNode(element) {
    const parentNode = element.parentElement;
    parentNode.classList.toggle('open');
    
    const arrow = element.querySelector('.arrow');
    if (arrow) {
        arrow.innerText = parentNode.classList.contains('open') ? '▼' : '▶';
    }
}

// Điều hướng xem danh mục
function navTo(targetKey) {
    const container = document.getElementById('mainContent');
    
    if (targetKey === 'phieu-xuat') {
        container.innerHTML = `
            <h2>📄 Danh Sách Phiếu Xuất Kho</h2>
            <p>Bấm vào nút bên dưới để mở giao diện phiếu chuẩn A4 và thực hiện ký nhận:</p>
            <br>
            <button class="btn btn-primary" onclick="openSlipModal()">👁️ Xem Phiếu Xuất PXK-2026-889</button>
        `;
    } else if (targetKey === 'tai-san') {
        container.innerHTML = `
            <h2>🏢 Quản Lý Danh Mục Tài Sản</h2>
            <p>Dữ liệu danh mục Tài sản được lưu trữ và đồng bộ trên Cloud Server.</p>
        `;
    } else {
        container.innerHTML = `
            <h2>Danh mục: ${targetKey.toUpperCase()}</h2>
            <p>Dữ liệu đang được kết nối với Cloud Database...</p>
        `;
    }
}

// Lọc thiết bị theo hệ thống (XTC10, Ciena, OMD, Nokia, OTN, PSS, HW, Alu...)
function filterDeviceSys(sysName) {
    const container = document.getElementById('mainContent');
    container.innerHTML = `
        <h2>📡 Phân Hệ Truyền Dẫn: ${sysName}</h2>
        <p>Danh sách vật tư và thiết bị thuộc hệ thống <strong>${sysName}</strong>.</p>
    `;
}

// Bật/Tắt Menu Sidebar trên thiết bị di động
function toggleMobileMenu() {
    document.getElementById('app-sidebar').classList.toggle('active');
}

// Mở/Đóng Modal Phiếu Xuất
function openSlipModal() {
    document.getElementById('slipModal').style.display = 'block';
    if (typeof renderSlipTable === 'function') {
        renderSlipTable(currentSlipData);
    }
}

function closeSlipModal() {
    document.getElementById('slipModal').style.display = 'none';
}

// Khởi tạo ứng dụng
window.addEventListener('DOMContentLoaded', () => {
    navTo('phieu-xuat');
});
