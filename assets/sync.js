/* =====================================================================
   assets/sync.js – ĐỒNG BỘ DỮ LIỆU ĐA THIẾT BỊ & PHÂN QUYỀN (Admin vs Guest)
   Phiên bản: 2026.11.21-5
   ===================================================================== */
(function () {
  'use strict';

  var BUILD = '2026.11.21-5';
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
  function esc(s) {
    return A && typeof A.esc === 'function'
      ? A.esc(s == null ? '' : s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
  }
  function clone(o) {
    try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; }
  }

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
    var src = normSrc(r && (r.src || (r.v && r.v[0])), DEFAULT_SOURCE);
    var vec = normVec(r && r.v, src);
    return hash(stable([
      src,
      vec,
      nz(r && r.f),
      (r && r.p && r.p.length) ? r.p : null,
      nz(r && r.s)
    ]));
  }

  function blockSig() {
    return hash(stable([STANDARD_COLS]));
  }

  function enc(key) { return encodeURIComponent(key); }

  function ws() { return (CS && CS.workspace) || 'lab-xvt'; }
  function metaKey() { return ((A && A.CFG && A.CFG.storageKey) || 'lab-xvt-v1') + ':sync:' + ws(); }

  function loadMeta() {
    try {
      var m = JSON.parse(localStorage.getItem(metaKey()) || 'null');
      var ver = (A && A.DATA && A.DATA.meta && A.DATA.meta.version) || '';
      if (m && m.ver === ver) return m;
    } catch (e) { }
    return null;
  }

  function saveMeta() {
    try {
      localStorage.setItem(metaKey(), JSON.stringify({
        ver: (A && A.DATA && A.DATA.meta && A.DATA.meta.version) || '',
        since: S.since,
        M: S.M,
        inited: S.inited
      }));
    } catch (e) { }
  }

  function enabled() {
    var c = (A && A.CFG && A.CFG.sync) || {};
    if (c.provider === 'off') return false;
    return !!((c.provider === 'firebase' && c.firebase && c.firebase.projectId) ||
              (c.provider === 'server' && c.server && c.server.url));
  }

  function deviceId() {
    var k = ((A && A.CFG && A.CFG.storageKey) || 'lab-xvt-v1') + ':device', v = null;
    try {
      v = localStorage.getItem(k);
      if (!v) {
        v = 'd' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(k, v);
      }
    } catch (e) { v = 'dx'; }
    return v;
  }

  function buildBaseline() {
    var rows = new Map(), blocks = new Set();
    var sheets = (A && A.DATA && A.DATA.sheets) || [];
    sheets.forEach(function (s) {
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
    var sheets = (A && A.ST && A.ST.sheets) || [];
    sheets.forEach(function (s) {
      (s.blocks || []).forEach(function (b, bi) {
        (b.rows || []).forEach(function (r) {
          if (r.i) m.set(r.i, { s: s, b: b, bi: bi, row: r });
        });
      });
    });
    return m;
  }

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
    if (!S.baseline || !S.M || !A || !A.ST) return [];
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
      if (A && A.ST) {
        A.ST.dirty = false;
        var dirtyEl = $('#dirty');
        if (dirtyEl) dirtyEl.hidden = true;
        if (A.saveLocal) A.saveLocal();
      }
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

  function pushNow() { return push(); }
  function active() { return !!(ad && S.user && S.subscribed && S.inited); }

  function retryLater() {
    clearTimeout(S.retryT);
    S.retry++;
    var wait = Math.min(60000, 3000 * Math.pow(2, Math.min(S.retry, 4)));
    S.retryT = setTimeout(function () { push(); }, wait);
  }

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
    var vec = normVec(data.v, src);

    if (cur) {
      var r = cur.row;
      r.src = src;
      r.v = vec;
      delete r.c; delete r.x; delete r.n;
      ['f', 's'].forEach(function (k) { if (nz(data[k])) r[k] = clone(data[k]); else delete r[k]; });
      if (data.p && data.p.length) r.p = data.p.slice(); else delete r.p;
      if (A.touch) A.touch(r);
    } else {
      var b = ensureBlock(data.sid, data.bt);
      if (!b) return false;
      var row = {
        r: data.r || 0,
        i: rid,
        ct: data.ct || 0,
        src: src,
        v: vec
      };
      if (nz(data.f)) row.f = clone(data.f);
      if (nz(data.s)) row.s = clone(data.s);
      if (data.p && data.p.length) row.p = data.p.slice();
      placeNew(b, row);
    }
    S.M.rows[rid] = rs;
    return true;
  }

  function applyBlock(d) {
    var data = d.data;
    if (data.del || !data.sid) return false;
    var s = A.sheetById(data.sid);
    if (!s) return false;
    var key = data.sid + '|' + data.title, b = null, i;
    for (i = 0; i < s.blocks.length; i++) if (s.blocks[i].title === data.title) b = s.blocks[i];
    var changed = false;
    if (!b) {
      b = { title: data.title, hr: 0, cols: STANDARD_COLS.slice(), rows: [], ord: data.ord || 0 };
      s.blocks.push(b);
      changed = true;
    } else if (blockSig(b) !== blockSig(data) || (data.ord && b.ord !== data.ord)) {
      b.cols = STANDARD_COLS.slice();
      b.ord = data.ord || b.ord;
      changed = true;
    }
    sortRuntimeBlocks(s);
    S.M.blocks[key] = blockSig(data);
    return changed;
  }

  function onDocs(col, docs) {
    if (COLS.indexOf(col) < 0) return;
    var changed = 0, maxUpd = S.since[col] || 0;
    docs.sort(function (a, b) { return (a.upd || 0) - (b.upd || 0); });
    docs.forEach(function (d) {
      S.remoteSeen++;
      if (d.upd && d.upd > maxUpd) maxUpd = d.upd;
      var ok = col === 'rows' ? applyRow(d) : applyBlock(d);
      if (ok) changed++;
    });
    if (maxUpd > 0) S.since[col] = Math.max(0, maxUpd - 1);
    saveMeta();

    if (changed) {
      S.changed = (S.changed || 0) + changed;
      if (A && A.saveLocal) A.saveLocal();
      safeRender();
      if (S.inited && A && A.toast) {
        A.toast('☁ Đã đồng bộ ' + changed + ' thay đổi từ thiết bị khác', 2500);
      }
    }
    if (!S.ready[col]) {
      S.ready[col] = true;
      maybeReconcile();
    }
    if (S.inited && !S.pushing && computeOps().length) {
      schedule(500);
    }
  }

  function safeRender() {
    clearTimeout(S.applyT);
    S.applyT = setTimeout(function tryRender() {
      var ae = document.activeElement;
      if (ae && ae.closest && ae.closest('#main') && (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) {
        S.applyT = setTimeout(tryRender, 1500);
        return;
      }
      if (A && typeof A.refresh === 'function') A.refresh();
      applyRoleUI();
    }, 200);
  }

  function maybeReconcile() {
    if (S.inited || S.reconciling || !(S.ready.rows && S.ready.blocks)) return;
    S.reconciling = true;
    var ops = computeOps(), hasRemote = S.remoteSeen > 0;
    if (ops.length && hasRemote && localStorage.getItem('lab_user_role') !== 'guest') {
      var merge = confirm(
        'Thiết bị này đang có ' + ops.length + ' thay đổi chưa đồng bộ, trong khi đám mây đã có dữ liệu.\n\n' +
        'OK  = GỘP: giữ thay đổi của thiết bị này và đẩy lên đám mây\n' +
        'Hủy = BỎ dữ liệu trên thiết bị này, dùng dữ liệu của đám mây'
      );
      if (!merge) {
        discardLocalAndResync();
        return;
      }
    }
    S.inited = true;
    S.reconciling = false;
    saveMeta();
    push();
  }

  function discardLocalAndResync() {
    stopSub();
    if (A && A.resetToBaseline) A.resetToBaseline();
    S.M = { rows: {}, blocks: {} };
    S.since = { rows: 0, blocks: 0 };
    S.ready = { rows: false, blocks: false };
    S.remoteSeen = 0;
    S.reconciling = false;
    S.inited = true;
    saveMeta();
    if (A && A.saveLocal) A.saveLocal();
    if (A && A.refresh) A.refresh();
    startSub();
  }

  function startSub() {
    if (!ad || S.subscribed) return;
    S.subscribed = true;
    setState('loading');
    ad.subscribe(
      S.since,
      onDocs,
      function (e) {
        S.err = ad.errText ? ad.errText(e) : String((e && e.message) || e);
        setState(navigator.onLine === false ? 'offline' : 'error');
        if (e && (e.code === 'permission-denied' || e.status === 401)) {
          S.subscribed = false;
          stopSub();
          setState('login');
        }
      },
      function () {
        if (S.st === 'loading' || S.st === 'error' || S.st === 'offline') {
          S.err = '';
          setState(S.pending ? 'syncing' : 'ok');
        }
      }
    );
  }

  function stopSub() {
    try { if (ad && ad.unsubscribe) ad.unsubscribe(); } catch (e) { }
    S.subscribed = false;
  }

  function onUser(u) {
    S.user = u;
    if (!u) {
      stopSub();
      setState('login');
      if (!S.loginShown) {
        S.loginShown = true;
        openPanel();
      }
      return;
    }
    S.err = '';
    startSub();
    if (S.inited) schedule(300);
    if ($('#syncPanel')) renderPanel();
    applyRoleUI();
  }

  function fbErr(e) {
    var c = (e && (e.code || e.message)) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return 'Sai tên đăng nhập hoặc mật khẩu.';
    if (/too-many-requests/.test(c)) return 'Đăng nhập sai quá nhiều lần – hãy thử lại sau ít phút.';
    if (/network-request-failed|unavailable|offline/.test(c)) return 'Không có kết nối tới máy chủ Firebase.';
    if (/permission-denied/.test(c)) return 'Không có quyền truy cập dữ liệu.';
    return String(c || 'lỗi không rõ');
  }

  function firebaseAdapter() {
    var cfg = CS.firebase;
    var base = CS.sdkBase || 'https://www.gstatic.com/firebasejs/10.12.2/';
    var auth = null, db = null, FS = null, AU = null, unsubs = [];

    var o = {
      name: 'firebase',
      needsEmail: false,
      errText: fbErr,
      init: function (cb) {
        return Promise.all([
          import(base + 'firebase-app.js'),
          import(base + 'firebase-auth.js'),
          import(base + 'firebase-firestore.js')
        ]).then(function (m) {
          var app = m[0].getApps().length ? m[0].getApp() : m[0].initializeApp(cfg);
          AU = m[1];
          FS = m[2];
          auth = AU.getAuth(app);
          db = FS.getFirestore(app);

          AU.onAuthStateChanged(auth, function (u) {
            if (u) {
              cb({ id: u.uid, name: localStorage.getItem('lab_username') || u.email });
              setTimeout(applyRoleUI, 300);
            } else {
              cb(null);
            }
          });
        });
      },
      signIn: function (usernameInput, pw) {
        var username = usernameInput.trim().toLowerCase();
        var authUsers = (A && A.CFG && A.CFG.authUsers) || {};
        var userInfo = authUsers[username];

        if (!userInfo) {
          return Promise.reject(new Error("Tên đăng nhập không tồn tại! Chỉ dùng 'admin' hoặc 'khach'."));
        }

        localStorage.setItem('lab_user_role', userInfo.role);
        localStorage.setItem('lab_username', username);

        return AU.signInWithEmailAndPassword(auth, userInfo.email, pw);
      },
      signOut: function () {
        localStorage.removeItem('lab_user_role');
        localStorage.removeItem('lab_username');
        return AU.signOut(auth).then(function () {
          location.reload();
        });
      },
      subscribe: function (since, onDocsCb, onErr, onOk) {
        o.unsubscribe();
        COLS.forEach(function (name) {
          var sinceMs = since[name] || 0;
          var colRef = FS.collection(db, 'workspaces', ws(), name);
          var q = sinceMs > 0
            ? FS.query(colRef, FS.where('upd', '>', FS.Timestamp.fromMillis(sinceMs)))
            : FS.query(colRef);

          unsubs.push(FS.onSnapshot(q, function (snap) {
            var docs = [];
            snap.docChanges().forEach(function (ch) {
              if (ch.type === 'removed') return;
              var d = ch.doc;
              if (d.metadata && d.metadata.hasPendingWrites) return;
              var data = d.data();
              var u = data.upd && data.upd.toMillis ? data.upd.toMillis() : Date.now();
              docs.push({ id: d.id, data: data, upd: u });
            });
            onDocsCb(name, docs);
            if (onOk) onOk();
          }, onErr));
        });
      },
      pollNow: function (onDocsCb) {
        var handler = typeof onDocsCb === 'function' ? onDocsCb : onDocs;
        if (!db || typeof handler !== 'function') return;
        COLS.forEach(function (name) {
          var sinceMs = S.since[name] || 0;
          var colRef = FS.collection(db, 'workspaces', ws(), name);
          var q = sinceMs > 0
            ? FS.query(colRef, FS.where('upd', '>', FS.Timestamp.fromMillis(sinceMs)))
            : FS.query(colRef);
          FS.getDocs(q).then(function (snap) {
            var docs = [];
            snap.forEach(function (d) {
              var data = d.data();
              var u = data.upd && data.upd.toMillis ? data.upd.toMillis() : Date.now();
              docs.push({ id: d.id, data: data, upd: u });
            });
            if (docs.length) handler(name, docs);
          }).catch(function () { });
        });
      },
      unsubscribe: function () {
        unsubs.forEach(function (u) { try { u(); } catch (e) { } });
        unsubs = [];
      },
      commit: function (ops) {
        if (localStorage.getItem('lab_user_role') === 'guest') {
          return Promise.reject(new Error('Tài khoản khách không có quyền ghi dữ liệu.'));
        }
        var batch = FS.writeBatch(db), by = deviceId();
        ops.forEach(function (op) {
          batch.set(
            FS.doc(db, 'workspaces', ws(), op.col, op.id),
            Object.assign({}, op.data, { upd: FS.serverTimestamp(), by: by })
          );
        });
        return batch.commit();
      },
      exists: function (colName, id) {
        return FS.getDoc(FS.doc(db, 'workspaces', ws(), colName, id)).then(function (s) { return s.exists(); });
      }
    };
    return o;
  }

  function lockBody() {
    document.body.classList.toggle(
      'modal-open',
      !!document.querySelector('#mdSync .modal, #mdView .modal')
    );
  }

  function openPanel() {
    var root = $('#mdSync');
    if (!root) {
      var mRoot = $('#modalRoot');
      if (mRoot) {
        root = document.createElement('div');
        root.id = 'mdSync';
        mRoot.appendChild(root);
        bindPanel();
      } else {
        return;
      }
    }
    root.innerHTML =
      '<div class="modal-back sync-back"><div class="modal modal-sync" role="dialog" aria-modal="true" aria-label="Đồng bộ">' +
      '<div class="modal-head"><h2>☁ Đồng bộ & Phân quyền</h2>' +
      '<button class="modal-x" data-sy="close" aria-label="Đóng">✕</button></div>' +
      '<div class="modal-body" id="syncPanel"></div></div></div>';
    renderPanel();
    lockBody();
  }

  function closePanel() {
    var root = $('#mdSync');
    if (root) root.innerHTML = '';
    lockBody();
    applyRoleUI();
  }

  function when(t) { return t ? new Date(t).toLocaleString('vi-VN') : '—'; }

  function renderPanel() {
    var p = $('#syncPanel');
    if (!p) return;
    var h = '';
    if (!enabled()) {
      h = '<p><b>Hiện dữ liệu chỉ lưu trên máy này</b>.</p>';
    } else if (!S.user) {
      h = '<p>Đăng nhập bằng tên để đồng bộ giữa các thiết bị (Nhập <b>admin</b> hoặc <b>khach</b>).</p>' +
        '<form id="syLogin" class="sy-form">' +
        '<label class="fld"><span>Tên đăng nhập (admin / khach)</span><input type="text" id="syEmail" autocomplete="username" placeholder="admin" required></label>' +
        '<label class="fld"><span>Mật khẩu</span><input type="password" id="syPass" autocomplete="current-password" required></label>' +
        '<div class="sy-err" id="syErr">' + esc(S.err || '') + '</div>' +
        '<div class="sy-btns"><button class="tbtn primary" type="submit">Đăng nhập</button>' +
        '<button class="tbtn" type="button" data-sy="close">Để sau</button></div></form>';
    } else {
      var stMap = {
        loading: 'Đang kết nối…',
        syncing: 'Đang đồng bộ…',
        ok: 'Đã đồng bộ',
        offline: 'Chờ có mạng',
        error: 'Lỗi đồng bộ',
        login: 'Chưa đăng nhập'
      };
      var st = stMap[S.st] || S.st;
      h = '<div class="sy-stat sy-' + (S.st === 'ok' ? 'ok' : 'wait') + '"><b>' + st + '</b>' +
        (S.err ? '<div class="sy-err">' + esc(S.err) + '</div>' : '') + '</div>' +
        '<table class="plain sy-tbl">' +
        '<tr><td>Tài khoản</td><td><b>' + esc(S.user.name || '') + ' (' + esc(localStorage.getItem('lab_user_role') || 'admin') + ')</b></td></tr>' +
        '<tr><td>Lần đồng bộ cuối</td><td>' + when(S.lastOk) + '</td></tr>' +
        '<tr><td>Thay đổi chờ đẩy lên</td><td>' + (S.pending || 0) + '</td></tr>' +
        '</table>' +
        '<div class="sy-btns">' +
        '<button class="tbtn primary" data-sy="now">🔄 Đồng bộ ngay</button>' +
        '<button class="tbtn danger" data-sy="out">Đăng xuất</button>' +
        '<button class="tbtn" data-sy="close">Đóng</button></div>';
    }
    p.innerHTML = h;
  }

  function bindPanel() {
    var root = $('#mdSync');
    if (!root) return;
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sy]');
      if (!b) return;
      var a = b.dataset.sy;
      if (a === 'close') closePanel();
      else if (a === 'now') {
        S.err = '';
        S.retry = 0;
        if (ad && ad.pollNow) ad.pollNow(onDocs);
        push();
      } else if (a === 'out') {
        if (confirm('Đăng xuất khỏi đồng bộ?')) ad.signOut();
      }
    });
    root.addEventListener('submit', function (e) {
      if (e.target.id !== 'syLogin') return;
      e.preventDefault();
      var em = $('#syEmail') ? $('#syEmail').value.trim() : '';
      var pw = $('#syPass') ? $('#syPass').value : '';
      var err = $('#syErr');
      var btn = e.target.querySelector('button[type=submit]');
      if (err) err.textContent = '';
      if (btn) { btn.disabled = true; btn.textContent = 'Đang đăng nhập…'; }
      Promise.resolve(ad.signIn(em, pw)).then(function () {
        closePanel();
        applyRoleUI();
      }).catch(function (x) {
        if (err) err.textContent = ad.errText ? ad.errText(x) : String(x);
        if (btn) { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
      });
    });
  }

  function init(app) {
    try {
      if (A) return;
      A = app;
      CS = (A && A.CFG && A.CFG.sync) || {};

      var root = $('#modalRoot');
      if (root && !$('#mdSync')) {
        var d = document.createElement('div');
        d.id = 'mdSync';
        root.appendChild(d);
        bindPanel();
      }

      var btn = $('#btnSync');
      if (btn) btn.addEventListener('click', function () { openPanel(); });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && $('#mdSync .modal') && !$('#mdView .modal')) {
          closePanel();
        }
      });

      window.addEventListener('online', function () {
        if (ad && S.user) {
          S.err = '';
          S.retry = 0;
          schedule(200);
          if (ad.pollNow) ad.pollNow(onDocs);
        }
      });
      window.addEventListener('offline', function () {
        if (ad && S.user) setState('offline');
      });
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && ad && S.user) {
          schedule(200);
          if (ad.pollNow) ad.pollNow(onDocs);
        }
      });

      if (!enabled()) {
        setState('off');
        return;
      }

      S.baseline = buildBaseline();
      var m = loadMeta();
      S.since = (m && m.since) || { rows: 0, blocks: 0 };
      S.M = (m && m.M) || { rows: {}, blocks: {} };
      S.inited = m ? !!m.inited : false;
      COLS.forEach(function (c) {
        if (!S.M[c]) S.M[c] = {};
        if (S.since[c] == null) S.since[c] = 0;
      });

      ad = firebaseAdapter();
      setState('loading');
      Promise.resolve(ad.init(onUser)).catch(function (e) {
        S.err = 'Không tải được thư viện đồng bộ: ' + ((e && e.message) || e) + ' (kiểm tra mạng / cấu hình).';
        setState('error');
      });
    } catch (e) {
      S.err = 'Lỗi khởi tạo Sync: ' + ((e && e.message) || e);
      setState('error');
    }
  }

  window.Sync = {
    ver: BUILD,
    init: init,
    schedule: schedule,
    pushNow: pushNow,
    active: active,
    open: openPanel
  };
})();
