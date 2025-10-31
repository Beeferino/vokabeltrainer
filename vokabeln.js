// ==============================
// Beeferino – vokabeln.js (Update Final v4)
// ==============================
window.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  // Kategorien + Farben
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
    Gelb: "#000", Pink: "#fff", Blau: "#fff", Gruen: "#fff",
    HellesPink: "#fff", Orange: "#fff", Dunkelgruen: "#fff",
  };

  // Data
  const RAW_URL = "https://beeferino.github.io/vokabeltrainer/vokabeln.json";
  const GH_OWNER = "beeferino", GH_REPO = "vokabeltrainer", GH_PATH = "vokabeln.json";

  // State
  let list = [];
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let sortState = { col: null, dir: 1 };
  let currentLetter = "Alle";
  let editIndex = null;
  let onlyConfuse = false; // filter toggle

  const normalize = (v) => [
    v[0] || "", v[1] || "", v[2] || "Gelb", v[3] || "", v[4] || "",
    v[5] || new Date().toISOString(), typeof v[6] === "number" ? v[6] : 0,
    v[7] || crypto.randomUUID(),
  ];
  const loadLocal = () => JSON.parse(localStorage.getItem("vokabeln") || "[]").map(normalize);
  const saveLocal = (d) => localStorage.setItem("vokabeln", JSON.stringify(d));

  async function loadData() {
    try {
      const r = await fetch(RAW_URL, { cache: "no-store" });
      list = (await r.json()).map(normalize);
      saveLocal(list);
    } catch {
      list = loadLocal();
    }
    initTheme();
    if (window.innerWidth < 768) renderMobileView();
    else renderApp();
  }

  // ===== Desktop =====
  function renderApp() {
    app.innerHTML = `
      <div class="desktop-app">
        <h1>📘 Vokabelübersicht</h1>
        <div class="hr"></div>
        <div class="toolbar">
          <button id="homeBtn" class="btn ghost" title="Zurück zum Trainer">🏠</button>
          <input id="searchDesk" placeholder="Suchen…" />
          <select id="filterCatDesk"></select>
          <div class="toggle-wrap" title="Nur Verwechslungsgefahr anzeigen">
            <span class="warn-icon">⚠️</span>
            <label class="switch">
              <input type="checkbox" id="filterConfuseDesk" />
              <span class="slider"></span>
            </label>
          </div>
          <button id="resetDesk" class="btn">Reset</button>
          <button id="addDesk" class="btn">➕ Neue</button>
          <button id="delDesk" class="btn warn">🗑️ Löschen</button>
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
        <div class="bottom-actions">
          <button id="syncDesk" class="btn">📤 Sync</button>
        </div>
      </div>
    `;

    // Filter
    const sel = document.getElementById("filterCatDesk");
    sel.innerHTML = '<option value="Alle">Alle (bunt gemischt)</option>';
    Object.keys(CATEGORY_NAMES).forEach((k) => {
      const o = document.createElement("option");
      o.value = k; o.textContent = CATEGORY_NAMES[k];
      o.style.background = COLOR_MAP[k];
      o.style.color = TEXT_ON[k];
      sel.appendChild(o);
    });

    addDesktopListeners();
    enableSorting();
    renderTable();
    renderDesktopFloatingButtons();
  }

  function currentFilter() {
    const cat = document.getElementById("filterCatDesk").value || "Alle";
    const q = (document.getElementById("searchDesk").value || "").trim().toLowerCase();
    return { cat, q };
  }

  function filtered() {
    const { cat, q } = currentFilter();
    return list.filter((v) => {
      const matchCat = cat === "Alle" || v[2] === cat;
      const matchQ = !q || v[0].toLowerCase().includes(q) || v[1].toLowerCase().includes(q);
      const matchLetter = currentLetter === "Alle" || v[0].toUpperCase().startsWith(currentLetter);
      const matchConfuse = !onlyConfuse || v[6] === 1;
      return matchCat && matchQ && matchLetter && matchConfuse;
    });
  }

  function renderTable() {
    const data = filtered();
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = data.slice(start, start + PAGE_SIZE);
    const tbody = document.querySelector("#tbl tbody");

    tbody.innerHTML = pageData.map((v) => {
      const idx = list.findIndex((x) => x[7] === v[7]);
      return `<tr>
        <td><input type="checkbox" class="rowcheck" data-idx="${idx}"></td>
        <td>${v[0]}${v[6]===1?` <span title="Verwechslungsgefahr" style="color:#ef4444">⚠️</span>`:''}</td>
        <td>${v[1]}</td>
        <td><span class="category-chip" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</span></td>
        <td><button class="btn" data-edit="${idx}">✏️ Bearbeiten</button></td>
      </tr>`;
    }).join("");

    document.querySelectorAll('button[data-edit]').forEach((b)=> b.onclick = ()=> openEdit(+b.dataset.edit));

    document.getElementById("countDesk").textContent = `📘 ${data.length} Vokabel${data.length!==1?"n":""} gefunden`;
    const pages = Math.ceil(data.length / PAGE_SIZE) || 1;
    const pag = document.getElementById("pagination");
    pag.innerHTML = `
      <button class="btn" ${currentPage===1?"disabled":""} id="prevPage">⬅️ Zurück</button>
      <span style="margin:0 10px;font-weight:600;">Seite ${currentPage} / ${pages}</span>
      <button class="btn" ${currentPage===pages?"disabled":""} id="nextPage">Weiter ➡️</button>`;

    document.getElementById("prevPage").onclick = ()=>{ if(currentPage>1){ currentPage--; renderTable(); } };
    document.getElementById("nextPage").onclick = ()=>{ if(currentPage<pages){ currentPage++; renderTable(); } };
  }

  function addDesktopListeners() {
    const fDesk = document.getElementById("filterCatDesk");
    const updateColor = () => {
      const val = fDesk.value;
      if (val && COLOR_MAP[val]) { fDesk.style.background = COLOR_MAP[val]; fDesk.style.color = TEXT_ON[val]; }
      else { fDesk.style.background = ""; fDesk.style.color = ""; }
    };
    fDesk.addEventListener("change", updateColor);
    updateColor();

    document.getElementById("filterConfuseDesk").onchange = (e)=>{ onlyConfuse = e.target.checked; currentPage=1; renderTable(); };

    document.getElementById("filterCatDesk").onchange = () => { currentPage = 1; renderTable(); };
    document.getElementById("searchDesk").oninput = () => { currentPage = 1; renderTable(); };
    document.getElementById("resetDesk").onclick = () => {
      document.getElementById("filterCatDesk").value = "Alle";
      document.getElementById("searchDesk").value = "";
      const cbox = document.getElementById("filterConfuseDesk");
      if (cbox) cbox.checked = false; onlyConfuse = false;
      currentPage = 1; currentLetter = "Alle"; renderTable();
    };
    document.getElementById("addDesk").onclick = () => openEdit(null);
    document.getElementById("delDesk").onclick = () => bulkDelete();
    document.getElementById("syncDesk").onclick = githubSync;
    document.getElementById("homeBtn").onclick = () => { location.href = "index.html"; };
  }

  function enableSorting() {
    document.querySelectorAll("th.sortable").forEach((th) => {
      th.onclick = () => {
        const col = parseInt(th.dataset.sort);
        if (sortState.col === col) sortState.dir *= -1; else { sortState.col = col; sortState.dir = 1; }
        list.sort((a,b)=> (a[col]||"").toLowerCase().localeCompare((b[col]||"").toLowerCase()) * sortState.dir);
        saveLocal(list); renderTable();
      };
    });
  }

  // ===== Modal =====
  const modal = document.getElementById("modal");
  const mEn = document.getElementById("mEn");
  const mDe = document.getElementById("mDe");
  const mCat = document.getElementById("mCat");
  const mHint = document.getElementById("mHint");
  const mConfuse = document.getElementById("mConfuse");
  const mCancel = document.getElementById("mCancel");
  const mSave = document.getElementById("mSave");
  const mDelete = document.getElementById("mDelete");
  const mCreated = document.getElementById("mCreated");

  function fillModalCategories() {
    mCat.innerHTML = "";
    Object.keys(CATEGORY_NAMES).forEach((k) => {
      const o = document.createElement("option");
      o.value = k; o.textContent = CATEGORY_NAMES[k];
      o.style.background = COLOR_MAP[k]; o.style.color = TEXT_ON[k];
      mCat.appendChild(o);
    });
  }
  function setCatSelectColors(){ const sel=mCat.value; mCat.style.background=COLOR_MAP[sel]; mCat.style.color=TEXT_ON[sel]; }

  function openEdit(i) {
    editIndex = i; fillModalCategories();
    if (i==null) {
      mEn.value=""; mDe.value=""; mCat.value="Gelb"; mHint.value=""; mConfuse.checked=false; mCreated.value=new Date().toLocaleDateString();
    } else {
      const v = list[i];
      mEn.value=v[0]; mDe.value=v[1]; mCat.value=v[2]; mHint.value=v[4]||""; mConfuse.checked=v[6]===1; mCreated.value=new Date(v[5]).toLocaleDateString();
    }
    setCatSelectColors(); mCat.onchange=setCatSelectColors; modal.style.display="flex";
  }
  mCancel.onclick = ()=> modal.style.display="none";
  modal.addEventListener("click",(e)=>{ if(e.target===modal) modal.style.display="none"; });
  mSave.onclick = ()=>{
    const en=mEn.value.trim(), de=mDe.value.trim(), cat=mCat.value, hint=mHint.value.trim(), confuse=mConfuse.checked?1:0;
    if(!en||!de){ alert("Bitte Englisch & Deutsch ausfüllen."); return; }
    if(editIndex==null){ list.push([en,de,cat,"",hint,new Date().toISOString(),confuse,crypto.randomUUID()]); }
    else{ const old=list[editIndex]; list[editIndex]=[en,de,cat,old[3]||"",hint,old[5],confuse,old[7]]; }
    saveLocal(list); modal.style.display="none"; if(window.innerWidth<768) renderMobileList(); else renderTable();
  };
  mDelete.onclick = ()=>{
    if(editIndex==null){ alert("Nichts zum Löschen ausgewählt."); return; }
    if(!confirm("Eintrag wirklich löschen?")) return;
    list.splice(editIndex,1); saveLocal(list); modal.style.display="none"; if(window.innerWidth<768) renderMobileList(); else renderTable();
  };

  function bulkDelete(){
    const ids = Array.from(document.querySelectorAll(".rowcheck:checked")).map(x=>+x.dataset.idx);
    if(!ids.length){ alert("Bitte Zeilen auswählen."); return; }
    if(!confirm(`${ids.length} Einträge löschen?`)) return;
    list = list.filter((_,i)=>!ids.includes(i)); saveLocal(list); renderTable();
  }

  // ===== A–Z =====
  function ensureABCOverlay(){
    if(document.getElementById("abcOverlay")) return;
    const html = `<div class="abc-overlay" id="abcOverlay">
      <div class="abc-panel">
        <div class="abc-header"><span class="abc-title">Wähle Buchstabe</span><button id="abcClose" class="abc-close">✕</button></div>
        <div class="abc-list" id="abcFilter"></div>
      </div></div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    document.getElementById("abcClose").onclick = ()=> document.getElementById("abcOverlay").classList.remove("show");
  }
  function renderABCFilter(){
    const c=document.getElementById("abcFilter"); if(!c) return;
    const letters=["Alle",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
    c.innerHTML = letters.map(l=>`<button class="abc-btn${l===currentLetter?" active":""}" data-letter="${l}">${l}</button>`).join("");
    c.querySelectorAll(".abc-btn").forEach(btn=>{
      btn.onclick=()=>{
        currentLetter=btn.dataset.letter; currentPage=1;
        if(window.innerWidth<768) renderMobileList(); else renderTable();
        document.getElementById("abcOverlay").classList.remove("show");
      };
    });
  }

  function renderDesktopFloatingButtons(){
    ensureABCOverlay();
    if(document.getElementById("deskFloating")) return;
    document.body.insertAdjacentHTML("beforeend",
      `<div id="deskFloating" class="desk-floating">
         <button id="themeToggle" class="float-btn" title="Dark/Light">🌙</button>
         <button id="abcToggle" class="float-btn" title="A–Z">A–Z</button>
       </div>`);
    document.getElementById("themeToggle").onclick=toggleTheme;
    document.getElementById("abcToggle").onclick=()=>{ document.getElementById("abcOverlay").classList.add("show"); renderABCFilter(); };
  }

  // ===== Mobile =====
  function renderMobileView(){
    app.innerHTML = `
      <div class="mobile-app">
        <div class="mobile-header">
          <h2>Vokabeln</h2>
          <div class="mob-actions">
            <button id="mobHome" class="lbtn" title="Trainer">🏠</button>
            <button id="mobTheme" class="lbtn" title="Dark / Light">🌙</button>
            <button id="mobAZ" class="lbtn" title="A–Z">A–Z</button>
            <button id="mobAdd" class="lbtn" title="Neu">＋</button>
          </div>
        </div>
        <div class="mob-filterbar">
          <span class="warn-icon">⚠️</span>
          <span class="label">Nur Verwechslungsgefahr</span>
          <label class="switch">
            <input type="checkbox" id="filterConfuseMob" />
            <span class="slider"></span>
          </label>
        </div>
        <div id="mobList" class="mob-list"></div>
      </div>`;
    document.getElementById("mobHome").onclick=()=>{ location.href = "index.html"; };
    document.getElementById("mobTheme").onclick=toggleTheme;
    document.getElementById("mobAZ").onclick=()=>{ ensureABCOverlay(); document.getElementById("abcOverlay").classList.add("show"); renderABCFilter(); };
    document.getElementById("mobAdd").onclick=()=>openEdit(null);
    const mobToggle = document.getElementById("filterConfuseMob");
    mobToggle.onchange = (e)=>{ onlyConfuse = e.target.checked; renderMobileList(); };
    renderMobileList();
  }

  function renderMobileList(){
    const data = list.filter(v=> {
      const byLetter = currentLetter==="Alle" || v[0].toUpperCase().startsWith(currentLetter);
      const byConfuse = !onlyConfuse || v[6]===1;
      return byLetter && byConfuse;
    });
    const c = document.getElementById("mobList"); if(!c) return;
    c.innerHTML = data.map(v=>{
      const idx = list.findIndex(x=>x[7]===v[7]);
      return `<div class="mob-card" data-idx="${idx}">
        <div class="mob-catbar" style="background:${COLOR_MAP[v[2]]};"></div>
        <div class="mob-card-content">
          <div class="mob-catname">${CATEGORY_NAMES[v[2]]}</div>
          <div class="mob-en">${v[0]}${v[6]===1?' <span class="mob-warn" title="Verwechslungsgefahr">⚠️</span>':''}</div>
          <div class="mob-de">${v[1]}</div>
        </div>
      </div>`;
    }).join("");
    c.querySelectorAll(".mob-card").forEach(card=> card.onclick=()=> openEdit(parseInt(card.dataset.idx,10)));
  }

  // ===== GitHub Sync =====
  function getToken(){
    let t = localStorage.getItem("gh_token") || "";
    if(!t){ t=prompt("GitHub Token (repo-Scope):",""); if(t){ localStorage.setItem("gh_token", t); alert("Token gespeichert."); } }
    return t;
  }
  async function githubSync(){
    const token=getToken(); if(!token) return;
    try{
      const api=`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`;
      const get=await fetch(api,{headers:{Authorization:`token ${token}`}});
      const meta=await get.json(); const sha=meta.sha;
      const content=btoa(unescape(encodeURIComponent(JSON.stringify(list,null,2))));
      const res=await fetch(api,{method:"PUT",headers:{Authorization:`token ${token}`,"Content-Type":"application/json"},body:JSON.stringify({message:"Update via Vokabel-UI",content,sha})});
      if(!res.ok) throw new Error(await res.text());
      alert("✅ Erfolgreich in Datenbank eingetragen.");
    }catch(e){ alert("❌ Sync fehlgeschlagen."); }
  }

  // ===== Theme =====
  function applyTheme(mode){
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
    const dBtn=document.getElementById("themeToggle")||document.getElementById("mobTheme");
    if(dBtn) dBtn.textContent = mode==="dark" ? "☀️" : "🌙";
  }
  function toggleTheme(){ const cur=localStorage.getItem("theme")||"light"; applyTheme(cur==="dark"?"light":"dark"); }
  function initTheme(){ applyTheme(localStorage.getItem("theme")||"light"); }

  // Start
  loadData();
});
