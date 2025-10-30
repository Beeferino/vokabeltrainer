window.addEventListener("DOMContentLoaded", () => {

  const app = document.getElementById("app");
  const isMobile = window.matchMedia("(max-width: 900px)").matches;

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

  // === GitHub Ziel ===
  const RAW_URL = "https://beeferino.github.io/vokabeltrainer/vokabeln.json";
  const GH_OWNER = "beeferino";
  const GH_REPO = "vokabeltrainer";
  const GH_PATH = "vokabeln.json";

  let list = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;

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

  const loadLocal = () => JSON.parse(localStorage.getItem("vokabeln") || "[]").map(normalize);
  const saveLocal = (d) => localStorage.setItem("vokabeln", JSON.stringify(d));

  async function loadData() {
    try {
      const res = await fetch(RAW_URL, { cache: "no-store" });
      list = (await res.json()).map(normalize);
      saveLocal(list);
    } catch {
      list = loadLocal();
    }
  }

  // === Kategorieauswahl füllen ===
  function fillCategorySelect(el, withAll = false) {
    el.innerHTML = withAll ? '<option value="Alle">Alle (bunt gemischt)</option>' : "";
    Object.keys(CATEGORY_NAMES).forEach((k) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = CATEGORY_NAMES[k];
      o.style.background = COLOR_MAP[k];
      o.style.color = TEXT_ON[k];
      el.appendChild(o);
    });
  }

  // === Filterfunktion ===
  function filtered(cat, q) {
    q = q.toLowerCase();
    return list.filter((v) => {
      const matchCat = cat === "Alle" || v[2] === cat;
      const matchQ = !q || v[0].toLowerCase().includes(q) || v[1].toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }

  // === Desktop-Ansicht ===
  function renderDesktopView() {
    app.innerHTML = `
      <div class="desktop-app">
        <h1>📘 Vokabelübersicht</h1>
        <div class="hr"></div>
        <div class="toolbar">
  <button id="backToTrainer" class="btn ghost" title="Zurück zum Trainer">🏠 Trainer</button>
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
              <tr><th></th><th>Englisch</th><th>Deutsch</th><th>Kategorie</th><th>Aktion</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div id="pagination" style="text-align:center;margin:16px 0;"></div>
      </div>
    `;
    fillCategorySelect(document.getElementById("filterCatDesk"), true);
    renderTable();
    addDesktopListeners();
  }

  function renderTable() {
    const filterCat = document.getElementById("filterCatDesk").value || "Alle";
    const search = document.getElementById("searchDesk").value || "";
    const data = filtered(filterCat, search);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = data.slice(start, start + PAGE_SIZE);

    const tbody = document.querySelector("#tbl tbody");
    tbody.innerHTML = pageData
      .map(
        (v, i) => `
      <tr>
        <td><input type="checkbox" data-idx="${i}" /></td>
        <td>${v[0]}${v[6] === 1 ? ' <span style="color:#ef4444;font-weight:700;">⚠️</span>' : ''}</td>
        <td>${v[1]}</td>
        <td><span class="category-chip" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</span></td>
        <td><button class="btn editBtn" data-edit="${i}">✏️ Bearbeiten</button></td>
      </tr>`
      )
      .join("");

    document.getElementById("countDesk").textContent = `📘 ${data.length} Vokabel${data.length !== 1 ? "n" : ""} gefunden`;

    const pages = Math.ceil(data.length / PAGE_SIZE) || 1;
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = `
      <button class="btn" ${currentPage === 1 ? "disabled" : ""} id="prevPage">⬅️ Zurück</button>
      <span style="margin:0 10px;font-weight:600;">Seite ${currentPage} / ${pages}</span>
      <button class="btn" ${currentPage === pages ? "disabled" : ""} id="nextPage">Weiter ➡️</button>
    `;

    document.getElementById("prevPage").onclick = () => {
      if (currentPage > 1) { currentPage--; renderTable(); }
    };
    document.getElementById("nextPage").onclick = () => {
      if (currentPage < pages) { currentPage++; renderTable(); }
    };

    document.querySelectorAll(".editBtn").forEach((btn, i) => {
      btn.onclick = () => openEditModal(pageData[i]);
    });
  }

  function addDesktopListeners() {
    document.getElementById("backToTrainer").onclick = () => {
  window.location.href = "index.html";
};
document.getElementById("filterCatDesk").onchange = renderTable;
    document.getElementById("searchDesk").oninput = renderTable;
    document.getElementById("resetDesk").onclick = () => {
      document.getElementById("filterCatDesk").value = "Alle";
      document.getElementById("searchDesk").value = "";
      currentPage = 1;
      renderTable();
    };
    document.getElementById("addDesk").onclick = () => openEditModal();
    document.getElementById("syncDesk").onclick = githubSync;
    document.getElementById("delDesk").onclick = openDeleteConfirm;
  }

  // === Mobile Ansicht ===
  function renderMobileView() {
    app.innerHTML = `
      <div class="mobile-app">
        <div class="mob-header">
          <h2>Vokabeln</h2>
          <div style="display:flex;gap:10px;">
            <button class="iconbtn" id="addMob">➕</button>
            <button class="iconbtn" id="syncMob">🔄</button>
          </div>
        </div>
        <div class="mob-list"></div>
      </div>
    `;
    renderMobileList();
    document.getElementById("syncMob").onclick = githubSync;
    document.getElementById("addMob").onclick = () => openEditModal();
  }

  function renderMobileList() {
    const container = document.querySelector(".mob-list");
    container.innerHTML = list
      .map(
        (v) => `
      <div class="card" data-id="${v[7]}">
        <div class="card-cat" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</div>
        <div class="card-title">${v[0]}</div>
        <div class="card-sub">DE: ${v[1]}</div>
      </div>`
      )
      .join("");

    // Karte klickbar zum Bearbeiten
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const entry = list.find((v) => v[7] === id);
        if (entry) openEditModal(entry);
      });
    });
  }

  // === Modal Handling ===
  let editIndex = null;
  const modal = document.getElementById("modal");
  const mEn = document.getElementById("mEn");
  const mDe = document.getElementById("mDe");
  const mCat = document.getElementById("mCat");
  const mGroup = document.getElementById("mGroup");
  const mHint = document.getElementById("mHint");
  const mConfuse = document.getElementById("mConfuse");
  const mDate = document.getElementById("mDate");
  const mCancel = document.getElementById("mCancel");
  const mSave = document.getElementById("mSave");

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
  }

  function openEditModal(entry) {
    fillModalCategories();
    if (entry) {
      editIndex = list.findIndex((x) => x[7] === entry[7]);
      mEn.value = entry[0];
      mDe.value = entry[1];
      mCat.value = entry[2];
      mGroup.value = entry[3] || "";
      mHint.value = entry[4] || "";
      mDate.value = new Date(entry[5]).toISOString().slice(0, 10);
      mConfuse.checked = entry[6] === 1;
    } else {
      editIndex = null;
      mEn.value = "";
      mDe.value = "";
      mCat.value = "Gelb";
      mGroup.value = "";
      mHint.value = "";
      mDate.value = new Date().toISOString().slice(0, 10);
      mConfuse.checked = false;
    }
    
    // === Kategoriefarbe initial setzen ===
mCat.style.background = COLOR_MAP[mCat.value];
mCat.style.color = TEXT_ON[mCat.value];

// Wenn sich die Auswahl ändert → Farbe live anpassen
mCat.onchange = () => {
  mCat.style.background = COLOR_MAP[mCat.value];
  mCat.style.color = TEXT_ON[mCat.value];
};

    
    modal.style.display = "flex";
  }
// === Kategoriefarbe aktiv anzeigen ===
mCat.style.background = COLOR_MAP[mCat.value];
mCat.style.color = TEXT_ON[mCat.value];

mCat.onchange = () => {
  mCat.style.background = COLOR_MAP[mCat.value];
  mCat.style.color = TEXT_ON[mCat.value];
};

  function closeModal() { modal.style.display = "none"; }
  mCancel.onclick = closeModal;
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  mSave.onclick = () => {
    const en = mEn.value.trim();
    const de = mDe.value.trim();
    const cat = mCat.value;
    const grp = mGroup.value.trim();
    const hint = mHint.value.trim();
    const confuse = mConfuse.checked ? 1 : 0;
    const date = mDate.value ? new Date(mDate.value).toISOString() : new Date().toISOString();

    if (!en || !de) { alert("Bitte Englisch & Deutsch ausfüllen."); return; }

    const newEntry = [en, de, cat, grp, hint, date, confuse, crypto.randomUUID()];
    if (editIndex !== null) {
      const old = list[editIndex];
      list[editIndex] = [en, de, cat, grp, hint, old[5], confuse, old[7]];
    } else {
      list.push(newEntry);
    }

    saveLocal(list);
    closeModal();
    if (isMobile) renderMobileList();
    else renderTable();
  };

  // === Lösch-Modal ===
  function openDeleteConfirm() {
    const checked = [...document.querySelectorAll("#tbl input[type='checkbox']:checked")];
    if (!checked.length) {
      alert("Bitte mindestens eine Zeile markieren.");
      return;
    }

    const confirmModal = document.getElementById("confirmModal");
    const confirmText = document.getElementById("confirmText");
    confirmText.textContent = `Möchtest du wirklich ${checked.length} Vokabel${checked.length !== 1 ? "n" : ""} löschen?`;
    confirmModal.style.display = "flex";

    const cancelBtn = document.getElementById("confirmCancel");
    const yesBtn = document.getElementById("confirmYes");

    cancelBtn.onclick = () => { confirmModal.style.display = "none"; };
    yesBtn.onclick = () => {
      const indexes = checked.map((x) => parseInt(x.dataset.idx));
      list = list.filter((_, i) => !indexes.includes(i));
      saveLocal(list);
      confirmModal.style.display = "none";
      renderTable();
    };
  }

  // === GitHub Sync ===
  async function githubSync() {
    const token = localStorage.getItem("gh_token") || prompt("GitHub Token (repo-Scope):", "");
    if (!token) return;
    localStorage.setItem("gh_token", token);
    try {
      const api = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;
      const get = await fetch(api, { headers: { Authorization: `token ${token}` } });
      const meta = await get.json();
      const sha = meta.sha;
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2))));
      const res = await fetch(api, {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Update via Vokabel-UI", content, sha }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("✅ Erfolgreich in Datenbank eingetragen.");
    } catch (e) {
      alert("❌ Sync fehlgeschlagen.");
    }
  }

  // === Init ===
  loadData().then(() => {
    if (isMobile) renderMobileView();
    else renderDesktopView();
  });

});
