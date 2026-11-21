/* =====================================================================
   app.js – VẬT TƯ – TÀI SẢN (Tích hợp Sync Firebase, Nhập file & Cây thư mục ngang)
   ===================================================================== */
(function () {
  'use strict';

  const DEFAULT_SOURCES = ['Vật tư', 'Tài sản', 'Đo kiểm', 'Sửa chữa', 'Không rõ nguồn'];
  const DEFAULT_SOURCE = 'Không rõ nguồn';
  const STANDARD_COLS = ['Nguồn', 'STT', 'Tên Vật Tư', 'Serial', 'Mã VT', 'Part number', 'Ghi chú'];

  const CFG = Object.assign({
    title: 'Vật tư – Tài sản',
    subtitle: '',
    sourceLabel: 'Nguồn',
    sourceOptions: DEFAULT_SOURCES,
    defaultSource: DEFAULT_SOURCE,
    tableColumns: STANDARD_COLS,
    storageKey: 'vat-tu-tai-san-v2',
    sheetLabels: {},
    colorMeaning: {},
    maxSearchResults: 400,
    treeMenu: []
  }, window.APP_CONFIG || {});

  const SRC_LIST = Array.isArray(CFG.sourceOptions) && CFG.sourceOptions.length
    ? CFG.sourceOptions
    : DEFAULT_SOURCES;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const LS = key => `${CFG.storageKey}:${key}`;
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

  function normalizeSource(val, fallback = CFG.defaultSource || DEFAULT_SOURCE) {
    if (!val) return fallback;
    const raw = String(val).trim();
    const exact = SRC_LIST.find(x => x.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;
    const f = fold(raw);
    if (f.includes('tai san')) return SRC_LIST.find(x => fold(x).includes('tai san')) || 'Tài sản';
    if (f.includes('do luong') || f.includes('do kiem')) return SRC_LIST.find(x => fold(x).includes('do kiem')) || 'Đo kiểm';
    if (f.includes('sua chua')) return SRC_LIST.find(x => fold(x).includes('sua chua')) || 'Sửa chữa';
    if (f.includes('vat tu')) return SRC_LIST.find(x => fold(x).includes('vat tu')) || 'Vật tư';
    if (f.includes('khong ro')) return SRC_LIST.find(x => fold(x).includes('khong ro')) || 'Không rõ nguồn';
    return fallback;
  }

  let uidSeq = 1;
  function uid() {
    return 'r_' + Date.now().toString(36) + '_' + (uidSeq++).toString(36);
  }

  function normalizeRow(row, index, defaultSrc = DEFAULT_SOURCE) {
    const r = row && typeof row === 'object' ? row : {};
    const v = Array.isArray(r.v) ? r.v.slice() : [];
    const src = normalizeSource(r.src || v[0], defaultSrc);
    const stt = String(v[1] ?? (index + 1));
    const tenVT = String(v[2] ?? '');
    const serial = String(v[3] ?? '');
    const maVT = String(v[4] ?? '');
    const partNo = String(v[5] ?? '');
    const ghiChu = String(v[6] ?? '');
    return Object.assign({}, r, {
      i: r.i || uid(),
      r: Number(r.r) || (index + 1),
      src,
      v: [src, stt, tenVT, serial, maVT, partNo, ghiChu]
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

  const flatNodes = flattenTree(CFG.treeMenu || []);
  const nodeById = new Map(flatNodes.map(item => [item.node.id, item]));

  function matchNodeIdByText(text) {
    const fText = fold(text || '');
    if (!fText) return null;
    for (const item of flatNodes) {
      const n = item.node;
      if (Array.isArray(n.children) && n.children.length > 0) continue;
      if (fold(n.label) === fText || fText.includes(fold(n.label))) return n.id;
      if (Array.isArray(n.matchKeywords) && n.matchKeywords.some(kw => fText.includes(fold(kw)))) {
        return n.id;
      }
    }
    return null;
  }

  function buildSheetsFromStore(storeMap) {
    return flatNodes.map((entry, sIdx) => {
      const n = entry.node;
      const rows = (Array.isArray(storeMap[n.id]) ? storeMap[n.id] : []).map((r, i) =>
        normalizeRow(r, i, CFG.defaultSource)
      );
      return {
        id: n.id,
        name: CFG.sheetLabels[n.id] || n.label,
        categoryId: n.id,
        group: n.defaultGroup || (entry.parentId ? 0 : sIdx),
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

    if (!Array.isArray(sheets)) return store;

    for (const sh of sheets) {
      const matchedNodeId =
        (nodeById.has(sh.id) ? sh.id : null) ||
        matchNodeIdByText(sh.name) ||
        matchNodeIdByText(sh.id);

      const blocks = Array.isArray(sh.blocks) ? sh.blocks : [];
      for (const blk of blocks) {
        const blkTarget =
          matchNodeIdByText(blk.title) ||
          matchedNodeId ||
          (flatNodes[0] && flatNodes[0].node.id);
        if (!blkTarget || !store[blkTarget]) continue;
        const rows = Array.isArray(blk.rows) ? blk.rows : [];
        rows.forEach((r, idx) => {
          store[blkTarget].push(normalizeRow(r, idx, CFG.defaultSource));
        });
      }
    }

    for (const id of Object.keys(store)) {
      store[id].forEach((r, idx) => {
        r.r = idx + 1;
        if (Array.isArray(r.v)) r.v[1] = String(idx + 1);
      });
    }
    return store;
  }

  const DATA = Object.assign(
    { meta: { source: 'LAB', generated: '', version: '2026.11.21' }, sheets: buildSheetsFromStore({}) },
    window.LAB_DATA || {}
  );

  const ST = {
    sheets: buildSheetsFromStore({}),
    slips: { xuat: [], nhap: [] },
    dirty: false
  };

  let storeData = {};

  function syncSTFromStore() {
    for (const id of Object.keys(storeData)) {
      storeData[id].forEach((r, idx) => {
        r.r = idx + 1;
        if (Array.isArray(r.v)) r.v[1] = String(idx + 1);
      });
    }
    ST.sheets = buildSheetsFromStore(storeData);
  }

  function syncStoreFromST() {
    storeData = buildStoreFromSheets(ST.sheets || []);
  }

  function loadInitialState() {
    try {
      const raw = localStorage.getItem(LS('state'));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.sheets)) {
          ST.sheets = parsed.sheets;
          ST.slips = parsed.slips && typeof parsed.slips === 'object'
            ? Object.assign({ xuat: [], nhap: [] }, parsed.slips)
            : { xuat: [], nhap: [] };
          ST.dirty = !!parsed.dirty;
          syncStoreFromST();
          return;
        }
      }
    } catch (_) {}

    if (window.LAB_DATA && Array.isArray(window.LAB_DATA.sheets) && window.LAB_DATA.sheets.length) {
      ST.sheets = clone(window.LAB_DATA.sheets);
      syncStoreFromST();
    } else {
      storeData = buildStoreFromSheets([]);
      syncSTFromStore();
    }
  }

  function saveLocal() {
    syncSTFromStore();
    try {
      localStorage.setItem(LS('state'), JSON.stringify({
        ver: (DATA && DATA.meta && DATA.meta.version) || '',
        sheets: ST.sheets,
        slips: ST.slips,
        dirty: ST.dirty
      }));
    } catch (_) {}
  }

  function persist(markDirty = true) {
    if (markDirty) {
      ST.dirty = true;
      const dirtyEl = $('#dirty');
      if (dirtyEl) dirtyEl.hidden = false;
    }
    saveLocal();
    if (window.Sync && typeof window.Sync.schedule === 'function') {
      window.Sync.schedule();
    }
  }

  function resetToBaseline() {
    localStorage.removeItem(LS('state'));
    if (window.LAB_DATA && Array.isArray(window.LAB_DATA.sheets)) {
      ST.sheets = clone(window.LAB_DATA.sheets);
      syncStoreFromST();
    } else {
      storeData = buildStoreFromSheets([]);
      syncSTFromStore();
    }
    ST.slips = { xuat: [], nhap: [] };
    ST.dirty = false;
    const dirtyEl = $('#dirty');
    if (dirtyEl) dirtyEl.hidden = true;
    saveLocal();
  }

  const state = {
    activeId: (flatNodes[0] && flatNodes[0].node.id) || null,
    editMode: false,
    query: '',
    sourceFilter: 'ALL'
  };

  function getRowsForNode(nodeId) {
    if (!Array.isArray(storeData[nodeId])) storeData[nodeId] = [];
    return storeData[nodeId];
  }

  function matchesRow(row, queryTokens, srcFilter) {
    if (srcFilter && srcFilter !== 'ALL') {
      if (normalizeSource(row.src || (row.v && row.v[0])) !== srcFilter) return false;
    }
    if (!queryTokens.length) return true;
    const hay = fold((row.v || []).join(' '));
    return queryTokens.every(tok => hay.includes(tok));
  }

  function getFilteredRows(nodeId) {
    const rows = getRowsForNode(nodeId);
    const qToks = tokensOf(state.query);
    return rows
      .map((row, idx) => ({ row: normalizeRow(row, idx, CFG.defaultSource), idx }))
      .filter(entry => matchesRow(entry.row, qToks, state.sourceFilter));
  }

  function renderSidebar() {
    const treeEl = $('#tree') || $('#sidebarTree') || $('.tree-menu') || $('#sidebar');
    if (!treeEl) return;

    const renderNodes = (nodes, depth = 0) => {
      if (!Array.isArray(nodes) || !nodes.length) return '';
      return `<ul class="tree-list depth-${depth}" style="list-style:none;margin:0;padding-left:${depth ? 14 : 0}px;">` +
        nodes.map(node => {
          const isActive = state.activeId === node.id;
          const count = getRowsForNode(node.id).length;
          const hasChildren = Array.isArray(node.children) && node.children.length > 0;
          return `
            <li class="tree-item ${isActive ? 'is-active' : ''}" style="margin:2px 0;">
              <button type="button"
                class="tree-link ${isActive ? 'active' : ''}"
                data-node-id="${esc(node.id)}"
                style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 8px;border:0;border-radius:6px;background:${isActive ? 'rgba(11,58,91,.12)' : 'transparent'};color:inherit;text-align:left;cursor:pointer;font-weight:${isActive ? '600' : '400'};">
                <span style="display:inline-flex;align-items:center;gap:6px;min-width:0;">
                  <span>${esc(node.icon || (hasChildren ? '📁' : '📄'))}</span>
                  <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(node.label)}</span>
                </span>
                <span class="tree-count" style="font-size:12px;opacity:.75;">${count}</span>
              </button>
              ${hasChildren ? renderNodes(node.children, depth + 1) : ''}
            </li>
          `;
        }).join('') +
      `</ul>`;
    };

    treeEl.innerHTML = renderNodes(CFG.treeMenu || [], 0);

    $$('[data-node-id]', treeEl).forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeId = btn.getAttribute('data-node-id');
        renderAll();
      });
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
          style="padding:5px 10px;border-radius:6px;border:1px solid ${selected ? '#0b3a5b' : 'rgba(0,0,0,.15)'};background:${selected ? '#0b3a5b' : '#fff'};color:${selected ? '#fff' : 'inherit'};cursor:pointer;font-size:13px;font-weight:${selected ? '600' : '500'};white-space:nowrap;">
          ${esc(item.label)} (${getRowsForNode(item.id).length})
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

  function renderTableRows(entries) {
    if (!entries.length) {
      return `
        <tr>
          <td colspan="8" style="text-align:center;padding:18px;opacity:.7;">
            Không có dữ liệu vật tư / tài sản phù hợp.
          </td>
        </tr>
      `;
    }

    return entries.map(({ row, idx }) => {
      const v = row.v;
      if (!state.editMode) {
        return `
          <tr data-row-idx="${idx}">
            <td>${esc(v[0])}</td>
            <td style="text-align:center;">${esc(v[1])}</td>
            <td>${esc(v[2])}</td>
            <td>${esc(v[3])}</td>
            <td>${esc(v[4])}</td>
            <td>${esc(v[5])}</td>
            <td>${esc(v[6])}</td>
            <td style="white-space:nowrap;">
              <button type="button" class="btn-row-edit" data-idx="${idx}" title="Sửa dòng">✏️</button>
              <button type="button" class="btn-row-del" data-idx="${idx}" title="Xoá dòng">🗑</button>
            </td>
          </tr>
        `;
      }

      const srcOpts = SRC_LIST.map(opt =>
        `<option value="${esc(opt)}" ${v[0] === opt ? 'selected' : ''}>${esc(opt)}</option>`
      ).join('');

      return `
        <tr data-row-idx="${idx}">
          <td><select class="cell-edit" data-col="0">${srcOpts}</select></td>
          <td style="text-align:center;">${esc(v[1])}</td>
          <td><input type="text" class="cell-edit" data-col="2" value="${esc(v[2])}"></td>
          <td><input type="text" class="cell-edit" data-col="3" value="${esc(v[3])}"></td>
          <td><input type="text" class="cell-edit" data-col="4" value="${esc(v[4])}"></td>
          <td><input type="text" class="cell-edit" data-col="5" value="${esc(v[5])}"></td>
          <td><input type="text" class="cell-edit" data-col="6" value="${esc(v[6])}"></td>
          <td style="white-space:nowrap;">
            <button type="button" class="btn-row-del" data-idx="${idx}" title="Xoá dòng">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderMain() {
    const mainEl = $('#main') || $('#appMain') || $('main');
    if (!mainEl) return;

    const currentEntry = nodeById.get(state.activeId) || flatNodes[0];
    if (!currentEntry) return;
    state.activeId = currentEntry.node.id;

    const node = currentEntry.node;
    const breadcrumb = currentEntry.pathNodes.map(n => n.label).join(' / ');
    const filtered = getFilteredRows(node.id);

    const srcFilterOpts = ['ALL', ...SRC_LIST].map(opt => {
      const label = opt === 'ALL' ? 'Tất cả nguồn' : opt;
      return `<option value="${esc(opt)}" ${state.sourceFilter === opt ? 'selected' : ''}>${esc(label)}</option>`;
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
          <button type="button" id="btnAddRow" class="btn accent">+ Thêm dòng</button>
          <button type="button" id="btnExportSheets" class="btn">📗 Xuất Excel (tách sheet)</button>
        </div>
      </div>

      ${renderHorizontalBar(currentEntry)}

      <div class="table-wrap" style="overflow-x:auto;border:1px solid rgba(0,0,0,.12);border-radius:8px;">
        <table id="statsTable" class="data-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>Nguồn</th>
              <th>STT</th>
              <th>Tên Vật Tư</th>
              <th>Serial</th>
              <th>Mã VT</th>
              <th>Part number</th>
              <th>Ghi chú</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(filtered)}
          </tbody>
        </table>
      </div>
    `;

    $$('[data-h-node]', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeId = btn.getAttribute('data-h-node');
        renderAll();
      });
    });

    const filterEl = $('#filterSource', mainEl);
    if (filterEl) {
      filterEl.addEventListener('change', () => {
        state.sourceFilter = filterEl.value;
        renderMain();
      });
    }

    const addBtn = $('#btnAddRow', mainEl);
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const rows = getRowsForNode(node.id);
        const defaultSrc = state.sourceFilter !== 'ALL' ? state.sourceFilter : CFG.defaultSource;
        rows.push(normalizeRow({
          i: uid(),
          src: defaultSrc,
          v: [defaultSrc, String(rows.length + 1), '', '', '', '', '']
        }, rows.length, defaultSrc));
        persist(true);
        renderAll();
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
        const norm = normalizeRow(rows[idx], idx, CFG.defaultSource);
        norm.v[col] = inp.value;
        if (col === 0) norm.src = normalizeSource(inp.value, CFG.defaultSource);
        rows[idx] = norm;
        persist(true);
        renderSidebar();
      });
    });

    $$('.btn-row-edit', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        state.editMode = true;
        const editBtn = $('#btnEdit');
        if (editBtn) editBtn.setAttribute('aria-pressed', 'true');
        renderMain();
      });
    });

    $$('.btn-row-del', mainEl).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        const rows = getRowsForNode(node.id);
        if (!rows[idx]) return;
        rows.splice(idx, 1);
        persist(true);
        renderAll();
      });
    });
  }

  function exportExcelSeparateSheets(targetNode) {
    if (typeof XLSX === 'undefined') {
      alert('Chưa tải thư viện SheetJS (XLSX) để xuất file Excel.');
      return;
    }

    const leaves = collectLeafNodes(targetNode);
    const sheetTargets = leaves.length ? leaves : [targetNode];
    const wb = XLSX.utils.book_new();
    const usedNames = new Set();
    const header = ['Nguồn', 'STT', 'Tên Vật Tư', 'Serial', 'Mã VT', 'Part number', 'Ghi chú'];

    for (const itemNode of sheetTargets) {
      const rawTitle = CFG.sheetLabels[itemNode.id] || itemNode.label || itemNode.id;
      const sheetName = sanitizeSheetName(rawTitle, usedNames);
      const rows = getRowsForNode(itemNode.id);

      const aoa = [header];
      rows.forEach((r, idx) => {
        const norm = normalizeRow(r, idx, CFG.defaultSource);
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

    const fileSlug = fold(targetNode.label || 'thong-ke').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'thong-ke';
    XLSX.writeFile(wb, `${fileSlug}-cac-sheet.xlsx`);
  }

  function handleImportFile(ev) {
    const file = ev.target && ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      toast('Chưa tải thư viện XLSX để đọc file.', 4000);
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

          const targetId =
            matchNodeIdByText(sheetName) ||
            matchNodeIdByText(aoa[0] && aoa[0][0]) ||
            state.activeId ||
            (flatNodes[0] && flatNodes[0].node.id);

          if (!targetId) return;
          const destRows = getRowsForNode(targetId);

          for (let rIdx = 0; rIdx < aoa.length; rIdx++) {
            const rowArr = aoa[rIdx];
            if (!Array.isArray(rowArr) || !rowArr.some(c => String(c || '').trim() !== '')) continue;

            const c0 = String(rowArr[0] || '').trim().toLowerCase();
            const c1 = String(rowArr[1] || '').trim().toLowerCase();
            if (c0 === 'nguồn' || c0 === 'nguon' || c1 === 'stt') continue;

            const hasSourceCol = SRC_LIST.some(opt => fold(opt) === fold(rowArr[0]));
            const src = hasSourceCol ? normalizeSource(rowArr[0], CFG.defaultSource) : CFG.defaultSource;
            const tenVT = String(hasSourceCol ? rowArr[2] : (rowArr[1] || rowArr[0] || '')).trim();
            const serial = String(hasSourceCol ? rowArr[3] : (rowArr[2] || '')).trim();
            const maVT = String(hasSourceCol ? rowArr[4] : (rowArr[3] || '')).trim();
            const partNo = String(hasSourceCol ? rowArr[5] : (rowArr[4] || '')).trim();
            const ghiChu = String(hasSourceCol ? rowArr[6] : (rowArr[5] || '')).trim();

            if (!tenVT && !serial && !maVT && !partNo) continue;

            destRows.push(normalizeRow({
              i: uid(),
              src,
              v: [src, String(destRows.length + 1), tenVT, serial, maVT, partNo, ghiChu]
            }, destRows.length, src));
            importedCount++;
          }
        });

        persist(true);
        renderAll();
        toast(`Đã nhập ${importedCount} dòng dữ liệu.`, 3500);
      } catch (err) {
        toast('Lỗi đọc file: ' + (err && err.message ? err.message : err), 4500);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function renderAll() {
    syncSTFromStore();
    renderSidebar();
    renderMain();
  }

  function refreshFromSync() {
    syncStoreFromST();
    renderSidebar();
    renderMain();
  }

  function bindGlobalControls() {
    const titleEl = $('#appTitle');
    const subEl = $('#appSub');
    if (titleEl) titleEl.textContent = CFG.title;
    if (subEl) subEl.textContent = CFG.subtitle;

    const gq = $('#gq');
    const gqClear = $('#gqClear');
    if (gq) {
      gq.addEventListener('input', () => {
        state.query = gq.value;
        if (gqClear) gqClear.hidden = !state.query;
        renderMain();
      });
    }
    if (gqClear) {
      gqClear.addEventListener('click', () => {
        state.query = '';
        if (gq) gq.value = '';
        gqClear.hidden = true;
        renderMain();
      });
    }

    const btnEdit = $('#btnEdit');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        state.editMode = !state.editMode;
        btnEdit.setAttribute('aria-pressed', String(state.editMode));
        renderMain();
      });
    }

    const importInput = $('#importFileInput');
    if (importInput) {
      importInput.addEventListener('change', handleImportFile);
    }

    $$('#menuExport [data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-act');
        const curEntry = nodeById.get(state.activeId) || flatNodes[0];
        if (act === 'xlsx-all') {
          if (typeof XLSX === 'undefined') return;
          const wb = XLSX.utils.book_new();
          const used = new Set();
          const header = ['Nguồn', 'STT', 'Tên Vật Tư', 'Serial', 'Mã VT', 'Part number', 'Ghi chú'];
          for (const entry of flatNodes) {
            const n = entry.node;
            if (Array.isArray(n.children) && n.children.length > 0) continue;
            const sName = sanitizeSheetName(CFG.sheetLabels[n.id] || n.label, used);
            const rows = getRowsForNode(n.id).map((r, i) => normalizeRow(r, i, CFG.defaultSource).v);
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), sName);
          }
          XLSX.writeFile(wb, 'vat-tu-tai-san-all-sheets.xlsx');
        } else if (act === 'xlsx-cur' && curEntry) {
          exportExcelSeparateSheets(curEntry.node);
        } else if (act === 'json-out') {
          syncSTFromStore();
          const blob = new Blob([JSON.stringify({ sheets: ST.sheets, slips: ST.slips }, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'sao-luu-vat-tu-tai-san.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 500);
        } else if (act === 'reset') {
          if (confirm('Khôi phục dữ liệu gốc?')) {
            resetToBaseline();
            renderAll();
            toast('Đã khôi phục dữ liệu gốc');
          }
        }
      });
    });
  }

  window.LabApp = {
    CFG,
    DATA,
    ST,
    esc,
    uid,
    saveLocal,
    resetToBaseline,
    refresh: refreshFromSync,
    render: refreshFromSync,
    touch: () => {}
  };

  function init() {
    loadInitialState();
    syncSTFromStore();
    bindGlobalControls();
    renderAll();

    try {
      if (window.Sync && typeof window.Sync.init === 'function') {
        window.Sync.init(window.LabApp);
      }
    } catch (_) {}

    const boot = $('#boot');
    const topbar = $('#topbar');
    if (boot) boot.hidden = true;
    if (topbar) topbar.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
