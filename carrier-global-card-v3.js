(() => {
  if (window.__tmCarrierGlobalV3Loaded) return;
  window.__tmCarrierGlobalV3Loaded = true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof window.money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const fmtDate=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})};
  const amountOf=r=>Math.max(+r?.carrierAmt||0,+r?.downPayment||0);
  const isPaid=r=>String(r?.carrierStatus||'').trim().toLowerCase()==='pagado';
  const isIncomplete=r=>!(String(r?.carrier||'').trim()&&String(r?.carrierDue||'').trim());
  const companyName=r=>String(r?.company||'').trim()||String(r?.client||'').trim()||'—';
  let rendering=false,lastSig='';

  function freshRows(){
    try{
      const rows=JSON.parse(localStorage.getItem('tmic_r')||'[]');
      if(Array.isArray(rows)) return rows;
    }catch(_){ }
    try{return (typeof S!=='undefined'&&Array.isArray(S.r))?S.r:[]}catch(_){return[]}
  }

  function pendingRows(){
    return freshRows().filter(r=>amountOf(r)>0&&!isPaid(r)).slice().sort((a,b)=>{
      const ai=isIncomplete(a),bi=isIncomplete(b);
      if(ai!==bi)return ai?-1:1;
      return String(a.carrierDue||'9999-12-31').localeCompare(String(b.carrierDue||'9999-12-31'));
    });
  }

  function sig(rows){return JSON.stringify(rows.map(r=>[r.id,r.invoice,companyName(r),amountOf(r),r.carrier||'',r.carrierDue||'',r.carrierStatus||'']))}

  function dayInfo(due,incomplete){
    if(incomplete||!due)return['Pendiente de completar','tm-days-warn'];
    const d=new Date(due+'T12:00:00');if(Number.isNaN(d.getTime()))return['—','tm-days-ok'];
    const n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12),diff=Math.ceil((d-t)/86400000);
    if(diff<0)return['Vencido','tm-days-danger'];
    if(diff===0)return['Hoy','tm-days-danger'];
    if(diff<=3)return[`${diff} día${diff===1?'':'s'}`,'tm-days-danger'];
    if(diff<=7)return[`${diff} días`,'tm-days-warn'];
    return[`${diff} días`,'tm-days-ok'];
  }

  window.tmGlobalCarrierOpen=function(id){
    if(typeof window.tmEditCarrierObligation==='function')return window.tmEditCarrierObligation(id);
    if(typeof window.go==='function')return window.go('carrier');
  };

  function targetCard(){const grid=document.querySelector('#summary .grid2');if(!grid||grid.children.length<2)return null;return grid.children[1]}

  function render(force=false){
    const card=targetCard();if(!card)return;
    const rows=pendingRows(),currentSig=sig(rows);
    if(!force&&currentSig===lastSig&&card.querySelector('[data-tm-global-carrier-v3="1"]'))return;
    lastSig=currentSig;rendering=true;
    const show=rows.slice(0,10);
    card.innerHTML=`<div data-tm-global-carrier-v3="1" data-tm-final-carrier-card="1"><div class="head"><div><h3>Próximos pagos a Carrier / MGA / PFA</h3><div class="sub" style="display:block!important">Pendientes globales · ${rows.length} activo${rows.length===1?'':'s'} · permanecen visibles hasta registrar el pago.</div></div><button class="btn soft" type="button" onclick="go('carrier')">Ver todos los pagos →</button></div><div class="tablewrap"><table><thead><tr><th>Carrier / MGA / PFA</th><th>Cliente</th><th>Invoice</th><th>Monto a pagar</th><th>Fecha límite</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${show.length?show.map(r=>{const incomplete=isIncomplete(r);const [txt,cls]=dayInfo(r.carrierDue,incomplete);return `<tr style="cursor:pointer" onclick="tmGlobalCarrierOpen('${esc(r.id)}')"><td><b>${esc(r.carrier||'Pendiente de completar')}</b></td><td><b>${esc(companyName(r))}</b></td><td>${esc(r.invoice||'')}</td><td><b>${fmt(amountOf(r))}</b></td><td>${fmtDate(r.carrierDue)}</td><td><span class="tm-days ${cls}">${esc(txt)}</span></td><td><button class="tm-open-pay ${incomplete?'setup':''}" type="button" onclick="event.stopPropagation();tmGlobalCarrierOpen('${esc(r.id)}')">${incomplete?'Completar':'Abrir'}</button></td></tr>`}).join(''):'<tr><td colspan="7" style="color:#6d7d92">Sin obligaciones pendientes a Carrier / MGA / PFA.</td></tr>'}</tbody></table></div></div>`;
    requestAnimationFrame(()=>{rendering=false});
  }

  function ensure(){if(rendering)return;const card=targetCard();if(!card)return;if(!card.querySelector('[data-tm-global-carrier-v3="1"]'))render(true);else render(false)}
  function burst(){[0,30,80,160,320,650,1100].forEach(ms=>setTimeout(()=>render(true),ms))}

  window.tmRefreshFinalCarrierCard=()=>render(true);
  window.tmRefreshGlobalCarrierCard=()=>render(true);
  document.getElementById('mo')?.addEventListener('change',burst);
  document.getElementById('yr')?.addEventListener('change',burst);
  const priorRender=window.render;if(typeof priorRender==='function')window.render=function(){const out=priorRender.apply(this,arguments);burst();return out};
  const summary=document.getElementById('summary');if(summary)new MutationObserver(()=>{if(!rendering)requestAnimationFrame(ensure)}).observe(summary,{childList:true,subtree:true});
  window.addEventListener('storage',e=>{if(e.key==='tmic_r')burst()});
  window.addEventListener('tm-state-updated',burst);
  setInterval(()=>{const rows=pendingRows(),s=sig(rows),card=targetCard();if(s!==lastSig||!card?.querySelector('[data-tm-global-carrier-v3="1"]'))render(true)},700);
  burst();
})();