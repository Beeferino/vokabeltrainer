// ==============================
// Beeferino – vokabeln.js (final)
// ==============================
window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  if (isMobile) { document.body.classList.add('mobile-mode'); renderMobileView(); }
  else { renderDesktopView(); }
  initTheme();
});

// Data & constants
const RAW_URL = 'https://beeferino.github.io/vokabeltrainer/vokabeln.json';
const CATEGORY_NAMES = {
  Gelb: 'Grundwerkzeuge Metallverarbeitung',
  Pink: 'Werkzeugkasten Mechaniker',
  Blau: 'Blech- / Kunststoffarbeiten',
  Gruen: 'Drehen / Fräsen',
  HellesPink: 'Hydraulik / Pneumatik',
  Orange: 'Elektrotechnik',
  Dunkelgruen: 'Fluggerätemechanik allgemein',
};
const COLOR_MAP = {
  Gelb: '#F4D03F',
  Pink: '#E91E63',
  Blau: '#1976D2',
  Gruen: '#1E8449',
  HellesPink: '#F54927',
  Orange: '#E67E22',
  Dunkelgruen: '#117A65',
};
const TEXT_ON = { Gelb:'#000', Pink:'#fff', Blau:'#fff', Gruen:'#fff', HellesPink:'#fff', Orange:'#fff', Dunkelgruen:'#fff' };

let list = [];
let currentPage = 1;
const PAGE_SIZE = 20;
let currentLetter = 'Alle';
let editIndex = null;

const app = document.getElementById('app');

const normalize = (v)=>[v[0]||'',v[1]||'',v[2]||'Gelb',v[3]||'',v[4]||'',v[5]||new Date().toISOString(),typeof v[6]==='number'?v[6]:0,v[7]||crypto.randomUUID()];
const loadLocal = ()=> JSON.parse(localStorage.getItem('vokabeln')||'[]').map(normalize);
const saveLocal = d => localStorage.setItem('vokabeln', JSON.stringify(d));

async function loadData(){
  try{
    const r = await fetch(RAW_URL,{cache:'no-store'});
    list = (await r.json()).map(normalize);
    saveLocal(list);
  }catch{
    list = loadLocal();
  }
}

// ===== Desktop =====
function renderDesktopView(){
  app.innerHTML = `
    <div class="desktop-app">
      <h1>📘 Vokabelübersicht</h1>
      <div class="hr"></div>
      <div class="toolbar">
        <button id="homeBtn" class="btn ghost" title="Zurück zum Trainer" onclick="location.href='index.html'">🏠</button>
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
              <th></th>
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
  // fill filter
  const sel = document.getElementById('filterCatDesk');
  sel.innerHTML = '<option value="Alle">Alle (bunt gemischt)</option>';
  Object.keys(CATEGORY_NAMES).forEach(k=>{
    const o=document.createElement('option');
    o.value=k;o.textContent=CATEGORY_NAMES[k];
    o.style.background=COLOR_MAP[k];o.style.color=TEXT_ON[k];
    sel.appendChild(o);
  });
  // listeners
  document.getElementById('filterCatDesk').onchange=()=>{currentPage=1;renderTable();updateFilterColor();};
  document.getElementById('searchDesk').oninput=()=>{currentPage=1;renderTable();};
  document.getElementById('resetDesk').onclick=()=>{
    document.getElementById('filterCatDesk').value='Alle';
    document.getElementById('searchDesk').value='';
    currentPage=1;currentLetter='Alle';renderTable();updateFilterColor();
  };
  document.getElementById('addDesk').onclick=()=>openEdit(null);
  document.getElementById('delDesk').onclick=bulkDelete;
  document.getElementById('syncDesk').onclick=githubSync;
  updateFilterColor();
  enableSorting();
  renderTable();
  renderABCOverlay(); // Desktop A–Z
}

function updateFilterColor(){
  const s=document.getElementById('filterCatDesk');
  const val=s.value;
  if(val && COLOR_MAP[val]){ s.style.background=COLOR_MAP[val]; s.style.color=TEXT_ON[val]; }
  else { s.style.background=''; s.style.color=''; }
}

function filtered(){
  const cat = document.getElementById('filterCatDesk').value || 'Alle';
  const q = (document.getElementById('searchDesk').value||'').trim().toLowerCase();
  return list.filter(v=>{
    const matchCat = cat==='Alle'||v[2]===cat;
    const matchQ = !q || v[0].toLowerCase().includes(q) || v[1].toLowerCase().includes(q);
    const matchLetter = currentLetter==='Alle' || v[0].toUpperCase().startsWith(currentLetter);
    return matchCat && matchQ && matchLetter;
  });
}

function renderTable(){
  const data=filtered();
  const start=(currentPage-1)*PAGE_SIZE;
  const pageData=data.slice(start,start+PAGE_SIZE);
  const tbody=document.querySelector('#tbl tbody');
  tbody.innerHTML = pageData.map(v=>{
    const idx=list.findIndex(x=>x[7]===v[7]);
    return `<tr>
      <td><input type="checkbox" class="rowcheck" data-idx="${idx}"></td>
      <td>${v[0]}${v[6]===1?` <span title="Verwechslungsgefahr" style="color:#ef4444">⚠️</span>`:''}</td>
      <td>${v[1]}</td>
      <td><span class="category-chip" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</span></td>
      <td><button class="btn" data-edit="${idx}">✏️ Bearbeiten</button></td>
    </tr>`;
  }).join('');
  document.querySelectorAll('button[data-edit]').forEach(b=>b.onclick=()=>openEdit(+b.dataset.edit));
  document.getElementById('countDesk').textContent=`📘 ${data.length} Vokabel${data.length!==1?'n':''} gefunden`;
  const pages=Math.ceil(data.length/PAGE_SIZE)||1;
  const pag=document.getElementById('pagination');
  pag.innerHTML=`
    <button class="btn" ${currentPage===1?'disabled':''} id="prevPage">⬅️ Zurück</button>
    <span style="margin:0 10px;font-weight:600;">Seite ${currentPage} / ${pages}</span>
    <button class="btn" ${currentPage===pages?'disabled':''} id="nextPage">Weiter ➡️</button>`;
  document.getElementById('prevPage').onclick=()=>{if(currentPage>1){currentPage--;renderTable();}};
  document.getElementById('nextPage').onclick=()=>{if(currentPage<pages){currentPage++;renderTable();}};
}

function enableSorting(){
  document.querySelectorAll('th.sortable').forEach(th=>{
    th.style.cursor='pointer';
    th.onclick=()=>{
      const col=parseInt(th.dataset.sort);
      const data=filtered().slice().sort((a,b)=>(a[col]||'').localeCompare(b[col]||''));
      // overwrite list order based on sorted data (keeping other items at end)
      const ids=data.map(v=>v[7]);
      list.sort((a,b)=>ids.indexOf(a[7])-ids.indexOf(b[7]));
      saveLocal(list);
      renderTable();
    };
  });
}

function bulkDelete(){
  const ids=Array.from(document.querySelectorAll('.rowcheck:checked')).map(x=>+x.dataset.idx);
  if(!ids.length){alert('Bitte Zeilen auswählen.');return;}
  if(!confirm(`${ids.length} Einträge löschen?`))return;
  list = list.filter((_,i)=>!ids.includes(i));
  saveLocal(list);
  renderTable();
}

// ===== Modal =====
const modal=document.getElementById('modal');
const mEn=document.getElementById('mEn');
const mDe=document.getElementById('mDe');
const mCat=document.getElementById('mCat');
const mVar=document.getElementById('mVar');
const mHint=document.getElementById('mHint');
const mConfuse=document.getElementById('mConfuse');
const mCreated=document.getElementById('mCreated');
const mCancel=document.getElementById('mCancel');
const mSave=document.getElementById('mSave');
const mDelete=document.getElementById('mDelete');

function fillModalCategories(){
  mCat.innerHTML='';
  Object.keys(CATEGORY_NAMES).forEach(k=>{
    const o=document.createElement('option');
    o.value=k;o.textContent=CATEGORY_NAMES[k];
    o.style.background=COLOR_MAP[k];o.style.color=TEXT_ON[k];
    mCat.appendChild(o);
  });
  // colorize
  const setCol=()=>{mCat.style.background=COLOR_MAP[mCat.value];mCat.style.color=TEXT_ON[mCat.value];};
  mCat.onchange=setCol; setCol();
}

function openEdit(i){
  fillModalCategories();
  editIndex=i;
  if(i==null){
    mEn.value='';mDe.value='';mCat.value='Gelb';mVar.value='';mHint.value='';mConfuse.checked=false;mCreated.value=new Date().toLocaleDateString();
  }else{
    const v=list[i];
    mEn.value=v[0];mDe.value=v[1];mCat.value=v[2];mVar.value=v[3];mHint.value=v[4];mConfuse.checked=v[6]===1;mCreated.value=new Date(v[5]).toLocaleDateString();
  }
  mCat.style.background=COLOR_MAP[mCat.value];mCat.style.color=TEXT_ON[mCat.value];
  modal.style.display='flex';
}
mCancel.onclick=()=>modal.style.display='none';
modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
mSave.onclick=()=>{
  const en=mEn.value.trim(), de=mDe.value.trim(), cat=mCat.value, hint=mHint.value.trim(), variant=mVar.value.trim(), confuse=mConfuse.checked?1:0;
  if(!en||!de){alert('Bitte Englisch & Deutsch ausfüllen.');return;}
  if(editIndex==null){ list.push([en,de,cat,variant,hint,new Date().toISOString(),confuse,crypto.randomUUID()]); }
  else{ const old=list[editIndex]; list[editIndex]=[en,de,cat,variant,hint,old[5],confuse,old[7]]; }
  saveLocal(list); modal.style.display='none';
  if(document.body.classList.contains('mobile-mode')) renderMobileList(); else renderTable();
};
mDelete.onclick=()=>{
  if(editIndex==null){alert('Nichts zum Löschen.');return;}
  if(!confirm('Eintrag wirklich löschen?'))return;
  list.splice(editIndex,1); saveLocal(list); modal.style.display='none';
  if(document.body.classList.contains('mobile-mode')) renderMobileList(); else renderTable();
};

// ===== A–Z =====
function renderABCOverlay(){
  if(document.getElementById('abcOverlay')) return;
  const html = `
    <div class="abc-overlay" id="abcOverlay">
      <div class="abc-panel">
        <div class="abc-header">
          <strong class="abc-title">Wähle Buchstabe</strong>
          <button id="abcClose" class="btn warn">✕</button>
        </div>
        <div class="abc-list" id="abcFilter"></div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('abcClose').onclick=()=>document.getElementById('abcOverlay').classList.remove('show');
  renderABCFilter();
}
function renderABCFilter(){
  const cont=document.getElementById('abcFilter'); if(!cont) return;
  const letters=['Alle',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  cont.innerHTML = letters.map(l=>`<button class="abc-btn ${l===currentLetter?'active':''}" data-letter="${l}">${l}</button>`).join('');
  cont.querySelectorAll('.abc-btn').forEach(b=>b.onclick=()=>{
    currentLetter=b.dataset.letter; currentPage=1;
    document.getElementById('abcOverlay').classList.remove('show');
    if(document.body.classList.contains('mobile-mode')) renderMobileList(); else renderTable();
  });
}

// ===== Mobile =====
function renderMobileView(){
  app.innerHTML = `
    <div class="mobile-app">
      <div id="mobList" class="mob-list"></div>
      <button id="themeMob" class="mob-btn" title="Dark/Light">🌗</button>
      <button id="viewMob" class="mob-btn" title="Ansicht wechseln">🗂️</button>
      <button id="addMob" class="mob-btn" title="Neue Vokabel">➕</button>
      <button id="abcToggle" class="mob-btn" title="A–Z">A–Z</button>
      <div class="abc-overlay" id="abcOverlay">
        <div class="abc-panel">
          <div class="abc-header">
            <strong class="abc-title">Wähle Buchstabe</strong>
            <button id="abcClose" class="btn warn">✕</button>
          </div>
          <div class="abc-list" id="abcFilter"></div>
        </div>
      </div>
    </div>`;
  document.getElementById('themeMob').onclick=toggleTheme;
  document.getElementById('addMob').onclick=()=>openEdit(null);
  document.getElementById('viewMob').onclick=()=>{
    const cur=localStorage.getItem('mobile_view_mode')||'cards';
    const next=cur==='cards'?'table':'cards';
    localStorage.setItem('mobile_view_mode',next);
    renderMobileList();
    document.getElementById('viewMob').textContent = next==='cards'?'🗂️':'📋';
  };
  document.getElementById('abcToggle').onclick=()=>{ renderABCFilter(); document.getElementById('abcOverlay').classList.add('show'); };
  document.getElementById('abcClose').onclick=()=>document.getElementById('abcOverlay').classList.remove('show');
  renderMobileList();
}

function renderMobileList(){
  const mode=localStorage.getItem('mobile_view_mode')||'cards';
  const cont=document.getElementById('mobList'); if(!cont) return;
  const data = list.filter(v=> currentLetter==='Alle' || v[0].toUpperCase().startsWith(currentLetter));
  if(mode==='table'){
    cont.innerHTML = `
      <table class="mob-table">
        <thead><tr><th>Englisch</th><th>Deutsch</th><th>Kategorie</th></tr></thead>
        <tbody>
          ${data.map((v,i)=>`<tr data-idx="${i}"><td>${v[0]}${v[6]===1?' ⚠️':''}</td><td>${v[1]}</td><td><span class="category-chip" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</span></td></tr>`).join('')}
        </tbody>
      </table>`;
    cont.querySelectorAll('tr[data-idx]').forEach(r=>r.onclick=()=>openEdit(+r.dataset.idx));
  }else{
    cont.innerHTML = data.map((v,i)=>`
      <div class="mob-card" data-idx="${i}">
        <div class="mob-cat" style="background:${COLOR_MAP[v[2]]};color:${TEXT_ON[v[2]]}">${CATEGORY_NAMES[v[2]]}</div>
        <div class="mob-en">${v[0]}${v[6]===1?' <span style="color:#ef4444">⚠️</span>':''}</div>
        <div class="mob-de">${v[1]}</div>
      </div>`).join('');
    cont.querySelectorAll('.mob-card').forEach(c=>c.onclick=()=>openEdit(+c.dataset.idx));
  }
}

// ===== GitHub Sync =====
function getToken(){
  let t=localStorage.getItem('gh_token')||'';
  if(!t){ t=prompt('GitHub Token (repo-Scope):',''); if(t){localStorage.setItem('gh_token',t); alert('Token gespeichert.');} }
  return t;
}
async function githubSync(){
  const token=getToken(); if(!token)return;
  try{
    const api='https://api.github.com/repos/beeferino/vokabeltrainer/contents/vokabeln.json';
    const get=await fetch(api,{headers:{Authorization:`token ${token}`}});
    const meta=await get.json(); const sha=meta.sha;
    const content=btoa(unescape(encodeURIComponent(JSON.stringify(list,null,2))));
    const res=await fetch(api,{method:'PUT',headers:{Authorization:`token ${token}`,'Content-Type':'application/json'},body:JSON.stringify({message:'Update via Vokabel-UI',content,sha})});
    if(!res.ok) throw new Error(await res.text());
    alert('✅ Erfolgreich in Datenbank eingetragen.');
  }catch(e){ alert('❌ Sync fehlgeschlagen.'); }
}

// ===== Theme =====
function initTheme(){
  const saved=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||'light';
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
