/* =====================================================================
   slips.js – PHIẾU XUẤT KHO (Mẫu số 02 VT-DN), PHIẾU NHẬP KHO (Mẫu số 1 VT-DN)
   & BIÊN BẢN NGHIỆM THU, BÀN GIAO (BM-KTTC001) kèm mã QR
   ===================================================================== */
(function () {
  'use strict';
  var A = null;                                   // LabApp
  var TYPES = {
    xuat: { letter: 'X', title: 'PHIẾU XUẤT KHO', plural: 'Phiếu xuất kho', icon: '📤', dateWord: 'Xuất', fromTo: 'Tên đơn vị nhận' },
    nhap: { letter: 'N', title: 'PHIẾU NHẬP KHO', plural: 'Phiếu nhập kho', icon: '📥', dateWord: 'Nhập', fromTo: 'Tên đơn vị bán' }
  };
  var FIELDS = {
    xuat: [['donVi', 'Tên đơn vị nhận', 'text', 'w'], ['mst', 'Mã số thuế', 'text'], ['diaChi', 'Địa chỉ', 'text', 'w'], ['qd', 'Theo số QĐ', 'text', 'w'],
           ['no', 'Nợ', 'text'], ['co', 'Có', 'text'], ['dungCho', 'Xuất dùng cho (Nghiệp vụ, dịch vụ)', 'area'],
           ['kho', 'Xuất tại kho', 'text', 'w'], ['maCT', 'Mã CT', 'text'], ['lien', 'Liên', 'text']],
    nhap: [['donVi', 'Tên đơn vị bán (đơn vị giao hàng)', 'text', 'w'], ['mst', 'Mã số thuế', 'text'], ['hopDong', 'Theo hợp đồng số', 'text', 'w'], ['ngayHD', 'Ngày (hợp đồng)', 'text'],
           ['no', 'Nợ', 'text'], ['co', 'Có', 'text'], ['kho', 'Nhập tại kho', 'text', 'w'], ['lien', 'Liên', 'text'], ['thue', 'Tổng thuế', 'number']]
  };
  var SIGNERS = {
    xuat: [['thuTruong', 'Thủ trưởng DV'], ['ketToan', 'Kế toán trưởng'], ['nguoiLap', 'Người lập phiếu'], ['nguoiNhan', 'Người nhận hàng'], ['thuKho', 'Thủ kho']],
    nhap: [['thuTruong', 'Thủ trưởng đơn vị'], ['ketToan', 'Kế toán trưởng'], ['nguoiLap', 'Người lập phiếu'], ['nguoiGiao', 'Người giao hàng'], ['thuKho', 'Thủ kho']]
  };
  var BUILD = '2026.11.08-5';

  var PAPER_CSS = `/* --- GIẤY IN (dùng chung cho xem trước & in) --- */
.paper{position:relative;background:#fff;color:#000;font-family:"Times New Roman",Times,"Liberation Serif",serif;font-size:11pt;line-height:1.35;
  width:210mm;min-height:297mm;padding:12mm 14mm;margin:0 auto 14mm;box-shadow:0 2px 12px rgba(0,0,0,.3);box-sizing:border-box}
.paper *{box-sizing:border-box}
.paper .p-top{display:flex;justify-content:space-between;gap:12px;font-weight:700;font-size:10.5pt}
.paper .p-org div{line-height:1.35} .paper .p-form{white-space:nowrap;font-size:10pt}
.paper .p-head{display:grid;grid-template-columns:1fr 28mm;gap:6mm;margin:10px 0 4px;align-items:start}
.paper .p-title{text-align:center;grid-column:1} .paper .p-title h1{margin:0 0 2px;font-size:16pt;letter-spacing:.5px}
.paper .p-qr{grid-column:2;grid-row:1;width:28mm;height:28mm;justify-self:end} .paper .p-qr svg{width:100%;height:100%;display:block}
.paper .p-info{margin:6px 0 6px;font-size:11pt}
.paper .g2{display:grid;grid-template-columns:1fr 38%;gap:8px;margin:1px 0}
.paper .k{font-weight:400} .paper .bd{font-weight:700}
.paper .dots{display:inline-block;min-width:34mm;border-bottom:1px dotted #000;height:1em;vertical-align:baseline}
.paper .p-tbl{width:100%;border-collapse:collapse;font-size:9.5pt;table-layout:fixed}
.paper .p-tbl th,.paper .p-tbl td{border:1px solid #000;padding:3px 4px;vertical-align:middle;overflow-wrap:anywhere}
.paper .p-tbl th{font-weight:700;text-align:center;background:#fff}
.paper .p-tbl th.sm{font-size:8.5pt;padding:2px 1px}
.paper .p-tbl tr.ltr th{font-weight:700;padding:2px}
.paper .p-tbl td.c{text-align:center} .paper .p-tbl td.r{text-align:right} .paper .p-tbl td.m{white-space:nowrap;font-size:9pt} .paper .p-tbl td.lot{font-size:8.5pt}
.paper .p-tbl .sub{font-size:8pt;color:#222;margin-top:1px} .paper .p-tbl .sub.cat{color:#555;font-style:italic}
.paper .p-tbl tr{height:11mm}
.paper .p-tbl tr.tot{height:6mm} .paper .p-tbl tr.ltr{height:5mm}
.paper .p-after{margin-top:8px;font-size:11pt} .paper .p-after .note{margin-top:4px}
.paper .p-date{text-align:right;font-style:italic;font-size:10pt;margin:10px 4px 6px}
.paper .p-sign{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;text-align:center;font-size:10.5pt}
.paper .p-sign .small{font-style:italic;font-size:9pt;font-weight:400} .paper .p-sign .sname{margin-top:34mm;font-weight:700;min-height:1em}
.paper .p-page{position:absolute;right:10mm;bottom:8mm;font-size:11pt}

/* --- STYLE RIÊNG CHO BIÊN BẢN BÀN GIAO (BM-KTTC001) --- */
.bbbg-form-code{text-align:right;font-weight:700;font-size:11pt;margin-bottom:4px}
.bbbg-header{display:grid;grid-template-columns:48% 52%;text-align:center;margin-bottom:14px}
.bbbg-header .left{font-weight:700;font-size:11pt;line-height:1.4}
.bbbg-header .right{font-weight:700;font-size:11pt;line-height:1.4}
.bbbg-header .right .sub-motto{font-size:11.5pt;border-bottom:1px solid #000;display:inline-block;padding-bottom:2px}
.bbbg-header .right .date-line{font-weight:400;font-style:italic;margin-top:6px;font-size:11pt}
.bbbg-title{text-align:center;margin:12px 0 10px}
.bbbg-title h1{margin:0;font-size:14pt;font-weight:700;text-transform:uppercase}
.bbbg-title .sub{font-size:12pt;font-weight:700;margin-top:2px}
.bbbg-p{margin:5px 0;font-size:11.5pt;line-height:1.45;text-align:justify}
.bbbg-sec{font-weight:700;text-transform:uppercase;margin:10px 0 4px;font-size:11.5pt}
.bbbg-rep{display:grid;grid-template-columns:52% 48%;margin:3px 0 3px 10px;font-size:11.5pt}
.bbbg-tbl{width:100%;border-collapse:collapse;margin:10px 0;font-size:11pt}
.bbbg-tbl th,.bbbg-tbl td{border:1px solid #000;padding:6px 5px;vertical-align:middle}
.bbbg-tbl th{font-weight:700;text-align:center;text-transform:uppercase;font-size:10.5pt}
.bbbg-tbl td.c{text-align:center}
.bbbg-sign{display:grid;grid-template-columns:1fr 1fr;text-align:center;margin-top:18px;font-weight:700;font-size:11.5pt}
.bbbg-sign .space{height:28mm}

@media print{
  body.print-slip>*:not(#printRoot){display:none !important}
  body.print-slip{background:#fff !important;overflow:visible !important}
  body.print-slip #printRoot{display:block !important}
  body.print-slip .paper{width:190mm;min-height:274mm;padding:0;margin:0;box-shadow:none;break-after:page;page-break-after:always;zoom:1 !important}
  body.print-slip .paper:last-child{break-after:auto;page-break-after:auto}
  body.print-slip .paper *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body.print-slip .paper .p-page{right:0;bottom:0}
}`;

  var QRLIB = (function (root) {
    'use strict';
    var ECC_CW = [
      [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
      [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    ];
    var NUM_BLK = [
      [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
      [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
      [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
      [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
    ];
    var ECL = { L: 0, M: 1, Q: 2, H: 3 }, FMT = [1, 0, 3, 2];

    function rawModules(v) {
      var r = (16 * v + 128) * v + 64;
      if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
      return r;
    }
    function dataCodewords(v, e) { return Math.floor(rawModules(v) / 8) - ECC_CW[e][v] * NUM_BLK[e][v]; }
    function pushBits(a, val, len) { for (var i = len - 1; i >= 0; i--) a.push((val >>> i) & 1); }
    function gfMul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
    function rsDivisor(deg) {
      var r = new Array(deg).fill(0); r[deg - 1] = 1; var root = 1;
      for (var i = 0; i < deg; i++) { for (var j = 0; j < deg; j++) { r[j] = gfMul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = gfMul(root, 2); }
      return r;
    }
    function rsRemainder(data, div) {
      var r = new Array(div.length).fill(0);
      data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= gfMul(c, f); }); });
      return r;
    }
    function alignPos(v, size) {
      if (v === 1) return [];
      var n = Math.floor(v / 7) + 2, step = (v === 32) ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, res = [6];
      for (var p = size - 7; res.length < n; p -= step) res.splice(1, 0, p);
      return res;
    }
    function build(ver, ecl, data) {
      var size = ver * 4 + 17, i, j, x, y;
      var mod = [], fn = [];
      for (i = 0; i < size; i++) { mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
      function setFn(px, py, dark) { mod[py][px] = dark; fn[py][px] = true; }
      function drawFormat(mask) {
        var d = (FMT[ecl] << 3) | mask, rem = d, k;
        for (k = 0; k < 10; k++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        var bits = ((d << 10) | rem) ^ 0x5412;
        function bit(n) { return ((bits >>> n) & 1) !== 0; }
        for (k = 0; k <= 5; k++) setFn(8, k, bit(k));
        setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
        for (k = 9; k < 15; k++) setFn(14 - k, 8, bit(k));
        for (k = 0; k < 8; k++) setFn(size - 1 - k, 8, bit(k));
        for (k = 8; k < 15; k++) setFn(8, size - 15 + k, bit(k));
        setFn(8, size - 8, true);
      }
      for (i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
      function finder(cx, cy) {
        for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
          var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, d !== 2 && d !== 4);
        }
      }
      finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
      var ap = alignPos(ver, size), n = ap.length;
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setFn(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
      drawFormat(0);
      if (ver >= 7) {
        var rem = ver; for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
        var vb = (ver << 12) | rem;
        for (i = 0; i < 18; i++) { var c = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, b = Math.floor(i / 3); setFn(a, b, c); setFn(b, a, c); }
      }
      var numBlocks = NUM_BLK[ecl][ver], eccLen = ECC_CW[ecl][ver], raw = Math.floor(rawModules(ver) / 8);
      var shortBlocks = numBlocks - raw % numBlocks, shortLen = Math.floor(raw / numBlocks), blocks = [], div = rsDivisor(eccLen), k = 0;
      for (i = 0; i < numBlocks; i++) {
        var dat = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1)); k += dat.length;
        var ecc = rsRemainder(dat, div); if (i < shortBlocks) dat.push(0); blocks.push(dat.concat(ecc));
      }
      var all = [];
      for (i = 0; i < blocks[0].length; i++) blocks.forEach(function (blk, jj) { if (i !== shortLen - eccLen || jj >= shortBlocks) all.push(blk[i]); });
      var bi = 0;
      for (var right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
          x = right - j; var upward = ((right + 1) & 2) === 0; y = upward ? size - 1 - vert : vert;
          if (!fn[y][x] && bi < all.length * 8) { mod[y][x] = ((all[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
        }
      }
      function applyMask(m) {
        for (y = 0; y < size; y++) for (x = 0; x < size; x++) {
          var inv;
          switch (m) {
            case 0: inv = (x + y) % 2 === 0; break; case 1: inv = y % 2 === 0; break; case 2: inv = x % 3 === 0; break;
            case 3: inv = (x + y) % 3 === 0; break; case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5: inv = x * y % 2 + x * y % 3 === 0; break; case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
            default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
          }
          if (!fn[y][x] && inv) mod[y][x] = !mod[y][x];
        }
      }
      function penalty() {
        var res = 0, r, c, run, color, dark = 0;
        function runs(get) {
          for (r = 0; r < size; r++) { color = get(r, 0); run = 1; for (c = 1; c < size; c++) { if (get(r, c) === color) { run++; if (run === 5) res += 3; else if (run > 5) res++; } else { color = get(r, c); run = 1; } } }
        }
        runs(function (a, b) { return mod[a][b]; }); runs(function (a, b) { return mod[b][a]; });
        for (r = 0; r < size - 1; r++) for (c = 0; c < size - 1; c++) { var v = mod[r][c]; if (v === mod[r][c + 1] && v === mod[r + 1][c] && v === mod[r + 1][c + 1]) res += 3; }
        var re = /(?=10111010000)|(?=00001011101)/g;
        for (r = 0; r < size; r++) {
          var rs = '', cs = ''; for (c = 0; c < size; c++) { rs += mod[r][c] ? '1' : '0'; cs += mod[c][r] ? '1' : '0'; if (mod[r][c]) dark++; }
          res += 40 * ((rs.match(re) || []).length + (cs.match(re) || []).length);
        }
        var total = size * size; res += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
        return res;
      }
      var best = 0, bestPen = Infinity;
      for (var m = 0; m < 8; m++) {
        applyMask(m); drawFormat(m); var p = penalty(); if (p < bestPen) { bestPen = p; best = m; } applyMask(m);
      }
      applyMask(best); drawFormat(best);
      return { version: ver, size: size, modules: mod, mask: best };
    }
    function encode(text, eclName) {
      var ecl = ECL[eclName || 'M']; if (ecl === undefined) ecl = 1;
      var bytes = Array.from(new TextEncoder().encode(String(text))), ver, cap;
      for (ver = 1; ; ver++) {
        if (ver > 40) throw new Error('Nội dung quá dài để tạo mã QR');
        cap = dataCodewords(ver, ecl) * 8;
        if (4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 <= cap) break;
      }
      var bb = []; pushBits(bb, 4, 4); pushBits(bb, bytes.length, ver <= 9 ? 8 : 16);
      bytes.forEach(function (b) { pushBits(bb, b, 8); });
      pushBits(bb, 0, Math.min(4, cap - bb.length)); pushBits(bb, 0, (8 - bb.length % 8) % 8);
      for (var pad = 0xEC; bb.length < cap; pad ^= 0xEC ^ 0x11) pushBits(bb, pad, 8);
      var data = []; for (var i = 0; i < bb.length; i += 8) { var v = 0; for (var j = 0; j < 8; j++) v = (v << 1) | bb[i + j]; data.push(v); }
      return build(ver, ecl, data);
    }
    function svg(text, o) {
      o = o || {}; var q = encode(text, o.ecl), b = o.border == null ? 4 : o.border, n = q.size + b * 2, d = '';
      for (var y = 0; y < q.size; y++) {
        var x = 0;
        while (x < q.size) {
          if (!q.modules[y][x]) { x++; continue; }
          var s = x; while (x < q.size && q.modules[y][x]) x++;
          d += 'M' + (s + b) + ',' + (y + b) + 'h' + (x - s) + 'v1h-' + (x - s) + 'z';
        }
      }
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" role="img" aria-label="Mã QR">' +
        '<rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
    }
    function canvas(text, o) {
      o = o || {}; var q = encode(text, o.ecl), b = o.border == null ? 4 : o.border, sc = o.scale || 8, n = (q.size + b * 2) * sc;
      var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, n, n); g.fillStyle = '#000';
      for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) if (q.modules[y][x]) g.fillRect((x + b) * sc, (y + b) * sc, sc, sc);
      return c;
    }
    function png(text, o) { return canvas(text, o).toDataURL('image/png'); }
    root.QR = { ver: BUILD, encode: encode, svg: svg, canvas: canvas, png: png, _tables: { ECC_CW: ECC_CW, NUM_BLK: NUM_BLK } };
    return root.QR;
  })({});

  var D = null, PK = null, VIEW = null, BBBG = null;
  var LQ = { xuat: '', nhap: '' };
  var qrCache = {}, qrWarned = false, printing = false;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return A ? A.esc(s == null ? '' : s) : (s == null ? '' : s); }
  function pad(n, l) { return String(n).padStart(l || 2, '0'); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtDate(iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; }
  function fmt1(n) { return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function safeName(s) { return String(s).replace(/[\\\/:*?"<>|\s]+/g, '_'); }
  
  function cfg() {
    return Object.assign({
      orgLine1: 'Tổng Công Ty Hạ tầng mạng', orgLine2: 'Trung Tâm Hạ Tầng Mạng Miền Bắc - CN Tổng công ty Hạ tầng mạng',
      formNoXuat: 'Mẫu số: 02  VT-DN', formNoNhap: 'Mẫu số 1 VT -DN', kho: 'Kho-X.VT-28-PHAM-HUNG-NTL_HNI', numSuffix: 'X.VT-28PHG-KH01', startSeq: 1,
      lien: '', unit: 'Cái', quality: 'Tốt', thuTruong: '', ketToan: '', nguoiLap: '', thuKho: '', qrLink: true
    }, (A && A.CFG && A.CFG.slip) || {});
  }
  
  function slips(t) { 
    if (!A || !A.ST) return [];
    if (!A.ST.slips) A.ST.slips = { xuat: [], nhap: [] }; 
    if (!A.ST.slips[t]) A.ST.slips[t] = []; 
    return A.ST.slips[t]; 
  }
  
  function findSlip(t, id) { return slips(t).filter(function (x) { return x.id === id; })[0]; }
  function sumQty(items) { return (items || []).reduce(function (n, i) { return n + num(i.qty); }, 0); }
  function sumMoney(items) { return (items || []).reduce(function (n, i) { return n + num(i.qty) * num(i.price); }, 0); }
  
  function defs() { 
    try { 
      return JSON.parse(localStorage.getItem((A && A.CFG ? A.CFG.storageKey : 'lab') + ':slipdef') || '{}'); 
    } catch (e) { return {}; } 
  }
  
  function saveDefs(f) {
    var o = {}; ['kho', 'nguoiLap', 'thuKho', 'ketToan', 'thuTruong', 'lien'].forEach(function (k) { if (f[k]) o[k] = f[k]; });
    try { localStorage.setItem((A && A.CFG ? A.CFG.storageKey : 'lab') + ':slipdef', JSON.stringify(o)); } catch (e) {}
  }

  function nextId(type, dateISO, skip) {
    var C = cfg(), yy = dateISO.slice(2, 4), L = TYPES[type].letter, seq = (parseInt(C.startSeq, 10) || 1) - 1, id;
    slips(type).forEach(function (s) { var m = String(s.id).match(/^(\d+)\/[NX]\/(\d{2})\//); if (m && m[2] === yy) seq = Math.max(seq, parseInt(m[1], 10)); });
    do { seq++; id = seq + '/' + L + '/' + yy + (C.numSuffix ? '/' + C.numSuffix : ''); } while (findSlip(type, id) || (skip && skip[id]));
    return id;
  }

  function docSo(n) {
    n = Math.round(n); if (!n) return '';
    var ch = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'], units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    function g3(x, full) {
      var tr = Math.floor(x / 100), c2 = Math.floor(x % 100 / 10), dv = x % 10, s = '';
      if (tr > 0 || full) { s += ch[tr] + ' trăm'; if (c2 === 0 && dv > 0) s += ' lẻ'; }
      if (c2 > 1) { s += (s ? ' ' : '') + ch[c2] + ' mươi'; if (dv === 1) s += ' mốt'; else if (dv === 5) s += ' lăm'; else if (dv > 0) s += ' ' + ch[dv]; }
      else if (c2 === 1) { s += (s ? ' ' : '') + 'mười'; if (dv === 5) s += ' lăm'; else if (dv > 0) s += ' ' + ch[dv]; }
      else if (dv > 0) s += (s ? ' ' : '') + ch[dv];
      return s;
    }
    var parts = [], out = [], k;
    while (n > 0) { parts.push(n % 1000); n = Math.floor(n / 1000); }
    for (k = parts.length - 1; k >= 0; k--) { if (!parts[k]) continue; out.push(g3(parts[k], k < parts.length - 1 && parts[k] < 100) + (units[k] ? ' ' + units[k] : '')); }
    var r = out.join(' ').trim(); return r.charAt(0).toUpperCase() + r.slice(1) + ' đồng chẵn';
  }

  var fmCache = {};
  function fieldMap(b) {
    var key = (b.cols || []).join('|'); if (fmCache[key]) return fmCache[key];
    var m = { stt: -1, name: -1, code: -1, serial: -1, part: -1, status: -1, note: -1, noteRead: -1 }, ma = -1;
    (b.cols || []).forEach(function (c, i) {
      var f = A ? A.fold(c).trim() : c.toLowerCase().trim();
      if (f === 'stt') m.stt = i;
      else if (f === 'ten' || f === 'ten vat tu') m.name = i;
      else if (/serial|^s\/n$/.test(f)) m.serial = i;
      else if (/part|pasnumber/.test(f)) m.part = i;
      else if (/ma vt|ma vat tu|ma card/.test(f)) m.code = i;
      else if (f === 'ma') ma = i;
      else if (f === 'tinh trang') m.status = i;
      else if (/^ghi chu/.test(f) && !/them/.test(f)) { if (m.noteRead < 0) m.noteRead = i; m.note = i; }
    });
    if (ma >= 0) { if (m.part < 0) m.part = ma; else if (m.code < 0) m.code = ma; }
    fmCache[key] = m; return m;
  }
  
  function normQ(v) {
    var f = A ? A.fold(v || '').trim() : (v || '').toLowerCase().trim(); if (!f) return '';
    if (f.indexOf('hong') === 0) return 'Hỏng'; if (f.indexOf('tot') === 0) return 'Tốt'; if (f.indexOf('loi') === 0) return 'Lỗi';
    return '';
  }
  
  function rd(fm, row) {
    function g(i) { return i >= 0 ? (row.v[i] || '') : ''; }
    return { name: g(fm.name), code: g(fm.code), serial: g(fm.serial), part: g(fm.part), quality: normQ(g(fm.status)) };
  }
  
  function rowIndex() {
    var m = new Map();
    if (!A || !A.ST || !A.ST.sheets) return m;
    A.ST.sheets.forEach(function (s) { (s.blocks || []).forEach(function (b, bi) { (b.rows || []).forEach(function (r) { if (r.i) m.set(r.i, { s: s, b: b, bi: bi, row: r }); }); }); });
    return m;
  }

  function inventory(exclude, ownId) {
    var out = [];
    if (!A || !A.ST || !A.ST.sheets) return out;
    A.ST.sheets.forEach(function (s) {
      (s.blocks || []).forEach(function (b, bi) {
        var fm = fieldMap(b);
        (b.rows || []).forEach(function (r) {
          if ((r.x && r.x !== ownId) || (exclude && exclude.has(r.i))) return;
          var f = rd(fm, r); if (!f.name && !f.serial && !f.code && !f.part) return;
          var cat = A.labelOf(s) + ' › ' + b.title, note = fm.noteRead >= 0 ? (r.v[fm.noteRead] || '') : '';
          out.push({ rid: r.i, sid: s.id, bi: bi, cat: cat, name: f.name, code: f.code, serial: f.serial, part: f.part, quality: f.quality, note: note, checked: r.c === true,
                     h: A.fold([f.name, f.code, f.serial, f.part, cat, note].join(' \u00a6 ')) });
        });
      });
    });
    return out;
  }
  
  function catLabel(sid, bi, bt) {
    var s = A ? A.sheetById(sid) : null; if (!s) return '';
    if (bt) return A.labelOf(s) + ' › ' + bt;
    if (typeof bi === 'string' && bi.indexOf('new:') === 0) return A.labelOf(s) + ' › ' + bi.slice(4);
    var b = s.blocks ? s.blocks[bi] : null; return A.labelOf(s) + (b ? ' › ' + b.title : '');
  }

  function getMaterialListsHTML() {
    var codes = new Set(), names = new Set(), parts = new Set();
    var dict = {};
    if (A && A.ST && A.ST.sheets) {
      A.ST.sheets.forEach(function (s) {
        (s.blocks || []).forEach(function (b) {
          var fm = fieldMap(b);
          (b.rows || []).forEach(function (r) {
            var f = rd(fm, r);
            var code = (f.code || '').trim();
            var name = (f.name || '').trim();
            var part = (f.part || '').trim();
            if (code) { codes.add(code); dict[code.toLowerCase()] = { ten: name, part: part }; }
            if (name) names.add(name);
            if (part) parts.add(part);
          });
        });
      });
    }
    window._materialDict = dict;
    var h = '<datalist id="listMaVT">';
    codes.forEach(function (c) { h += '<option value="' + esc(c) + '">'; });
    h += '</datalist><datalist id="listTenVT">';
    names.forEach(function (n) { h += '<option value="' + esc(n) + '">'; });
    h += '</datalist><datalist id="listPartNum">';
    parts.forEach(function (p) { h += '<option value="' + esc(p) + '">'; });
    h += '</datalist>';
    return h;
  }

  window.handleSlipMaVTChange = function(val, idx) {
    if (!window._materialDict) getMaterialListsHTML();
    var key = String(val || '').trim().toLowerCase();
    var found = window._materialDict[key];
    if (found && D && D.items && D.items[idx]) {
      if (found.ten) D.items[idx].name = found.ten;
      if (found.part) D.items[idx].part = found.part;
      D.dirty = true;
      var rowEl = document.querySelector('#slItems tr[data-i="' + idx + '"]');
      if (rowEl) {
        var nameInp = rowEl.querySelector('input[data-it="name"]');
        var partInp = rowEl.querySelector('input[data-it="part"]');
        if (nameInp && found.ten) nameInp.value = found.ten;
        if (partInp && found.part) partInp.value = found.part;
      }
    }
  };

  function qrPayload(slip) {
    var t = TYPES[slip.type], f = slip.f || {}, items = slip.items || [], L = [], enc = new TextEncoder();
    function clean(x) { return String(x == null ? '' : x).replace(/[\r\n|]+/g, ' ').trim(); }
    L.push(slip.id); L.push(t.title + ' | ' + fmtDate(slip.date));
    if (clean(f.donVi)) L.push((slip.type === 'xuat' ? 'Nhan: ' : 'Ban: ') + clean(f.donVi).slice(0, 50));
    L.push('Tong: ' + items.length + ' dong / SL ' + sumQty(items));
    var tail = '';
    if (cfg().qrLink !== false && /^https?:/.test(location.protocol)) tail = location.origin + location.pathname + '#/' + slip.type + '/' + encodeURIComponent(slip.id);
    var budget = 300 - enc.encode(L.join('\n') + '\n' + tail).length, used = 0, shown = 0, lines = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i], nm = clean(it.name).slice(0, 28), ln = (i + 1) + '. ' + (clean(it.code) ? clean(it.code) + ' ' : '') + nm + (clean(it.serial) && clean(it.serial).length < 26 ? ' | SN ' + clean(it.serial) : '') + (num(it.qty) !== 1 ? ' | x' + it.qty : '');
      var len = enc.encode(ln + '\n').length; if (used + len > budget - 26) break; used += len; shown++; lines.push(ln);
    }
    L = L.concat(lines); if (shown < items.length) L.push('... +' + (items.length - shown) + ' dong nua');
    if (tail) L.push(tail);
    return L.join('\n');
  }

  function qrSVG(slip, border, css) {
    var key = slip.id + '|' + (slip.updatedAt || '') + '|' + (slip.items ? slip.items.length : 0) + '|' + border, raw = qrCache[key];
    if (raw === undefined) {
      try {
        try { raw = QRLIB.svg(qrPayload(slip), { ecl: 'M', border: border == null ? 1 : border }); }
        catch (e1) { raw = QRLIB.svg(slip.id + '\n' + TYPES[slip.type].title, { ecl: 'M', border: border == null ? 1 : border }); }
      } catch (e) {
        raw = '<div class="qr-miss" title="' + esc(e.message) + '">QR<br>lỗi</div>';
        if (!qrWarned && A && A.toast) { qrWarned = true; A.toast('⚠ Không tạo được mã QR (' + e.message + '). Phiếu vẫn xem / in được.', 7000); }
      }
      qrCache[key] = raw;
    }
    return css && raw && raw.indexOf('<svg') === 0 ? raw.replace('<svg ', '<svg style="' + css + '" ') : raw;
  }

  function paginate(items) {
    var pages = [], rem = (items || []).slice();
    while (rem.length > 4) { var take = Math.min(7, rem.length - 2); pages.push(rem.splice(0, take)); }
    pages.push(rem); return pages;
  }

  function paperHTML(slip) {
    var t = TYPES[slip.type], C = cfg(), f = slip.f || {}, p = (slip.date || todayISO()).split('-'), xuat = slip.type === 'xuat';
    var tot = sumQty(slip.items), money = sumMoney(slip.items), tax = num(f.thue), pays = money + tax;
    var words = f.bangChu || docSo(xuat ? money : pays);
    function v(x) { return x ? '<b>' + esc(x) + '</b>' : '<span class="dots"></span>'; }
    function lab(l, x) { return '<span class="k">' + l + '</span> ' + v(x); }
    var form = xuat ? C.formNoXuat : C.formNoNhap;
    var info = xuat
      ? '<div class="g2"><div>' + lab('Tên đơn vị nhận:', f.donVi) + '</div><div>' + lab('Mã số thuế:', f.mst) + '</div></div>' +
        '<div class="g2"><div>' + lab('Địa chỉ:', f.diaChi) + '</div><div></div></div>' +
        '<div class="g2"><div>' + lab('Theo số QĐ:', f.qd) + '</div><div>' + lab('Nợ:', f.no) + '</div></div>' +
        '<div class="g2"><div>' + lab('Xuất dùng cho (Nghiệp vụ, dịch vụ):', f.dungCho) + '</div><div>' + lab('Có:', f.co) + '</div></div>' +
        '<div class="g2"><div class="bd">' + lab('Xuất tại:', f.kho) + '</div><div>' + lab('Mã CT:', f.maCT) + '</div></div>'
      : '<div class="g2"><div>' + lab('Tên đơn vị bán:', f.donVi) + '</div><div>' + lab('Nợ:', f.no) + '</div></div>' +
        '<div class="g2"><div>' + lab('Mã số thuế:', f.mst) + '</div><div>' + lab('Có:', f.co) + '</div></div>' +
        '<div class="g2"><div>' + lab('Theo hợp đồng số:', f.hopDong) + '&nbsp;&nbsp;&nbsp;&nbsp;' + lab('Ngày:', f.ngayHD) + '</div><div></div></div>' +
        '<div class="g2"><div class="bd">' + lab('Nhập tại kho:', f.kho) + '</div><div></div></div>';
    var signs = (xuat
      ? [['Thủ trưởng DV', f.thuTruong], ['Kế toán trưởng', f.ketToan], ['Người lập phiếu', f.nguoiLap], ['Người nhận hàng', f.nguoiNhan], ['Thủ kho', f.thuKho]]
      : [['Thủ trưởng đơn vị', f.thuTruong], ['Kế toán trưởng', f.ketToan], ['Người lập phiếu', f.nguoiLap], ['Người giao hàng', f.nguoiGiao], ['Thủ kho', f.thuKho]]);
    var pages = paginate(slip.items), n = pages.length, seq = 0;
    var thead = '<thead><tr><th rowspan="2" style="width:5%">' + (xuat ? 'T<br>T' : 'TT') + '</th><th rowspan="2" style="width:13%">Mã vật tư</th>' +
      '<th rowspan="2" style="width:22%">Tên nhãn hiệu quy cách phẩm chất vật tư ( sản phẩm hàng hóa)</th><th rowspan="2" style="width:13%">Mã lô hàng</th>' +
      '<th rowspan="2" style="width:7%">Chất lượng</th><th rowspan="2" style="width:6%">ĐVT</th><th colspan="2">Số lượng</th><th rowspan="2" style="width:9%">Đơn giá</th><th rowspan="2" style="width:9%">Thành tiền</th></tr>' +
      '<tr><th style="width:8%" class="sm">' + (xuat ? 'Yêu cầu' : 'Theo chứng từ') + '</th><th style="width:8%" class="sm">' + (xuat ? 'Thực xuất' : 'Thực nhập') + '</th></tr>' +
      '<tr class="ltr"><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead>';
    return pages.map(function (pg, pi) {
      var last = pi === n - 1;
      var rows = pg.map(function (it) {
        seq++; var sub = [it.serial ? 'S/N: ' + esc(it.serial) : '', it.part ? 'P/N: ' + esc(it.part) : ''].filter(Boolean).join(' &nbsp; ');
        var cat = xuat ? '' : catLabel(it.sid, it.bi, it.bt);
        return '<tr><td class="c">' + seq + '</td><td class="c">' + esc(it.code) + '</td><td>' + esc(it.name) + (sub ? '<div class="sub">' + sub + '</div>' : '') + (cat ? '<div class="sub cat">→ ' + esc(cat) + '</div>' : '') +
          (it.note ? '<div class="sub">' + esc(it.note) + '</div>' : '') + '</td><td class="c lot">' + esc(it.lot) + '</td><td class="c">' + esc(it.quality) + '</td><td class="c">' + esc(it.unit) +
          '</td><td class="c">' + (it.qtyReq !== '' && it.qtyReq != null ? fmt1(num(it.qtyReq)) : '') + '</td><td class="c">' + fmt1(num(it.qty)) + '</td><td class="r m">' + fmt1(num(it.price)) + '</td><td class="r m">' + fmt1(num(it.qty) * num(it.price)) + '</td></tr>';
      }).join('');
      var foot = '';
      if (last) foot = xuat
        ? '<tr class="tot"><td colspan="9" class="r"><b>Tổng Cộng:</b></td><td class="r m"><b>' + fmt1(money) + '</b></td></tr>'
        : '<tr class="tot"><td colspan="9" class="r"><b>Tổng:</b></td><td class="r m"><b>' + fmt1(money) + '</b></td></tr><tr class="tot"><td colspan="9" class="r"><b>Tổng thuế:</b></td><td class="r m"><b>' + fmt1(tax) + '</b></td></tr>' +
          '<tr class="tot"><td colspan="9" class="r"><b>Tổng thanh toán:</b></td><td class="r m"><b>' + fmt1(pays) + '</b></td></tr>';
      return '<div class="paper">' +
        '<div class="p-top"><div class="p-org"><div>' + esc(C.orgLine1) + '</div><div>' + esc(C.orgLine2) + '</div></div><div class="p-form">' + esc(form) + '</div></div>' +
        '<div class="p-head"><div class="p-title"><h1>' + t.title + '</h1><div>Liên ' + esc(f.lien || '') + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Số: <b>' + esc(slip.id) + '</b></div><div>Ngày ' + p[2] + ' tháng ' + p[1] + ' năm ' + p[0] + '</div></div>' +
        '<div class="p-qr">' + qrSVG(slip, 1, 'display:block;width:100%;height:100%') + '</div></div>' +
        '<div class="p-info">' + info + '</div>' +
        '<table class="p-tbl">' + thead + '<tbody>' + rows + foot + '</tbody></table>' +
        (last ? '<div class="p-after"><div>Số tiền bằng chữ: <b>' + esc(words) + '</b></div>' + (f.ghiChu ? '<div class="note"><b>Ghi chú:</b> ' + esc(f.ghiChu) + '</div>' : '') + '</div>' +
          '<div class="p-date">' + t.dateWord + ', Ngày ' + p[2] + ' tháng ' + p[1] + ' năm ' + p[0] + '</div>' +
          '<div class="p-sign">' + signs.map(function (s) { return '<div><b>' + s[0] + '</b><div class="small">(Ký, họ tên)</div><div class="sname">' + esc(s[1] || '') + '</div></div>'; }).join('') + '</div>' : '') +
        '<div class="p-page">Trang: ' + (pi + 1) + ' / ' + n + '</div></div>';
    }).join('');
  }

  /* =====================================================================
     BIÊN BẢN NGHIỆM THU, BÀN GIAO VẬT TƯ, THIẾT BỊ LẮP ĐẶT HOÀN THÀNH (BM-KTTC001)
     ===================================================================== */
  function defaultBBBG() {
    var today = todayISO().split('-');
    return {
      formCode: 'BM-KTTC001',
      donViChuQuan: 'TRUNG TÂM HẠ TẦNG MẠNG MIỀN BẮC',
      donViCon: 'ĐƠN VỊ : XƯỞNG VIỄN THÔNG',
      diaDanh: 'Hà nội',
      ngay: '',
      thang: '',
      nam: today[0],
      soToTrinh: '6178/TTr-KT',
      ngayToTrinh: '20/8/' + today[0],
      veViec: 'lắp đặt kết nối antenna GPS thiết bị IPCLK 3000, đo kiểm tín hiệu',
      taiDonVi: 'Đài VT HNI',
      benGiaoTitle: 'I - ĐẠI DIỆN BÊN GIAO: XVT',
      giao1Ten: 'Thân Phụng Trí',
      giao1ChucVu: 'Phó Trưởng Xưởng VT',
      giao2Ten: 'Nguyễn Chí Thanh',
      giao2ChucVu: 'CBKT Xưởng VT',
      benNhanTitle: 'II- ĐẠI DIỆN BÊN NHẬN: ĐÀI VT HNI',
      nhan1Ten: 'Nguyễn Minh Trường',
      nhan1ChucVu: 'Trưởng Đài VT HNI',
      nhan2Ten: 'Nguyễn Thị Vân Anh',
      nhan2ChucVu: 'Trạm VT Phạm Hùng',
      diaDiemLapDat: 'Rack H2-2 Phòng máy tầng 5 Trạm PHG- 30 Đường Phạm Hùng- HNI',
      soHieuCongTrinh: '26.00717.BBHT.13002'
    };
  }

  function bbbgPaperHTML(bb, items) {
    var rows = (items || []).map(function (it, idx) {
      return '<tr>' +
        '<td class="c">' + (idx + 1) + '.</td>' +
        '<td class="c">' + esc(it.code || '') + '</td>' +
        '<td class="c">' + esc(it.name || '') + '</td>' +
        '<td class="c">' + esc(it.serial || 'N/A') + '</td>' +
        '<td class="c">' + esc(it.unit || 'Cái') + '</td>' +
        '<td class="c">' + esc(it.qty || '1') + '</td>' +
        '<td>' + esc(it.note || '') + '</td>' +
      '</tr>';
    }).join('');

    if (!rows) {
      rows = '<tr><td colspan="7" class="c" style="font-style:italic;color:#666">Chưa có vật tư nào trong danh sách</td></tr>';
    }

    return '<div class="paper">' +
      '<div class="bbbg-form-code">' + esc(bb.formCode || 'BM-KTTC001') + '</div>' +
      '<div class="bbbg-header">' +
        '<div class="left"><div>' + esc(bb.donViChuQuan) + '</div><div>' + esc(bb.donViCon) + '</div></div>' +
        '<div class="right">' +
          '<div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>' +
          '<div class="sub-motto">Độc lập - Tự do - Hạnh phúc</div>' +
          '<div class="date-line">' + esc(bb.diaDanh) + ', ngày ' + (bb.ngay ? esc(bb.ngay) : '&nbsp;&nbsp;&nbsp;&nbsp;') + ' tháng ' + (bb.thang ? esc(bb.thang) : '&nbsp;&nbsp;&nbsp;&nbsp;') + ' năm ' + esc(bb.nam) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="bbbg-title">' +
        '<h1>BIÊN BẢN NGHIỆM THU, BÀN GIAO</h1>' +
        '<div class="sub">Vật tư, thiết bị lắp đặt hoàn thành</div>' +
      '</div>' +
      '<div class="bbbg-p" style="text-indent:12mm">Căn cứ tờ trình (Công văn) số: ' + esc(bb.soToTrinh) + ' ngày ' + esc(bb.ngayToTrinh) + ' Về việc “' + esc(bb.veViec) + '”.</div>' +
      '<div class="bbbg-p" style="text-indent:12mm">Tại: ' + esc(bb.taiDonVi) + ' &nbsp;&nbsp;&nbsp;&nbsp;, chúng tôi gồm :</div>' +
      '<div class="bbbg-sec">' + esc(bb.benGiaoTitle) + '</div>' +
      '<div class="bbbg-rep"><div>Ông ( Bà ): <b>' + esc(bb.giao1Ten) + '</b></div><div>Đơn vị : ' + esc(bb.giao1ChucVu) + '</div></div>' +
      '<div class="bbbg-rep"><div>Ông ( Bà ): <b>' + esc(bb.giao2Ten) + '</b></div><div>Đơn vị : ' + esc(bb.giao2ChucVu) + '</div></div>' +
      '<div class="bbbg-sec">' + esc(bb.benNhanTitle) + '</div>' +
      '<div class="bbbg-rep"><div>Ông ( Bà ): <b>' + esc(bb.nhan1Ten) + '</b></div><div>Đơn vị : ' + esc(bb.nhan1ChucVu) + '</div></div>' +
      '<div class="bbbg-rep"><div>Ông ( Bà ): <b>' + esc(bb.nhan2Ten) + '</b></div><div>Đơn vị : ' + esc(bb.nhan2ChucVu) + '</div></div>' +
      '<div class="bbbg-p" style="margin-top:10px;text-indent:12mm">Tại ' + esc(bb.taiDonVi) + ' tiến hành nghiệm thu bàn giao, nội dung cụ thể như sau:</div>' +
      '<div class="bbbg-p" style="text-indent:12mm">Địa điểm lắp đặt: <b>' + esc(bb.diaDiemLapDat) + '</b></div>' +
      '<table class="bbbg-tbl">' +
        '<thead><tr>' +
          '<th style="width:6%">TT</th>' +
          '<th style="width:17%">MÃ VẬT TƯ</th>' +
          '<th style="width:27%">TÊN VẬT TƯ</th>' +
          '<th style="width:15%">SERIAL</th>' +
          '<th style="width:9%">Đ/V</th>' +
          '<th style="width:8%">SL</th>' +
          '<th style="width:18%">Ghi chú</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<div class="bbbg-p" style="text-indent:12mm"><b>(Số hiệu công trình): ' + esc(bb.soHieuCongTrinh) + '</b></div>' +
      '<div class="bbbg-p" style="margin-top:10px;text-indent:12mm">Toàn bộ vật tư, thiết bị trên đã được lắp đặt hoàn thành và đưa vào sử dụng. Biên bản được lập thành 2 bản, có giá trị như nhau. Mỗi bên giữ 01 bản ./.</div>' +
      '<div class="bbbg-sign">' +
        '<div>ĐẠI DIỆN BÊN GIAO<div class="space"></div></div>' +
        '<div>ĐẠI DIỆN BÊN NHẬN<div class="space"></div></div>' +
      '</div>' +
    '</div>';
  }

  function openBBBGModal() {
    if (!D) return;
    if (!D.bbbg) D.bbbg = defaultBBBG();
    BBBG = clone(D.bbbg);
    var md = $('#mdBBBG');
    if (!md) {
      md = document.createElement('div');
      md.id = 'mdBBBG';
      $('#modalRoot').appendChild(md);
    }
    renderBBBGModal();
    lock();
  }

  function renderBBBGModal() {
    var bb = BBBG;
    var md = $('#mdBBBG');
    if (!md) return;

    function bInp(k, label, wide) {
      return '<label class="fld' + (wide ? ' wide' : '') + '"><span>' + label + '</span>' +
        '<input type="text" data-bb="' + k + '" value="' + esc(bb[k] || '') + '" autocomplete="off"></label>';
    }

    md.innerHTML =
      '<div class="modal-back pk-back"><div class="modal" role="dialog" aria-modal="true" aria-label="Biên bản nghiệm thu bàn giao">' +
      '<div class="modal-head"><h2>📄 Biên bản nghiệm thu, bàn giao (BM-KTTC001)</h2><button class="modal-x" data-bb-close aria-label="Đóng">✕</button></div>' +
      '<div class="modal-body">' +
        '<div class="sl-form">' +
          bInp('formCode', 'Mã biểu mẫu') +
          bInp('donViChuQuan', 'Đơn vị chủ quản') +
          bInp('donViCon', 'Đơn vị trực thuộc') +
          bInp('diaDanh', 'Địa danh (Hà nội...)') +
          bInp('ngay', 'Ngày (để trống nếu điền tay)') +
          bInp('thang', 'Tháng (để trống nếu điền tay)') +
          bInp('nam', 'Năm') +
          bInp('soToTrinh', 'Căn cứ tờ trình số') +
          bInp('ngayToTrinh', 'Ngày tờ trình') +
          bInp('taiDonVi', 'Tại đơn vị (VD: Đài VT HNI)') +
          bInp('veViec', 'Về việc (nội dung công việc)', true) +
          bInp('diaDiemLapDat', 'Địa điểm lắp đặt chi tiết', true) +
          bInp('soHieuCongTrinh', 'Số hiệu công trình', true) +
        '</div>' +
        '<h4 style="margin:10px 0 6px;color:var(--brand)">I. Đại diện Bên giao</h4>' +
        '<div class="sl-form">' +
          bInp('benGiaoTitle', 'Tiêu đề bên giao', true) +
          bInp('giao1Ten', 'Ông (Bà) 1 - Họ tên') +
          bInp('giao1ChucVu', 'Ông (Bà) 1 - Đơn vị / Chức vụ') +
          bInp('giao2Ten', 'Ông (Bà) 2 - Họ tên') +
          bInp('giao2ChucVu', 'Ông (Bà) 2 - Đơn vị / Chức vụ') +
        '</div>' +
        '<h4 style="margin:10px 0 6px;color:var(--brand)">II. Đại diện Bên nhận</h4>' +
        '<div class="sl-form">' +
          bInp('benNhanTitle', 'Tiêu đề bên nhận', true) +
          bInp('nhan1Ten', 'Ông (Bà) 1 - Họ tên') +
          bInp('nhan1ChucVu', 'Ông (Bà) 1 - Đơn vị / Chức vụ') +
          bInp('nhan2Ten', 'Ông (Bà) 2 - Họ tên') +
          bInp('nhan2ChucVu', 'Ông (Bà) 2 - Đơn vị / Chức vụ') +
        '</div>' +
        '<p class="src" style="margin-top:8px">* Bảng vật tư trong Biên bản bàn giao sẽ tự động lấy toàn bộ <b>' + (D.items ? D.items.length : 0) + ' vật tư</b> đang có trong phiếu này.</p>' +
      '</div>' +
      '<div class="modal-foot">' +
        '<button class="tbtn" data-bb-preview>👁 Xem trước & In BBBG</button>' +
        '<span class="sp"></span>' +
        '<button class="tbtn primary" data-bb-save>💾 Lưu nội dung BBBG</button>' +
        '<button class="tbtn" data-bb-close>Đóng</button>' +
      '</div>' +
      '</div></div>';
  }

  function closeBBBGModal() {
    BBBG = null;
    var md = $('#mdBBBG');
    if (md) md.innerHTML = '';
    lock();
  }

  function previewBBBG(bbData) {
    var html = bbbgPaperHTML(bbData, D ? D.items : []);
    $('#mdView').innerHTML =
      '<div class="modal-back view-back"><div class="modal modal-view" role="dialog" aria-modal="true" aria-label="Xem trước BBBG">' +
      '<div class="modal-head"><h2>📄 Xem trước Biên bản nghiệm thu, bàn giao</h2><button class="modal-x" data-vclose aria-label="Đóng">✕</button></div>' +
      '<div class="view-tools">' +
        '<button class="tbtn primary" data-bb-print>🖨 In / Lưu PDF BBBG</button>' +
        '<button class="tbtn" data-vclose>Đóng</button>' +
      '</div>' +
      '<div class="paper-wrap" id="paperWrap"><div id="paperZoom">' + html + '</div></div>' +
      '</div></div>';
    VIEW = { isBBBG: true, html: html };
    lock();
    fitPaper();
  }

  function printRawHTML(html) {
    if (printing) return;
    var root = $('#printRoot'), st = null, finished = false;
    function done() {
      if (finished) return; finished = true; printing = false;
      document.body.classList.remove('print-slip'); if (st) st.remove(); if (root) root.innerHTML = ''; window.removeEventListener('afterprint', done);
    }
    try {
      printing = true;
      if (root) root.innerHTML = html;
      st = document.createElement('style'); st.id = 'pgStyle'; st.textContent = '@page{size:A4 portrait;margin:10mm}'; document.head.appendChild(st);
      document.body.classList.add('print-slip'); window.addEventListener('afterprint', done);
      setTimeout(function () { try { window.print(); } catch (e) { done(); } }, 80);
      setTimeout(done, 120000);
    } catch (e) { done(); }
  }

  function removeRow(idx, rid) {
    var e = idx.get(rid); if (!e) return;
    var k = e.b.rows.indexOf(e.row); if (k >= 0) e.b.rows.splice(k, 1); idx.delete(rid);
  }

  function writeFields(b, row, it, slip) {
    var fm = fieldMap(b);
    function set(i, v) { if (i >= 0) row.v[i] = v || ''; }
    set(fm.name, it.name); set(fm.code, it.code); set(fm.serial, it.serial); set(fm.part, it.part); if (fm.status >= 0 && it.quality) set(fm.status, it.quality);
    var note = (it.note || '').trim(), tag = 'Nhập ' + slip.id + ' (' + fmtDate(slip.date) + ')' + (it.lot ? ' · Lô ' + it.lot : '');
    if (fm.note >= 0) row.v[fm.note] = note ? note + ' · ' + tag : tag;
    if (fm.stt >= 0 && !row.v[fm.stt]) {
      var nums = b.rows.map(function (r) { return parseInt(r.v[fm.stt], 10); }).filter(function (n) { return !isNaN(n); });
      if (nums.length * 2 >= b.rows.length) row.v[fm.stt] = String(Math.max.apply(null, nums.concat([0])) + 1);
    }
    if (A && A.touch) A.touch(row);
  }

  function saveXuat(d, old) {
    var idx = rowIndex(), oldId = old ? old.id : null, i, it, e;
    for (i = 0; i < d.items.length; i++) {
      it = d.items[i]; e = idx.get(it.rid);
      if (e && e.row.x && e.row.x !== oldId) return 'Vật tư “' + (it.name || it.serial) + '” đã nằm trong phiếu ' + e.row.x + '.';
    }
    if (old && old.items) old.items.forEach(function (o) { var r = idx.get(o.rid); if (r && r.row.x === oldId) { delete r.row.x; if (A && A.touch) A.touch(r.row); } });
    d.items.forEach(function (o) { var r = idx.get(o.rid); if (r) { r.row.x = d.id; if (A && A.touch) A.touch(r.row); } });
    return '';
  }

  function saveNhap(d, old) {
    var idx = rowIndex(), keep = {}, made = {};
    d.items.forEach(function (it) { if (it.rid) keep[it.rid] = 1; });
    if (old && old.items) old.items.forEach(function (o) { if (o.rid && !keep[o.rid]) removeRow(idx, o.rid); });
    d.items.forEach(function (it) {
      var s = A ? A.sheetById(it.sid) : null; if (!s) return;
      var bi = it.bi;
      if (typeof bi === 'string' && bi.indexOf('new:') === 0) {
        var title = bi.slice(4), key = s.id + '|' + title;
        if (made[key] === undefined) {
          var ex = -1; (s.blocks || []).forEach(function (x, k) { if (x.title === title) ex = k; });
          if (ex < 0) { if (!s.blocks) s.blocks = []; s.blocks.push({ title: title, hr: 0, cols: ['STT', 'Mã VT', 'Tên vật tư', 'Serial No', 'Part Number', 'Tình trạng', 'Ghi chú'], rows: [], ord: Date.now() }); ex = s.blocks.length - 1; }
          made[key] = ex;
        }
        bi = made[key]; it.bi = bi;
      }
      var b = s.blocks ? s.blocks[bi] : null; if (!b) return;
      var e = it.rid ? idx.get(it.rid) : null;
      if (e && (e.s.id !== s.id || e.bi !== bi)) { removeRow(idx, it.rid); e = null; it.rid = null; }
      var row;
      if (!e) { row = { r: 0, i: 'u' + (A && A.uid ? A.uid() : Math.random()), ct: Date.now(), c: false, n: d.id, v: b.cols.map(function () { return ''; }) }; if (!b.rows) b.rows = []; b.rows.push(row); it.rid = row.i; idx.set(row.i, { s: s, b: b, bi: bi, row: row }); }
      else row = e.row;
      it.bt = b.title; row.n = d.id; writeFields(b, row, it, d);
    });
    return '';
  }

  function commit(d) {
    var type = d.type, old = d.origId ? findSlip(type, d.origId) : null, err = '';
    if (!d.date) return 'Hãy chọn ngày lập phiếu.';
    if (!String(d.id).trim()) return 'Hãy nhập số phiếu.';
    if (d.id !== d.origId && findSlip(type, d.id)) return 'Số phiếu “' + d.id + '” đã tồn tại.';
    if (!d.items || !d.items.length) return 'Phiếu chưa có vật tư nào.';
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      if (type === 'xuat') { if (!(num(it.qty) > 0)) return 'Dòng ' + (i + 1) + ': số lượng thực xuất phải lớn hơn 0.'; }
      else { if (!(it.name || '').trim() && !(it.serial || '').trim()) return 'Dòng ' + (i + 1) + ': hãy nhập Tên vật tư hoặc Serial No.'; it.qty = 1; }
    }
    err = type === 'xuat' ? saveXuat(d, old) : saveNhap(d, old);
    if (err) return err;
    var now = new Date().toISOString();
    var slip = {
      id: d.id, type: type, date: d.date,
      f: clone(d.f),
      items: clone(d.items),
      bbbg: d.bbbg ? clone(d.bbbg) : null,
      createdAt: old ? old.createdAt : now,
      updatedAt: now
    };
    var arr = slips(type); if (old) arr.splice(arr.indexOf(old), 1);
    arr.push(slip); saveDefs(d.f); if (A) { A.persist(); } return '';
  }

  function deleteSlip(type, id) {
    var s = findSlip(type, id); if (!s) return;
    var msg = type === 'xuat'
      ? 'Xoá phiếu ' + id + '?\n\n' + s.items.length + ' vật tư trong phiếu sẽ QUAY LẠI danh mục (tồn kho).'
      : 'Xoá phiếu ' + id + '?\n\n' + s.items.length + ' vật tư đã nhập theo phiếu này sẽ bị GỠ khỏi danh mục.';
    if (!confirm(msg)) return;
    var idx = rowIndex();
    if (type === 'xuat') s.items.forEach(function (it) { var e = idx.get(it.rid); if (e && e.row.x === id) { delete e.row.x; if (A && A.touch) A.touch(e.row); } });
    else s.items.forEach(function (it) { if (it.rid) removeRow(idx, it.rid); });
    var arr = slips(type); arr.splice(arr.indexOf(s), 1);
    if (A) { A.persist(); A.render(); A.toast('Đã xoá phiếu ' + id); }
  }

  function lock() { document.body.classList.toggle('modal-open', !!(D || PK || VIEW || BBBG)); }
  function inp(attr, key, val, type, extra) { return '<input ' + attr + '="' + key + '" type="' + (type || 'text') + '" value="' + esc(val) + '" autocomplete="off"' + (extra || '') + '>'; }
  
  function newItem(base) {
    var C = cfg();
    return { rid: base && base.rid || null, sid: base && base.sid, bi: base ? base.bi : 0, cat: base && base.cat || '', code: base && base.code || '', name: base && base.name || '', serial: base && base.serial || '',
             part: base && base.part || '', lot: '', quality: base && base.quality || C.quality, unit: C.unit, qtyReq: '', qty: 1, price: 0, note: base && base.note || '' };
  }

  function openEditor(type, id) {
    var slip = id ? findSlip(type, id) : null, C = cfg(), df = defs();
    D = {
      type: type, origId: slip ? slip.id : null, id: slip ? slip.id : nextId(type, todayISO()), date: slip ? slip.date : todayISO(), idTouched: false,
      f: slip ? clone(slip.f) : { kho: df.kho || C.kho, lien: df.lien || C.lien, nguoiLap: df.nguoiLap || C.nguoiLap, thuKho: df.thuKho || C.thuKho, ketToan: df.ketToan || C.ketToan, thuTruong: df.thuTruong || C.thuTruong, thue: '0' },
      bbbg: slip && slip.bbbg ? clone(slip.bbbg) : null,
      items: slip ? clone(slip.items).map(function (i) { var o = Object.assign(newItem(), i); if (type === 'nhap' && o.bt) { var s0 = A ? A.sheetById(o.sid) : null; if (s0 && s0.blocks) s0.blocks.forEach(function (b, k) { if (b.title === o.bt) o.bi = k; }); } return o; }) : [],
      newBlocks: [], dirty: false
    };
    if (!slip && type === 'nhap') addLine();
    renderEditor(); lock();
    if (!slip) setTimeout(function () { var f = $('#mdEditor [data-fld="donVi"]'), ae = document.activeElement; if (f && window.innerWidth > 760 && (!ae || ae === document.body || !ae.closest || !ae.closest('#mdEditor'))) f.focus(); }, 60);
  }

  function renderEditor() {
    var t = TYPES[D.type], f = D.f, imp = D.type === 'nhap';
    var flds = FIELDS[D.type].map(function (x) {
      return '<label class="fld' + (x[2] === 'area' ? ' wide' : '') + (x[3] === 'w' ? ' w' : '') + '"><span>' + x[1] + '</span>' +
        (x[2] === 'area' ? '<textarea data-fld="' + x[0] + '" rows="2">' + esc(f[x[0]] || '') + '</textarea>' : inp('data-fld', x[0], f[x[0]] || '', x[2] === 'number' ? 'number' : 'text', x[2] === 'number' ? ' step="any" inputmode="decimal"' : '')) + '</label>';
    }).join('');
    var signs = SIGNERS[D.type].map(function (x) { return '<label class="fld"><span>' + x[1] + '</span>' + inp('data-fld', x[0], f[x[0]] || '') + '</label>'; }).join('');
    var datalistsHTML = getMaterialListsHTML();

    $('#mdEditor').innerHTML =
      '<div class="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-label="' + t.title + '">' +
      '<div class="modal-head"><h2>' + t.icon + ' ' + (D.origId ? 'Sửa ' : 'Tạo ') + t.plural.toLowerCase() + '</h2><button class="modal-x" data-close aria-label="Đóng">✕</button></div>' +
      '<div class="modal-body">' +
      datalistsHTML +
      '<div class="sl-form">' +
        '<label class="fld"><span>Số phiếu</span>' + inp('data-top', 'id', D.id) + '</label>' +
        '<label class="fld"><span>Ngày ' + (imp ? 'nhập' : 'xuất') + '</span>' + inp('data-top', 'date', D.date, 'date') + '</label>' + flds +
        '<label class="fld wide"><span>Ghi chú' + (imp ? ' (in dưới bảng vật tư)' : '') + '</span><textarea data-fld="ghiChu" rows="2">' + esc(f.ghiChu || '') + '</textarea></label>' +
        '<details class="fld wide sl-sign"><summary>Họ tên in dưới chữ ký</summary><div class="sl-form" style="margin-top:8px">' + signs + '</div></details>' +
      '</div>' +
      '<div class="sl-items-head"><h3>Vật tư trong phiếu <span class="badge" id="slCnt"></span></h3><div class="sl-items-btns" style="display:flex;gap:8px;flex-wrap:wrap">' +
        (imp ? '<button class="tbtn primary" data-addline>＋ Thêm dòng vật tư</button>' : '<button class="tbtn primary" data-pick>＋ Chọn vật tư từ danh mục</button>') +
        '<button class="tbtn" data-open-bbbg style="border-color:var(--brand);color:var(--brand);font-weight:700" title="Tạo hoặc chỉnh sửa Biên bản nghiệm thu, bàn giao (BM-KTTC001)">📄 BBBG</button>' +
      '</div></div>' +
      '<div id="slItems"></div>' +
      '<datalist id="dlQ"><option value="Tốt"><option value="Hỏng"><option value="Lỗi"><option value="Kém chất lượng"><option value="Đã sửa chữa"></datalist>' +
      '</div>' +
      '<div class="modal-foot"><span class="sum" id="slSum"></span><span class="sp"></span>' +
        '<button class="tbtn" data-preview>👁 Xem / In</button><button class="tbtn primary" data-save>💾 Lưu phiếu</button><button class="tbtn" data-close>Đóng</button></div>' +
      '</div></div>';
    renderItems();
  }

  function addLine(base) {
    var last = D.items.length ? D.items[D.items.length - 1] : null, s0 = A && A.ST && A.ST.sheets ? A.ST.sheets[0] : null;
    var it = newItem(base); it.sid = base && base.sid ? base.sid : (last ? last.sid : (s0 ? s0.id : null)); it.bi = base ? base.bi : (last ? last.bi : 0); if (!base && last) it.quality = last.quality;
    D.items.push(it); return it;
  }

  function blockOptions(it) {
    var s = A ? A.sheetById(it.sid) : null, o = '';
    if (s && s.blocks) s.blocks.forEach(function (b, k) { o += '<option value="' + k + '"' + (it.bi === k ? ' selected' : '') + '>' + esc(b.title) + '</option>'; });
    D.newBlocks.filter(function (n) { return n.sid === it.sid; }).forEach(function (n) { o += '<option value="new:' + esc(n.title) + '"' + (it.bi === 'new:' + n.title ? ' selected' : '') + '>' + esc(n.title) + ' (khối mới)</option>'; });
    return o + '<option value="__new">＋ Tạo khối mới…</option>';
  }

  function itemsHTML() {
    var imp = D.type === 'nhap';
    if (!D.items.length) return '<div class="empty sl-empty">' + (imp ? 'Chưa có dòng nào. Bấm “＋ Thêm dòng vật tư”.' : 'Chưa có vật tư. Bấm “＋ Chọn vật tư từ danh mục” để chọn từ 1, 2 hay nhiều danh mục.') + '</div>';
    var head = '<tr><th>TT</th>' + (imp ? '<th>Chủng loại (sheet)</th><th>Khối thiết bị</th>' : '<th>Danh mục</th>') +
      '<th>Mã vật tư</th><th>Tên nhãn hiệu quy cách</th><th>Serial No</th><th>Part Number</th><th>Mã lô hàng</th><th>Chất lượng</th><th>ĐVT</th>' +
      '<th>' + (imp ? 'SL theo chứng từ' : 'SL yêu cầu') + '</th><th>' + (imp ? 'Thực nhập' : 'Thực xuất') + '</th><th>Đơn giá</th><th>Ghi chú</th><th></th></tr>';
    var rows = D.items.map(function (it, i) {
      var cat = imp
        ? '<td data-label="Chủng loại" class="sel"><select data-sel="sid" data-i="' + i + '">' + (A && A.ST && A.ST.sheets ? A.ST.sheets.map(function (s) { return '<option value="' + s.id + '"' + (s.id === it.sid ? ' selected' : '') + '>' + esc(A.labelOf(s)) + '</option>'; }).join('') : '') + '</select></td>' +
          '<td data-label="Khối thiết bị" class="sel"><select data-sel="bi" data-i="' + i + '">' + blockOptions(it) + '</select></td>'
        : '<td data-label="Danh mục" class="cat">' + esc(it.cat || '') + '</td>';
      
      function c(f, label, extra, type) {
        var listAttr = '', onInputAttr = '';
        if (imp) {
          if (f === 'code') { listAttr = ' list="listMaVT"'; onInputAttr = ' oninput="window.handleSlipMaVTChange && window.handleSlipMaVTChange(this.value, ' + i + ')"'; }
          else if (f === 'name') { listAttr = ' list="listTenVT"'; }
          else if (f === 'part') { listAttr = ' list="listPartNum"'; }
        }
        return '<td data-label="' + label + '"' + (extra || '') + '><input data-it="' + f + '" data-i="' + i + '"' + (type === 'num' ? ' type="number" min="0" step="any" inputmode="decimal"' : '') + (f === 'quality' ? ' list="dlQ"' : '') + listAttr + onInputAttr + ' value="' + esc(it[f] == null ? '' : it[f]) + '" autocomplete="off"></td>';
      }

      return '<tr data-i="' + i + '"><td class="n">' + (i + 1) + '</td>' + cat + c('code', 'Mã vật tư', ' class="mono"') + c('name', 'Tên nhãn hiệu quy cách') + c('serial', 'Serial No', ' class="mono"') + c('part', 'Part Number', ' class="mono"') +
        c('lot', 'Mã lô hàng', ' class="mono"') + c('quality', 'Chất lượng') + c('unit', 'ĐVT') + c('qtyReq', imp ? 'SL theo chứng từ' : 'SL yêu cầu', '', 'num') +
        (imp ? '<td data-label="Thực nhập" class="qty1">1</td>' : c('qty', 'Thực xuất', '', 'num')) + c('price', 'Đơn giá', '', 'num') + c('note', 'Ghi chú') +
        '<td class="x">' + (imp ? '<button class="ico" data-dup="' + i + '" title="Nhân bản dòng (để nhập thêm serial khác)">⧉</button>' : '') + '<button class="ico del" data-rm="' + i + '" title="' + (imp ? 'Xoá dòng' : 'Bỏ khỏi phiếu (trả lại danh mục)') + '">✕</button></td></tr>';
    }).join('');
    return '<div class="sl-wrap"><table class="sl-items"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
  }
  
  function renderItems() { $('#slItems').innerHTML = itemsHTML(); sums(); }

  function sums() {
    var n = D.items.length, q = D.type === 'nhap' ? n : sumQty(D.items), m = sumMoney(D.items);
    var c = $('#slCnt'); if (c) c.textContent = n + ' dòng';
    var s = $('#slSum'); if (s) s.textContent = 'Tổng: ' + n + ' dòng · SL ' + q + (m ? ' · ' + fmt1(m) + ' đ' : '');
  }
  
  function closeEditor(force) {
    if (!D) return;
    if (!force && D.dirty && !confirm('Đóng và bỏ các thay đổi chưa lưu?')) return;
    D = null; $('#mdEditor').innerHTML = ''; lock();
  }
  
  function draftSlip() { return { id: D.id, type: D.type, date: D.date, f: clone(D.f), items: clone(D.items), bbbg: D.bbbg ? clone(D.bbbg) : null, updatedAt: 'draft' + Date.now() }; }
  
  function doSave() {
    if (window.Sync && window.Sync.active && window.Sync.active() && !D.origId && !D.idTouched) {
      var skip = {}, tries = 0, d0 = D;
      (function chk() {
        window.Sync.exists('slips', d0.type + ':' + d0.id).then(function (ex) {
          if (ex && tries < 30 && D === d0) {
            tries++; skip[d0.id] = 1; d0.id = nextId(d0.type, d0.date, skip); var ii = $('[data-top="id"]'); if (ii) ii.value = d0.id;
            if (A && A.toast) A.toast('Số phiếu đã được thiết bị khác dùng – tự đổi thành ' + d0.id, 4000); chk();
          } else if (D === d0) finishSave();
        }).catch(function () { if (D === d0) finishSave(); });
      })();
      return;
    }
    finishSave();
  }
  
  function finishSave() {
    var err = commit(D); if (err) { if (A && A.toast) A.toast('⚠ ' + err, 4200); return; }
    var type = D.type, id = D.id; closeEditor(true); if (A && A.render) A.render(); if (A && A.toast) A.toast('✔ Đã lưu ' + TYPES[type].plural.toLowerCase() + ' ' + id, 3000); openView(type, id);
  }

  function openPicker() {
    var excl = new Set(D.items.map(function (i) { return i.rid; }).filter(Boolean));
    PK = { items: inventory(excl, D.origId), blocks: new Set(), q: '', chk: 'all', sel: new Set(), max: 300 };
    renderPicker(); lock();
  }
  
  function pkTree() {
    var groups = [], by = {};
    PK.items.forEach(function (it) {
      var g = by[it.sid]; if (!g) { g = by[it.sid] = { sid: it.sid, name: A ? A.labelOf(A.sheetById(it.sid)) : '', blocks: {}, order: [], total: 0 }; groups.push(g); }
      var sh = A ? A.sheetById(it.sid) : null;
      if (sh && sh.blocks && sh.blocks[it.bi]) {
        if (!g.blocks[it.bi]) { g.blocks[it.bi] = { bi: it.bi, title: sh.blocks[it.bi].title, n: 0 }; g.order.push(it.bi); }
        g.blocks[it.bi].n++; g.total++;
      }
    });
    var order = A && A.ST && A.ST.sheets ? A.ST.sheets.map(function (s) { return s.id; }) : [];
    groups.sort(function (a, b) { return order.indexOf(a.sid) - order.indexOf(b.sid); });
    return groups;
  }
  
  function renderPicker() {
    var groups = pkTree();
    var tree = groups.map(function (g) {
      var keys = g.order.map(function (bi) { return g.sid + ':' + bi; });
      var all = keys.every(function (k) { return PK.blocks.has(k); }), some = keys.some(function (k) { return PK.blocks.has(k); });
      var sub = g.order.length > 1 ? '<div class="pk-sub">' + g.order.slice().sort(function (a, b) { return a - b; }).map(function (bi) {
        var k = g.sid + ':' + bi; return '<label><input type="checkbox" data-pk-blk="' + k + '" ' + (PK.blocks.has(k) ? 'checked' : '') + '> <span>' + esc(g.blocks[bi].title) + '</span><em>' + g.blocks[bi].n + '</em></label>'; }).join('') + '</div>' : '';
      return '<div class="pk-grp"><label class="pk-sheet"><input type="checkbox" data-pk-sheet="' + g.sid + '" ' + (all ? 'checked' : '') + (some && !all ? ' data-ind="1"' : '') + '> <b>' + esc(g.name) + '</b><em>' + g.total + '</em></label>' + sub + '</div>';
    }).join('');
    $('#mdPicker').innerHTML =
      '<div class="modal-back pk-back"><div class="modal modal-pk" role="dialog" aria-modal="true" aria-label="Chọn vật tư">' +
      '<div class="modal-head"><h2>＋ Chọn vật tư từ danh mục</h2><button class="modal-x" data-pk-close aria-label="Đóng">✕</button></div>' +
      '<div class="pk-layout">' +
        '<aside class="pk-side"><details class="pk-det" ' + (window.innerWidth > 760 ? 'open' : '') + '><summary>Danh mục (' + groups.length + ' chủng loại) – tích 1, 2 hay nhiều mục</summary>' +
          '<div class="pk-actions"><button class="tbtn" data-pk-allcat>Tất cả danh mục (bỏ lọc)</button></div><div id="pkTree">' + tree + '</div></details></aside>' +
        '<section class="pk-main"><div class="pk-tools"><input type="search" id="pkq" placeholder="Tìm tên, mã, serial, part number…" autocomplete="off" value="' + esc(PK.q) + '">' +
          '<select id="pkchk"><option value="all">Tất cả</option><option value="yes" ' + (PK.chk === 'yes' ? 'selected' : '') + '>Chỉ đã kiểm ✓</option><option value="no" ' + (PK.chk === 'no' ? 'selected' : '') + '>Chỉ chưa kiểm</option></select>' +
          '<button class="tbtn" data-pk-selall>Chọn tất cả đang lọc</button><button class="tbtn" data-pk-clear>Bỏ chọn hết</button></div>' +
          '<div class="pk-info" id="pkInfo"></div><div class="pk-list" id="pkList"></div></section>' +
      '</div>' +
      '<div class="modal-foot"><span class="sum" id="pkSum"></span><span class="sp"></span><button class="tbtn primary" data-pk-add>＋ Thêm vào phiếu</button><button class="tbtn" data-pk-close>Hủy</button></div>' +
      '</div></div>';
    $$('#pkTree input[data-ind]').forEach(function (e) { e.indeterminate = true; });
    renderPickerList();
  }
  
  function pkMatches() {
    var tk = A && A.tokensOf ? A.tokensOf(PK.q) : [];
    return PK.items.filter(function (it) {
      if (PK.blocks.size && !PK.blocks.has(it.sid + ':' + it.bi)) return false;
      if (PK.chk === 'yes' && !it.checked) return false;
      if (PK.chk === 'no' && it.checked) return false;
      for (var i = 0; i < tk.length; i++) if (it.h.indexOf(tk[i]) < 0) return false;
      return true;
    });
  }
  
  function renderPickerList() {
    var m = pkMatches(), show = m.slice(0, PK.max);
    var rows = show.map(function (it) {
      return '<tr data-rid="' + esc(it.rid) + '"' + (PK.sel.has(it.rid) ? ' class="on"' : '') + '><td class="c"><input type="checkbox" data-pk-row="' + esc(it.rid) + '" ' + (PK.sel.has(it.rid) ? 'checked' : '') + '></td>' +
        '<td data-label="Danh mục" class="cat">' + esc(it.cat) + '</td><td data-label="Mã vật tư" class="mono">' + esc(it.code) + '</td><td data-label="Tên vật tư"><b>' + esc(it.name) + '</b></td>' +
        '<td data-label="Serial No" class="mono">' + esc(it.serial) + '</td><td data-label="Part Number" class="mono">' + esc(it.part) + '</td><td data-label="Ghi chú">' + esc(it.note) + '</td></tr>';
    }).join('');
    $('#pkList').innerHTML = m.length
      ? '<table class="pk-tbl"><thead><tr><th></th><th>Danh mục</th><th>Mã vật tư</th><th>Tên vật tư</th><th>Serial No</th><th>Part Number</th><th>Ghi chú</th></tr></thead><tbody>' + rows + '</tbody></table>'
      : '<div class="empty">Không có vật tư nào (đã xuất hết hoặc không khớp bộ lọc).</div>';
    $('#pkInfo').textContent = m.length + ' vật tư khớp' + (m.length > PK.max ? ' · chỉ hiện ' + PK.max + ' dòng đầu – hãy lọc cụ thể hơn (nút “Chọn tất cả đang lọc” vẫn chọn đủ ' + m.length + ')' : '') + ' · vật tư đã nằm trong phiếu xuất khác được ẩn';
    pkSum();
  }
  
  function pkSum() {
    $('#pkSum').textContent = 'Đã chọn: ' + PK.sel.size + ' vật tư';
    var b = $('[data-pk-add]'); if (b) b.textContent = '＋ Thêm ' + (PK.sel.size || '') + ' vào phiếu';
  }
  
  function pkAdd() {
    if (!PK.sel.size) { if (A && A.toast) A.toast('Hãy tích chọn ít nhất 1 vật tư.'); return; }
    var n = 0;
    PK.items.forEach(function (it) { if (PK.sel.has(it.rid)) { var ni = newItem(it); ni.note = ''; D.items.push(ni); n++; } });
    D.dirty = true; closePicker(); renderItems(); if (A && A.toast) A.toast('Đã thêm ' + n + ' vật tư vào phiếu');
  }
  
  function closePicker() { PK = null; $('#mdPicker').innerHTML = ''; lock(); }

  function openView(type, id, tmp) {
    var slip = tmp || findSlip(type, id); if (!slip) { if (A && A.toast) A.toast('Không tìm thấy phiếu ' + id); return; }
    VIEW = { slip: slip, tmp: !!tmp };
    var t = TYPES[type], paper;
    try { paper = paperHTML(slip); }
    catch (err) { paper = '<div class="empty" style="background:#fff;color:#b91c1c;padding:24px"><b>Không dựng được phiếu để xem.</b><br>' + esc(err && err.message || err) + '<br><small>Dữ liệu phiếu vẫn được lưu. Hãy tải lại trang (Ctrl+F5) rồi mở lại; nếu vẫn lỗi hãy chụp màn hình này gửi người hỗ trợ.</small></div>'; }
    var hasBBBG = !!(slip.bbbg);
    $('#mdView').innerHTML =
      '<div class="modal-back view-back"><div class="modal modal-view" role="dialog" aria-modal="true" aria-label="' + t.title + '">' +
      '<div class="modal-head"><h2>' + t.icon + ' ' + t.plural + ' <small>' + esc(slip.id) + (tmp ? ' · bản xem trước (chưa lưu)' : '') + '</small></h2><button class="modal-x" data-vclose aria-label="Đóng">✕</button></div>' +
      '<div class="view-tools"><button class="tbtn primary" data-v="print">🖨 In / Lưu PDF</button><button class="tbtn" data-v="win" title="Mở bản in trong tab mới – dùng khi nút In không phản hồi">↗ In bằng tab mới</button><button class="tbtn" data-v="html" title="Tải phiếu thành file .html, mở ra và in được ở bất kỳ máy nào">⬇ Tải phiếu (.html)</button>' +
      (hasBBBG ? '<button class="tbtn" data-v="bbbg" style="border-color:var(--brand);color:var(--brand);font-weight:700">📄 Xem / In BBBG</button>' : '') +
      (tmp ? '' : '<button class="tbtn" data-v="edit">✏️ Sửa phiếu</button>') +
      '<button class="tbtn" data-v="xlsx">📗 Excel</button><button class="tbtn" data-v="qr">▦ Tải mã QR (PNG)</button>' + (tmp ? '' : '<button class="tbtn danger" data-v="del">🗑 Xoá phiếu</button>') + '</div>' +
      '<div class="paper-wrap" id="paperWrap"><div id="paperZoom">' + paper + '</div></div><div class="ver-note">Mã nguồn phiên bản ' + BUILD + ' · mã QR: tích hợp sẵn</div></div></div>';
    lock(); fitPaper();
  }
  
  function fitPaper() {
    var w = $('#paperWrap'), z = $('#paperZoom'); if (!w || !z) return;
    var k = Math.min(1, (w.clientWidth - 16) / 794); z.style.zoom = k < 1 ? k : '';
  }
  
  function closeView() { VIEW = null; $('#mdView').innerHTML = ''; lock(); }

  function standaloneHTML(slip, auto) {
    var t = TYPES[slip.type];
    return '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(t.title + ' ' + slip.id) + '</title>' +
      '<style>@page{size:A4 portrait;margin:10mm}html,body{margin:0;background:#cbd5e1}.bar{position:sticky;top:0;z-index:5;background:#0b3a5b;color:#fff;padding:10px 14px;font:14px system-ui,sans-serif;display:flex;gap:12px;align-items:center;flex-wrap:wrap}' +
      '.bar button{background:#fbbf24;border:0;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer}.wrap{padding:12px;overflow:auto}' +
      '@media print{html,body{background:#fff}.bar{display:none}.wrap{padding:0;overflow:visible}.paper{width:190mm !important;min-height:274mm !important;padding:0 !important;margin:0 !important;box-shadow:none !important;break-after:page;page-break-after:always;zoom:1 !important}.paper:last-child{break-after:auto;page-break-after:auto}.paper *{-webkit-print-color-adjust:exact;print-color-adjust:exact}.paper .p-page{right:0;bottom:0}}' +
      PAPER_CSS.replace(/body\.print-slip/g, 'body.__none') + '</style></head><body>' +
      '<div class="bar"><button onclick="window.print()">🖨 In / Lưu PDF</button><span>Chọn “Lưu dưới dạng PDF” nếu muốn xuất file; nên tắt “Headers and footers”.</span></div>' +
      '<div class="wrap">' + paperHTML(slip) + '</div>' +
      (auto ? '<script>window.addEventListener("load",function(){setTimeout(function(){try{window.print()}catch(e){}},500)})<\/script>' : '') + '</body></html>';
  }

  function downloadHTML(slip) {
    if (A && A.download) A.download('Phieu_' + safeName(slip.id) + '.html', 'text/html;charset=utf-8', standaloneHTML(slip, false));
  }
  
  function printWindow(slip) {
    var w = null; try { w = window.open('', '_blank'); } catch (e) { w = null; }
    if (!w) { downloadHTML(slip); if (A && A.toast) A.toast('Trình duyệt chặn tab mới – đã tải file phiếu (.html). Hãy mở file đó rồi bấm In.', 7000); return; }
    w.document.open(); w.document.write(standaloneHTML(slip, true)); w.document.close();
  }
  
  function printSlip(slip) {
    if (printing) return;
    if (typeof window.print !== 'function') { printWindow(slip); return; }
    var root = $('#printRoot'), st = null, finished = false;
    function done() {
      if (finished) return; finished = true; printing = false;
      document.body.classList.remove('print-slip'); if (st) st.remove(); if (root) root.innerHTML = ''; window.removeEventListener('afterprint', done);
    }
    try {
      printing = true; if (root) root.innerHTML = paperHTML(slip);
      st = document.createElement('style'); st.id = 'pgStyle'; st.textContent = '@page{size:A4 portrait;margin:10mm}'; document.head.appendChild(st);
      document.body.classList.add('print-slip'); window.addEventListener('afterprint', done);
      setTimeout(function () { try { window.print(); } catch (e) { done(); printWindow(slip); } }, 80);
      setTimeout(done, 120000);
    } catch (e) { done(); if (A && A.toast) A.toast('Không in trực tiếp được (' + e.message + ') – mở bản in trong tab mới.', 5000); printWindow(slip); }
  }

  function dlQR(slip) {
    try {
      var c = QRLIB.canvas(qrPayload(slip), { ecl: 'M', scale: 10, border: 2 });
      c.toBlob(function (b) { if (A && A.download) A.download('QR_' + safeName(slip.id) + '.png', 'image/png', b); });
    } catch (e) { if (A && A.toast) A.toast('⚠ Không tạo được ảnh QR: ' + e.message, 5000); }
  }

  function slipAOA(slip) {
    var t = TYPES[slip.type], C = cfg(), f = slip.f || {}, xuat = slip.type === 'xuat', a = [], p = fmtDate(slip.date);
    var money = sumMoney(slip.items), tax = num(f.thue);
    a.push([C.orgLine1]); a.push([C.orgLine2, '', '', '', '', '', '', '', '', xuat ? C.formNoXuat : C.formNoNhap]); a.push([]);
    a.push([t.title]); a.push(['Liên', f.lien || '', 'Số', slip.id]); a.push(['Ngày', p]);
    FIELDS[slip.type].forEach(function (x) { if (x[0] !== 'lien' && x[0] !== 'thue') a.push([x[1], f[x[0]] || '']); });
    a.push([]);
    a.push(['TT', 'Mã vật tư', 'Tên nhãn hiệu quy cách phẩm chất vật tư', 'Serial No', 'Part Number', 'Mã lô hàng', 'Chất lượng', 'ĐVT', xuat ? 'Yêu cầu' : 'Theo chứng từ', xuat ? 'Thực xuất' : 'Thực nhập', 'Đơn giá', 'Thành tiền', 'Danh mục', 'Ghi chú']);
    (slip.items || []).forEach(function (it, i) {
      a.push([i + 1, it.code || '', it.name || '', it.serial || '', it.part || '', it.lot || '', it.quality || '', it.unit || '', it.qtyReq === '' ? '' : num(it.qtyReq), num(it.qty), num(it.price), num(it.qty) * num(it.price),
              xuat ? (it.cat || '') : catLabel(it.sid, it.bi, it.bt), it.note || '']);
    });
    if (xuat) a.push(['', '', '', '', '', '', '', '', '', 'Tổng Cộng:', '', money]);
    else { a.push(['', '', '', '', '', '', '', '', '', 'Tổng:', '', money]); a.push(['', '', '', '', '', '', '', '', '', 'Tổng thuế:', '', tax]); a.push(['', '', '', '', '', '', '', '', '', 'Tổng thanh toán:', '', money + tax]); }
    a.push([]); a.push(['Số tiền bằng chữ:', f.bangChu || docSo(xuat ? money : money + tax)]); if (f.ghiChu) a.push(['Ghi chú:', f.ghiChu]);
    a.push([]); a.push([]);
    var sg = SIGNERS[slip.type]; a.push(sg.map(function (x) { return x[1]; })); a.push(sg.map(function () { return '(Ký, họ tên)'; })); a.push([]); a.push([]);
    a.push(sg.map(function (x) { return f[x[0]] || ''; }));
    return a;
  }

  function exportSlip(slip) {
    var aoa = slipAOA(slip), name = safeName(slip.id);
    if (window.XLSX) {
      var wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [6, 16, 38, 22, 18, 24, 11, 7, 11, 11, 10, 12, 30, 24].map(function (w) { return { wch: w }; });
      XLSX.utils.book_append_sheet(wb, ws, TYPES[slip.type].plural.slice(0, 31)); XLSX.writeFile(wb, name + '.xlsx');
    } else { if (A && A.toast) A.toast('Chưa tải được thư viện Excel (cần Internet) – xuất CSV thay thế.', 4000); if (A && A.download) A.download(name + '.csv', 'text/csv;charset=utf-8', A.toCSV(aoa)); }
  }

  function extraSheets() {
    return ['xuat', 'nhap'].map(function (t) {
      var aoa = [['Số phiếu', 'Ngày', t === 'xuat' ? 'Đơn vị nhận' : 'Đơn vị bán', t === 'xuat' ? 'Xuất dùng cho' : 'Theo hợp đồng', 'Xuất/Nhập tại kho', 'TT', 'Mã vật tư', 'Tên vật tư', 'Serial No', 'Part Number', 'Mã lô hàng', 'Chất lượng', 'ĐVT', 'SL', 'Đơn giá', 'Danh mục', 'Ghi chú']];
      slips(t).forEach(function (s) {
        (s.items || []).forEach(function (it, i) { aoa.push([s.id, fmtDate(s.date), (s.f || {}).donVi || '', t === 'xuat' ? (s.f || {}).dungCho || '' : (s.f || {}).hopDong || '', (s.f || {}).kho || '', i + 1, it.code || '', it.name || '', it.serial || '', it.part || '', it.lot || '', it.quality || '', it.unit || '', num(it.qty), num(it.price), t === 'xuat' ? (it.cat || '') : catLabel(it.sid, it.bi, it.bt), it.note || '']); });
      });
      return { name: TYPES[t].plural, aoa: aoa };
    }).filter(function (x) { return x.aoa.length > 1; });
  }

  function listRows(type) {
    var tk = A && A.tokensOf ? A.tokensOf(LQ[type] || '') : [];
    var arr = slips(type).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || String(b.createdAt || '').localeCompare(String(b.createdAt || '')); });
    arr = arr.filter(function (s) {
      if (!tk.length) return true; var h = A ? A.fold([s.id, fmtDate(s.date), (s.f || {}).donVi, (s.f || {}).dungCho, (s.f || {}).hopDong, (s.f || {}).kho].concat((s.items || []).map(function (i) { return [i.name, i.serial, i.code, i.part].join(' '); })).join(' ')) : '';
      return tk.every(function (k) { return h.indexOf(k) >= 0; });
    });
    if (!arr.length) return '<tr><td colspan="8" class="empty">' + (slips(type).length ? 'Không có phiếu nào khớp.' : 'Chưa có phiếu nào. Bấm “＋ Tạo ' + TYPES[type].plural.toLowerCase() + '” để bắt đầu.') + '</td></tr>';
    return arr.map(function (s) {
      var f = s.f || {}, why = type === 'xuat' ? f.dungCho : f.hopDong;
      return '<tr data-sl="' + esc(s.id) + '" data-t="' + type + '"><td data-label="Số phiếu"><b>' + esc(s.id) + '</b>' + (s.bbbg ? ' <span class="badge" style="color:var(--brand);border-color:var(--brand)">BBBG</span>' : '') + '</td><td data-label="Ngày">' + fmtDate(s.date) + '</td>' +
        '<td data-label="' + TYPES[type].fromTo + '">' + esc(f.donVi || '—') + (f.kho ? '<div class="src">' + esc(f.kho) + '</div>' : '') + '</td>' +
        '<td data-label="' + (type === 'xuat' ? 'Xuất dùng cho' : 'Theo hợp đồng') + '" class="reason">' + esc(why || '') + '</td>' +
        '<td class="num" data-label="Số dòng">' + (s.items ? s.items.length : 0) + '</td><td class="num" data-label="Tổng SL">' + sumQty(s.items) + '</td>' +
        '<td class="qrc" data-label="QR"><button class="qr-thumb" data-sl-act="view" title="Xem phiếu & mã QR" style="display:block;width:58px;height:58px;padding:2px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer">' + qrSVG(s, 1, 'display:block;width:100%;height:100%') + '</button></td>' +
        '<td class="acts"><button class="ico" data-sl-act="view" title="Xem / In">👁</button><button class="ico" data-sl-act="edit" title="Sửa">✏️</button><button class="ico" data-sl-act="xlsx" title="Xuất Excel">📗</button><button class="ico del" data-sl-act="del" title="Xoá phiếu">🗑</button></td></tr>';
    }).join('');
  }

  function listHTML(type) {
    var t = TYPES[type], arr = slips(type), items = arr.reduce(function (n, s) { return n + (s.items ? s.items.length : 0); }, 0);
    return '<div class="page-title"><h1>' + t.icon + ' ' + t.plural + '</h1><span class="sub">' + arr.length + ' phiếu · ' + items + ' vật tư ' + (type === 'xuat' ? 'đã xuất' : 'đã nhập') + '</span>' +
      '<button class="tbtn primary" data-sl-new="' + type + '" style="margin-left:auto">＋ Tạo ' + t.plural.toLowerCase() + '</button></div>' +
      '<div class="toolbar no-print"><input type="search" id="slq" data-type="' + type + '" placeholder="Tìm theo số phiếu, đơn vị, serial, tên vật tư…" value="' + esc(LQ[type] || '') + '" autocomplete="off"></div>' +
      '<div class="card"><div style="overflow:auto"><table class="plain sl-list"><thead><tr><th>Số phiếu</th><th>Ngày</th><th>' + t.fromTo + '</th><th>' + (type === 'xuat' ? 'Xuất dùng cho' : 'Theo hợp đồng') + '</th><th class="num">Số dòng</th><th class="num">Tổng SL</th><th>QR</th><th></th></tr></thead>' +
      '<tbody id="slBody">' + listRows(type) + '</tbody></table></div></div>' +
      '<p class="src">' + (type === 'xuat' ? 'Vật tư đã lập phiếu xuất được trừ khỏi danh mục (ẩn khỏi các bảng). Xoá phiếu sẽ trả vật tư về danh mục.' : 'Vật tư nhập theo phiếu được thêm vào đúng chủng loại / khối đã chọn (nhãn “MỚI”). Xoá phiếu sẽ gỡ các vật tư đó.') + '</p>';
  }

  function bind() {
    var main = $('#main'), root = $('#modalRoot');
    if (!main || !root) return;
    
    main.addEventListener('click', function (e) {
      var nw = e.target.closest('[data-sl-new]'); if (nw) { openEditor(nw.dataset.slNew); return; }
      var ac = e.target.closest('[data-sl-act]'); if (!ac) return;
      var tr = ac.closest('tr[data-sl]'); if (!tr) return;
      var type = tr.dataset.t, id = tr.dataset.sl, s = findSlip(type, id); if (!s) return;
      switch (ac.dataset.slAct) {
        case 'view': openView(type, id); break; case 'edit': openEditor(type, id); break;
        case 'xlsx': exportSlip(s); break; case 'del': deleteSlip(type, id); break;
      }
    });
    
    var lt; main.addEventListener('input', function (e) {
      if (e.target.id !== 'slq') return; var ty = e.target.dataset.type; clearTimeout(lt);
      lt = setTimeout(function () { LQ[ty] = e.target.value; var b = $('#slBody'); if (b) b.innerHTML = listRows(ty); }, 150);
    });
    
    var pt;
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'pkq' && PK) { clearTimeout(pt); pt = setTimeout(function () { PK.q = t.value; renderPickerList(); }, 150); return; }
      if (BBBG && t.dataset.bb !== undefined) {
        BBBG[t.dataset.bb] = t.value;
        return;
      }
      if (!D) return;
      if (t.dataset.fld !== undefined) { D.f[t.dataset.fld] = t.value; D.dirty = true; }
      else if (t.dataset.top !== undefined) {
        D[t.dataset.top] = t.value; D.dirty = true;
        if (t.dataset.top === 'id') D.idTouched = true;
        if (t.dataset.top === 'date' && !D.origId && !D.idTouched && t.value) { D.id = nextId(D.type, t.value); var ii = $('[data-top="id"]'); if (ii) ii.value = D.id; }
      } else if (t.dataset.it !== undefined) {
        D.items[+t.dataset.i][t.dataset.it] = t.value; D.dirty = true; if (t.dataset.it === 'qty' || t.dataset.it === 'price') sums();
      }
    });
    
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (PK) {
        if (t.id === 'pkchk') { PK.chk = t.value; renderPickerList(); return; }
        if (t.dataset.pkRow !== undefined) { if (t.checked) PK.sel.add(t.dataset.pkRow); else PK.sel.delete(t.dataset.pkRow); var tr = t.closest('tr'); if (tr) tr.classList.toggle('on', t.checked); pkSum(); return; }
        if (t.dataset.pkSheet !== undefined || t.dataset.pkBlk !== undefined) {
          if (t.dataset.pkSheet !== undefined) {
            PK.items.forEach(function (it) { if (it.sid === t.dataset.pkSheet) { var k = it.sid + ':' + it.bi; if (t.checked) PK.blocks.add(k); else PK.blocks.delete(k); } });
          } else { if (t.checked) PK.blocks.add(t.dataset.pkBlk); else PK.blocks.delete(t.dataset.pkBlk); }
          renderPicker(); return;
        }
      }
      if (D && t.dataset.sel) {
        var it = D.items[+t.dataset.i]; D.dirty = true;
        if (t.dataset.sel === 'sid') { it.sid = t.value; it.bi = 0; renderItems(); }
        else {
          if (t.value === '__new') {
            var title = (prompt('Tên khối / thiết bị mới trong chủng loại “' + (A ? A.labelOf(A.sheetById(it.sid)) : '') + '”:') || '').trim();
            if (title) { if (!D.newBlocks.some(function (n) { return n.sid === it.sid && n.title === title; })) D.newBlocks.push({ sid: it.sid, title: title }); it.bi = 'new:' + title; }
            renderItems();
          } else { it.bi = t.value.indexOf('new:') === 0 ? t.value : +t.value; }
        }
      }
    });
    
    root.addEventListener('click', function (e) {
      var t = e.target, b;
      if ((b = t.closest('[data-close]'))) { closeEditor(); return; }
      if (t.closest('[data-vclose]')) { closeView(); return; }
      if (t.closest('[data-pk-close]')) { closePicker(); return; }
      if (t.closest('[data-pk-add]')) { pkAdd(); return; }
      if (t.closest('[data-pk-allcat]')) { PK.blocks.clear(); renderPicker(); return; }
      if (t.closest('[data-pk-selall]')) { pkMatches().forEach(function (it) { PK.sel.add(it.rid); }); renderPickerList(); return; }
      if (t.closest('[data-pk-clear]')) { PK.sel.clear(); renderPickerList(); return; }
      if (t.closest('[data-pick]')) { openPicker(); return; }
      if (t.closest('[data-open-bbbg]')) { openBBBGModal(); return; }
      if (t.closest('[data-bb-close]')) { closeBBBGModal(); return; }
      if (t.closest('[data-bb-save]')) {
        if (D && BBBG) {
          D.bbbg = clone(BBBG);
          D.dirty = true;
          if (A && A.toast) A.toast('✔ Đã lưu thông tin Biên bản bàn giao vào phiếu', 2500);
        }
        closeBBBGModal();
        return;
      }
      if (t.closest('[data-bb-preview]')) {
        if (BBBG) previewBBBG(BBBG);
        return;
      }
      if (t.closest('[data-bb-print]')) {
        if (VIEW && VIEW.html) printRawHTML(VIEW.html);
        return;
      }
      if (t.closest('[data-addline]')) { addLine(); D.dirty = true; renderItems(); var rows = $$('#slItems tbody tr'); var lr = rows[rows.length - 1]; if (lr) { var f = $('input[data-it="code"]', lr); if (f && window.innerWidth > 760) f.focus(); lr.scrollIntoView({ block: 'nearest' }); } return; }
      if ((b = t.closest('[data-dup]'))) { var src = D.items[+b.dataset.dup], c = newItem(src); c.rid = null; c.sid = src.sid; c.bi = src.bi; c.serial = ''; c.lot = src.lot; c.qtyReq = src.qtyReq; D.items.splice(+b.dataset.dup + 1, 0, c); D.dirty = true; renderItems(); return; }
      if ((b = t.closest('[data-rm]'))) { D.items.splice(+b.dataset.rm, 1); D.dirty = true; renderItems(); return; }
      if (t.closest('[data-save]')) { doSave(); return; }
      if (t.closest('[data-preview]')) { if (!D.items.length) { if (A && A.toast) A.toast('Phiếu chưa có vật tư.'); return; } openView(D.type, D.id, draftSlip()); return; }
      if ((b = t.closest('[data-v]')) && VIEW) {
        var slip = VIEW.slip;
        switch (b.dataset.v) {
          case 'print': printSlip(slip); break; case 'win': printWindow(slip); break; case 'html': downloadHTML(slip); break; case 'xlsx': exportSlip(slip); break; case 'qr': dlQR(slip); break;
          case 'bbbg': if (slip && slip.bbbg) { D = { items: slip.items }; previewBBBG(slip.bbbg); } break;
          case 'edit': closeView(); openEditor(slip.type, slip.id); break;
          case 'del': var ty = slip.type, id = slip.id; closeView(); deleteSlip(ty, id); break;
        }
      }
    });
    
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (VIEW) { closeView(); e.stopPropagation(); }
      else if (BBBG) { closeBBBGModal(); e.stopPropagation(); }
      else if (PK) { closePicker(); e.stopPropagation(); }
      else if (D) { closeEditor(); }
    });
    
    window.addEventListener('resize', fitPaper);
    ['btnPXK', 'btnPNK'].forEach(function (id) { var el = $('#' + id); if (el) el.addEventListener('click', function () { openEditor(id === 'btnPXK' ? 'xuat' : 'nhap'); }); });
  }

  window.Slips = {
    ver: BUILD, qr: QRLIB,
    init: function (app) { 
      if (A) return; 
      if (!window.QR) window.QR = QRLIB; 
      A = app; 
      var st = document.createElement('style'); 
      st.id = 'paperCss'; 
      st.textContent = PAPER_CSS; 
      document.head.appendChild(st); 
      var modalRoot = $('#modalRoot');
      if (modalRoot) modalRoot.innerHTML = '<div id="mdEditor"></div><div id="mdPicker"></div><div id="mdBBBG"></div><div id="mdView"></div>'; 
      bind(); 
    },
    listHTML: listHTML, openEditor: openEditor, view: openView, extraSheets: extraSheets, docSo: docSo, _paperHTML: paperHTML, _qrPayload: qrPayload
  };
})();
