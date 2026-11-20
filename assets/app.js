/* =====================================================================
   ĐIỀU KHIỂN GIAO DIỆN CÂY THƯ MỤC, BẢNG NGUỒN & CHUYỂN THƯ MỤC
   ===================================================================== */
(() => {
  const { SOURCE_OPTIONS, FOLDER_GROUPS, DEFAULT_SOURCE } = window.APP_CONFIG;

  let state = window.LabSync.loadState();
  let activeSheetId = state.sheets[0]?.id || "";
  let searchQuery = "";
  let sourceFilter = "ALL";
  let pendingMove = null; // { sheetId, blockIdx, rowIdx }

  const elTree = document.getElementById("folder-tree");
  const elTitle = document.getElementById("current-sheet-title");
  const elCount = document.getElementById("item-count-badge");
  const elTbody = document.getElementById("inventory-tbody");
  const elSearch = document.getElementById("search-input");
  const elFilterSource = document.getElementById("filter-source");
  const elAddRowBtn = document.getElementById("add-row-btn");
  const elSyncStatus = document.getElementById("sync-status");

  const elMoveModal = document.getElementById("move-modal");
  const elMoveSummary = document.getElementById("move-item-summary");
  const elTargetFolder = document.getElementById("target-folder-select");
  const elCancelMove = document.getElementById("cancel-move-btn");
  const elConfirmMove = document.getElementById("confirm-move-btn");

  function setStatus(msg) {
    if (elSyncStatus) elSyncStatus.textContent = msg;
  }

  function getActiveSheet() {
    return state.sheets.find(s => s.id === activeSheetId) || state.sheets[0];
  }

  function countSheetRows(sheet) {
    if (!sheet) return 0;
    return (sheet.blocks || []).reduce((sum, b) => sum + (b.rows ? b.rows.length : 0), 0);
  }

  function renderTree() {
    elTree.innerHTML = "";
    const groups = [...new Set(state.sheets.map(s => s.group ?? 0))];

    groups.forEach(groupId => {
      const groupTitle = document.createElement("div");
      groupTitle.className = "tree-group-title";
      groupTitle.textContent = FOLDER_GROUPS[groupId] || `Nhóm ${groupId}`;
      elTree.appendChild(groupTitle);

      state.sheets
        .filter(s => (s.group ?? 0) === groupId)
        .forEach(sheet => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `tree-item ${sheet.id === activeSheetId ? "active" : ""}`;
          btn.innerHTML = `
            <span>📁 ${escapeHtml(sheet.name)}</span>
            <span class="badge">${countSheetRows(sheet)}</span>
          `;
          btn.addEventListener("click", () => {
            activeSheetId = sheet.id;
            renderAll();
          });
          elTree.appendChild(btn);
        });
    });
  }

  function renderTable() {
    const sheet = getActiveSheet();
    if (!sheet) {
      elTitle.textContent = "Không có thư mục";
      elTbody.innerHTML = "";
      return;
    }

    elTitle.textContent = sheet.name;
    let totalShown = 0;
    const rowsHtml = [];

    const q = searchQuery.trim().toLowerCase();

    (sheet.blocks || []).forEach((block, blockIdx) => {
      (block.rows || []).forEach((row, rowIdx) => {
        const v = row.v || [DEFAULT_SOURCE, "", "", "", "", "", ""];
        const currentSource = window.LabSync.normalizeSource(row.src || v[0]);
        v[0] = currentSource;

        if (sourceFilter !== "ALL" && currentSource !== sourceFilter) return;

        const searchableText = [
          currentSource, v[1], v[2], v[3], v[4], v[5], v[6]
        ].join(" ").toLowerCase();

        if (q && !searchableText.includes(q)) return;

        totalShown++;

        const optionsHtml = SOURCE_OPTIONS.map(opt =>
          `<option value="${escapeAttr(opt)}" ${opt === currentSource ? "selected" : ""}>${escapeHtml(opt)}</option>`
        ).join("");

        rowsHtml.push(`
          <tr>
            <td>
              <select class="source-select" data-b="${blockIdx}" data-r="${rowIdx}" title="Chọn nguồn">
                ${optionsHtml}
              </select>
            </td>
            <td>${escapeHtml(v[1] || String(rowIdx + 1))}</td>
            <td contenteditable="true" data-b="${blockIdx}" data-r="${rowIdx}" data-col="2">${escapeHtml(v[2])}</td>
            <td contenteditable="true" data-b="${blockIdx}" data-r="${rowIdx}" data-col="3">${escapeHtml(v[3])}</td>
            <td contenteditable="true" data-b="${blockIdx}" data-r="${rowIdx}" data-col="4">${escapeHtml(v[4])}</td>
            <td contenteditable="true" data-b="${blockIdx}" data-r="${rowIdx}" data-col="5">${escapeHtml(v[5])}</td>
            <td contenteditable="true" data-b="${blockIdx}" data-r="${rowIdx}" data-col="6">${escapeHtml(v[6])}</td>
            <td>
              <button type="button" class="move-btn" data-b="${blockIdx}" data-r="${rowIdx}" title="Chuyển sang thư mục khác">
                ➜ Chuyển
              </button>
            </td>
          </tr>
        `);
      });
    });

    elCount.textContent = `${totalShown} / ${countSheetRows(sheet)} mục`;
    elTbody.innerHTML = rowsHtml.length
      ? rowsHtml.join("")
      : `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:20px;">Không có dữ liệu phù hợp</td></tr>`;

    bindRowEvents();
  }

  function bindRowEvents() {
    const sheet = getActiveSheet();
    if (!sheet) return;

    // Đổi sổ chọn Nguồn
    elTbody.querySelectorAll("select.source-select").forEach(sel => {
      sel.addEventListener("change", async e => {
        const b = Number(e.target.dataset.b);
        const r = Number(e.target.dataset.r);
        const newSrc = window.LabSync.normalizeSource(e.target.value);
        const row = sheet.blocks[b].rows[r];
        row.src = newSrc;
        row.v[0] = newSrc;
        await window.LabSync.saveState(state, setStatus);
        renderTable();
      });
    });

    // Chỉnh sửa trực tiếp ô text
    elTbody.querySelectorAll("td[contenteditable='true']").forEach(cell => {
      cell.addEventListener("blur", async e => {
        const b = Number(e.target.dataset.b);
        const r = Number(e.target.dataset.r);
        const col = Number(e.target.dataset.col);
        const row = sheet.blocks[b].rows[r];
        row.v[col] = e.target.textContent.trim();
        await window.LabSync.saveState(state, setStatus);
      });
    });

    // Nút mũi tên chuyển dòng sang thư mục khác
    elTbody.querySelectorAll("button.move-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const b = Number(e.target.dataset.b);
        const r = Number(e.target.dataset.r);
        openMoveModal(sheet.id, b, r);
      });
    });
  }

  function openMoveModal(fromSheetId, blockIdx, rowIdx) {
    const fromSheet = state.sheets.find(s => s.id === fromSheetId);
    const row = fromSheet?.blocks?.[blockIdx]?.rows?.[rowIdx];
    if (!fromSheet || !row) return;

    pendingMove = { fromSheetId, blockIdx, rowIdx };
    const tenVT = row.v[2] || "(Chưa có tên)";
    const serial = row.v[3] || "-";
    elMoveSummary.innerHTML = `
      <div><strong>Mục:</strong> ${escapeHtml(tenVT)}</div>
      <div><strong>Serial:</strong> ${escapeHtml(serial)}</div>
      <div><strong>Thư mục hiện tại:</strong> ${escapeHtml(fromSheet.name)}</div>
    `;

    const targets = state.sheets.filter(s => s.id !== fromSheetId);
    elTargetFolder.innerHTML = targets
      .map(s => `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`)
      .join("");

    elMoveModal.classList.add("open");
  }

  function closeMoveModal() {
    pendingMove = null;
    elMoveModal.classList.remove("open");
  }

  elConfirmMove.addEventListener("click", async () => {
    if (!pendingMove) return;
    const { fromSheetId, blockIdx, rowIdx } = pendingMove;
    const targetSheetId = elTargetFolder.value;

    const fromSheet = state.sheets.find(s => s.id === fromSheetId);
    const toSheet = state.sheets.find(s => s.id === targetSheetId);
    if (!fromSheet || !toSheet) return;

    if (!toSheet.blocks || toSheet.blocks.length === 0) {
      toSheet.blocks = [{
        title: toSheet.name,
        hr: 3,
        cols: [...window.APP_CONFIG.TABLE_COLUMNS],
        rows: []
      }];
    }

    const [movedRow] = fromSheet.blocks[blockIdx].rows.splice(rowIdx, 1);
    if (movedRow) {
      toSheet.blocks[0].rows.push(movedRow);
      reindexRows(fromSheet.blocks[blockIdx]);
      reindexRows(toSheet.blocks[0]);
      await window.LabSync.saveState(state, setStatus);
      closeMoveModal();
      renderAll();
    }
  });

  elCancelMove.addEventListener("click", closeMoveModal);
  elMoveModal.addEventListener("click", e => {
    if (e.target === elMoveModal) closeMoveModal();
  });

  function reindexRows(block) {
    (block.rows || []).forEach((row, idx) => {
      row.r = idx + 1;
      row.v[1] = String(idx + 1);
    });
  }

  elAddRowBtn.addEventListener("click", async () => {
    const sheet = getActiveSheet();
    if (!sheet) return;
    if (!sheet.blocks || sheet.blocks.length === 0) {
      sheet.blocks = [{
        title: sheet.name,
        hr: 3,
        cols: [...window.APP_CONFIG.TABLE_COLUMNS],
        rows: []
      }];
    }
    const block = sheet.blocks[0];
    const nextStt = String((block.rows?.length || 0) + 1);
    const defaultSrc = sheet.id === "tai-san-khac" ? "Tài sản" : DEFAULT_SOURCE;

    block.rows.push({
      r: Number(nextStt),
      c: true,
      src: defaultSrc,
      v: [defaultSrc, nextStt, "", "", "", "", ""]
    });

    await window.LabSync.saveState(state, setStatus);
    renderAll();
  });

  elSearch.addEventListener("input", e => {
    searchQuery = e.target.value;
    renderTable();
  });

  elFilterSource.addEventListener("change", e => {
    sourceFilter = e.target.value;
    renderTable();
  });

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return String(str ?? "").replace(/"/g, "&quot;");
  }

  function renderAll() {
    renderTree();
    renderTable();
  }

  setStatus("Sẵn sàng");
  renderAll();
})();
