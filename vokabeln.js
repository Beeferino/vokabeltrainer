// ==============================
// Beeferino – vokabeln.js (Full version)
// ==============================
window.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  // === Kategorien ===
  const CATEGORY_NAMES = {
    Gelb: "Grundwerkzeuge Metallverarbeitung",
    Pink: "Werkzeugkasten Mechaniker",
    Blau: "Blech- / Kunststoffarbeiten",
    Gruen: "Drehen / Fräsen",
    HellesPink: "Hydraulik / Pneumatik",
    Orange: "Elektrotechnik",
    Dunkelgruen: "Fluggerätemechanik allgemein",
  };
  const COLOR_MAP = {
    Gelb: "#F4D03F",
    Pink: "#E91E63",
    Blau: "#1976D2",
    Gruen: "#1E8449",
    HellesPink: "#F54927",
    Orange: "#E67E22",
    Dunkelgruen: "#117A65",
  };
  const TEXT_ON = {
    Gelb: "#000",
    Pink: "#fff",
    Blau: "#fff",
    Gruen: "#fff",
    HellesPink: "#fff",
    Orange: "#fff",
    Dunkelgruen: "#fff",
  };

  // === Datenquellen ===
  const RAW_URL = "https://beeferino.github.io/vokabeltrainer/vokabeln.json";
  const GH_OWNER = "beeferino",
    GH_REPO = "vokabeltrainer",
    GH_PATH = "vokabeln.json";

  // === State ===
  let list = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let sortState = { col: null, dir: 1 };
  let currentLetter = "Alle";
  let editIndex = null;

  // === Helpers ===
  const normalize = (v) => [
    v[0] || "",
    v[1] || "",
    v[2] || "Gelb",
    v[3] || "",
    v[4] || "",
    v[5] || new Date().toISOString(),
    typeof v[6] === "number" ? v[6] : 0,
    v[7] || crypto.randomUUID(),
  ];
  const loadLocal = () =>
    JSON.parse(localStorage.getItem("vokabeln") || "[]").map(normalize);
  const saveLocal = (d) => localStorage.setItem("vokabeln", JSON.stringify(d));

  async function loadData() {
    try {
      const res = await fetch(RAW_URL, { cache: "no-store" });
      list = (await res.json()).map(normalize);
      saveLocal(list);
    } catch {
      list = loadLocal();
    }
    renderApp();
    renderABCOverlay();
    initTheme();
  }

  // === DESKTOP Ansicht ===
  function renderApp() {
    app.innerHTML = `
      <div class="desktop-app">
        <h1>📘 Vokabelübersicht</h1>
        <div class="hr"></div>
        <div class="toolbar">
          <button id="homeBtn" class="btn ghost" title="Zurück zum Trainer">🏠</button>
          <input id="searchDesk" placeholder="Suchen…" />
          <select id="filterCatDesk"></select>
          <button id="resetDesk" class="btn">Reset</button>
          <button id="addDesk" class="btn">➕ Neue</button>
          <button id="delDesk" class="btn warn">🗑️ Löschen</button>
          <button id="syncDesk" class="btn">📤 Sync</button>
        </div>
        <div id="countDesk" style="text-align:center;margin:8px 0;font-weight:600;color:#1e3a8a"></div>
        <div class="table-wrap">
          <table id="tbl">
            <thead>
              <tr>
                <th class="select-col"></th>
                <th class="sortable" data-sort="0">Englisch ⬍</th>
                <th class="sortable" data-sort="1">Deutsch ⬍</th>
                <th>Kategorie</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div id="pagination" style="text-align:center;margin:16px 0;"></div>
      </div>
    `;

    const sel = document.getElementById("filterCatDesk");
    sel.innerHTML = '<option value="Alle">Alle (bunt gemischt)</option>';
    Object.keys(CATEGORY_NAMES).forEach((k) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = CATEGORY_NAMES[k];
      o.style.background = COLOR_MAP[k];
      o.style.color = TEXT_ON[k];
      sel.appendChild(o);
    });

    addDesktopListeners();
    enableSorting();
    renderTable();
  }

  function currentFilter() {
    const cat = document.getElementById("filterCatDesk").value || "Alle";
    const q = (document.getElementById("searchDesk").value || "")
      .trim()
      .toLowerCase();
    return { cat, q };
  }

  function filtered() {
    const { cat, q } = currentFilter();
    return list.filter((v) => {
      const matchCat = cat === "Alle" || v[2] === cat;
      const matchQ =
        !q ||
        v[0].toLowerCase().includes(q) ||
        v[1].toLowerCase().includes(q);
      const matchLetter =
        currentLetter === "Alle" || v[0].toUpperCase().startsWith(currentLetter);
      return matchCat && matchQ && matchLetter;
    });
  }

  function renderTable() {
    const data = filtered();
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = data.slice(start, start + PAGE_SIZE);

    const tbody = document.querySelector("#tbl tbody");
    tbody.innerHTML = pageData
      .map((v) => {
        const idx = list.findIndex((x) => x[7] === v[7]);
        return `<tr>
          <td><input type="checkbox" class="rowcheck" data-idx="${idx}"></td>
          <td>${v[0]}${v[6]===1?` <span title="Verwechslungsgefahr" style="color:#ef4444">⚠️</span>`:""}</td>
          <td>${v[1]}</td>
          <td><span class="category-chip" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</span></td>
          <td><button class="btn" data-edit="${idx}">✏️ Bearbeiten</button></td>
        </tr>`;
      })
      .join("");

    document.querySelectorAll('button[data-edit]').forEach((b)=> b.onclick=()=>openEdit(+b.dataset.edit));

    document.getElementById("countDesk").textContent = `📘 ${data.length} Vokabel${data.length !== 1 ? "n" : ""} gefunden`;

    const pages = Math.ceil(data.length / PAGE_SIZE) || 1;
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = `
      <button class="btn" ${currentPage===1?"disabled":""} id="prevPage">⬅️ Zurück</button>
      <span style="margin:0 10px;font-weight:600;">Seite ${currentPage} / ${pages}</span>
      <button class="btn" ${currentPage===pages?"disabled":""} id="nextPage">Weiter ➡️</button>
    `;
    document.getElementById("prevPage").onclick = () => { if (currentPage>1){ currentPage--; renderTable(); } };
    document.getElementById("nextPage").onclick = () => { if (currentPage<pages){ currentPage++; renderTable(); } };
  }

  function addDesktopListeners() {
    const fDesk = document.getElementById("filterCatDesk");
    if (fDesk) {
      const updateFilterColor = () => {
        const val = fDesk.value;
        if (val && COLOR_MAP[val]) {
          fDesk.style.background = COLOR_MAP[val];
          fDesk.style.color = TEXT_ON[val];
        } else {
          fDesk.style.background = "";
          fDesk.style.color = "";
        }
      };
      fDesk.addEventListener("change", updateFilterColor);
      updateFilterColor();
    }
    document.getElementById("filterCatDesk").onchange = () => { currentPage=1; renderTable(); };
    document.getElementById("searchDesk").oninput = () => { currentPage=1; renderTable(); };
    document.getElementById("resetDesk").onclick = () => {
      document.getElementById("filterCatDesk").value = "Alle";
      document.getElementById("searchDesk").value = "";
      currentPage = 1; currentLetter = "Alle";
      renderTable();
    };
    document.getElementById("addDesk").onclick = () => openEdit(null);
    document.getElementById("delDesk").onclick = () => bulkDelete();
    document.getElementById("syncDesk").onclick = githubSync;
    document.getElementById("homeBtn").onclick = () => window.location.href = "index.html";
  }

  function enableSorting() {
    document.querySelectorAll("th.sortable").forEach((th) => {
      th.onclick = () => {
        const col = parseInt(th.dataset.sort);
        if (sortState.col === col) sortState.dir *= -1;
        else { sortState.col = col; sortState.dir = 1; }
        list.sort((a, b) => (a[col] || "").toLowerCase().localeCompare((b[col] || "").toLowerCase()) * sortState.dir);
        saveLocal(list);
        renderTable();
      };
    });
  }

  // === Modal ===
  const modal = document.getElementById("modal");
  const mEn = document.getElementById("mEn");
  const mDe = document.getElementById("mDe");
  const mCat = document.getElementById("mCat");
  const mHint = document.getElementById("mHint");
  const mConfuse = document.getElementById("mConfuse");
  const mCancel = document.getElementById("mCancel");
  const mSave = document.getElementById("mSave");
  const mDelete = document.getElementById("mDelete");

  function fillModalCategories() {
    mCat.innerHTML = "";
    Object.keys(CATEGORY_NAMES).forEach((k) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = CATEGORY_NAMES[k];
      o.style.background = COLOR_MAP[k];
      o.style.color = TEXT_ON[k];
      mCat.appendChild(o);
    });
    mCat.addEventListener("change", () => {
      const sel = mCat.value;
      mCat.style.background = COLOR_MAP[sel];
      mCat.style.color = TEXT_ON[sel];
    });
  }

  function openEdit(i) {
    fillModalCategories();
    editIndex = i;
    if (i === null || i === undefined) {
      mEn.value = "";
      mDe.value = "";
      mCat.value = "Gelb";
      mHint.value = "";
      mConfuse.checked = false;
      document.getElementById("mCreated").value = new Date().toLocaleDateString();
    } else {
      const v = list[i];
      mEn.value = v[0];
      mDe.value = v[1];
      mCat.value = v[2];
      mHint.value = v[4] || "";
      mConfuse.checked = v[6] === 1;
      document.getElementById("mCreated").value = new Date(v[5]).toLocaleDateString();
    }
    mCat.style.background = COLOR_MAP[mCat.value];
    mCat.style.color = TEXT_ON[mCat.value];
    modal.style.display = "flex";
  }

  mCancel.onclick = () => modal.style.display = "none";
  modal.addEventListener("click",(e)=>{ if(e.target===modal) modal.style.display="none"; });

  mSave.onclick = () => {
    const en = mEn.value.trim();
    const de = mDe.value.trim();
    const cat = mCat.value;
    const hint = mHint.value.trim();
    const confuse = mConfuse.checked ? 1 : 0;
    if (!en || !de) { alert("Bitte Englisch & Deutsch ausfüllen."); return; }
    const newEntry = [en, de, cat, "", hint, new Date().toISOString(), confuse, crypto.randomUUID()];
    if (editIndex !== null && editIndex !== undefined) {
      const old = list[editIndex];
      list[editIndex] = [en, de, cat, "", hint, old[5], confuse, old[7]];
    } else {
      list.push(newEntry);
    }
    saveLocal(list);
    modal.style.display = "none";
    renderTable();
  };

  mDelete.onclick = () => {
    if (editIndex === null || editIndex === undefined) { alert("Nichts zum Löschen ausgewählt."); return; }
    if (!confirm("Eintrag wirklich löschen?")) return;
    list.splice(editIndex, 1);
    saveLocal(list);
    modal.style.display = "none";
    renderTable();
  };

  function bulkDelete(){
    const checks = Array.from(document.querySelectorAll(".rowcheck:checked")).map(x=>+x.dataset.idx);
    if(!checks.length){ alert("Bitte Zeilen auswählen."); return; }
    if(!confirm(`${checks.length} Einträge löschen?`)) return;
    list = list.filter((_,i)=>!checks.includes(i));
    saveLocal(list);
    renderTable();
  }

  // === Mobile Ansicht ===
  function renderMobileView() {
    app.innerHTML = `
      <div class="mobile-app">
        <div id="mobList" class="mob-list"></div>
        <div class="l-menu">
          <div class="l-row">
            <button id="themeMob" class="l-btn theme" title="Dark/Light">🌗</button>
            <button id="viewMob" class="l-btn view" title="Ansicht wechseln">🗂️</button>
          </div>
          <div class="l-row">
            <button id="addMob" class="l-btn add" title="Neue Vokabel hinzufügen">➕</button>
            <button id="abcToggle" class="l-btn abc">A–Z</button>
          </div>
        </div>
        <div class="abc-overlay" id="abcOverlay">
          <div class="abc-panel">
            <div class="abc-header">
              <span class="abc-title">Wähle Buchstabe</span>
              <button id="abcClose" class="abc-close">✕</button>
            </div>
            <div class="abc-list" id="abcFilter"></div>
          </div>
        </div>
      </div>
    `;
    renderMobileList();
    document.getElementById("themeMob").onclick = toggleTheme;
    document.getElementById("addMob").onclick = () => openEdit(null);
    renderABCOverlayMobile();
    const btnView = document.getElementById("viewMob");
    const currentMode = localStorage.getItem("mobile_view_mode") || "cards";
    btnView.textContent = currentMode === "cards" ? "🗂️" : "📋";
    btnView.onclick = () => {
      const next = currentMode === "cards" ? "table" : "cards";
      localStorage.setItem("mobile_view_mode", next);
      renderMobileList();
    };
  }

  function renderMobileList() {
    const mode = localStorage.getItem("mobile_view_mode") || "cards";
    const container = document.getElementById("mobList");
    if (mode === "cards") {
      container.innerHTML = list
        .map(
          (v, i) => `
          <div class="mob-card" data-idx="${i}">
            <div class="mob-card-top" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">
              ${CATEGORY_NAMES[v[2]]}
            </div>
            <div class="mob-card-content">
              <div class="mob-en">${v[0]}</div>
              <div class="mob-de">${v[1]}</div>
              ${v[6]===1?`<div class="mob-warning">⚠️ Verwechslungsgefahr</div>`:""}
            </div>
          </div>`
        )
        .join("");
      container.querySelectorAll(".mob-card").forEach((c) => {
        c.onclick = () => openEdit(parseInt(c.dataset.idx, 10));
      });
    } else {
      container.innerHTML = `
        <table class="mob-table">
          <thead><tr><th>Englisch</th><th>Deutsch</th><th>Kategorie</th></tr></thead>
          <tbody>
          ${list.map(
            (v,i)=>`
            <tr data-idx="${i}">
              <td>${v[0]}</td><td>${v[1]}</td>
              <td><span class="category-chip" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</span></td>
            </tr>`).join("")}
          </tbody>
        </table>
      `;
      container.querySelectorAll("tr[data-idx]").forEach((r)=>r.onclick=()=>openEdit(parseInt(r.dataset.idx,10)));
    }
  }

  // === ABC Overlay Mobile ===
  function renderABCOverlayMobile() {
    const overlay = document.getElementById("abcOverlay");
    const btn = document.getElementById("abcToggle");
    const close = document.getElementById("abcClose");
    btn.onclick = () => {
      overlay.classList.add("show");
      setTimeout(() => renderABCFilter(), 40);
    };
    close.onclick = () => overlay.classList.remove("show");
  }

  // === ABC Overlay Desktop ===
  function renderABCOverlay() {
    const overlayHTML = `
      <button id="abcToggle" class="abc-toggle">A–Z</button>
      <div class="abc-overlay" id="abcOverlay">
        <div class="abc-panel">
          <div class="abc-header">
            <span class="abc-title">Wähle Buchstabe</span>
            <button id="abcClose" class="abc-close">✕</button>
          </div>
          <div class="abc-list" id="abcFilter"></div>
        </div>
      </div>`;
    if(!document.getElementById("abcOverlay")){
      document.body.insertAdjacentHTML("beforeend", overlayHTML);
    }
    const btn = document.getElementById("abcToggle");
    const overlay = document.getElementById("abcOverlay");
    const close = document.getElementById("abcClose");
    btn.onclick = () => { overlay.classList.add("show"); setTimeout(() => renderABCFilter(), 40); };
    close.onclick = () => overlay.classList.remove("show");
  }

  function renderABCFilter() {
    const container = document.getElementById("abcFilter");
    if (!container) return;
    const letters = ["Alle", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
    container.innerHTML = letters.map(
      (l) => `<button class="abc-btn${l === currentLetter ? " active" : ""}" data-letter="${l}">${l}</button>`
    ).join("");
    container.querySelectorAll(".abc-btn").forEach((btn) => {
      btn.onclick = () => {
        currentLetter = btn.dataset.letter;
        currentPage = 1;
        renderABCFilter();
        renderTable();
        const overlay = document.getElementById("abcOverlay");
        if (overlay) overlay.classList.remove("show");
        const toggle = document.getElementById("abcToggle");
        if (toggle) {
          toggle.textContent = currentLetter === "Alle" ? "A–Z" : currentLetter;
          toggle.style.background = currentLetter === "Alle" ? "var(--blue)" : "#e67e22";
        }
      };
    });
  }

  // === GitHub Sync ===
  function getToken() {
    let t = localStorage.getItem("gh_token") || "";
    if(!t){
      t = prompt("GitHub Token (repo-Scope):","");
      if(t){ localStorage.setItem("gh_token", t); alert("Token gespeichert."); }
    }
    return t;
  }

  async function githubSync() {
    const token = getToken(); if(!token) return;
    try {
      const api = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;
      const get = await fetch(api, { headers: { Authorization: `token ${token}` } });
      const meta = await get.json(); const sha = meta.sha;
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2))));
      const res = await fetch(api, {
        method: "PUT",
        headers: { Authorization: `token ${token}`, "Content-Type":"application/json" },
        body: JSON.stringify({ message: "Update via Vokabel-UI", content, sha })
      });
      if(!res.ok) throw new Error(await res.text());
      alert("✅ Erfolgreich in Datenbank eingetragen.");
    } catch(e) {
      alert("❌ Sync fehlgeschlagen.");
    }
  }

  // === Theme ===
  function applyTheme(mode){
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
  }
  function toggleTheme(){
    const current = localStorage.getItem("theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  }
  function initTheme(){
    const saved = localStorage.getItem("theme") || "light";
    applyTheme(saved);
  }

  // === Start ===
  loadData();
});
