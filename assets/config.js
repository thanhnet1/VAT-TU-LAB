/* =====================================================================
   CẤU HÌNH WEB APP – TÀI SẢN VẬT TƯ LAB
   ===================================================================== */
window.APP_CONFIG = {
  // Tiêu đề hiển thị trên thanh trên cùng
  title: 'Tài sản – Vật tư Truyền dẫn LAB',
  subtitle: 'LAB XVT',

  // Tên cột tích chọn (ô ☑ ở cột A của file Excel gốc)
  checkLabel: 'Đã kiểm',

  // Khoá lưu chỉnh sửa trong trình duyệt
  storageKey: 'lab-xvt-v1',

  // Tên nhóm ở thanh bên
  groupNames: [
    'Thiết bị theo hệ thống',
    'Vật tư rời / không rõ nguồn / đo kiểm'
  ],

  sheetLabels: {},
  colorMeaning: {},
  maxSearchResults: 400,

  // ====== CẤU HÌNH PHÂN QUYỀN TÊN ĐĂNG NHẬP (Đăng nhập bằng Tên) ======
  authUsers: {
    'admin': {
      email: 'admin@lab-xvt.local',
      role: 'admin', // Quyền cao nhất: toàn quyền chỉnh sửa, thêm xóa, duyệt
      name: 'Quản trị viên'
    },
    'khach': {
      email: 'khach@lab-xvt.local',
      role: 'guest', // Khách: chỉ xem phiếu xuất kho và xác nhận đã nhận
      name: 'Khách xem kho'
    }
  },

  // ====== KẾT NỐI FIREBASE (Đồng bộ nhiều thiết bị) ======
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
