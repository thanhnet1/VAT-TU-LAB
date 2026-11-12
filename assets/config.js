/* =====================================================================
   CẤU HÌNH WEB APP – bạn chỉ cần sửa file này để đổi tên, màu, nhãn…
   ===================================================================== */
window.APP_CONFIG = {
  // Tiêu đề hiển thị trên thanh trên cùng
  title: 'Tài sản – Vật tư Truyền dẫn LAB',
  subtitle: 'LAB XVT',

  // Tên cột tích chọn (ô ☑ ở cột A của file Excel gốc)
  checkLabel: 'Đã kiểm',

  // Khoá lưu chỉnh sửa trong trình duyệt (đổi nếu bạn chạy nhiều bản web trên cùng một tên miền)
  storageKey: 'lab-xvt-v1',

  // Tên nhóm ở thanh bên: [nhóm 0, nhóm 1]
  groupNames: ['Thiết bị theo hệ thống', 'Vật tư rời / không rõ nguồn / đo kiểm'],

  // Đặt tên dễ hiểu cho sheet:  'id-sheet': 'Tên hiển thị'
  // (id = tên sheet viết thường, không dấu, nối bằng dấu gạch ngang)
  sheetLabels: {
    // 'trang-tinh14': 'Trang tính14 – Vật tư theo dõi tình trạng',
  },

  // Ý nghĩa các màu tô trong file Excel gốc (điền để hiện chú thích trên web)
  // Mã màu: FFFF00 vàng · FF0000 đỏ · 92D050 xanh lá nhạt · 00B050 xanh lá · 00B0F0 xanh dương
  //         FFC000 cam · F79646 cam nhạt · FFF2CC vàng kem · 0F243E xanh đen
  colorMeaning: {
    // 'FFFF00': 'Cần kiểm tra lại',
    // 'FF0000': 'Hỏng / mất',
  },

  // Số dòng tối đa hiển thị khi tìm kiếm toàn bộ
  maxSearchResults: 400,

  // ====== ĐỒNG BỘ NHIỀU THIẾT BỊ (máy tính, điện thoại…) – xem HUONG_DAN.md mục 12 ======
  sync: {
    provider: '',                  // '' = tắt (chỉ lưu trên máy)  |  'firebase'  |  'server' (tools/sync_server.py)
    workspace: 'lab-xvt',          // tên nhóm dữ liệu (nhiều phòng LAB dùng chung 1 dự án thì đặt tên khác nhau)
    firebase: {                    // Firebase console → Project settings → Your apps → Web app → Config
      apiKey: '', authDomain: '', projectId: '', appId: ''
    },
    server: { url: '', pollMs: 4000 }   // dùng khi provider = 'server'
  },

  // ====== PHIẾU XUẤT KHO / NHẬP KHO (theo phiếu mẫu Tổng Công ty Hạ tầng mạng) ======
  slip: {
    orgLine1: 'Tổng Công Ty Hạ tầng mạng',                                   // dòng 1 góc trên bên trái phiếu
    orgLine2: 'Trung Tâm Hạ Tầng Mạng Miền Bắc - CN Tổng công ty Hạ tầng mạng', // dòng 2
    formNoXuat: 'Mẫu số: 02  VT-DN',                                          // ký hiệu mẫu phiếu xuất
    formNoNhap: 'Mẫu số 1 VT -DN',                                            // ký hiệu mẫu phiếu nhập
    kho: 'Kho-X.VT-28-PHAM-HUNG-NTL_HNI',                                     // "Xuất tại / Nhập tại kho" mặc định
    numSuffix: 'X.VT-28PHG-KH01',   // số phiếu tự sinh: <số thứ tự>/<N hoặc X>/<2 số cuối năm>/<hậu tố>  vd 1067/N/25/X.VT-28PHG-KH01
    startSeq: 1,                    // số thứ tự bắt đầu mỗi năm (đặt số lớn hơn nếu muốn nối tiếp sổ cũ)
    unit: 'Cái',                    // đơn vị tính mặc định
    quality: 'Tốt',                 // chất lượng mặc định
    lien: '',                       // "Liên" mặc định (vd 1, 2, 3)
    thuTruong: '', ketToan: '', nguoiLap: '', thuKho: '',                     // họ tên in dưới chữ ký (có thể để trống)
    qrLink: true                    // thêm đường dẫn mở phiếu vào mã QR (chỉ khi web chạy bằng http/https)
  }
};
