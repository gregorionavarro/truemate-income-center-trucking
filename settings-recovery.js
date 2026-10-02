(() => {
  if (window.__tmSettingsRecoveryLoaded) return;
  window.__tmSettingsRecoveryLoaded = true;

  const DEFAULT_PRODUCERS=['Andres Guisao','Marcela Hernandez','Gregorio Navarro'];
  const DEFAULT_CARRIERS=['Imperial PFS','Great West','RPS','Rocklake','Burns and Wilcox'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(k,f=[])=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(x)?x:f.slice()}catch(_){return f.slice()}};

  function getCatalog(kind){
    const key=kind==='p'?'tmic_p':'tmic_c';
    const fallback=kind==='p'?DEFAULT_PRODUCERS:DEFAULT_CARRIERS;
    let list=[];
    try{list=(typeof S!=='undefined'&&Array.isArray(S[kind]))?S[kind]:read(key,fallback)}catch(_){list=read(key,fallback)}
    if(!list.length) list=fallback.slice();
    localStorage.setItem(key,JSON.stringify(list));
    try{if(typeof S!=='undefined'&&Array.isArray(S[kind])&&!S[kind].length)S[kind].push(...list)}catch(_){}
    return list;
  }

  function persist(){
    try{if(typeof store==='function')store()}catch(_){}
    try{window.dispatchEvent(new Event('tm-state-updated'))}catch(_){}
  }

  function ensureSettings(){
    const panel=document.querySelector('#settings .panel');
    if(!panel) return;

    let analytics=panel.querySelector('.analytics');
    if(!analytics){
      analytics=document.createElement('div');
      analytics.className='analytics tm-settings-core';
      const activity=panel.querySelector('.tm-team-activity');
      if(activity) panel.insertBefore(analytics,activity); else panel.appendChild(analytics);
    }
    analytics.style.display='grid';
    analytics.style.gridTemplateColumns='1fr 1fr';
    analytics.style.gap='18px';
    analytics.style.marginTop='18px';

    let prod=analytics.querySelector('#tmSettingsProducers');
    if(!prod){prod=document.createElement('div');prod.id='tmSettingsProducers';prod.className='card box';analytics.insertBefore(prod,analytics.firstChild)}
    let carr=analytics.querySelector('#tmSettingsCarriers');
    if(!carr){carr=document.createElement('div');carr.id='tmSettingsCarriers';carr.className='card box';prod.after(carr)}

    const producers=getCatalog('p'),carriers=getCatalog('c');
    prod.innerHTML=`<h3>Producers</h3><div class="sub">Personas que registran o generan fees.</div><div class="chips" style="margin-top:10px">${producers.map(x=>`<span class="chip">${esc(x)}<span class="x" data-rm-prod="${esc(x)}">×</span></span>`).join('')}</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><input id="tmNewProd" class="month" placeholder="Nombre del Producer"><button class="btn navy" id="tmAddProd" type="button">Agregar Producer</button></div>`;
    carr.innerHTML=`<h3>Carrier / MGA / PFA</h3><div class="sub">Catálogo utilizado al registrar obligaciones y próximos pagos.</div><div class="chips" style="margin-top:10px">${carriers.map(x=>`<span class="chip">${esc(x)}<span class="x" data-rm-car="${esc(x)}">×</span></span>`).join('')}</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><input id="tmNewCar" class="month" placeholder="Nombre Carrier / MGA / PFA"><button class="btn navy" id="tmAddCar" type="button">Agregar Carrier</button></div>`;

    prod.querySelector('#tmAddProd').onclick=()=>{
      const inp=prod.querySelector('#tmNewProd'),x=inp.value.trim();if(!x)return;
      const list=getCatalog('p');if(!list.includes(x))list.push(x);
      try{if(typeof S!=='undefined'&&Array.isArray(S.p)){S.p.length=0;S.p.push(...list)}}catch(_){}
      localStorage.setItem('tmic_p',JSON.stringify(list));inp.value='';persist();ensureSettings();
    };
    carr.querySelector('#tmAddCar').onclick=()=>{
      const inp=carr.querySelector('#tmNewCar'),x=inp.value.trim();if(!x)return;
      const list=getCatalog('c');if(!list.includes(x))list.push(x);
      try{if(typeof S!=='undefined'&&Array.isArray(S.c)){S.c.length=0;S.c.push(...list)}}catch(_){}
      localStorage.setItem('tmic_c',JSON.stringify(list));inp.value='';persist();ensureSettings();setTimeout(()=>window.tmRefreshPaymentPortals?.(),60);
    };
    prod.querySelectorAll('[data-rm-prod]').forEach(el=>el.onclick=()=>{const x=el.dataset.rmProd;try{if(typeof rmProd==='function'){rmProd(x);setTimeout(ensureSettings,80);return}}catch(_){};});
    carr.querySelectorAll('[data-rm-car]').forEach(el=>el.onclick=()=>{const x=el.dataset.rmCar;try{if(typeof rmCar==='function'){rmCar(x);setTimeout(ensureSettings,80);return}}catch(_){};});

    setTimeout(()=>window.tmRefreshPaymentPortals?.(),80);
  }

  window.tmRefreshSettingsRecovery=ensureSettings;
  const prior=window.render;
  if(typeof prior==='function')window.render=function(){prior();setTimeout(ensureSettings,220)};
  window.addEventListener('tm-state-updated',()=>setTimeout(ensureSettings,140));
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-v="settings"]'))setTimeout(ensureSettings,120)},true);
  setInterval(()=>{if(document.getElementById('settings')?.classList.contains('on'))ensureSettings()},1200);
  setTimeout(ensureSettings,450);
})();