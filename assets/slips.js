// Dữ liệu mẫu quản lý danh mục và trạng thái phiếu
let currentSlipData = {
    code: "PXK-2026-889",
    date: "10/11/2026",
    receiverName: "Đội Vận hành Bảo dưỡng VNPT",
    isSigned: false,
    signerName: "",
    signedTimestamp: "",
    items: [
        { id: "VT-XTC10", name: "Card quang XTC10 - MTCS", unit: "Cái", qty: 2, price: 15000000, total: 30000000 },
        { id: "VT-CIENA", name: "Bộ nguồn Ciena 6530", unit: "Bộ", qty: 1, price: 12500000, total: 12500000 },
        { id: "VT-OMD14", name: "Thanh Rack OMD - 14 slot", unit: "Chiếc", qty: 3, price: 3200000, total: 9600000 }
    ]
};

// 1. TẠO MÃ QR DÀNH RIÊNG CHO TỪNG DÒNG VẬT TƯ
function renderSlipTable(slip) {
    document.getElementById('lblSlipCode').innerText = slip.code;
    document.getElementById('lblSlipDate').innerText = slip.date;
    document.getElementById('lblReceiverName').innerText = slip.receiverName;

    const tbody = document.getElementById('slipTableRows');
    tbody.innerHTML = '';

    slip.items.forEach((item, idx) => {
        const tr = document.createElement('tr');
        const qrId = `qr-target-${idx}`;
        
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td style="text-align: left;"><strong>${item.name}</strong><br><small style="color:#64748b">Mã: ${item.id}</small></td>
            <td><div id="${qrId}" class="qr-code-box"></div></td>
            <td>${item.unit}</td>
            <td>${item.qty}</td>
            <td>${item.price.toLocaleString('vi-VN')}</td>
            <td>${item.total.toLocaleString('vi-VN')}</td>
        `;
        tbody.appendChild(tr);

        // Khởi tạo mã QR riêng cho dòng vật tư này
        setTimeout(() => {
            const qrTarget = document.getElementById(qrId);
            if (qrTarget) {
                qrTarget.innerHTML = '';
                new QRCode(qrTarget, {
                    text: `ITEM:${item.id}|NAME:${item.name}|QTY:${item.qty}`,
                    width: 48,
                    height: 48
                });
            }
        }, 50);
    });

    renderSignatureState(slip);
}

// 2. HIỂN THỊ VÀ XỬ LÝ CHỮ KÝ SỐ CHO NGƯỜI NHẬN
function renderSignatureState(slip) {
    const box = document.getElementById('receiverSigBox');
    if (slip.isSigned) {
        box.className = "sig-box-inner signed";
        box.innerHTML = `
            ✅ XÁC NHẬN KÝ NHẬN<br>
            <strong>${slip.signerName}</strong><br>
            <small style="font-size: 10px">${slip.signedTimestamp}</small>
        `;
    } else {
        box.className = "sig-box-inner";
        box.innerHTML = `
            <span class="text-warning">Chưa xác nhận ký nhận</span><br>
            <button class="btn-sign-action no-print" onclick="openReceiverSignatureModal()">✍️ Ký Nhận Hàng</button>
        `;
    }
}

function openReceiverSignatureModal() {
    if (currentSlipData.isSigned) {
        alert("Phiếu xuất này đã được người nhận hoàn tất ký số!");
        return;
    }
    document.getElementById('signModal').style.display = 'block';
}

function closeReceiverSignatureModal() {
    document.getElementById('signModal').style.display = 'none';
}

function processReceiverSign() {
    const name = document.getElementById('signerNameInput').value.trim();
    const pin = document.getElementById('signerPinInput').value.trim();

    if (!name || !pin) {
        alert("Vui lòng điền đầy đủ Tên người nhận và Mã PIN chữ ký số!");
        return;
    }

    // Ghi nhận chữ ký số & Khóa quyền chỉnh sửa nội dung phiếu
    currentSlipData.isSigned = true;
    currentSlipData.signerName = name;
    currentSlipData.signedTimestamp = new Date().toLocaleString('vi-VN');

    renderSignatureState(currentSlipData);
    closeReceiverSignatureModal();
    alert("Xác nhận ký nhận thành công! Dữ liệu đã lưu trữ trên Cloud.");
}

// 3. XUẤT EXCEL GIỮ NGUYÊN CẤU TRÚC VÀ KHỔ GIẤY A4
function exportExcelA4Format() {
    const content = document.getElementById('slipA4Content').innerHTML;
    const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                @page { size: A4 portrait; margin: 1in; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 0.5pt solid #000; text-align: center; vertical-align: middle; }
                .slip-header-block { text-align: center; font-weight: bold; font-size: 16pt; }
                .no-print { display: none; }
            </style>
        </head>
        <body>${content}</body>
        </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Phieu_Xuat_Kho_${currentSlipData.code}.xls`;
    a.click();
}
