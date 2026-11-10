#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
convert.py - Chuyển file Excel (Tài sản - Vật tư Truyền dẫn LAB) thành assets/data.js cho web app.

Cách dùng:
    pip install openpyxl
    python convert.py "BAOCAO_20261109_Tồn XVT 09-11.xlsx"
"""
import sys, os, re, json, base64, argparse, datetime, unicodedata
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter as L

HEAD_WORDS = {"stt", "mã vt", "mã vật tư", "tên vật tư", "tên", "serial no", "s/n", "part number",
              "pasnumber", "mã card", "mã", "ghi chú", "ghi chú td", "nhập kho", "tình trạng", "đến", "đi"}
GROUP_LOOSE = ("trang tính", "không rõ", "vt đo kiểm")
MAX_COL = 20


def clean_space(s):
    return re.sub(r"\s+", " ", str(s)).strip()


def norm(s):
    return clean_space(s).lower()


def slug(s):
    s = unicodedata.normalize("NFD", s).replace("đ", "d").replace("Đ", "D")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def conv(v):
    if v is None:
        return None
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, datetime.datetime):
        if (v.hour, v.minute, v.second) == (0, 0, 0):
            return v.strftime("%d/%m/%Y")
        return v.strftime("%d/%m/%Y %H:%M")
    if isinstance(v, datetime.date):
        return v.strftime("%d/%m/%Y")
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else repr(v)
    if isinstance(v, int):
        return str(v)
    s = str(v).replace("\r\n", "\n").replace("\r", "\n").strip()
    return s or None


def fill_hex(cell):
    f = cell.fill
    if f is None or f.fill_type != "solid":
        return None
    c = f.fgColor
    if c is None or c.type != "rgb" or not isinstance(c.rgb, str):
        return None
    rgb = c.rgb[-6:].upper()
    return None if rgb in ("FFFFFF", "000000") else rgb


def convert_sheet(ws, report, chk):
    maxc = min(ws.max_column, MAX_COL)
    maxr = ws.max_row

    vmerge, hspan = {}, {}
    for rg in ws.merged_cells.ranges:
        r1, c1, r2, c2 = rg.min_row, rg.min_col, rg.max_row, rg.max_col
        if r2 > r1 and c2 == c1:
            for r in range(r1 + 1, r2 + 1):
                vmerge[(r, c1)] = (r1, c1)
        elif c2 > c1 and r2 == r1:
            hspan[(r1, c1)] = c2 - c1 + 1

    def raw(r, c):
        if (r, c) in vmerge:
            return ws.cell(*vmerge[(r, c)])
        return ws.cell(r, c)

    def val(r, c):
        return conv(raw(r, c).value)

    headers = []
    for r in range(1, maxr + 1):
        n = 0
        for c in range(2, maxc + 1):
            v = ws.cell(r, c).value
            if isinstance(v, str) and norm(v) in HEAD_WORDS:
                n += 1
        if n >= 4:
            headers.append(r)
    if not headers:
        report.append("  ! không tìm thấy dòng tiêu đề")
        return None

    def texts_no_header(r):
        out = []
        for c in range(2, maxc + 1):
            v = conv(ws.cell(r, c).value)
            if v and norm(v) not in HEAD_WORDS:
                out.append(v)
        return out

    blocks_def = []
    for i, h in enumerate(headers):
        title, trow = None, None
        t = h - 1
        lower = headers[i - 1] if i else 0
        if t > lower:
            tx = texts_no_header(t)
            if len(tx) == 1:
                title, trow = tx[0], t
                chk["stray"] += sum(1 for c in range(2, maxc + 1) if conv(ws.cell(t, c).value) and norm(conv(ws.cell(t, c).value)) in HEAD_WORDS)
        blocks_def.append([title, h, trow])
        
    for i, (title, h, trow) in enumerate(blocks_def):
        nxt = blocks_def[i + 1] if i + 1 < len(blocks_def) else None
        end = (nxt[2] or nxt[1]) - 1 if nxt else maxr
        blocks_def[i] = (title, h, h + 1, end)

    blocks = []
    last_title = None
    for bi, (title, h, r1, r2) in enumerate(blocks_def):
        labels = {}
        for c in range(2, maxc + 1):
            v = conv(ws.cell(h, c).value)
            if v and norm(v) in HEAD_WORDS:
                labels[c] = v
        if not labels:
            continue
        last_label = max(labels)
        chk["labels"] += len(labels)
        
        cols_idx = list(range(2, last_label + 1))
        names = []
        for c in cols_idx:
            if c in labels:
                names.append(labels[c])
            elif c == 2:
                names.append("STT")
            else:
                names.append(f"Cột {L(c)}")

        extra = []
        for c in range(last_label + 1, maxc + 1):
            if any(val(r, c) for r in range(r1, r2 + 1)):
                extra.append(c)
        for c in extra:
            names.append(f"Ghi chú thêm ({L(c)})")
        all_idx = cols_idx + extra

        if title:
            chk["titles"] += 1
            last_title = title
            btitle = title
        elif blocks:
            btitle = blocks[-1]["title"] if blocks[-1]["title"].endswith("(tiếp)") else f"{blocks[-1]['title']} (tiếp)"
        else:
            btitle = clean_space(ws.title)

        rows = []
        for r in range(r1, r2 + 1):
            vals = [val(r, c) for c in all_idx]
            if not any(vals):
                continue
            a = ws.cell(r, 1).value
            row = {"r": r, "c": (a if isinstance(a, bool) else None),
                   "v": [x or "" for x in vals]}
            f, p, s = {}, [], {}
            for k, c in enumerate(all_idx):
                hx = fill_hex(raw(r, c))
                if hx:
                    f[str(k)] = hx
                if (r, c) in vmerge:
                    p.append(k)
                if (r, c) in hspan:
                    n = 1
                    while n < hspan[(r, c)] and (c + n) in all_idx and not val(r, c + n):
                        n += 1
                    if n > 1:
                        s[str(k)] = n
            if f: row["f"] = f
            if p: row["p"] = p
            if s: row["s"] = s
            rows.append(row)
        blocks.append({"title": btitle, "hr": h, "cols": names, "rows": rows})
    return blocks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    # Sửa lại đường dẫn mặc định lưu thẳng vào thư mục assets/data.js tại thư mục hiện tại
    ap.add_argument("--out", default=os.path.join("assets", "data.js"))
    ap.add_argument("--password", default=None, help="mã hoá dữ liệu bằng mật khẩu (AES-GCM)")
    a = ap.parse_args()

    wb = load_workbook(a.xlsx)
    report, sheets = [], []
    for ws in wb.worksheets:
        if ws.sheet_state != "visible":
            continue
        report.append(f"- {ws.title}")
        chk = {"labels": 0, "titles": 0, "stray": 0}
        blocks = convert_sheet(ws, report, chk)
        if blocks is None:
            continue
        name = clean_space(ws.title)
        group = 1 if any(norm(name).startswith(g) for g in GROUP_LOOSE) else 0
        sheets.append({"id": slug(name) or f"sheet{len(sheets)+1}", "name": name, "group": group, "blocks": blocks})

    data = {"meta": {"source": os.path.basename(a.xlsx),
                     "version": datetime.datetime.now().strftime("%Y%m%d%H%M%S"),
                     "generated": datetime.datetime.now().strftime("%d/%m/%Y %H:%M")},
            "sheets": sheets}
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        fh.write("window.LAB_DATA=" + raw + ";\n")
        
    print("\n".join(report))
    print(f"\nĐã ghi thành công vào: {os.path.abspath(a.out)}  ({os.path.getsize(a.out)/1024:.0f} KB)")
    print(f"Tổng: {len(sheets)} sheet, {sum(len(b['rows']) for s in sheets for b in s['blocks'])} dòng dữ liệu")


if __name__ == "__main__":
    main()
