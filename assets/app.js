/* =====================================================================
   assets/app.js – VẬT TƯ – TÀI SẢN
   - Cây thư mục chuẩn theo sơ đồ mẫu, thu gọn mặc định cho gọn mắt
   - Đồng bộ dữ liệu hai chiều mượt mà trên nhiều thiết bị (qua Sync)
   - Tổng quan thống kê + màu phân biệt trạng thái + trạng thái đồng bộ
   - Tìm kiếm toàn bộ tại Trang chủ, tìm trong thư mục tại từng thư mục
   - Nút "+ Thêm vật tư" với danh sách sổ Mã VT / Tên VT / Serial / Part number
   - Nút chuyển vật tư sang thư mục khác + Bảng cân đối mobile & desktop
   ===================================================================== */
(function () {
  'use strict';

  const BUILD = '2026.11.21-1';
  const SOURCE_OPTIONS = ['Vật tư', 'Tài sản', 'Đo kiểm', 'Sửa chữa', 'Không rõ nguồn'];
  const DEFAULT_SOURCE = 'Không rõ nguồn';
  const STANDARD_COLS = ['Nguồn', 'STT', 'Tên Vật Tư', 'Serial', 'Mã VT', 'Part number', 'Ghi chú'];

  const CFG = Object.assign({
    title: 'Tài sản – Vật tư Truyền dẫn LAB',
    subtitle: '',
    sourceLabel: 'Nguồn',
    sourceOptions: SOURCE_OPTIONS,
    defaultSource: DEFAULT_SOURCE,
    tableColumns: STANDARD_COLS,
    storageKey: 'vat-tu-tai-san-lab-v2',
    groupNames: ['Truyền dẫn & Thiết bị', 'Vật tư & Tài sản khác'],
    sheetRouteMap: {},
    blockRouteMap: {},
    sheetLabels: {},
    colorMeaning: {},
    maxSearchResults: 400,
    treeMenu: []
  }, window.APP_CONFIG || {});

  const SRC_LIST = Array.isArray(CFG.sourceOptions) && CFG.sourceOptions.length
    ? CFG.sourceOptions
    : SOURCE_OPTIONS;

  const COLOR_NAMES = {
    FFFF00: 'Vàng',
    FF0000: 'Đỏ',
    '92D050': 'Xanh lá nhạt',
    '00B050': 'Xanh lá',
    '00B0F0': 'Xanh dương',
    FFC000: 'Cam',
    F79646: 'Cam nhạt',
    FFF2CC: 'Vàng kem',
    '0F243E': 'Xanh đen'
  };

  const SOURCE_BADGE_STYLE = {
    'Vật tư': 'background:#e0f2fe;color:#075985;border-color:#7dd3fc;',
    'Tài sản': 'background:#dcfce7;color:#166534;border-color:#86efac;',
    'Đo kiểm': 'background:#fef9c3;color:#854d0e;border-color:#fde047;',
    'Sửa chữa': 'background:#fee2e2;color:#991b1b;border-color:#fca5a5;',
    'Không rõ nguồn': 'background:#f1f5f9;color:#334155;border-color:#cbd5e1;'
  };

  const ACTION_BTN_STYLE = {
    primary: 'padding:7px 12px;border-radius:7px;border:1px solid #0b3a5b;background:#0b3a5b;color:#ffffff;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;box-shadow:0 1px 2px rgba(11,58,91,.18);',
    folder: 'padding:7px 12px;border-radius:7px;border:1px solid #0284c7;background:#e0f2fe;color:#0369a1;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;',
    sync: 'padding:7px 12px;border-radius:7px;border:1px solid #0d9488;background:#f0fdfa;color:#0f766e;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;',
    exportBtn: 'padding:7px 12px;border-radius:7px;border:1px solid #16a34a;background:#f0fdf4;color:#15803d;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;',
    neutral: 'padding:7px 12px;border-radius:7px;border:1px solid #cbd5e1;background:#ffffff;color:#1e293b;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;'
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const LS = k => `${CFG.storageKey}:${k}`;
  const clone = o => {
    try { return JSON.parse(JSON.stringify(o)); } catch (_) { return o; }
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const fold = s => String(s || '')
    .replace(/[^\u0000-\u007f]/g, ch => {
      const n = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (ch === 'đ') return 'd';
      if (ch === 'Đ') return 'D';
      return n.length === 1 ? n : ch;
    })
    .toLowerCase();

  const tokensOf = q => fold(q).trim().split(/\s+/).filter(Boolean);

  const bgOf = hex => {
    const clean = String(hex || '').replace(/^#/, '');
    const n = parseInt(clean, 16);
    if (isNaN(n)) return 'transparent';
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},.28)`;
  };

  const colorLabel = hex => {
    const clean = String(hex || '').replace(/^#/, '').toUpperCase();
    return CFG.colorMeaning[clean] || COLOR_NAMES[clean] || ('#' + clean);
  };

  function toast(msg, ms = 2600) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  function hideBoot() {
    const boot = $('#boot');
    if (boot) boot.style.display = 'none';
    const topbar = $('#topbar');
    if (topbar) topbar.hidden = false;
    const layout = $('#layout');
    if (layout) layout.hidden = false;
  }

  function getSyncStatusInfo() {
    const role = localStorage.getItem('lab_user_role') || '';
    const username = localStorage.getItem('lab_username') || '';
    const accountLabel = username
      ? `${username}${role ? ' (' + role + ')' : ''}`
      : 'Tự động đồng bộ';

    const btnSync = $('#btnSync');
    const isConnected = !!(btnSync && !btnSync.classList.contains('sync-off') && !btnSync.classList.contains('sync-login'));
    const syncText = btnSync && btnSync.querySelector('span')
      ? btnSync.querySelector('span').textContent.trim()
      : (isConnected ? 'Đã đồng bộ' : 'Đang kết nối');

    return {
      accountLabel,
      role: role || '',
      syncText,
      isConnected
    };
  }

  function sanitizeSheetName(name, usedNames) {
    let base = String(name || 'Sheet')
      .replace(/[\\/?*[\]:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 31) || 'Sheet';
    let candidate = base;
    let idx = 2;
    while (usedNames.has(candidate.toLowerCase())) {
      const suffix = ` (${idx++})`;
      candidate = base.slice(0, Math.max(1, 31 - suffix.length)) + suffix;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  }

  function inferSourceFromRow(rawText, fallback = CFG.defaultSource || DEFAULT_SOURCE) {
    const f = fold(rawText);
    if (!f) return fallback;
    if (/\bts\b|tai san|tài sản/.test(f)) return SRC_LIST.find(x => fold(x).includes('tai san')) || 'Tài sản';
    if (/do kiem|đo kiểm|do luong|đo lường/.test(f)) return SRC_LIST.find(x => fold(x).includes('do kiem')) || 'Đo kiểm';
    if (/sua chua|sửa chữa|hu hong|hư hỏng|\bhong\b|\bhỏng\b|\bloi\b|\blỗi\b/.test(f)) return SRC_LIST.find(x => fold(x).includes('sua chua')) || 'Sửa chữa';
    if (/khong ro|không rõ|ko ro/.test(f)) return SRC_LIST.find(x => fold(x).includes('khong ro')) || 'Không rõ nguồn';
    if (/\bvt\b|vat tu|vật tư/.test(f)) return SRC_LIST.find(x => fold(x).includes('vat tu')) || 'Vật tư';
    return fallback;
  }

  function normalizeSource(val, fallback = CFG.defaultSource || DEFAULT_SOURCE) {
    if (!val) return fallback;
    const raw = String(val).trim();
    const exact = SRC_LIST.find(x => x.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;
    return inferSourceFromRow(raw, fallback);
  }

  let uidN = 0;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + (uidN++).toString(36);

  function normalizeRow(row, index, defaultSrc = DEFAULT_SOURCE, oldCols = null, sheetId = '') {
    const r = row && typeof row === 'object' ? row : {};
    const v = Array.isArray(r.v) ? r.v.slice() : [];
    const fallbackSrc = normalizeSource(r.src, defaultSrc);
    const hasSrcFirst = v.length >= 7 && SRC_LIST.some(opt => fold(opt) === fold(v[0]));

    let src, stt, tenVT, serial, maVT, partNo, ghiChu;
    if (hasSrcFirst) {
      src = normalizeSource(v[0], fallbackSrc);
      stt = String(v[1] ?? (index + 1));
      tenVT = String(v[2] ?? '');
      serial = String(v[3] ?? '');
      maVT = String(v[4] ?? '');
      partNo = String(v[5] ?? '');
      ghiChu = String(v[6] ?? '');
    } else if (Array.isArray(oldCols) && oldCols.length > 0) {
      const idxOf = re => oldCols.findIndex(c => re.test(fold(c)));
      const iStt = idxOf(/^stt$/);
      const iMa = idxOf(/ma vt|ma vat tu|^ma$|ma card/);
      const iTen = idxOf(/^ten|hien vat|thiet bi|vat tu/);
      const iSer = idxOf(/serial|s\/n/);
      const iPart = idxOf(/part|pasnumber/);
      const iNote = idxOf(/ghi chu|tinh trang|nhap kho/);

      stt = String((iStt >= 0 ? v[iStt] : v[0]) ?? (index + 1));
      tenVT = String((iTen >= 0 ? v[iTen] : v[2]) ?? '');
      serial = String((iSer >= 0 ? v[iSer] : v[3]) ?? '');
      maVT = String((iMa >= 0 ? v[iMa] : v[1]) ?? '');
      partNo = String((iPart >= 0 ? v[iPart] : v[4]) ?? '');

      const extraNotes = [];
      if (iNote >= 0 && v[iNote]) extraNotes.push(String(v[iNote]).trim());
      for (let k = 0; k < v.length; k++) {
        if (k === iStt || k === iMa || k === iTen || k === iSer || k === iPart || k === iNote) continue;
        const cell = String(v[k] ?? '').trim();
        if (cell) extraNotes.push(cell);
      }
      ghiChu = extraNotes.join(' | ');

      const rowContext = `${tenVT} ${ghiChu} ${sheetId === 'vt-do-kiem' ? 'do kiem' : ''} ${sheetId === 'khong-ro-ng' ? 'khong ro' : ''}`;
      src = r.src ? normalizeSource(r.src, fallbackSrc) : inferSourceFromRow(rowContext, fallbackSrc);
    } else {
      stt = String(v[0] ?? (index + 1));
      tenVT = String(v[2] ?? '');
      serial = String(v[3] ?? '');
      maVT = String(v[1] ?? '');
      partNo = String(v[4] ?? '');
      ghiChu = String(v[5] ?? '');
      src = r.src ? normalizeSource(r.src, fallbackSrc) : inferSourceFromRow(`${tenVT} ${ghiChu}`, fallbackSrc);
    }

    return Object.assign({}, r, {
      src,
      v: [src, stt, tenVT, serial, maVT, partNo, ghiChu]
    });
  }

  function cloneTreeWithCustomFolders(nodes = [], customMap = {}) {
    return nodes.map(node => {
      const children = Array.isArray(node.children) ? cloneTreeWithCustomFolders(node.children, customMap) : [];
      const extra = Array.isArray(customMap[node.id]) ? customMap[node.id] : [];
      return Object.assign({}, node, {
        children: [...children, ...extra]
      });
    });
  }

  function flattenTree(nodes = [], parentId = null, ancestors = []) {
    const out = [];
    for (const node of nodes) {
      const pathNodes = [...ancestors, node];
      out.push({ node, parentId, ancestors, pathNodes });
      if (Array.isArray(node.children) && node.children.length) {
        out.push(...flattenTree(node.children, node.id, pathNodes));
      }
    }
    return out;
  }

  let customFoldersByParent = {};
  let activeTree = [];
  let flatNodes = [];
  let nodeById = new Map();

  function rebuildTreeIndex() {
    activeTree = cloneTreeWithCustomFolders(CFG.treeMenu || [], customFoldersByParent);
    flatNodes = flattenTree(activeTree);
    nodeById = new Map(flatNodes.map(item => [item.node.id, item]));
  }

  rebuildTreeIndex();

  function resolveTargetNodeId(textOrId) {
    if (!textOrId) return null;
    const raw = String(textOrId).trim();
    if (nodeById.has(raw)) return raw;
    if (CFG.sheetRouteMap && CFG.sheetRouteMap[raw] && nodeById.has(CFG.sheetRouteMap[raw])) {
      return CFG.sheetRouteMap[raw];
    }
    const f = fold(raw);
    if (CFG.blockRouteMap) {
      for (const [k, targetId] of Object.entries(CFG.blockRouteMap)) {
        if (f === fold(k) || f.includes(fold(k))) {
          if (nodeById.has(targetId)) return targetId;
        }
      }
    }
    for (const item of flatNodes) {
      const n = item.node;
      if (fold(n.label) === f) return n.id;
      if (Array.isArray(n.matchKeywords) && n.matchKeywords.some(kw => fold(kw) === f)) {
        return n.id;
      }
    }
    return null;
  }

  function classifyRowTarget(sheetId, blockTitle, rowNorm, fallbackNodeId) {
    const bt = fold(blockTitle);
    const v = rowNorm.v || [];
    const blob = fold(`${blockTitle} ${v[2] || ''} ${v[3] || ''} ${v[4] || ''} ${v[5] || ''} ${v[6] || ''}`);

    if (bt === 'xtc10') return 'xtc10';
    if (bt === 'mtc9') return 'mtc9';
    if (bt === 'otc9') return 'otc9';
    if (bt.includes('5430') || bt.includes('6500t')) return 'ciena-5430';
    if (bt.includes('ome')) return 'ciena-ome';
    if (bt === 'bb' || bt.includes('ciena bb')) return 'ciena-bb';
    if (bt.includes('nokia')) return 'nokia-bb';
    if (bt.includes('hw6800') || bt.includes('hw 6800')) return 'hw-6800';
    if (bt.includes('hw8800') || bt.includes('hw 8800')) return 'hw-8800';
    if (bt.includes('hw7500') || bt.includes('hw 7500')) return 'hw-7500';
    if (bt.includes('hw3500') || bt.includes('hw 3500')) return 'hw-3500';
    if (bt.includes('hw3900') || bt.includes('hw 3900')) return 'hw-3900';
    if (bt.includes('mhl3000') || bt.includes('oms3255') || bt.includes('ericson') || bt.includes('ericsson') || bt.includes('ribbon')) return 'ribbon-ericson';
    if (bt.includes('vt do kiem')) return 'vat-tu-do-luong';
    if (bt.includes('khong ro')) return 'vat-tu-khong-ro-nguon-goc';

    if (blob.includes('xtc-10') || blob.includes('xtc10')) return 'xtc10';
    if (blob.includes('mtc-9') || blob.includes('mtc9')) return 'mtc9';
    if (blob.includes('otc-') || blob.includes('otc9')) return 'otc9';
    if (blob.includes('5430') || blob.includes('6500')) return 'ciena-5430';
    if (blob.includes('ome')) return 'ciena-ome';
    if (blob.includes('nokia') || blob.includes('bb1') || blob.includes('3kc')) return 'nokia-bb';
    if (blob.includes('6800') || blob.includes('pss16') || blob.includes('pss-16') || blob.includes('pss_64') || blob.includes('pss-64')) {
      return blob.includes('8800') ? 'hw-8800' : 'hw-6800';
    }
    if (blob.includes('8800') || blob.includes('osn8800')) return 'hw-8800';
    if (blob.includes('7500')) return 'hw-7500';
    if (blob.includes('3500')) return 'hw-3500';
    if (blob.includes('3900')) return 'hw-3900';
    if (blob.includes('ericson') || blob.includes('ericsson') || blob.includes('ribbon') || blob.includes('3255') || blob.includes('mhl3000')) {
      return 'ribbon-ericson';
    }
    if (blob.includes('vsat') || blob.includes('skyedge') || blob.includes('lnb') || blob.includes('buc') || blob.includes('soundwin')) {
      return 'thiet-bi-vsat';
    }
    if (blob.includes('radio') || blob.includes('rrus') || blob.includes('baseband') || blob.includes('vo tuyen')) {
      return 'thiet-bi-vo-tuyen';
    }
    if (blob.includes('asr9010') || blob.includes('asr 9010') || blob.includes('mx2008') || blob.includes('mx2000') || blob.includes('mx960') || blob.includes('ne40e') || blob.includes('a9k-') || blob.includes('a99-') || blob.includes('router') || blob.includes('switch')) {
      return 'thiet-bi-ip';
    }
    if (blob.includes('ko ro nguon') || blob.includes('khong ro nguon')) {
      return 'vat-tu-khong-ro-nguon-goc';
    }

    if (fallbackNodeId && nodeById.has(fallbackNodeId)) return fallbackNodeId;
    if (sheetId === 'trang-tinh14') return 'vat-tu-sua-chua';
    if (sheetId === 'vt-do-kiem') return 'vat-tu-do-luong';
    if (sheetId === 'khong-ro-ng' || sheetId === 'hang-ton-kho' || sheetId === 'ton-kho-xvt-26-10-2026') {
      return 'vat-tu-khong-ro-nguon-goc';
    }
    if (rowNorm.src === 'Tài sản') return 'tai-san';
    return flatNodes[0] ? flatNodes[0].node.id : 'truyen-dan-thiet-bi';
  }

  function buildSheetsFromStore(storeMap) {
    return flatNodes.map((entry, idx) => {
      const n = entry.node;
      const rows = (Array.isArray(storeMap[n.id]) ? storeMap[n.id] : []).map((r, i) =>
        normalizeRow(r, i, CFG.defaultSource, STANDARD_COLS, n.id)
      );
      rows.forEach((r, i) => {
        r.r = i + 1;
        r.v[1] = String(i + 1);
      });
      return {
        id: n.id,
        name: CFG.sheetLabels[n.id] || n.label,
        categoryId: n.id,
        group: n.defaultGroup != null ? n.defaultGroup : (entry.parentId ? 0 : idx),
        blocks: [
          {
            title: n.label,
            hr: 1,
            ord: 0,
            cols: STANDARD_COLS.slice(),
            rows
          }
        ]
      };
    });
  }

  function buildStoreFromSheets(sheets) {
    const store = {};
    for (const item of flatNodes) store[item.node.id] = [];

    if (Array.isArray(sheets)) {
      for (const sh of sheets) {
        const shTarget = resolveTargetNodeId(sh.id) || resolveTargetNodeId(sh.name);
        const blocks = Array.isArray(sh.blocks) ? sh.blocks : [];
        for (const blk of blocks) {
          const blkTarget = (CFG.splitTablesByTitle ? resolveTargetNodeId(blk.title) : null) || shTarget;
          const rows = Array.isArray(blk.rows) ? blk.rows : [];
          rows.forEach((r, idx) => {
            const norm = normalizeRow(r, idx, CFG.defaultSource, blk.cols, sh.id);
            const destId = classifyRowTarget(sh.id, blk.title, norm, blkTarget);
            if (store[destId]) {
              store[destId].push(norm);
            }
          });
        }
      }
    }

    for (const id of Object.keys(store)) {
      store[id].forEach((r, idx) => {
        if (!r.i) r.i = `${id}:0:${idx + 1}`;
        r.r = idx + 1;
        r.v[1] = String(idx + 1);
      });
    }
    return store;
  }

  let DATA = { meta: { source: 'LAB', generated: '', version: '' }, sheets: [] };
  let storeData = {};
  const ST = { sheets: [], slips: { xuat: [], nhap: [] }, dirty: false };
  const V = {
    route: { page: 'overview', id: null },
    activeId: (flatNodes[0] && flatNodes[0].node.id) || null,
    edit: false,
    query: '',
    sourceFilter: 'ALL',
    treeCollapsed: {}
  };

  function initCollapsedState(collapseAll = true) {
    const next = {};
    for (const entry of flatNodes) {
      const n = entry.node;
      const isFolder = (Array.isArray(n.children) && n.children.length > 0) || n.allowCreate;
      if (isFolder && collapseAll) {
        next[n.id] = true;
      }
    }
    V.treeCollapsed = next;
  }

  function expandAncestorsOf(nodeId) {
    const entry = nodeById.get(nodeId);
    if (!entry) return;
    for (const anc of entry.ancestors) {
      delete V.treeCollapsed[anc.id];
    }
  }

  function syncSTFromStore() {
    ST.sheets = buildSheetsFromStore(storeData);
  }

  function syncStoreFromST() {
    rebuildTreeIndex();
    storeData = buildStoreFromSheets(ST.sheets || []);
  }

  function ensureIds(sheets) {
    if (!Array.isArray(sheets)) return;
    sheets.forEach(s => Array.isArray(s.blocks) && s.blocks.forEach((b, bi) => {
      if (!Array.isArray(b.cols) || !b.cols.length) b.cols = STANDARD_COLS.slice();
      (b.rows || []).forEach((r, ri) => {
        if (!r.i) r.i = r.r ? `${s.id}:${bi}:${r.r}` : 'u' + uid();
        const norm = normalizeRow(r, ri, CFG.defaultSource, b.cols, s.id);
        Object.assign(r, norm);
      });
    }));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS('state')) || 'null');
      if (saved && Array.isArray(saved.sheets)) {
        const metaVer = (DATA && DATA.meta && DATA.meta.version) || '';
        if (!metaVer || saved.ver === metaVer) {
          customFoldersByParent = saved.customFolders && typeof saved.customFolders === 'object' ? saved.customFolders : {};
          rebuildTreeIndex();
          initCollapsedState(true);
          ensureIds(saved.sheets);
          storeData = buildStoreFromSheets(saved.sheets);
          syncSTFromStore();
          ST.slips = saved.slips && typeof saved.slips === 'object'
            ? Object.assign({ xuat: [], nhap: [] }, saved.slips)
            : { xuat: [], nhap: [] };
          ST.dirty = !!saved.dirty;
          return;
        }
      }
    } catch (_) {}

    customFoldersByParent = {};
    rebuildTreeIndex();
    initCollapsedState(true);
    const rawSheets = (DATA && Array.isArray(DATA.sheets)) ? clone(DATA.sheets) : [];
    ensureIds(rawSheets);
    storeData = buildStoreFromSheets(rawSheets);
    syncSTFromStore();
    ST.slips = { xuat: [], nhap: [] };
    ST.dirty = false;
  }

  function saveLocal() {
    syncSTFromStore();
    try {
      localStorage.setItem(LS('state'), JSON.stringify({
        ver: (DATA && DATA.meta && DATA.meta.version) || '',
        customFolders: customFoldersByParent,
        sheets: ST.sheets,
        slips: ST.slips,
        dirty: ST.dirty
      }));
    } catch (_) {
      toast('⚠ Không lưu được vào trình duyệt.', 4000);
    }
  }

  function persist() {
    ST.dirty = true;
    const d = $('#dirty');
    if (d) d.hidden = false;
    saveLocal();
    if (window.Sync && typeof window.Sync.schedule === 'function') {
      window.Sync.schedule(200);
    }
  }

  function resetToBaseline() {
    localStorage.removeItem(LS('state'));
    customFoldersByParent = {};
    rebuildTreeIndex();
    initCollapsedState(true);
    const rawSheets = (DATA && Array.isArray(DATA.sheets)) ? clone(DATA.sheets) : [];
    ensureIds(rawSheets);
    storeData = buildStoreFromSheets(rawSheets);
    syncSTFromStore();
    ST.slips = { xuat: [], nhap: [] };
    ST.dirty = false;
    const d = $('#dirty');
    if (d) d.hidden = true;
    saveLocal();
    if (window.Sync && typeof window.Sync.schedule === 'function') {
      window.Sync.schedule(200);
    }
  }

  const sheetById = id => (ST && ST.sheets ? ST.sheets.find(s => s.id === id) : null);
  const labelOf = s => (s ? (CFG.sheetLabels[s.id] || s.name || s.id) : '');
  const isStock = () => true;
  const stockRows = b => (b && b.rows) || [];
  const touch = r => { if (r) r.ut = Date.now(); };

  function getRowsForNode(nodeId) {
    if (!Array.isArray(storeData[nodeId])) storeData[nodeId] = [];
    return storeData[nodeId];
  }

  function countNodeRowsDeep(node) {
    if (!node) return 0;
    let total = getRowsForNode(node.id).length;
    if (Array.isArray(node.children)) {
      for (const ch of node.children) total += countNodeRowsDeep(ch);
    }
    return total;
  }

  function matchesRow(row, qTokens, srcFilter) {
    const normSrc = normalizeSource(row.src || (row.v && row.v[0]), CFG.defaultSource);
    if (srcFilter && srcFilter !== 'ALL' && normSrc !== srcFilter) return false;
    if (!qTokens.length) return true;
    const hay = fold((row.v || []).join(' '));
    return qTokens.every(tok => hay.includes(tok));
  }

  function getFilteredRows(nodeId) {
    const rows = getRowsForNode(nodeId);
    const qTokens = tokensOf(V.query);
    return rows
      .map((row, idx) => ({ row: normalizeRow(row, idx, CFG.defaultSource, STANDARD_COLS, nodeId), idx }))
      .filter(item => matchesRow(item.row, qTokens, V.sourceFilter));
  }

  function getGlobalSearchResults() {
    const qTokens = tokensOf(V.query);
    const results = [];
    for (const entry of flatNodes) {
      const n = entry.node;
      if (Array.isArray(n.children) && n.children.length > 0) continue;
      const rows = getRowsForNode(n.id);
      rows.forEach((r, idx) => {
        const norm = normalizeRow(r, idx, CFG.defaultSource, STANDARD_COLS, n.id);
        if (matchesRow(norm, qTokens, V.sourceFilter)) {
          results.push({
            nodeId: n.id,
            nodeLabel: n.label,
            pathText: entry.pathNodes.map(x => x.label).join(' / '),
            row: norm,
            idx
          });
        }
      });
      if (results.length >= (CFG.maxSearchResults || 400)) break;
    }
    return results;
  }

  function collectCatalogLookups() {
    const maVTSet = new Set();
    const tenVTSet = new Set();
    const serialSet = new Set();
    const partNoSet = new Set();
    const catalogItems = [];

    for (const entry of flatNodes) {
      const n = entry.node;
      if (Array.isArray(n.children) && n.children.length > 0) continue;
      const rows = getRowsForNode(n.id);
      rows.forEach((r, idx) => {
        const norm = normalizeRow(r, idx, CFG.defaultSource, STANDARD_COLS, n.id);
        const v = norm.v || [];
        const ten = String(v[2] || '').trim();
        const ser = String(v[3] || '').trim();
        const ma = String(v[4] || '').trim();
        const part = String(v[5] || '').trim();
        const note = String(v[6] || '').trim();
        if (ma) maVTSet.add(ma);
        if (ten) tenVTSet.add(ten);
        if (ser) serialSet.add(ser);
        if (part) partNoSet.add(part);
        if (ma || ten || ser || part) {
          catalogItems.push({
            src: norm.src,
            tenVT: ten,
            serial: ser,
            maVT: ma,
            partNo: part,
            ghiChu: note
          });
        }
      });
    }

    return {
      maVTList: Array.from(maVTSet).sort((a, b) => a.localeCompare(b, 'vi')),
      tenVTList: Array.from(tenVTSet).sort((a, b) => a.localeCompare(b, 'vi')),
      serialList: Array.from(serialSet).sort((a, b) => a.localeCompare(b, 'vi')),
      partNoList: Array.from(partNoSet).sort((a, b) => a.localeCompare(b, 'vi')),
      catalogItems
    };
  }

  function addStructuredItem(payload) {
    const targetNodeId = payload.targetNodeId || V.activeId || (flatNodes[0] && flatNodes[0].node.id);
    if (!targetNodeId) return;
    const rows = getRowsForNode(targetNodeId);
    const src = normalizeSource(payload.src || (V.sourceFilter !== 'ALL' ? V.sourceFilter : CFG.defaultSource), CFG.defaultSource);
    const newRow = normalizeRow({
      i: 'u' + uid(),
      ct: Date.now(),
      ut: Date.now(),
      src,
      v: [
        src,
        String(rows.length + 1),
        String(payload.tenVT || '').trim(),
        String(payload.serial || '').trim(),
        String(payload.maVT || '').trim(),
        String(payload.partNo || '').trim(),
        String(payload.ghiChu || '').trim()
      ]
    }, rows.length, src, STANDARD_COLS, targetNodeId);

    rows.push(newRow);
    persist();
    render();
    toast('Đã thêm vật tư vào danh mục');
  }

  function openAddItemModal(defaultNodeId) {
    let host = $('#mdAddItem');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mdAddItem';
      document.body.appendChild(host);
    }

    const leafEntries = flatNodes.filter(e => !Array.isArray(e.node.children) || e.node.children.length === 0);
    const chosenId = defaultNodeId && nodeById.has(defaultNodeId)
      ? defaultNodeId
      : (leafEntries[0] && leafEntries[0].node.id) || '';

    const folderOpts = leafEntries.map(e =>
      `<option value="${esc(e.node.id)}" ${e.node.id === chosenId ? 'selected' : ''}>${esc(e.pathNodes.map(x => x.label).join(' / '))}</option>`
    ).join('');

    const defaultSrc = V.sourceFilter !== 'ALL' ? V.sourceFilter : CFG.defaultSource;
    const srcOpts = SRC_LIST.map(s =>
      `<option value="${esc(s)}" ${s === defaultSrc ? 'selected' : ''}>${esc(s)}</option>`
    ).join('');

    const lookups = collectCatalogLookups();
    const toOpts = arr => arr.map(val => `<option value="${esc(val)}">${esc(val)}</option>`).join('');

    host.innerHTML = `
      <div class="modal-backdrop" id="addItemBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9998;padding:12px;">
        <div class="modal" style="width:100%;max-width:520px;background:#fff;color:#111;border-radius:10px;padding:16px;box-shadow:0 12px 30px rgba(0,0,0,.25);max-height:92vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h3 style="margin:0;font-size:17px;">📦 Thêm vật tư / tài sản</h3>
            <button type="button" id="btnCloseAddItem" style="border:0;background:transparent;font-size:18px;cursor:pointer;">✕</button>
          </div>
          <form id="addItemForm" style="display:flex;flex-direction:column;gap:9px;">
            <label style="font-size:12px;font-weight:600;">Thư mục lưu trữ
              <select id="aiFolder" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">${folderOpts}</select>
            </label>
            <label style="font-size:12px;font-weight:600;">Nguồn
              <select id="aiSrc" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">${srcOpts}</select>
            </label>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <label style="font-size:12px;font-weight:600;">Mã vật tư (danh sách sổ)
                <input id="aiMaVT" list="dlMaVT" type="text" placeholder="Chọn hoặc nhập Mã VT..." style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">
                <select id="selMaVT" aria-label="Chọn nhanh Mã vật tư" style="width:100%;margin-top:4px;padding:5px 6px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#f8fafc;">
                  <option value="">-- Danh sách Mã vật tư --</option>
                  ${toOpts(lookups.maVTList)}
                </select>
                <datalist id="dlMaVT">${toOpts(lookups.maVTList)}</datalist>
              </label>

              <label style="font-size:12px;font-weight:600;">Tên vật tư (danh sách sổ)
                <input id="aiTen" list="dlTenVT" type="text" placeholder="Chọn hoặc nhập Tên Vật Tư..." style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">
                <select id="selTenVT" aria-label="Chọn nhanh Tên vật tư" style="width:100%;margin-top:4px;padding:5px 6px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#f8fafc;">
                  <option value="">-- Danh sách Tên vật tư --</option>
                  ${toOpts(lookups.tenVTList)}
                </select>
                <datalist id="dlTenVT">${toOpts(lookups.tenVTList)}</datalist>
              </label>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <label style="font-size:12px;font-weight:600;">Serial (danh sách sổ)
                <input id="aiSerial" list="dlSerial" type="text" placeholder="Chọn hoặc nhập Serial..." style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">
                <select id="selSerial" aria-label="Chọn nhanh Serial" style="width:100%;margin-top:4px;padding:5px 6px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#f8fafc;">
                  <option value="">-- Danh sách Serial --</option>
                  ${toOpts(lookups.serialList)}
                </select>
                <datalist id="dlSerial">${toOpts(lookups.serialList)}</datalist>
              </label>

              <label style="font-size:12px;font-weight:600;">Part number (danh sách sổ)
                <input id="aiPartNo" list="dlPartNo" type="text" placeholder="Chọn hoặc nhập Part number..." style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">
                <select id="selPartNo" aria-label="Chọn nhanh Part number" style="width:100%;margin-top:4px;padding:5px 6px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#f8fafc;">
                  <option value="">-- Danh sách Part number --</option>
                  ${toOpts(lookups.partNoList)}
                </select>
                <datalist id="dlPartNo">${toOpts(lookups.partNoList)}</datalist>
              </label>
            </div>

            <label style="font-size:12px;font-weight:600;">Ghi chú
              <input id="aiGhiChu" type="text" placeholder="Tình trạng, vị trí, ghi chú..." style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">
            </label>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
              <button type="button" id="btnCancelAddItem" style="${ACTION_BTN_STYLE.neutral}">Huỷ</button>
              <button type="submit" style="${ACTION_BTN_STYLE.primary}">+ Lưu vật tư</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => { host.innerHTML = ''; };
    $('#btnCloseAddItem', host)?.addEventListener('click', closeModal);
    $('#btnCancelAddItem', host)?.addEventListener('click', closeModal);
    $('#addItemBackdrop', host)?.addEventListener('click', e => {
      if (e.target && e.target.id === 'addItemBackdrop') closeModal();
    });

    const maInp = $('#aiMaVT', host);
    const tenInp = $('#aiTen', host);
    const serInp = $('#aiSerial', host);
    const partInp = $('#aiPartNo', host);
    const noteInp = $('#aiGhiChu', host);

    function autofillFromMatch(fieldKey, val) {
      if (!val) return;
      const hit = lookups.catalogItems.find(item => fold(item[fieldKey]) === fold(val));
      if (!hit) return;
      if (maInp && !maInp.value.trim() && hit.maVT) maInp.value = hit.maVT;
      if (tenInp && !tenInp.value.trim() && hit.tenVT) tenInp.value = hit.tenVT;
      if (serInp && !serInp.value.trim() && hit.serial) serInp.value = hit.serial;
      if (partInp && !partInp.value.trim() && hit.partNo) partInp.value = hit.partNo;
      if (noteInp && !noteInp.value.trim() && hit.ghiChu) noteInp.value = hit.ghiChu;
    }

    const bindDropdown = (selId, inp, fieldKey) => {
      const sel = $(selId, host);
      if (!sel || !inp) return;
      sel.addEventListener('change', () => {
        if (!sel.value) return;
        inp.value = sel.value;
        autofillFromMatch(fieldKey, sel.value);
      });
      inp.addEventListener('change', () => autofillFromMatch(fieldKey, inp.value));
    };

    bindDropdown('#selMaVT', maInp, 'maVT');
    bindDropdown('#selTenVT', tenInp, 'tenVT');
    bindDropdown('#selSerial', serInp, 'serial');
    bindDropdown('#selPartNo', partInp, 'partNo');

    $('#addItemForm', host)?.addEventListener('submit', e => {
      e.preventDefault();
      addStructuredItem({
        targetNodeId: $('#aiFolder', host)?.value || chosenId,
        src: $('#aiSrc', host)?.value || defaultSrc,
        tenVT: tenInp ? tenInp.value : '',
        serial: serInp ? serInp.value : '',
        maVT: maInp ? maInp.value : '',
        partNo: partInp ? partInp.value : '',
        ghiChu: noteInp ? noteInp.value : ''
      });
      closeModal();
    });

    tenInp?.focus();
  }

  function moveRowToNode(fromNodeId, rowIdx, toNodeId) {
    if (!toNodeId || fromNodeId === toNodeId) return;
    const srcRows = getRowsForNode(fromNodeId);
    const targetEntry = nodeById.get(toNodeId);
    if (!srcRows[rowIdx] || !targetEntry) return;

    const [moved] = srcRows.splice(rowIdx, 1);
    const dstRows = getRowsForNode(toNodeId);
    const normMoved = normalizeRow(moved, dstRows.length, CFG.defaultSource, STANDARD_COLS, toNodeId);
    normMoved.v[1] = String(dstRows.length + 1);
    normMoved.ut = Date.now();
    dstRows.push(normMoved);

    srcRows.forEach((r, i) => {
      if (Array.isArray(r.v)) r.v[1] = String(i + 1);
      r.r = i + 1;
    });

    persist();
    render();
    toast(`Đã chuyển sang "${targetEntry.node.label}"`);
  }

  function createFolderUnder(parentId) {
    const parentEntry = nodeById.get(parentId) || nodeById.get('thiet-bi-ip') || flatNodes[0];
    const resolvedParentId = parentEntry ? parentEntry.node.id : 'thiet-bi-ip';
    const parentLabel = parentEntry ? parentEntry.node.label : 'Thư mục';
    const rawName = prompt(`Nhập tên thư mục mới trong "${parentLabel}":`);
    if (!rawName || !rawName.trim()) return;
    const cleanName = rawName.trim();
    const newId = 'folder-' + uid();

    if (!Array.isArray(customFoldersByParent[resolvedParentId])) {
      customFoldersByParent[resolvedParentId] = [];
    }
    customFoldersByParent[resolvedParentId].push({
      id: newId,
      label: cleanName,
      icon: '📄',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: [fold(cleanName)]
    });

    rebuildTreeIndex();
    delete V.treeCollapsed[resolvedParentId];
    expandAncestorsOf(newId);
    if (!Array.isArray(storeData[newId])) storeData[newId] = [];
    V.activeId = newId;
    V.route = { page: 'sheet', id: newId };
    persist();
    render();
    toast(`Đã tạo thư mục "${cleanName}"`);
  }

  function parseHash() {
    const m = location.hash.match(/^#\/s\/([\w-]+)/);
    if (m && nodeById.has(m[1])) {
      V.route = { page: 'sheet', id: m[1] };
      V.activeId = m[1];
      expandAncestorsOf(m[1]);
      return;
    }
    V.route = { page: 'overview', id: null };
  }

  function renderSidebar() {
    const sb = $('#sidebar');
    if (!sb) return;

    const treeTargetParent = V.activeId || 'thiet-bi-ip';

    const renderNodes = (nodes, depth = 0) => {
      if (!Array.isArray(nodes) || !nodes.length) return '';
      return `<div class="tree-children" style="padding-left:${depth ? 12 : 0}px;border-left:${depth ? '1px dashed rgba(11,58,91,.22)' : 'none'};margin-left:${depth ? 6 : 0}px;">` +
        nodes.map(node => {
          const hasChildren = Array.isArray(node.children) && node.children.length > 0;
          const isExpandable = hasChildren || !!node.allowCreate;
          const isCollapsed = !!V.treeCollapsed[node.id];
          const isActive = V.route.page === 'sheet' && V.activeId === node.id;
          const totalCount = countNodeRowsDeep(node);
          const childPreview = hasChildren && isCollapsed
            ? node.children.map(c => c.label).join(', ')
            : '';

          return `
            <div class="tree-node ${isCollapsed ? 'collapsed' : ''}" data-node="${esc(node.id)}" style="margin:2px 0;">
              <div class="tree-row ${isActive ? 'active' : ''}" style="display:flex;align-items:center;justify-content:space-between;gap:4px;padding:5px 7px;border-radius:6px;cursor:pointer;background:${isActive ? 'rgba(11,58,91,.14)' : 'transparent'};">
                <button type="button" class="tree-toggle-btn" data-toggle-node="${esc(node.id)}" aria-label="Thu gọn hoặc mở rộng" style="border:0;background:transparent;cursor:pointer;padding:0 3px;font-size:12px;line-height:1;width:16px;">
                  ${isExpandable ? (isCollapsed ? '▸' : '▾') : '•'}
                </button>
                <button type="button" class="tree-select-btn" data-node-id="${esc(node.id)}" title="${esc(childPreview ? node.label + ': ' + childPreview : node.label)}" style="flex:1;min-width:0;border:0;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;gap:6px;text-align:left;padding:0;font-weight:${isActive || hasChildren ? '600' : '400'};">
                  <span>${esc(node.icon || (isExpandable ? '📁' : '📄'))}</span>
                  <span class="nm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(node.label)}</span>
                </button>
                <span class="ct" style="font-size:11.5px;opacity:.75;padding:1px 5px;border-radius:999px;background:rgba(11,58,91,.07);">${totalCount}</span>
              </div>
              ${!isCollapsed && hasChildren ? renderNodes(node.children, depth + 1) : ''}
              ${!isCollapsed && !hasChildren && node.allowCreate ? `
                <div style="padding-left:22px;margin:2px 0 4px;">
                  <button type="button" data-create-folder="${esc(node.id)}" style="border:1px dashed rgba(11,58,91,.35);background:transparent;color:#0b3a5b;border-radius:5px;padding:2px 8px;font-size:11.5px;cursor:pointer;">
                    ＋ Tạo mới trong ${esc(node.label)}
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('') +
      `</div>`;
    };

    const ovActive = V.route.page === 'overview' && !V.query ? 'active' : '';
    sb.innerHTML = `
      <div class="tree-root">
        <button type="button" class="tree-row ${ovActive}" data-go-overview="1" style="width:100%;margin-bottom:6px;border:0;background:${ovActive ? 'rgba(11,58,91,.14)' : 'transparent'};cursor:pointer;text-align:left;padding:7px 8px;border-radius:6px;display:flex;align-items:center;gap:6px;">
          <span>🏠</span><span class="nm"><b>Vật tư - Tài sản</b></span>
        </button>
        <div style="display:flex;gap:5px;margin-bottom:8px;">
          <button type="button" data-create-folder="${esc(treeTargetParent)}" style="flex:1;text-align:center;padding:5px 6px;border:1px dashed rgba(11,58,91,.35);border-radius:6px;background:rgba(11,58,91,.04);color:#0b3a5b;font-size:11.5px;font-weight:600;cursor:pointer;">
            ＋ Thư mục
          </button>
          <button type="button" id="btnTreeCollapseAll" title="Thu gọn tất cả thư mục" style="padding:5px 7px;border:1px solid rgba(11,58,91,.22);border-radius:6px;background:#fff;color:#0b3a5b;font-size:11.5px;cursor:pointer;">
            ▾ Thu gọn
          </button>
          <button type="button" id="btnTreeExpandAll" title="Mở rộng tất cả thư mục" style="padding:5px 7px;border:1px solid rgba(11,58,91,.22);border-radius:6px;background:#fff;color:#0b3a5b;font-size:11.5px;cursor:pointer;">
            ▸ Mở hết
          </button>
        </div>
        ${renderNodes(activeTree, 0)}
      </div>
    `;

    $('#btnTreeCollapseAll', sb)?.addEventListener('click', () => {
      initCollapsedState(true);
      renderSidebar();
    });
    $('#btnTreeExpandAll', sb)?.addEventListener('click', () => {
      V.treeCollapsed = {};
      renderSidebar();
    });
  }

  function renderHorizontalBar(currentEntry) {
    const currentNode = currentEntry ? currentEntry.node : null;
    if (!currentNode) return '';

    let horizontalItems = [];
    let groupTitle = '';

    if (Array.isArray(currentNode.children) && currentNode.children.length > 0) {
      horizontalItems = currentNode.children;
      groupTitle = currentNode.label;
    } else if (currentEntry.parentId) {
      const parentEntry = nodeById.get(currentEntry.parentId);
      if (parentEntry && Array.isArray(parentEntry.node.children) && parentEntry.node.children.length > 0) {
        horizontalItems = parentEntry.node.children;
        groupTitle = parentEntry.node.label;
      }
    }

    if (!horizontalItems.length) return '';

    const summaryText = horizontalItems.map(x => x.label).join(' - ');
    const chipsHtml = horizontalItems.map((item, idx) => {
      const selected = item.id === currentNode.id;
      const sep = idx < horizontalItems.length - 1
        ? `<span aria-hidden="true" style="opacity:.5;padding:0 2px;font-weight:700;">-</span>`
        : '';
      return `
        <button type="button"
          class="h-folder-btn ${selected ? 'active' : ''}"
          data-h-node="${esc(item.id)}"
          style="padding:5px 10px;border-radius:6px;border:1px solid ${selected ? '#0b3a5b' : '#cbd5e1'};background:${selected ? '#0b3a5b' : '#ffffff'};color:${selected ? '#ffffff' : '#1e293b'};cursor:pointer;font-size:13px;font-weight:${selected ? '600' : '500'};white-space:nowrap;">
          ${esc(item.label)} (${countNodeRowsDeep(item)})
        </button>
        ${sep}
      `;
    }).join('');

    return `
      <div class="horizontal-folder-bar" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 12px;margin-bottom:12px;border-radius:8px;background:#f8fafc;border:1px solid #cbd5e1;overflow-x:auto;">
        <span style="font-size:12px;font-weight:700;text-transform:uppercase;color:#334155;margin-right:4px;">
          ${esc(groupTitle)} [${esc(summaryText)}]:
        </span>
        ${chipsHtml}
      </div>
    `;
  }

  function computeStats() {
    const counts = {};
    SRC_LIST.forEach(s => { counts[s] = 0; });
    const colorMap = {};
    let total = 0;
    let folderCount = 0;

    for (const entry of flatNodes) {
      const n = entry.node;
      if (!Array.isArray(n.children) || n.children.length === 0) folderCount++;
      const rows = getRowsForNode(n.id);
      for (const r of rows) {
        total++;
        const src = normalizeSource(r.src || (r.v && r.v[0]), CFG.defaultSource);
        counts[src] = (counts[src] || 0) + 1;
        if (r.f && typeof r.f === 'object') {
          new Set(Object.values(r.f).map(c => String(c || '').replace(/^#/, '').toUpperCase()).filter(Boolean)).forEach(hex => {
            colorMap[hex] = (colorMap[hex] || 0) + 1;
          });
        }
      }
    }

    const colorEntries = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
    return { counts, total, folderCount, colorEntries };
  }

  function renderGlobalSearchView(mainEl) {
    const results = getGlobalSearchResults();
    const rowsHtml = results.length
      ? results.map((item, i) => {
          const v = item.row.v;
          const badgeStyle = SOURCE_BADGE_STYLE[v[0]] || SOURCE_BADGE_STYLE['Không rõ nguồn'];
          return `
            <tr>
              <td style="text-align:center;">${i + 1}</td>
              <td>
                <button type="button" data-jump-folder="${esc(item.nodeId)}" style="border:0;background:transparent;color:#0b3a5b;font-weight:600;cursor:pointer;text-align:left;padding:0;">
                  ${esc(item.nodeLabel)}
                </button>
                <div style="font-size:11px;opacity:.65;">${esc(item.pathText)}</div>
              </td>
              <td style="white-space:nowrap;"><span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid;${badgeStyle}">${esc(v[0])}</span></td>
              <td>${esc(v[2])}</td>
              <td>${esc(v[3])}</td>
              <td>${esc(v[4])}</td>
              <td>${esc(v[5])}</td>
              <td>${esc(v[6])}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="8" style="text-align:center;padding:18px;opacity:.7;">Không tìm thấy vật tư nào khớp với từ khóa "${esc(V.query)}" trên toàn bộ thư mục.</td></tr>`;

    mainEl.innerHTML = `
      <div class="view-header" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">
        <div>
          <div style="font-size:12px;opacity:.7;">Tìm kiếm toàn bộ danh mục tại Trang chủ</div>
          <h2 style="margin:2px 0 0;font-size:20px;">🔍 Kết quả tìm kiếm: "${esc(V.query)}" <small style="font-weight:400;opacity:.7;">(${results.length} dòng)</small></h2>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <button type="button" id="btnAddItemSearch" style="${ACTION_BTN_STYLE.primary}">+ Thêm vật tư</button>
          <button type="button" id="btnBackOverview" style="${ACTION_BTN_STYLE.neutral}">🏠 Về Trang chủ</button>
        </div>
      </div>
      <div class="table-wrap responsive-table-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(0,0,0,.12);border-radius:8px;background:#fff;">
        <table class="data-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="white-space:nowrap;">STT</th>
              <th style="white-space:nowrap;">Thư mục</th>
              <th style="white-space:nowrap;">Nguồn</th>
              <th style="white-space:nowrap;">Tên Vật Tư</th>
              <th style="white-space:nowrap;">Serial</th>
              <th style="white-space:nowrap;">Mã VT</th>
              <th style="white-space:nowrap;">Part number</th>
              <th style="white-space:nowrap;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    $('#btnAddItemSearch', mainEl)?.addEventListener('click', () => openAddItemModal(V.activeId));
    $('#btnBackOverview', mainEl)?.addEventListener('click', () => {
      V.query = '';
      const gq = $('#gq');
      const gqClear = $('#gqClear');
      if (gq) gq.value = '';
      if (gqClear) gqClear.hidden = true;
      V.route = { page: 'overview', id: null };
      render();
    });
    $$('[data-jump-folder]', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        V.activeId = btn.getAttribute('data-jump-folder');
        expandAncestorsOf(V.activeId);
        V.route = { page: 'sheet', id: V.activeId };
        render();
      });
    });
  }

  function renderOverview(mainEl) {
    const { counts, total, folderCount, colorEntries } = computeStats();
    const meta = (DATA && DATA.meta) || {};
    const meaningEntries = Object.entries(CFG.colorMeaning || {});
    const syncInfo = getSyncStatusInfo();

    const sourceCards = SRC_LIST.map(src => {
      const style = SOURCE_BADGE_STYLE[src] || SOURCE_BADGE_STYLE['Không rõ nguồn'];
      return `
        <div class="kpi" style="padding:12px 14px;border-radius:10px;border:1px solid rgba(0,0,0,.1);background:#fff;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span class="src-badge" style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid;${style}">${esc(src)}</span>
            <strong style="font-size:20px;">${(counts[src] || 0).toLocaleString('vi-VN')}</strong>
          </div>
          <div style="font-size:12px;opacity:.7;margin-top:6px;">Số dòng thuộc nguồn ${esc(src)}</div>
        </div>
      `;
    }).join('');

    const legendItems = (colorEntries.length ? colorEntries.map(([hex, cnt]) => ({ hex, cnt })) : meaningEntries.map(([hex, label]) => ({ hex, cnt: 0, label }))).map(item => {
      const bg = bgOf(item.hex);
      const lbl = item.label || colorLabel(item.hex);
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:8px;background:${bg};border:1px solid rgba(0,0,0,.12);">
          <span style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;">
            <span style="width:12px;height:12px;border-radius:3px;background:#${esc(item.hex)};display:inline-block;border:1px solid rgba(0,0,0,.25);"></span>
            <span>${esc(lbl)}</span>
          </span>
          ${item.cnt > 0 ? `<strong style="font-size:13px;">${item.cnt}</strong>` : ''}
        </div>
      `;
    }).join('');

    const folderSummaryRows = flatNodes
      .filter(e => !Array.isArray(e.node.children) || e.node.children.length === 0)
      .map((e, idx) => {
        const n = e.node;
        const rows = getRowsForNode(n.id);
        const bySrc = {};
        SRC_LIST.forEach(s => { bySrc[s] = 0; });
        rows.forEach(r => {
          const s = normalizeSource(r.src || (r.v && r.v[0]), CFG.defaultSource);
          bySrc[s] = (bySrc[s] || 0) + 1;
        });
        const pathTxt = e.pathNodes.map(x => x.label).join(' / ');
        return `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>
              <button type="button" class="link-btn" data-open-node="${esc(n.id)}" style="border:0;background:transparent;color:#0b3a5b;font-weight:600;cursor:pointer;text-align:left;padding:0;">
                ${esc(n.label)}
              </button>
              <div style="font-size:11px;opacity:.65;">${esc(pathTxt)}</div>
            </td>
            <td style="text-align:right;font-weight:700;">${rows.length}</td>
            <td style="text-align:right;">${bySrc['Vật tư'] || 0}</td>
            <td style="text-align:right;">${bySrc['Tài sản'] || 0}</td>
            <td style="text-align:right;">${bySrc['Đo kiểm'] || 0}</td>
            <td style="text-align:right;">${bySrc['Sửa chữa'] || 0}</td>
            <td style="text-align:right;">${bySrc['Không rõ nguồn'] || 0}</td>
          </tr>
        `;
      }).join('');

    mainEl.innerHTML = `
      <div class="view-header" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">
        <div>
          <h2 style="margin:0;font-size:20px;">📊 Tổng quan Vật tư – Tài sản</h2>
          <div style="font-size:12px;opacity:.75;">
            Nguồn dữ liệu: ${esc(meta.source || 'LAB')} · Cập nhật: ${esc(meta.generated || '')} ·
            Đồng bộ đa thiết bị: <b>${esc(syncInfo.syncText)}</b> (${esc(syncInfo.accountLabel)})
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <button type="button" id="btnOverviewAddItem" style="${ACTION_BTN_STYLE.primary}">+ Thêm vật tư</button>
          <button type="button" id="btnOverviewAddFolder" style="${ACTION_BTN_STYLE.folder}">＋ Tạo thư mục mới</button>
          <button type="button" id="btnOverviewSync" style="${ACTION_BTN_STYLE.sync}">☁ Đồng bộ (${esc(syncInfo.accountLabel)})</button>
          <button type="button" id="btnOverviewExportAll" style="${ACTION_BTN_STYLE.exportBtn}">📗 Xuất Excel toàn bộ</button>
        </div>
      </div>

      <div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px;margin-bottom:14px;">
        <div class="kpi" style="padding:12px 14px;border-radius:10px;border:1px solid rgba(0,0,0,.1);background:#fff;">
          <div style="font-size:12px;opacity:.7;">Tổng thư mục / danh mục</div>
          <strong style="font-size:22px;">${folderCount}</strong>
        </div>
        <div class="kpi" style="padding:12px 14px;border-radius:10px;border:1px solid rgba(0,0,0,.1);background:#fff;">
          <div style="font-size:12px;opacity:.7;">Tổng dòng thống kê</div>
          <strong style="font-size:22px;">${total.toLocaleString('vi-VN')}</strong>
        </div>
        ${sourceCards}
      </div>

      <div style="margin-bottom:16px;padding:12px;border-radius:10px;border:1px solid rgba(0,0,0,.1);background:#fff;">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;">🎨 Màu phân biệt trạng thái & nguồn</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;">
          ${legendItems}
        </div>
      </div>

      <div class="table-wrap" style="overflow-x:auto;border:1px solid rgba(0,0,0,.12);border-radius:8px;background:#fff;">
        <table class="data-table stats-overview-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="white-space:nowrap;">STT</th>
              <th style="white-space:nowrap;">Thư mục / Danh mục</th>
              <th style="white-space:nowrap;">Tổng</th>
              <th style="white-space:nowrap;">Vật tư</th>
              <th style="white-space:nowrap;">Tài sản</th>
              <th style="white-space:nowrap;">Đo kiểm</th>
              <th style="white-space:nowrap;">Sửa chữa</th>
              <th style="white-space:nowrap;">Không rõ</th>
            </tr>
          </thead>
          <tbody>
            ${folderSummaryRows}
          </tbody>
        </table>
      </div>
    `;

    $$('[data-open-node]', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        V.activeId = btn.getAttribute('data-open-node');
        expandAncestorsOf(V.activeId);
        V.route = { page: 'sheet', id: V.activeId };
        render();
      });
    });

    const addFolderBtn = $('#btnOverviewAddFolder', mainEl);
    if (addFolderBtn) {
      addFolderBtn.addEventListener('click', () => createFolderUnder(V.activeId || 'thiet-bi-ip'));
    }

    $('#btnOverviewAddItem', mainEl)?.addEventListener('click', () => openAddItemModal(V.activeId));
    $('#btnOverviewSync', mainEl)?.addEventListener('click', () => {
      if (window.Sync && typeof window.Sync.open === 'function') window.Sync.open();
    });

    const exportAllBtn = $('#btnOverviewExportAll', mainEl);
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => {
        if (typeof XLSX === 'undefined') return;
        const wb = XLSX.utils.book_new();
        const used = new Set();
        for (const entry of flatNodes) {
          const n = entry.node;
          if (Array.isArray(n.children) && n.children.length > 0) continue;
          const sName = sanitizeSheetName(CFG.sheetLabels[n.id] || n.label, used);
          const rows = getRowsForNode(n.id).map((r, i) => normalizeRow(r, i, CFG.defaultSource, STANDARD_COLS, n.id).v);
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([STANDARD_COLS.slice(), ...rows]), sName);
        }
        XLSX.writeFile(wb, 'vat-tu-tai-san-all-sheets.xlsx');
      });
    }
  }

  function renderMoveOptions(currentNodeId) {
    return flatNodes
      .filter(e => !Array.isArray(e.node.children) || e.node.children.length === 0)
      .filter(e => e.node.id !== currentNodeId)
      .map(e => `<option value="${esc(e.node.id)}">${esc(e.pathNodes.map(x => x.label).join(' / '))}</option>`)
      .join('');
  }

  function renderTableRows(currentNodeId, entries) {
    if (!entries.length) {
      return `
        <tr>
          <td colspan="8" style="text-align:center;padding:18px;opacity:.7;">
            Không có dữ liệu vật tư / tài sản phù hợp trong thư mục này.
          </td>
        </tr>
      `;
    }

    const moveOpts = renderMoveOptions(currentNodeId);

    return entries.map(({ row, idx }) => {
      const v = row.v;
      const badgeStyle = SOURCE_BADGE_STYLE[v[0]] || SOURCE_BADGE_STYLE['Không rõ nguồn'];
      const rowBg = row.f && typeof row.f === 'object'
        ? (() => {
            const firstHex = Object.values(row.f).map(c => String(c || '').replace(/^#/, '')).find(Boolean);
            return firstHex ? bgOf(firstHex) : '';
          })()
        : '';

      if (!V.edit) {
        return `
          <tr data-row-idx="${idx}" style="${rowBg ? `background:${rowBg};` : ''}">
            <td style="white-space:nowrap;"><span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid;${badgeStyle}">${esc(v[0])}</span></td>
            <td style="text-align:center;white-space:nowrap;">${esc(v[1])}</td>
            <td>${esc(v[2])}</td>
            <td>${esc(v[3])}</td>
            <td>${esc(v[4])}</td>
            <td>${esc(v[5])}</td>
            <td>${esc(v[6])}</td>
            <td style="white-space:nowrap;">
              <button type="button" class="btn-row-edit" data-idx="${idx}" title="Sửa dòng">✏️</button>
              <select class="row-move-select" data-idx="${idx}" title="Chuyển sang thư mục khác" style="max-width:118px;padding:3px 4px;border-radius:5px;border:1px solid rgba(0,0,0,.2);font-size:12px;">
                <option value="">↗ Chuyển...</option>
                ${moveOpts}
              </select>
              <button type="button" class="btn-row-del" data-idx="${idx}" title="Xoá dòng">🗑</button>
            </td>
          </tr>
        `;
      }

      const srcOpts = SRC_LIST.map(opt =>
        `<option value="${esc(opt)}" ${v[0] === opt ? 'selected' : ''}>${esc(opt)}</option>`
      ).join('');

      return `
        <tr data-row-idx="${idx}" style="${rowBg ? `background:${rowBg};` : ''}">
          <td><select class="cell-edit" data-col="0">${srcOpts}</select></td>
          <td style="text-align:center;white-space:nowrap;">${esc(v[1])}</td>
          <td><input type="text" class="cell-edit" data-col="2" value="${esc(v[2])}"></td>
          <td><input type="text" class="cell-edit" data-col="3" value="${esc(v[3])}"></td>
          <td><input type="text" class="cell-edit" data-col="4" value="${esc(v[4])}"></td>
          <td><input type="text" class="cell-edit" data-col="5" value="${esc(v[5])}"></td>
          <td><input type="text" class="cell-edit" data-col="6" value="${esc(v[6])}"></td>
          <td style="white-space:nowrap;">
            <select class="row-move-select" data-idx="${idx}" title="Chuyển sang thư mục khác" style="max-width:118px;padding:3px 4px;border-radius:5px;border:1px solid rgba(0,0,0,.2);font-size:12px;">
              <option value="">↗ Chuyển...</option>
              ${moveOpts}
            </select>
            <button type="button" class="btn-row-del" data-idx="${idx}" title="Xoá dòng">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function bindMainTableEvents(mainEl, currentNodeId) {
    $$('.btn-row-edit', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        V.edit = true;
        const btnEdit = $('#btnEdit');
        if (btnEdit) btnEdit.setAttribute('aria-pressed', 'true');
        const eb = $('#editbar');
        if (eb) eb.hidden = false;
        renderMain();
      });
    });

    $$('.btn-row-del', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        const rows = getRowsForNode(currentNodeId);
        if (!rows[idx]) return;
        if (!confirm('Xoá dòng vật tư này?')) return;
        rows.splice(idx, 1);
        rows.forEach((r, i) => {
          r.r = i + 1;
          if (Array.isArray(r.v)) r.v[1] = String(i + 1);
        });
        persist();
        render();
        toast('Đã xoá dòng');
      });
    });

    $$('.row-move-select', mainEl).forEach(sel => {
      sel.addEventListener('change', () => {
        const targetId = sel.value;
        const idx = Number(sel.getAttribute('data-idx'));
        if (targetId) moveRowToNode(currentNodeId, idx, targetId);
      });
    });

    if (V.edit) {
      $$('tbody tr[data-row-idx]', mainEl).forEach(tr => {
        const idx = Number(tr.getAttribute('data-row-idx'));
        const rows = getRowsForNode(currentNodeId);
        const rowObj = rows[idx];
        if (!rowObj) return;
        $$('.cell-edit', tr).forEach(inp => {
          const colIdx = Number(inp.getAttribute('data-col'));
          const onCommit = () => {
            const val = inp.value;
            if (!Array.isArray(rowObj.v)) rowObj.v = [DEFAULT_SOURCE, String(idx + 1), '', '', '', '', ''];
            rowObj.v[colIdx] = val;
            if (colIdx === 0) {
              const normSrc = normalizeSource(val, CFG.defaultSource);
              rowObj.src = normSrc;
              rowObj.v[0] = normSrc;
            }
            touch(rowObj);
            persist();
          };
          inp.addEventListener('change', onCommit);
        });
      });
    }
  }

  function renderMain() {
    const mainEl = $('#main');
    if (!mainEl) return;

    if (V.route.page === 'overview') {
      if (V.query && V.query.trim()) {
        renderGlobalSearchView(mainEl);
      } else {
        renderOverview(mainEl);
      }
      return;
    }

    const currentEntry = nodeById.get(V.activeId) || flatNodes[0];
    if (!currentEntry) {
      renderOverview(mainEl);
      return;
    }
    V.activeId = currentEntry.node.id;

    const node = currentEntry.node;
    const breadcrumb = currentEntry.pathNodes.map(n => n.label).join(' / ');
    const filtered = getFilteredRows(node.id);
    const syncInfo = getSyncStatusInfo();

    const srcFilterOpts = ['ALL', ...SRC_LIST].map(opt => {
      const label = opt === 'ALL' ? 'Tất cả nguồn' : opt;
      return `<option value="${esc(opt)}" ${V.sourceFilter === opt ? 'selected' : ''}>${esc(label)}</option>`;
    }).join('');

    mainEl.innerHTML = `
      <div class="view-header" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-size:12px;opacity:.75;">${esc(breadcrumb)} · ☁ ${esc(syncInfo.syncText)} (${esc(syncInfo.accountLabel)})</div>
          <h2 style="margin:2px 0 0;font-size:20px;">${esc(node.icon || '📄')} ${esc(node.label)} <small style="font-weight:400;opacity:.7;">(${filtered.length} dòng)</small></h2>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <select id="selSourceFilter" aria-label="Lọc theo nguồn" style="padding:7px 10px;border-radius:7px;border:1px solid #cbd5e1;background:#ffffff;color:#1e293b;font-size:13px;font-weight:600;cursor:pointer;">
            ${srcFilterOpts}
          </select>
          <button type="button" id="btnSheetAddItem" style="${ACTION_BTN_STYLE.primary}">+ Thêm vật tư</button>
          <button type="button" id="btnSheetAddFolder" style="${ACTION_BTN_STYLE.folder}">＋ Tạo thư mục con</button>
          <button type="button" id="btnSheetOverview" style="${ACTION_BTN_STYLE.neutral}">🏠 Tổng quan</button>
        </div>
      </div>

      ${renderHorizontalBar(currentEntry)}

      <div class="table-wrap responsive-table-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(0,0,0,.12);border-radius:8px;background:#fff;">
        <table class="data-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="white-space:nowrap;">Nguồn</th>
              <th style="white-space:nowrap;">STT</th>
              <th style="white-space:nowrap;">Tên Vật Tư</th>
              <th style="white-space:nowrap;">Serial</th>
              <th style="white-space:nowrap;">Mã VT</th>
              <th style="white-space:nowrap;">Part number</th>
              <th style="white-space:nowrap;">Ghi chú</th>
              <th style="white-space:nowrap;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(node.id, filtered)}
          </tbody>
        </table>
      </div>
    `;

    $('#selSourceFilter', mainEl)?.addEventListener('change', e => {
      V.sourceFilter = e.target.value || 'ALL';
      renderMain();
    });

    $('#btnSheetAddItem', mainEl)?.addEventListener('click', () => openAddItemModal(node.id));
    $('#btnSheetAddFolder', mainEl)?.addEventListener('click', () => createFolderUnder(node.id));
    $('#btnSheetOverview', mainEl)?.addEventListener('click', () => {
      V.route = { page: 'overview', id: null };
      render();
    });

    $$('[data-h-node]', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-h-node');
        if (targetId && nodeById.has(targetId)) {
          V.activeId = targetId;
          expandAncestorsOf(targetId);
          V.route = { page: 'sheet', id: targetId };
          render();
        }
      });
    });

    bindMainTableEvents(mainEl, node.id);
  }

  function render() {
    renderSidebar();
    renderMain();
  }

  function refreshFromSync() {
    syncStoreFromST();
    saveLocal();
    const d = $('#dirty');
    if (d) d.hidden = !ST.dirty;
    render();
  }

  function bindEvents() {
    const sb = $('#sidebar');
    if (sb) {
      sb.addEventListener('click', e => {
        const toggleBtn = e.target.closest('[data-toggle-node]');
        if (toggleBtn) {
          e.stopPropagation();
          const nid = toggleBtn.getAttribute('data-toggle-node');
          V.treeCollapsed[nid] = !V.treeCollapsed[nid];
          renderSidebar();
          return;
        }

        const goOv = e.target.closest('[data-go-overview]');
        if (goOv) {
          V.route = { page: 'overview', id: null };
          render();
          closeMobileSidebar();
          return;
        }

        const createF = e.target.closest('[data-create-folder]');
        if (createF) {
          createFolderUnder(createF.getAttribute('data-create-folder'));
          return;
        }

        const nodeBtn = e.target.closest('[data-node-id]');
        if (nodeBtn) {
          const nid = nodeBtn.getAttribute('data-node-id');
          if (nid && nodeById.has(nid)) {
            const entry = nodeById.get(nid);
            const hasChildren = entry && Array.isArray(entry.node.children) && entry.node.children.length > 0;
            if (hasChildren) {
              V.treeCollapsed[nid] = !V.treeCollapsed[nid];
            }
            V.activeId = nid;
            expandAncestorsOf(nid);
            V.route = { page: 'sheet', id: nid };
            render();
            if (!hasChildren) closeMobileSidebar();
          }
        }
      });
    }

    const gq = $('#gq');
    const gqClear = $('#gqClear');
    if (gq) {
      gq.addEventListener('input', () => {
        V.query = gq.value || '';
        if (gqClear) gqClear.hidden = !V.query;
        renderMain();
      });
    }
    if (gqClear) {
      gqClear.addEventListener('click', () => {
        V.query = '';
        if (gq) gq.value = '';
        gqClear.hidden = true;
        renderMain();
      });
    }

    const btnEdit = $('#btnEdit');
    const editbar = $('#editbar');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        V.edit = !V.edit;
        btnEdit.setAttribute('aria-pressed', String(V.edit));
        if (editbar) editbar.hidden = !V.edit;
        renderMain();
      });
    }

    const btnTheme = $('#btnTheme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        document.body.classList.toggle('dark');
      });
    }

    const btnPrint = $('#btnPrint');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => window.print());
    }

    const menuExport = $('#menuExport');
    if (menuExport) {
      menuExport.addEventListener('click', e => {
        const actBtn = e.target.closest('[data-act]');
        if (!actBtn) return;
        const act = actBtn.getAttribute('data-act');
        if (act === 'reset') {
          if (confirm('Khôi phục toàn bộ dữ liệu gốc? Mọi thay đổi chưa xuất sẽ mất.')) {
            resetToBaseline();
            render();
            toast('Đã khôi phục dữ liệu gốc');
          }
        } else if (act === 'json-out') {
          const blob = new Blob([JSON.stringify({
            customFolders: customFoldersByParent,
            sheets: ST.sheets,
            slips: ST.slips
          }, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'vat-tu-tai-san-backup.json';
          a.click();
        } else if (act === 'json-in') {
          $('#fileIn')?.click();
        } else if (act === 'csv-cur') {
          const targetId = V.activeId || (flatNodes[0] && flatNodes[0].node.id);
          const rows = targetId ? getRowsForNode(targetId) : [];
          const csvLines = [STANDARD_COLS.join(',')].concat(
            rows.map((r, i) => normalizeRow(r, i, CFG.defaultSource, STANDARD_COLS, targetId).v
              .map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
          );
          const blob = new Blob(['\ufeff' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${targetId || 'sheet'}.csv`;
          a.click();
        } else if (act === 'xlsx-cur' && typeof XLSX !== 'undefined') {
          const targetId = V.activeId || (flatNodes[0] && flatNodes[0].node.id);
          const entry = nodeById.get(targetId);
          const rows = targetId ? getRowsForNode(targetId).map((r, i) => normalizeRow(r, i, CFG.defaultSource, STANDARD_COLS, targetId).v) : [];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([STANDARD_COLS.slice(), ...rows]), sanitizeSheetName(entry ? entry.node.label : 'Sheet', new Set()));
          XLSX.writeFile(wb, `${targetId || 'sheet'}.xlsx`);
        } else if (act === 'xlsx-all' && typeof XLSX !== 'undefined') {
          const wb = XLSX.utils.book_new();
          const used = new Set();
          for (const entry of flatNodes) {
            const n = entry.node;
            if (Array.isArray(n.children) && n.children.length > 0) continue;
            const rows = getRowsForNode(n.id).map((r, i) => normalizeRow(r, i, CFG.defaultSource, STANDARD_COLS, n.id).v);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([STANDARD_COLS.slice(), ...rows]), sanitizeSheetName(n.label, used));
          }
          XLSX.writeFile(wb, 'vat-tu-tai-san-all.xlsx');
        }
        menuExport.removeAttribute('open');
      });
    }

    const fileIn = $('#fileIn');
    if (fileIn) {
      fileIn.addEventListener('change', () => {
        const f = fileIn.files && fileIn.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result || '{}'));
            if (parsed.customFolders) customFoldersByParent = parsed.customFolders;
            rebuildTreeIndex();
            initCollapsedState(true);
            if (Array.isArray(parsed.sheets)) {
              ensureIds(parsed.sheets);
              storeData = buildStoreFromSheets(parsed.sheets);
            }
            if (parsed.slips) ST.slips = parsed.slips;
            persist();
            render();
            toast('Đã nhập sao lưu JSON');
          } catch (_) {
            toast('File JSON không hợp lệ', 3500);
          }
        };
        reader.readAsText(f);
        fileIn.value = '';
      });
    }

    const btnMenu = $('#btnMenu');
    const sidebar = $('#sidebar');
    const overlay = $('#overlay');
    function closeMobileSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
    }
    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', closeMobileSidebar);
    }

    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== gq && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement && document.activeElement.tagName) || '')) {
        e.preventDefault();
        gq?.focus();
      }
    });

    window.addEventListener('hashchange', () => {
      parseHash();
      render();
    });
  }

  function boot() {
    try {
      const tEl = $('#appTitle');
      const sEl = $('#appSub');
      if (tEl) tEl.textContent = CFG.title || 'Tài sản – Vật tư Truyền dẫn LAB';
      if (sEl) sEl.textContent = CFG.subtitle || '';

      if (window.APP_DATA && Array.isArray(window.APP_DATA.sheets)) {
        DATA = window.APP_DATA;
        window.LabApp.DATA = DATA;
      }

      loadState();
      parseHash();
      bindEvents();
      render();
    } catch (e) {
      renderOverview($('#main') || document.body);
      toast('Đã tải giao diện dự phòng', 3500);
    } finally {
      hideBoot();
      if (window.Sync && typeof window.Sync.init === 'function') {
        window.Sync.init(window.LabApp);
      }
    }
  }

  window.LabApp = {
    ver: BUILD,
    CFG,
    DATA,
    ST,
    V,
    esc,
    normalizeSource,
    sheetById,
    labelOf,
    isStock,
    stockRows,
    touch,
    saveLocal,
    resetToBaseline,
    refresh: refreshFromSync,
    toast,
    openAddItemModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
