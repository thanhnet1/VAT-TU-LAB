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
        'truyen dan', 'truyền dẫn', 'infinera', 'xtc10', 'xtc-10', 'xtc 10',
        'mtc-9', 'mtc9', 'mtc 9', 'otc9', 'otc-9', 'otc 9', 'otc5', 'otc-5', 'otc 5',
        'ciena', '5430', 'ome', 'nokia', 'bb1', 'huawei', 'hw', '6800', '8800',
        '7500', '3500', '9500', '3900', 'alcatel', 'alu', '1850', '1830', '1660', '1662',
        'ericson', 'ericsson', 'ribbon'
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
              matchKeywords: ['mtc-9', 'mtc9', 'mtc 9']
            },
            {
              id: 'otc9',
              label: 'OTC 9',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['otc9', 'otc-9', 'otc 9', 'otc5', 'otc-5', 'otc 5']
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
              id: '5430',
              label: '5430',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['5430', 'ciena 5430']
            },
            {
              id: 'ome',
              label: 'OME',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['ome', '32 slot', '16 slot', 'ciena ome']
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
          id: 'td-huawei',
          label: 'Hua wei',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['huawei', 'hua wei'],
          children: [
            {
              id: 'hw-6800-8800',
              label: 'HW 6800 - 8800',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['6800', '8800', 'hw 6800', 'hw 8800', 'hw-6800', 'hw-8800']
            },
            {
              id: 'hw-7500-3500',
              label: 'HW 7500 - 3500',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['7500', '3500', 'hw 7500', 'hw 3500', 'hw-7500', 'hw-3500']
            },
            {
              id: 'hw-9500-3900',
              label: 'HW 9500 - 3900',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['9500', '3900', 'hw 9500', 'hw 3900', 'hw-9500', 'hw-3900']
            }
          ]
        },
        {
          id: 'td-alcatel',
          label: 'Alcatel',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['alcatel'],
          children: [
            {
              id: 'alu-1850-1830',
              label: 'Alu 1850 - 1830',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['1850', '1830', 'alu 1850', 'alu 1830', 'alu-1850', 'alu-1830']
            },
            {
              id: 'alu-1660-1662',
              label: 'Alu 1660 - 1662',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['1660', '1662', 'alu 1660', 'alu 1662', 'alu-1660', 'alu-1662']
            },
            {
              id: 'alu-bb',
              label: 'Alu - BB',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['alu - bb', 'alu bb', 'alu-bb', 'alcatel bb']
            }
          ]
        },
        {
          id: 'ericson-ribbon',
          label: 'EricSon - Ribbon',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['ericson', 'ericsson', 'ribbon']
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
      id: 'thiet-bi-vsat',
      label: 'Thiết bị VSAT',
      icon: '🛰️',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['vsat', 've tinh', 'vệ tinh']
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
      id: 'vat-tu-do-kiem',
      label: 'Vật tư đo kiểm',
      icon: '📏',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['do kiem', 'đo kiểm', 'may do', 'máy đo']
    },
    {
      id: 'vat-tu-sua-chua',
      label: 'Vật tư sửa chữa',
      icon: '🛠️',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['sua chua', 'sửa chữa', 'linh kien', 'linh kiện']
    },
    {
      id: 'vat-tu-khong-ro-nguon-goc',
      label: 'Vật tư - không rõ nguồn gốc',
      icon: '❓',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['khong ro', 'không rõ', 'nguon goc', 'nguồn gốc', 'ton khac', 'tồn khác'],
      defaultGroup: 1
    },
    {
      id: 'tai-san',
      label: 'Tài sản',
      icon: '🏢',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['tai san', 'tài sản', 'ccdc', 'tscd'],
      children: [
        {
          id: 'tai-san-khong-ro-nguon-goc',
          label: 'Không rõ nguồn gốc',
          icon: '❓',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['tai san khong ro', 'tài sản không rõ', 'khong ro nguon goc']
        }
      ]
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
    'otc5': 'otc9',
    'otc-5': 'otc9',
    'otc 5': 'otc9',
    '5430': '5430',
    'ciena-5430': '5430',
    'ome': 'ome',
    'ciena-ome': 'ome',
    'nokia-bb1': 'nokia-bb1',
    'nokia': 'nokia-bb1',
    'bb1': 'nokia-bb1',
    'hw-6800-8800': 'hw-6800-8800',
    'hw-7500-3500': 'hw-7500-3500',
    'hw-9500-3900': 'hw-9500-3900',
    'alu-1850-1830': 'alu-1850-1830',
    'alu-1660-1662': 'alu-1660-1662',
    'alu-bb': 'alu-bb',
    'ericson-ribbon': 'ericson-ribbon',
    'ericsson': 'ericson-ribbon',
    'ribbon': 'ericson-ribbon',
    'thiet-bi-ip': 'thiet-bi-ip',
    'thiet-bi-vsat': 'thiet-bi-vsat',
    'thiet-bi-vo-tuyen': 'thiet-bi-vo-tuyen',
    'vat-tu-do-kiem': 'vat-tu-do-kiem',
    'vat-tu-sua-chua': 'vat-tu-sua-chua',
    'vat-tu-khong-ro-nguon-goc': 'vat-tu-khong-ro-nguon-goc',
    'tai-san': 'tai-san',
    'tai-san-khong-ro-nguon-goc': 'tai-san-khong-ro-nguon-goc'
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
    'otc5': 'otc9',
    'otc-5': 'otc9',
    'otc 5': 'otc9',
    '5430': '5430',
    'ome': 'ome',
    'ome 32 slot': 'ome',
    'ome 16 slot': 'ome',
    'nokia - bb1': 'nokia-bb1',
    'nokia bb1': 'nokia-bb1',
    'hw 6800 - 8800': 'hw-6800-8800',
    'hw 7500 - 3500': 'hw-7500-3500',
    'hw 9500 - 3900': 'hw-9500-3900',
    'alu 1850 - 1830': 'alu-1850-1830',
    'alu 1660 - 1662': 'alu-1660-1662',
    'alu - bb': 'alu-bb',
    'ericson - ribbon': 'ericson-ribbon',
    'ericsson - ribbon': 'ericson-ribbon'
  },

  sheetLabels: {
    'xtc10': 'XTC10',
    'mtc9': 'MTC 9',
    'otc9': 'OTC 9',
    '5430': '5430',
    'ome': 'OME',
    'nokia-bb1': 'Nokia - BB1',
    'hw-6800-8800': 'HW 6800 - 8800',
    'hw-7500-3500': 'HW 7500 - 3500',
    'hw-9500-3900': 'HW 9500 - 3900',
    'alu-1850-1830': 'Alu 1850 - 1830',
    'alu-1660-1662': 'Alu 1660 - 1662',
    'alu-bb': 'Alu - BB',
    'ericson-ribbon': 'EricSon - Ribbon',
    'thiet-bi-ip': 'Thiết bị IP',
    'thiet-bi-vsat': 'Thiết bị VSAT',
    'thiet-bi-vo-tuyen': 'Thiết bị vô tuyến',
    'vat-tu-do-kiem': 'Vật tư đo kiểm',
    'vat-tu-sua-chua': 'Vật tư sửa chữa',
    'vat-tu-khong-ro-nguon-goc': 'Vật tư - không rõ nguồn gốc',
    'tai-san': 'Tài sản',
    'tai-san-khong-ro-nguon-goc': 'Không rõ nguồn gốc'
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
