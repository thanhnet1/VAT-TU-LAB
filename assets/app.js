/* =====================================================================
   assets/app.js – WEB APP: TÀI SẢN – VẬT TƯ TRUYỀN DẪN LAB
   Phiên bản: 2026.11.21-1
   ===================================================================== */
(function () {
  'use strict';

  const SOURCE_OPTIONS = ['Vật tư', 'Tài sản', 'Đo kiểm', 'Sửa chữa', 'Không rõ nguồn'];
  const DEFAULT_SOURCE = 'Không rõ nguồn';
  const STANDARD_COLS = ['Nguồn', 'STT', 'Tên Vật Tư', 'Serial', 'Mã VT', 'Part number', 'Ghi chú'];

  const CFG = Object.assign({
    title: 'Tài sản – Vật tư Truyền dẫn LAB',
    subtitle: '',
    sourceLabel: 'Nguồn',
    sourceOptions: SOURCE_OPTIONS,
    storageKey: 'lab-xvt-v1',
    groupNames: ['Thiết bị theo hệ thống', 'Vật tư rời / đo kiểm'],
    sheetLabels: {},
    colorMeaning: {},
    maxSearchResults: 400,
    treeMenu: []
  }, window.APP_CONFIG || {});

  const SRC_LIST = Array.isArray(CFG.sourceOptions) && CFG.sourceOptions.length
    ? CFG.sourceOptions
    : SOURCE_OPTIONS;

  const BUILD = '2026.11.21-1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const LS = k => CFG.storageKey + ':' + k;
  const COLOR_NAMES = {
    FFFF00: 'Vàng', FF0000: 'Đỏ', '92D050': 'Xanh lá nhạt', '00B050': 'Xanh lá',
    '00B0F0': 'Xanh dương', FFC000: 'Cam', F79646: 'Cam nhạt', FFF2CC: 'Vàng kem', '0F243E': 'Xanh đen'
  };

  function fold(s) {
    return String(s || '').replace(/[^\u0000-\u007f]/g, ch => {
      let n = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (n === 'đ') n = 'd';
      else if (n === 'Đ') n = 'D';
      return n.length === 1 ? n : ch;
    }).toLowerCase();
  }
  const tokensOf = q => fold(q).trim().split(/\s+/).filter(Boolean);
  const disp = t => String(t == null ? '' : t).replace(/\\n/g, '\n');
  const bgOf = hex => {
    const n = parseInt(hex, 16);
    if (isNaN(n)) return 'transparent';
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},.40)`;
  };
  const colorLabel = hex => CFG.colorMeaning[hex] || COLOR_NAMES[hex] || ('#' + hex);

  function normalizeSource(val, fallback = DEFAULT_SOURCE) {
    if (!val) return fallback;
    const raw = String(val).trim();
    const exact = SRC_LIST.find(x => x.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;
    const f = fold(raw);
    if (f.includes('tai san')) return 'Tài sản';
    if (f.includes('do kiem')) return 'Đo kiểm';
    if (f.includes('sua chua')) return 'Sửa chữa';
    if (f.includes('vat tu')) return 'Vật tư';
    if (f.includes('khong ro')) return 'Không rõ nguồn';
    return fallback;
  }

  function defaultSourceForSheet(sheet) {
    if (!sheet) return DEFAULT_SOURCE;
    if (sheet.id === 'tai-san-khac' || fold(labelOf(sheet)).includes('tai san')) return 'Tài sản';
    if (sheet.id === 'vt-do-kiem' || fold(labelOf(sheet)).includes('do kiem')) return 'Đo kiểm';
    return DEFAULT_SOURCE;
  }

  function normalizeRow(row, index, sheetDefaultSource, oldCols) {
    const r = row || {};
    const v = Array.isArray(r.v) ? r.v.slice() : [];
    const fallbackSrc = normalizeSource(r.src, sheetDefaultSource || DEFAULT_SOURCE);
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
      const iMa = idxOf(/ma vt|ma vat tu|^ma$|so the/);
      const iTen = idxOf(/ten|hien vat|thiet bi|vat tu/);
      const iSer = idxOf(/serial|s\/n|ma so|id chi tiet/);
      const iPart = idxOf(/part|pasnumber/);
      const iNote = idxOf(/ghi chu|tinh trang|sl/);

      src = fallbackSrc;
      stt = String((iStt >= 0 ? v[iStt] : v[0]) ?? (index + 1));
      tenVT = String((iTen >= 0 ? v[iTen] : v[2]) ?? '');
      serial = String((iSer >= 0 ? v[iSer] : v[3]) ?? '');
      maVT = String((iMa >= 0 ? v[iMa] : v[1]) ?? '');
      partNo = String((iPart >= 0 ? v[iPart] : v[4]) ?? '');
      ghiChu = String((iNote >= 0 ? v[iNote] : v[5]) ?? '');
    } else {
      src = fallbackSrc;
      stt = String(v[0] ?? (index + 1));
      tenVT = String(v[2] ?? '');
      serial = String(v[3] ?? '');
      maVT = String(v[1] ?? '');
      partNo = String(v[4] ?? '');
      ghiChu = String(v[5] ?? '');
    }

    const norm = Object.assign({}, r, {
      src,
      v: [src, stt, tenVT, serial, maVT, partNo, ghiChu]
    });
    delete norm.x;
    delete norm.n;
    return norm;
  }

  function normalizeSheetsData(sheets) {
    if (!Array.isArray(sheets)) return [];
    return sheets.map(s => {
      const defSrc = defaultSourceForSheet(s);
      const blocks = (Array.isArray(s.blocks) ? s.blocks : []).map(b => {
        const oldCols = Array.isArray(b.cols) ? b.cols.slice() : null;
        const rows = (Array.isArray(b.rows) ? b.rows : []).map((r, idx) => normalizeRow(r, idx, defSrc, oldCols));
        return Object.assign({}, b, {
          cols: STANDARD_COLS.slice(),
          rows
        });
      });
      return Object.assign({}, s, { blocks });
    });
  }

  function hl(text, tokens) {
    const t = disp(text);
    if (!tokens || !tokens.length) return esc(t);
    const f = fold(t);
    if (f.length !== t.length) return esc(t);
    const rg = [];
    tokens.forEach(k => {
      let i = f.indexOf(k);
      while (k && i !== -1) {
        rg.push([i, i + k.length]);
        i = f.indexOf(k, i + k.length);
      }
    });
    if (!rg.length) return esc(t);
    rg.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const m = [rg[0].slice()];
    for (let i = 1; i < rg.length; i++) {
      const l = m[m.length - 1];
      if (rg[i][0] <= l[1]) l[1] = Math.max(l[1], rg[i][1]);
      else m.push(rg[i].slice());
    }
    let out = '', p = 0;
    m.forEach(([a, b]) => {
      out += esc(t.slice(p, a)) + '<mark>' + esc(t.slice(a, b)) + '</mark>';
      p = b;
    });
    return out + esc(t.slice(p));
  }

  const hayCache = new WeakMap();
  const hay = row => {
    let h = hayCache.get(row);
    if (h === undefined) {
      h = fold([row.src || '', ...(row.v || [])].join(' \u00a6 '));
      hayCache.set(row, h);
    }
    return h;
  };

  let toastT;
  function toast(msg, ms = 2600) {
    const el = $('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
  }

  let DATA = null;
  let ST = null;
  const newF = () => ({ q: '', src: 'all', color: 'all' });
  const V = { route: { page: 'overview', id: null }, gq: '', edit: false, f: newF(), collapsed: {}, treeCollapsed: {} };

  const clone = o => JSON.parse(JSON.stringify(o));
  const syncOn = () => {
    const c = CFG.sync || {};
    if (c.provider === 'off') return false;
    return !!((c.provider === 'firebase' && c.firebase && c.firebase.projectId) || (c.provider === 'server' && c.server && c.server.url));
  };

  function checkModules() {
    const bad = [];
    if (syncOn() && (!window.Sync || typeof window.Sync.init !== 'function')) {
      bad.push('<b>assets/sync.js</b> (chưa tải được)');
    }
    const old = $('#modBanner');
    if (old) old.remove();
    if (!bad.length) return;
    const d = document.createElement('div'); d.className = 'mod-banner'; d.id = 'modBanner';
    d.innerHTML = '⚠ Một số file chưa cập nhật đúng: ' + bad.join('; ') + '. Hãy bấm <b>Ctrl + F5</b>.<button type="button" onclick="this.parentNode.remove()">Đóng</button>';
    document.body.insertBefore(d, document.body.firstChild);
  }

  function removeBootScreen() {
    const bootEl = $('#boot'); if (bootEl) bootEl.remove();
    const topbar = $('#topbar'); if (topbar) topbar.hidden = false;
    const layout = $('#layout'); if (layout) layout.hidden = false;
  }

  const sheetById = id => ST && ST.sheets ? ST.sheets.find(s => s.id === id) : null;
  const labelOf = s => s ? (CFG.sheetLabels[s.id] || s.name) : '';
  const isStock = () => true;
  const stockRows = b => b.rows || [];
  const countRows = s => (s.blocks || []).reduce((n, b) => n + (b.rows ? b.rows.length : 0), 0);
  const countBySource = (s, srcName) => (s.blocks || []).reduce((n, b) =>
    n + (b.rows || []).filter(r => normalizeSource(r.src || (r.v && r.v[0])) === srcName).length, 0);

  let uidN = 0;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + (uidN++).toString(36);

  function ensureIds(sheets) {
    if (!Array.isArray(sheets)) return;
    sheets.forEach(s => Array.isArray(s.blocks) && s.blocks.forEach((b, bi) => Array.isArray(b.rows) && b.rows.forEach(r => {
      if (!r.i) r.i = r.r ? `${s.id}:${bi}:${r.r}` : 'u' + uid();
    })));
  }

  function loadState() {
    let st = null;
    try {
      const saved = JSON.parse(localStorage.getItem(LS('state')) || 'null');
      if (saved && Array.isArray(saved.sheets)) {
        const metaVer = (DATA && DATA.meta && DATA.meta.version) || '';
        if (!metaVer || saved.ver === metaVer) {
          st = { sheets: normalizeSheetsData(saved.sheets), dirty: true };
        } else {
          const useNew = syncOn() || confirm('Dữ liệu gốc trên website vừa được cập nhật.\n\nOK = dùng dữ liệu MỚI\nHủy = giữ chỉnh sửa cũ');
          if (useNew) localStorage.removeItem(LS('state'));
          else st = { sheets: normalizeSheetsData(saved.sheets), dirty: true };
        }
      }
    } catch (e) { }
    if (!st) st = { sheets: normalizeSheetsData(clone((DATA && DATA.sheets) || [])), dirty: false };
    ensureIds(st.sheets);
    return st;
  }

  let saveT;
  function writeLocal() {
    try {
      localStorage.setItem(LS('state'), JSON.stringify({ ver: (DATA && DATA.meta && DATA.meta.version) || '', sheets: ST.sheets }));
    } catch (e) {
      toast('⚠ Không lưu được vào trình duyệt. Hãy dùng Sao lưu JSON.', 5000);
    }
  }
  function persist() {
    ST.dirty = true; const d = $('#dirty'); if (d) d.hidden = false;
    clearTimeout(saveT); saveT = setTimeout(writeLocal, 250);
    if (window.Sync && typeof Sync.schedule === 'function') Sync.schedule();
  }
  function saveLocal() { clearTimeout(saveT); writeLocal(); }
  function resetToBaseline() {
    ST = { sheets: normalizeSheetsData(clone((DATA && DATA.sheets) || [])), dirty: false };
    ensureIds(ST.sheets);
  }

  function parseHash() {
    const m = location.hash.match(/^#\/s\/([\w-]+)/);
    if (m && sheetById(m[1])) { V.route = { page: 'sheet', id: m[1] }; return; }
    V.route = { page: 'overview', id: null };
  }

  function matchSheetToNode(sheet, node) {
    if (sheet.categoryId) return sheet.categoryId === node.id;
    const nameFold = fold(labelOf(sheet));
    if (Array.isArray(node.matchKeywords) && node.matchKeywords.some(kw => nameFold.includes(fold(kw)))) {
      return true;
    }
    if (node.defaultGroup !== undefined) {
      return (sheet.group === 1 ? 1 : 0) === node.defaultGroup;
    }
    return false;
  }

  function renderTreeNodes(nodes, unassignedSheets) {
    const isGuest = localStorage.getItem('lab_user_role') === 'guest';

    return nodes
      .filter(node => node.type !== 'slips')
      .map(node => {
        const isCol = !!V.treeCollapsed[node.id];
        let childrenHTML = '';
        let itemCount = 0;

        if (Array.isArray(node.children)) {
          childrenHTML += renderTreeNodes(node.children, unassignedSheets);
        }

        const matched = [];
        for (let i = unassignedSheets.length - 1; i >= 0; i--) {
          const sh = unassignedSheets[i];
          if (sh.categoryId === node.id || (node.isDynamicGroup && matchSheetToNode(sh, node))) {
            matched.unshift(sh);
            unassignedSheets.splice(i, 1);
          }
        }
        itemCount += matched.length;
        childrenHTML += matched.map(s => {
          const active = V.route.id === s.id && !V.gq ? 'active' : '';
          return `<a class="tree-row tree-leaf ${active}" href="#/s/${s.id}" title="${esc(labelOf(s))}">
                    <span class="nm">${esc(labelOf(s))}</span><span class="ct">${countRows(s)}</span>
                  </a>`;
        }).join('');

        if (node.allowCreate && !isGuest) {
          childrenHTML += `<button type="button" class="tree-add-btn" data-create-sheet="${node.id}" data-cat-label="${esc(node.label)}">＋ Tạo danh mục mới</button>`;
        }

        const hasKids = childrenHTML.length > 0;
        return `<div class="tree-node ${isCol ? 'collapsed' : ''}" data-node="${node.id}">
          <div class="tree-row" data-tree-toggle="${node.id}">
            <span class="tree-caret">${hasKids ? '▾' : '•'}</span>
            <span>${node.icon || '📁'}</span>
            <span class="nm">${esc(node.label)}</span>
            ${itemCount > 0 ? `<span class="ct">${itemCount}</span>` : ''}
          </div>
          ${hasKids ? `<div class="tree-children">${childrenHTML}</div>` : ''}
        </div>`;
      }).join('');
  }

  function renderSidebar() {
    if (!ST || !ST.sheets) return;
    const sb = $('#sidebar'); if (!sb) return;

    const unassigned = [...ST.sheets];
    const ovActive = V.route.page === 'overview' && !V.gq ? 'active' : '';
    let h = `<div class="tree-root">
      <a class="tree-row ${ovActive}" href="#/" style="margin-bottom:6px">
        <span>🏠</span><span class="nm"><b>Tổng quan (Vật tư - Tài sản)</b></span>
      </a>`;

    if (Array.isArray(CFG.treeMenu) && CFG.treeMenu.length > 0) {
      h += renderTreeNodes(CFG.treeMenu, unassigned);
      if (unassigned.length > 0) {
        const extra = unassigned.map(s => {
          const active = V.route.id === s.id && !V.gq ? 'active' : '';
          return `<a class="tree-row tree-leaf ${active}" href="#/s/${s.id}"><span class="nm">${esc(labelOf(s))}</span><span class="ct">${countRows(s)}</span></a>`;
        }).join('');
        h += `<div class="tree-node" data-node="other">
          <div class="tree-row" data-tree-toggle="other"><span class="tree-caret">▾</span><span>📂</span><span class="nm">Danh mục khác</span><span class="ct">${unassigned.length}</span></div>
          <div class="tree-children">${extra}</div>
        </div>`;
      }
    } else {
      ST.sheets.forEach(s => {
        const active = V.route.id === s.id && !V.gq ? 'active' : '';
        h += `<a class="tree-row ${active}" href="#/s/${s.id}"><span class="nm">${esc(labelOf(s))}</span><span class="ct">${countRows(s)}</span></a>`;
      });
    }

    h += `</div>`;
    sb.innerHTML = h;
  }

  function createNewSheetInCategory(categoryId, catLabel) {
    if (localStorage.getItem('lab_user_role') === 'guest') {
      toast('⚠ Tài khoản Khách không có quyền tạo danh mục mới.');
      return;
    }
    const promptTitle = catLabel
      ? `Nhập tên danh mục mới trong nhóm "${catLabel}":`
      : 'Nhập tên danh mục / thiết bị mới:';
    const name = prompt(promptTitle);
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    const newId = 'cat-' + uid();
    const defSrc = categoryId === 'tai-san-khac' || fold(cleanName).includes('tai san') ? 'Tài sản' : DEFAULT_SOURCE;
    const newSheet = {
      id: newId,
      name: cleanName,
      categoryId: categoryId,
      group: 0,
      blocks: [{
        title: cleanName,
        hr: 1,
        cols: STANDARD_COLS.slice(),
        rows: [{ r: 1, i: 'u' + uid(), ct: Date.now(), src: defSrc, v: [defSrc, '1', '', '', '', '', ''] }]
      }]
    };
    ST.sheets.push(newSheet);
    delete V.treeCollapsed[categoryId];
    persist();
    location.hash = '#/s/' + newId;
    toast(`✅ Đã tạo danh mục "${cleanName}"`);
  }

  function sourceStats() {
    const counts = {};
    SRC_LIST.forEach(s => { counts[s] = 0; });
    let total = 0, q2 = 0, blocks = 0;
    (ST.sheets || []).forEach(s => (s.blocks || []).forEach(b => {
      blocks++;
      (b.rows || []).forEach(r => {
        total++;
        const src = normalizeSource(r.src || (r.v && r.v[0]));
        counts[src] = (counts[src] || 0) + 1;
        if (hay(r).includes('??')) q2++;
      });
    }));
    return { counts, total, q2, blocks };
  }

  function colorCounts() {
    const m = {};
    (ST.sheets || []).forEach(s => (s.blocks || []).forEach(b => (b.rows || []).forEach(r => {
      if (r.f) new Set(Object.values(r.f)).forEach(h => { m[h] = (m[h] || 0) + 1; });
    })));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  function viewOverview() {
    const { counts, total, q2, blocks } = sourceStats();
    const cc = colorCounts();
    const meta = (DATA && DATA.meta) || {};

    let h = `<div class="page-title"><h1>Tổng quan</h1><span class="sub">Nguồn: ${esc(meta.source || 'LAB')} · cập nhật ${esc(meta.generated || '')}</span>
      <span class="ov-actions">
        <button class="tbtn primary" onclick="window.openAddMaterialModal()">📦 Thêm vật tư / tài sản</button>
      </span></div>
    <div class="kpis">
      <div class="kpi"><div class="n">${(ST.sheets || []).length}</div><div class="l">Thư mục / hệ thống</div></div>
      <div class="kpi"><div class="n">${blocks}</div><div class="l">Khối thiết bị</div></div>
      <div class="kpi"><div class="n">${total.toLocaleString('vi-VN')}</div><div class="l">Tổng mục thống kê</div></div>
      <div class="kpi ok"><div class="n">${(counts['Vật tư'] || 0).toLocaleString('vi-VN')}</div><div class="l">Nguồn: Vật tư</div></div>
      <div class="kpi"><div class="n">${(counts['Tài sản'] || 0).toLocaleString('vi-VN')}</div><div class="l">Nguồn: Tài sản</div></div>
      <div class="kpi warn"><div class="n">${(counts['Đo kiểm'] || 0).toLocaleString('vi-VN')}</div><div class="l">Nguồn: Đo kiểm</div></div>
      <div class="kpi warn"><div class="n">${(counts['Sửa chữa'] || 0).toLocaleString('vi-VN')}</div><div class="l">Nguồn: Sửa chữa</div></div>
      <button class="kpi bad" data-q="??" title="Bấm để xem danh sách"><div class="n">${q2}</div><div class="l">Dòng ghi “??” (cần xác minh)</div></button>
    </div>
    <div class="grid2">
    <div class="card"><h3>Thống kê theo Nguồn</h3><div class="body"><div class="chips">
      ${SRC_LIST.map(opt => `<button class="chip" data-src-jump="${esc(opt)}">📌 ${esc(opt)} <b>${counts[opt] || 0}</b></button>`).join('')}
    </div></div></div>
    <div class="card"><h3>Màu đánh dấu trong file Excel gốc</h3><div class="body">
      ${cc.length ? cc.map(([hx, n]) => `<div class="legend-row"><span class="sw" style="background:#${hx}"></span><span><b>${esc(colorLabel(hx))}</b></span><span class="src">· ${n} dòng</span></div>`).join('') : '<span class="src">Không có.</span>'}</div></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>Danh sách thư mục</h3>
    <div style="overflow:auto"><table class="plain"><thead><tr><th>Thư mục</th><th class="num">Khối</th><th class="num">Tổng dòng</th><th class="num">Vật tư</th><th class="num">Tài sản</th><th class="num">Đo kiểm</th><th class="num">Sửa chữa</th><th class="num">Không rõ nguồn</th></tr></thead><tbody>`;

    (ST.sheets || []).forEach(s => {
      const n = countRows(s);
      h += `<tr class="link" data-go="#/s/${s.id}">
        <td><a href="#/s/${s.id}"><b>${esc(labelOf(s))}</b></a></td>
        <td class="num">${(s.blocks || []).length}</td>
        <td class="num">${n}</td>
        <td class="num">${countBySource(s, 'Vật tư')}</td>
        <td class="num">${countBySource(s, 'Tài sản')}</td>
        <td class="num">${countBySource(s, 'Đo kiểm')}</td>
        <td class="num">${countBySource(s, 'Sửa chữa')}</td>
        <td class="num">${countBySource(s, 'Không rõ nguồn')}</td>
      </tr>`;
    });
    return h + '</tbody></table></div></div>';
  }

  function passRow(row, tokens, f) {
    const curSrc = normalizeSource(row.src || (row.v && row.v[0]));
    if (f.src && f.src !== 'all' && curSrc !== f.src) return false;
    if (f.color !== 'all' && !(row.f && Object.values(row.f).includes(f.color))) return false;
    if (tokens.length) {
      const h = hay(row);
      for (const t of tokens) if (!h.includes(t)) return false;
    }
    return true;
  }

  const colClass = idx => {
    if (idx === 1) return 'c-stt';
    if (idx === 3 || idx === 4 || idx === 5) return 'c-mono';
    return '';
  };

  function sourceSelectHTML(curSrc) {
    const opts = SRC_LIST.map(opt =>
      `<option value="${esc(opt)}" ${opt === curSrc ? 'selected' : ''}>${esc(opt)}</option>`
    ).join('');
    return `<select class="src-sel" data-row-source="1" aria-label="${esc(CFG.sourceLabel)}">${opts}</select>`;
  }

  function rowHTML(s, bi, b, ri, row, tokens) {
    const curSrc = normalizeSource(row.src || (row.v && row.v[0]));
    row.src = curSrc;
    if (!Array.isArray(row.v)) row.v = [curSrc, String(ri + 1), '', '', '', '', ''];
    row.v[0] = curSrc;
    if (!row.v[1]) row.v[1] = String(ri + 1);

    const ce = V.edit ? ' contenteditable="true" spellcheck="false"' : '';
    let h = `<tr data-s="${s.id}" data-b="${bi}" data-r="${ri}">
      <td class="c-src">${sourceSelectHTML(curSrc)}</td>`;

    for (let k = 1; k < STANDARD_COLS.length; k++) {
      const cls = [colClass(k), row.p && row.p.includes(k) ? 'dup' : ''].filter(Boolean).join(' ');
      const st = row.f && row.f[k] ? ` style="background:${bgOf(row.f[k])}"` : '';
      h += `<td data-k="${k}"${cls ? ` class="${cls}"` : ''}${st}${ce}>${hl(row.v[k] || '', tokens)}</td>`;
    }

    h += `<td class="c-move">
      <button type="button" class="move-row-btn" data-move title="Chuyển sang thư mục khác">➜</button>
      ${V.edit ? '<button type="button" class="del" title="Xoá dòng">✕</button>' : ''}
    </td>`;
    return h + '</tr>';
  }

  function blockHTML(s, bi, tokens, f, budget) {
    const b = s.blocks[bi];
    const key = s.id + ':' + bi;
    const base = b.rows || [];
    let rows = '', shown = 0;

    base.forEach((row, ri) => {
      if (!passRow(row, tokens, f)) return;
      shown++;
      if (budget && budget.left <= 0) return;
      if (budget) budget.left--;
      rows += rowHTML(s, bi, b, ri, row, tokens);
    });

    const filtered = tokens.length || f.src !== 'all' || f.color !== 'all';
    if (filtered && !shown && !V.edit) return '';

    const head = STANDARD_COLS.map(c => `<th>${esc(c)}</th>`).join('') + '<th class="c-move" title="Chuyển thư mục">Chuyển</th>';
    return `<section class="block ${V.collapsed[key] ? 'collapsed' : ''}" id="blk-${s.id}-${bi}" data-key="${key}" data-s="${s.id}" data-b="${bi}">
      <div class="block-head" data-toggle><span class="tg">▾</span><h3>${esc(b.title)}</h3>
        <span class="badge" data-badge>${filtered ? shown + ' / ' : ''}${base.length} dòng</span>
        <span class="sp"></span>${V.edit ? '<button class="add-row" data-add>＋ Thêm dòng</button>' : ''}</div>
      ${rows ? `<div class="tbl-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
             : `<div class="empty">Không có dòng nào khớp bộ lọc.</div>`}
    </section>`;
  }

  function viewSheet(s) {
    if (!s) {
      return `<div class="card"><div class="empty">Không tìm thấy thư mục này. <a href="#/">Về Tổng quan</a></div></div>`;
    }
    const colors = new Set();
    (s.blocks || []).forEach(b => (b.rows || []).forEach(r => r.f && Object.values(r.f).forEach(x => colors.add(x))));

    let h = `<div class="page-title"><h2>${esc(labelOf(s))}</h2>
      <span class="sub">${(s.blocks || []).length} khối · ${countRows(s)} dòng</span></div>
    <div class="toolbar no-print">
      <input type="search" id="fq" placeholder="Lọc trong thư mục này…" value="${esc(V.f.q)}" autocomplete="off">
      <select id="fsrc">
        <option value="all">Tất cả nguồn</option>
        ${SRC_LIST.map(opt => `<option value="${esc(opt)}" ${V.f.src === opt ? 'selected' : ''}>${esc(opt)}</option>`).join('')}
      </select>
      ${colors.size ? `<select id="fcolor"><option value="all">Mọi màu</option>${[...colors].map(c => `<option value="${c}" ${V.f.color === c ? 'selected' : ''}>● ${esc(colorLabel(c))}</option>`).join('')}</select>` : ''}
      <button class="tbtn" data-all="collapse">Thu gọn tất cả</button><button class="tbtn" data-all="expand">Mở rộng tất cả</button>
      <span class="count" id="fcount"></span></div>`;

    if ((s.blocks || []).length > 1) {
      h += '<div class="jump no-print">' + s.blocks.map((b, i) =>
        `<button class="chip" data-jump="blk-${s.id}-${i}">${esc(b.title)} <span class="src">${(b.rows || []).length}</span></button>`
      ).join('') + '</div>';
    }
    return h + '<div id="blocks"></div>';
  }

  function renderBlocks() {
    const s = sheetById(V.route.id);
    if (!s) return;
    const tokens = tokensOf(V.f.q);
    let html = '', shown = 0, total = 0;
    (s.blocks || []).forEach((b, i) => {
      const base = b.rows || [];
      total += base.length;
      shown += base.filter(r => passRow(r, tokens, V.f)).length;
      html += blockHTML(s, i, tokens, V.f, null);
    });
    const blkContainer = $('#blocks');
    if (blkContainer) blkContainer.innerHTML = html || '<div class="card"><div class="empty">Không có dòng nào khớp bộ lọc.</div></div>';
    const fc = $('#fcount');
    if (fc) fc.textContent = shown === total ? `${total} dòng` : `Hiển thị ${shown} / ${total} dòng`;
  }

  function viewSearch() {
    const tokens = tokensOf(V.gq), budget = { left: CFG.maxSearchResults };
    let found = 0, html = '', sheetsHit = 0;
    const f = { q: '', src: 'all', color: 'all' };
    (ST.sheets || []).forEach(s => {
      let part = '', hit = 0;
      (s.blocks || []).forEach((b, bi) => {
        const n = (b.rows || []).filter(r => passRow(r, tokens, f)).length; if (!n) return;
        hit += n; if (budget.left > 0) part += blockHTML(s, bi, tokens, f, budget);
      });
      if (hit) {
        found += hit; sheetsHit++;
        html += `<div class="page-title" style="margin:18px 0 8px"><h2 style="font-size:16px">📁 <a href="#/s/${s.id}" data-clear>${esc(labelOf(s))}</a></h2><span class="sub">${hit} kết quả</span></div>` + part;
      }
    });
    return `<div class="page-title"><h1>Kết quả tìm “${esc(V.gq)}”</h1><span class="sub">${found} dòng · ${sheetsHit} thư mục</span></div>` +
      (found ? html : '<div class="card"><div class="empty">Không tìm thấy. Thử từ khoá ngắn hơn.</div></div>');
  }

  function reindexBlock(block) {
    (block.rows || []).forEach((r, idx) => {
      r.r = idx + 1;
      if (Array.isArray(r.v)) r.v[1] = String(idx + 1);
    });
  }

  function openMoveRowModal(loc) {
    if (!loc || !loc.row) return;
    const targets = (ST.sheets || []).filter(sh => sh.id !== loc.s.id);
    if (!targets.length) {
      toast('⚠ Chỉ có 1 thư mục nên không thể chuyển.');
      return;
    }

    const old = document.getElementById('mdMoveRow');
    if (old) old.remove();

    const tenVT = loc.row.v[2] || '(Chưa có tên)';
    const serial = loc.row.v[3] || '-';
    const maVT = loc.row.v[4] || '-';
    const opts = targets.map(sh => `<option value="${esc(sh.id)}">${esc(labelOf(sh))}</option>`).join('');

    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal-back" id="mdMoveRow" style="display:flex">
        <div class="modal" style="max-width:440px;">
          <div class="modal-head">
            <h2>➜ Chuyển sang thư mục khác</h2>
            <button type="button" class="modal-x" id="closeMoveRow">✕</button>
          </div>
          <div class="modal-body">
            <p style="margin:0 0 8px"><b>Tên Vật Tư:</b> ${esc(tenVT)}</p>
            <p style="margin:0 0 8px"><b>Serial:</b> ${esc(serial)} · <b>Mã VT:</b> ${esc(maVT)}</p>
            <p style="margin:0 0 12px"><b>Thư mục hiện tại:</b> ${esc(labelOf(loc.s))}</p>
            <label class="fld">
              <span>Chọn thư mục đích:</span>
              <select id="selTargetSheet">${opts}</select>
            </label>
            <div class="sy-btns" style="margin-top:14px">
              <button type="button" class="tbtn primary" id="btnConfirmMoveRow">Xác nhận chuyển</button>
              <button type="button" class="tbtn" id="btnCancelMoveRow">Hủy</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div);

    const closeModal = () => { const el = document.getElementById('mdMoveRow'); if (el) el.remove(); };
    $('#closeMoveRow').addEventListener('click', closeModal);
    $('#btnCancelMoveRow').addEventListener('click', closeModal);
    $('#btnConfirmMoveRow').addEventListener('click', () => {
      const targetId = $('#selTargetSheet').value;
      const targetSheet = sheetById(targetId);
      if (!targetSheet) return;

      if (!Array.isArray(targetSheet.blocks) || !targetSheet.blocks.length) {
        targetSheet.blocks = [{
          title: labelOf(targetSheet),
          hr: 1,
          cols: STANDARD_COLS.slice(),
          rows: []
        }];
      }

      const [moved] = loc.b.rows.splice(loc.ri, 1);
      if (moved) {
        targetSheet.blocks[0].rows.push(moved);
        reindexBlock(loc.b);
        reindexBlock(targetSheet.blocks[0]);
        persist();
        closeModal();
        keepScroll(() => render());
        toast(`✅ Đã chuyển sang "${labelOf(targetSheet)}"`);
      }
    });
  }

  window.openAddMaterialModal = function () {
    const currentRole = localStorage.getItem('lab_user_role');
    if (currentRole === 'guest') {
      alert('Tài khoản Khách không có quyền thêm vật tư mới!');
      return;
    }

    window._materialDict = {};
    const setMaVT = new Set(), setPartNum = new Set(), setTenVT = new Set();

    if (ST && ST.sheets) {
      ST.sheets.forEach(s => (s.blocks || []).forEach(b => (b.rows || []).forEach(r => {
        if (r.v) {
          const ten = String(r.v[2] || '').trim();
          const ma = String(r.v[4] || '').trim();
          const part = String(r.v[5] || '').trim();
          if (ma) { setMaVT.add(ma); window._materialDict[ma.toLowerCase()] = { ten, part }; }
          if (ten) setTenVT.add(ten);
          if (part) setPartNum.add(part);
        }
      })));
    }

    const optMaVT = Array.from(setMaVT).sort().map(item => `<option value="${esc(item)}">`).join('');
    const optPartNum = Array.from(setPartNum).sort().map(item => `<option value="${esc(item)}">`).join('');
    const optTenVT = Array.from(setTenVT).sort().map(item => `<option value="${esc(item)}">`).join('');
    const optSrc = SRC_LIST.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');

    const mdOld = document.getElementById('mdAddMat');
    if (mdOld) mdOld.remove();

    const modalHTML = `
      <div class="modal-back" id="mdAddMat">
        <div class="modal" style="max-width: 500px;">
          <div class="modal-head">
            <h2>📦 Thêm vật tư / tài sản mới</h2>
            <button class="modal-x" onclick="document.getElementById('mdAddMat').remove()">✕</button>
          </div>
          <div class="modal-body">
            <form id="formAddMat" onsubmit="window.handleSaveNewMaterial(event)">
              <label class="fld">
                <span>Nguồn:</span>
                <select id="newSource">${optSrc}</select>
              </label>
              <label class="fld">
                <span>Mã vật tư (Mã VT):</span>
                <input type="text" id="newMaVT" list="listMaVT" placeholder="Chọn hoặc nhập mã VT..." oninput="window.handleMaVTChange(this.value)">
                <datalist id="listMaVT">${optMaVT}</datalist>
              </label>
              <label class="fld">
                <span>Tên Vật Tư:</span>
                <input type="text" id="newTenVT" list="listTenVT" placeholder="Nhập tên vật tư / tài sản..." required>
                <datalist id="listTenVT">${optTenVT}</datalist>
              </label>
              <label class="fld">
                <span>Serial:</span>
                <input type="text" id="newSerial" placeholder="Nhập Serial...">
              </label>
              <label class="fld">
                <span>Part number:</span>
                <input type="text" id="newPartNum" list="listPartNum" placeholder="Nhập Part number...">
                <datalist id="listPartNum">${optPartNum}</datalist>
              </label>
              <label class="fld">
                <span>Ghi chú:</span>
                <input type="text" id="newGhiChu" placeholder="Nhập ghi chú...">
              </label>
              <div class="sy-btns" style="margin-top: 15px;">
                <button class="tbtn primary" type="submit">Lưu & Phân loại tự động</button>
                <button class="tbtn" type="button" onclick="document.getElementById('mdAddMat').remove()">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div);
  };

  window.handleMaVTChange = function (val) {
    if (!window._materialDict) return;
    const found = window._materialDict[String(val || '').trim().toLowerCase()];
    if (found) {
      const tenInput = document.getElementById('newTenVT');
      const partInput = document.getElementById('newPartNum');
      if (tenInput && found.ten && !tenInput.value) tenInput.value = found.ten;
      if (partInput && found.part && !partInput.value) partInput.value = found.part;
    }
  };

  window.handleSaveNewMaterial = function (e) {
    e.preventDefault();
    const src = normalizeSource($('#newSource').value, DEFAULT_SOURCE);
    const maVT = ($('#newMaVT').value || '').trim();
    const tenVT = ($('#newTenVT').value || '').trim();
    const serial = ($('#newSerial').value || '').trim();
    const partNum = ($('#newPartNum').value || '').trim();
    const ghiChu = ($('#newGhiChu').value || '').trim();

    let targetBlock = null, targetSheet = null;
    const sheets = ST.sheets || [];

    function cleanStr(str) {
      if (!str) return '';
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
    }

    const cleanMa = cleanStr(maVT), cleanPart = cleanStr(partNum), cleanTen = cleanStr(tenVT);

    if (cleanMa || cleanPart) {
      for (let i = 0; i < sheets.length && !targetBlock; i++) {
        for (let b = 0; b < (sheets[i].blocks || []).length && !targetBlock; b++) {
          for (let r = 0; r < (sheets[i].blocks[b].rows || []).length; r++) {
            const rowV = sheets[i].blocks[b].rows[r].v || [];
            const exPart = cleanStr(rowV[5]), exMa = cleanStr(rowV[4]);
            if ((cleanMa && exMa && cleanMa === exMa) || (cleanPart && exPart && cleanPart === exPart)) {
              targetSheet = sheets[i]; targetBlock = sheets[i].blocks[b]; break;
            }
          }
        }
      }
    }

    if (!targetBlock && cleanTen) {
      for (let i = 0; i < sheets.length && !targetBlock; i++) {
        for (let b = 0; b < (sheets[i].blocks || []).length && !targetBlock; b++) {
          for (let r = 0; r < (sheets[i].blocks[b].rows || []).length; r++) {
            const exTen = cleanStr((sheets[i].blocks[b].rows[r].v || [])[2]);
            if (exTen && (cleanTen === exTen || exTen.includes(cleanTen) || cleanTen.includes(exTen))) {
              targetSheet = sheets[i]; targetBlock = sheets[i].blocks[b]; break;
            }
          }
        }
      }
    }

    if (!targetBlock && src === 'Tài sản') {
      targetSheet = sheetById('tai-san-khac');
      if (targetSheet && targetSheet.blocks && targetSheet.blocks[0]) targetBlock = targetSheet.blocks[0];
    }

    if (!targetBlock && sheets.length > 0 && sheets[0].blocks.length > 0) {
      targetSheet = sheets[0]; targetBlock = sheets[0].blocks[0];
    }

    if (targetBlock) {
      const nextStt = String((targetBlock.rows || []).length + 1);
      targetBlock.rows.push({
        r: Number(nextStt),
        i: 'm_' + uid(),
        src,
        v: [src, nextStt, tenVT, serial, maVT, partNum, ghiChu],
        ct: Date.now()
      });
      persist(); render();
      const mdAddMat = document.getElementById('mdAddMat');
      if (mdAddMat) mdAddMat.remove();
      toast(`Đã thêm vào thư mục "${labelOf(targetSheet)}" (${src})`);
    } else {
      alert('Lỗi: Không tìm thấy thư mục phù hợp.');
    }
  };

  function render() {
    removeBootScreen();
    try {
      renderSidebar();
      const m = $('#main'); if (!m) return;
      if (V.gq.trim()) m.innerHTML = viewSearch();
      else if (V.route.page === 'sheet') { m.innerHTML = viewSheet(sheetById(V.route.id)); renderBlocks(); }
      else m.innerHTML = viewOverview();
      document.title = CFG.title;
    } catch (err) {
      const m = $('#main');
      if (m) {
        m.innerHTML = `<div class="card"><div class="empty">⚠ Lỗi hiển thị giao diện: ${esc(err && err.message ? err.message : err)}</div></div>`;
      }
    }
  }
  const keepScroll = fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  function locate(el) {
    const tr = el.closest('tr[data-s]'); if (!tr) return null;
    const s = sheetById(tr.dataset.s); if (!s) return null;
    const b = s.blocks[+tr.dataset.b]; if (!b) return null;
    const row = b.rows[+tr.dataset.r]; if (!row) return null;
    return { tr, s, b, row, bi: +tr.dataset.b, ri: +tr.dataset.r };
  }

  function refreshBadges() {
    $$('.block').forEach(el => {
      const s = sheetById(el.dataset.s); if (!s) return;
      const b = s.blocks[+el.dataset.b], bd = $('[data-badge]', el);
      const base = b.rows || [];
      if (bd && !bd.textContent.includes('/')) bd.textContent = `${base.length} dòng`;
    });
  }

  function bind() {
    const main = $('#main'); if (!main) return;

    main.addEventListener('click', e => {
      const t = e.target;
      const q = t.closest('[data-q]'); if (q) { setGlobalSearch(q.dataset.q); return; }
      const srcJump = t.closest('[data-src-jump]');
      if (srcJump) {
        const targetSheet = sheetById('tai-san-khac') || (ST.sheets && ST.sheets[0]);
        if (targetSheet) {
          V.f = Object.assign(newF(), { src: srcJump.dataset.srcJump });
          location.hash = '#/s/' + targetSheet.id;
          render();
        }
        return;
      }
      const g = t.closest('[data-go]'); if (g && !t.closest('a')) { location.hash = g.dataset.go; return; }
      if (t.closest('[data-clear]')) { setGlobalSearch(''); }

      const jp = t.closest('[data-jump]');
      if (jp) {
        const el = document.getElementById(jp.dataset.jump);
        if (el) { el.classList.remove('collapsed'); delete V.collapsed[el.dataset.key]; el.scrollIntoView({ behavior: 'smooth' }); }
        return;
      }

      const all = t.closest('[data-all]');
      if (all) {
        const s = sheetById(V.route.id);
        if (s) (s.blocks || []).forEach((b, i) => { V.collapsed[s.id + ':' + i] = all.dataset.all === 'collapse'; });
        renderBlocks();
        return;
      }

      const moveBtn = t.closest('[data-move]');
      if (moveBtn) {
        e.stopPropagation();
        const L = locate(moveBtn);
        if (L) openMoveRowModal(L);
        return;
      }

      const add = t.closest('[data-add]');
      if (add) {
        e.stopPropagation();
        const sec = add.closest('.block'), s = sheetById(sec.dataset.s), b = s.blocks[+sec.dataset.b];
        const defSrc = defaultSourceForSheet(s);
        const nextStt = String((b.rows || []).length + 1);
        b.rows.push({ r: Number(nextStt), i: 'u' + uid(), src: defSrc, v: [defSrc, nextStt, '', '', '', '', ''] });
        persist();
        if (!V.gq && (V.f.q || V.f.src !== 'all' || V.f.color !== 'all')) { V.f = newF(); render(); }
        else keepScroll(() => (V.gq ? render() : renderBlocks()));
        return;
      }

      const del = t.closest('.del');
      if (del) {
        const L = locate(del); if (!L) return;
        if (confirm('Xoá dòng này?')) {
          L.b.rows.splice(L.ri, 1);
          reindexBlock(L.b);
          persist();
          keepScroll(() => (V.gq ? render() : renderBlocks()));
          toast('Đã xoá dòng');
        }
        return;
      }

      const th = t.closest('[data-toggle]');
      if (th && !t.closest('button')) {
        const sec = th.closest('.block');
        sec.classList.toggle('collapsed');
        V.collapsed[sec.dataset.key] = sec.classList.contains('collapsed');
      }
    });

    main.addEventListener('change', e => {
      if (e.target.matches('select.src-sel')) {
        const L = locate(e.target); if (!L) return;
        const nextSrc = normalizeSource(e.target.value, DEFAULT_SOURCE);
        L.row.src = nextSrc;
        L.row.v[0] = nextSrc;
        hayCache.delete(L.row);
        persist();
        refreshBadges();
        toast(`Nguồn: ${nextSrc}`, 1400);
      } else if (e.target.id === 'fsrc') {
        V.f.src = e.target.value;
        renderBlocks();
      } else if (e.target.id === 'fcolor') {
        V.f.color = e.target.value;
        renderBlocks();
      }
    });

    let ft;
    main.addEventListener('input', e => {
      if (e.target.id === 'fq') {
        clearTimeout(ft);
        ft = setTimeout(() => { V.f.q = e.target.value; renderBlocks(); }, 150);
      }
    });

    main.addEventListener('focusin', e => {
      const td = e.target.closest('td[contenteditable]');
      if (td) td.dataset.orig = td.innerText;
    });

    main.addEventListener('focusout', e => {
      const td = e.target.closest('td[contenteditable]'); if (!td) return;
      const val = td.innerText.replace(/\u00a0/g, ' ').replace(/\n+$/, '').trim();
      if (td.innerText === td.dataset.orig) return;
      const L = locate(td); if (!L) return;
      const colIdx = +td.dataset.k;
      L.row.v[colIdx] = val;
      hayCache.delete(L.row);
      if (L.row.p) L.row.p = L.row.p.filter(k => k !== colIdx);
      persist();
    });

    const sb = $('#sidebar');
    if (sb) {
      sb.addEventListener('click', e => {
        const tgl = e.target.closest('[data-tree-toggle]');
        if (tgl) {
          const nid = tgl.dataset.treeToggle;
          V.treeCollapsed[nid] = !V.treeCollapsed[nid];
          const nodeEl = tgl.closest('.tree-node');
          if (nodeEl) nodeEl.classList.toggle('collapsed', V.treeCollapsed[nid]);
          return;
        }
        const createBtn = e.target.closest('[data-create-sheet]');
        if (createBtn) {
          createNewSheetInCategory(createBtn.dataset.createSheet, createBtn.dataset.catLabel);
          return;
        }
        if (e.target.closest('a')) {
          if (V.gq) setGlobalSearch('');
          toggleSidebar(false);
        }
      });
    }

    let gt; const gq = $('#gq');
    if (gq) gq.addEventListener('input', e => { clearTimeout(gt); gt = setTimeout(() => setGlobalSearch(e.target.value, true), 180); });
    const gqClear = $('#gqClear');
    if (gqClear) gqClear.addEventListener('click', () => setGlobalSearch(''));

    const btnMenu = $('#btnMenu'); if (btnMenu) btnMenu.addEventListener('click', () => toggleSidebar());
    const overlay = $('#overlay'); if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));
    const btnEdit = $('#btnEdit'); if (btnEdit) btnEdit.addEventListener('click', () => setEdit(!V.edit));
    const btnPrint = $('#btnPrint'); if (btnPrint) btnPrint.addEventListener('click', () => window.print());
    const btnTheme = $('#btnTheme'); if (btnTheme) btnTheme.addEventListener('click', () => {
      const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t; localStorage.setItem(LS('theme'), t);
    });
    const menuExp = $('#menuExport'); if (menuExp) menuExp.addEventListener('click', e => {
      const b = e.target.closest('button[data-act]'); if (b) { menuExp.open = false; doAction(b.dataset.act); }
    });
    const fileIn = $('#fileIn'); if (fileIn) fileIn.addEventListener('change', importJSON);

    window.addEventListener('hashchange', () => {
      parseHash(); V.f = newF();
      if (V.gq) setGlobalSearch(''); else render();
      window.scrollTo(0, 0);
    });
  }

  function toggleSidebar(force) {
    const sb = $('#sidebar'), open = force === undefined ? !sb.classList.contains('open') : force;
    if (sb) sb.classList.toggle('open', open);
    const ov = $('#overlay'); if (ov) ov.classList.toggle('show', open);
  }
  function setGlobalSearch(q, fromInput) {
    V.gq = q; const inp = $('#gq'); if (inp && !fromInput && inp.value !== q) inp.value = q;
    const gc = $('#gqClear'); if (gc) gc.hidden = !q.trim();
    render();
    if (q.trim() && !fromInput) window.scrollTo(0, 0);
  }
  function setEdit(on) {
    V.edit = on; document.body.classList.toggle('editing', on);
    const b = $('#btnEdit'); if (b) { b.setAttribute('aria-pressed', on); const sp = $('span', b); if (sp) sp.textContent = on ? 'Đang chỉnh sửa' : 'Chỉnh sửa'; }
    const eb = $('#editbar'); if (eb) eb.hidden = !on;
    keepScroll(render);
  }

  const ymd = () => new Date().toISOString().slice(0, 10);
  function download(name, type, content) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function sheetAOA(s) {
    const aoa = [];
    (s.blocks || []).forEach((b, i) => {
      if (i) aoa.push([]);
      aoa.push([b.title]);
      aoa.push(STANDARD_COLS.slice());
      (b.rows || []).forEach(r => {
        const curSrc = normalizeSource(r.src || (r.v && r.v[0]));
        const vals = (r.v || []).slice(0, 7);
        while (vals.length < 7) vals.push('');
        vals[0] = curSrc;
        aoa.push(vals);
      });
    });
    return aoa;
  }
  const toCSV = aoa => '\ufeffsep=,\r\n' + aoa.map(r => r.map(c => {
    c = String(c == null ? '' : c);
    return /[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
  }).join(',')).join('\r\n');

  function doAction(act) {
    const cur = V.route.page === 'sheet' ? sheetById(V.route.id) : null;
    if (act === 'xlsx-all' || act === 'xlsx-cur') {
      const list = act === 'xlsx-all' ? ST.sheets : (cur ? [cur] : null);
      if (!list) { toast('Hãy mở một thư mục trước.'); return; }
      if (!window.XLSX) { toast('Chưa tải được thư viện Excel.', 5000); return; }
      const wb = XLSX.utils.book_new(), used = new Set();
      list.forEach(s => {
        const ws = XLSX.utils.aoa_to_sheet(sheetAOA(s));
        let nm = s.name.replace(/[\\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet', i = 2;
        const base = nm;
        while (used.has(nm.toLowerCase())) nm = base.slice(0, 28) + ' ' + i++;
        used.add(nm.toLowerCase());
        XLSX.utils.book_append_sheet(wb, ws, nm);
      });
      XLSX.writeFile(wb, `Tai-san-Vat-tu-LAB_${ymd()}.xlsx`);
    } else if (act === 'csv-cur') {
      if (!cur) { toast('Hãy mở một thư mục trước.'); return; }
      download(`${cur.id}_${ymd()}.csv`, 'text/csv;charset=utf-8', toCSV(sheetAOA(cur)));
    } else if (act === 'json-out') {
      download(`sao-luu-lab_${ymd()}.json`, 'application/json', JSON.stringify({ ver: (DATA && DATA.meta && DATA.meta.version) || '', sheets: ST.sheets }));
    } else if (act === 'json-in') {
      const fi = $('#fileIn'); if (fi) fi.click();
    } else if (act === 'reset') {
      if (confirm('Khôi phục dữ liệu gốc? Mọi chỉnh sửa trên máy sẽ mất.')) {
        localStorage.removeItem(LS('state'));
        resetToBaseline();
        render();
        toast('Đã khôi phục');
      }
    }
  }

  function importJSON(e) {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (!j || !Array.isArray(j.sheets)) throw new Error('sai định dạng');
        ST = { sheets: normalizeSheetsData(j.sheets), dirty: true };
        ensureIds(ST.sheets);
        persist();
        render();
        toast('Đã nạp bản sao lưu');
      } catch (err) {
        toast('File không hợp lệ: ' + err.message, 4500);
      }
    };
    rd.readAsText(f, 'utf-8');
  }

  function start(data) {
    removeBootScreen();
    try {
      DATA = Object.assign({ meta: { source: 'LAB', generated: '', version: '' }, sheets: [] }, data || {});
      ST = loadState();
      const appTitle = $('#appTitle'); if (appTitle) appTitle.textContent = CFG.title;
      const appSub = $('#appSub'); if (appSub) appSub.textContent = CFG.subtitle;
      const dirty = $('#dirty'); if (dirty) dirty.hidden = !ST.dirty;

      checkModules();
      try { if (window.Slips && typeof Slips.init === 'function') Slips.init(window.LabApp); } catch (e) { }
      try { if (window.Sync && typeof Sync.init === 'function') Sync.init(window.LabApp); } catch (e) { }
      parseHash();
      bind();
      render();
    } catch (err) {
      const m = $('#main');
      if (m) {
        m.innerHTML = `<div class="card"><div class="empty">⚠ Lỗi khởi tạo ứng dụng: ${esc(err && err.message ? err.message : err)}</div></div>`;
      }
    }
  }

  async function decrypt(enc, pw) {
    const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, key, b64(enc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function unlock() {
    const bootEl = $('#boot'); if (!bootEl) return;
    bootEl.innerHTML = `<form class="lock" id="lockForm"><h2>🔒 ${esc(CFG.title)}</h2><p>Dữ liệu được bảo vệ bằng mật khẩu.</p>
      <input type="password" id="pw" placeholder="Nhập mật khẩu" autocomplete="current-password" autofocus><div class="err" id="pwErr"></div><button>Mở khoá</button></form>`;
    $('#lockForm').addEventListener('submit', async ev => {
      ev.preventDefault(); const err = $('#pwErr'); if (err) err.textContent = 'Đang giải mã…';
      try {
        if (!window.crypto || !crypto.subtle) throw new Error('nocrypto');
        start(await decrypt(window.LAB_DATA_ENC, $('#pw').value));
      } catch (e) {
        if (err) err.textContent = e.message === 'nocrypto' ? 'Trình duyệt cần mở bằng https://' : 'Sai mật khẩu.';
      }
    });
  }

  window.LabApp = {
    BUILD, CFG, esc, saveLocal, resetToBaseline, refresh: () => keepScroll(render),
    get DATA() { return DATA; },
    fold, tokensOf, toast, download, toCSV, ymd, uid,
    sheetById, labelOf, persist, render, keepScroll, isStock, stockRows,
    normalizeSource, normalizeRow, normalizeSheetsData, SOURCE_OPTIONS: SRC_LIST, STANDARD_COLS,
    get ST() { return ST; }, get V() { return V; }, touch: r => hayCache.delete(r)
  };

  function boot() {
    const t = localStorage.getItem(LS('theme')) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    if (window.LAB_DATA) {
      start(window.LAB_DATA);
    } else if (window.LAB_DATA_ENC) {
      unlock();
    } else {
      removeBootScreen();
      const m = $('#main');
      if (m) m.innerHTML = '<div class="card"><div class="empty">⚠ Không tìm thấy dữ liệu (assets/data.js).</div></div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
