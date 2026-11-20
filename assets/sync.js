/* =====================================================================
   sync.js – ĐỒNG BỘ DỮ LIỆU ĐA THIẾT BỊ & PHÂN QUYỀN (Admin vs Guest)
   Phiên bản: 2026.11.20-1 (Tương thích với app.js & config.js mới)
   ===================================================================== */
(function () {
  'use strict';

  var BUILD = '2026.11.20-1';
  var SOURCE_OPTIONS = ['Vật tư', 'Tài sản', 'Đo kiểm', 'Sửa chữa', 'Không rõ nguồn'];
  var DEFAULT_SOURCE = 'Không rõ nguồn';
  var STANDARD_COLS = ['Nguồn', 'STT', 'Tên Vật Tư', 'Serial', 'Mã VT', 'Part number', 'Ghi chú'];

  var A = null, CS = null, ad = null;
  var S = {
    st: 'off', user: null, M: null, since: null, inited: false, baseline: null,
    subscribed: false, pushing: false, retry: 0, lastOk: 0, err: '',
    pending: 0, conflicts: 0, ready: { rows: false, blocks: false },
    remoteSeen: 0, applyT: null, pushT: null, retryT: null, reconciling: false, loginShown: false
  };
  var COLS = ['rows', 'blocks'];

  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) { return A ? A.esc(s == null ? '' : s) : String(s == null ? '' : s); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function normSrc(val, fallback) {
    if (A && typeof A.normalizeSource === 'function') return A.normalizeSource(val, fallback || DEFAULT_SOURCE);
    var def = fallback || DEFAULT_SOURCE;
    if (!val) return def;
    var raw = String(val).trim();
    var hit = SOURCE_OPTIONS.filter(function (x) { return x.toLowerCase() === raw.toLowerCase(); })[0];
    return hit || def;
  }

  function normVec(v, fallbackSrc) {
    var src = normSrc(fallbackSrc || (Array.isArray(v) ? v[0] : ''), DEFAULT_SOURCE);
    var arr = Array.isArray(v) ? v.slice() : [];
    var hasSrcFirst = arr.length >= 7 && SOURCE_OPTIONS.some(function (opt) {
      return opt.toLowerCase() === String(arr[0] || '').trim().toLowerCase();
    });
    if (hasSrcFirst) {
      return [
        src,
        String(arr[1] != null && arr[1] !== '' ? arr[1] : '1'),
        String(arr[2] || ''),
        String(arr[3] || ''),
        String(arr[4] || ''),
        String(arr[5] || ''),
        String(arr[6] || '')
      ];
    }
    return [
      src,
      String(arr[0] != null && arr[0] !== '' ? arr[0] : '1'),
      String(arr[2] || ''),
      String(arr[3] || ''),
      String(arr[1] || ''),
      String(arr[4] || ''),
      String(arr[5] || '')
    ];
  }

  /* ---------- Băm & Chữ ký dữ liệu ---------- */
  function stable(v) {
    if (v === undefined || v === null) return 'null';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
  }
  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, ch;
    for (i = 0; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function nz(o) { return o && Object.keys(o).length ? o : null; }
  function rowSig(r) {
    var src = normSrc(r.src || (r.v && r.v[0]), DEFAULT_SOURCE);
    var vec = normVec(r.v, src);
    return hash(stable([
      src,
      vec,
      nz(r.f),
      (r.p && r.p.length) ? r.p : null,
      nz(r.s)
    ]));
  }
  function blockSig(b) {
    return hash(stable([STANDARD_COLS]));
  }
  function enc(key) { return encodeURIComponent(key); }

  /* ---------- Trạng thái & Meta lưu trên máy ---------- */
  function ws() { return (CS && CS.workspace) || 'lab-xvt'; }
  function metaKey() { return A.CFG.storageKey + ':sync:' + ws(); }
  function loadMeta() {
    try {
      var m = JSON.parse(localStorage.getItem(metaKey()) || 'null');
      if (m && m.ver === A.DATA.meta.version) return m;
    } catch (e) { }
    return null;
  }
  function saveMeta() {
    try {
      localStorage.setItem(metaKey(), JSON.stringify({
        ver: A.DATA.meta.version,
        since: S.since,
        M: S.M,
        inited: S.inited
      }));
    } catch (e) { }
  }
  function enabled() {
    var c = (A && A.CFG && A.CFG.sync) || {};
    return !!((c.provider === 'firebase' && c.firebase && c.firebase.projectId) ||
              (c.provider === 'server' && c.server && c.server.url));
  }
  function deviceId() {
    var k = A.CFG.storageKey + ':device', v = null;
    try {
      v = localStorage.getItem(k);
      if (!v) {
        v = 'd' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(k, v);
      }
    } catch (e) { v = 'dx'; }
    return v;
  }

  /* ---------- Dữ liệu gốc (Baseline) ---------- */
  function buildBaseline() {
    var rows = new Map(), blocks = new Set();
    (A.DATA.sheets || []).forEach(function (s) {
      (s.blocks || []).forEach(function (b, bi) {
        blocks.add(s.id + '|' + b.title);
        (b.rows || []).forEach(function (r) {
          rows.set(s.id + ':' + bi + ':' + r.r, { sid: s.id, bt: b.title, sig: rowSig(r) });
        });
      });
    });
    return { rows: rows, blocks: blocks };
  }
  function localRows() {
    var m = new Map();
    (A.ST.sheets || []).forEach(function (s) {
      (s.blocks || []).forEach(function (b, bi) {
        (b.rows || []).forEach(function (r) {
          if (r.i) m.set(r.i, { s: s, b: b, bi: bi, row: r });
        });
      });
    });
    return m;
  }

  /* ---------- Tính toán thay đổi ---------- */
  function rowData(e) {
    var r = e.row;
    var src = normSrc(r.src || (r.v && r.v[0]), DEFAULT_SOURCE);
    var vec = normVec(r.v, src);
    return {
      rid: r.i,
      sid: e.s.id,
      bt: e.b.title,
      r: r.r || 0,
      ct: r.ct || 0,
      src: src,
      v: vec,
      f: nz(r.f),
      p: (r.p && r.p.length) ? r.p.slice() : null,
      s: nz(r.s),
      del: false
    };
  }
  function computeOps() {
    if (!S.baseline || !S.M) return [];
    var ops = [], base = S.baseline, lr = localRows(), M = S.M;
    lr.forEach(function (e, rid) {
      var sig = rowSig(e.row), last = M.rows[rid];
      var need = last !== undefined ? last !== sig : (!base.rows.has(rid) || base.rows.get(rid).sig !== sig);
      if (need) ops.push({ col: 'rows', key: rid, sig: sig, data: rowData(e) });
    });
    base.rows.forEach(function (b, rid) {
      if (!lr.has(rid) && M.rows[rid] !== 'DEL') {
        ops.push({ col: 'rows', key: rid, sig: 'DEL', data: { rid: rid, sid: b.sid, bt: b.bt, del: true } });
      }
    });
    Object.keys(M.rows).forEach(function (rid) {
      if (!lr.has(rid) && !base.rows.has(rid) && M.rows[rid] !== 'DEL') {
        ops.push({ col: 'rows', key: rid, sig: 'DEL', data: { rid: rid, sid: '', bt: '', del: true } });
      }
    });
    (A.ST.sheets || []).forEach(function (s) {
      (s.blocks || []).forEach(function (b) {
        var key = s.id + '|' + b.title;
        if (base.blocks.has(key)) return;
        var sig = blockSig(b);
        if (M.blocks[key] !== sig) {
          ops.push({
            col: 'blocks',
            key: key,
            sig: sig,
            data: { sid: s.id, title: b.title, cols: STANDARD_COLS.slice(), ord: b.ord || 0, del: false }
          });
        }
      });
    });
    return ops;
  }

  /* ---------- Phân quyền giao diện ---------- */
  function applyRoleUI() {
    var currentRole = localStorage.getItem('lab_user_role');
    var isGuest = currentRole === 'guest';
    var btnEdit = $('#btnEdit');
    if (btnEdit) btnEdit.style.display = isGuest ? 'none' : '';
    if (isGuest) {
      document.querySelectorAll('#main button, #main .tbtn').forEach(function (el) {
        var text = (el.textContent || '').toLowerCase();
        var idClass = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();
        if (text.includes('thêm') || text.includes('xoá') || text.includes('chuyển') || idClass.includes('admin')) {
          if (!text.includes('xem')) {
            el.style.opacity = '0.35';
            el.style.pointerEvents = 'none';
            el.title = 'Tài khoản Khách chỉ có quyền xem.';
          }
        }
      });
    }
  }

  function setState(st) {
    S.st = st;
    var b = $('#btnSync');
    if (b) {
      var map = {
        off: ['☁', 'Chỉ trên máy', 'off'],
        login: ['🔒', 'Đăng nhập', 'login'],
        syncing: ['🔄', 'Đang đồng bộ…', 'syncing'],
        ok: ['☁✓', 'Đã đồng bộ', 'ok'],
        offline: ['⚠', 'Chờ mạng', 'bad'],
        error: ['⚠', 'Lỗi đồng bộ', 'bad'],
        loading: ['🔄', 'Đang kết nối…', 'syncing']
      };
      var m = map[st] || map.off;
      var n = S.pending > 0 && (st === 'offline' || st === 'error') ? ' (' + S.pending + ')' : '';
      b.className = 'btn ghost sync-' + m[2];
      b.innerHTML = '<i>' + m[0] + '</i> <span>' + m[1] + n + '</span>';
      b.title = 'Đồng bộ: ' + m[1] + (S.lastOk ? ' – lần cuối ' + new Date(S.lastOk).toLocaleTimeString('vi-VN') : '') + (S.err ? '\n' + S.err : '');
    }
    var p = $('#syncPanel');
    if (p) renderPanel();
    applyRoleUI();
  }

  /* ---------- Đồng bộ lên ---------- */
  function schedule(delay) {
    if (!A || !ad || !S.user || !S.subscribed || (!S.inited && !S.reconciling)) {
      if (ad && S.user && !S.inited) setState(S.st);
      return;
    }
    clearTimeout(S.pushT);
    S.pushT = setTimeout(push, delay == null ? 900 : delay);
  }

  function push() {
    if (localStorage.getItem('lab_user_role') === 'guest') return Promise.resolve();
    if (S.pushing || !ad || !S.user || !S.subscribed || !S.inited) return Promise.resolve();

    var ops = computeOps();
    S.pending = ops.length;
    if (!ops.length) {
      if (S.st !== 'loading') setState('ok');
      return Promise.resolve();
    }

    S.pushing = true;
    setState('syncing');
    var chunks = [];
    for (var i = 0; i < ops.length; i += 250) chunks.push(ops.slice(i, i + 250));

    return chunks.reduce(function (p, ch) {
      return p.then(function () {
        return ad.commit(ch.map(function (o) {
          return { col: o.col, id: enc(o.key), data: o.data };
        })).then(function () {
          ch.forEach(function (o) { S.M[o.col][o.key] = o.sig; });
          saveMeta();
        });
      });
    }, Promise.resolve()).then(function () {
      S.pushing = false;
      S.retry = 0;
      S.lastOk = Date.now();
      S.err = '';
      S.pending = 0;
      A.ST.dirty = false;
      var dirtyEl = $('#dirty');
      if (dirtyEl) dirtyEl.hidden = true;
      A.saveLocal();
      setState('ok');
      if (computeOps().length) schedule(300);
    }).catch(function (e) {
      S.pushing = false;
      S.err = ad.errText ? ad.errText(e) : String((e && e.message) || e);
      S.pending = ops.length;
      setState(navigator.onLine === false ? 'offline' : 'error');
      retryLater();
    });
  }

  function pushNow() {
    return push();
  }

  function active() {
    return !!(ad && S.user && S.subscribed && S.inited);
  }

  function retryLater() {
    clearTimeout(S.retryT);
    S.retry++;
    var wait = Math.min(60000, 3000 * Math.pow(2, Math.min(S.retry, 4)));
    S.retryT = setTimeout(function () { push(); }, wait);
  }

  /* ---------- Nhận dữ liệu về ---------- */
  function ensureBlock(sid, title) {
    var s = A.sheetById(sid);
    if (!s) return null;
    for (var i = 0; i < s.blocks.length; i++) {
      if (s.blocks[i].title === title) {
        s.blocks[i].cols = STANDARD_COLS.slice();
        return s.blocks[i];
      }
    }
    var b = { title: title, hr: 0, cols: STANDARD_COLS.slice(), rows: [], ord: 0 };
    s.blocks.push(b);
    return b;
  }
  function sortRuntimeBlocks(s) {
    var base = S.baseline.blocks, keep = [], rt = [];
    s.blocks.forEach(function (b) { (base.has(s.id + '|' + b.title) ? keep : rt).push(b); });
    rt.sort(function (a, b) { return (a.ord || 0) - (b.ord || 0) || (a.title < b.title ? -1 : 1); });
    s.blocks.length = 0;
    keep.concat(rt).forEach(function (b) { s.blocks.push(b); });
  }
  function placeNew(b, row) {
    var k = b.rows.length;
    while (k > 0 && b.rows[k - 1].ct && row.ct && b.rows[k - 1].ct > row.ct) k--;
    b.rows.splice(k, 0, row);
  }
  function applyRow(d) {
    var data = d.data, rid = data.rid;
    if (!rid) return false;
    var rs = data.del ? 'DEL' : rowSig(data);
    var idx = localRows(), cur = idx.get(rid);
    var ls = cur ? rowSig(cur.row) : 'DEL';
    var last = S.M.rows[rid], base = S.baseline.rows.get(rid);
    var dirty = last !== undefined ? last !== ls : (base ? base.sig !== ls : ls !== 'DEL');

    if (rs === ls) { S.M.rows[rid] = rs; return false; }
    if (dirty && S.inited && S.pushing) { S.conflicts++; return false; }

    if (rs === 'DEL') {
      if (cur) {
        var k = cur.b.rows.indexOf(cur.row);
        if (k >= 0) cur.b.rows.splice(k, 1);
      }
      S.M.rows[rid] = 'DEL';
      return true;
    }

    var src = normSrc(data.src || (data.v && data.v[0]), DEFAULT_SOURCE);
    var vec = normVec(data.
