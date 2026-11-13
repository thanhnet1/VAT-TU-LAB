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

  const BUILD = '2026.11.08-4';           // phải trùng với slips.js (dùng để phát hiện file cũ do bộ nhớ đệm)
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = k => CFG.storageKey + ':' + k;
  const COLOR_NAMES = { FFFF00: 'Vàng', FF0000: 'Đỏ', '92D050': 'Xanh lá nhạt', '00B050': 'Xanh lá', '00B0F0': 'Xanh dương',
    FFC000: 'Cam', F79646: 'Cam nhạt', FFF2CC: 'Vàng kem', '0F243E': 'Xanh đen' };

  /** Bỏ dấu tiếng Việt + chữ thường, GIỮ NGUYÊN độ dài chuỗi (để tô sáng đúng vị trí). */
  function fold(s) {
    return String(s).replace(/[^\u0000-\u007f]/g, ch => {
      let n = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (n === 'đ') n = 'd'; else if (n === 'Đ') n = 'D';
      return n.length === 1 ? n : ch;
    }).toLowerCase();
  }
  const tokensOf = q => fold(q).trim().split(/\s+/).filter(Boolean);
  const disp = t => String(t).replace(/\\n/g, '\n');           // chữ "\n" gõ nhầm trong Excel -> xuống dòng khi hiển thị
  const bgOf = hex => { const n = parseInt(hex, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},.40)`; };
  const colorLabel = hex => CFG.colorMeaning[hex] || COLOR_NAMES[hex] || ('#' + hex);

  /** Tô sáng từ khoá (không phân biệt dấu / hoa-thường) */
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

  /* ---------- Trạng thái ---------- */
  let DATA = null;                 // dữ liệu gốc (từ data.js)
  let ST = null;                   // dữ liệu đang dùng (gốc + chỉnh sửa cục bộ): { sheets }
  const newF = () => ({ q: '', chk: 'all', color: 'all', showX: false });
  const V = { route: { page: 'overview', id: null }, gq: '', edit: false, f: newF(), collapsed: {} };

  const clone = o => JSON.parse(JSON.stringify(o));
  const syncOn = () => { const c = CFG.sync || {}; return !!((c.provider === 'firebase' && c.firebase && c.firebase.projectId) || (c.provider === 'server' && c.server && c.server.url)); };
  /* Module phiếu kho: nếu thiếu file slips.js thì web vẫn chạy, chỉ báo thiếu thay vì treo toàn bộ */
  const SL = () => window.Slips || {
    init() {}, extraSheets: () => [],
    listHTML: () => '<div class="card"><div class="empty">⚠ Không tải được <b>assets/slips.js</b> nên chưa dùng được phiếu kho. Hãy kiểm tra file đã được tải lên đủ và bấm Ctrl+F5.</div></div>',
    view: () => toast('⚠ Thiếu file assets/slips.js – chưa mở được phiếu.', 5000), openEditor: () => toast('⚠ Thiếu file assets/slips.js – chưa tạo được phiếu.', 5000)
  };
  /** Kiểm tra đủ file & đúng phiên bản; nếu lệch thì hiện thanh cảnh báo màu đỏ nói rõ file nào */
  function checkModules() {
    const bad = [];
    if (!window.Slips) bad.push('<b>assets/slips.js</b> (chưa tải được)'); else if (Slips.ver !== BUILD) bad.push('<b>assets/slips.js</b> là bản cũ (' + esc(Slips.ver || '?') + ')');
    if (syncOn() && !window.Sync) bad.push('<b>assets/sync.js</b> (chưa tải được – chưa đồng bộ được giữa các thiết bị)'); else if (window.Sync && Sync.ver !== BUILD) bad.push('<b>assets/sync.js</b> là bản cũ (' + esc(Sync.ver || '?') + ')');
    if (!bad.length) return;
    const d = document.createElement('div'); d.className = 'mod-banner'; d.id = 'modBanner';
    d.innerHTML = '⚠ Một số file của web chưa cập nhật đúng: ' + bad.join('; ') + '. Nguyên nhân thường gặp: <b>chưa tải file lên GitHub</b> hoặc <b>trình duyệt đang giữ bản cũ</b>. Cách xử lý: tải đủ các file trong thư mục <code>assets</code> rồi bấm <b>Ctrl + F5</b> (điện thoại: xoá bộ nhớ đệm / mở tab ẩn danh).<button type="button" onclick="this.parentNode.remove()">Đóng</button>';
    document.body.insertBefore(d, document.body.firstChild);
  }
  const sheetById = id => ST.sheets.find(s => s.id === id);
  const labelOf = s => CFG.sheetLabels[s.id] || s.name;
  /* Kho: dòng có r.x = đã xuất theo phiếu (ẩn khỏi danh mục) · dòng có r.n = nhập theo phiếu (nhãn "MỚI") */
  const isStock = r => !r.x;
  const stockRows = b => b.rows.filter(isStock);
  const countRows = s => s.blocks.reduce((n, b) => n + stockRows(b).length, 0);
  const countChecked = s => s.blocks.reduce((n, b) => n + stockRows(b).filter(r => r.c === true).length, 0);
  const countExported = () => ST.sheets.reduce((n, s) => n + s.blocks.reduce((m, b) => m + b.rows.filter(r => r.x).length, 0), 0);
  let uidN = 0;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + (uidN++).toString(36);
  /** Mỗi dòng có mã riêng r.i (cố định) để phiếu liên kết đúng vật tư dù thứ tự dòng thay đổi */
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
          const useNew = syncOn() || confirm('Dữ liệu gốc trên website vừa được cập nhật.\n\nOK  = dùng dữ liệu MỚI (xoá chỉnh sửa & phiếu cũ trên máy này)\nHủy = giữ chỉnh sửa và phiếu cũ của tôi');
          if (useNew) localStorage.removeItem(LS('state'));
          else st = { sheets: saved.sheets, slips: saved.slips || emptySlips(), dirty: true };
        }
      }
    } catch (e) { /* bỏ qua */ }
    if (!st) st = { sheets: clone(DATA.sheets), slips: emptySlips(), dirty: false };
    ensureIds(st.sheets); return st;
  }
  let saveT;
  function writeLocal() {
    try { localStorage.setItem(LS('state'), JSON.stringify({ ver: DATA.meta.version, sheets: ST.sheets, slips: ST.slips })); }
    catch (e) { toast('⚠ Không lưu được vào trình duyệt (bộ nhớ đầy hoặc bị chặn). Hãy dùng Sao lưu JSON.', 5000); }
  }
  function persist() {
    ST.dirty = true; $('#dirty').hidden = false;
    clearTimeout(saveT); saveT = setTimeout(writeLocal, 250);
    if (window.Sync) Sync.schedule();                        // đẩy thay đổi lên đám mây (nếu đã bật & đăng nhập)
  }
  /** lưu ngay vào bộ nhớ máy mà KHÔNG đẩy lên đám mây (dùng khi vừa nhận dữ liệu từ đám mây) */
  function saveLocal() { clearTimeout(saveT); writeLocal(); }
  function resetToBaseline() { ST = { sheets: clone(DATA.sheets), slips: emptySlips(), dirty: false }; ensureIds(ST.sheets); }

  /* ---------- Định tuyến (hash) ---------- */
  function parseHash() {
    let m = location.hash.match(/^#\/s\/([\w-]+)/);
    if (m && sheetById(m[1])) { V.route = { page: 'sheet', id: m[1] }; return; }
    m = location.hash.match(/^#\/(xuat|nhap)(?:\/(.+))?$/);
    if (m) { let sl = null; try { sl = m[2] ? decodeURIComponent(m[2]) : null; } catch (e) { sl = m[2]; } V.route = { page: 'slips', id: m[1], slip: sl }; return; }
    V.route = { page: 'overview', id: null };
  }
  function go(hash) { if (location.hash === hash) { render(); } else location.hash = hash; }

  /* ---------- Thanh bên ---------- */
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

  /* ---------- Trang Tổng quan ---------- */
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
      <button class="kpi bad" data-q="??" title="Bấm để xem danh sách"><div class="n">${q2}</div><div class="l">Dòng ghi “??” (cần xác minh)</div></button>
      <a class="kpi" href="#/xuat" style="text-decoration:none;color:inherit"><div class="n">${expo}</div><div class="l">Đã xuất kho · ${nX} phiếu xuất</div></a>
      <a class="kpi" href="#/nhap" style="text-decoration:none;color:inherit"><div class="n">${nN}</div><div class="l">Phiếu nhập kho</div></a>
    </div>
    <div class="grid2">
    <div class="card"><h3>Tình trạng vật tư <span class="src">(cột “Tình trạng”)</span></h3><div class="body"><div class="chips">
      <button class="chip" data-q="tốt">🟢 Tốt <b>${st['tốt']}</b></button>
      <button class="chip" data-q="hỏng">🔴 Hỏng <b>${st['hỏng']}</b></button>
      <button class="chip" data-q="lỗi">🟠 Lỗi <b>${st['lỗi']}</b></button>
      <span class="chip">⚪ Khác <b>${st['khác']}</b></span></div>
      <p class="src" style="margin:10px 0 0">Bấm vào từng mục để lọc nhanh bằng ô tìm kiếm.</p></div></div>
    <div class="card"><h3>Màu đánh dấu trong file Excel gốc</h3><div class="body">
      ${cc.length ? cc.map(([hx, n]) => `<div class="legend-row"><span class="sw" style="background:#${hx}"></span><span><b>${esc(colorLabel(hx))}</b></span><span class="src">· ${n} dòng</span></div>`).join('') : '<span class="src">Không có.</span>'}
      <p class="src" style="margin:8px 0 0">Ghi ý nghĩa từng màu trong <code>assets/config.js</code> (mục <code>colorMeaning</code>).</p></div></div>
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

  /* ---------- Bảng dữ liệu ---------- */
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
    const tag = row.x ? `<button class="tag tag-x" data-slip="xuat:${esc(row.x)}" title="Đã xuất theo phiếu ${esc(row.x)} – bấm để xem">ĐÃ XUẤT</button>`
      : (row.n ? `<button class="tag tag-n" data-slip="nhap:${esc(row.n)}" title="Nhập theo phiếu ${esc(row.n)} – bấm để xem">MỚI</button>` : '');
    let h = `<tr data-s="${s.id}" data-b="${bi}" data-r="${ri}" class="${row.c === true ? 'is-checked' : ''}${row.x ? ' is-exported' : ''}" ${row.r ? `title="Dòng ${row.r} trong file Excel gốc"` : ''}>
      <td class="c-chk"><input type="checkbox" class="chk" ${row.c === true ? 'checked' : ''} ${V.edit ? '' : 'disabled'} aria-label="${esc(CFG.checkLabel)}">${tag}</td>`;
    const ce = V.edit ? ' contenteditable="true" spellcheck="false"' : '';
    for (let k = 0; k < b.cols.length; k++) {
      const span = row.s && row.s[k] ? row.s[k] : 1;
      const cls = [colClass(b.cols[k]), row.p && row.p.includes(k) ? 'dup' : ''].filter(Boolean).join(' ');
      const st = row.f && row.f[k] ? ` style="background:${bgOf(row.f[k])}"` : '';
      h += `<td data-k="${k}"${span > 1 ? ` colspan="${span}"` : ''}${cls ? ` class="${cls}"` : ''}${st}${ce}>${hl(row.v[k] || '', tokens)}</td>`;
      k += span - 1;
    }
    if (V.edit) h += '<td class="c-del"><button class="del" title="Xoá dòng này" aria-label="Xoá dòng">✕</button></td>';
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
    const head = b.cols.map((c, k) => `<th>${esc(c)}</th>`).join('');
    return `<section class="block ${V.collapsed[key] ? 'collapsed' : ''}" id="blk-${s.id}-${bi}" data-key="${key}" data-s="${s.id}" data-b="${bi}">
      <div class="block-head" data-toggle><span class="tg">▾</span><h3>${esc(b.title)}</h3>
        <span class="badge" data-badge>${filtered ? shown + ' / ' : ''}${base.length} dòng · ✓ ${filtered ? chk : base.filter(r => r.c === true).length}</span>
        <span class="sp"></span>${V.edit ? '<button class="add-row" data-add>＋ Thêm dòng</button>' : ''}</div>
      ${rows ? `<div class="tbl-wrap"><table class="data"><thead><tr><th class="c-chk">${esc(CFG.checkLabel)}</th>${head}${V.edit ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`
             : `<div class="empty">${!base.length && b.rows.length ? 'Tất cả vật tư của khối này đã được xuất kho.' : 'Không có dòng nào khớp bộ lọc.'}</div>`}
    </section>`;
  }

  function viewSheet(s) {
    const colors = new Set();
    s.blocks.forEach(b => b.rows.forEach(r => r.f && Object.values(r.f).forEach(x => colors.add(x))));
    const nExp = s.blocks.reduce((n, b) => n + b.rows.filter(r => r.x).length, 0);
    let h = `<div class="page-title"><h2>${esc(labelOf(s))}</h2>
      <span class="sub">${s.blocks.length} khối · ${countRows(s)} dòng · ✓ ${countChecked(s)} ${esc(CFG.checkLabel.toLowerCase())}${nExp ? ` · ${nExp} đã xuất kho` : ''}</span></div>
    <div class="toolbar no-print">
      <input type="search" id="fq" placeholder="Lọc trong sheet này…" value="${esc(V.f.q)}" autocomplete="off">
      <select id="fchk" title="Lọc theo ô tích">
        <option value="all">Tất cả dòng</option><option value="yes" ${V.f.chk === 'yes' ? 'selected' : ''}>Chỉ dòng đã tích ✓</option>
        <option value="no" ${V.f.chk === 'no' ? 'selected' : ''}>Chỉ dòng chưa tích</option></select>
      ${colors.size ? `<select id="fcolor" title="Lọc theo màu tô trong Excel"><option value="all">Mọi màu</option>${[...colors].map(c => `<option value="${c}" ${V.f.color === c ? 'selected' : ''}>● ${esc(colorLabel(c))}</option>`).join('')}</select>` : ''}
      ${nExp ? `<label class="chk-inline"><input type="checkbox" id="fshowx" ${V.f.showX ? 'checked' : ''}> Hiện cả vật tư đã xuất (${nExp})</label>` : ''}
      <button class="tbtn" data-all="collapse">Thu gọn tất cả</button><button class="tbtn" data-all="expand">Mở rộng tất cả</button>
      <span class="count" id="fcount"></span></div>`;
    if (s.blocks.length > 1) h += '<div class="jump no-print">' + s.blocks.map((b, i) => `<button class="chip" data-jump="blk-${s.id}-${i}">${esc(b.title)} <span class="src">${stockRows(b).length}</span></button>`).join('') + '</div>';
    return h + '<div id="blocks"></div>';
  }
  function renderBlocks() {
    const s = sheetById(V.route.id), tokens = tokensOf(V.f.q);
    let html = '', shown = 0, total = 0;
    s.blocks.forEach((b, i) => { const base = V.f.showX ? b.rows : stockRows(b); total += base.length; shown += base.filter(r => passRow(r, tokens, V.f)).length; html += blockHTML(s, i, tokens, V.f, null); });
    $('#blocks').innerHTML = html || '<div class="card"><div class="empty">Không có dòng nào khớp bộ lọc.</div></div>';
    $('#fcount').textContent = shown === total ? `${total} dòng` : `Hiển thị ${shown} / ${total} dòng`;
  }

  /* ---------- Tìm kiếm toàn bộ ---------- */
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
    const cut = found > CFG.maxSearchResults ? ` (chỉ hiện ${CFG.maxSearchResults} dòng đầu – hãy gõ cụ thể hơn)` : '';
    return `<div class="page-title"><h1>Kết quả tìm “${esc(V.gq)}”</h1><span class="sub">${found} dòng · ${sheetsHit} sheet${cut}</span></div>` +
      (found ? html : '<div class="card"><div class="empty">Không tìm thấy. Thử từ khoá ngắn hơn (không cần gõ dấu).</div></div>');
  }

  /* ---------- Vẽ trang ---------- */
  function render() {
    renderSidebar();
    const m = $('#main');
    if (V.gq.trim()) m.innerHTML = viewSearch();
    else if (V.route.page === 'sheet') { m.innerHTML = viewSheet(sheetById(V.route.id)); renderBlocks(); }
    else if (V.route.page === 'slips') {
      try { m.innerHTML = SL().listHTML(V.route.id); } catch (err) { m.innerHTML = '<div class="card"><div class="empty" style="color:#b91c1c">⚠ Không dựng được danh sách phiếu: ' + esc(err.message) + '<br>Hãy tải lại trang (Ctrl+F5).</div></div>'; }
      if (V.route.slip) { const sid = V.route.slip; V.route.slip = null; SL().view(V.route.id, sid); }
    }
    else m.innerHTML = viewOverview();
    document.title = (V.route.page === 'sheet' && !V.gq ? labelOf(sheetById(V.route.id)) + ' – ' : (V.route.page === 'slips' && !V.gq ? (V.route.id === 'xuat' ? 'Phiếu xuất kho' : 'Phiếu nhập kho') + ' – ' : '')) + CFG.title;
  }
  const keepScroll = fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  /* =====================================================================
     TÍNH NĂNG: THÊM VẬT TƯ, DANH SÁCH SỔ & TỰ ĐỘNG ĐỒNG BỘ DỮ LIỆU GỐC
     ===================================================================== */
  window.openAddMaterialModal = function() {
    var currentRole = localStorage.getItem('lab_user_role');
    if (currentRole === 'guest') {
      alert('Tài khoản Khách không có quyền thêm vật tư mới!');
      return;
    }
    
    // Xây dựng kho dữ liệu tra cứu từ cơ sở dữ liệu hiện có (Mã VT -> {ten, part})
    window._materialDict = {};
    var setMaVT = new Set();
    var setPartNum = new Set();
    var setTenVT = new Set();

    if (ST && ST.sheets) {
      ST.sheets.forEach(function(s) {
        (s.blocks || []).forEach(function(b) {
          (b.rows || []).forEach(function(r) {
            if (r.v) {
              var ma = String(r.v[1] || '').trim();
              var ten = String(r.v[2] || '').trim();
              var part = String(r.v[4] || '').trim();

              if (ma) {
                setMaVT.add(ma);
                window._materialDict[ma.toLowerCase()] = { ten: ten, part: part };
              }
              if (ten) setTenVT.add(ten);
              if (part) setPartNum.add(part);
            }
          });
        });
      });
    }

    var optMaVT = Array.from(setMaVT).sort().map(function(item) { return '<option value="' + esc(item) + '">'; }).join('');
    var optPartNum = Array.from(setPartNum).sort().map(function(item) { return '<option value="' + esc(item) + '">'; }).join('');
    var optTenVT = Array.from(setTenVT).sort().map(function(item) { return '<option value="' + esc(item) + '">'; }).join('');
    
    var modalHTML = `
      <div class="modal-back" id="mdAddMat">
        <div class="modal" style="max-width: 500px;">
          <div class="modal-head">
            <h2>📦 Thêm vật tư mới vào kho</h2>
            <button class="modal-x" onclick="document.getElementById('mdAddMat').remove()">✕</button>
          </div>
          <div class="modal-body">
            <form id="formAddMat" onsubmit="window.handleSaveNewMaterial(event)">
              <label class="fld">
                <span>Mã vật tư (Mã VT):</span>
                <input type="text" id="newMaVT" list="listMaVT" placeholder="Chọn hoặc nhập mã VT..." oninput="window.handleMaVTChange(this.value)" required>
                <datalist id="listMaVT">${optMaVT}</datalist>
              </label>

              <label class="fld">
                <span>Tên vật tư:</span>
                <input type="text" id="newTenVT" list="listTenVT" placeholder="Tên vật tư sẽ đồng bộ theo mã VT..." required>
                <datalist id="listTenVT">${optTenVT}</datalist>
              </label>

              <label class="fld">
                <span>Part Number:</span>
                <input type="text" id="newPartNum" list="listPartNum" placeholder="Part number sẽ đồng bộ theo mã VT...">
                <datalist id="listPartNum">${optPartNum}</datalist>
              </label>

              <label class="fld"><span>Serial No:</span><input type="text" id="newSerial" placeholder="Nhập Serial No..."></label>
              <label class="fld"><span>Tình trạng:</span><input type="text" id="newTinhTrang" value="Tốt"></label>
              <label class="fld"><span>Ghi chú:</span><input type="text" id="newGhiChu" placeholder="Nhập ghi chú..."></label>
              
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

  // Hàm tự động đồng bộ Tên vật tư và Part Number khi người dùng chọn/nhập Mã VT
  window.handleMaVTChange = function(val) {
    if (!window._materialDict) return;
    var key = String(val || '').trim().toLowerCase();
    var found = window._materialDict[key];
    if (found) {
      var tenInput = document.getElementById('newTenVT');
      var partInput = document.getElementById('newPartNum');
      if (tenInput && found.ten) tenInput.value = found.ten;
      if (partInput && found.part) partInput.value = found.part;
    }
  };

  window.handleSaveNewMaterial = function(e) {
    e.preventDefault();
    
    var newMaVT = (document.getElementById('newMaVT').value || '').trim();
    var newTenVT = (document.getElementById('newTenVT').value || '').trim();
    var newPartNum = (document.getElementById('newPartNum').value || '').trim();

    var newMat = {
      r: 0,
      i: 'm_' + Math.random().toString(36).substr(2, 9),
      v: [
        '', 
        newMaVT,
        newTenVT,
        (document.getElementById('newSerial').value || '').trim(),
        newPartNum,
        (document.getElementById('newTinhTrang').value || '').trim(),
        (document.getElementById('newGhiChu').value || '').trim()
      ],
      ct: Date.now(),
      c: false
    };

    var targetBlock = null;
    var targetSheet = null;
    var sheets = ST.sheets || [];
    
    function cleanStr(str) {
      if (!str) return '';
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
    }

    var cleanNewMa = cleanStr(newMaVT);
    var cleanNewPart = cleanStr(newPartNum);
    var cleanNewTen = cleanStr(newTenVT);

    // Ưu tiên 1: Khớp chính xác Mã VT (cột 1) hoặc Part Number (cột 4)
    if (cleanNewMa || cleanNewPart) {
      for (var i = 0; i < sheets.length; i++) {
        var blocks = sheets[i].blocks || [];
        for (var b = 0; b < blocks.length; b++) {
          var rows = blocks[b].rows || [];
          for (var r = 0; r < rows.length; r++) {
            var exMa = cleanStr(rows[r].v[1]);
            var exPart = cleanStr(rows[r].v[4]);
            
            if ((cleanNewMa && exMa && cleanNewMa === exMa) ||
                (cleanNewPart && exPart && cleanNewPart === exPart)) {
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

    // Ưu tiên 2: Khớp theo Tên vật tư (cột 2)
    if (!targetBlock && cleanNewTen) {
      for (var i = 0; i < sheets.length; i++) {
        var blocks = sheets[i].blocks || [];
        for (var b = 0; b < blocks.length; b++) {
          var rows = blocks[b].rows || [];
          for (var r = 0; r < rows.length; r++) {
            var exTen = cleanStr(rows[r].v[2]);
            if (exTen && (cleanNewTen === exTen || exTen.includes(cleanNewTen) || cleanNewTen.includes(exTen))) {
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

    // Dự phòng cuối cùng: Đưa vào khối đầu tiên nếu không dò thấy từ khóa phù hợp
    if (!targetBlock && sheets.length > 0 && sheets[0].blocks.length > 0) {
      targetSheet = sheets[0];
      targetBlock = sheets[0].blocks[0];
    }

    if (targetBlock) {
      targetBlock.rows.push(newMat);
      persist();
      render();
      document.getElementById('mdAddMat').remove();
      toast('Đã phân loại và thêm vật tư vào nhóm: "' + targetBlock.title + '"');
    } else {
      alert('Lỗi: Không tìm thấy danh mục kho phù hợp trong hệ thống.');
    }
  };

  /* ---------- Sự kiện ---------- */
  function locate(el) {
    const tr = el.closest('tr[data-s]'); if (!tr) return null;
    const s = sheetById(tr.dataset.s), b = s.blocks[+tr.dataset.b], row = b.rows[+tr.dataset.r];
    return { tr, s, b, row, bi: +tr.dataset.b, ri: +tr.dataset.r };
  }
  function refreshBadges() {
    $$('.block').forEach(el => {
      const s = sheetById(el.dataset.s), b = s.blocks[+el.dataset.b], bd = $('[data-badge]', el);
      const base = V.f.showX || V.gq ? b.rows : stockRows(b);
      if (bd && !bd.textContent.includes('/')) bd.textContent = `${base.length} dòng · ✓ ${base.filter(r => r.c === true).length}`;
    });
  }

  function bind() {
    const main = $('#main');

    main.addEventListener('click', e => {
      const t = e.target;
      const sl = t.closest('[data-slip]'); if (sl) { const k = sl.dataset.slip, i = k.indexOf(':'); SL().view(k.slice(0, i), k.slice(i + 1)); return; }
      const q = t.closest('[data-q]'); if (q) { setGlobalSearch(q.dataset.q); return; }
      const g = t.closest('[data-go]'); if (g && !t.closest('a')) { location.hash = g.dataset.go; return; }
      if (t.closest('[data-clear]')) { setGlobalSearch(''); }
      const jp = t.closest('[data-jump]'); if (jp) { const el = document.getElementById(jp.dataset.jump); if (el) { el.classList.remove('collapsed'); delete V.collapsed[el.dataset.key]; el.scrollIntoView({ behavior: 'smooth' }); } return; }
      const all = t.closest('[data-all]'); if (all) { const s = sheetById(V.route.id); s.blocks.forEach((b, i) => { V.collapsed[s.id + ':' + i] = all.dataset.all === 'collapse'; }); renderBlocks(); return; }
      const add = t.closest('[data-add]');
      if (add) {
        e.stopPropagation();
        const sec = add.closest('.block'), s = sheetById(sec.dataset.s), b = s.blocks[+sec.dataset.b];
        b.rows.push({ r: 0, i: 'u' + uid(), ct: Date.now(), c: false, v: b.cols.map(() => '') }); persist();
        if (!V.gq && (V.f.q || V.f.chk !== 'all' || V.f.color !== 'all')) { V.f = newF(); render(); } else keepScroll(() => (V.gq ? render() : renderBlocks()));
        const nr = $(`tr[data-s="${s.id}"][data-b="${sec.dataset.b}"][data-r="${b.rows.length - 1}"] td[contenteditable]`);
        if (nr) { nr.scrollIntoView({ block: 'center' }); nr.focus(); }
        return;
      }
      const del = t.closest('.del');
      if (del) {
        const L = locate(del); if (!L) return;
        if (confirm('Xoá dòng này?\n\n' + L.row.v.filter(Boolean).join(' | '))) { L.b.rows.splice(L.ri, 1); persist(); keepScroll(() => (V.gq ? render() : renderBlocks())); toast('Đã xoá dòng'); }
        return;
      }
      const th = t.closest('[data-toggle]');
      if (th && !t.closest('button')) { const sec = th.closest('.block'); sec.classList.toggle('collapsed'); V.collapsed[sec.dataset.key] = sec.classList.contains('collapsed'); }
    });

    main.addEventListener('change', e => {
      if (e.target.matches('input.chk')) {
        const L = locate(e.target); if (!L) return;
        L.row.c = e.target.checked; L.tr.classList.toggle('is-checked', L.row.c); persist(); refreshBadges();
      } else if (e.target.id === 'fchk') { V.f.chk = e.target.value; renderBlocks(); }
      else if (e.target.id === 'fcolor') { V.f.color = e.target.value; renderBlocks(); }
      else if (e.target.id === 'fshowx') { V.f.showX = e.target.checked; renderBlocks(); }
    });
    let ft; main.addEventListener('input', e => {
      if (e.target.id === 'fq') { clearTimeout(ft); ft = setTimeout(() => { V.f.q = e.target.value; renderBlocks(); }, 150); }
    });

    main.addEventListener('focusin', e => { const td = e.target.closest('td[contenteditable]'); if (td) td.dataset.orig = td.innerText; });
    main.addEventListener('focusout', e => {
      const td = e.target.closest('td[contenteditable]'); if (!td) return;
      const val = td.innerText.replace(/\u00a0/g, ' ').replace(/\n+$/, '').trim();
      if (td.innerText === td.dataset.orig) return;
      const L = locate(td); if (!L) return;
      L.row.v[+td.dataset.k] = val; hayCache.delete(L.row);
      if (L.row.p) L.row.p = L.row.p.filter(k => k !== +td.dataset.k);
      persist();
    });
    main.addEventListener('paste', e => {
      if (!e.target.closest('td[contenteditable]')) return;
      e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text'));
    });
    main.addEventListener('keydown', e => {
      const td = e.target.closest && e.target.closest('td[contenteditable]');
      if (td && e.key === 'Escape') { td.innerText = td.dataset.orig || ''; td.blur(); }
    });

    let gt; $('#gq').addEventListener('input', e => { clearTimeout(gt); gt = setTimeout(() => setGlobalSearch(e.target.value, true), 180); });
    $('#gqClear').addEventListener('click', () => setGlobalSearch(''));
    document.addEventListener('keydown', e => {
      const typing = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === '/' && !typing) { e.preventDefault(); $('#gq').focus(); }
      if (e.key === 'Escape' && e.target.id === 'gq') setGlobalSearch('');
    });

    $('#btnMenu').addEventListener('click', () => toggleSidebar());
    $('#overlay').addEventListener('click', () => toggleSidebar(false));
    $('#sidebar').addEventListener('click', e => { if (e.target.closest('a')) { if (V.gq) setGlobalSearch(''); toggleSidebar(false); } });
    $('#btnEdit').addEventListener('click', () => setEdit(!V.edit));
    $('#btnPrint').addEventListener('click', () => window.print());
    $('#btnTheme').addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem(LS('theme'), t); });
    $('#menuExport').addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b) { $('#menuExport').open = false; doAction(b.dataset.act); } });
    document.addEventListener('click', e => { const m = $('#menuExport'); if (m.open && !m.contains(e.target)) m.open = false; });
    $('#fileIn').addEventListener('change', importJSON);
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

  /* ---------- Xuất / sao lưu ---------- */
  const ymd = () => new Date().toISOString().slice(0, 10);
  function download(name, type, content) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function sheetAOA(s) {
    const aoa = [];
    s.blocks.forEach((b, i) => { if (i) aoa.push([]); aoa.push([b.title]); aoa.push([CFG.checkLabel, ...b.cols]); stockRows(b).forEach(r => aoa.push([r.c === true ? '✓' : '', ...r.v])); });
    return aoa;
  }
  const toCSV = aoa => '\ufeffsep=,\r\n' + aoa.map(r => r.map(c => { c = String(c == null ? '' : c); return /[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',')).join('\r\n');
  function doAction(act) {
    const cur = V.route.page === 'sheet' ? sheetById(V.route.id) : null;
    if (act === 'xlsx-all' || act === 'xlsx-cur') {
      const list = act === 'xlsx-all' ? ST.sheets : (cur ? [cur] : null);
      if (!list) { toast('Hãy mở một sheet trước khi xuất “sheet đang xem”.'); return; }
      if (!window.XLSX) { toast('Chưa tải được thư viện Excel (cần Internet). Hãy dùng CSV hoặc thử lại.', 5000); return; }
      const wb = XLSX.utils.book_new(), used = new Set();
      list.forEach(s => {
        const ws = XLSX.utils.aoa_to_sheet(sheetAOA(s));
        ws['!cols'] = [8, 14, 18, 34, 24, 22, 36, 22, 22, 18, 18].map(w => ({ wch: w }));
        let nm = s.name.replace(/[\\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet', i = 2; const base = nm;
        while (used.has(nm.toLowerCase())) nm = base.slice(0, 28) + ' ' + i++;
        used.add(nm.toLowerCase()); XLSX.utils.book_append_sheet(wb, ws, nm);
      });
      if (act === 'xlsx-all') SL().extraSheets().forEach(x => { const ws = XLSX.utils.aoa_to_sheet(x.aoa); ws['!cols'] = x.aoa[0].map((_, i) => ({ wch: [16, 11, 24, 24, 24, 5, 16, 34, 22, 18, 22, 11, 7, 6, 9, 34, 24][i] || 16 })); XLSX.utils.book_append_sheet(wb, ws, x.name); });
      XLSX.writeFile(wb, `Tai-san-Vat-tu-LAB_${act === 'xlsx-all' ? 'tat-ca' : list[0].id}_${ymd()}.xlsx`);
    } else if (act === 'csv-cur') {
      if (!cur) { toast('Hãy mở một sheet trước khi xuất CSV.'); return; }
      download(`${cur.id}_${ymd()}.csv`, 'text/csv;charset=utf-8', toCSV(sheetAOA(cur)));
    } else if (act === 'json-out') {
      download(`sao-luu-lab_${ymd()}.json`, 'application/json', JSON.stringify({ ver: DATA.meta.version, source: DATA.meta.source, sheets: ST.sheets, slips: ST.slips }));
    } else if (act === 'json-in') { $('#fileIn').click(); }
    else if (act === 'reset') {
      const cloud = window.Sync && Sync.active && Sync.active();
      if (confirm(cloud ? '⚠ ĐANG BẬT ĐỒNG BỘ ĐÁM MÂY.\n\nKhôi phục dữ liệu gốc sẽ XOÁ toàn bộ chỉnh sửa và PHIẾU XUẤT/NHẬP KHO trên MỌI THIẾT BỊ.\n\nChỉ tiếp tục nếu bạn chắc chắn.' : 'Xoá toàn bộ chỉnh sửa, PHIẾU XUẤT/NHẬP KHO trên máy này và quay về dữ liệu gốc của website?')) {
        localStorage.removeItem(LS('state')); resetToBaseline(); $('#dirty').hidden = true; parseHash(); render(); toast('Đã khôi phục dữ liệu gốc'); if (window.Sync) Sync.schedule(300);
      }
    }
  }
  function importJSON(e) {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (!j || !Array.isArray(j.sheets) || !j.sheets.every(s => s.id && Array.isArray(s.blocks))) throw new Error('sai định dạng');
        if (j.slips && !(Array.isArray(j.slips.xuat || []) && Array.isArray(j.slips.nhap || []))) throw new Error('phiếu kho sai định dạng');
        const np = j.slips ? (j.slips.xuat || []).length + (j.slips.nhap || []).length : 0;
        if (!confirm(`Nạp bản sao lưu (${j.sheets.length} sheet, ${np} phiếu kho)? Dữ liệu chỉnh sửa và phiếu hiện tại trên máy này sẽ bị thay thế.`)) return;
        ST = { sheets: j.sheets, slips: { xuat: (j.slips && j.slips.xuat) || [], nhap: (j.slips && j.slips.nhap) || [] }, dirty: true }; ensureIds(ST.sheets); persist(); parseHash(); render(); toast('Đã nạp bản sao lưu');
      } catch (err) { toast('File không hợp lệ: ' + err.message, 4500); }
    };
    rd.readAsText(f, 'utf-8');
  }

  /* ---------- Khởi động ---------- */
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
    $('#boot').innerHTML = `<form class="lock" id="lockForm"><h2>🔒 ${esc(CFG.title)}</h2><p>Dữ liệu được bảo vệ bằng mật khẩu.</p>
      <input type="password" id="pw" placeholder="Nhập mật khẩu" autocomplete="current-password" autofocus><div class="err" id="pwErr"></div><button>Mở khoá</button></form>`;
    $('#lockForm').addEventListener('submit', async ev => {
      ev.preventDefault(); const err = $('#pwErr'); err.textContent = 'Đang giải mã…';
      try { if (!window.crypto || !crypto.subtle) throw new Error('nocrypto'); start(await decrypt(window.LAB_DATA_ENC, $('#pw').value)); }
      catch (e) { err.textContent = e.message === 'nocrypto' ? 'Trình duyệt cần mở bằng https:// (hoặc localhost) để giải mã.' : 'Sai mật khẩu.'; }
    });
  }
  const flushLocal = () => { if (ST && ST.dirty) { clearTimeout(saveT); writeLocal(); } };
  window.addEventListener('pagehide', flushLocal);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushLocal(); });
  let lastErr = '', lastErrT = 0;
  window.addEventListener('error', e => {
    const m = (e.message || 'lỗi không rõ') + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '');
    if (m === lastErr && Date.now() - lastErrT < 8000) return; lastErr = m; lastErrT = Date.now();
    const t = $('#toast'); if (t) toast('⚠ Lỗi: ' + m + ' – thử tải lại trang (Ctrl+F5).', 7000);
  });
  window.LabApp = {
    BUILD, CFG, esc, saveLocal, resetToBaseline, refresh: () => keepScroll(render),
    get DATA() { return DATA; }, fold, tokensOf, toast, download, toCSV, ymd, uid, sheetById, labelOf, persist, render, keepScroll, isStock, stockRows,
    get ST() { return ST; }, get V() { return V; }, touch: r => hayCache.delete(r)
  };
  function boot() {
    const t = localStorage.getItem(LS('theme')) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    if (window.LAB_DATA) start(window.LAB_DATA);
    else if (window.LAB_DATA_ENC) unlock();
    else $('#boot').innerHTML = '<p>⚠ Không tìm thấy dữ liệu (assets/data.js). Hãy chạy tools/convert.py.</p>';
  }
  boot();
})();
