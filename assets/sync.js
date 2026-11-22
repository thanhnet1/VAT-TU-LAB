/* =====================================================================
   assets/sync.js – ĐỒNG BỘ DỮ LIỆU ĐA THIẾT BỊ (Firebase Realtime DB + Auth)
   ===================================================================== */
(function () {
  'use strict';

  const BUILD = '2026.11.21-5';
  const COLS = ['rows', 'slips', 'blocks'];

  let A = null;
  let ad = null;

  const S = {
    st: 'off', // off | loading | need-auth | synced | syncing | offline | error
    user: null,
    role: 'admin',
    M: { rows: {}, slips: {}, blocks: {} },
    since: { rows: 0, slips: 0, blocks: 0 },
    inited: false,
    baseline: null,
    subscribed: false,
    pushing: false,
    retry: 0,
    lastOk: 0,
    err: '',
    pushT: null,
    retryT: null,
    reconciling: false,
    loginOpen: false
  };

  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => (A && typeof A.esc === 'function')
    ? A.esc(s == null ? '' : s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));

  function cfgSync() {
    return (A && A.CFG && A.CFG.sync) || (window.APP_CONFIG && window.APP_CONFIG.sync) || {};
  }

  function authUsersMap() {
    return (A && A.CFG && A.CFG.authUsers) || (window.APP_CONFIG && window.APP_CONFIG.authUsers) || {};
  }

  function storagePrefix() {
    const sk = (A && A.CFG && A.CFG.storageKey) || (window.APP_CONFIG && window.APP_CONFIG.storageKey) || 'vat-tu-tai-san-lab-v2';
    const ws = (cfgSync().workspace) || 'default';
    return `${sk}:sync:${ws}:`;
  }

  function enabled() {
    const c = cfgSync();
    return Boolean(
      c &&
      c.provider === 'firebase' &&
      c.firebase &&
      c.firebase.apiKey &&
      c.firebase.databaseURL
    );
  }

  function stable(v) {
    if (v === undefined || v === null) return 'null';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }

  function hashStr(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  const sig = obj => hashStr(stable(obj));

  function loadMeta() {
    try {
      const raw = localStorage.getItem(storagePrefix() + 'meta');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function saveMeta() {
    try {
      localStorage.setItem(storagePrefix() + 'meta', JSON.stringify({
        since: S.since,
        M: S.M,
        inited: S.inited,
        lastOk: S.lastOk
      }));
    } catch (_) {}
  }

  function snapshotNow() {
    const rows = {};
    const blocks = {};
    const sheets = (A && A.ST && Array.isArray(A.ST.sheets)) ? A.ST.sheets : [];

    sheets.forEach(s => {
      (s.blocks || []).forEach((b, bi) => {
        const bid = `${s.id}::${bi}`;
        blocks[bid] = {
          id: bid,
          sheetId: s.id,
          title: b.title || '',
          cols: Array.isArray(b.cols) ? b.cols.slice() : [],
          hr: b.hr != null ? b.hr : 1,
          ord: b.ord != null ? b.ord : bi,
          deleted: false
        };
        (b.rows || []).forEach((r, ri) => {
          const rid = r.i || `${bid}:${r.r || ri + 1}`;
          rows[rid] = {
            id: rid,
            sheetId: s.id,
            blockId: bid,
            r: r.r != null ? r.r : ri + 1,
            src: r.src || (Array.isArray(r.v) ? r.v[0] : ''),
            v: Array.isArray(r.v) ? r.v.slice() : [],
            f: r.f ? clone(r.f) : undefined,
            deleted: false
          };
        });
      });
    });

    const slips = {};
    const rawSlips = (A && A.ST && Array.isArray(A.ST.slips)) ? A.ST.slips : [];
    rawSlips.forEach((sl, idx) => {
      if (!sl) return;
      const sid = sl.id || `slip-${idx}`;
      slips[sid] = Object.assign({}, clone(sl), { id: sid, deleted: false });
    });

    return { rows, slips, blocks };
  }

  function buildBaseline() {
    const snap = snapshotNow();
    const base = { rows: {}, slips: {}, blocks: {} };
    COLS.forEach(col => {
      Object.keys(snap[col]).forEach(id => {
        base[col][id] = sig(snap[col][id]);
      });
    });
    return base;
  }

  function updateButtonUI() {
    const btn = $('#btnSync');
    if (!btn) return;

    const span = btn.querySelector('span');
    btn.classList.remove('sync-off', 'sync-ok', 'sync-busy', 'sync-err');

    if (!enabled()) {
      btn.classList.add('sync-off');
      btn.title = 'Chưa cấu hình đồng bộ nhiều thiết bị';
      if (span) span.textContent = 'Chỉ trên máy';
      return;
    }

    if (S.st === 'loading' || S.st === 'syncing') {
      btn.classList.add('sync-busy');
      btn.title = 'Đang đồng bộ dữ liệu với đám mây...';
      if (span) span.textContent = 'Đang đồng bộ';
    } else if (S.st === 'synced') {
      btn.classList.add('sync-ok');
      btn.title = `Đã đồng bộ nhiều thiết bị (${S.user && (S.user.email || S.user.uid) || 'online'})`;
      if (span) span.textContent = 'Đã đồng bộ';
    } else if (S.st === 'need-auth') {
      btn.classList.add('sync-off');
      btn.title = 'Bấm để đăng nhập đồng bộ nhiều thiết bị';
      if (span) span.textContent = 'Đăng nhập đồng bộ';
    } else if (S.st === 'offline') {
      btn.classList.add('sync-err');
      btn.title = 'Mất kết nối mạng – đang lưu cục bộ';
      if (span) span.textContent = 'Ngoại tuyến';
    } else if (S.st === 'error') {
      btn.classList.add('sync-err');
      btn.title = S.err || 'Lỗi đồng bộ';
      if (span) span.textContent = 'Lỗi đồng bộ';
    } else {
      btn.classList.add('sync-off');
      btn.title = 'Chỉ lưu trên máy này – bấm để kết nối đồng bộ';
      if (span) span.textContent = 'Chỉ trên máy';
    }
  }

  function setState(nextSt, errMsg = '') {
    S.st = nextSt;
    if (errMsg) S.err = errMsg;
    else if (nextSt === 'synced' || nextSt === 'syncing') S.err = '';
    updateButtonUI();
    if (S.loginOpen) renderModal();
  }

  function loadScriptOnce(url) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(sc => sc.src === url);
      if (existing) {
        if (existing.dataset.loaded === '1' || window.firebase) return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Không tải được ' + url)), { once: true });
        return;
      }
      const sc = document.createElement('script');
      sc.src = url;
      sc.async = true;
      sc.onload = () => {
        sc.dataset.loaded = '1';
        resolve();
      };
      sc.onerror = () => reject(new Error('Không tải được ' + url));
      document.head.appendChild(sc);
    });
  }

  async function ensureFirebaseSDK() {
    if (window.firebase && window.firebase.apps) return window.firebase;
    const base = 'https://www.gstatic.com/firebasejs/10.12.2';
    await loadScriptOnce(`${base}/firebase-app-compat.js`);
    await loadScriptOnce(`${base}/firebase-auth-compat.js`);
    await loadScriptOnce(`${base}/firebase-database-compat.js`);
    return window.firebase;
  }

  function createFirebaseAdapter() {
    let app = null;
    let auth = null;
    let db = null;
    let listeners = [];

    function detachListeners() {
      listeners.forEach(fn => {
        try { if (typeof fn === 'function') fn(); } catch (_) {}
      });
      listeners = [];
      S.subscribed = false;
    }

    function wsRoot() {
      const ws = (cfgSync().workspace) || 'default';
      return db.ref(`workspaces/${ws}`);
    }

    return {
      async init(onUser) {
        const fb = await ensureFirebaseSDK();
        const fbCfg = cfgSync().firebase;
        const appName = 'lab-sync-' + ((cfgSync().workspace) || 'default');
        app = fb.apps.find(x => x.name === appName) || fb.initializeApp(fbCfg, appName);
        auth = fb.auth(app);
        db = fb.database(app);

        auth.onAuthStateChanged(async user => {
          if (user) {
            await onUser(user);
            return;
          }
          // Thử đăng nhập ẩn danh tự động nếu Firebase Auth cho phép
          try {
            const cred = await auth.signInAnonymously();
            if (cred && cred.user) {
              await onUser(cred.user);
              return;
            }
          } catch (_) {}
          await onUser(null);
        });
      },

      async signInWithEmail(email, password) {
        if (!auth) throw new Error('Firebase Auth chưa sẵn sàng.');
        const cred = await auth.signInWithEmailAndPassword(email, password);
        return cred.user;
      },

      async signInGuestOrAnon() {
        if (!auth) throw new Error('Firebase Auth chưa sẵn sàng.');
        const cred = await auth.signInAnonymously();
        return cred.user;
      },

      async signOut() {
        detachListeners();
        if (auth) await auth.signOut();
      },

      subscribe(onRemoteItem) {
        if (!db || S.subscribed) return;
        S.subscribed = true;
        const root = wsRoot();

        COLS.forEach(col => {
          const ref = root.child(col);
          const handler = snap => {
            if (!snap.exists()) return;
            const val = snap.val();
            if (!val || typeof val !== 'object') return;
            Object.keys(val).forEach(key => {
              onRemoteItem(col, key, val[key]);
            });
          };
          ref.on('value', handler, err => {
            S.err = 'Lỗi đọc dữ liệu từ Firebase: ' + (err && err.message ? err.message : err);
            setState('error');
          });
          listeners.push(() => ref.off('value', handler));
        });
      },

      async pushBatch(col, updatesObj) {
        if (!db || !updatesObj || !Object.keys(updatesObj).length) return;
        const root = wsRoot();
        await root.child(col).update(updatesObj);
      },

      async pullAll() {
        if (!db) return;
        const root = wsRoot();
        const snap = await root.once('value');
        if (!snap.exists()) return;
        const data = snap.val() || {};
        COLS.forEach(col => {
          const mapObj = data[col];
          if (mapObj && typeof mapObj === 'object') {
            Object.keys(mapObj).forEach(k => applyRemoteRecord(col, k, mapObj[k]));
          }
        });
      }
    };
  }

  function applyRemoteRecord(col, id, rec) {
    if (!rec || typeof rec !== 'object' || !A || !A.ST) return;
    const ts = Number(rec._ts || rec.updatedAt || Date.now());
    const prevTs = Number((S.M[col] && S.M[col][id]) || 0);
    if (ts < prevTs && S.inited) return;

    S.reconciling = true;
    try {
      if (col === 'blocks') {
        const sheets = Array.isArray(A.ST.sheets) ? A.ST.sheets : [];
        let sh = sheets.find(s => s.id === rec.sheetId);
        if (!sh && rec.sheetId) {
          sh = {
            id: rec.sheetId,
            name: rec.title || rec.sheetId,
            blocks: []
          };
          sheets.push(sh);
        }
        if (sh) {
          const parts = String(id).split('::');
          const bIdx = Math.max(0, Number(parts[1] != null ? parts[1] : (rec.ord || 0)));
          if (rec.deleted) {
            if (sh.blocks[bIdx]) sh.blocks.splice(bIdx, 1);
          } else {
            const existing = sh.blocks[bIdx] || { title: rec.title || '', cols: A.STANDARD_COLS || [], rows: [] };
            existing.title = rec.title != null ? rec.title : existing.title;
            if (Array.isArray(rec.cols) && rec.cols.length) existing.cols = rec.cols.slice();
            if (rec.hr != null) existing.hr = rec.hr;
            if (rec.ord != null) existing.ord = rec.ord;
            if (!Array.isArray(existing.rows)) existing.rows = [];
            sh.blocks[bIdx] = existing;
          }
        }
      } else if (col === 'rows') {
        const sheets = Array.isArray(A.ST.sheets) ? A.ST.sheets : [];
        const parts = String(rec.blockId || '').split('::');
        const targetSheetId = rec.sheetId || parts[0];
        const targetBlockIdx = Math.max(0, Number(parts[1] || 0));

        let sh = sheets.find(s => s.id === targetSheetId);
        if (!sh && targetSheetId) {
          sh = { id: targetSheetId, name: targetSheetId, blocks: [] };
          sheets.push(sh);
        }
        if (sh) {
          if (!Array.isArray(sh.blocks) || !sh.blocks.length) {
            sh.blocks = [{ title: sh.name || targetSheetId, cols: A.STANDARD_COLS || [], rows: [] }];
          }
          const blk = sh.blocks[targetBlockIdx] || sh.blocks[0];
          if (!Array.isArray(blk.rows)) blk.rows = [];
          const foundIdx = blk.rows.findIndex(r => r && r.i === id);

          if (rec.deleted) {
            if (foundIdx >= 0) blk.rows.splice(foundIdx, 1);
          } else {
            const rowObj = {
              i: id,
              r: rec.r != null ? rec.r : (foundIdx >= 0 ? foundIdx + 1 : blk.rows.length + 1),
              src: rec.src || (Array.isArray(rec.v) ? rec.v[0] : ''),
              v: Array.isArray(rec.v) ? rec.v.slice() : [],
              f: rec.f ? clone(rec.f) : undefined
            };
            if (foundIdx >= 0) blk.rows[foundIdx] = Object.assign({}, blk.rows[foundIdx], rowObj);
            else blk.rows.push(rowObj);
          }
        }
      } else if (col === 'slips') {
        if (!Array.isArray(A.ST.slips)) A.ST.slips = [];
        const idx = A.ST.slips.findIndex(s => s && s.id === id);
        if (rec.deleted) {
          if (idx >= 0) A.ST.slips.splice(idx, 1);
        } else {
          const cleanSlip = clone(rec);
          delete cleanSlip.deleted;
          cleanSlip.id = id;
          if (idx >= 0) A.ST.slips[idx] = cleanSlip;
          else A.ST.slips.push(cleanSlip);
        }
      }

      if (!S.M[col]) S.M[col] = {};
      S.M[col][id] = ts;
      if (!S.baseline) S.baseline = { rows: {}, slips: {}, blocks: {} };
      if (!S.baseline[col]) S.baseline[col] = {};
      S.baseline[col][id] = rec.deleted ? '__DELETED__' : sig(rec);
      if (ts > (S.since[col] || 0)) S.since[col] = ts;

      if (typeof A.saveLocal === 'function') A.saveLocal();
      if (typeof A.refresh === 'function') A.refresh();
    } finally {
      S.reconciling = false;
    }
  }

  async function pushNow() {
    if (!enabled() || !ad || !S.user || S.reconciling) return;
    if (!navigator.onLine) {
      setState('offline');
      return;
    }
    if (S.pushing) return;

    S.pushing = true;
    setState('syncing');

    try {
      const nowSnap = snapshotNow();
      if (!S.baseline) S.baseline = { rows: {}, slips: {}, blocks: {} };
      const nowTs = Date.now();
      const devId = (S.user && S.user.uid) || 'web';

      for (const col of COLS) {
        if (!S.baseline[col]) S.baseline[col] = {};
        if (!S.M[col]) S.M[col] = {};
        const updates = {};

        // 1. Thêm mới hoặc cập nhật
        Object.keys(nowSnap[col]).forEach(id => {
          const item = nowSnap[col][id];
          const curSig = sig(item);
          if (S.baseline[col][id] !== curSig) {
            const payload = Object.assign({}, item, {
              deleted: false,
              _ts: nowTs,
              _by: devId
            });
            updates[id] = payload;
            S.baseline[col][id] = curSig;
            S.M[col][id] = nowTs;
          }
        });

        // 2. Đánh dấu xoá nếu từng có trong baseline nhưng hiện không còn
        Object.keys(S.baseline[col]).forEach(id => {
          if (S.baseline[col][id] !== '__DELETED__' && !nowSnap[col][id]) {
            updates[id] = {
              id,
              deleted: true,
              _ts: nowTs,
              _by: devId
            };
            S.baseline[col][id] = '__DELETED__';
            S.M[col][id] = nowTs;
          }
        });

        if (Object.keys(updates).length > 0) {
          await ad.pushBatch(col, updates);
          S.since[col] = Math.max(S.since[col] || 0, nowTs);
        }
      }

      S.inited = true;
      S.lastOk = nowTs;
      S.retry = 0;
      saveMeta();
      setState('synced');
    } catch (err) {
      S.err = 'Lỗi đẩy dữ liệu lên đám mây: ' + (err && err.message ? err.message : err);
      setState('error');
      S.retry++;
      clearTimeout(S.retryT);
      S.retryT = setTimeout(() => pushNow(), Math.min(30000, 1500 * Math.pow(2, Math.min(S.retry, 5))));
    } finally {
      S.pushing = false;
    }
  }

  function schedule(delay = 400) {
    if (!enabled() || S.reconciling) return;
    clearTimeout(S.pushT);
    S.pushT = setTimeout(() => {
      if (S.user) {
        pushNow();
      } else {
        updateButtonUI();
      }
    }, delay);
  }

  function active() {
    return Boolean(enabled() && S.user && (S.st === 'synced' || S.st === 'syncing'));
  }

  async function onUser(user) {
    S.user = user || null;
    if (!user) {
      S.subscribed = false;
      setState(navigator.onLine ? 'need-auth' : 'offline');
      return;
    }

    const users = authUsersMap();
    const matched = Object.values(users).find(u => u && String(u.email || '').toLowerCase() === String(user.email || '').toLowerCase());
    S.role = (matched && matched.role) || (user.isAnonymous ? 'guest' : 'admin');
    try {
      localStorage.setItem('lab_user_role', S.role);
    } catch (_) {}

    if (!navigator.onLine) {
      setState('offline');
      return;
    }

    setState('syncing');
    try {
      if (ad && typeof ad.pullAll === 'function') {
        await ad.pullAll();
      }
      if (ad && typeof ad.subscribe === 'function') {
        ad.subscribe((col, id, rec) => applyRemoteRecord(col, id, rec));
      }
      await pushNow();
      setState('synced');
    } catch (err) {
      S.err = 'Không khởi tạo được đồng bộ: ' + (err && err.message ? err.message : err);
      setState('error');
    }
  }

  function closePanel() {
    S.loginOpen = false;
    const host = $('#mdSync');
    if (host) host.innerHTML = '';
  }

  function renderModal() {
    let host = $('#mdSync');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mdSync';
      document.body.appendChild(host);
    }
    if (!S.loginOpen) {
      host.innerHTML = '';
      return;
    }

    const users = authUsersMap();
    const presets = Object.keys(users);
    const presetHtml = presets.map(k => {
      const u = users[k];
      return `<button type="button" class="btn" data-preset="${esc(k)}" style="padding:5px 9px;font-size:12px;">${esc(u.name || k)} (${esc(u.email)})</button>`;
    }).join('');

    const statusLabel = {
      'off': 'Chưa bật đồng bộ',
      'loading': 'Đang tải thư viện...',
      'need-auth': 'Cần đăng nhập để đồng bộ nhiều thiết bị',
      'syncing': 'Đang đồng bộ...',
      'synced': 'Đã đồng bộ nhiều thiết bị',
      'offline': 'Mất kết nối mạng',
      'error': 'Có lỗi kết nối'
    }[S.st] || S.st;

    host.innerHTML = `
      <div class="modal-backdrop" id="syncBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px;">
        <div class="modal" style="width:100%;max-width:440px;background:#fff;color:#111;border-radius:10px;padding:16px;box-shadow:0 12px 30px rgba(0,0,0,.25);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h3 style="margin:0;font-size:17px;">☁ Đồng bộ dữ liệu nhiều thiết bị</h3>
            <button type="button" id="btnCloseSyncModal" style="border:0;background:transparent;font-size:18px;cursor:pointer;">✕</button>
          </div>

          <div style="font-size:13px;padding:8px 10px;border-radius:6px;background:rgba(11,58,91,.07);margin-bottom:12px;">
            <div><b>Trạng thái:</b> ${esc(statusLabel)}</div>
            ${S.user ? `<div><b>Tài khoản:</b> ${esc(S.user.email || ('Khách (' + S.user.uid.slice(0, 6) + ')'))} · <b>Quyền:</b> ${esc(S.role)}</div>` : ''}
            ${S.lastOk ? `<div><b>Lần đồng bộ cuối:</b> ${esc(new Date(S.lastOk).toLocaleTimeString('vi-VN'))}</div>` : ''}
            ${S.err ? `<div style="color:#b91c1c;margin-top:4px;"><b>Chi tiết:</b> ${esc(S.err)}</div>` : ''}
          </div>

          ${!S.user ? `
            <form id="syncLoginForm" style="display:flex;flex-direction:column;gap:8px;">
              ${presetHtml ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;">${presetHtml}</div>` : ''}
              <label style="font-size:12px;font-weight:600;">Email đăng nhập Firebase</label>
              <input id="syncEmail" type="email" placeholder="admin@lab-xvt.local" required style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:6px;">
              <label style="font-size:12px;font-weight:600;">Mật khẩu</label>
              <input id="syncPass" type="password" placeholder="Nhập mật khẩu" required style="padding:7px 9px;border:1px solid #cbd5e1;border-radius:6px;">
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                <button type="submit" class="btn accent">🔑 Đăng nhập đồng bộ</button>
                <button type="button" id="btnSyncGuest" class="btn">👤 Vào chế độ Khách</button>
              </div>
            </form>
          ` : `
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <button type="button" id="btnSyncPushNow" class="btn accent">🔄 Đồng bộ ngay</button>
              <button type="button" id="btnSyncSignOut" class="btn">Đăng xuất</button>
            </div>
          `}
        </div>
      </div>
    `;

    $('#btnCloseSyncModal', host)?.addEventListener('click', closePanel);
    $('#syncBackdrop', host)?.addEventListener('click', e => {
      if (e.target && e.target.id === 'syncBackdrop') closePanel();
    });

    host.querySelectorAll('[data-preset]').forEach(b => {
      b.addEventListener('click', () => {
        const key = b.getAttribute('data-preset');
        const u = users[key];
        const inp = $('#syncEmail', host);
        if (inp && u && u.email) inp.value = u.email;
        $('#syncPass', host)?.focus();
      });
    });

    $('#syncLoginForm', host)?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = ($('#syncEmail', host)?.value || '').trim();
      const pass = $('#syncPass', host)?.value || '';
      if (!email || !pass || !ad) return;
      setState('loading');
      try {
        await ad.signInWithEmail(email, pass);
        if (A && typeof A.toast === 'function') A.toast('Đã đăng nhập đồng bộ nhiều thiết bị');
      } catch (err) {
        S.err = 'Đăng nhập thất bại: ' + (err && err.message ? err.message : err);
        setState('error');
      }
    });

    $('#btnSyncGuest', host)?.addEventListener('click', async () => {
      if (!ad) return;
      setState('loading');
      try {
        await ad.signInGuestOrAnon();
        if (A && typeof A.toast === 'function') A.toast('Đã kết nối chế độ Khách');
      } catch (err) {
        S.err = 'Không vào được chế độ Khách: ' + (err && err.message ? err.message : err);
        setState('error');
      }
    });

    $('#btnSyncPushNow', host)?.addEventListener('click', () => pushNow());
    $('#btnSyncSignOut', host)?.addEventListener('click', async () => {
      if (ad && typeof ad.signOut === 'function') await ad.signOut();
      S.user = null;
      setState('need-auth');
    });
  }

  function openPanel() {
    S.loginOpen = true;
    renderModal();
  }

  function init(app) {
    A = app || window.LabApp;
    const btn = $('#btnSync');
    if (btn && !btn.dataset.syncBound) {
      btn.dataset.syncBound = '1';
      btn.addEventListener('click', () => openPanel());
    }

    window.addEventListener('online', () => {
      if (S.user) pushNow();
      else if (enabled()) setState('need-auth');
    });

    window.addEventListener('offline', () => {
      if (enabled()) setState('offline');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && S.loginOpen) closePanel();
    });

    if (!enabled()) {
      setState('off');
      return;
    }

    S.baseline = buildBaseline();
    const meta = loadMeta();
    if (meta) {
      if (meta.since && typeof meta.since === 'object') S.since = Object.assign({ rows: 0, slips: 0, blocks: 0 }, meta.since);
      if (meta.M && typeof meta.M === 'object') S.M = Object.assign({ rows: {}, slips: {}, blocks: {} }, meta.M);
      S.inited = !!meta.inited;
      S.lastOk = Number(meta.lastOk || 0);
    }

    setState('loading');
    ad = createFirebaseAdapter();
    Promise.resolve(ad.init(onUser)).catch(err => {
      S.err = 'Không khởi tạo được Firebase: ' + (err && err.message ? err.message : err);
      setState('error');
    });
  }

  window.Sync = {
    ver: BUILD,
    init,
    schedule,
    pushNow,
    active,
    open: openPanel
  };
})();
