/* =====================================================================
   assets/sync.js – ĐỒNG BỘ DỮ LIỆU ĐA THIẾT BỊ QUA FIREBASE FIRESTORE
   ===================================================================== */
(function () {
  'use strict';

  const SDK_VER = '10.12.2';
  const LS_USER = 'lab_username';
  const LS_ROLE = 'lab_user_role';
  const LS_PASS = 'lab_user_pass_hash';
  const LS_DEV  = 'lab_device_id';
  const LS_LOGGED_OUT = 'lab_logged_out';

  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const clone = o => {
    try { return JSON.parse(JSON.stringify(o)); } catch (_) { return o; }
  };

  let A = null;
  let CFG = {};
  let syncCfg = {};
  let fbCfg = {};
  let workspace = 'lab-xvt';
  let enabled = false;
  let timer = null;
  let pollTimer = null;
  let pushing = false;
  let paused = false;
  let lastPullAt = 0;
  let lastPushAt = 0;

  let fbApp = null;
  let fbDb = null;
  let fbMod = null;
  let unsubRows = null;
  let unsubSlips = null;

  const S = {
    state: 'init',
    msg: 'Đang kết nối...',
    pending: 0,
    baseline: new Map(),
    slipsBase: new Map()
  };

  function getApp() {
    if (A && A.ST) return A;
    if (window.LabApp && window.LabApp.ST) {
      A = window.LabApp;
      return A;
    }
    return null;
  }

  function deviceId() {
    let id = localStorage.getItem(LS_DEV);
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
      localStorage.setItem(LS_DEV, id);
    }
    return id;
  }

  function currentUser() {
    const loggedOut = localStorage.getItem(LS_LOGGED_OUT) === '1';
    if (loggedOut) return { username: '', role: 'guest' };
    const username = (localStorage.getItem(LS_USER) || '').trim();
    const role = (localStorage.getItem(LS_ROLE) || '').trim() || (username === 'admin' ? 'admin' : 'guest');
    return { username, role };
  }

  function rowKey(sheetId, blockIdx, rowId) {
    return `${sheetId}__${blockIdx}__${rowId}`;
  }

  function rowSig(r) {
    if (!r) return '';
    return JSON.stringify({
      v: r.v || [],
      f: r.f || null,
      src: r.src || '',
      ut: r.ut || 0,
      d: !!r.d
    });
  }

  function slipSig(slip) {
    return JSON.stringify(slip || {});
  }

  function rebuildBaselines() {
    const app = getApp();
    S.baseline.clear();
    if (app && app.ST && Array.isArray(app.ST.sheets)) {
      app.ST.sheets.forEach(s => {
        (s.blocks || []).forEach((b, bi) => {
          (b.rows || []).forEach(r => {
            if (r && r.i) {
              S.baseline.set(rowKey(s.id, bi, r.i), rowSig(r));
            }
          });
        });
      });
    }

    S.slipsBase.clear();
    if (app && app.ST && app.ST.slips) {
      ['xuat', 'nhap'].forEach(k => {
        const list = Array.isArray(app.ST.slips[k]) ? app.ST.slips[k] : [];
        list.forEach(sl => {
          S.slipsBase.set(`${k}__${sl && sl.id ? sl.id : JSON.stringify(sl)}`, slipSig(sl));
        });
      });
    }
  }

  function setStatus(state, msg) {
    const app = getApp();
    S.state = state;
    S.msg = msg;

    const btn = $('#btnSync');
    if (btn) {
      btn.classList.remove('sync-off', 'sync-login', 'sync-ok', 'sync-busy', 'sync-err');
      if (state === 'ok') btn.classList.add('sync-ok');
      else if (state === 'busy' || state === 'init') btn.classList.add('sync-busy');
      else if (state === 'err') btn.classList.add('sync-err');
      else btn.classList.add('sync-off');

      const span = btn.querySelector('span');
      if (span) span.textContent = msg;
    }

    const badge = $('#deviceSyncBadge');
    if (badge) {
      badge.textContent = `☁ ${msg}`;
    }

    const dirtyEl = $('#dirty');
    if (dirtyEl && app && app.ST) {
      dirtyEl.hidden = !app.ST.dirty;
    }
  }

  function applyRoleUI() {
    const u = currentUser();
    const btnEdit = $('#btnEdit');
    if (btnEdit) {
      btnEdit.style.display = '';
    }
    return u;
  }

  async function loadFirestoreModule() {
    if (fbMod) return fbMod;
    const base = (syncCfg.sdkBase || `https://www.gstatic.com/firebasejs/${SDK_VER}/`).replace(/\/?$/, '/');
    const [appM, fsM] = await Promise.all([
      import(`${base}firebase-app.js`),
      import(`${base}firebase-firestore.js`)
    ]);
    fbMod = Object.assign({}, appM, fsM);
    return fbMod;
  }

  async function ensureFirebase() {
    if (fbDb && fbMod) return { db: fbDb, mod: fbMod };
    if (!fbCfg || !fbCfg.projectId || !fbCfg.apiKey) {
      throw new Error('Thiếu cấu hình Firebase (apiKey / projectId)');
    }
    const mod = await loadFirestoreModule();
    const appName = `lab-sync-${workspace}`;
    const existing = mod.getApps().find(x => x.name === appName);
    fbApp = existing || mod.initializeApp(fbCfg, appName);
    fbDb = mod.getFirestore(fbApp);
    return { db: fbDb, mod };
  }

  function rowsColRef(db, mod) {
    return mod.collection(db, 'workspaces', workspace, 'rows');
  }

  function slipsColRef(db, mod) {
    return mod.collection(db, 'workspaces', workspace, 'slips');
  }

  function applyRemoteRowsToApp(docsList) {
    const app = getApp();
    if (!app || !app.ST || !Array.isArray(app.ST.sheets)) return;
    let changed = false;

    const sheetMap = new Map();
    app.ST.sheets.forEach(s => sheetMap.set(s.id, s));

    for (const item of docsList) {
      if (!item || !item.sheetId || !item.rowId) continue;
      const sh = sheetMap.get(item.sheetId);
      if (!sh || !Array.isArray(sh.blocks)) continue;
      const bIdx = Number(item.blockIdx || 0);
      const blk = sh.blocks[bIdx] || sh.blocks[0];
      if (!blk) continue;
      if (!Array.isArray(blk.rows)) blk.rows = [];

      const k = rowKey(item.sheetId, bIdx, item.rowId);
      const localIdx = blk.rows.findIndex(r => r && r.i === item.rowId);
      const localRow = localIdx >= 0 ? blk.rows[localIdx] : null;
      const localUt = Number((localRow && localRow.ut) || 0);
      const remoteUt = Number(item.ut || 0);

      if (item.d) {
        if (localIdx >= 0 && (!localUt || remoteUt >= localUt)) {
          blk.rows.splice(localIdx, 1);
          S.baseline.delete(k);
          changed = true;
        }
        continue;
      }

      const incomingRow = {
        i: item.rowId,
        r: Number(item.r || (localIdx >= 0 ? localIdx + 1 : blk.rows.length + 1)),
        src: item.src || '',
        v: Array.isArray(item.v) ? item.v.slice() : [],
        f: item.f && typeof item.f === 'object' ? clone(item.f) : undefined,
        ct: Number(item.ct || Date.now()),
        ut: remoteUt || Date.now()
      };

      if (localIdx < 0) {
        blk.rows.push(incomingRow);
        S.baseline.set(k, rowSig(incomingRow));
        changed = true;
      } else if (remoteUt > localUt || (!localRow.ut && rowSig(localRow) !== rowSig(incomingRow))) {
        blk.rows[localIdx] = Object.assign({}, localRow, incomingRow);
        S.baseline.set(k, rowSig(blk.rows[localIdx]));
        changed = true;
      }
    }

    if (changed) {
      app.ST.dirty = false;
      if (typeof app.refresh === 'function') {
        app.refresh();
      }
    }
  }

  function applyRemoteSlipsToApp(docsList) {
    const app = getApp();
    if (!app || !app.ST || !syncCfg.syncSlips) return;
    if (!app.ST.slips || typeof app.ST.slips !== 'object') {
      app.ST.slips = { xuat: [], nhap: [] };
    }
    let changed = false;

    for (const item of docsList) {
      const kind = item && item.kind === 'nhap' ? 'nhap' : 'xuat';
      if (!item || !item.slip || !item.slip.id) continue;
      if (!Array.isArray(app.ST.slips[kind])) app.ST.slips[kind] = [];
      const idx = app.ST.slips[kind].findIndex(x => x && x.id === item.slip.id);
      if (item.d) {
        if (idx >= 0) {
          app.ST.slips[kind].splice(idx, 1);
          changed = true;
        }
        continue;
      }
      if (idx < 0) {
        app.ST.slips[kind].push(clone(item.slip));
        changed = true;
      } else if (slipSig(app.ST.slips[kind][idx]) !== slipSig(item.slip)) {
        app.ST.slips[kind][idx] = clone(item.slip);
        changed = true;
      }
    }

    if (changed && typeof app.refresh === 'function') {
      app.refresh();
    }
  }

  async function pullNow() {
    if (!enabled || paused) return;
    try {
      const { db, mod } = await ensureFirebase();
      const [rowSnap, slipSnap] = await Promise.all([
        mod.getDocs(rowsColRef(db, mod)),
        syncCfg.syncSlips ? mod.getDocs(slipsColRef(db, mod)) : Promise.resolve(null)
      ]);

      const rows = [];
      rowSnap.forEach(docSnap => {
        const d = docSnap.data();
        if (d) rows.push(d);
      });
      applyRemoteRowsToApp(rows);

      if (slipSnap) {
        const slips = [];
        slipSnap.forEach(docSnap => {
          const d = docSnap.data();
          if (d) slips.push(d);
        });
        applyRemoteSlipsToApp(slips);
      }

      lastPullAt = Date.now();
      if (!pushing) {
        setStatus('ok', 'Đã đồng bộ');
      }
    } catch (_) {
      setStatus('err', 'Lỗi đồng bộ');
    }
  }

  function computePendingRowOps() {
    const app = getApp();
    const ops = [];
    if (!app || !app.ST || !Array.isArray(app.ST.sheets)) return ops;

    const seenKeys = new Set();

    app.ST.sheets.forEach(s => {
      (s.blocks || []).forEach((b, bi) => {
        (b.rows || []).forEach((r, ri) => {
          if (!r || !r.i) return;
          const k = rowKey(s.id, bi, r.i);
          seenKeys.add(k);
          const sig = rowSig(r);
          if (S.baseline.get(k) !== sig) {
            ops.push({
              type: 'upsertRow',
              key: k,
              docId: encodeURIComponent(k),
              sig,
              data: {
                sheetId: s.id,
                blockIdx: bi,
                rowId: r.i,
                r: r.r || (ri + 1),
                src: r.src || (Array.isArray(r.v) ? r.v[0] : ''),
                v: Array.isArray(r.v) ? r.v.slice() : [],
                f: r.f && typeof r.f === 'object' ? clone(r.f) : null,
                ct: Number(r.ct || Date.now()),
                ut: Number(r.ut || Date.now()),
                d: false,
                dev: deviceId(),
                by: currentUser().username || 'device'
              }
            });
          }
        });
      });
    });

    for (const [k, prevSig] of S.baseline.entries()) {
      if (!seenKeys.has(k) && prevSig) {
        const parts = k.split('__');
        const sheetId = parts[0] || '';
        const blockIdx = Number(parts[1] || 0);
        const rowId = parts.slice(2).join('__');
        if (sheetId && rowId) {
          ops.push({
            type: 'deleteRow',
            key: k,
            docId: encodeURIComponent(k),
            sig: '',
            data: {
              sheetId,
              blockIdx,
              rowId,
              d: true,
              ut: Date.now(),
              dev: deviceId(),
              by: currentUser().username || 'device'
            }
          });
        }
      }
    }

    return ops;
  }

  async function pushNow(showToast = false) {
    const app = getApp();
    if (!enabled || paused || !app || !app.ST) return;
    if (pushing) return;

    const rowOps = computePendingRowOps();
    S.pending = rowOps.length;

    if (!rowOps.length) {
      app.ST.dirty = false;
      if (typeof app.saveLocal === 'function') app.saveLocal();
      setStatus('ok', 'Đã đồng bộ');
      if (showToast && typeof app.toast === 'function') {
        app.toast('Dữ liệu đã đồng bộ trên đám mây');
      }
      return;
    }

    pushing = true;
    setStatus('busy', `Đang đẩy (${rowOps.length})...`);

    try {
      const { db, mod } = await ensureFirebase();
      const col = rowsColRef(db, mod);
      const chunkSize = 200;

      for (let i = 0; i < rowOps.length; i += chunkSize) {
        const chunk = rowOps.slice(i, i + chunkSize);
        const batch = mod.writeBatch(db);
        chunk.forEach(op => {
          const ref = mod.doc(col, op.docId);
          batch.set(ref, op.data, { merge: true });
        });
        await batch.commit();
        chunk.forEach(op => {
          if (op.type === 'deleteRow') S.baseline.delete(op.key);
          else S.baseline.set(op.key, op.sig);
        });
      }

      S.pending = 0;
      lastPushAt = Date.now();
      app.ST.dirty = false;
      if (typeof app.saveLocal === 'function') app.saveLocal();
      setStatus('ok', 'Đã đồng bộ');
      if (showToast && typeof app.toast === 'function') {
        app.toast('Đã đồng bộ dữ liệu lên đám mây');
      }
    } catch (_) {
      setStatus('err', 'Lỗi đẩy dữ liệu');
      if (showToast && typeof app.toast === 'function') {
        app.toast('Không thể đẩy dữ liệu lên cloud', 3500);
      }
    } finally {
      pushing = false;
    }
  }

  function schedule(ms) {
    if (!enabled || paused) return;
    clearTimeout(timer);
    const delay = typeof ms === 'number' ? ms : (Number(syncCfg.debounceMs) || 250);
    setStatus('busy', 'Chờ đồng bộ...');
    timer = setTimeout(() => {
      pushNow(false);
    }, delay);
  }

  async function subscribeRealtime() {
    if (!enabled) return;
    try {
      const { db, mod } = await ensureFirebase();
      if (typeof unsubRows === 'function') {
        try { unsubRows(); } catch (_) {}
      }
      unsubRows = mod.onSnapshot(
        rowsColRef(db, mod),
        snap => {
          if (paused) return;
          const list = [];
          snap.forEach(docSnap => {
            const d = docSnap.data();
            if (d) list.push(d);
          });
          applyRemoteRowsToApp(list);
          lastPullAt = Date.now();
          if (!pushing && !computePendingRowOps().length) {
            setStatus('ok', 'Đã đồng bộ');
          }
        },
        () => {
          setStatus('err', 'Mất kết nối realtime');
        }
      );

      if (syncCfg.syncSlips) {
        if (typeof unsubSlips === 'function') {
          try { unsubSlips(); } catch (_) {}
        }
        unsubSlips = mod.onSnapshot(
          slipsColRef(db, mod),
          snap => {
            if (paused) return;
            const list = [];
            snap.forEach(docSnap => {
              const d = docSnap.data();
              if (d) list.push(d);
            });
            applyRemoteSlipsToApp(list);
          },
          () => {}
        );
      }
    } catch (_) {
      setStatus('err', 'Lỗi kết nối Firebase');
    }
  }

  function startPolling() {
    clearInterval(pollTimer);
    const interval = Math.max(5000, Number(syncCfg.pollIntervalMs) || 12000);
    pollTimer = setInterval(() => {
      if (enabled && !paused && !pushing && document.visibilityState !== 'hidden') {
        pullNow();
      }
    }, interval);
  }

  function openPanel() {
    const app = getApp();
    const root = $('#modalRoot') || document.body;
    let modal = $('#mdSync', root);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mdSync';
      root.appendChild(modal);
    }

    const u = currentUser();
    const users = (CFG && CFG.authUsers) || {};
    const userList = Object.keys(users).length ? Object.keys(users) : ['admin', 'khach'];

    modal.innerHTML = `
      <div class="modal-backdrop" id="syncBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px;">
        <div class="modal" style="width:100%;max-width:460px;background:#fff;color:#111;border-radius:10px;padding:16px;box-shadow:0 12px 30px rgba(0,0,0,.25);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h3 style="margin:0;font-size:17px;">☁ Đồng bộ đa thiết bị & Tài khoản</h3>
            <button type="button" id="btnCloseSyncMd" style="border:0;background:transparent;font-size:18px;cursor:pointer;">✕</button>
          </div>

          <div style="padding:10px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;margin-bottom:12px;">
            <div>Trạng thái: <b>${esc(S.msg)}</b> (${enabled ? 'Firebase Firestore' : 'Chưa bật'})</div>
            <div>Workspace: <b>${esc(workspace)}</b> · Thiết bị: <code>${esc(deviceId())}</code></div>
            <div>Tài khoản hiện tại: <b>${esc(u.username || 'Mặc định')}</b> (${esc(u.role)})</div>
          </div>

          <form id="syncLoginForm" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;">Tên đăng nhập (${esc(userList.join(' / '))})
              <input id="syncUserInp" list="syncUserList" type="text" value="${esc(u.username || 'admin')}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">
              <datalist id="syncUserList">
                ${userList.map(k => `<option value="${esc(k)}">`).join('')}
              </datalist>
            </label>
            <label style="font-size:12px;font-weight:600;">Mật khẩu (tuỳ chọn)
              <input id="syncPassInp" type="password" placeholder="Nhập mật khẩu nếu có..." style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #cbd5e1;border-radius:6px;">
            </label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
              <button type="submit" class="btn accent">Lưu tài khoản</button>
              <button type="button" id="btnSyncNowMd" class="btn">🔄 Đồng bộ ngay</button>
              <button type="button" id="btnLogoutSyncMd" class="btn">Đăng xuất</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modal.innerHTML = ''; };
    $('#btnCloseSyncMd', modal)?.addEventListener('click', close);
    $('#syncBackdrop', modal)?.addEventListener('click', e => {
      if (e.target && e.target.id === 'syncBackdrop') close();
    });

    $('#syncLoginForm', modal)?.addEventListener('submit', e => {
      e.preventDefault();
      const uname = ($('#syncUserInp', modal)?.value || '').trim() || 'admin';
      const pass = $('#syncPassInp', modal)?.value || '';
      const info = users[uname] || {};
      const role = info.role || (uname === 'admin' ? 'admin' : 'guest');
      localStorage.setItem(LS_LOGGED_OUT, '0');
      localStorage.setItem(LS_USER, uname);
      localStorage.setItem(LS_ROLE, role);
      if (pass) localStorage.setItem(LS_PASS, btoa(unescape(encodeURIComponent(pass))));
      applyRoleUI();
      if (app && typeof app.refresh === 'function') app.refresh();
      close();
      if (app && typeof app.toast === 'function') app.toast(`Đã chuyển sang tài khoản ${uname}`);
      pushNow(false);
    });

    $('#btnSyncNowMd', modal)?.addEventListener('click', async () => {
      await pullNow();
      await pushNow(true);
    });

    $('#btnLogoutSyncMd', modal)?.addEventListener('click', () => {
      localStorage.setItem(LS_LOGGED_OUT, '1');
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_ROLE);
      applyRoleUI();
      if (app && typeof app.refresh === 'function') app.refresh();
      close();
      if (app && typeof app.toast === 'function') app.toast('Đã đăng xuất tài khoản');
    });
  }

  async function init(appRef) {
    A = appRef || window.LabApp;
    if (!A || !A.ST) return;

    CFG = A.CFG || window.APP_CONFIG || {};
    syncCfg = Object.assign({
      provider: 'firebase',
      workspace: 'lab-xvt',
      autoSync: true,
      realtime: true,
      pullOnFocus: true,
      pullOnVisible: true,
      allowGuestWrite: true,
      debounceMs: 250,
      pollIntervalMs: 12000,
      syncSlips: true
    }, (CFG && CFG.sync) || {});

    fbCfg = Object.assign({}, (syncCfg && syncCfg.firebase) || {});
    workspace = String(syncCfg.workspace || 'lab-xvt').trim() || 'lab-xvt';
    enabled = syncCfg.provider === 'firebase' && !!(fbCfg.projectId && fbCfg.apiKey);

    rebuildBaselines();
    applyRoleUI();

    const btnSync = $('#btnSync');
    if (btnSync && !btnSync._syncBound) {
      btnSync._syncBound = true;
      btnSync.addEventListener('click', openPanel);
    }

    if (!enabled) {
      setStatus('off', 'Chỉ trên máy');
      return;
    }

    setStatus('busy', 'Đang kết nối...');
    await pullNow();
    if (syncCfg.realtime !== false) {
      await subscribeRealtime();
    }
    startPolling();

    if (syncCfg.pullOnFocus !== false && !window._labSyncFocusBound) {
      window._labSyncFocusBound = true;
      window.addEventListener('focus', () => {
        if (enabled && !paused && Date.now() - lastPullAt > 2000) {
          pullNow();
        }
      });
    }

    if (syncCfg.pullOnVisible !== false && !window._labSyncVisBound) {
      window._labSyncVisBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && enabled && !paused && Date.now() - lastPullAt > 2000) {
          pullNow();
        }
      });
    }

    if (A.ST && A.ST.dirty) {
      pushNow(false);
    }
  }

  window.Sync = {
    init,
    schedule,
    pushNow: () => pushNow(true),
    pullNow,
    open: openPanel,
    active: () => enabled && !paused,
    currentUser
  };
})();
