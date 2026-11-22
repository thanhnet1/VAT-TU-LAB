/* =====================================================================
   CẤU HÌNH WEB APP – VẬT TƯ – TÀI SẢN
   ===================================================================== */
window.APP_CONFIG = {
  title: 'Tài sản – Vật tư Truyền dẫn LAB',
  subtitle: 'Vật tư – Tài sản',

  sourceLabel: 'Nguồn',
  sourceOptions: [
    'Vật tư',
    'Tài sản',
    'Đo kiểm',
    'Sửa chữa',
    'Không rõ nguồn'
  ],
  defaultSource: 'Không rõ nguồn',

  tableColumns: [
    'Nguồn',
    'STT',
    'Tên Vật Tư',
    'Serial',
    'Mã VT',
    'Part number',
    'Ghi chú'
  ],

  storageKey: 'vat-tu-tai-san-lab-v2',

  groupNames: [
    'Truyền dẫn & Thiết bị',
    'Vật tư & Tài sản khác'
  ],

  // Cấu hình hành vi giao diện & tìm kiếm
  features: {
    globalSearchOnOverview: true,
    scopedSearchInFolder: true,
    showAddItemButton: true,
    highlightAddFolderOnOverview: true,
    showTreeFolderButtons: false
  },

  treeMenu: [
    {
      id: 'truyen-dan-thiet-bi',
      label: 'Truyền dẫn Thiết bị',
      icon: '📡',
      isDynamicGroup: true,
      allowCreate: true,
      defaultGroup: 0,
      matchKeywords: [
        'truyen dan', 'truyền dẫn', 'thiet bi', 'thiết bị',
        'infinera', 'xtc10', 'mtc9', 'otc9',
        'ciena', '5430', '6500t', 'ome', 'ome6500',
        'huawei', 'hw', '6800', '8800', '7500', '3500', '3900',
        'nokia', 'ribbon', 'ericson', 'ericsson',
        'alcatel', '1850', '1830', '1660', '1662', 'pss16', 'pss_64', 'mhl3000', 'oms3255'
      ],
      children: [
        {
          id: 'td-infinera',
          label: 'Infinera',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['infinera', 'xtc10', 'mtc9', 'otc9'],
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
              label: 'MTC9',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['mtc9', 'mtc-9', 'mtc 9']
            },
            {
              id: 'otc9',
              label: 'OTC9',
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
          matchKeywords: ['ciena', '5430', '6500t', 'ome', 'ome6500', 'ciena bb'],
          children: [
            {
              id: 'ciena-5430',
              label: '5430',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['5430', 'ciena 5430', '6500t']
            },
            {
              id: 'ciena-ome',
              label: 'OME',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['ome', 'ome6500', 'ciena ome']
            },
            {
              id: 'ciena-bb',
              label: 'BB',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['ciena bb', 'bb ciena']
            }
          ]
        },
        {
          id: 'td-huawei',
          label: 'Huawei',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['huawei', 'hw 6800', 'hw 8800', 'hw 7500', 'hw 3500', 'hw 3900'],
          children: [
            {
              id: 'hw-6800',
              label: 'HW 6800',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 6800', 'hw6800', '6800']
            },
            {
              id: 'hw-8800',
              label: 'HW 8800',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 8800', 'hw8800', '8800']
            },
            {
              id: 'hw-7500',
              label: 'HW 7500',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 7500', 'hw7500', '7500']
            },
            {
              id: 'hw-3500',
              label: 'HW 3500',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 3500', 'hw3500', '3500']
            },
            {
              id: 'hw-3900',
              label: 'HW 3900',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['hw 3900', 'hw3900', '3900']
            }
          ]
        },
        {
          id: 'td-nokia',
          label: 'Nokia',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['nokia', 'nokia bb', 'nokia-bb1'],
          children: [
            {
              id: 'nokia-bb',
              label: 'BB',
              icon: '📄',
              isDynamicGroup: true,
              allowCreate: true,
              matchKeywords: ['nokia bb', 'bb nokia', 'nokia', 'nokia-bb1']
            }
          ]
        },
        {
          id: 'ribbon-ericson',
          label: 'Ribbon - Ericson',
          icon: '📁',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['ribbon', 'ericson', 'ericsson', 'mhl3000', 'oms3255']
        }
      ]
    },
    {
      id: 'thiet-bi-ip',
      label: 'Thiết bị IP',
      icon: '🌐',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['thiet bi ip', 'thiết bị ip', 'ip', 'router', 'switch', 'asr9010', 'mx2008', 'mx2000', 'mx960', 'ne40e', 'a9k', 'a99', 'tao moi', 'tạo mới', 'tao mo', 'tạo mở'],
      children: [
        {
          id: 'ip-tao-moi',
          label: 'Tạo mới',
          icon: '📄',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['tao moi', 'tạo mới']
        },
        {
          id: 'ip-tao-mo',
          label: 'Tạo mở',
          icon: '📄',
          isDynamicGroup: true,
          allowCreate: true,
          matchKeywords: ['tao mo', 'tạo mở']
        }
      ]
    },
    {
      id: 'thiet-bi-vsat',
      label: 'Thiết bị VSAT',
      icon: '🛰️',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['vsat', 'thiet bi vsat', 'thiết bị vsat', 've tinh', 'vệ tinh', 'skyedge', 'lnb', 'buc', 'soundwin']
    },
    {
      id: 'thiet-bi-vo-tuyen',
      label: 'Thiết bị vô tuyến',
      icon: '📻',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['vo tuyen', 'vô tuyến', 'thiet bi vo tuyen', 'thiết bị vô tuyến', 'radio', 'rrus', 'baseband', 'bts', 'rru']
    },
    {
      id: 'vat-tu-do-luong',
      label: 'Vật tư đo lường',
      icon: '📏',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['do luong', 'đo lường', 'vat tu do luong', 'vật tư đo lường', 'do kiem', 'đo kiểm', 'vt do kiem', 'vt-do-kiem']
    },
    {
      id: 'vat-tu-sua-chua',
      label: 'Vật tư sửa chữa',
      icon: '🛠️',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: ['sua chua', 'sửa chữa', 'vat tu sua chua', 'vật tư sửa chữa', 'trang-tinh14']
    },
    {
      id: 'vat-tu-khong-ro-nguon-goc',
      label: 'Vật tư không rõ nguồn gốc',
      icon: '❓',
      isDynamicGroup: true,
      allowCreate: true,
      defaultGroup: 1,
      matchKeywords: ['khong ro nguon goc', 'không rõ nguồn gốc', 'khong ro', 'không rõ', 'khong-ro-ng', 'hang-ton-kho', 'ton-kho-xvt']
    },
    {
      id: 'tai-san',
      label: 'Tài sản',
      icon: '🏢',
      isDynamicGroup: true,
      allowCreate: true,
      defaultGroup: 1,
      matchKeywords: ['tai san', 'tài sản', 'tscd', 'ccdc']
    }
  ],

  sheetRouteMap: {
    'xtc10': 'xtc10',
    'mtc9': 'mtc9',
    'otc9': 'otc9',
    'ciena-5430': 'ciena-5430',
    'ome6500-14slot': 'ciena-ome',
    'ome6500-32slot': 'ciena-ome',
    'nokia-bb1': 'nokia-bb',
    'hw9500-ericson': 'ribbon-ericson',
    'trang-tinh14': 'vat-tu-sua-chua',
    'khong-ro-ng': 'vat-tu-khong-ro-nguon-goc',
    'vt-do-kiem': 'vat-tu-do-luong',
    'hang-ton-kho': 'vat-tu-khong-ro-nguon-goc',
    'ton-kho-xvt-26-10-2026': 'vat-tu-khong-ro-nguon-goc'
  },

  splitTablesByTitle: true,
  blockRouteMap: {
    'xtc10': 'xtc10',
    'mtc9': 'mtc9',
    'otc9': 'otc9',
    'ciena 5430': 'ciena-5430',
    'ciena 6500t': 'ciena-5430',
    'ome6500 _ 14 slot': 'ciena-ome',
    'ome6500 dd _ 32 slot': 'ciena-ome',
    'nokia bb1': 'nokia-bb',
    'hw3500': 'hw-3500',
    'hw7500': 'hw-7500',
    'hw3900': 'hw-3900',
    'hw6800': 'hw-6800',
    'hw8800': 'hw-8800',
    'hw9500': 'ribbon-ericson',
    'mhl3000': 'ribbon-ericson',
    'oms3255': 'ribbon-ericson',
    'vt đo kiểm': 'vat-tu-do-luong',
    'vt đo kiểm (tiếp)': 'vat-tu-do-luong',
    'không rõ ng': 'vat-tu-khong-ro-nguon-goc'
  },

  sheetLabels: {
    'xtc10': 'XTC10',
    'mtc9': 'MTC9',
    'otc9': 'OTC9',
    'ciena-5430': '5430',
    'ciena-ome': 'OME',
    'ciena-bb': 'Ciena_BB',
    'hw-6800': 'HW 6800',
    'hw-8800': 'HW 8800',
    'hw-7500': 'HW 7500',
    'hw-3500': 'HW 3500',
    'hw-3900': 'HW 3900',
    'nokia-bb': 'Nokia_BB',
    'ribbon-ericson': 'Ribbon - Ericson',
    'ip-tao-moi': 'IP_Tao moi',
    'ip-tao-mo': 'IP_Tao mo',
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
```[cite: 16]
