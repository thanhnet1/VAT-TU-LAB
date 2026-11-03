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
  maxSearchResults: 400
};

