/* =====================================================================
   qr.js – Bộ tạo mã QR (QR Code Model 2) viết bằng JavaScript thuần, KHÔNG cần Internet.
   Chế độ byte (UTF-8), phiên bản 1–40, mức sửa lỗi L / M / Q / H.
   Dùng:  QR.svg("nội dung", {ecl:'M', border:4})   → chuỗi <svg>
          QR.canvas("nội dung", {scale:8})           → <canvas>
          QR.png("nội dung", {scale:8})              → dataURL PNG
          QR.encode("nội dung","M")                  → {version,size,modules[y][x]}
   ===================================================================== */
(function (root) {
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
    // mẫu chức năng
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

    // ECC + xen kẽ
    var numBlocks = NUM_BLK[ecl][ver], eccLen = ECC_CW[ecl][ver], raw = Math.floor(rawModules(ver) / 8);
    var shortBlocks = numBlocks - raw % numBlocks, shortLen = Math.floor(raw / numBlocks), blocks = [], div = rsDivisor(eccLen), k = 0;
    for (i = 0; i < numBlocks; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1)); k += dat.length;
      var ecc = rsRemainder(dat, div); if (i < shortBlocks) dat.push(0); blocks.push(dat.concat(ecc));
    }
    var all = [];
    for (i = 0; i < blocks[0].length; i++) blocks.forEach(function (blk, jj) { if (i !== shortLen - eccLen || jj >= shortBlocks) all.push(blk[i]); });

    // đặt codeword
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

  root.QR = { encode: encode, svg: svg, canvas: canvas, png: png, _tables: { ECC_CW: ECC_CW, NUM_BLK: NUM_BLK } };
})(typeof window !== 'undefined' ? window : globalThis);
