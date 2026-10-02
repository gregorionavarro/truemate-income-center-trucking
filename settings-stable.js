(() => {
  if (window.__tmSettingsStableLoaded) return;
  window.__tmSettingsStableLoaded = true;

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PROD_DEFAULTS = ['Andres Guisao','Marcela Hernandez','Gregorio Navarro'];
  const CARRIER_DEFAULTS = ['Imperial PFS','Great West','RPS','Rocklake','Burns and Wilcox'];
  const LINK_DEFAULTS = {
    'RPS':'https://rpsins.epaypolicy.com/',
    'Guardian':'https://guardian-ins.epaypolicy.com/',
    'Rocklake':'https://rocklakeig.epaypolicy.com/',
    'Burns and Wilcox':'https://burnsandwilcox.epaypolicy.com/'
  };

  function arr(key, defs){
    let x=[]; try{x=JSON.parse(localStorage.getItem(key)||'[]')}catch(_){}
    if(!Array.isArray(x)) x=[];
    const merged=[...x]; defs.forEach(v=>{if(!merged.some(y=>String(y).trim().toLowerCase()===v.toLowerCase())) merged.push(v)});
    return merged;
  }
  function obj(key, defs){
    let x={}; try{x=JSON.parse(localStorage.getItem(key)||'{}')}catch(_){}
    if(!x||typeof x!=='object'||Array.isArray(x))x={};
    return {...defs,...x};
  }
  function setArr(key,val){
    const next=JSON.stringify(val),prev=localStorage.getItem(key)||'';
    if(prev===next)return false;
    localStorage.setItem(key,next);
    try{if(typeof S!=='undefined'&&S){if(key==='tmic_p')S.p=val;if(key==='tmic_c')S.c=val;}}catch(_){}
    return true;
  }
  function setObj(key,val){
    const next=JSON.stringify(val),prev=localStorage.getItem(key)||'';
    if(prev===next)return false;
    localStorage.setItem(key,next);return true;
  }
  function signal(){try{window.dispatchEvent(new Event('tm-state-updated'))}catch(_){} }
  function fmtAccess(v){
    if(!v)return 'Sin registro';
    try{return new Intl.DateTimeFormat('es-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}).format(new Date(v))}catch(_){return String(v)}
  }
  function ensureStyle(){
    if(document.getElementById('tm-settings-stable-style'))return;
    const s=document.createElement('style');s.id='tm-settings-stable-style';s.textContent=`
      .tm-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px}.tm-settings-card{padding:18px}.tm-settings-card h3{margin:0 0 4px;color:#1f416a}.tm-settings-card .sub{margin-bottom:12px}.tm-stable-chips{display:flex;gap:8px;flex-wrap:wrap}.tm-stable-chip{background:#edf4fb;border:1px solid #d7e5f2;border-radius:999px;padding:7px 10px;font-weight:800;font-size:12px}.tm-stable-chip button{border:0;background:transparent;color:#a82f43;font-weight:900;cursor:pointer;margin-left:7px}.tm-settings-add{display:flex;gap:8px;margin-top:12px}.tm-settings-add input{flex:1;border:1px solid #d9e3ee;border-radius:9px;padding:10px}.tm-portals-card{grid-column:1/-1}.tm-access-card{grid-column:1/-1}.tm-access-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tm-access-item{border:1px solid #dbe6f1;border-radius:12px;padding:12px}.tm-access-item b{display:block;color:#173f69}.tm-access-item small{display:block;color:#6d7d92;margin-top:3px}.tm-portal-row{display:grid;grid-template-columns:220px 1fr auto auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #e8eef5}.tm-portal-row input{width:100%;border:1px solid #d9e3ee;border-radius:9px;padding:9px}.tm-portal-add{display:grid;grid-template-columns:220px 1fr auto;gap:8px;margin-top:12px}.tm-portal-add select,.tm-portal-add input{width:100%;border:1px solid #d9e3ee;border-radius:9px;padding:9px;background:#fff}.tm-portal-open{display:inline-flex;align-items:center;text-decoration:none}.tm-note-stable{font-size:12px;color:#6d7d92;margin-top:5px}@media(max-width:850px){.tm-settings-grid,.tm-access-grid{grid-template-columns:1fr}.tm-portal-row,.tm-portal-add{grid-template-columns:1fr}.tm-portals-card,.tm-access-card{grid-column:auto}}
    `;document.head.appendChild(s);
  }
  function renderPortals(card, carriers){
    const links=obj('tmic_l',LINK_DEFAULTS);
    const names=[...new Set([...carriers,...Object.keys(links)])].sort((a,b)=>a.localeCompare(b));
    card.innerHTML=`<h3>Portales de pago Carrier / MGA / PFA</h3><div class="sub">Configura el enlace de pago de cada mercado. El enlace se muestra únicamente cuando el caso está Revisado y listo para pagar.</div><div>${names.map(n=>`<div class="tm-portal-row" data-name="${esc(n)}"><b>${esc(n)}</b><input class="tm-url" value="${esc(links[n]||'')}" placeholder="https://..."><a class="btn soft tm-portal-open" ${links[n]?`href="${esc(links[n])}" target="_blank" rel="noopener"`:'style="pointer-events:none;opacity:.5"'}>Abrir ↗</a><button class="btn navy tm-save-url" type="button">Guardar</button></div>`).join('')}</div><div class="tm-portal-add"><select class="tm-carrier-select"><option value="">Seleccionar Carrier…</option>${carriers.map(c=>`<option>${esc(c)}</option>`).join('')}</select><input class="tm-new-url" placeholder="https://portal-de-pago.com/"><button class="btn navy tm-add-url" type="button">Agregar / actualizar</button></div>`;
    card.querySelectorAll('.tm-portal-row').forEach(row=>{row.querySelector('.tm-save-url').onclick=()=>{const all=obj('tmic_l',LINK_DEFAULTS),name=row.dataset.name,url=row.querySelector('.tm-url').value.trim();if(url)all[name]=url;else delete all[name];if(setObj('tmic_l',all))signal();render();};});
    card.querySelector('.tm-add-url').onclick=()=>{const name=card.querySelector('.tm-carrier-select').value.trim(),url=card.querySelector('.tm-new-url').value.trim();if(!name||!url)return;const all=obj('tmic_l',LINK_DEFAULTS);all[name]=url;if(setObj('tmic_l',all))signal();render();};
  }
  function render(){
    ensureStyle();
    const panel=document.querySelector('#settings .panel');if(!panel)return;
    const producers=arr('tmic_p',PROD_DEFAULTS), carriers=arr('tmic_c',CARRIER_DEFAULTS);
    let seeded=false;seeded=setArr('tmic_p',producers)||seeded;seeded=setArr('tmic_c',carriers)||seeded;
    const links=obj('tmic_l',LINK_DEFAULTS);seeded=setObj('tmic_l',links)||seeded;
    if(seeded)setTimeout(signal,0);
    let access=[];try{access=JSON.parse(localStorage.getItem('tmic_a')||'[]')}catch(_){} if(!Array.isArray(access))access=[];
    panel.innerHTML=`<h2>Configuración</h2><div class="tm-settings-grid"><div class="card tm-settings-card"><h3>Producers</h3><div class="sub">Personas que registran o generan fees.</div><div class="tm-stable-chips tm-prod-chips"></div><div class="tm-settings-add"><input class="tm-new-prod" placeholder="Nombre del Producer"><button class="btn navy tm-add-prod" type="button">Agregar Producer</button></div></div><div class="card tm-settings-card"><h3>Carrier / MGA / PFA</h3><div class="sub">Catálogo utilizado al registrar obligaciones y próximos pagos.</div><div class="tm-stable-chips tm-car-chips"></div><div class="tm-settings-add"><input class="tm-new-car" placeholder="Nombre Carrier / MGA / PFA"><button class="btn navy tm-add-car" type="button">Agregar Carrier</button></div></div><div class="card tm-settings-card tm-portals-card"></div><div class="card tm-settings-card tm-access-card"><h3>Último acceso del equipo</h3><div class="sub">Muestra la última vez que cada usuario autorizado abrió el Income Center.</div><div class="tm-access-grid">${access.length?access.map(a=>`<div class="tm-access-item"><b>${esc(a.name||a.email||'Usuario')}</b><small>${esc(a.email||'')}</small><small><strong>Último acceso:</strong> ${esc(fmtAccess(a.lastAccess))}</small></div>`).join(''):'<div class="tm-note-stable">Todavía no hay registros de acceso.</div>'}</div></div></div>`;
    const pc=panel.querySelector('.tm-prod-chips'),cc=panel.querySelector('.tm-car-chips');
    pc.innerHTML=producers.map(p=>`<span class="tm-stable-chip">${esc(p)}<button type="button" data-v="${esc(p)}">×</button></span>`).join('');
    cc.innerHTML=carriers.map(c=>`<span class="tm-stable-chip">${esc(c)}<button type="button" data-v="${esc(c)}">×</button></span>`).join('');
    pc.querySelectorAll('button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(setArr('tmic_p',arr('tmic_p',[]).filter(x=>x!==v)))signal();render();});
    cc.querySelectorAll('button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(setArr('tmic_c',arr('tmic_c',[]).filter(x=>x!==v)))signal();render();});
    panel.querySelector('.tm-add-prod').onclick=()=>{const v=panel.querySelector('.tm-new-prod').value.trim();if(!v)return;const x=arr('tmic_p',[]);if(!x.some(p=>p.toLowerCase()===v.toLowerCase()))x.push(v);if(setArr('tmic_p',x))signal();render();};
    panel.querySelector('.tm-add-car').onclick=()=>{const v=panel.querySelector('.tm-new-car').value.trim();if(!v)return;const x=arr('tmic_c',[]);if(!x.some(c=>c.toLowerCase()===v.toLowerCase()))x.push(v);if(setArr('tmic_c',x))signal();render();};
    renderPortals(panel.querySelector('.tm-portals-card'),carriers);
  }
  window.tmRefreshStableSettings=render;
  document.addEventListener('click',e=>{const b=e.target.closest('[data-v="settings"]');if(b)setTimeout(render,50)},true);
  window.addEventListener('tm-state-updated',()=>setTimeout(()=>{if(document.getElementById('settings')?.classList.contains('on'))render()},100));
  setInterval(()=>{if(document.getElementById('settings')?.classList.contains('on'))render()},900);
  setTimeout(render,550);
})();