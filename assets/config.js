/* =====================================================================
   CẤU HÌNH WEB APP – TÀI SẢN VẬT TƯ LAB
   ===================================================================== */
window.APP_CONFIG = {
  // Tiêu đề hiển thị trên thanh trên cùng
  title: 'Tài sản – Vật tư Truyền dẫn LAB',
  subtitle: 'LAB XVT',

  // Cột Nguồn thay thế tick "Đã kiểm"
  sourceLabel: 'Nguồn',
  sourceOptions: [
    'Vật tư',
    'Tài sản',
    'Đo kiểm',
    'Sửa chữa',
    'Không rõ nguồn'
  ],
  defaultSource: 'Không rõ nguồn',

  // Cấu trúc chuẩn các bảng thống kê vật tư / tài sản
  tableColumns: [
    'Nguồn',
    'STT',
    'Tên Vật Tư',
    'Serial',
    'Mã VT',
    'Part number',
    'Ghi chú'
  ],

  // Kiểu hiển thị bảng thống kê ngang và tách mỗi mục thành 1 sheet khi xuất Excel
  tableLayout: 'horizontal',
  exportEachItemAsSheet: true,

  // Khoá lưu chỉnh sửa trong trình duyệt
  storageKey: 'lab-xvt-v1',

  // Tên nhóm ở thanh bên (dự phòng)
  groupNames: [
    'Thiết bị theo hệ thống',
    'Vật tư rời / không rõ nguồn / đo kiểm'
  ],

  // ====== CẤU HÌNH CÂY THƯ MỤC RÚT GỌN THEO ẢNH MẪU ======
  treeMenu: [
    {
      id: 'truyen-dan-thiet-bi',
      label: 'Truyền dẫn Thiết bị',
      icon: '📡',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: [
        'truyen dan', 'truyền dẫn', 'infinera', 'xtc10', 'xtc-10', 'xtc 10',
        'mtc9', 'mtc-9', 'mtc 9', 'otc9', 'otc-9', 'otc 9',
        'ciena', '5430', 'ome', 'bb',
        'huawei', 'hw', '6800', '8800', '7500', '3500', '3900',
        'nokia', 'bb1', 'ribbon', 'ericson', 'ericsson'
      ],
      defaultGroup: 0,
      children: [
        {
          id: 'td-infinera',
          label: 'Infinera',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['infinera'],
          children: [
            {
              id: 'xtc10',
              label: 'XTC10',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['xtc10', 'xtc-10', 'xtc 10']
            },
            {
              id: 'mtc9',
              label: 'MTC 9',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['mtc9', 'mtc-9', 'mtc 9']
            },
            {
              id: 'otc9',
              label: 'OTC 9',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['otc9', 'otc-9', 'otc 9']
            }
          ]
        },
        {
          id: 'td-ciena',
          label: 'Ciena',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['ciena'],
          children: [
            {
              id: 'ciena-5430',
              label: '5430',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['5430', 'ciena 5430']
            },
            {
              id: 'ciena-ome',
              label: 'OME',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['ome', 'ciena ome']
            },
            {
              id: 'ciena-bb',
              label: 'BB',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['ciena bb', 'bb']
            }
          ]
        },
        {
          id: 'td-huawei',
          label: 'Huawei',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['huawei', 'hua wei', 'hw'],
          children: [
            {
              id: 'hw-6800',
              label: 'HW 6800',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 6800', 'hw6800', 'hw-6800', '6800']
            },
            {
              id: 'hw-8800',
              label: 'HW 8800',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 8800', 'hw8800', 'hw-8800', '8800']
            },
            {
              id: 'hw-7500',
              label: 'HW 7500',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 7500', 'hw7500', 'hw-7500', '7500']
            },
            {
              id: 'hw-3500',
              label: 'HW 3500',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 3500', 'hw3500', 'hw-3500', '3500']
            },
            {
              id: 'hw-3900',
              label: 'HW 3900',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 3900', 'hw3900', 'hw-3900', '3900']
            }
          ]
        },
        {
          id: 'nokia-bb1',
          label: 'Nokia - BB1',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['nokia', 'bb1', 'nokia - bb1', 'nokia bb1']
        },
        {
          id: 'ribbon-ericson',
          label: 'Ribbon - Ericson',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['ribbon', 'ericson', 'ericsson', 'ribbon - ericson', 'ribbon - ericsson']
        }
      ]
    },
    {
      id: 'thiet-bi-ip',
      label: 'Thiết bị IP',
      icon: '🌐',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['ip', 'thiet bi ip', 'thiết bị ip', 'router', 'switch']
    },
    {
      id: 'thiet-bi-vsat',
      label: 'Thiết bị VSAT',
      icon: '🛰️',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['vsat', 'thiet bi vsat', 'thiết bị vsat', 've tinh', 'vệ tinh']
    },
    {
      id: 'thiet-bi-vo-tuyen',
      label: 'Thiết bị vô tuyến',
      icon: '📻',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['vo tuyen', 'vô tuyến', 'thiet bi vo tuyen', 'thiết bị vô tuyến', 'radio']
    },
    {
      id: 'vat-tu-do-luong',
      label: 'Vật tư đo lường',
      icon: '📏',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['do luong', 'đo lường', 'vat tu do luong', 'vật tư đo lường']
    },
    {
      id: 'vat-tu-sua-chua',
      label: 'Vật tư sửa chữa',
      icon: '🛠️',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['sua chua', 'sửa chữa', 'vat tu sua chua', 'vật tư sửa chữa']
    },
    {
      id: 'vat-tu-khong-ro-nguon-goc',
      label: 'Vật tư không rõ nguồn gốc',
      icon: '❓',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['khong ro nguon goc', 'không rõ nguồn gốc', 'khong ro', 'không rõ'],
      defaultGroup: 1
    },
    {
      id: 'tai-san',
      label: 'Tài sản',
      icon: '🏢',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['tai san', 'tài sản']
    }
  ],

  // ====== ÁNH XẠ CÁC BẢNG / SHEET CON VỀ ĐÚNG THƯ MỤC ĐÍCH ======
  sheetRouteMap: {
    'xtc10': 'xtc10',
    'xtc-10': 'xtc10',
    'xtc 10': 'xtc10',
    'mtc9': 'mtc9',
    'mtc-9': 'mtc9',
    'mtc 9': 'mtc9',
    'otc9': 'otc9',
    'otc-9': 'otc9',
    'otc 9': 'otc9',
    'ciena-5430': 'ciena-5430',
    '5430': 'ciena-5430',
    'ciena-ome': 'ciena-ome',
    'ome': 'ciena-ome',
    'ciena-bb': 'ciena-bb',
    'bb': 'ciena-bb',
    'hw-6800': 'hw-6800',
    'hw-8800': 'hw-8800',
    'hw-7500': 'hw-7500',
    'hw-3500': 'hw-3500',
    'hw-3900': 'hw-3900',
    'nokia-bb1': 'nokia-bb1',
    'nokia': 'nokia-bb1',
    'bb1': 'nokia-bb1',
    'ribbon-ericson': 'ribbon-ericson',
    'ribbon': 'ribbon-ericson',
    'ericson': 'ribbon-ericson',
    'ericsson': 'ribbon-ericson',
    'thiet-bi-ip': 'thiet-bi-ip',
    'thiet-bi-vsat': 'thiet-bi-vsat',
    'thiet-bi-vo-tuyen': 'thiet-bi-vo-tuyen',
    'vat-tu-do-luong': 'vat-tu-do-luong',
    'vat-tu-sua-chua': 'vat-tu-sua-chua',
    'vat-tu-khong-ro-nguon-goc': 'vat-tu-khong-ro-nguon-goc',
    'tai-san': 'tai-san'
  },

  // ====== TÁCH BẢNG / MỤC CON THEO TÊN BLOCK VÀ ĐƯA VỀ ĐÚNG THƯ MỤC ======
  splitTablesByTitle: true,
  blockRouteMap: {
    'xtc10': 'xtc10',
    'xtc-10': 'xtc10',
    'xtc 10': 'xtc10',
    'mtc9': 'mtc9',
    'mtc-9': 'mtc9',
    'mtc 9': 'mtc9',
    'otc9': 'otc9',
    'otc-9': 'otc9',
    'otc 9': 'otc9',
    '5430': 'ciena-5430',
    'ome': 'ciena-ome',
    'bb': 'ciena-bb',
    'hw 6800': 'hw-6800',
    'hw 8800': 'hw-8800',
    'hw 7500': 'hw-7500',
    'hw 3500': 'hw-3500',
    'hw 3900': 'hw-3900',
    'nokia - bb1': 'nokia-bb1',
    'nokia bb1': 'nokia-bb1',
    'ribbon - ericson': 'ribbon-ericson',
    'ribbon - ericsson': 'ribbon-ericson',
    'thiet bi ip': 'thiet-bi-ip',
    'thiet bi vsat': 'thiet-bi-vsat',
    'thiet bi vo tuyen': 'thiet-bi-vo-tuyen',
    'vat tu do luong': 'vat-tu-do-luong',
    'vat tu sua chua': 'vat-tu-sua-chua',
    'vat tu khong ro nguon goc': 'vat-tu-khong-ro-nguon-goc',
    'tai san': 'tai-san'
  },

  sheetLabels: {
    'xtc10': 'XTC10',
    'mtc9': 'MTC 9',
    'otc9': 'OTC 9',
    'ciena-5430': '5430',
    'ciena-ome': 'OME',
    'ciena-bb': 'BB',
    'hw-6800': 'HW 6800',
    'hw-8800': 'HW 8800',
    'hw-7500': 'HW 7500',
    'hw-3500': 'HW 3500',
    'hw-3900': 'HW 3900',
    'nokia-bb1': 'Nokia - BB1',
    'ribbon-ericson': 'Ribbon - Ericson',
    'thiet-bi-ip': 'Thiết bị IP',
    'thiet-bi-vsat': 'Thiết bị VSAT',
    'thiet-bi-vo-tuyen': 'Thiết bị vô tuyến',
    'vat-tu-do-luong': 'Vật tư đo lường',
    'vat-tu-sua-chua': 'Vật tư sửa chữa',
    'vat-tu-khong-ro-nguon-goc': 'Vật tư không rõ nguồn gốc',
    'tai-san': 'Tài sản'
  },

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
      role: 'admin',
      name: 'Quản trị viên'
    },
    'khach': {
      email: 'khach@lab-xvt.local',
      role: 'guest',
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
  }
};
