(() => {
  if(window.__tmReviewQueueLoaded)return;
  window.__tmReviewQueueLoaded=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const fmtDate=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})};
  const amountOf=r=>Math.max(+r?.downPayment||0,+r?.carrierAmt||0);
  const statusOf=r=>String(r?.carrierStatus||'').trim().toLowerCase();
  const companyName=r=>String(r?.company||'').trim()||String(r?.client||'').trim()||'—';
  let busy=false,lastSig='';

  function freshRows(){
    try{const x=JSON.parse(localStorage.getItem('tmic_r')||'[]');if(Array.isArray(x))return x;}catch(_){ }
    try{return (typeof S!=='undefined'&&Array.isArray(S.r))?S.r:[]}catch(_){return[]}
  }

  function reviewRows(){
    return freshRows().filter(r=>{
      const st=statusOf(r);
      return amountOf(r)>0 && st!=='revisado' && st!=='pagado';
    }).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  }

  function getCard(){
    const grid=document.querySelector('#summary .grid2');if(!grid)return null;
    let card=document.getElementById('tmReviewQueueCard');if(card)return card;
    card=document.createElement('div');card.id='tmReviewQueueCard';card.className='card box';
    const carrier=document.getElementById('tmCarrierPaymentCard');
    if(carrier&&carrier.parentNode===grid)grid.insertBefore(card,carrier);else grid.appendChild(card);
    return card;
  }

  function render(force=false){
    const card=getCard();if(!card)return;
    const rows=reviewRows();const sig=JSON.stringify(rows.map(r=>[r.id,r.invoice,amountOf(r),r.carrierStatus||'',r.carrier||'',r.carrierDue||'']));
    if(!force&&sig===lastSig&&card.dataset.tmReady==='1')return;lastSig=sig;busy=true;
    const show=rows.slice(0,10);
    card.innerHTML=`<div class="head"><div><h3>Invoices pendientes de revisión</h3><div class="sub" style="display:block!important">Ingresos con Down Payment que Operaciones debe completar y marcar como Revisado. El ingreso también permanece en Movimientos recientes.</div></div><button class="btn soft" type="button" onclick="go('carrier')">Ver Carrier / PFA →</button></div><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Down Payment</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${show.length?show.map(r=>`<tr><td>${fmtDate(r.date)}</td><td><b>${esc(companyName(r))}</b></td><td>${esc(r.invoice||'')}</td><td><b>${fmt(amountOf(r))}</b></td><td><span class="badge proc">Pendiente de revisión</span></td><td><button class="btn soft" type="button" onclick="tmEditCarrierObligation('${esc(r.id)}')">Revisar</button></td></tr>`).join(''):'<tr><td colspan="6" style="color:#6d7d92">No hay invoices pendientes de revisión.</td></tr>'}</tbody></table></div>`;
    card.dataset.tmReady='1';requestAnimationFrame(()=>{busy=false});
  }

  function burst(){[0,40,120,260,500,900].forEach(ms=>setTimeout(()=>render(true),ms))}
  window.tmRefreshReviewQueue=burst;
  const prior=window.render;if(typeof prior==='function')window.render=function(){const out=prior.apply(this,arguments);burst();return out;};
  window.addEventListener('tm-state-updated',burst);window.addEventListener('storage',e=>{if(e.key==='tmic_r')burst()});
  const summary=document.getElementById('summary');if(summary)new MutationObserver(()=>{if(!busy)requestAnimationFrame(()=>render(false))}).observe(summary,{childList:true,subtree:true});
  setInterval(()=>render(false),700);burst();
})();