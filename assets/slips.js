/* =====================================================================
   assets/slips.js – MODULE TIỆN ÍCH VẬT TƯ / TÀI SẢN LAB
   Phiên bản: 2026.11.21-5
   ===================================================================== */
(function () {
  'use strict';

  var A = null;
  var BUILD = '2026.11.21-5';

  var SOURCE_OPTIONS = ['Vật tư', 'Tài sản', 'Đo kiểm', 'Sửa chữa', 'Không rõ nguồn'];
  var DEFAULT_SOURCE = 'Không rõ nguồn';
  var STANDARD_COLS = ['Nguồn', 'STT', 'Tên Vật Tư', 'Serial', 'Mã VT', 'Part number', 'Ghi chú'];

  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) {
    return A && typeof A.esc === 'function'
      ? A.esc(s == null ? '' : s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
  }
  function fold(s) {
    return A && typeof A.fold === 'function'
      ? A.fold(s)
      : String(s || '').toLowerCase();
  }

  function getSources() {
    if (A && Array.isArray(A.SOURCE_OPTIONS) && A.SOURCE_OPTIONS.length) return A.SOURCE_OPTIONS;
    if (window.APP_CONFIG && Array.isArray(window.APP_CONFIG.sourceOptions) && window.APP_CONFIG.sourceOptions.length) {
      return window.APP_CONFIG.sourceOptions;
    }
    return SOURCE_OPTIONS;
  }

  function normalizeSource(val, fallback) {
    var def = fallback || DEFAULT_SOURCE;
    var list = getSources();
    if (!val) return def;
    var raw = String(val).trim();
    var exact = list.filter(function (x) { return x.toLowerCase() === raw.toLowerCase(); })[0];
    if (exact) return exact;
    var f = fold(raw);
    if (f.indexOf('tai san') >= 0) return 'Tài sản';
    if (f.indexOf('do kiem') >= 0) return 'Đo kiểm';
    if (f.indexOf('sua chua') >= 0) return 'Sửa chữa';
    if (f.indexOf('vat tu') >= 0) return 'Vật tư';
    if (f.indexOf('khong ro') >= 0) return 'Không rõ nguồn';
    return def;
  }

  function ensureStandardRow(row, idx, fallbackSource) {
    var list = getSources();
    var src = normalizeSource((row && row.src) || (row && row.v && row.v[0]), fallbackSource || DEFAULT_SOURCE);
    if (!Array.isArray(row.v)) {
      row.v = [src, String((idx || 0) + 1), '', '', '', '', ''];
    } else {
      var hasSrcFirst = row.v.length >= 7 && list.some(function (opt) { return fold(opt) === fold(row.v[0]); });
      if (!hasSrcFirst) {
        var old = row.v.slice();
        row.v = [
          src,
          String(old[0] != null ? old[0] : (idx || 0) + 1),
          String(old[2] || ''),
          String(old[3] || ''),
          String(old[1] || ''),
          String(old[4] || ''),
          String(old[5] || '')
        ];
      } else {
        row.v[0] = src;
        if (!row.v[1]) row.v[1] = String((idx || 0) + 1);
        for (var k = 2; k < STANDARD_COLS.length; k++) {
          if (row.v[k] == null) row.v[k] = '';
        }
      }
    }
    row.src = src;
    delete row.x;
    delete row.n;
    return row;
  }

  function normalizeAllState() {
    if (!A || !A.ST || !Array.isArray(A.ST.sheets)) return;
    A.ST.sheets.forEach(function (s) {
      var defSrc = (s.id === 'tai-san-khac' || fold(A.labelOf ? A.labelOf(s) : s.name).indexOf('tai san') >= 0)
        ? 'Tài sản'
        : DEFAULT_SOURCE;
      (s.blocks || []).forEach(function (b) {
        b.cols = STANDARD_COLS.slice();
        (b.rows || []).forEach(function (r, i) {
          ensureStandardRow(r, i, defSrc);
        });
      });
    });
  }

  function reindexRows(block) {
    (block.rows || []).forEach(function (r, idx) {
      r.r = idx + 1;
      if (Array.isArray(r.v)) r.v[1] = String(idx + 1);
    });
  }

  function moveRowToSheet(sourceSheetId, blockIdx, rowIdx, targetSheetId) {
    if (!A || !A.ST || !A.sheetById) return false;
    var srcSheet = A.sheetById(sourceSheetId);
    var dstSheet = A.sheetById(targetSheetId);
    if (!srcSheet || !dstSheet || srcSheet.id === dstSheet.id) return false;

    var srcBlock = srcSheet.blocks && srcSheet.blocks[blockIdx];
    if (!srcBlock || !srcBlock.rows || !srcBlock.rows[rowIdx]) return false;

    if (!Array.isArray(dstSheet.blocks) || !dstSheet.blocks.length) {
      dstSheet.blocks = [{
        title: A.labelOf ? A.labelOf(dstSheet) : dstSheet.name,
        hr: 1,
        cols: STANDARD_COLS.slice(),
        rows: []
      }];
    }
    var dstBlock = dstSheet.blocks[0];
    if (!Array.isArray(dstBlock.rows)) dstBlock.rows = [];

    var moved = srcBlock.rows.splice(rowIdx, 1)[0];
    ensureStandardRow(moved, dstBlock.rows.length, moved.src);
    dstBlock.rows.push(moved);

    reindexRows(srcBlock);
    reindexRows(dstBlock);

    if (A.touch) A.touch(moved);
    if (A.persist) A.persist();
    if (A.keepScroll && A.render) A.keepScroll(A.render);
    else if (A.render) A.render();
    if (A.toast) A.toast('Đã chuyển sang "' + (A.labelOf ? A.labelOf(dstSheet) : dstSheet.name) + '"');
    return true;
  }

  function openMovePicker(sourceSheetId, blockIdx, rowIdx) {
    if (!A || !A.ST || !Array.isArray(A.ST.sheets) || !A.sheetById) return;
    var srcSheet = A.sheetById(sourceSheetId);
    if (!srcSheet) return;
    var srcBlock = srcSheet.blocks && srcSheet.blocks[blockIdx];
    var row = srcBlock && srcBlock.rows && srcBlock.rows[rowIdx];
    if (!row) return;

    var targets = A.ST.sheets.filter(function (s) { return s.id !== srcSheet.id; });
    if (!targets.length) {
      if (A.toast) A.toast('Không có thư mục đích nào khác.');
      return;
    }

    var root = $('#modalRoot') || document.body;
    var old = $('#slipsMoveModal');
    if (old) old.remove();

    var tenVT = (row.v && row.v[2]) || '(Chưa có tên)';
    var serial = (row.v && row.v[3]) || '-';
    var maVT = (row.v && row.v[4]) || '-';
    var opts = targets.map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(A.labelOf ? A.labelOf(s) : s.name) + '</option>';
    }).join('');

    var wrap = document.createElement('div');
    wrap.id = 'slipsMoveModal';
    wrap.innerHTML =
      '<div class="modal-back" style="display:flex">' +
        '<div class="modal" style="max-width:440px">' +
          '<div class="modal-head">' +
            '<h2>➜ Chuyển sang thư mục khác</h2>' +
            '<button type="button" class="modal-x" id="slipsMoveClose">✕</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<p style="margin:0 0 6px"><b>Tên Vật Tư:</b> ' + esc(tenVT) + '</p>' +
            '<p style="margin:0 0 6px"><b>Serial:</b> ' + esc(serial) + ' · <b>Mã VT:</b> ' + esc(maVT) + '</p>' +
            '<p style="margin:0 0 12px"><b>Thư mục hiện tại:</b> ' + esc(A.labelOf ? A.labelOf(srcSheet) : srcSheet.name) + '</p>' +
            '<label class="fld">' +
              '<span>Chọn thư mục đích:</span>' +
              '<select id="slipsMoveTarget">' + opts + '</select>' +
            '</label>' +
            '<div class="sy-btns" style="margin-top:14px">' +
              '<button type="button" class="tbtn primary" id="slipsMoveConfirm">Xác nhận chuyển</button>' +
              '<button type="button" class="tbtn" id="slipsMoveCancel">Hủy</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    root.appendChild(wrap);

    function close() {
      var el = $('#slipsMoveModal');
      if (el) el.remove();
    }

    $('#slipsMoveClose').addEventListener('click', close);
    $('#slipsMoveCancel').addEventListener('click', close);
    $('#slipsMoveConfirm').addEventListener('click', function () {
      var targetId = $('#slipsMoveTarget').value;
      close();
      moveRowToSheet(sourceSheetId, blockIdx, rowIdx, targetId);
    });
  }

  function bindGlobal() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-move-row]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var tr = btn.closest('tr[data-s]');
      if (!tr) return;
      openMovePicker(tr.dataset.s, +tr.dataset.b, +tr.dataset.r);
    });

    document.addEventListener('change', function (e) {
      var sel = e.target.closest('select[data-row-source]');
      if (!sel || !A || !A.sheetById) return;
      var tr = sel.closest('tr[data-s]');
      if (!tr) return;
      var s = A.sheetById(tr.dataset.s);
      var b = s && s.blocks && s.blocks[+tr.dataset.b];
      var row = b && b.rows && b.rows[+tr.dataset.r];
      if (!row) return;
      var nextSrc = normalizeSource(sel.value, DEFAULT_SOURCE);
      ensureStandardRow(row, +tr.dataset.r, nextSrc);
      row.src = nextSrc;
      row.v[0] = nextSrc;
      if (A.touch) A.touch(row);
      if (A.persist) A.persist();
      if (A.toast) A.toast('Nguồn: ' + nextSrc, 1400);
    });
  }

  window.Slips = {
    ver: BUILD,
    disabled: true,
    sources: getSources,
    columns: STANDARD_COLS.slice(),
    normalizeSource: normalizeSource,
    ensureStandardRow: ensureStandardRow,
    normalizeAllState: normalizeAllState,
    moveRowToSheet: moveRowToSheet,
    openMovePicker: openMovePicker,
    init: function (app) {
      try {
        if (A) return;
        A = app;
        normalizeAllState();
        bindGlobal();
      } catch (e) {
        /* bỏ qua lỗi phụ trợ */
      }
    }
  };
})();
