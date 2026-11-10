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
  const V = { route: { page: 'overview', id: null }, gq: '', edit: false, f: { q: '', chk: 'all', color: 'all' }, collapsed: {} };

  const clone = o => JSON.parse(JSON.stringify(o));
  const sheetById = id => ST.sheets.find(s => s.id === id);
  const labelOf = s => CFG.sheetLabels[s.id] || s.name;
  const liveRows = b => b.rows.filter(r => !r.x);           // dòng còn trong kho (r.x = đã nằm trong phiếu xuất)
  const countRows = s => s.blocks.reduce((n, b) => n + liveRows(b).length, 0);
  const countChecked = s => s.blocks.reduce((n, b) => n + b.rows.filter(r => !r.x && r.c === true).length, 0);
  const newUid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  /** Mỗi dòng vật tư có mã định danh ổn định (u) để phiếu kho tham chiếu */
  function ensureUids() {
    const seen = new Set();
    ST.sheets.forEach(s => s.blocks.forEach((b, bi) => b.rows.forEach(r => {
      let u = r.u;
      if (!u || seen.has(u)) { u = r.r > 0 ? `${s.id}.${bi}.${r.r}` : newUid(); if (seen.has(u)) u = newUid(); r.u = u; }
      seen.add(u);
    })));
  }
  const mkVouchers = v => (v && Array.isArray(v.out) && Array.isArray(v['in'])) ? v : { out: [], 'in': [], seqOut: 0, seqIn: 0 };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS('state')) || 'null');
      if (saved && Array.isArray(saved.sheets)) {
        if (saved.ver === DATA.meta.version) return { sheets: saved.sheets, vouchers: mkVouchers(saved.vouchers), dirty: true };
        const useNew = confirm('Dữ liệu gốc trên website vừa được cập nhật.\n\nOK  = dùng dữ liệu MỚI (xoá chỉnh sửa & phiếu kho cũ trên máy này – hãy Sao lưu JSON trước nếu cần)\nHủy = giữ chỉnh sửa và phiếu kho cũ của tôi');
        if (useNew) localStorage.removeItem(LS('state'));
        else return { sheets: saved.sheets, vouchers: mkVouchers(saved.vouchers), dirty: true };
      }
    } catch (e) { /* bỏ qua */ }
    return { sheets: clone(DATA.sheets), vouchers: mkVouchers(), dirty: false };
  }
  let saveT;
  function persist() {
    ST.dirty = true; $('#dirty').hidden = false;
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(LS('state'), JSON.stringify({ ver: DATA.meta.version, sheets: ST.sheets, vouchers: ST.vouchers })); }
      catch (e) { toast('⚠ Không lưu được vào trình duyệt (bộ nhớ đầy hoặc bị chặn). Hãy dùng Sao lưu JSON.', 5000); }
    }, 250);
  }

  /* ---------- Định tuyến (hash) ---------- */
  function parseHash() {
    const m = location.hash.match(/^#\/s\/([\w-]+)/);
    if (location.hash === '#/xuat') V.route = { page: 'out', id: null };
    else if (location.hash === '#/nhap') V.route = { page: 'in', id: null };
    else V.route = m && sheetById(m[1]) ? { page: 'sheet', id: m[1] } : { page: 'overview', id: null };
  }
  function go(hash) { if (location.hash === hash) { render(); } else location.hash = hash; }

  /* ---------- Thanh bên ---------- */
  function renderSidebar() {
    const groups = [[], []];
    ST.sheets.forEach(s => groups[s.group === 1 ? 1 : 0].push(s));
    let h = `<a class="nav-item ${V.route.page === 'overview' && !V.gq ? 'active' : ''}" href="#/"><span class="nm">🏠 Tổng quan</span></a>`;
    if (window.KHO) h += KHO.sidebarHTML(V.gq ? '' : V.route.page);
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
      b.rows.forEach(r => {
        if (r.x) return;
        const v = fold(r.v[k] || '').trim(); if (!v) return;
        if (v.startsWith('hong')) c['hỏng']++; else if (v.startsWith('tot')) c['tốt']++; else if (v.startsWith('loi')) c['lỗi']++; else c['khác']++;
      });
    }));
    return c;
  }
  function colorCounts() {
    const m = {};
    ST.sheets.forEach(s => s.blocks.forEach(b => b.rows.forEach(r => {
      if (r.f && !r.x) new Set(Object.values(r.f)).forEach(h => { m[h] = (m[h] || 0) + 1; });
    })));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  function viewOverview() {
    let blocks = 0, rows = 0, chk = 0, q2 = 0;
    ST.sheets.forEach(s => s.blocks.forEach(b => { blocks++; b.rows.forEach(r => { if (r.x) return; rows++; if (r.c === true) chk++; if (hay(r).includes('??')) q2++; }); }));
    const st = statusCounts(), cc = colorCounts();
    const pct = rows ? Math.round(chk * 100 / rows) : 0;
    let h = `<div class="page-title"><h1>Tổng quan</h1><span class="sub">Nguồn: ${esc(DATA.meta.source)} · cập nhật ${esc(DATA.meta.generated)}</span></div>
    <div class="kpis">
      <div class="kpi"><div class="n">${ST.sheets.length}</div><div class="l">Sheet / hệ thống</div></div>
      <div class="kpi"><div class="n">${blocks}</div><div class="l">Khối thiết bị</div></div>
      <div class="kpi"><div class="n">${rows.toLocaleString('vi-VN')}</div><div class="l">Dòng vật tư</div></div>
      <div class="kpi ok"><div class="n">${chk.toLocaleString('vi-VN')}</div><div class="l">${esc(CFG.checkLabel)} (${pct}%)</div></div>
      <div class="kpi warn"><div class="n">${(rows - chk).toLocaleString('vi-VN')}</div><div class="l">Chưa tích “${esc(CFG.checkLabel)}”</div></div>
      <button class="kpi bad" data-q="??" title="Bấm để xem danh sách"><div class="n">${q2}</div><div class="l">Dòng ghi “??” (cần xác minh)</div></button>
      ${window.KHO ? KHO.kpiHTML() : ''}
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
    if (row.x) return false;
    if (f.chk === 'yes' && row.c !== true) return false;
    if (f.chk === 'no' && row.c === true) return false;
    if (f.color !== 'all' && !(row.f && Object.values(row.f).includes(f.color))) return false;
    if (tokens.length) { const h = hay(row); for (const t of tokens) if (!h.includes(t)) return false; }
    return true;
  }
  const colClass = label => { const f = fold(label); return /^stt$/.test(f.trim()) ? 'c-stt' : (/serial|s\/n|part|pasnumber|ma card|^ma$|ma vt|ma vat tu/.test(f) ? 'c-mono' : ''); };

  function rowHTML(s, bi, b, ri, row, tokens) {
    let h = `<tr data-s="${s.id}" data-b="${bi}" data-r="${ri}" class="${row.c === true ? 'is-checked' : ''}" ${row.r ? `title="Dòng ${row.r} trong file Excel gốc"` : ''}>
      <td class="c-chk"><input type="checkbox" class="chk" ${row.c === true ? 'checked' : ''} ${V.edit ? '' : 'disabled'} aria-label="${esc(CFG.checkLabel)}"></td>`;
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
    const b = s.blocks[bi], key = s.id + ':' + bi;
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
        <span class="badge" data-badge>${filtered ? shown + ' / ' : ''}${liveRows(b).length} dòng · ✓ ${filtered ? chk : liveRows(b).filter(r => r.c === true).length}</span>
        <span class="sp"></span>${V.edit ? '<button class="add-row" data-add>＋ Thêm dòng</button>' : ''}</div>
      ${rows ? `<div class="tbl-wrap"><table class="data"><thead><tr><th class="c-chk">${esc(CFG.checkLabel)}</th>${head}${V.edit ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`
             : '<div class="empty">Không có dòng nào khớp bộ lọc.</div>'}
    </section>`;
  }

  function viewSheet(s) {
    const colors = new Set();
    s.blocks.forEach(b => b.rows.forEach(r => r.f && Object.values(r.f).forEach(x => colors.add(x))));
    let h = `<div class="page-title"><h2>${esc(labelOf(s))}</h2>
      <span class="sub">${s.blocks.length} khối · ${countRows(s)} dòng · ✓ ${countChecked(s)} ${esc(CFG.checkLabel.toLowerCase())}</span></div>
    <div class="toolbar no-print">
      <input type="search" id="fq" placeholder="Lọc trong sheet này…" value="${esc(V.f.q)}" autocomplete="off">
      <select id="fchk" title="Lọc theo ô tích">
        <option value="all">Tất cả dòng</option><option value="yes" ${V.f.chk === 'yes' ? 'selected' : ''}>Chỉ dòng đã tích ✓</option>
        <option value="no" ${V.f.chk === 'no' ? 'selected' : ''}>Chỉ dòng chưa tích</option></select>
      ${colors.size ? `<select id="fcolor" title="Lọc theo màu tô trong Excel"><option value="all">Mọi màu</option>${[...colors].map(c => `<option value="${c}" ${V.f.color === c ? 'selected' : ''}>● ${esc(colorLabel(c))}</option>`).join('')}</select>` : ''}
      <button class="tbtn" data-all="collapse">Thu gọn tất cả</button><button class="tbtn" data-all="expand">Mở rộng tất cả</button>
      <span class="count" id="fcount"></span></div>`;
    if (s.blocks.length > 1) h += '<div class="jump no-print">' + s.blocks.map((b, i) => `<button class="chip" data-jump="blk-${s.id}-${i}">${esc(b.title)} <span class="src">${liveRows(b).length}</span></button>`).join('') + '</div>';
    return h + '<div id="blocks"></div>';
  }
  function renderBlocks() {
    const s = sheetById(V.route.id), tokens = tokensOf(V.f.q);
    let html = '', shown = 0, total = 0;
    s.blocks.forEach((b, i) => { total += liveRows(b).length; shown += b.rows.filter(r => passRow(r, tokens, V.f)).length; html += blockHTML(s, i, tokens, V.f, null); });
    $('#blocks').innerHTML = html || '<div class="card"><div class="empty">Không có dòng nào khớp bộ lọc.</div></div>';
    $('#fcount').textContent = shown === total ? `${total} dòng` : `Hiển thị ${shown} / ${total} dòng`;
  }

  /* ---------- Tìm kiếm toàn bộ ---------- */
  function viewSearch() {
    const tokens = tokensOf(V.gq), budget = { left: CFG.maxSearchResults };
    let found = 0, html = '', sheetsHit = 0;
    const f = { q: '', chk: 'all', color: 'all' };
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
      (found ? html : '<div class="card"><div class="empty">Không tìm thấy trong danh mục. Thử từ khoá ngắn hơn (không cần gõ dấu).</div></div>') +
      (window.KHO ? KHO.searchHTML(tokens) : '');
  }

  /* ---------- Vẽ trang ---------- */
  function render() {
    renderSidebar();
    const m = $('#main');
    if (V.gq.trim()) m.innerHTML = viewSearch();
    else if (V.route.page === 'sheet') { m.innerHTML = viewSheet(sheetById(V.route.id)); renderBlocks(); }
    else if ((V.route.page === 'out' || V.route.page === 'in') && window.KHO) m.innerHTML = KHO.viewList(V.route.page);
    else m.innerHTML = viewOverview();
    document.title = (V.route.page === 'out' && !V.gq ? 'Phiếu xuất kho – ' : V.route.page === 'in' && !V.gq ? 'Phiếu nhập kho – ' : '') + (V.route.page === 'sheet' && !V.gq ? labelOf(sheetById(V.route.id)) + ' – ' : '') + CFG.title;
  }
  const keepScroll = fn => { const y = window.scrollY; fn(); window.scrollTo(0, y); };

  /* ---------- Sự kiện ---------- */
  function locate(el) {
    const tr = el.closest('tr[data-s]'); if (!tr) return null;
    const s = sheetById(tr.dataset.s), b = s.blocks[+tr.dataset.b], row = b.rows[+tr.dataset.r];
    return { tr, s, b, row, bi: +tr.dataset.b, ri: +tr.dataset.r };
  }
  function refreshBadges() {
    $$('.block').forEach(el => {
      const s = sheetById(el.dataset.s), b = s.blocks[+el.dataset.b], bd = $('[data-badge]', el);
      if (bd && !bd.textContent.includes('/')) bd.textContent = `${liveRows(b).length} dòng · ✓ ${liveRows(b).filter(r => r.c === true).length}`;
    });
  }

  function bind() {
    const main = $('#main');

    main.addEventListener('click', e => {
      const t = e.target;
      const q = t.closest('[data-q]'); if (q) { setGlobalSearch(q.dataset.q); return; }
      const g = t.closest('[data-go]'); if (g && !t.closest('a')) { location.hash = g.dataset.go; return; }
      if (t.closest('[data-clear]')) { setGlobalSearch(''); }
      const jp = t.closest('[data-jump]'); if (jp) { const el = document.getElementById(jp.dataset.jump); if (el) { el.classList.remove('collapsed'); delete V.collapsed[el.dataset.key]; el.scrollIntoView({ behavior: 'smooth' }); } return; }
      const all = t.closest('[data-all]'); if (all) { const s = sheetById(V.route.id); s.blocks.forEach((b, i) => { V.collapsed[s.id + ':' + i] = all.dataset.all === 'collapse'; }); renderBlocks(); return; }
      const add = t.closest('[data-add]');
      if (add) {
        e.stopPropagation();
        const sec = add.closest('.block'), s = sheetById(sec.dataset.s), b = s.blocks[+sec.dataset.b];
        b.rows.push({ r: 0, c: false, u: newUid(), v: b.cols.map(() => '') }); persist();
        if (!V.gq && (V.f.q || V.f.chk !== 'all' || V.f.color !== 'all')) { V.f = { q: '', chk: 'all', color: 'all' }; render(); } else keepScroll(() => (V.gq ? render() : renderBlocks()));
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
    });
    let ft; main.addEventListener('input', e => {
      if (e.target.id === 'fq') { clearTimeout(ft); ft = setTimeout(() => { V.f.q = e.target.value; renderBlocks(); }, 150); }
    });

    // Lưu ô đang sửa khi rời khỏi ô
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

    // Tìm kiếm toàn cục
    let gt; $('#gq').addEventListener('input', e => { clearTimeout(gt); gt = setTimeout(() => setGlobalSearch(e.target.value, true), 180); });
    $('#gqClear').addEventListener('click', () => setGlobalSearch(''));
    document.addEventListener('keydown', e => {
      const typing = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === '/' && !typing) { e.preventDefault(); $('#gq').focus(); }
      if (e.key === 'Escape' && e.target.id === 'gq') setGlobalSearch('');
    });

    // Menu & nút
    $('#btnMenu').addEventListener('click', () => toggleSidebar());
    $('#overlay').addEventListener('click', () => toggleSidebar(false));
    $('#sidebar').addEventListener('click', e => { if (e.target.closest('a')) { if (V.gq) setGlobalSearch(''); toggleSidebar(false); } });
    $('#btnEdit').addEventListener('click', () => { if (V.edit || !window.KHO) setEdit(!V.edit); else KHO.requireAdmin(() => setEdit(true), true); });
    $('#btnPrint').addEventListener('click', () => window.print());
    $('#btnTheme').addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem(LS('theme'), t); });
    $('#menuExport').addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b) { $('#menuExport').open = false; doAction(b.dataset.act); } });
    document.addEventListener('click', e => { const m = $('#menuExport'); if (m.open && !m.contains(e.target)) m.open = false; });
    $('#fileIn').addEventListener('change', importJSON);
    window.addEventListener('hashchange', () => { parseHash(); V.f = { q: '', chk: 'all', color: 'all' }; if (V.gq) setGlobalSearch(''); else render(); window.scrollTo(0, 0); });
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
    s.blocks.forEach((b, i) => { if (i) aoa.push([]); aoa.push([b.title]); aoa.push([CFG.checkLabel, ...b.cols]); b.rows.filter(r => !r.x).forEach(r => aoa.push([r.c === true ? '✓' : '', ...r.v])); });
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
      XLSX.writeFile(wb, `Tai-san-Vat-tu-LAB_${act === 'xlsx-all' ? 'tat-ca' : list[0].id}_${ymd()}.xlsx`);
    } else if (act === 'csv-cur') {
      if (!cur) { toast('Hãy mở một sheet trước khi xuất CSV.'); return; }
      download(`${cur.id}_${ymd()}.csv`, 'text/csv;charset=utf-8', toCSV(sheetAOA(cur)));
    } else if (act === 'json-out') {
      download(`sao-luu-lab_${ymd()}.json`, 'application/json', JSON.stringify({ ver: DATA.meta.version, source: DATA.meta.source, sheets: ST.sheets, vouchers: ST.vouchers }));
    } else if (act === 'json-in') { $('#fileIn').click(); }
    else if (act === 'reset') {
      if (confirm('Xoá toàn bộ chỉnh sửa VÀ các phiếu xuất/nhập kho trên máy này, quay về dữ liệu gốc của website?')) {
        localStorage.removeItem(LS('state')); ST = { sheets: clone(DATA.sheets), vouchers: mkVouchers(), dirty: false }; ensureUids(); $('#dirty').hidden = true; render(); toast('Đã khôi phục dữ liệu gốc');
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
        const nv = mkVouchers(j.vouchers);
        if (!confirm(`Nạp bản sao lưu (${j.sheets.length} sheet, ${nv.out.length} phiếu xuất, ${nv['in'].length} phiếu nhập)? Dữ liệu & phiếu hiện tại trên máy này sẽ bị thay thế.`)) return;
        ST = { sheets: j.sheets, vouchers: mkVouchers(j.vouchers), dirty: true }; ensureUids(); persist(); parseHash(); render(); toast('Đã nạp bản sao lưu');
      } catch (err) { toast('File không hợp lệ: ' + err.message, 4500); }
    };
    rd.readAsText(f, 'utf-8');
  }

  /* ---------- Khởi động (có hỗ trợ dữ liệu mã hoá bằng mật khẩu) ---------- */
  function start(data) {
    DATA = data; ST = loadState(); ensureUids();
    $('#boot').remove(); $('#topbar').hidden = false; $('#layout').hidden = false;
    $('#appTitle').textContent = CFG.title; $('#appSub').textContent = CFG.subtitle;
    $('#dirty').hidden = !ST.dirty;
    if (window.KHO) KHO.init({
      CFG, getST: () => ST, persist, render, toast, fold, tokensOf, hay, sheetById, labelOf, esc, download, toCSV,
      isEditing: () => V.edit, setEdit
    });
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
  function boot() {
    const t = localStorage.getItem(LS('theme')) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    if (window.LAB_DATA) start(window.LAB_DATA);
    else if (window.LAB_DATA_ENC) unlock();
    else $('#boot').innerHTML = '<p>⚠ Không tìm thấy dữ liệu (assets/data.js). Hãy chạy tools/convert.py.</p>';
  }
  boot();
})();
