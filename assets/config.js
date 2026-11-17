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

  // Tên nhóm ở thanh bên (dự phòng)
  groupNames: [
    'Thiết bị theo hệ thống',
    'Vật tư rời / không rõ nguồn / đo kiểm'
  ],

  // ====== CÂU HÌNH CÂY THƯ MỤC ĐA CẤP (Theo sơ đồ mẫu) ======
  treeMenu: [
    {
      id: 'kho',
      label: 'Kho vật tư',
      icon: '📦',
      type: 'slips',
      children: [
        { id: 'xuat', label: 'Phiếu xuất', href: '#/xuat' },
        { id: 'nhap', label: 'Phiếu nhập', href: '#/nhap' }
      ]
    },
    {
      id: 'truyen-dan',
      label: 'Truyền dẫn',
      icon: '📡',
      children: [
        {
          id: 'td-he-thong',
          label: 'Thiết bị theo hệ thống',
          isDynamicGroup: true,
          matchKeywords: ['xtc', 'mtc', 'ciena', 'ome', 'nokia', 'bb1', 'pss', 'hw', '3500', '7520', '6800', '8800', 'alu', '1850', '1830', '1660', '1662', '9800', 'ericson', 'ericsson'],
          defaultGroup: 0
        }
      ]
    },
    {
      id: 'thiet-bi-ip',
      label: 'Thiết bị IP',
      icon: '🌐',
      children: [
        {
          id: 'ip-he-thong',
          label: 'Thiết bị theo hệ thống',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['ip', 'router', 'switch', 'cisco', 'juniper', 'asr', 'mx', 'ne40']
        }
      ]
    },
    {
      id: 'vo-tuyen',
      label: 'Thiết bị vô tuyến',
      icon: '📻',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['vo tuyen', 'vô tuyến', 'radio', 'bts', 'nodeb', 'rru', 'bbu', 'viba']
    },
    {
      id: 'vsat',
      label: 'Thiết bị VSAT',
      icon: '🛰️',
      isDynamicGroup: true,
      matchKeywords: ['vsat', 've tinh', 'vệ tinh']
    },
    {
      id: 'do-kiem',
      label: 'Vật tư đo kiểm',
      icon: '🛠️',
      isDynamicGroup: true,
      matchKeywords: ['do kiem', 'đo kiểm', 'may do', 'máy đo', 'otdr', 'exfo', 'anritsu', 'viavi', 'vat tu roi', 'vật tư rời'],
      defaultGroup: 1
    },
    {
      id: 'khong-ro-nguon',
      label: 'Vật tư không rõ nguồn gốc',
      icon: '❓',
      isDynamicGroup: true,
      matchKeywords: ['khong ro', 'không rõ', 'nguon goc', 'nguồn gốc', 'ton khac', 'tồn khác']
    },
    {
      id: 'tai-san',
      label: 'Tài sản',
      icon: '🏢',
      isDynamicGroup: true,
      matchKeywords: ['tai san', 'tài sản', 'ccdc', 'tscd']
    }
  ],

  sheetLabels: {},
  colorMeaning: {
    'FFFF00': 'Hỏng / Cần xử lý',
    'FFC000': 'Đang mượn / Điều phối',
    '00B0F0': 'Đã nhập kho / Hoàn thành',
    '00B050': 'Mới / Tốt'
  },
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
    databaseURL: "https://minigame-8a94c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "minigame-8a94c",
    storageBucket: "minigame-8a94c.firebasestorage.app",
    messagingSenderId: "604735984087",
    appId: "1:604735984087:web:83b5926e168efb02c6bb92",
    measurementId: "G-4FXBFBE74T"
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
