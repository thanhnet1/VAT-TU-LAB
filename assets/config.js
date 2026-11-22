/* =====================================================================
   assets/config.js – CẤU HÌNH HỆ THỐNG & CÂY THƯ MỤC (THEO SƠ ĐỒ MẪU)
   Phiên bản: 2026.11.22-7
   ===================================================================== */
window.APP_CONFIG = {
  title: 'Tài sản – Vật tư Truyền dẫn LAB',
  subtitle: 'Quản lý kho & thiết bị truyền dẫn',
  sourceLabel: 'Nguồn',
  sourceOptions: ['Vật tư', 'Tài sản', 'Đo kiểm', 'Sửa chữa', 'Không rõ nguồn'],
  defaultSource: 'Không rõ nguồn',
  tableColumns: ['Nguồn', 'STT', 'Tên Vật Tư', 'Serial', 'Mã VT', 'Part number', 'Ghi chú'],
  storageKey: 'vat-tu-tai-san-lab-v2',
  maxSearchResults: 400,
  splitTablesByTitle: true,

  // Cấu trúc cây thư mục chuẩn theo ảnh sơ đồ[cite: 13]
  treeMenu: [
    {
      id: 'truyen-dan-thiet-bi',
      label: 'Truyền dẫn Thiết bị',
      icon: '📁',
      defaultCollapsed: true,
      children: [
        {
          id: 'infinera',
          label: 'Infinera',
          icon: '📂',
          defaultCollapsed: true,
          children: [
            { id: 'xtc10', label: 'XTC10', icon: '📄', matchKeywords: ['xtc10', 'xtc-10'] },
            { id: 'mtc9', label: 'MTC9', icon: '📄', matchKeywords: ['mtc9', 'mtc-9'] },
            { id: 'otc9', label: 'OTC9', icon: '📄', matchKeywords: ['otc9', 'otc-9'] }
          ]
        },
        {
          id: 'ciena',
          label: 'Ciena',
          icon: '📂',
          defaultCollapsed: true,
          children: [
            { id: 'ciena-5430', label: '5430', icon: '📄', matchKeywords: ['5430', '6500t'] },
            { id: 'ciena-ome', label: 'OME', icon: '📄', matchKeywords: ['ome'] },
            { id: 'ciena-bb', label: 'BB', icon: '📄', matchKeywords: ['ciena bb', 'bb'] }
          ]
        },
        {
          id: 'huawei',
          label: 'Huawei',
          icon: '📂',
          defaultCollapsed: true,
          children: [
            { id: 'hw-6800', label: 'HW 6800', icon: '📄', matchKeywords: ['hw6800', 'hw 6800', '6800'] },
            { id: 'hw-8800', label: 'HW 8800', icon: '📄', matchKeywords: ['hw8800', 'hw 8800', '8800'] },
            { id: 'hw-7500', label: 'HW 7500', icon: '📄', matchKeywords: ['hw7500', 'hw 7500', '7500'] },
            { id: 'hw-3500', label: 'HW 3500', icon: '📄', matchKeywords: ['hw3500', 'hw 3500', '3500'] },
            { id: 'hw-3900', label: 'HW 3900', icon: '📄', matchKeywords: ['hw3900', 'hw 3900', '3900'] }
          ]
        },
        {
          id: 'nokia',
          label: 'Nokia',
          icon: '📂',
          defaultCollapsed: true,
          children: [
            { id: 'nokia-bb', label: 'BB1', icon: '📄', matchKeywords: ['nokia', 'bb1', '3kc'] }
          ]
        },
        {
          id: 'ribbon-ericson',
          label: 'Ribbon - Ericson',
          icon: '📄',
          matchKeywords: ['ribbon', 'ericson', 'ericsson', 'mhl3000', 'oms3255']
        }
      ]
    },
    {
      id: 'thiet-bi-ip',
      label: 'Thiết bị IP',
      icon: '📁',
      allowCreate: true,
      defaultCollapsed: true,
      matchKeywords: ['ip', 'router', 'switch', 'asr9010', 'mx2008', 'ne40e'],
      children: []
    },
    {
      id: 'thiet-bi-vsat',
      label: 'Thiết bị VSAT',
      icon: '📁',
      allowCreate: true,
      defaultCollapsed: true,
      matchKeywords: ['vsat', 'skyedge', 'lnb', 'buc'],
      children: []
    },
    {
      id: 'thiet-bi-vo-tuyen',
      label: 'Thiết bị vô tuyến',
      icon: '📁',
      allowCreate: true,
      defaultCollapsed: true,
      matchKeywords: ['vo tuyen', 'radio', 'rrus', 'baseband'],
      children: []
    },
    {
      id: 'vat-tu-do-luong',
      label: 'Vật tư đo lường',
      icon: '📄',
      matchKeywords: ['do luong', 'do kiem', 'vt do kiem']
    },
    {
      id: 'vat-tu-sua-chua',
      label: 'Vật tư sửa chữa',
      icon: '📄',
      matchKeywords: ['sua chua', 'hu hong']
    },
    {
      id: 'vat-tu-khong-ro-nguon-goc',
      label: 'Vật tư không rõ nguồn gốc',
      icon: '📄',
      matchKeywords: ['khong ro', 'ko ro nguon']
    },
    {
      id: 'tai-san',
      label: 'Tài sản',
      icon: '📁',
      allowCreate: true,
      defaultCollapsed: true,
      matchKeywords: ['tai san'],
      children: []
    }
  ],

  sheetRouteMap: {
    'xtc10': 'xtc10',
    'mtc9': 'mtc9',
    'otc9': 'otc9',
    'ciena-5430': 'ciena-5430',
    'ciena-ome': 'ciena-ome',
    'ciena-bb': 'ciena-bb',
    'hw-6800': 'hw-6800',
    'hw-8800': 'hw-8800',
    'hw-7500': 'hw-7500',
    'hw-3500': 'hw-3500',
    'hw-3900': 'hw-3900',
    'nokia-bb': 'nokia-bb',
    'ribbon-ericson': 'ribbon-ericson',
    'thiet-bi-ip': 'thiet-bi-ip',
    'thiet-bi-vsat': 'thiet-bi-vsat',
    'thiet-bi-vo-tuyen': 'thiet-bi-vo-tuyen',
    'vat-tu-do-luong': 'vat-tu-do-luong',
    'vt-do-kiem': 'vat-tu-do-luong',
    'vat-tu-sua-chua': 'vat-tu-sua-chua',
    'trang-tinh14': 'vat-tu-sua-chua',
    'vat-tu-khong-ro-nguon-goc': 'vat-tu-khong-ro-nguon-goc',
    'khong-ro-ng': 'vat-tu-khong-ro-nguon-goc',
    'tai-san': 'tai-san'
  },

  blockRouteMap: {
    'xtc10': 'xtc10',
    'mtc9': 'mtc9',
    'otc9': 'otc9',
    '5430': 'ciena-5430',
    'ome': 'ciena-ome',
    'bb': 'ciena-bb',
    'hw6800': 'hw-6800',
    'hw 6800': 'hw-6800',
    'hw8800': 'hw-8800',
    'hw 8800': 'hw-8800',
    'hw7500': 'hw-7500',
    'hw 7500': 'hw-7500',
    'hw3500': 'hw-3500',
    'hw 3500': 'hw-3500',
    'hw3900': 'hw-3900',
    'hw 3900': 'hw-3900',
    'nokia': 'nokia-bb',
    'bb1': 'nokia-bb',
    'ribbon': 'ribbon-ericson',
    'ericson': 'ribbon-ericson',
    'ericsson': 'ribbon-ericson'
  },

  sheetLabels: {
    'truyen-dan-thiet-bi': 'Truyền dẫn Thiết bị',
    'infinera': 'Infinera',
    'xtc10': 'XTC10',
    'mtc9': 'MTC9',
    'otc9': 'OTC9',
    'ciena': 'Ciena',
    'ciena-5430': '5430',
    'ciena-ome': 'OME',
    'ciena-bb': 'BB',
    'huawei': 'Huawei',
    'hw-6800': 'HW 6800',
    'hw-8800': 'HW 8800',
    'hw-7500': 'HW 7500',
    'hw-3500': 'HW 3500',
    'hw-3900': 'HW 3900',
    'nokia': 'Nokia',
    'nokia-bb': 'BB1',
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
    '92D050': 'Sẵn sàng sử dụng',
    '00B050': 'Tài sản đang quản lý',
    'FFFF00': 'Đang theo dõi / chờ kiểm tra',
    'FFC000': 'Đang mượn / điều chuyển',
    'FF0000': 'Hư hỏng / cần sửa chữa'
  },

  // Giữ nguyên cấu hình đồng bộ & tài khoản phân quyền
  authUsers: {
    admin: { email: 'admin@lab-xvt.local', role: 'admin' },
    khach: { email: 'khach@lab-xvt.local', role: 'guest' }
  },
  sync: {
    provider: (window.APP_CONFIG && window.APP_CONFIG.sync && window.APP_CONFIG.sync.provider) || 'firebase',
    workspace: (window.APP_CONFIG && window.APP_CONFIG.sync && window.APP_CONFIG.sync.workspace) || 'lab-xvt',
    firebase: (window.APP_CONFIG && window.APP_CONFIG.sync && window.APP_CONFIG.sync.firebase) || {}
  }
};
