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

  // Khoá lưu chỉnh sửa trong trình duyệt
  storageKey: 'lab-xvt-v1',

  // Tên nhóm ở thanh bên (dự phòng)
  groupNames: [
    'Thiết bị theo hệ thống',
    'Vật tư rời / không rõ nguồn / đo kiểm'
  ],

  // ====== CẤU HÌNH CÂY THƯ MỤC ĐA CẤP THEO SƠ ĐỒ ======
  treeMenu: [
    {
      id: 'thiet-bi-truyen-dan',
      label: 'Thiết bị Truyền dẫn',
      icon: '📡',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: [
        'truyen dan', 'truyền dẫn', 'infinera', 'xtc10', 'mtc-9', 'mtc9',
        'ciena', '5430', 'ome', 'nokia', 'bb1', 'huawei', 'hw', '6800', '8800',
        '7500', '3500', '9500', 'alcatel', 'alu', '1850', '1830', '1660', '1662',
        'ericson', 'ericsson'
      ],
      defaultGroup: 0,
      children: [
        {
          id: 'td-infinera',
          label: 'Infinera',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['infinera', 'xtc10', 'mtc-9', 'mtc9'],
          children: [
            {
              id: 'td-infinera-xtc10',
              label: 'XTC10',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['xtc10']
            },
            {
              id: 'td-infinera-mtc9',
              label: 'MTC-9',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['mtc-9', 'mtc9']
            }
          ]
        },
        {
          id: 'td-ciena',
          label: 'Ciena',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['ciena', '5430', 'ome'],
          children: [
            {
              id: 'td-ciena-5430',
              label: '5430',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['5430']
            },
            {
              id: 'td-ciena-ome',
              label: 'OME 32 slot, OME 19 slot',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['ome', '32 slot', '19 slot']
            }
          ]
        },
        {
          id: 'td-nokia-bb1',
          label: 'Nokia - BB1',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['nokia', 'bb1']
        },
        {
          id: 'td-huawei',
          label: 'HuaWei',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['huawei', 'hw', '6800', '8800', '7500', '3500', '9500'],
          children: [
            {
              id: 'td-hw-6800-8800',
              label: 'HW 6800 - 8800',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['6800', '8800']
            },
            {
              id: 'td-hw-7500-3500',
              label: 'HW 7500 - 3500',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['7500', '3500']
            },
            {
              id: 'td-hw-9500-b1',
              label: 'HW 9500 - B1',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['9500', 'b1']
            }
          ]
        },
        {
          id: 'td-alcatel',
          label: 'Alcatel',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['alcatel', 'alu', '1850', '1830', '1660', '1662'],
          children: [
            {
              id: 'td-alu-1850-1830',
              label: 'Alu - 1850 - 1830',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['1850', '1830']
            },
            {
              id: 'td-alu-bb',
              label: 'Alu - BB',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['alu - bb', 'alcatel bb']
            },
            {
              id: 'td-alu-1660-1662',
              label: 'Alu - 1660 - 1662',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['1660', '1662']
            }
          ]
        },
        {
          id: 'td-ericson',
          label: 'Ericson',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['ericson', 'ericsson']
        },
        {
          id: 'td-them',
          label: 'Thêm',
          icon: '➕',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['them', 'thêm', 'khac', 'khác']
        }
      ]
    },
    {
      id: 'thiet-bi-ip',
      label: 'Thiết bị IP',
      icon: '🌐',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['ip', 'router', 'switch', 'cisco', 'juniper', 'asr', 'mx', 'ne40']
    },
    {
      id: 'thiet-bi-vo-tuyen',
      label: 'Thiết bị vô tuyến',
      icon: '📻',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['vo tuyen', 'vô tuyến', 'radio', 'bts', 'nodeb', 'rru', 'bbu', 'viba']
    },
    {
      id: 'thiet-bi-vsat',
      label: 'Thiết bị VSAT',
      icon: '🛰️',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['vsat', 've tinh', 'vệ tinh']
    },
    {
      id: 'tai-san',
      label: 'Tài sản',
      icon: '🏢',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['tai san', 'tài sản', 'ccdc', 'tscd']
    },
    {
      id: 'khong-ro-nguon-goc',
      label: 'Không rõ nguồn gốc',
      icon: '❓',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['khong ro', 'không rõ', 'nguon goc', 'nguồn gốc', 'ton khac', 'tồn khác'],
      defaultGroup: 1
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
