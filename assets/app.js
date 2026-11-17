/* =====================================================================
   WEB APP: Tài sản – Vật tư Truyền dẫn LAB   (JavaScript thuần, không cần build)
   Dữ liệu: assets/data.js  ·  Cấu hình: assets/config.js  ·  Giao diện: assets/style.css
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Cấu hình & tiện ích ---------- */
  const CFG = Object.assign({
    title: 'Tài sản – Vật tư Truyền dẫn LAB', subtitle: '', checkLabel: 'Đã kiểm', storageKey: 'lab-xvt-v1',
    groupNames: ['Thiết bị theo hệ thống', 'Vật tư rời / đo kiểm'], sheetLabels: {}, colorMeaning: {}, maxSearchResults: 400
  }, window.APP_CONFIG || {});

  const BUILD = '2026.11.08-4';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = k => CFG.storageKey + ':' + k;
  const COLOR_NAMES = { FFFF00: 'Vàng', FF0000: 'Đỏ', '92D050': 'Xanh lá nhạt', '00B050': 'Xanh lá', '00B0F0': 'Xanh dương',
    FFC000: 'Cam', F79646: 'Cam nhạt', FFF2CC: 'Vàng kem', '0F243E': 'Xanh đen' };

  function fold(s) {
    return String(s).replace(/[^\u0000-\u007f]/g, ch => {
      let n = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (n === 'đ') n = 'd'; else if (n === 'Đ') n = 'D';
      return n.length === 1 ? n : ch;
    }).toLowerCase();
  }
  const tokensOf = q => fold(q).trim().split(/\s+/).filter(Boolean);
  const disp = t => String(t).replace(/\\n/g, '\n');
  const bgOf = hex => { const n = parseInt(hex, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},.40)`; };
  const colorLabel = hex => CFG.colorMeaning[hex] || COLOR_NAMES[hex] || ('#' + hex);

  function hl(text, tokens) {
    const t = disp(text);
    if (!tokens || !tokens.length) return esc(t);
    const f = fold(t);
    if (f.length !== t.length) return esc(t);
    const rg = [];
    tokens.forEach(k => { let i = f.indexOf(k); while (k && i !== -1) { rg.push([i, i + k.length]); i = f.indexOf(k, i + k.length); } });
    if (!rg.length) return esc(t);
    rg.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const m = [rg[0].slice()];
    for (let i = 1; i < rg.length; i++) { const l = m[m.length - 1]; if (rg[i][0] <= l[1]) l[1] = Math.max(l[1], rg[i][1]); else m.push(rg[i].slice()); }
    let out = '', p = 0;
    m.forEach(([a, b]) => { out += esc(t.slice(p, a)) + '<mark>' + esc(t.slice(a, b)) + '</mark>'; p = b; });
    return out + esc(t.slice(p));
  }

  const hayCache = new WeakMap();
  const hay = row => { let h = hayCache.get(row); if (h === undefined) { h = fold(row.v.join(' \u00a6 ')); hayCache.set(row, h); } return h; };

  let toastT;
  function toast(msg, ms = 2600) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
  }

  let DATA = null;
  let ST = null;
  const newF = () => ({ q: '', chk: 'all', color: 'all', showX: false });
  const V = { route: { page: 'overview', id: null }, gq: '', edit: false, f: newF(), collapsed: {} };

  const clone = o => JSON.parse(JSON.stringify(o));
  const syncOn = () => { const c = CFG.sync || {}; return !!((c.provider === 'firebase' && c.firebase && c.firebase.projectId) || (c.provider === 'server' && c.server && c.server.url)); };
  const SL = () => window.Slips || {
    init() {}, extraSheets: () => [],
    listHTML: () => '<div class="card"><div class="empty">⚠ Không tải được <b>assets/slips.js</b>.</div></div>',
    view: () => toast('⚠ Thiếu file assets/slips.js', 5000), openEditor: () => toast('⚠ Thiếu file assets/slips.js', 5000)
  };
  function checkModules() {
    const bad = [];
    if (!window.Slips) bad.push('<b>assets/slips.js</b>'); else if (Slips.ver !== BUILD) bad.push('<b>assets/slips.js</b> cũ');
    if (syncOn() && !window.Sync) bad.push('<b>assets/sync.js</b>'); else if (window.Sync && Sync.ver !== BUILD) bad.push('<b>assets/sync.js</b> cũ');
    if (!bad.length) return;
    const d = document.createElement('div'); d.className = 'mod-banner'; d.id = 'modBanner';
    d.innerHTML = '⚠ Thiếu hoặc lệch phiên bản file: ' + bad.join(', ') + '. Hãy bấm <b>Ctrl + F5</b>.<button type="button" onclick="this.parentNode.remove()">Đóng</button>';
    document.body.insertBefore(d, document.body.firstChild);
  }
  const sheetById = id => ST.sheets.find(s => s.id === id);
  const labelOf = s => CFG.sheetLabels[s.id] || s.name;
  const isStock = r => !r.x;
  const stockRows = b => b.rows.filter(isStock);
  const countRows = s => s.blocks.reduce((n, b) => n + stockRows(b).length, 0);
  const countChecked = s => s.blocks.reduce((n, b) => n + stockRows(b).filter(r => r.c === true).length, 0);
  const countExported = () => ST.sheets.reduce((n, s) => n + s.blocks.reduce((m, b) => m + b.rows.filter(r => r.x).length, 0), 0);
  let uidN = 0;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + (uidN++).toString(36);
  function ensureIds(sheets) {
    sheets.forEach(s => s.blocks.forEach((b, bi) => b.rows.forEach(r => { if (!r.i) r.i = r.r ? `${s.id}:${bi}:${r.r}` : 'u' + uid(); })));
  }
  const emptySlips = () => ({ xuat: [], nhap: [] });

  function loadState() {
    let st = null;
    try {
      const saved = JSON.parse(localStorage.getItem(LS('state')) || 'null');
      if (saved && Array.isArray(saved.sheets)) {
        if (saved.ver === DATA.meta.version) st = { sheets: saved.sheets, slips: saved.slips || emptySlips(), dirty: true };
        else {
          const useNew = syncOn() || confirm('Dữ liệu gốc vừa cập nhật. Dùng dữ liệu mới?');
          if (useNew) localStorage.removeItem(LS('state'));
          else st = { sheets: saved.sheets, slips: saved.slips || emptySlips(), dirty: true };
        }
      }
    } catch (e) { }
    if (!st) st = { sheets: clone(DATA.sheets), slips: emptySlips(), dirty: false };
    ensureIds(st.sheets); return st;
  }
  let saveT;
  function writeLocal() {
    try { localStorage.setItem(LS('state'), JSON.stringify({ ver: DATA.meta.version, sheets: ST.sheets, slips: ST.slips })); }
    catch (e) { toast('⚠ Không lưu được vào bộ nhớ trình duyệt.', 5000); }
  }
  function persist() {
    ST.dirty = true; $('#dirty').hidden = false;
    clearTimeout(saveT); saveT = setTimeout(writeLocal, 250);
    if (window.Sync) Sync.schedule();
  }
  function saveLocal() { clearTimeout(saveT); writeLocal(); }
  function resetToBaseline() { ST = { sheets: clone(DATA.sheets), slips: emptySlips(), dirty: false }; ensureIds(ST.sheets); }

  function parseHash() {
    let m = location.hash.match(/^#\/s\/([\w-]+)/);
    if (m && sheetById(m[1])) { V.route = { page: 'sheet', id: m[1] }; return; }
    m = location.hash.match(/^#\/(xuat|nhap)(?:\/(.+))?$/);
    if (m) { let sl = null; try { sl = m[2] ? decodeURIComponent(m[2]) : null; } catch (e) { sl = m[2]; } V.route = { page: 'slips', id: m[1], slip: sl }; return; }
    V.route = { page: 'overview', id: null };
  }
  function go(hash) { if (location.hash === hash) { render(); } else location.hash = hash; }

  function renderSidebar() {
    const groups = [[], []];
    ST.sheets.forEach(s => groups[s.group === 1 ? 1 : 0].push(s));
    let h = `<a class="nav-item ${V.route.page === 'overview' && !V.gq ? 'active' : ''}" href="#/"><span class="nm">🏠 Tổng quan</span></a>`;
    h += `<div class="nav-group">Kho vật tư</div>` + [['xuat', '📤 Phiếu xuất kho'], ['nhap', '📥 Phiếu nhập kho']].map(([k, l]) =>
      `<a class="nav-item ${V.route.page === 'slips' && V.route.id === k && !V.gq ? 'active' : ''}" href="#/${k}"><span class="nm">${l}</span><span class="ct">${(ST.slips[k] || []).length}</span></a>`).join('');
    groups.forEach((g, i) => {
      if (!g.length) return;
      h += `<div class="nav-group">${esc(CFG.groupNames[i] || '')}</div>`;
      g.forEach(s => {
        h += `<a class="nav-item ${V.route.id === s.id && !V.gq ? 'active' : ''}" href="#/s/${s.id}" title="${esc(labelOf(s))}">
                <span class="nm">${esc(labelOf(s))}</span><span class="ct">${countRows(s)}</span></a>`;
      });
    });
    $('#sidebar').innerHTML = h;
  }

  function statusCounts() {
    const c = { 'tốt': 0, 'hỏng': 0, 'lỗi': 0, 'khác': 0 };
    ST.sheets.forEach(s => s.blocks.forEach(b => {
      const k = b.cols.findIndex(x => fold(x).trim() === 'tinh trang');
      if (k < 0) return;
      stockRows(b).forEach(r => {
        const v = fold(r.v[k] || '').trim(); if (!v) return;
        if (v.startsWith('hong')) c['hỏng']++; else if (v.startsWith('tot')) c['tốt']++; else if (v.startsWith('loi')) c['lỗi']++; else c['khác']++;
      });
    }));
    return c;
  }
  function colorCounts() {
    const m = {};
    ST.sheets.forEach(s => s.blocks.forEach(b => stockRows(b).forEach(r => {
      if (r.f) new Set(Object.values(r.f)).forEach(h => { m[h] = (m[h] || 0) + 1; });
    })));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  function viewOverview() {
    let blocks = 0, rows = 0, chk = 0, q2 = 0;
    ST.sheets.forEach(s => s.blocks.forEach(b => { blocks++; const sr = stockRows(b); rows += sr.length; sr.forEach(r => { if (r.c === true) chk++; if (hay(r).includes('??')) q2++; }); }));
    const expo = countExported(), nX = (ST.slips.xuat || []).length, nN = (ST.slips.nhap || []).length;
    const st = statusCounts(), cc = colorCounts();
    const pct = rows ? Math.round(chk * 100 / rows) : 0;
    let h = `<div class="page-title"><h1>Tổng quan</h1><span class="sub">Nguồn: ${esc(DATA.meta.source)} · cập nhật ${esc(DATA.meta.generated)}</span>
      <span class="ov-actions">
        <button class="tbtn primary" onclick="window.openAddMaterialModal()">📦 Thêm vật tư</button>
        <button class="tbtn primary" data-sl-new="xuat">📤 Tạo phiếu xuất kho</button>
        <button class="tbtn primary" data-sl-new="nhap">📥 Tạo phiếu nhập kho</button>
      </span></div>
    <div class="kpis">
      <div class="kpi"><div class="n">${ST.sheets.length}</div><div class="l">Sheet / hệ thống</div></div>
      <div class="kpi"><div class="n">${blocks}</div><div class="l">Khối thiết bị</div></div>
      <div class="kpi"><div class="n">${rows.toLocaleString('vi-VN')}</div><div class="l">Vật tư trong danh mục (tồn)</div></div>
      <div class="kpi ok"><div class="n">${chk.toLocaleString('vi-VN')}</div><div class="l">${esc(CFG.checkLabel)} (${pct}%)</div></div>
      <div class="kpi warn"><div class="n">${(rows - chk).toLocaleString('vi-VN')}</div><div class="l">Chưa tích “${esc(CFG.checkLabel)}”</div></div>
      <button class="kpi bad" data-q="??" title="Bấm để xem danh sách"><div class="n">${q2}</div><div class="l">Dòng ghi “??”</div></button>
      <a class="kpi" href="#/xuat" style="text-decoration:none;color:inherit"><div class="n">${expo}</div><div class="l">Đã xuất kho · ${nX} phiếu xuất</div></a>
      <a class="kpi" href="#/nhap" style="text-decoration:none;color:inherit"><div class="n">${nN}</div><div class="l">Phiếu nhập kho</div></a>
    </div>
    <div class="grid2">
    <div class="card"><h3>Tình trạng vật tư <span class="src">(cột “Tình trạng”)</span></h3><div class="body"><div class="chips">
      <button class="chip" data-q="tốt">🟢 Tốt <b>${st['tốt']}</b></button>
      <button class="chip" data-q="hỏng">🔴 Hỏng <b>${st['hỏng']}</b></button>
      <button class="chip" data-q="lỗi">🟠 Lỗi <b>${st['lỗi']}</b></button>
      <span class="chip">⚪ Khác <b>${st['khác']}</b></span></div></div></div>
    <div class="card"><h3>Màu đánh dấu Excel</h3><div class="body">
      ${cc.length ? cc.map(([hx, n]) => `<div class="legend-row"><span class="sw" style="background:#${hx}"></span><span><b>${esc(colorLabel(hx))}</b></span><span class="src">· ${n} dòng</span></div>`).join('') : '<span class="src">Không có.</span>'}</div></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>Danh sách sheet</h3>
    <div style="overflow:auto"><table class="plain"><thead><tr><th>Sheet</th><th class="num">Khối</th><th class="num">Dòng</th><th class="num">${esc(CFG.checkLabel)}</th><th>Tiến độ</th></tr></thead><tbody>`;
    ST.sheets.forEach(s => {
      const n = countRows(s), c = countChecked(s), p = n ? Math.round(c * 100 / n) : 0;
      h += `<tr class="link" data-go="#/s/${s.id}"><td><a href="#/s/${s.id}"><b>${esc(labelOf(s))}</b></a></td><td class="num">${s.blocks.length}</td>
            <td class="num">${n}</td><td class="num">${c}</td><td><span class="bar"><i style="width:${p}%"></i></span>${p}%</td></tr>`;
    });
    return h + '</tbody></table></div></div>';
  }

  function passRow(row, tokens, f) {
    if (row.x && !f.showX) return false;
    if (f.chk === 'yes' && row.c !== true) return false;
    if (f.chk === 'no' && row.c === true) return false;
    if (f.color !== 'all' && !(row.f && Object.values(row.f).includes(f.color))) return false;
    if (tokens.length) { const h = hay(row); for (const t of tokens) if (!h.includes(t)) return false; }
    return true;
  }
  const colClass = label => { const f = fold(label); return /^stt$/.test(f.trim()) ? 'c-stt' : (/serial|s\/n|part|pasnumber|ma card|^ma$|ma vt|ma vat tu/.test(f) ? 'c-mono' : ''); };

  function rowHTML(s, bi, b, ri, row, tokens) {
    const tag = row.x ? `<button class="tag tag-x" data-slip="xuat:${esc(row.x)}" title="Đã xuất theo phiếu">ĐÃ XUẤT</button>`
      : (row.n ? `<button class="tag tag-n" data-slip="nhap:${esc(row.n)}" title="Nhập theo phiếu">MỚI</button>` : '');
    let h = `<tr data-s="${s.id}" data-b="${bi}" data-r="${ri}" class="${row.c === true ? 'is-checked' : ''}${row.x ? ' is-exported' : ''}">
      <td class="c-chk"><input type="checkbox" class="chk" ${row.c === true ? 'checked' : ''} ${V.edit ? '' : 'disabled'}>${tag}</td>`;
    const ce = V.edit ? ' contenteditable="true" spellcheck="false"' : '';
    for (let k = 0; k < b.cols.length; k++) {
      const span = row.s && row.s[k] ? row.s[k] : 1;
      const cls = [colClass(b.cols[k]), row.p && row.p.includes(k) ? 'dup' : ''].filter(Boolean).join(' ');
      const st = row.f && row.f[k] ? ` style="background:${bgOf(row.f[k])}"` : '';
      h += `<td data-k="${k}"${span > 1 ? ` colspan="${span}"` : ''}${cls ? ` class="${cls}"` : ''}${st}${ce}>${hl(row.v[k] || '', tokens)}</td>`;
      k += span - 1;
    }
    if (V.edit) h += '<td class="c-del"><button class="del" title="Xoá dòng">✕</button></td>';
    return h + '</tr>';
  }

  function blockHTML(s, bi, tokens, f, budget) {
    const b = s.blocks[bi], key = s.id + ':' + bi, base = f.showX ? b.rows : stockRows(b);
    let rows = '', shown = 0, chk = 0;
    b.rows.forEach((row, ri) => {
      if (!passRow(row, tokens, f)) return;
      shown++; if (row.c === true) chk++;
      if (budget && budget.left <= 0) return;
      if (budget) budget.left--;
      rows += rowHTML(s, bi, b, ri, row, tokens);
    });
    const filtered = tokens.length || f.chk !== 'all' || f.color !== 'all';
    if (filtered && !shown && !V.edit) return '';
    const head = b.cols.map(c => `<th>${esc(c)}</th>`).join('');
    return `<section class="block ${V.collapsed[key] ? 'collapsed' : ''}" id="blk-${s.id}-${bi}" data-key="${key}" data-s="${s.id}" data-b="${bi}">
      <div class="block-head" data-toggle><span class="tg">▾</span><h3>${esc(b.title)}</h3>
        <span class="badge" data-badge>${filtered ? shown + ' / ' : ''}${base.length} dòng · ✓ ${filtered ? chk : base.filter(r => r.c === true).length}</span>
        <span class="sp"></span>${V.edit ? '<button class="add-row" data-add>＋ Thêm dòng</button>' : ''}</div>
      ${rows ? `<div class="tbl-wrap"><table class="data"><thead><tr><th class="c-chk">${esc(CFG.checkLabel)}</th>${head}${V.edit ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`
             : `<div class="empty">Không có dòng nào khớp bộ lọc.</div>`}
    </section>`;
  }

  function viewSheet(s) {
    const colors = new Set();
    s.blocks.forEach(b => b.rows.forEach(r => r.f && Object.values(r.f).forEach(x => colors.add(x))));
    const nExp = s.blocks.reduce((n, b) => n + b.rows.filter(r => r.x).length, 0);
    let h = `<div class="page-title"><h2>${esc(labelOf(s))}</h2>
      <span class="sub">${s.blocks.length} khối · ${countRows(s)} dòng</span></div>
    <div class="toolbar no-print">
      <input type="search" id="fq" placeholder="Lọc trong sheet này…" value="${esc(V.f.q)}" autocomplete="off">
      <select id="fchk"><option value="all">Tất cả dòng</option><option value="yes" ${V.f.chk === 'yes' ? 'selected' : ''}>Đã tích ✓</option><option value="no" ${V.f.chk === 'no' ? 'selected' : ''}>Chưa tích</option></select>
      ${nExp ? `<label class="chk-inline"><input type="checkbox" id="fshowx" ${V.f.showX ? 'checked' : ''}> Hiện đã xuất (${nExp})</label>` : ''}
      <button class="tbtn" data-all="collapse">Thu gọn</button><button class="tbtn" data-all="expand">Mở rộng</button>
      <span class="count" id="fcount"></span></div>`;
    return h + '<div id="blocks"></div>';
  }
  function renderBlocks() {
    const s = sheetById(V.route.id), tokens = tokensOf(V.f.q);
    let html = '', shown = 0, total = 0;
    s.blocks.forEach((b, i) => { const base = V.f.showX ? b.rows : stockRows(b); total += base.length; shown += base.filter(r => passRow(r, tokens, V.f)).length; html += blockHTML(s, i, tokens, V.f, null); });
    $('#blocks').innerHTML = html || '<div class="card"><div class="empty">Không có dòng nào khớp bộ lọc.</div></div>';
    $('#fcount').textContent = shown === total ? `${total} dòng` : `Hiển thị ${shown} / ${total} dòng`;
  }

  function viewSearch() {
    const tokens = tokensOf(V.gq), budget = { left: CFG.maxSearchResults };
    let found = 0, html = '', sheetsHit = 0;
    const f = { q: '', chk: 'all', color: 'all', showX: true };
    ST.sheets.forEach(s => {
      let part = '', hit = 0;
      s.blocks.forEach((b, bi) => {
        const n = b.rows.filter(r => passRow(r, tokens, f)).length; if (!n) return;
        hit += n; if (budget.left > 0) part += blockHTML(s, bi, tokens, f, budget);
      });
      if (hit) { found += hit; sheetsHit++; html += `<div class="page-title" style="margin:18px 0 8px"><h2 style="font-size:16px">📁 <a href="#/s/${s.id}" data-clear>${esc(labelOf(s))}</a></h2><span class="sub">${hit} kết quả</span></div>` + part; }
    });
    return `<div class="page-title"><h1>Kết quả tìm “${esc(V.gq)}”</h1><span class="sub">${found} dòng</span></div>` +
      (found ? html : '<div class="card"><div class="empty">Không tìm thấy.</div></div>');
  }

  function render() {
    renderSidebar();
    const m = $('#main');
    if (V.gq.trim()) m.innerHTML = viewSearch();
    else if (V.route.page === 'sheet') { m.innerHTML = viewSheet(sheetById(V.route.id)); renderBlocks(); }
    else if (V.route.page === 'slips') {
      try { m.innerHTML = SL().listHTML(V.route.id); } catch (err) { m.innerHTML = '<div class="card"><div class="empty" style="color:#b91c1c">⚠ Lỗi tải phiếu.</div></div>'; }
      if (V.route.slip) { const sid = V.route.slip; V.route.slip = null; SL().view(V.route.id, sid); }
    }
    else m.innerHTML = viewOverview();
    document.title = CFG.title;
  }
  const keepScroll = fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  /* =====================================================================
     TÍNH NĂNG MỚI: THÊM VẬT TƯ & PHÂN LOẠI TỰ ĐỘNG (Ưu tiên Mã VT -> Part -> Tên)
     ===================================================================== */
  window.openAddMaterialModal = function() {
    var currentRole = localStorage.getItem('lab_user_role');
    if (currentRole === 'guest') {
      alert('Tài khoản Khách không có quyền thêm vật tư mới!');
      return;
    }
    
    var modalHTML = `
      <div class="modal-back" id="mdAddMat">
        <div class="modal" style="max-width: 500px;">
          <div class="modal-head">
            <h2>📦 Thêm vật tư mới vào kho</h2>
            <button class="modal-x" onclick="document.getElementById('mdAddMat').remove()">✕</button>
          </div>
          <div class="modal-body">
            <form id="formAddMat" onsubmit="window.handleSaveNewMaterial(event)">
              <label class="fld"><span>Mã vật tư (Mã VT):</span><input type="text" id="newMaVT" required></label>
              <label class="fld"><span>Tên vật tư:</span><input type="text" id="newTenVT" required></label>
              <label class="fld"><span>Part Number:</span><input type="text" id="newPartNum"></label>
              <label class="fld"><span>Serial No:</span><input type="text" id="newSerial"></label>
              <label class="fld"><span>Tình trạng:</span><input type="text" id="newTinhTrang" value="Tốt"></label>
              <label class="fld"><span>Ghi chú:</span><input type="text" id="newGhiChu"></label>
              <div class="sy-btns" style="margin-top: 15px;">
                <button class="tbtn primary" type="submit">Lưu & Phân loại tự động</button>
                <button class="tbtn" type="button" onclick="document.getElementById('mdAddMat').remove()">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    var div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div);
  };

  window.handleSaveNewMaterial = function(e) {
    e.preventDefault();
    
    var newMat = {
      r: 0,
      i: 'm_' + Math.random().toString(36).substr(2, 9),
      v: [
        '', 
        document.getElementById('newMaVT').value.trim(),
        document.getElementById('newTenVT').value.trim(),
        document.getElementById('newSerial').value.trim(),
        document.getElementById('newPartNum').value.trim(),
        document.getElementById('newTinhTrang').value.trim(),
        document.getElementById('newGhiChu').value.trim()
      ],
      ct: Date.now(),
      c: false
    };

    var targetBlock = null;
    var targetSheet = null;
    var sheets = ST.sheets || [];
    
    // Ưu tiên 1: Khớp chính xác Mã VT (cột 1) hoặc Part Number (cột 4)
    for (var i = 0; i < sheets.length; i++) {
      var blocks = sheets[i].blocks || [];
      for (var b = 0; b < blocks.length; b++) {
        var rows = blocks[b].rows || [];
        for (var r = 0; r < rows.length; r++) {
          var exMa = (rows[r].v[1] || '').trim();
          var exPart = (rows[r].v[4] || '').trim();
          if ((newMat.v[1] && exMa && newMat.v[1].toLowerCase() === exMa.toLowerCase()) ||
              (newMat.v[4] && exPart && newMat.v[4].toLowerCase() === exPart.toLowerCase())) {
            targetSheet = sheets[i];
            targetBlock = blocks[b];
            break;
          }
        }
        if (targetBlock) break;
      }
      if (targetBlock) break;
    }

    // Ưu tiên 2: Khớp Tên vật tư (cột 2)
    if (!targetBlock) {
      for (var i = 0; i < sheets.length; i++) {
        var blocks = sheets[i].blocks || [];
        for (var b = 0; b < blocks.length; b++) {
          var rows = blocks[b].rows || [];
          for (var r = 0; r < rows.length; r++) {
            var exTen = (rows[r].v[2] || '').trim();
            if (newMat.v[2] && exTen && newMat.v[2].toLowerCase() === exTen.toLowerCase()) {
              targetSheet = sheets[i];
              targetBlock = blocks[b];
              break;
            }
          }
          if (targetBlock) break;
        }
        if (targetBlock) break;
      }
    }

    // Mặc định: Đưa vào khối đầu tiên nếu không tìm thấy từ khóa khớp
    if (!targetBlock && sheets.length > 0 && sheets[0].blocks.length > 0) {
      targetSheet = sheets[0];
      targetBlock = sheets[0].blocks[0];
    }

    if (targetBlock) {
      targetBlock.rows.push(newMat);
      persist();
      render();
      document.getElementById('mdAddMat').remove();
      toast('Thêm vật tư thành công vào nhóm: "' + targetBlock.title + '"');
    } else {
      alert('Lỗi: Không tìm thấy danh mục kho phù hợp.');
    }
  };

  function bind() {
    const main = $('#main');

    main.addEventListener('click', e => {
      const t = e.target;
      const sl = t.closest('[data-slip]'); if (sl) { const k = sl.dataset.slip, i = k.indexOf(':'); SL().view(k.slice(0, i), k.slice(i + 1)); return; }
      const q = t.closest('[data-q]'); if (q) { setGlobalSearch(q.dataset.q); return; }
      const g = t.closest('[data-go]'); if (g && !t.closest('a')) { location.hash = g.dataset.go; return; }
      if (t.closest('[data-clear]')) { setGlobalSearch(''); }
      const all = t.closest('[data-all]'); if (all) { const s = sheetById(V.route.id); s.blocks.forEach((b, i) => { V.collapsed[s.id + ':' + i] = all.dataset.all === 'collapse'; }); renderBlocks(); return; }
      const th = t.closest('[data-toggle]');
      if (th && !t.closest('button')) { const sec = th.closest('.block'); sec.classList.toggle('collapsed'); V.collapsed[sec.dataset.key] = sec.classList.contains('collapsed'); }
    });

    main.addEventListener('change', e => {
      if (e.target.matches('input.chk')) {
        const tr = e.target.closest('tr[data-s]'); if (!tr) return;
        const s = sheetById(tr.dataset.s), b = s.blocks[+tr.dataset.b], row = b.rows[+tr.dataset.r];
        row.c = e.target.checked; tr.classList.toggle('is-checked', row.c); persist();
      } else if (e.target.id === 'fchk') { V.f.chk = e.target.value; renderBlocks(); }
      else if (e.target.id === 'fshowx') { V.f.showX = e.target.checked; renderBlocks(); }
    });
    let ft; main.addEventListener('input', e => {
      if (e.target.id === 'fq') { clearTimeout(ft); ft = setTimeout(() => { V.f.q = e.target.value; renderBlocks(); }, 150); }
    });

    let gt; $('#gq').addEventListener('input', e => { clearTimeout(gt); gt = setTimeout(() => setGlobalSearch(e.target.value, true), 180); });
    $('#gqClear').addEventListener('click', () => setGlobalSearch(''));
    
    $('#btnMenu').addEventListener('click', () => toggleSidebar());
    $('#overlay').addEventListener('click', () => toggleSidebar(false));
    $('#sidebar').addEventListener('click', e => { if (e.target.closest('a')) { if (V.gq) setGlobalSearch(''); toggleSidebar(false); } });
    $('#btnEdit').addEventListener('click', () => setEdit(!V.edit));
    $('#btnPrint').addEventListener('click', () => window.print());
    $('#btnTheme').addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem(LS('theme'), t); });
    window.addEventListener('hashchange', () => { parseHash(); V.f = newF(); if (V.gq) setGlobalSearch(''); else render(); window.scrollTo(0, 0); });
  }

  function toggleSidebar(force) {
    const sb = $('#sidebar'), open = force === undefined ? !sb.classList.contains('open') : force;
    sb.classList.toggle('open', open); $('#overlay').classList.toggle('show', open);
  }
  function setGlobalSearch(q, fromInput) {
    V.gq = q; const inp = $('#gq'); if (!fromInput && inp.value !== q) inp.value = q;
    $('#gqClear').hidden = !q.trim();
    render();
    if (q.trim() && !fromInput) window.scrollTo(0, 0);
  }
  function setEdit(on) {
    V.edit = on; document.body.classList.toggle('editing', on);
    const b = $('#btnEdit'); b.setAttribute('aria-pressed', on); $('span', b).textContent = on ? 'Đang chỉnh sửa' : 'Chỉnh sửa';
    $('#editbar').hidden = !on; keepScroll(render);
  }

  function start(data) {
    DATA = data; ST = loadState();
    $('#boot').remove(); $('#topbar').hidden = false; $('#layout').hidden = false;
    $('#appTitle').textContent = CFG.title; $('#appSub').textContent = CFG.subtitle;
    $('#dirty').hidden = !ST.dirty;
    checkModules(); SL().init(window.LabApp); if (window.Sync) Sync.init(window.LabApp);
    parseHash(); bind(); render();
  }
  async function decrypt(enc, pw) {
    const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, key, b64(enc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  function unlock() {
    $('#boot').innerHTML = `<form class="lock" id="lockForm"><h2>🔒 ${esc(CFG.title)}</h2><p>Nhập mật khẩu:</p>
      <input type="password" id="pw" autofocus><div class="err" id="pwErr"></div><button>Mở khoá</button></form>`;
    $('#lockForm').addEventListener('submit', async ev => {
      ev.preventDefault(); const err = $('#pwErr'); err.textContent = 'Đang giải mã…';
      try { start(await decrypt(window.LAB_DATA_ENC, $('#pw').value)); }
      catch (e) { err.textContent = 'Sai mật khẩu.'; }
    });
  }

  window.LabApp = {
    BUILD, CFG, esc, saveLocal, resetToBaseline, refresh: () => keepScroll(render),
    get DATA() { return DATA; }, fold, tokensOf, toast, sheetById, labelOf, persist, render, keepScroll, isStock, stockRows,
    get ST() { return ST; }, get V() { return V; }
  };
  function boot() {
    const t = localStorage.getItem(LS('theme')) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    if (window.LAB_DATA) start(window.LAB_DATA);
    else if (window.LAB_DATA_ENC) unlock();
  }
  boot();
})();
