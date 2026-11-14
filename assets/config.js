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
  <script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAzE8Eb7Jd2j2FTt6nVw3gJ57ENBV-soeA",
    authDomain: "minigame-8a94c.firebaseapp.com",
    databaseURL: "https://minigame-8a94c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "minigame-8a94c",
    storageBucket: "minigame-8a94c.firebasestorage.app",
    messagingSenderId: "604735984087",
    appId: "1:604735984087:web:882f08736a7b9f56c6bb92",
    measurementId: "G-4T15Z1TDDN"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>

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
