// Đóng/Mở các cấp Menu Cây
function toggleTree(element) {
    const parentLi = element.parentElement;
    parentLi.classList.toggle('open');
}

// Chuyển Tab danh mục
function switchTab(tabKey) {
    const body = document.getElementById('content-body');
    
    if (tabKey === 'phieu-xuat-list') {
        body.innerHTML = `
            <h2>📋 Danh Sách Phiếu Xuất Kho</h2>
            <p>Bấm bên dưới để xem phiếu chi tiết & thực hiện ký nhận:</p>
            <br>
            <button class="btn btn-print" onclick="openSlipModal()">👁️ Xem Phiếu PXK-2026-001</button>
        `;
    } else {
        body.innerHTML = `
            <h2>Danh mục: ${tabKey.toUpperCase()}</h2>
            <p>Dữ liệu được tải trực tiếp từ Cloud Storage.</p>
        `;
    }
}

// Lọc thiết bị truyền dẫn theo hệ thống
function filterSystem(systemName) {
    const body = document.getElementById('content-body');
    body.innerHTML = `
        <h2>📡 Hệ Thống Truyền Dẫn: ${systemName}</h2>
        <p>Danh sách các thiết bị, card quang và vật tư thuộc hệ thống <strong>${systemName}</strong>.</p>
    `;
}

// Ẩn / Hiện Sidebar trên Mobile
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Mở & Đóng Modal Phiếu Xuất Kho
function openSlipModal() {
    document.getElementById('modal-phieu-xuat').style.display = 'block';
    if (typeof renderSlipContent === 'function') {
        renderSlipContent(sampleSlipData);
    }
}

function closeSlipModal() {
    document.getElementById('modal-phieu-xuat').style.display = 'none';
}

// Tải ứng dụng
window.addEventListener('DOMContentLoaded', () => {
    switchTab('phieu-xuat-list');
});
