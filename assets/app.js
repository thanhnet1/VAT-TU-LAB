/* =====================================================================
   assets/app.js – VẬT TƯ – TÀI SẢN
   - Tổng quan thống kê + màu phân biệt trạng thái
   - Cây thư mục sổ/thu gọn + nút tạo thêm thư mục
   - Nút chuyển vật tư sang thư mục khác
   - Bảng cân đối trên cả điện thoại và máy tính
   ===================================================================== */
(function () {
  'use strict';

  const BUILD = '2026.11.21-4';
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

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const LS = k => `${CFG.storageKey}:${k}`;
  const clone = o => JSON.parse(JSON.stringify(o));

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

  function collectLeafNodes(node) {
    if (!node) return [];
    if (!Array.isArray(node.children) || node.children.length === 0) return [node];
    const leaves = [];
    for (const child of node.children) {
      leaves.push(...collectLeafNodes(child));
    }
    return leaves;
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
    return 'truyen-dan-thiet-bi';
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
  let ST = { sheets: [], slips: { xuat: [], nhap: [] }, dirty: false };
  const V = {
    route: { page: 'overview', id: null },
    activeId: (flatNodes[0] && flatNodes[0].node.id) || null,
    edit: false,
    query: '',
    sourceFilter: 'ALL',
    treeCollapsed: {}
  };

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
      window.Sync.schedule();
    }
  }

  function resetToBaseline() {
    localStorage.removeItem(LS('state'));
    customFoldersByParent = {};
    rebuildTreeIndex();
    const rawSheets = (DATA && Array.isArray(DATA.sheets)) ? clone(DATA.sheets) : [];
    ensureIds(rawSheets);
    storeData = buildStoreFromSheets(rawSheets);
    syncSTFromStore();
    ST.slips = { xuat: [], nhap: [] };
    ST.dirty = false;
    const d = $('#dirty');
    if (d) d.hidden = true;
    saveLocal();
  }

  const sheetById = id => (ST && ST.sheets ? ST.sheets.find(s => s.id === id) : null);
  const labelOf = s => (s ? (CFG.sheetLabels[s.id] || s.name || s.id) : '');
  const isStock = () => true;
  const stockRows = b => (b && b.rows) || [];

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

  function moveRowToNode(fromNodeId, rowIdx, toNodeId) {
    if (!toNodeId || fromNodeId === toNodeId) return;
    const srcRows = getRowsForNode(fromNodeId);
    const targetEntry = nodeById.get(toNodeId);
    if (!srcRows[rowIdx] || !targetEntry) return;

    const [moved] = srcRows.splice(rowIdx, 1);
    const dstRows = getRowsForNode(toNodeId);
    const normMoved = normalizeRow(moved, dstRows.length, CFG.defaultSource, STANDARD_COLS, toNodeId);
    normMoved.v[1] = String(dstRows.length + 1);
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
    const parentEntry = nodeById.get(parentId);
    const parentLabel = parentEntry ? parentEntry.node.label : 'Thư mục';
    const rawName = prompt(`Nhập tên thư mục mới trong "${parentLabel}":`);
    if (!rawName || !rawName.trim()) return;
    const cleanName = rawName.trim();
    const newId = 'folder-' + uid();

    if (!Array.isArray(customFoldersByParent[parentId])) {
      customFoldersByParent[parentId] = [];
    }
    customFoldersByParent[parentId].push({
      id: newId,
      label: cleanName,
      icon: '📄',
      isDynamicGroup: true,
      allowCreate: true,
      matchKeywords: [fold(cleanName)]
    });

    delete V.treeCollapsed[parentId];
    rebuildTreeIndex();
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
      return;
    }
    V.route = { page: 'overview', id: null };
  }

  function renderSidebar() {
    const sb = $('#sidebar');
    if (!sb) return;

    const renderNodes = (nodes, depth = 0) => {
      if (!Array.isArray(nodes) || !nodes.length) return '';
      return `<div class="tree-children" style="padding-left:${depth ? 12 : 0}px;">` +
        nodes.map(node => {
          const isCollapsed = !!V.treeCollapsed[node.id];
          const isActive = V.route.page === 'sheet' && V.activeId === node.id;
          const totalCount = countNodeRowsDeep(node);
          const hasChildren = Array.isArray(node.children) && node.children.length > 0;
          const canAddChild = !!node.allowCreate;

          return `
            <div class="tree-node ${isCollapsed ? 'collapsed' : ''}" data-node="${esc(node.id)}" style="margin:2px 0;">
              <div class="tree-row ${isActive ? 'active' : ''}" style="display:flex;align-items:center;justify-content:space-between;gap:4px;padding:5px 7px;border-radius:6px;cursor:pointer;background:${isActive ? 'rgba(11,58,91,.14)' : 'transparent'};">
                <button type="button" class="tree-toggle-btn" data-toggle-node="${esc(node.id)}" aria-label="Thu gọn hoặc mở rộng" style="border:0;background:transparent;cursor:pointer;padding:0 3px;font-size:12px;line-height:1;">
                  ${hasChildren ? (isCollapsed ? '▸' : '▾') : '•'}
                </button>
                <button type="button" class="tree-select-btn" data-node-id="${esc(node.id)}" style="flex:1;min-width:0;border:0;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;gap:6px;text-align:left;padding:0;font-weight:${isActive ? '600' : '400'};">
                  <span>${esc(node.icon || (hasChildren ? '📁' : '📄'))}</span>
                  <span class="nm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(node.label)}</span>
                </button>
                <span class="ct" style="font-size:12px;opacity:.75;">${totalCount}</span>
              </div>
              ${!isCollapsed ? `
                ${hasChildren ? renderNodes(node.children, depth + 1) : ''}
                ${canAddChild ? `
                  <div style="padding-left:${(depth + 1) * 10}px;margin:2px 0 4px;">
                    <button type="button" class="tree-add-btn" data-create-folder="${esc(node.id)}" style="width:100%;text-align:left;padding:4px 8px;border:1px dashed rgba(11,58,91,.28);border-radius:6px;background:transparent;color:inherit;font-size:12px;opacity:.85;cursor:pointer;">
                      ＋ Tạo thư mục mới
                    </button>
                  </div>
                ` : ''}
              ` : ''}
            </div>
          `;
        }).join('') +
      `</div>`;
    };

    const ovActive = V.route.page === 'overview' && !V.query ? 'active' : '';
    sb.innerHTML = `
      <div class="tree-root">
        <button type="button" class="tree-row ${ovActive}" data-go-overview="1" style="width:100%;margin-bottom:8px;border:0;background:${ovActive ? 'rgba(11,58,91,.14)' : 'transparent'};cursor:pointer;text-align:left;padding:7px 8px;border-radius:6px;display:flex;align-items:center;gap:6px;">
          <span>🏠</span><span class="nm"><b>Tổng quan (Vật tư - Tài sản)</b></span>
        </button>
        ${renderNodes(activeTree, 0)}
      </div>
    `;
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
          style="padding:5px 10px;border-radius:6px;border:1px solid ${selected ? '#0b3a5b' : 'rgba(0,0,0,.15)'};background:${selected ? '#0b3a5b' : '#fff'};color:${selected ? '#fff' : 'inherit'};cursor:pointer;font-size:13px;font-weight:${selected ? '600' : '500'};white-space:nowrap;">
          ${esc(item.label)} (${countNodeRowsDeep(item)})
        </button>
        ${sep}
      `;
    }).join('');

    return `
      <div class="horizontal-folder-bar" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 12px;margin-bottom:12px;border-radius:8px;background:rgba(11,58,91,.05);border:1px solid rgba(11,58,91,.14);overflow-x:auto;">
        <span style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:.8;margin-right:4px;">
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

  function renderOverview(mainEl) {
    const { counts, total, folderCount, colorEntries } = computeStats();
    const meta = (DATA && DATA.meta) || {};
    const meaningEntries = Object.entries(CFG.colorMeaning || {});

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
          <div style="font-size:12px;opacity:.7;">Nguồn dữ liệu: ${esc(meta.source || 'LAB')} · Cập nhật: ${esc(meta.generated || '')}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <button type="button" id="btnOverviewAddFolder" class="btn">＋ Tạo thư mục mới</button>
          <button type="button" id="btnOverviewExportAll" class="btn accent">📗 Xuất Excel toàn bộ</button>
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
        V.route = { page: 'sheet', id: V.activeId };
        render();
      });
    });

    const addFolderBtn = $('#btnOverviewAddFolder', mainEl);
    if (addFolderBtn) {
      addFolderBtn.addEventListener('click', () => createFolderUnder(V.activeId || 'truyen-dan-thiet-bi'));
    }

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
            Không có dữ liệu vật tư / tài sản phù hợp.
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

  function renderMain() {
    const mainEl = $('#main');
    if (!mainEl) return;

    if (V.route.page === 'overview' && !V.query) {
      renderOverview(mainEl);
      return;
    }

    const currentEntry = nodeById.get(V.activeId) || flatNodes[0];
    if (!currentEntry) return;
    V.activeId = currentEntry.node.id;

    const node = currentEntry.node;
    const breadcrumb = currentEntry.pathNodes.map(n => n.label).join(' / ');
    const filtered = getFilteredRows(node.id);

    const srcFilterOpts = ['ALL', ...SRC_LIST].map(opt => {
      const label = opt === 'ALL' ? 'Tất cả nguồn' : opt;
      return `<option value="${esc(opt)}" ${V.sourceFilter === opt ? 'selected' : ''}>${esc(label)}</option>`;
    }).join('');

    mainEl.innerHTML = `
      <div class="view-header" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-size:12px;opacity:.7;">${esc(breadcrumb)}</div>
          <h2 style="margin:2px 0 0;font-size:20px;">${esc(node.icon || '')} ${esc(node.label)} <small style="font-weight:400;opacity:.7;">(${filtered.length} dòng)</small></h2>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <select id="filterSource" aria-label="Lọc theo nguồn" style="padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.2);">
            ${srcFilterOpts}
          </select>
          <button type="button" id="btnAddFolderHere" class="btn">＋ Thư mục mới</button>
          <button type="button" id="btnAddRow" class="btn accent">+ Thêm dòng</button>
          <button type="button" id="btnExportSheets" class="btn">📗 Xuất Excel (tách sheet)</button>
        </div>
      </div>

      ${renderHorizontalBar(currentEntry)}

      <div class="table-wrap responsive-table-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(0,0,0,.12);border-radius:8px;background:#fff;">
        <table id="statsTable" class="data-table" style="width:100%;border-collapse:collapse;">
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

    $$('[data-h-node]', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        V.activeId = btn.getAttribute('data-h-node');
        V.route = { page: 'sheet', id: V.activeId };
        render();
      });
    });

    const filterEl = $('#filterSource', mainEl);
    if (filterEl) {
      filterEl.addEventListener('change', () => {
        V.sourceFilter = filterEl.value;
        renderMain();
      });
    }

    const addFolderBtn = $('#btnAddFolderHere', mainEl);
    if (addFolderBtn) {
      addFolderBtn.addEventListener('click', () => createFolderUnder(node.id));
    }

    const addBtn = $('#btnAddRow', mainEl);
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const rows = getRowsForNode(node.id);
        const defaultSrc = V.sourceFilter !== 'ALL' ? V.sourceFilter : CFG.defaultSource;
        rows.push(normalizeRow({
          i: 'u' + uid(),
          src: defaultSrc,
          v: [defaultSrc, String(rows.length + 1), '', '', '', '', '']
        }, rows.length, defaultSrc, STANDARD_COLS, node.id));
        persist();
        render();
      });
    }

    const exportBtn = $('#btnExportSheets', mainEl);
    if (exportBtn) {
      exportBtn.addEventListener('click', () => exportExcelSeparateSheets(currentEntry.node));
    }

    $$('.cell-edit', mainEl).forEach(inp => {
      inp.addEventListener('change', () => {
        const tr = inp.closest('tr');
        const idx = Number(tr && tr.getAttribute('data-row-idx'));
        const col = Number(inp.getAttribute('data-col'));
        const rows = getRowsForNode(node.id);
        if (!rows[idx]) return;
        const norm = normalizeRow(rows[idx], idx, CFG.defaultSource, STANDARD_COLS, node.id);
        norm.v[col] = inp.value;
        if (col === 0) norm.src = normalizeSource(inp.value, CFG.defaultSource);
        rows[idx] = norm;
        persist();
        renderSidebar();
      });
    });

    $$('.btn-row-edit', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        V.edit = true;
        const editBtn = $('#btnEdit');
        if (editBtn) editBtn.setAttribute('aria-pressed', 'true');
        renderMain();
      });
    });

    $$('.row-move-select', mainEl).forEach(sel => {
      sel.addEventListener('change', () => {
        const destId = sel.value;
        if (!destId) return;
        const idx = Number(sel.getAttribute('data-idx'));
        moveRowToNode(node.id, idx, destId);
      });
    });

    $$('.btn-row-del', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        const rows = getRowsForNode(node.id);
        if (!rows[idx]) return;
        rows.splice(idx, 1);
        persist();
        render();
      });
    });
  }

  function exportExcelSeparateSheets(targetNode) {
    if (typeof XLSX === 'undefined') {
      toast('Chưa tải được thư viện Excel (XLSX).', 4000);
      return;
    }

    const leaves = collectLeafNodes(targetNode);
    const sheetTargets = leaves.length ? leaves : [targetNode];
    const wb = XLSX.utils.book_new();
    const usedNames = new Set();

    for (const itemNode of sheetTargets) {
      const rawTitle = CFG.sheetLabels[itemNode.id] || itemNode.label || itemNode.id;
      const sheetName = sanitizeSheetName(rawTitle, usedNames);
      const rows = getRowsForNode(itemNode.id);

      const aoa = [STANDARD_COLS.slice()];
      rows.forEach((r, idx) => {
        const norm = normalizeRow(r, idx, CFG.defaultSource, STANDARD_COLS, itemNode.id);
        aoa.push([
          norm.v[0],
          norm.v[1] || String(idx + 1),
          norm.v[2],
          norm.v[3],
          norm.v[4],
          norm.v[5],
          norm.v[6]
        ]);
      });

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName);
    }

    const slug = fold(targetNode.label || 'thong-ke').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'thong-ke';
    XLSX.writeFile(wb, `${slug}-cac-sheet.xlsx`);
  }

  function handleImportFile(ev) {
    const file = ev.target && ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      toast('Chưa tải được thư viện XLSX để đọc tệp.', 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        let importedCount = 0;

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (!Array.isArray(aoa) || !aoa.length) return;

          const fallbackTargetId =
            resolveTargetNodeId(sheetName) ||
            resolveTargetNodeId(aoa[0] && aoa[0][0]) ||
            V.activeId ||
            (flatNodes[0] && flatNodes[0].node.id);

          for (let rIdx = 0; rIdx < aoa.length; rIdx++) {
            const rowArr = aoa[rIdx];
            if (!Array.isArray(rowArr) || !rowArr.some(c => String(c || '').trim() !== '')) continue;

            const c0 = String(rowArr[0] || '').trim().toLowerCase();
            const c1 = String(rowArr[1] || '').trim().toLowerCase();
            if (c0 === 'nguồn' || c0 === 'nguon' || c1 === 'stt') continue;

            const hasSourceCol = SRC_LIST.some(opt => fold(opt) === fold(rowArr[0]));
            const src = hasSourceCol ? normalizeSource(rowArr[0], CFG.defaultSource) : CFG.defaultSource;
            const tenVT = String(hasSourceCol ? rowArr[2] : (rowArr[2] || rowArr[1] || rowArr[0] || '')).trim();
            const serial = String(hasSourceCol ? rowArr[3] : (rowArr[3] || '')).trim();
            const maVT = String(hasSourceCol ? rowArr[4] : (rowArr[1] || '')).trim();
            const partNo = String(hasSourceCol ? rowArr[5] : (rowArr[4] || '')).trim();
            const ghiChu = String(hasSourceCol ? rowArr[6] : (rowArr[5] || '')).trim();

            if (!tenVT && !serial && !maVT && !partNo) continue;

            const draftRow = normalizeRow({
              i: 'u' + uid(),
              src,
              v: [src, '0', tenVT, serial, maVT, partNo, ghiChu]
            }, 0, src, STANDARD_COLS, fallbackTargetId);

            const targetId = classifyRowTarget(sheetName, sheetName, draftRow, fallbackTargetId);
            if (!targetId) continue;
            const destRows = getRowsForNode(targetId);
            draftRow.v[1] = String(destRows.length + 1);
            destRows.push(draftRow);
            importedCount++;
          }
        });

        persist();
        render();
        toast(`Đã nhập ${importedCount} dòng dữ liệu.`, 3500);
      } catch (err) {
        toast('Lỗi đọc tệp: ' + (err && err.message ? err.message : err), 4500);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function render() {
    syncSTFromStore();
    renderSidebar();
    renderMain();
  }

  function refreshFromSync() {
    syncStoreFromST();
    render();
  }

  function bindGlobal() {
    const sb = $('#sidebar');
    const overlay = $('#overlay');
    const btnMenu = $('#btnMenu');

    if (btnMenu && sb) {
      btnMenu.addEventListener('click', () => {
        sb.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show', sb.classList.contains('open'));
      });
    }
    if (overlay && sb) {
      overlay.addEventListener('click', () => {
        sb.classList.remove('open');
        overlay.classList.remove('show');
      });
    }

    if (sb) {
      sb.addEventListener('click', e => {
        const toggleBtn = e.target.closest('[data-toggle-node]');
        if (toggleBtn) {
          const nid = toggleBtn.getAttribute('data-toggle-node');
          V.treeCollapsed[nid] = !V.treeCollapsed[nid];
          renderSidebar();
          return;
        }

        const createBtn = e.target.closest('[data-create-folder]');
        if (createBtn) {
          createFolderUnder(createBtn.getAttribute('data-create-folder'));
          return;
        }

        const nodeBtn = e.target.closest('[data-node-id]');
        if (nodeBtn) {
          V.activeId = nodeBtn.getAttribute('data-node-id');
          V.route = { page: 'sheet', id: V.activeId };
          if (sb.classList.contains('open')) {
            sb.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
          }
          render();
          return;
        }

        if (e.target.closest('[data-go-overview]')) {
          V.route = { page: 'overview', id: null };
          if (sb.classList.contains('open')) {
            sb.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
          }
          render();
        }
      });
    }

    const gq = $('#gq');
    const gqClear = $('#gqClear');
    if (gq) {
      gq.addEventListener('input', () => {
        V.query = gq.value;
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
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        V.edit = !V.edit;
        btnEdit.setAttribute('aria-pressed', String(V.edit));
        const eb = $('#editbar');
        if (eb) eb.hidden = !V.edit;
        renderMain();
      });
    }

    const btnPrint = $('#btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', () => window.print());

    const btnTheme = $('#btnTheme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem(LS('theme'), next);
      });
    }

    const importInput = $('#importFileInput');
    if (importInput) importInput.addEventListener('change', handleImportFile);

    $$('#menuExport [data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-act');
        const curEntry = nodeById.get(V.activeId) || flatNodes[0];
        if (act === 'xlsx-all') {
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
        } else if (act === 'xlsx-cur' && curEntry) {
          exportExcelSeparateSheets(curEntry.node);
        } else if (act === 'json-out') {
          syncSTFromStore();
          const blob = new Blob([JSON.stringify({ sheets: ST.sheets, slips: ST.slips, customFolders: customFoldersByParent }, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'sao-luu-vat-tu-tai-san.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 500);
        } else if (act === 'reset') {
          if (confirm('Khôi phục dữ liệu gốc? Mọi chỉnh sửa trên máy sẽ mất.')) {
            resetToBaseline();
            render();
            toast('Đã khôi phục dữ liệu gốc');
          }
        }
      });
    });

    window.addEventListener('hashchange', () => {
      parseHash();
      render();
    });
  }

  window.LabApp = {
    BUILD,
    CFG,
    esc,
    uid,
    fold,
    tokensOf,
    toast,
    sheetById,
    labelOf,
    isStock,
    stockRows,
    normalizeSource,
    normalizeRow,
    SOURCE_OPTIONS: SRC_LIST,
    STANDARD_COLS,
    get DATA() { return DATA; },
    get ST() { return ST; },
    get V() { return V; },
    saveLocal,
    persist,
    resetToBaseline,
    refresh: refreshFromSync,
    render,
    keepScroll: fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); },
    touch: () => {}
  };

  function start(data) {
    DATA = Object.assign({ meta: { source: 'LAB', generated: '', version: '' }, sheets: [] }, data || {});
    loadState();
    parseHash();

    const appTitle = $('#appTitle');
    const appSub = $('#appSub');
    if (appTitle) appTitle.textContent = CFG.title;
    if (appSub) appSub.textContent = CFG.subtitle;
    const dirtyEl = $('#dirty');
    if (dirtyEl) dirtyEl.hidden = !ST.dirty;

    try { if (window.Slips && typeof window.Slips.init === 'function') window.Slips.init(window.LabApp); } catch (_) {}
    try { if (window.Sync && typeof window.Sync.init === 'function') window.Sync.init(window.LabApp); } catch (_) {}

    bindGlobal();
    render();

    const boot = $('#boot');
    const topbar = $('#topbar');
    const layout = $('#layout');
    if (boot) boot.remove();
    if (topbar) topbar.hidden = false;
    if (layout) layout.hidden = false;
  }

  async function decrypt(enc, pw) {
    const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, key, b64(enc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function unlock() {
    const bootEl = $('#boot');
    if (!bootEl) return;
    bootEl.innerHTML = `<form class="lock" id="lockForm"><h2>🔒 ${esc(CFG.title)}</h2><p>Dữ liệu được bảo vệ bằng mật khẩu.</p>
      <input type="password" id="pw" placeholder="Nhập mật khẩu" autocomplete="current-password" autofocus><div class="err" id="pwErr"></div><button>Mở khoá</button></form>`;
    $('#lockForm').addEventListener('submit', async ev => {
      ev.preventDefault();
      const err = $('#pwErr');
      if (err) err.textContent = 'Đang giải mã…';
      try {
        if (!window.crypto || !crypto.subtle) throw new Error('nocrypto');
        start(await decrypt(window.LAB_DATA_ENC, $('#pw').value));
      } catch (e) {
        if (err) err.textContent = e.message === 'nocrypto' ? 'Trình duyệt cần mở bằng https://' : 'Sai mật khẩu.';
      }
    });
  }

  function boot() {
    const t = localStorage.getItem(LS('theme')) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;

    if (window.LAB_DATA) {
      start(window.LAB_DATA);
    } else if (window.LAB_DATA_ENC) {
      unlock();
    } else {
      start({ meta: { source: 'LAB', generated: '', version: '' }, sheets: [] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
