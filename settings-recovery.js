(() => {
  if (window.__tmSettingsRecoveryLoaded) return;
  window.__tmSettingsRecoveryLoaded = true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
    if(!prod){
      prod=document.createElement('div');
      prod.id='tmSettingsProducers';
      prod.className='card box';
      analytics.insertBefore(prod,analytics.firstChild);
    }

    let carr=analytics.querySelector('#tmSettingsCarriers');
    if(!carr){
      carr=document.createElement('div');
      carr.id='tmSettingsCarriers';
      carr.className='card box';
      if(prod.nextSibling) analytics.insertBefore(carr,prod.nextSibling); else analytics.appendChild(carr);
    }

    let producers=[],carriers=[];
    try{producers=(typeof S!=='undefined'&&Array.isArray(S.p))?S.p:JSON.parse(localStorage.getItem('tmic_p')||'[]')}catch(_){producers=[]}
    try{carriers=(typeof S!=='undefined'&&Array.isArray(S.c))?S.c:JSON.parse(localStorage.getItem('tmic_c')||'[]')}catch(_){carriers=[]}

    prod.innerHTML=`<h3>Producers</h3><div class="sub">Personas que registran o generan fees.</div><div class="chips" style="margin-top:10px">${producers.map(x=>`<span class="chip">${esc(x)}<span class="x" data-rm-prod="${esc(x)}">×</span></span>`).join('')}</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><input id="tmNewProd" class="month" placeholder="Nombre del Producer"><button class="btn navy" id="tmAddProd" type="button">Agregar Producer</button></div>`;
    carr.innerHTML=`<h3>Carrier / MGA / PFA</h3><div class="sub">Catálogo utilizado al registrar obligaciones y próximos pagos.</div><div class="chips" style="margin-top:10px">${carriers.map(x=>`<span class="chip">${esc(x)}<span class="x" data-rm-car="${esc(x)}">×</span></span>`).join('')}</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><input id="tmNewCar" class="month" placeholder="Nombre Carrier / MGA / PFA"><button class="btn navy" id="tmAddCar" type="button">Agregar Carrier</button></div>`;

    prod.querySelector('#tmAddProd').onclick=()=>{
      const inp=prod.querySelector('#tmNewProd'),x=inp.value.trim();if(!x)return;
      if(typeof S!=='undefined'&&Array.isArray(S.p)&&!S.p.includes(x))S.p.push(x);
      localStorage.setItem('tmic_p',JSON.stringify((typeof S!=='undefined'&&Array.isArray(S.p))?S.p:producers.concat(x)));
      inp.value=''; try{if(typeof store==='function')store();}catch(_){} ensureSettings();
    };
    carr.querySelector('#tmAddCar').onclick=()=>{
      const inp=carr.querySelector('#tmNewCar'),x=inp.value.trim();if(!x)return;
      if(typeof S!=='undefined'&&Array.isArray(S.c)&&!S.c.includes(x))S.c.push(x);
      localStorage.setItem('tmic_c',JSON.stringify((typeof S!=='undefined'&&Array.isArray(S.c))?S.c:carriers.concat(x)));
      inp.value=''; try{if(typeof store==='function')store();}catch(_){} ensureSettings();setTimeout(()=>window.tmRefreshPaymentPortals?.(),50);
    };
    prod.querySelectorAll('[data-rm-prod]').forEach(el=>el.onclick=()=>{const x=el.dataset.rmProd;try{if(typeof rmProd==='function')return rmProd(x);}catch(_){};});
    carr.querySelectorAll('[data-rm-car]').forEach(el=>el.onclick=()=>{const x=el.dataset.rmCar;try{if(typeof rmCar==='function')return rmCar(x);}catch(_){};});

    setTimeout(()=>window.tmRefreshPaymentPortals?.(),40);
  }

  window.tmRefreshSettingsRecovery=ensureSettings;
  const prior=window.render;
  if(typeof prior==='function')window.render=function(){prior();setTimeout(ensureSettings,180)};
  window.addEventListener('tm-state-updated',()=>setTimeout(ensureSettings,120));
  setTimeout(ensureSettings,450);
})();