/* =====================================================================
   ĐỒNG BỘ DỮ LIỆU LOCAL & FIREBASE (KHÔNG CÒN PHIẾU / BBBG / QR)
   ===================================================================== */
window.LabSync = (() => {
  const { STORAGE_KEY, FIREBASE, DEFAULT_SOURCE, SOURCE_OPTIONS } = window.APP_CONFIG;

  function normalizeSource(val) {
    if (!val) return DEFAULT_SOURCE;
    const trimmed = String(val).trim();
    if (SOURCE_OPTIONS.includes(trimmed)) return trimmed;
    const lower = trimmed.toLowerCase();
    if (lower.includes("tài sản")) return "Tài sản";
    if (lower.includes("đo kiểm")) return "Đo kiểm";
    if (lower.includes("sửa chữa")) return "Sửa chữa";
    if (lower.includes("vật tư")) return "Vật tư";
    return "Không rõ nguồn";
  }

  // Chuẩn hóa mọi dòng về đúng 7 cột:
  // [Nguồn, STT, Tên Vật Tư, Serial, Mã VT, Part number, Ghi chú]
  function normalizeRow(row, index, sheetDefaultSource) {
    const rawV = Array.isArray(row.v) ? row.v : [];
    // Hỗ trợ tương thích nếu dữ liệu cũ có dạng [STT, Mã VT, Tên VT, Serial, Part No, Ghi chú]
    let src, stt, tenVT, serial, maVT, partNo, ghiChu;

    if (rawV.length >= 7) {
      src = normalizeSource(row.src || rawV[0] || sheetDefaultSource);
      stt = String(rawV[1] ?? (index + 1));
      tenVT = String(rawV[2] ?? "");
      serial = String(rawV[3] ?? "");
      maVT = String(rawV[4] ?? "");
      partNo = String(rawV[5] ?? "");
      ghiChu = String(rawV[6] ?? "");
    } else {
      src = normalizeSource(row.src || sheetDefaultSource);
      stt = String(rawV[0] ?? (index + 1));
      maVT = String(rawV[1] ?? "");
      tenVT = String(rawV[2] ?? "");
      serial = String(rawV[3] ?? "");
      partNo = String(rawV[4] ?? "");
      ghiChu = String(rawV[5] ?? "");
    }

    return {
      r: row.r ?? index + 1,
      c: true,
      src,
      v: [src, stt, tenVT, serial, maVT, partNo, ghiChu]
    };
  }

  function buildInitialData() {
    const baseSheets = (window.LAB_DATA && Array.isArray(window.LAB_DATA.sheets))
      ? window.LAB_DATA.sheets
      : [];

    const sheets = baseSheets.map((sheet, sIdx) => {
      const defaultSrc = sheet.id === "tai-san-khac"
        ? "Tài sản"
        : sheet.id === "vt-do-kiem"
          ? "Đo kiểm"
          : DEFAULT_SOURCE;

      const blocks = (sheet.blocks || []).map((block, bIdx) => {
        const rows = (block.rows || []).map((r, rIdx) => normalizeRow(r, rIdx, defaultSrc));
        return {
          title: block.title || sheet.name || `Bảng ${bIdx + 1}`,
          hr: block.hr || 3,
          cols: [...window.APP_CONFIG.TABLE_COLUMNS],
          rows
        };
      });

      return {
        id: sheet.id || `sheet-${sIdx}`,
        name: sheet.name || `Thư mục ${sIdx + 1}`,
        group: typeof sheet.group === "number" ? sheet.group : 0,
        blocks
      };
    });

    return {
      meta: {
        ...(window.LAB_DATA?.meta || {}),
        updatedAt: new Date().toISOString()
      },
      sheets
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc localStorage:", e);
    }
    const initial = buildInitialData();
    saveLocal(initial);
    return initial;
  }

  function saveLocal(state) {
    state.meta = { ...(state.meta || {}), updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async function pushRemote(state) {
    if (!FIREBASE.enabled || !FIREBASE.dbUrl) return;
    const url = `${FIREBASE.dbUrl.replace(/\/$/, "")}/${FIREBASE.rootPath}.json`;
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    });
  }

  async function saveState(state, onStatus) {
    saveLocal(state);
    if (onStatus) onStatus("Đã lưu cục bộ (" + new Date().toLocaleTimeString("vi-VN") + ")");
    if (FIREBASE.enabled && FIREBASE.dbUrl) {
      try {
        await pushRemote(state);
        if (onStatus) onStatus("Đã đồng bộ Firebase (" + new Date().toLocaleTimeString("vi-VN") + ")");
      } catch (err) {
        if (onStatus) onStatus("Lưu máy thành công (lỗi mạng Firebase)");
      }
    }
  }

  return {
    loadState,
    saveState,
    normalizeRow,
    normalizeSource
  };
})();
