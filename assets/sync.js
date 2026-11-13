/* =====================================================================
   sync.js – ĐỒNG BỘ ĐÁM MÂY & PHÂN QUYỀN GIAO DIỆN (Admin vs Guest)
   ===================================================================== */
(function () {
  'use strict';
  var BUILD = '2026.11.08-5-auth-lock';
  var A = null, CS = null, ad = null;
  var S = { st: 'off', user: null, M: null, since: null, inited: false, baseline: null, subscribed: false, pushing: false, retry: 0, lastOk: 0,
            err: '', pending: 0, conflicts: 0, ready: { rows: false, slips: false, blocks: false }, remoteSeen: 0, applyT: null, pushT: null, retryT: null, reconciling: false, loginShown: false };
  var COLS = ['rows', 'slips', 'blocks'];

  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) { return A.esc(s == null ? '' : s); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- băm & chữ ký ---------- */
  function stable(v) {
    if (v === undefined || v === null) return 'null';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
  }
  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, ch;
    for (i = 0; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function nz(o) { return o && Object.keys(o).length ? o : null; }
  function rowSig(r) {
    return hash(stable([r.v || [], r.c === true ? 1 : (r.c === false ? 0 : null), r.x || '', r.n || '', nz(r.f), (r.p && r.p.length) ? r.p : null, nz(r.s)]));
  }
  function slipSig(sl) { var c = clone(sl); return hash(stable([c.id, c.type, c.date, c.f, c.items, c.updatedAt])); }
  function blockSig(b) { return hash(stable([b.cols])); }
  function enc(key) { return encodeURIComponent(key); }

  /* ---------- trạng thái & meta lưu trên máy ---------- */
  function ws() { return (CS && CS.workspace) || 'lab-xvt'; }
  function metaKey() { return A.CFG.storageKey + ':sync:' + ws(); }
  function loadMeta() {
    try { var m = JSON.parse(localStorage.getItem(metaKey()) || 'null'); if (m && m.ver === A.DATA.meta.version) return m; } catch (e) { }
    return null;
  }
  function saveMeta() {
    try { localStorage.setItem(metaKey(), JSON.stringify({ ver: A.DATA.meta.version, since: S.since, M: S.M, inited: S.inited })); } catch (e) { }
  }
  function enabled() {
    var c = A.CFG.sync || {};
    return (c.provider === 'firebase' && c.firebase && c.firebase.projectId) || (c.provider === 'server' && c.server && c.server.url);
  }
  function deviceId() {
    var k = A.CFG.storageKey + ':device', v = null;
    try { v = localStorage.getItem(k); if (!v) { v = 'd' + Math.random().toString(36).slice(2, 8); localStorage.setItem(k, v); } } catch (e) { v = 'dx'; }
    return v;
  }

  /* ---------- dữ liệu gốc (baseline) ---------- */
  function buildBaseline() {
    var rows = new Map(), blocks = new Set();
    A.DATA.sheets.forEach(function (s) {
      s.blocks.forEach(function (b, bi) {
        blocks.add(s.id + '|' + b.title);
        b.rows.forEach(function (r) { rows.set(s.id + ':' + bi + ':' + r.r, { sid: s.id, bt: b.title, sig: rowSig(r) }); });
      });
    });
    return { rows: rows, blocks: blocks };
  }
  function localRows() {
    var m = new Map();
    A.ST.sheets.forEach(function (s) { s.blocks.forEach(function (b, bi) { b.rows.forEach(function (r) { if (r.i) m.set(r.i, { s: s, b: b, bi: bi, row: r }); }); }); });
    return m;
  }
  function findSlip(type, id) { var a = (A.ST.slips && A.ST.slips[type]) || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }

  /* ---------- tính các thay đổi cần đẩy lên ---------- */
  function rowData(e) {
    var r = e.row;
    return { rid: r.i, sid: e.s.id, bt: e.b.title, r: r.r || 0, ct: r.ct || 0, v: r.v.slice(), c: (r.c === true || r.c === false) ? r.c : null,
             x: r.x || '', n: r.n || '', f: nz(r.f), p: (r.p && r.p.length) ? r.p.slice() : null, s: nz(r.s), del: false };
  }
  function computeOps() {
    var ops = [], base = S.baseline, lr = localRows(), M = S.M;
    lr.forEach(function (e, rid) {
      var sig = rowSig(e.row), last = M.rows[rid];
      var need = last !== undefined ? last !== sig : (!base.rows.has(rid) || base.rows.get(rid).sig !== sig);
      if (need) ops.push({ col: 'rows', key: rid, sig: sig, data: rowData(e) });
    });
    base.rows.forEach(function (b, rid) {
      if (!lr.has(rid) && M.rows[rid] !== 'DEL') ops.push({ col: 'rows', key: rid, sig: 'DEL', data: { rid: rid, sid: b.sid, bt: b.bt, del: true } });
    });
    Object.keys(M.rows).forEach(function (rid) {
      if (!lr.has(rid) && !base.rows.has(rid) && M.rows[rid] !== 'DEL') ops.push({ col: 'rows', key: rid, sig: 'DEL', data: { rid: rid, sid: '', bt: '', del: true } });
    });
    ['xuat', 'nhap'].forEach(function (t) {
      ((A.ST.slips && A.ST.slips[t]) || []).forEach(function (sl) {
        var key = t + ':' + sl.id, sig = slipSig(sl);
        if (M.slips[key] !== sig) { var d = clone(sl); d.type = t; d.del = false; ops.push({ col: 'slips', key: key, sig: sig, data: d }); }
      });
    });
    Object.keys(M.slips).forEach(function (key) {
      if (M.slips[key] === 'DEL') return;
      var i = key.indexOf(':'), t = key.slice(0, i), id = key.slice(i + 1);
      if (!findSlip(t, id)) ops.push({ col: 'slips', key: key, sig: 'DEL', data: { id: id, type: t, del: true } });
    });
    A.ST.sheets.forEach(function (s) {
      s.blocks.forEach(function (b) {
        var key = s.id + '|' + b.title; if (base.blocks.has(key)) return;
        var sig = blockSig(b);
        if (M.blocks[key] !== sig) ops.push({ col: 'blocks', key: key, sig: sig, data: { sid: s.id, title: b.title, cols: b.cols.slice(), ord: b.ord || 0, del: false } });
      });
    });
    return ops;
  }

  /* ---------- CHẶN & LÀM MỜ TÍNH NĂNG ĐỐI VỚI TÀI KHOẢN KHÁCH (GUEST) ---------- */
  function applyRoleUI() {
    var currentRole = localStorage.getItem('lab_user_role');
    if (currentRole === 'guest') {
      document.querySelectorAll('button, a, .tbtn').forEach(function(el) {
        var text = (el.textContent || '').toLowerCase();
        var idClass = (el.id + ' ' + el.className).toLowerCase();
        
        if (text.includes('tạo phiếu') || text.includes('thêm') || text.includes('sửa') || text.includes('xoá') || text.includes('nhập kho') || text.includes('xuất kho') || idClass.includes('admin')) {
          if (!text.includes('xem') && !text.includes('xác nhận') && !text.includes('đã nhận')) {
            el.style.opacity = '0.3';
            el.style.pointerEvents = 'none';
            el.title = 'Tài khoản Khách không có quyền sử dụng chức năng này.';
          }
        }
      });
    }
  }

  function setState(st) {
    S.st = st; var b = $('#btnSync'); if (!b) return;
    var map = { off: ['☁', 'Chỉ trên máy', 'off'], login: ['🔒', 'Đăng nhập', 'login'], syncing: ['🔄', 'Đang đồng bộ…', 'syncing'], ok: ['☁✓', 'Đã đồng bộ', 'ok'],
                offline: ['⚠', 'Chờ mạng', 'bad'], error: ['⚠', 'Lỗi đồng bộ', 'bad'], loading: ['🔄', 'Đang kết nối…', 'syncing'] };
    var m = map[st] || map.off, n = S.pending > 0 && (st === 'offline' || st === 'error') ? ' (' + S.pending + ')' : '';
    b.className = 'btn ghost sync-' + m[2]; b.innerHTML = '<i>' + m[0] + '</i> <span>' + m[1] + n + '</span>';
    b.title = 'Đồng bộ: ' + m[1] + (S.lastOk ? ' – lần cuối ' + new Date(S.lastOk).toLocaleTimeString('vi-VN') : '') + (S.err ? '\n' + S.err : '');
    var p = $('#syncPanel'); if (p) renderPanel();
    applyRoleUI();
  }

  /* ---------- đẩy thay đổi lên đám mây ---------- */
  function schedule(delay) {
    if (!ad || !S.user || !S.subscribed || (!S.inited && !S.reconciling)) { if (ad && S.user && !S.inited) setState(S.st); return; }
    clearTimeout(S.pushT); S.pushT = setTimeout(push, delay == null ? 1200 : delay);
  }
  function push() {
    if (localStorage.getItem('lab_user_role') === 'guest') return Promise.resolve();

    if (S.pushing || !ad || !S.user || !S.subscribed || !S.inited) return Promise.resolve();
    var ops = computeOps(); S.pending = ops.length;
    if (!ops.length) { if (S.st !== 'loading') setState('ok'); return Promise.resolve(); }
    S.pushing = true; setState('syncing');
    var chunks = []; for (var i = 0; i < ops.length; i += 300) chunks.push(ops.slice(i, i + 300));
    return chunks.reduce(function (p, ch) {
      return p.then(function () {
        return ad.commit(ch.map(function (o) { return { col: o.col, id: enc(o.key), data: o.data }; })).then(function () {
          ch.forEach(function (o) { S.M[o.col][o.key] = o.sig; }); saveMeta();
        });
      });
    }, Promise.resolve()).then(function () {
      S.pushing = false; S.retry = 0; S.lastOk = Date.now(); S.err = ''; S.pending = 0; setState('ok');
      if (computeOps().length) schedule(300);
    }).catch(function (e) {
      S.pushing = false; S.err = ad.errText ? ad.errText(e) : String(e && e.message || e); S.pending = ops.length;
      setState(navigator.onLine === false ? 'offline' : 'error'); retryLater();
    });
  }
  function retryLater() { clearTimeout(S.retryT); S.retry++; S.retryT = setTimeout(function () { push(); }, Math.min(60000, 3000 * Math.pow(2, Math.min(S.retry, 4)))); }

  /* ---------- nhận thay đổi từ đám mây ---------- */
  function defaultCols(n) { var c = ['STT', 'Mã VT', 'Tên vật tư', 'Serial No', 'Part Number', 'Tình trạng', 'Ghi chú']; while (c.length < n) c.push('Cột ' + (c.length + 1)); return c.slice(0, Math.max(n, 1)); }
  function ensureBlock(sid, title, ncols) {
    var s = A.sheetById(sid); if (!s) return null;
    for (var i = 0; i < s.blocks.length; i++) if (s.blocks[i].title === title) return s.blocks[i];
    var b = { title: title, hr: 0, cols: defaultCols(ncols || 7), rows: [], ord: 0 }; s.blocks.push(b); return b;
  }
  function sortRuntimeBlocks(s) {
    var base = S.baseline.blocks, keep = [], rt = [];
    s.blocks.forEach(function (b) { (base.has(s.id + '|' + b.title) ? keep : rt).push(b); });
    rt.sort(function (a, b) { return (a.ord || 0) - (b.ord || 0) || (a.title < b.title ? -1 : 1); });
    s.blocks.length = 0; keep.concat(rt).forEach(function (b) { s.blocks.push(b); });
  }
  function placeNew(b, row) {
    var k = b.rows.length; while (k > 0 && b.rows[k - 1].ct && row.ct && b.rows[k - 1].ct > row.ct) k--;
    b.rows.splice(k, 0, row);
  }
  function applyRow(d) {
    var data = d.data, rid = data.rid; if (!rid) return false;
    var rs = data.del ? 'DEL' : rowSig(data), idx = localRows(), cur = idx.get(rid), ls = cur ? rowSig(cur.row) : 'DEL';
    var last = S.M.rows[rid], base = S.baseline.rows.get(rid);
    var dirty = last !== undefined ? last !== ls : (base ? base.sig !== ls : ls !== 'DEL');
    if (rs === ls) { S.M.rows[rid] = rs; return false; }
    if (dirty) { S.conflicts++; return false; }
    if (rs === 'DEL') { if (cur) { var k = cur.b.rows.indexOf(cur.row); if (k >= 0) cur.b.rows.splice(k, 1); } S.M.rows[rid] = 'DEL'; return true; }
    if (cur) {
      var r = cur.row; r.v = data.v.slice(); r.c = data.c === true || data.c === false ? data.c : null;
      ['x', 'n'].forEach(function (k) { if (data[k]) r[k] = data[k]; else delete r[k]; });
      ['f', 's'].forEach(function (k) { if (nz(data[k])) r[k] = clone(data[k]); else delete r[k]; });
      if (data.p && data.p.length) r.p = data.p.slice(); else delete r.p;
    } else {
      var b = ensureBlock(data.sid, data.bt, (data.v || []).length); if (!b) return false;
      var row = { r: data.r || 0, i: rid, ct: data.ct || 0, c: data.c === true || data.c === false ? data.c : null, v: data.v.slice() };
      if (data.x) row.x = data.x; if (data.n) row.n = data.n; if (nz(data.f)) row.f = clone(data.f); if (nz(data.s)) row.s = clone(data.s); if (data.p && data.p.length) row.p = data.p.slice();
      placeNew(b, row);
    }
    S.M.rows[rid] = rs; return true;
  }
  function applySlip(d) {
    var data = d.data, t = data.type, id = data.id; if (!t || !id) return false;
    var key = t + ':' + id, loc = findSlip(t, id), ls = loc ? slipSig(loc) : 'DEL', rs = data.del ? 'DEL' : slipSig(data), last = S.M.slips[key];
    var dirty = last !== undefined ? last !== ls : ls !== 'DEL';
    if (rs === ls) { S.M.slips[key] = rs; return false; }
    if (dirty) { S.conflicts++; return false; }
    var arr = A.ST.slips[t] || (A.ST.slips[t] = []);
    if (rs === 'DEL') { if (loc) arr.splice(arr.indexOf(loc), 1); }
    else {
      var ns = { id: id, type: t, date: data.date, f: clone(data.f || {}), items: clone(data.items || []), createdAt: data.createdAt, updatedAt: data.updatedAt };
      if (loc) arr.splice(arr.indexOf(loc), 1, ns); else arr.push(ns);
    }
    S.M.slips[key] = rs; return true;
  }
  function applyBlock(d) {
    var data = d.data; if (data.del || !data.sid) return false;
    var s = A.sheetById(data.sid); if (!s) return false;
    var key = data.sid + '|' + data.title, b = null, i;
    for (i = 0; i < s.blocks.length; i++) if (s.blocks[i].title === data.title) b = s.blocks[i];
    var changed = false;
    if (!b) { b = { title: data.title, hr: 0, cols: data.cols.slice(), rows: [], ord: data.ord || 0 }; s.blocks.push(b); changed = true; }
    else if (blockSig(b) !== blockSig(data) || (data.ord && b.ord !== data.ord)) { b.cols = data.cols.slice(); b.ord = data.ord || b.ord; changed = true; }
    sortRuntimeBlocks(s); S.M.blocks[key] = blockSig(data); return changed;
  }
  function onDocs(col, docs) {
    var changed = 0, maxUpd = S.since[col] || 0;
    docs.sort(function (a, b) { return (a.upd || 0) - (b.upd || 0); });
    docs.forEach(function (d) {
      S.remoteSeen++; if (d.upd > maxUpd) maxUpd = d.upd;
      var ok = col === 'rows' ? applyRow(d) : col === 'slips' ? applySlip(d) : applyBlock(d);
      if (ok) changed++;
    });
    S.since[col] = maxUpd; saveMeta();
    if (changed) {
      S.changed = (S.changed || 0) + changed; A.saveLocal(); safeRender();
      if (S.inited) A.toast('☁ Đã nhận ' + changed + ' thay đổi từ thiết bị khác', 2500);
    }
    if (!S.ready[col]) { S.ready[col] = true; maybeReconcile(); }
    if (S.inited && S.pending === 0 && computeOps().length) schedule(400);
  }
  function safeRender() {
    clearTimeout(S.applyT);
    S.applyT = setTimeout(function tryRender() {
      var ae = document.activeElement;
      if (ae && ae.closest && ae.closest('#main') && (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) { S.applyT = setTimeout(tryRender, 1500); return; }
      A.refresh();
      applyRoleUI();
    }, 200);
  }

  /* ---------- lần đồng bộ đầu tiên ---------- */
  function maybeReconcile() {
    if (S.inited || S.reconciling || !(S.ready.rows && S.ready.slips && S.ready.blocks)) return;
    S.reconciling = true;
    var ops = computeOps(), hasRemote = S.remoteSeen > 0;
    if (ops.length && hasRemote) {
      var slipsN = ((A.ST.slips.xuat || []).length + (A.ST.slips.nhap || []).length);
      var merge = confirm('Thiết bị này đang có ' + ops.length + ' thay đổi chưa đồng bộ (' + slipsN + ' phiếu…), trong khi đám mây đã có dữ liệu.\n\n' +
        'OK  = GỘP: giữ thay đổi của thiết bị này và đẩy lên đám mây\n' +
        'Hủy = BỎ dữ liệu trên thiết bị này, dùng dữ liệu của đám mây');
      if (!merge) { discardLocalAndResync(); return; }
    }
    S.inited = true; S.reconciling = false; saveMeta(); push();
  }
  function discardLocalAndResync() {
    stopSub(); A.resetToBaseline(); S.M = { rows: {}, slips: {}, blocks: {} }; S.since = { rows: 0, slips: 0, blocks: 0 };
    S.ready = { rows: false, slips: false, blocks: false }; S.remoteSeen = 0; S.reconciling = false; S.inited = true; saveMeta(); A.saveLocal(); A.refresh(); startSub();
  }

  /* ---------- kết nối ---------- */
  function startSub() {
    if (!ad || S.subscribed) return;
    S.subscribed = true; setState('loading');
    ad.subscribe(S.since, onDocs, function (e) {
      S.err = ad.errText ? ad.errText(e) : String(e && e.message || e);
      setState(navigator.onLine === false ? 'offline' : 'error');
      if (e && (e.code === 'permission-denied' || e.status === 401)) { S.subscribed = false; stopSub(); setState('login'); }
    }, function () { if (S.st === 'loading' || S.st === 'error' || S.st === 'offline') { S.err = ''; setState(S.pending ? 'syncing' : 'ok'); } });
  }
  function stopSub() { try { if (ad && ad.unsubscribe) ad.unsubscribe(); } catch (e) { } S.subscribed = false; }
  function onUser(u) {
    S.user = u;
    if (!u) { stopSub(); setState('login'); if (!S.loginShown) { S.loginShown = true; openPanel(true); } return; }
    S.err = ''; startSub(); if (S.inited) schedule(300);
    if ($('#syncPanel')) renderPanel();
    applyRoleUI();
  }

  /* ---------- Firebase Adapter ---------- */
  function fbErr(e) {
    var c = (e && (e.code || e.message)) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return 'Sai tên đăng nhập hoặc mật khẩu.';
    if (/too-many-requests/.test(c)) return 'Đăng nhập sai quá nhiều lần – hãy thử lại sau ít phút.';
    if (/network-request-failed|unavailable|offline/.test(c)) return 'Không có kết nối tới máy chủ Firebase.';
    if (/permission-denied/.test(c)) return 'Không có quyền truy cập dữ liệu.';
    return String(c || 'lỗi không rõ');
  }
  function firebaseAdapter() {
    var cfg = CS.firebase, base = CS.sdkBase || 'https://www.gstatic.com/firebasejs/10.12.2/', auth = null, db = null, FS = null, AU = null, unsubs = [];
    var o = {
      name: 'firebase', needsEmail: false, errText: fbErr,
      init: function (cb) {
        return Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]).then(function (m) {
          var app = m[0].initializeApp(cfg); AU = m[1]; FS = m[2]; auth = AU.getAuth(app); db = FS.getFirestore(app);
          AU.onAuthStateChanged(auth, function (u) { 
            if (u) {
              cb({ id: u.uid, name: localStorage.getItem('lab_username') || u.email });
              setTimeout(applyRoleUI, 500);
            } else {
              cb(null);
            }
          });
        });
      },
      signIn: function (usernameInput, pw) {
        var username = usernameInput.trim().toLowerCase();
        var authUsers = (A.CFG.authUsers || {});
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
        location.reload();
        return AU.signOut(auth); 
      },
      subscribe: function (since, onDocsCb, onErr, onOk) {
        o.unsubscribe();
        COLS.forEach(function (name) {
          var q = FS.query(FS.collection(db, 'workspaces', ws(), name), FS.where('upd', '>', FS.Timestamp.fromMillis(since[name] || 0)));
          unsubs.push(FS.onSnapshot(q, function (snap) {
            var docs = [];
            snap.docChanges().forEach(function (ch) {
              if (ch.type === 'removed') return;
              var d = ch.doc; if (d.metadata && d.metadata.hasPendingWrites) return;
              var data = d.data(), u = data.upd && data.upd.toMillis ? data.upd.toMillis() : 0;
              docs.push({ id: d.id, data: data, upd: u });
            });
            onDocsCb(name, docs); if (onOk) onOk();
          }, onErr));
        });
      },
      unsubscribe: function () { unsubs.forEach(function (u) { try { u(); } catch (e) { } }); unsubs = []; },
      commit: function (ops) {
        if (localStorage.getItem('lab_user_role') === 'guest') return Promise.reject(new Error("Tài khoản khách không có quyền ghi dữ liệu."));
        var batch = FS.writeBatch(db), by = deviceId();
        ops.forEach(function (op) {
          batch.set(FS.doc(db, 'workspaces', ws(), op.col, op.id), Object.assign({}, op.data, { upd: FS.serverTimestamp(), by: by }));
        });
        return batch.commit();
      },
      exists: function (colName, id) { return FS.getDoc(FS.doc(db, 'workspaces', ws(), colName, id)).then(function (s) { return s.exists(); }); }
    };
    return o;
  }

  /* ---------- Server Adapter ---------- */
  function serverAdapter() {
    var cfg = CS.server, url = String(cfg.url).replace(/\/+$/, ''), tkey = A.CFG.storageKey + ':sync-token', tok = null, timer = null, since = {}, cbD = null, cbE = null, cbO = null, first = {}, cbUser = null, polling = false;
    function req(path, method, body) {
      var h = { 'Content-Type': 'application/json' }; if (tok) h.Authorization = 'Bearer ' + tok;
      return fetch(url + path, { method: method || 'GET', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
        if (r.status === 401) { var e = new Error('unauthorized'); e.status = 401; throw e; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
    function poll() {
      if (polling || !cbD) return Promise.resolve(); polling = true;
      return COLS.reduce(function (p, name) {
        return p.then(function () {
          return req('/api/docs?ws=' + encodeURIComponent(ws()) + '&col=' + name + '&since=' + (since[name] || 0)).then(function (r) {
            var docs = r.docs || []; docs.forEach(function (d) { if (d.upd > (since[name] || 0)) since[name] = d.upd; });
            if (docs.length || !first[name]) { first[name] = true; cbD(name, docs); }
          });
        });
      }, Promise.resolve()).then(function () { if (cbO) cbO(); }).catch(function (e) { if (cbE) cbE(e); }).then(function () { polling = false; });
    }
    function loop() { clearTimeout(timer); if (!cbD) return; timer = setTimeout(function () { poll().then(loop); }, cfg.pollMs || 4000); }
    var o = {
      name: 'server', needsEmail: false,
      errText: function (e) { return e && e.status === 401 ? 'Mã truy cập không đúng.' : 'Không kết nối được máy chủ đồng bộ.'; },
      init: function (cb) {
        cbUser = cb; try { tok = localStorage.getItem(tkey); } catch (e) { tok = null; }
        if (!tok) { cb(null); return Promise.resolve(); }
        return req('/api/doc?ws=' + encodeURIComponent(ws()) + '&col=rows&id=_', 'GET').then(function () { cb({ id: 'token', name: 'Mã truy cập' }); })
          .catch(function (e) { if (e.status === 401) { tok = null; try { localStorage.removeItem(tkey); } catch (x) { } cb(null); } else cb({ id: 'token', name: 'Mã truy cập' }); });
      },
      signIn: function (_username, token) {
        return fetch(url + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token }) }).then(function (r) {
          if (!r.ok) { var e = new Error('unauthorized'); e.status = 401; throw e; }
          tok = token; try { localStorage.setItem(tkey, tok); } catch (e) { } cbUser({ id: 'token', name: 'Mã truy cập' });
        });
      },
      signOut: function () { tok = null; try { localStorage.removeItem(tkey); } catch (e) { } o.unsubscribe(); cbUser(null); return Promise.resolve(); },
      subscribe: function (s, onDocsCb, onErr, onOk) { since = clone(s); cbD = onDocsCb; cbE = onErr; cbO = onOk; first = {}; poll().then(loop); },
      pollNow: function () { poll().then(loop); },
      unsubscribe: function () { cbD = null; clearTimeout(timer); },
      commit: function (ops) { return req('/api/batch', 'POST', { ops: ops.map(function (op) { return { ws: ws(), col: op.col, id: op.id, data: op.data }; }) }); },
      exists: function (colName, id) { return req('/api/doc?ws=' + encodeURIComponent(ws()) + '&col=' + colName + '&id=' + encodeURIComponent(id)).then(function (r) { return !!r.exists; }); }
    };
    return o;
  }

  /* ---------- Giao diện Bảng đăng nhập ---------- */
  function lockBody() { document.body.classList.toggle('modal-open', !!document.querySelector('#mdSync .modal, #mdEditor .modal, #mdPicker .modal, #mdView .modal')); }
  function openPanel(auto) {
    var root = $('#mdSync'); if (!root) return;
    root.innerHTML = '<div class="modal-back sync-back"><div class="modal modal-sync" role="dialog" aria-modal="true" aria-label="Đồng bộ"><div class="modal-head"><h2>☁ Đồng bộ & Phân quyền</h2>' +
      '<button class="modal-x" data-sy="close" aria-label="Đóng">✕</button></div><div class="modal-body" id="syncPanel"></div></div></div>';
    renderPanel(auto); lockBody();
  }
  function closePanel() { var root = $('#mdSync'); if (root) root.innerHTML = ''; lockBody(); applyRoleUI(); }
  function when(t) { return t ? new Date(t).toLocaleString('vi-VN') : '—'; }
  function renderPanel(auto) {
    var p = $('#syncPanel'); if (!p) return;
    var h = '';
    if (!enabled()) {
      h = '<p><b>Hiện dữ liệu chỉ lưu trên máy này</b>.</p>';
    } else if (!S.user) {
      h = '<p>Đăng nhập bằng tên để sử dụng hệ thống (Nhập <b>admin</b> hoặc <b>khach</b>).</p>' +
        '<form id="syLogin" class="sy-form">' +
        '<label class="fld"><span>Tên đăng nhập (admin / khach)</span><input type="text" id="syEmail" autocomplete="username" placeholder="admin" required></label>' +
        '<label class="fld"><span>Mật khẩu</span><input type="password" id="syPass" autocomplete="current-password" required></label>' +
        '<div class="sy-err" id="syErr">' + esc(S.err || '') + '</div><div class="sy-btns"><button class="tbtn primary" type="submit">Đăng nhập</button><button class="tbtn" type="button" data-sy="close">Để sau</button></div></form>';
    } else {
      var st = { loading: 'Đang kết nối…', syncing: 'Đang đồng bộ…', ok: 'Đã đồng bộ', offline: 'Chờ có mạng', error: 'Lỗi đồng bộ', login: 'Chưa đăng nhập' }[S.st] || S.st;
      h = '<div class="sy-stat sy-' + (S.st === 'ok' ? 'ok' : 'wait') + '"><b>' + st + '</b>' + (S.err ? '<div class="sy-err">' + esc(S.err) + '</div>' : '') + '</div>' +
        '<table class="plain sy-tbl"><tr><td>Tài khoản</td><td><b>' + esc(S.user.name || '') + ' (' + (localStorage.getItem('lab_user_role') || 'n/a') + ')</b></td></tr>' +
        '<tr><td>Lần đồng bộ cuối</td><td>' + when(S.lastOk) + '</td></tr><tr><td>Thay đổi chờ đẩy lên</td><td>' + (S.pending || 0) + '</td></tr></table>' +
        '<div class="sy-btns"><button class="tbtn primary" data-sy="now">🔄 Đồng bộ ngay</button><button class="tbtn danger" data-sy="out">Đăng xuất</button><button class="tbtn" data-sy="close">Đóng</button></div>';
    }
    p.innerHTML = h;
  }
  function bindPanel() {
    var root = $('#mdSync');
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sy]'); if (!b) return; var a = b.dataset.sy;
      if (a === 'close') closePanel();
      else if (a === 'now') { S.err = ''; S.retry = 0; if (ad && ad.pollNow) ad.pollNow(); push(); }
      else if (a === 'out') { if (confirm('Đăng xuất khỏi đồng bộ?')) ad.signOut(); }
    });
    root.addEventListener('submit', function (e) {
      if (e.target.id !== 'syLogin') return; e.preventDefault();
      var em = $('#syEmail') ? $('#syEmail').value.trim() : '', pw = $('#syPass').value, err = $('#syErr'), btn = e.target.querySelector('button[type=submit]');
      err.textContent = ''; btn.disabled = true; btn.textContent = 'Đang đăng nhập…';
      Promise.resolve(ad.signIn(em, pw)).then(function () { closePanel(); applyRoleUI(); }).catch(function (x) { err.textContent = ad.errText ? ad.errText(x) : String(x); btn.disabled = false; btn.textContent = 'Đăng nhập'; });
    });
  }

  /* ---------- Khởi động ---------- */
  function init(app) {
    if (A) return; A = app; CS = A.CFG.sync || {};
    var root = $('#modalRoot'); if (root && !$('#mdSync')) { var d = document.createElement('div'); d.id = 'mdSync'; root.appendChild(d); bindPanel(); }
    var btn = $('#btnSync'); if (btn) btn.addEventListener('click', function () { openPanel(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#mdSync .modal') && !$('#mdView .modal') && !$('#mdEditor .modal')) closePanel(); });
    window.addEventListener('online', function () { if (ad && S.user) { S.err = ''; S.retry = 0; schedule(200); if (ad.pollNow) ad.pollNow(); } });
    window.addEventListener('offline', function () { if (ad && S.user) setState('offline'); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && ad && S.user) { schedule(200); if (ad.pollNow) ad.pollNow(); } });
    if (!enabled()) { setState('off'); return; }
    S.baseline = buildBaseline();
    var m = loadMeta();
    S.since = (m && m.since) || { rows: 0, slips: 0, blocks: 0 }; S.M = (m && m.M) || { rows: {}, slips: {}, blocks: {} }; S.inited = m ? !!m.inited : false;
    COLS.forEach(function (c) { if (!S.M[c]) S.M[c] = {}; if (S.since[c] == null) S.since[c] = 0; });
    ad = CS.provider === 'firebase' ? firebaseAdapter() : serverAdapter();
    setState('loading');
    Promise.resolve(ad.init(onUser)).catch(function (e) { S.err = 'Không tải được thư viện đồng bộ: ' + (e && e.message || e) + ' (kiểm tra mạng / cấu hình).'; setState('error'); });
    
    setInterval(function() {
      if (localStorage.getItem('lab_user_role') === 'guest') {
        applyRoleUI();
      }
    }, 1000);
  }

  window.Sync = {
    ver: BUILD, init: init,
    schedule: function (d) { if (A && ad) schedule(d); },
    active: function () { return !!(ad && S.user && S.subscribed && S.inited); },
    exists: function (col, key) { return ad && S.user ? ad.exists(col, enc(key)) : Promise.resolve(false); },
    status: function () { return { state: S.st, user: S.user, pending: S.pending, lastOk: S.lastOk, conflicts: S.conflicts, inited: S.inited, since: S.since }; },
    pushNow: function () { return push(); }, open: function () { openPanel(false); }, _computeOps: function () { return computeOps(); }
  };
})();
