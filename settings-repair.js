(() => {
  if (window.__tmSettingsRepairLoaded) return;
  window.__tmSettingsRepairLoaded = true;

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DEFAULT_LINKS = {
    'RPS':'https://rpsins.epaypolicy.com/',
    'Guardian':'https://guardian-ins.epaypolicy.com/',
    'Rocklake':'https://rocklakeig.epaypolicy.com/',
    'Burns and Wilcox':'https://burnsandwilcox.epaypolicy.com/',
    'Great West':'',
    'Imperial PFS':''
  };

  function rows(){
    try{return typeof S!=='undefined'&&S?S:null}catch(_){return null}
  }
  function producers(){
    const s=rows(); if(s&&Array.isArray(s.p)) return s.p;
    try{const x=JSON.parse(localStorage.getItem('tmic_p')||'[]');return Array.isArray(x)?x:[]}catch(_){return []}
  }
  function carriers(){
    const s=rows(); if(s&&Array.isArray(s.c)) return s.c;
    try{const x=JSON.parse(localStorage.getItem('tmic_c')||'[]');return Array.isArray(x)?x:[]}catch(_){return []}
  }
  function links(){
    try{const x=JSON.parse(localStorage.getItem('tmic_l')||'null');if(x&&typeof x==='object'&&!Array.isArray(x))return {...DEFAULT_LINKS,...x}}catch(_){}
    return {...DEFAULT_LINKS};
  }
  function persist(){
    const s=rows();
    if(s){
      localStorage.setItem('tmic_p',JSON.stringify(s.p||[]));
      localStorage.setItem('tmic_c',JSON.stringify(s.c||[]));
    }
    try{if(typeof store==='function')store();else window.dispatchEvent(new Event('tm-state-updated'))}catch(_){ }
  }

  function ensureStyle(){
    if(document.getElementById('tm-settings-repair-style'))return;
    const st=document.createElement('style');st.id='tm-settings-repair-style';st.textContent=`
      .tm-settings-main{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
      .tm-settings-card{background:#fff;border:1px solid #d9e3ee;border-radius:16px;padding:16px}
      .tm-settings-card h3{margin:0 0 4px;color:#1f416a}.tm-settings-card .sub{margin-bottom:12px}
      .tm-settings-full{grid-column:1/-1}.tm-settings-row{display:grid;grid-template-columns:220px 1fr auto auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #e8eef5}
      .tm-settings-add{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tm-settings-add input,.tm-settings-add select,.tm-settings-row input{border:1px solid #d9e3ee;border-radius:9px;padding:9px;min-width:220px;flex:1}
      .tm-settings-chip{display:inline-flex;align-items:center;gap:6px;background:#edf4fb;border:1px solid #d7e5f2;border-radius:999px;padding:7px 10px;font-weight:800;font-size:12px;margin:0 7px 7px 0}.tm-settings-chip button{border:0;background:transparent;color:#a82f43;font-weight:900;cursor:pointer}
      @media(max-width:850px){.tm-settings-main{grid-template-columns:1fr}.tm-settings-full{grid-column:auto}.tm-settings-row{grid-template-columns:1fr}}
    `;document.head.appendChild(st);
  }

  function render(){
    const panel=document.querySelector('#settings .panel');if(!panel)return;
    ensureStyle();
    let host=panel.querySelector('#tmSettingsRestored');
    if(!host){host=document.createElement('div');host.id='tmSettingsRestored';panel.insertBefore(host,panel.children[1]||null)}
    const ps=producers(),cs=carriers(),ls=links();
    const names=[...new Set([...cs,...Object.keys(ls)])].sort((a,b)=>a.localeCompare(b));
    host.innerHTML=`<div class="tm-settings-main">
      <div class="tm-settings-card"><h3>Producers</h3><div class="sub">Personas que registran o generan fees.</div><div>${ps.map((p,i)=>`<span class="tm-settings-chip">${esc(p)}<button type="button" data-del-prod="${i}">×</button></span>`).join('')}</div><div class="tm-settings-add"><input id="tmNewProducer" placeholder="Nombre del Producer"><button class="btn navy" id="tmAddProducer" type="button">Agregar Producer</button></div></div>
      <div class="tm-settings-card"><h3>Carrier / MGA / PFA</h3><div class="sub">Catálogo utilizado al registrar obligaciones y próximos pagos.</div><div>${cs.map((c,i)=>`<span class="tm-settings-chip">${esc(c)}<button type="button" data-del-car="${i}">×</button></span>`).join('')}</div><div class="tm-settings-add"><input id="tmNewCarrier" placeholder="Nombre Carrier / MGA / PFA"><button class="btn navy" id="tmAddCarrier" type="button">Agregar Carrier</button></div></div>
      <div class="tm-settings-card tm-settings-full"><h3>Portales de pago Carrier / MGA / PFA</h3><div class="sub">Configura el enlace de pago de cada mercado. El enlace se muestra únicamente cuando el caso está Revisado y listo para pagar.</div><div>${names.map(name=>`<div class="tm-settings-row" data-name="${esc(name)}"><b>${esc(name)}</b><input class="tm-url" value="${esc(ls[name]||'')}" placeholder="https://..."><button class="btn soft tm-open" type="button">Abrir ↗</button><button class="btn navy tm-save" type="button">Guardar</button></div>`).join('')}</div><div class="tm-settings-add"><select id="tmPortalCarrier"><option value="">Seleccionar Carrier…</option>${cs.map(c=>`<option>${esc(c)}</option>`).join('')}</select><input id="tmPortalUrl" placeholder="https://portal-de-pago.com/"><button class="btn navy" id="tmPortalAdd" type="button">Agregar / actualizar</button></div></div>
    </div>`;

    host.querySelector('#tmAddProducer').onclick=()=>{const v=host.querySelector('#tmNewProducer').value.trim();if(!v)return;const s=rows();if(s){s.p=s.p||[];if(!s.p.includes(v))s.p.push(v)}localStorage.setItem('tmic_p',JSON.stringify([...new Set([...ps,v])]));persist();render()};
    host.querySelectorAll('[data-del-prod]').forEach(b=>b.onclick=()=>{const i=+b.dataset.delProd,s=rows();if(s&&Array.isArray(s.p))s.p.splice(i,1);else{const x=producers();x.splice(i,1);localStorage.setItem('tmic_p',JSON.stringify(x))}persist();render()});
    host.querySelector('#tmAddCarrier').onclick=()=>{const v=host.querySelector('#tmNewCarrier').value.trim();if(!v)return;const s=rows();if(s){s.c=s.c||[];if(!s.c.includes(v))s.c.push(v)}localStorage.setItem('tmic_c',JSON.stringify([...new Set([...cs,v])]));persist();render()};
    host.querySelectorAll('[data-del-car]').forEach(b=>b.onclick=()=>{const i=+b.dataset.delCar,s=rows();if(s&&Array.isArray(s.c))s.c.splice(i,1);else{const x=carriers();x.splice(i,1);localStorage.setItem('tmic_c',JSON.stringify(x))}persist();render()});
    host.querySelectorAll('.tm-settings-row').forEach(row=>{const name=row.dataset.name,inp=row.querySelector('.tm-url');row.querySelector('.tm-open').onclick=()=>{const u=inp.value.trim();if(u)window.open(u,'_blank','noopener')};row.querySelector('.tm-save').onclick=()=>{const x=links(),u=inp.value.trim();if(u)x[name]=u;else delete x[name];localStorage.setItem('tmic_l',JSON.stringify(x));try{if(typeof store==='function')store()}catch(_){}render()}});
    host.querySelector('#tmPortalAdd').onclick=()=>{const n=host.querySelector('#tmPortalCarrier').value.trim(),u=host.querySelector('#tmPortalUrl').value.trim();if(!n||!u)return;const x=links();x[n]=u;localStorage.setItem('tmic_l',JSON.stringify(x));try{if(typeof store==='function')store()}catch(_){}render()};
  }

  function apply(){render()}
  window.tmRefreshSettingsRepair=apply;
  const oldRender=window.render;if(typeof oldRender==='function')window.render=function(){oldRender();setTimeout(apply,80)};
  window.addEventListener('tm-state-updated',()=>setTimeout(apply,60));
  setTimeout(apply,500);
})();