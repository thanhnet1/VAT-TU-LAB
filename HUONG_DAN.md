# 📡 Web app “Tài sản – Vật tư Truyền dẫn LAB XVT”

Chuyển toàn bộ nội dung file Excel **Tài_sản-Vật_tư_Truyền_dẫn-LAB-XVT.xlsx** (14 sheet, 755 dòng vật tư) thành một trang web tĩnh, đưa lên **GitHub Pages** (`https://<tên-tài-khoản>.github.io/...`). Không cần máy chủ, không cần cài framework.

---

## ⚠️ ĐỌC TRƯỚC KHI ĐĂNG LÊN INTERNET

GitHub Pages là website **công khai** – bất kỳ ai có đường link đều xem được (kể cả khi repo để Private, trừ gói Enterprise Cloud có kiểm soát truy cập). Dữ liệu này gồm **số Serial, Part Number, số phiếu xuất/nhập kho, tên người bàn giao** của tài sản công ty.

Bạn có 3 lựa chọn:

| Lựa chọn | Cách làm |
|---|---|
| **A. Mã hoá bằng mật khẩu (khuyên dùng)** | Chạy `python tools/convert.py file.xlsx --password "MậtKhẩuCủaBạn"` (xem mục 5). Dữ liệu trên GitHub là chuỗi mã hoá AES-256, chỉ ai nhập đúng mật khẩu mới xem được. |
| B. Chỉ dùng nội bộ | Không đưa lên GitHub; mở `index.html` trực tiếp trên máy hoặc đặt trên máy chủ nội bộ công ty. |
| C. Đăng công khai | Chỉ khi bạn được phép công khai dữ liệu này. |

---

## 1. Bộ file gồm những gì

```
lab-xvt-webapp/
├── index.html            ← trang chính
├── .nojekyll             ← báo GitHub Pages không xử lý Jekyll (giữ nguyên)
├── HUONG_DAN.md          ← file hướng dẫn này
├── assets/
│   ├── style.css         ← giao diện (sáng/tối, điện thoại, in A4 ngang)
│   ├── app.js            ← toàn bộ chức năng
│   ├── config.js         ← ✏️ cấu hình: tiêu đề, tên nhóm, ý nghĩa màu…
│   └── data.js           ← 📊 DỮ LIỆU (tự sinh từ Excel, đừng sửa tay)
└── tools/
    └── convert.py        ← script chuyển Excel → assets/data.js
```

## 2. Xem thử trên máy (không cần Internet)

Bấm đúp **`index.html`** – trang mở ngay trong trình duyệt. (Riêng nút *Xuất Excel .xlsx* cần Internet để tải thư viện; xuất **CSV** và các chức năng khác chạy offline.)

## 3. Đưa lên GitHub Pages – từng bước (không cần dùng dòng lệnh)

**Bước 1 – Tạo tài khoản & repo**
1. Vào <https://github.com> → *Sign up* (nếu chưa có tài khoản).
2. Bấm dấu **+** góc trên phải → **New repository**.
3. **Repository name**:
   - đặt `lab-xvt` → web sẽ ở `https://<tên-tài-khoản>.github.io/lab-xvt/`
   - hoặc đặt đúng `<tên-tài-khoản>.github.io` → web ở `https://<tên-tài-khoản>.github.io/`
4. Chọn **Public** (Pages miễn phí cần repo Public) → **Create repository**.

**Bước 2 – Tải file lên**
1. Trong repo vừa tạo, bấm **uploading an existing file** (hoặc *Add file → Upload files*).
2. Mở thư mục `lab-xvt-webapp` đã giải nén, **chọn tất cả bên trong** (`index.html`, `assets`, `tools`, `HUONG_DAN.md`) rồi **kéo thả** vào trang GitHub.
   > ⚠️ `index.html` phải nằm **ở ngoài cùng** của repo, không được nằm trong một thư mục con.
3. Kéo xuống, bấm **Commit changes**.

**Bước 3 – Bật GitHub Pages**
1. Vào tab **Settings** của repo → menu trái chọn **Pages**.
2. Mục *Build and deployment* → **Source: Deploy from a branch**.
3. **Branch: `main`**, thư mục **`/ (root)`** → **Save**.
4. Chờ 1–2 phút, tải lại trang Settings → Pages sẽ hiện dòng **“Your site is live at https://…”**. Bấm vào là xong 🎉

**Cách khác – dùng Git (nếu bạn quen dòng lệnh)**
```bash
cd lab-xvt-webapp
git init && git add . && git commit -m "Web app tài sản LAB"
git branch -M main
git remote add origin https://github.com/<tên-tài-khoản>/lab-xvt.git
git push -u origin main
```
rồi làm Bước 3.

## 4. Cập nhật khi file Excel thay đổi

1. Cài một lần: **Python 3** (<https://python.org>, nhớ tick *Add to PATH*) rồi chạy `pip install openpyxl`.
2. Mở Terminal / CMD tại thư mục `lab-xvt-webapp`, chạy:
   ```bash
   python tools/convert.py "Tài_sản-Vật_tư_Truyền_dẫn-LAB-XVT.xlsx"
   ```
   Script in báo cáo từng sheet, mỗi sheet phải ghi **`→ OK`** (nghĩa là số ô trên web = số ô trong Excel).
3. Tải **`assets/data.js`** mới lên GitHub (*Add file → Upload files*, chọn đè file cũ → Commit).
4. Sau ~1 phút web cập nhật (nếu chưa thấy: bấm **Ctrl + F5**).

> Người đã chỉnh sửa cục bộ trên máy mình sẽ được hỏi: dùng dữ liệu mới hay giữ chỉnh sửa cũ.

## 5. Bảo vệ bằng mật khẩu (tuỳ chọn, khuyên dùng)

```bash
pip install cryptography
python tools/convert.py "Tài_sản-Vật_tư_Truyền_dẫn-LAB-XVT.xlsx" --password "MậtKhẩuMạnh123"
```
- `assets/data.js` lúc này chỉ chứa dữ liệu **mã hoá AES-256-GCM** (khoá sinh từ mật khẩu bằng PBKDF2, 200.000 vòng). Mở web sẽ hiện màn hình nhập mật khẩu.
- Quên mật khẩu = không giải mã được; hãy chạy lại lệnh trên với mật khẩu mới.
- Mật khẩu càng dài càng an toàn. Web phải mở bằng `https://` (GitHub Pages đã là https) hoặc `localhost`/file trên máy.
- Lưu ý: chỉnh sửa cục bộ (mục 6) được lưu trong trình duyệt của người dùng ở dạng **không mã hoá** trên chính máy họ.

## 6. Cách dùng web app

| Chức năng | Cách dùng |
|---|---|
| **Tổng quan** | Thẻ thống kê: số sheet, khối, dòng, tỷ lệ **Đã kiểm**, số dòng ghi “??”, thống kê **Tình trạng** (tốt/hỏng/lỗi), chú giải **màu tô**, bảng tiến độ từng sheet (bấm để mở sheet). |
| **Thanh bên** | Chọn sheet. Trên điện thoại: bấm ☰. Mỗi sheet có số dòng. |
| **Tìm kiếm toàn bộ** | Ô trên cùng (phím **/**). Gõ **không dấu** vẫn tìm được (`hong` ra “hỏng”), nhiều từ = phải chứa tất cả. Kết quả gom theo sheet/khối, từ khoá được tô vàng. |
| **Lọc trong sheet** | Ô *Lọc trong sheet này*, lọc **đã tích / chưa tích**, lọc **theo màu tô** của Excel. |
| **Khối thiết bị** | Mỗi sheet gồm nhiều khối (vd HW3500 / HW7500 / HW3900). Bấm tiêu đề để thu gọn; thanh nút phía trên để nhảy nhanh tới khối. |
| **Chế độ ✏️ Chỉnh sửa** | Bật để: tích **Đã kiểm**, sửa trực tiếp mọi ô (Esc = huỷ), **＋ Thêm dòng**, **✕ Xoá dòng**. Lưu tự động **trong trình duyệt này**. |
| **⬇ Xuất / Sao lưu** | Excel (tất cả sheet / sheet đang xem), CSV, **Sao lưu JSON** (kèm chỉnh sửa) và **Nhập** lại bản sao lưu, **Khôi phục dữ liệu gốc**. |
| **🖨 In** | In trang đang xem, tự đặt **A4 ngang**, ẩn menu/nút, mở rộng mọi khối. |
| **🌓 Giao diện** | Sáng / tối (nhớ lựa chọn). |

> **Quan trọng:** website trên GitHub Pages là tĩnh nên **chỉnh sửa/tích chọn của mỗi người chỉ lưu trên trình duyệt của họ**, không tự đồng bộ cho người khác. Muốn cập nhật dữ liệu chung: sửa Excel → làm lại mục 4. Muốn chia sẻ chỉnh sửa: dùng *Sao lưu JSON* gửi cho người khác rồi họ *Nhập*.

## 7. Nội dung từng sheet trên web

Cột tích **✓ Đã kiểm** chính là ô ☑ ở cột A của Excel (373 dòng đang được tích). Mỗi khối là một bảng riêng, đúng tên cột của Excel. Cột **“Ghi chú thêm (H/I/J/L)”** là các cột phụ nằm ngoài bảng gốc (vd: kho, chuyển NET2, bàn giao…). Ô **gộp** được giữ nguyên (gộp ngang → trải nhiều cột; gộp dọc → lặp lại nội dung ở các dòng, chữ **nghiêng mờ**). Màu tô nền của Excel được giữ lại.

| Sheet | Khối | Dòng | ✓ | Các khối thiết bị trong sheet (số dòng) | Ghi chú riêng |
|---|---:|---:|---:|---|---|
| XTC10-MTC9 | 3 | 43 | 41 | **XTC10** (28); **MTC9** (8); **OTC9** (7) |  |
| Ciena 5430 | 2 | 56 | 53 | **Ciena 5430** (46); **CIENA 6500T** (10) | Có cột phụ “Ghi chú thêm” |
| OME6500_14slot | 1 | 11 | 11 | **OME6500 _ 14 Slot** (11) | Có cột phụ “Ghi chú thêm” |
| NoKIA BB1 | 1 | 10 | 10 | **NOKIA BB1** (10) |  |
| OME6500_32slot | 1 | 11 | 10 | **OME6500 DD _ 32 Slot** (11) | Có cột phụ “Ghi chú thêm” |
| PSS16-64 | 1 | 11 | 11 | **PSS16-64** (11) | Có cột phụ “Ghi chú thêm” |
| HW3500-7500 | 3 | 75 | 51 | **HW3500** (17); **HW7500** (21); **HW3900** (37) | Có cột phụ “Ghi chú thêm” |
| HW6800-8800 | 2 | 34 | 30 | **HW6800** (8); **HW8800** (26) | Có cột phụ “Ghi chú thêm” |
| Alu1850-1830 | 2 | 21 | 19 | **Alcatel 1850** (15); **Alcatel 1830** (6) | Có cột phụ “Ghi chú thêm” |
| Alu 1660-1662 | 3 | 83 | 76 | **Alcatel 1662** (26); **Alcatel 1660** (27); **Alcatel 1660 (tiếp)** (30) | Cột Part/Serial đảo thứ tự (PasNumber ↔ Serial No) như file gốc; Có cột phụ “Ghi chú thêm” |
| HW9500-Ericson | 3 | 51 | 5 | **HW9500** (23); **MHL3000** (12); **OMS3255** (16) | Có cột phụ “Ghi chú thêm” |
| Trang tính14 | 1 | 94 | 56 | **Trang tính14** (94) | Có cột **Đến / Đi** (ngày); Có cột **Tình trạng** (tốt/hỏng…); Có cột phụ “Ghi chú thêm” |
| Không rõ NG | 1 | 118 | 0 | **Không rõ NG** (118) | Có cột **Tình trạng** (tốt/hỏng…); Có cột phụ “Ghi chú thêm” |
| VT đo kiểm | 2 | 137 | 0 | **VT đo kiểm** (121); **VT đo kiểm (tiếp)** (16) | Có cột **Đến / Đi** (ngày); Có cột **Tình trạng** (tốt/hỏng…); Có cột phụ “Ghi chú thêm” |

## 8. Tuỳ chỉnh (`assets/config.js`)

- `title`, `subtitle`: tiêu đề trên thanh trên cùng.
- `checkLabel`: đổi tên cột tích (vd “Đã kiểm kê”, “Có tại LAB”…).
- `sheetLabels`: đổi tên hiển thị cho sheet, ví dụ `'trang-tinh14': 'Vật tư theo dõi tình trạng'`.
- `colorMeaning`: ghi **ý nghĩa màu tô** (vd `'FFFF00': 'Cần kiểm tra lại'`) – sẽ hiện ở Tổng quan và ô lọc màu.
- `groupNames`: tên 2 nhóm sheet ở thanh bên. `maxSearchResults`: số dòng tối đa khi tìm kiếm.

## 9. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Vào link báo **404** | Chờ 1–2 phút sau khi bật Pages; kiểm tra `index.html` nằm ngoài cùng repo; đúng đường dẫn `.../<tên-repo>/`. |
| Trang trắng / “Không tìm thấy dữ liệu” | Thiếu `assets/data.js` hoặc chưa upload thư mục `assets`. |
| Sửa xong vẫn thấy bản cũ | Bấm **Ctrl + F5** (xoá cache). |
| Nút *Excel .xlsx* báo chưa tải được thư viện | Cần Internet; hoặc dùng **CSV**. File CSV mở bằng Excel (đã có dòng `sep=,` để Excel tự tách cột). |
| `python` không nhận lệnh | Cài lại Python và tick *Add to PATH*; hoặc dùng `py tools/convert.py ...` trên Windows. |
| Không lưu được chỉnh sửa | Trình duyệt đang ở chế độ ẩn danh / chặn lưu trữ → dùng *Sao lưu JSON*. |

## 10. Ghi chú về việc chuyển đổi

- Đã đối chiếu **từng sheet**: số ô có nội dung trên web = số ô trong Excel (script báo `OK`). Chỉ có **5 ô bị bỏ qua có chủ đích** (đều là “rác” của file gốc): số `1` thừa trong dòng tiêu đề ở sheet *Ciena 5430* và *NoKIA BB1*, và chữ “STT” nằm cùng dòng với tên khối ở 3 sheet *Ciena 5430*, *OME6500_14slot*, *NoKIA BB1*.
- Ô số dài (Serial/Part Number) được giữ nguyên dạng chữ số, ngày được hiển thị `dd/mm/yyyy` (một số ô gốc là chữ như `6/15/2021` được giữ nguyên).
- Cột phụ nằm ngoài bảng gốc (cột H, I, J, L…) hiển thị với tên **“Ghi chú thêm (H)”**… để không mất thông tin.
- Hộp chọn (data validation) “Lựa chọn 1/2” và định dạng có điều kiện ở ô J7/J13 sheet *XTC10-MTC9* là phần dư không có dữ liệu nên không chuyển.
- Excel xuất từ web có **nội dung** nhưng không có màu tô (thư viện miễn phí không hỗ trợ).
- Ý nghĩa cột A (☑) mình đặt tên là **“Đã kiểm”** – nếu thực tế là ý nghĩa khác hãy đổi `checkLabel`.
