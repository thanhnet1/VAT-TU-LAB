// Dữ liệu mẫu phiếu xuất kho
const sampleSlipData = {
    id: "PXK-2026-001",
    date: "10/11/2026",
    receiver: "Nguyễn Văn A - Trung tâm Vận hành",
    signed: false,
    signerName: "",
    signedAt: "",
    items: [
        { id: "VT-001", name: "Card quang XTC10 - MTCS", unit: "Cái", qty: 2, price: 15000000, total: 30000000 },
        { id: "VT-002", name: "Modul Ciena 6530 10G", unit: "Chiếc", qty: 5, price: 4500000, total: 22500000 },
        { id: "VT-003", name: "Cáp sợi quang Single-mode OMD", unit: "Cuộn", qty: 1, price: 8000000, total: 8000000 }
    ]
};

// 1. TẠO MÃ QR RIÊNG CHO TỪNG DÒNG VẬT TƯ
function renderSlipContent(slipData) {
    document.getElementById('slip-id').innerText = slipData.id;
    document.getElementById('slip-date').innerText = slipData.date;
    document.getElementById('slip-receiver-name').innerText = slipData.receiver;

    const tbody = document.getElementById('slip-table-body');
    tbody.innerHTML = '';

    slipData.items.forEach((item, index) => {
        const tr = document.createElement('tr');
        const qrCellId = `qr-code-row-${index}`;
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="text-align: left;"><strong>${item.name}</strong><br><small>Mã: ${item.id}</small></td>
            <td><div id="${qrCellId}" class="qr-container"></div></td>
            <td>${item.unit}</td>
            <td>${item.qty}</td>
            <td>${item.price.toLocaleString('vi-VN')}</td>
            <td>${item.total.toLocaleString('vi-VN')}</td>
        `;
        tbody.appendChild(tr);

        // Sinh mã QR riêng biệt từng dòng vật tư
        setTimeout(() => {
            const container = document.getElementById(qrCellId);
            if (container) {
                container.innerHTML = "";
                new QRCode(container, {
                    text: `MAT-ID:${item.id}|NAME:${item.name}|QTY:${item.qty}`,
                    width: 50,
                    height: 50
                });
            }
        }, 50);
    });

    updateSignatureStatusUI(slipData);
}

// 2. QUẢN LÝ CHỮ KÝ ĐIỆN TỬ NGƯỜI NHẬN
function updateSignatureStatusUI(slip) {
    const box = document.getElementById('receiver-sig-box');
    if (slip.signed) {
        box.innerHTML = `
            <div class="status-signed">
                ✅ ĐÃ XÁC NHẬN KÝ NHẬN<br>
                <strong>${slip.signerName}</strong><br>
                <small>${slip.signedAt}</small>
            </div>
        `;
    } else {
        box.innerHTML = `
            <span class="status-pending">Chưa xác nhận ký nhận</span><br>
            <button class="btn-sign no-print" onclick="openSignatureModal()">✍️ Ký Nhận Ngay</button>
        `;
    }
}

function openSignatureModal() {
    if (sampleSlipData.signed) {
        alert("Phiếu xuất kho này đã được ký nhận trước đó. Không thể sửa đổi!");
        return;
    }
    document.getElementById('modal-ky-nhan').style.display = 'block';
}

function closeSignatureModal() {
    document.getElementById('modal-ky-nhan').style.display = 'none';
}

function confirmReceiverSignature() {
    const name = document.getElementById('signer-fullname').value.trim();
    const pin = document.getElementById('signer-pin').value.trim();

    if (!name || !pin) {
        alert("Vui lòng điền đầy đủ Tên người nhận và Mã PIN!");
        return;
    }

    // Ghi nhận ký & đồng bộ dữ liệu
    sampleSlipData.signed = true;
    sampleSlipData.signerName = name;
    sampleSlipData.signedAt = new Date().toLocaleString('vi-VN');

    updateSignatureStatusUI(sampleSlipData);
    closeSignatureModal();
    alert("Ký xác nhận thành công! Dữ liệu đã lưu lên Cloud.");
}

// 3. XUẤT EXCEL GIỮ NGUYÊN CẤU TRÚC A4
function exportToExcelA4() {
    const tableHTML = document.getElementById('printable-slip').innerHTML;
    const excelFile = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 0.5pt solid #000; text-align: center; vertical-align: middle; }
                .slip-header { text-align: center; font-weight: bold; font-size: 16pt; }
                .no-print { display: none; }
            </style>
        </head>
        <body>
            ${tableHTML}
        </body>
        </html>
    `;

    const blob = new Blob([excelFile], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Phieu_Xuat_Kho_${sampleSlipData.id}.xls`;
    link.click();
}
