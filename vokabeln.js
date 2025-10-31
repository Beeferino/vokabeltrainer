// ==============================
// Beeferino – vokabeln.js (2025 Edition)
// ==============================
window.addEventListener("DOMContentLoaded", async () => {
  // ---- Erkennung Mobil/Desktop ----
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  // ---- Daten laden ----
  await loadData();

  // ---- Ansicht wählen ----
  if (isMobile) {
    document.body.classList.add("mobile-mode");
    renderMobileView();
  } else {
    renderApp();
  }

  initTheme();
});

// ==============================
// Globale Variablen & Konstanten
// ==============================
const app = document.getElementById("app");
let list = [];
let currentPage = 1;
let currentLetter = "Alle";
const PAGE_SIZE = 20;
const RAW_URL = "https://beeferino.github.io/vokabeltrainer/vokabeln.json";

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
  Gelb: "#f4d03f",
  Pink: "#e91e63",
  Blau: "#1976d2",
  Gruen: "#1e8449",
  HellesPink: "#f54927",
  Orange: "#e67e22",
  Dunkelgruen: "#117a65",
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

// ==============================
// Hilfsfunktionen
// ==============================
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

const saveLocal = (d) =>
  localStorage.setItem("vokabeln", JSON.stringify(d));

// ==============================
// Daten laden
// ==============================
async function loadData() {
  try {
    const res = await fetch(RAW_URL, { cache: "no-store" });
    list = (await res.json()).map(normalize);
    saveLocal(list);
  } catch {
    list = loadLocal();
  }
}

// ==============================
// DESKTOP-ANSICHT
// ==============================
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
      <div id="countDesk" class="count-info"></div>
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
      <div id="pagination" class="pagination"></div>
    </div>
  `;

  // Filter-Kategorien befüllen
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

// ==============================
// Tabellenanzeige Desktop
// ==============================
function renderTable() {
  const { cat, q } = currentFilter();
  const data = list.filter((v) => {
    const matchCat = cat === "Alle" || v[2] === cat;
    const matchQ = !q || v[0].toLowerCase().includes(q) || v[1].toLowerCase().includes(q);
    const matchLetter = currentLetter === "Alle" || v[0].toUpperCase().startsWith(currentLetter);
    return matchCat && matchQ && matchLetter;
  });

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = data.slice(start, start + PAGE_SIZE);
  const tbody = document.querySelector("#tbl tbody");

  tbody.innerHTML = pageData.map((v, i) => `
    <tr>
      <td><input type="checkbox" class="rowcheck" data-idx="${i}"></td>
      <td>${v[0]}${v[6] === 1 ? ` <span title="Verwechslungsgefahr" style="color:#ef4444">⚠️</span>` : ""}</td>
      <td>${v[1]}</td>
      <td><span class="category-chip" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</span></td>
      <td><button class="btn" data-edit="${i}">✏️ Bearbeiten</button></td>
    </tr>
  `).join("");

  document.querySelectorAll("button[data-edit]").forEach((b) => {
    b.onclick = () => openEdit(+b.dataset.edit);
  });

  document.getElementById("countDesk").textContent = `📘 ${data.length} Vokabel${data.length !== 1 ? "n" : ""} gefunden`;

  const pages = Math.ceil(data.length / PAGE_SIZE) || 1;
  document.getElementById("pagination").innerHTML = `
    <button class="btn" ${currentPage === 1 ? "disabled" : ""} id="prevPage">⬅️ Zurück</button>
    <span class="page-info">Seite ${currentPage} / ${pages}</span>
    <button class="btn" ${currentPage === pages ? "disabled" : ""} id="nextPage">Weiter ➡️</button>
  `;
  document.getElementById("prevPage").onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
  document.getElementById("nextPage").onclick = () => { if (currentPage < pages) { currentPage++; renderTable(); } };
}

function currentFilter() {
  const cat = document.getElementById("filterCatDesk").value || "Alle";
  const q = (document.getElementById("searchDesk").value || "").trim().toLowerCase();
  return { cat, q };
}

// ==============================
// Mobile Ansicht
// ==============================
function renderMobileView() {
  app.innerHTML = `
    <div class="mobile-app">
      <h2>Vokabeln</h2>
      <div id="mobList" class="mob-list"></div>
      <button id="themeMob" class="mob-btn" title="Dark / Light">🌗</button>
      <button id="viewMob"  class="mob-btn" title="Ansicht wechseln">🗂️</button>
      <button id="addMob"   class="mob-btn" title="Neue Vokabel">➕</button>
      <button id="abcToggle"class="mob-btn" title="A–Z">A–Z</button>
    </div>
  `;

  renderMobileList();
  renderABCOverlayMobile();

  document.getElementById("themeMob").onclick = toggleTheme;
  document.getElementById("addMob").onclick = () => openEdit(null);

  const btnView = document.getElementById("viewMob");
  btnView.onclick = () => {
    const current = localStorage.getItem("mobile_view_mode") || "cards";
    const next = current === "cards" ? "table" : "cards";
    localStorage.setItem("mobile_view_mode", next);
    renderMobileList();
    btnView.textContent = next === "cards" ? "🗂️" : "📋";
  };
}

function renderMobileList() {
  const mode = localStorage.getItem("mobile_view_mode") || "cards";
  const container = document.getElementById("mobList");
  if (!container) return;

  if (mode === "cards") {
    container.innerHTML = list.map((v, i) => `
      <div class="mob-card" data-idx="${i}">
        <div class="mob-cat" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">
          ${CATEGORY_NAMES[v[2]]}
        </div>
        <div class="mob-en">${v[0]}</div>
        <div class="mob-de">${v[1]}</div>
      </div>`).join("");

    container.querySelectorAll(".mob-card").forEach((c) => {
      c.onclick = () => openEdit(parseInt(c.dataset.idx, 10));
    });
  } else {
    container.innerHTML = `
      <table class="mob-table">
        <thead><tr><th>Englisch</th><th>Deutsch</th><th>Kategorie</th></tr></thead>
        <tbody>
          ${list.map((v, i) => `
            <tr data-idx="${i}">
              <td>${v[0]}</td>
              <td>${v[1]}</td>
              <td><span class="category-chip" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</span></td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    container.querySelectorAll("tr[data-idx]").forEach((r) => {
      r.onclick = () => openEdit(parseInt(r.dataset.idx, 10));
    });
  }
}
/* ==============================
   Beeferino – vokabeln.css
   ============================== */

/* ----- Basislayout ----- */
:root {
  --bg-light: #f5f6f8;
  --bg-dark: #0e1420;
  --text-light: #111;
  --text-dark: #e2e8f0;
  --accent: #2563eb;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', Arial, sans-serif;
  background: var(--bg-light);
  color: var(--text-light);
  min-height: 100vh;
  overflow-x: hidden;
}

[data-theme="dark"] body {
  background: var(--bg-dark);
  color: var(--text-dark);
}

/* ==============================
   DESKTOP
   ============================== */

.desktop-app {
  max-width: 1100px;
  margin: 20px auto;
  background: rgba(255,255,255,0.02);
  padding: 10px 20px;
}

h1, h2 {
  margin: 0 0 10px 0;
  font-size: 1.8em;
  color: var(--accent);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
}

.toolbar input, .toolbar select {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: 0.2s ease;
}
.btn:hover { opacity: 0.9; }
.btn.warn { background: #e74c3c; }
.btn.ghost { background: transparent; color: var(--text-dark); }

.table-wrap {
  overflow-x: auto;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 8px;
}

th, td {
  padding: 10px;
  border-bottom: 1px solid #1f2937;
  text-align: left;
}

th {
  background: #1e3a8a;
  color: #fff;
}

tbody tr:hover {
  background: rgba(37,99,235,0.1);
}

.category-chip {
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.85em;
}

.pagination {
  text-align: center;
  margin: 20px 0;
}

.count-info {
  text-align: center;
  color: #2563eb;
  font-weight: 600;
  margin-bottom: 10px;
}

/* ==============================
   MOBILE VIEW
   ============================== */
.mobile-app {
  position: relative;
  padding: 10px;
}

.mob-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 100px;
}

/* Kartenansicht */
.mob-card {
  background: var(--bg-light);
  color: var(--text-light);
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  padding: 12px;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
[data-theme="dark"] .mob-card {
  background: #182030;
  color: var(--text-dark);
}
.mob-card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.mob-cat {
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 8px;
  margin-bottom: 6px;
  display: inline-block;
}

.mob-en {
  font-size: 1.2em;
  font-weight: 700;
  margin-bottom: 4px;
}

.mob-de {
  font-size: 1em;
  opacity: 0.75;
}

/* Tabellenansicht mobil */
.mob-table {
  width: 100%;
  border-collapse: collapse;
}
.mob-table th, .mob-table td {
  border-bottom: 1px solid #ccc;
  padding: 8px;
  font-size: 0.95em;
}
[data-theme="dark"] .mob-table th,
[data-theme="dark"] .mob-table td {
  border-color: #2b3344;
}

/* ==============================
   FLOATING BUTTONS (Mobile)
   ============================== */
.mob-btn {
  position: fixed;
  right: 18px;
  border: none;
  border-radius: 50%;
  width: 52px;
  height: 52px;
  font-size: 1.2em;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  color: #fff;
  background: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background 0.2s ease;
  z-index: 1000;
}
.mob-btn:hover { transform: scale(1.1); }

/* Reihenfolge L-förmig */
#themeMob { bottom: 210px; right: 24px; background: #374151; }
#viewMob  { bottom: 150px; right: 24px; background: #059669; }
#addMob   { bottom: 90px;  right: 24px; background: #10b981; }
#abcToggle{ bottom: 30px;  right: 24px; background: #2563eb; }

/* ==============================
   DARK MODE
   ============================== */
[data-theme="dark"] {
  background: var(--bg-dark);
  color: var(--text-dark);
}

[data-theme="dark"] .desktop-app {
  background: #0f172a;
}

[data-theme="dark"] table th {
  background: #1e293b;
}

[data-theme="dark"] .mob-card {
  background: #1f2937;
  color: #e2e8f0;
}

/* Kontrastfix für Kategorien bei dunklem Modus */
[data-theme="dark"] .mob-cat {
  color: #fff !important;
  mix-blend-mode: normal;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
}

/* ==============================
   RESPONSIVE BRIDGES
   ============================== */
@media (min-width: 769px) {
  .mobile-app, .mob-btn { display: none !important; }
}
@media (max-width: 768px) {
  .desktop-app { display: none !important; }
}
