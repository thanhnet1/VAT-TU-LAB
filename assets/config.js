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
  groupNames: [
    'Thiết bị theo hệ thống',
    'Vật tư rời / không rõ nguồn / đo kiểm'
  ],

  // Đặt tên dễ hiểu cho sheet:  'id-sheet': 'Tên hiển thị'
  sheetLabels: {
    // 'trang-tinh14': 'Trang tính14 – Vật tư theo dõi tình trạng',
  },

  // Ý nghĩa các màu tô trong file Excel gốc
  colorMeaning: {
    // 'FFFF00': 'Cần kiểm tra lại',
    // 'FF0000': 'Hỏng / mất',
  },

  // Số dòng tối đa hiển thị khi tìm kiếm toàn bộ
  maxSearchResults: 400,

  // ====== ĐỒNG BỘ NHIỀU THIẾT BỊ (Firebase) ======
  sync: {
    provider: 'firebase',
    workspace: 'lab-xvt',
    firebase: {
      apiKey: "AIzaSyAzE8Eb7Jd2j2FTt6nVw3gJ57ENBV-soeA",
      authDomain: "minigame-8a94c.firebaseapp.com",
      projectId: "minigame-8a94c",
      appId: "1:604735984087:web:5f33810121c3be91c6bb92"
    }
  },

  // ====== PHIẾU XUẤT KHO / NHẬP KHO ======
  slip: {
    orgLine1: 'Tổng Công Ty Hạ tầng mạng',
    orgLine2: 'Trung Tâm Hạ Tầng Mạng Miền Bắc - CN Tổng công ty Hạ tầng mạng',
    formNoXuat: 'Mẫu số: 02  VT-DN',
    formNoNhap: 'Mẫu số 1 VT -DN',
    kho: 'Kho-X.VT-28-PHAM-HUNG-NTL_HNI',
    numSuffix: 'X.VT-28PHG-KH01',
    startSeq: 1,
    unit: 'Cái',
    quality: 'Tốt',
    lien: '',
    thuTruong: '',
    ketToan: '',
    nguoiLap: '',
    thuKho: '',
    qrLink: true
  }
};
