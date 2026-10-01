(() => {
  if (window.__tmRecentFinalLoaded) return;
  window.__tmRecentFinalLoaded = true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const fmtDate=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})};
  const depBadge=r=>String(r.depStatus||'').toLowerCase()==='depositado'?'<span class="badge ok">Depositado</span>':'<span class="badge proc">En proceso</span>';
  const amountOf=r=>Math.max(+r?.downPayment||0,+r?.carrierAmt||0);
  const hasCarrier=r=>amountOf(r)>0;
  const statusOf=r=>String(r?.carrierStatus||'').trim().toLowerCase();
  const companyName=r=>String(r.company||'').trim()||String(r.client||'').trim()||'—';

  const carrierBadge=r=>{
    if(!hasCarrier(r)) return '<span style="color:#9aa8b8">—</span>';
    const st=statusOf(r);
    if(st==='pagado')return `<button class="tm-mini green" onclick="tmEditCarrierObligation('${r.id}')">Pagado</button>`;
    if(st==='revisado')return `<button class="tm-mini green" onclick="tmEditCarrierObligation('${r.id}')">Listo para pago</button>`;
    return `<button class="tm-mini amber" onclick="tmEditCarrierObligation('${r.id}')">Pendiente revisión</button>`;
  };

  function freshRows(){
    try{const x=JSON.parse(localStorage.getItem('tmic_r')||'[]');if(Array.isArray(x)) return x;}catch(_){ }
    try{return (typeof S!=='undefined'&&S&&Array.isArray(S.r))?S.r:[]}catch(_){return[]}
  }

  const selectedMonth=()=>`${document.getElementById('yr')?.value||new Date().getFullYear()}-${document.getElementById('mo')?.value||String(new Date().getMonth()+1).padStart(2,'0')}`;
  let busy=false,expanded=false,repairTimer=null;

  function monthRows(){
    const month=selectedMonth();
    return freshRows().filter(r=>String(r.date||'').slice(0,7)===month).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  }

  function setupHeader(card,total){
    const head=card?.querySelector('.head');if(!head)return;
    const h3=head.querySelector('h3');if(h3){h3.textContent='Movimientos recientes';h3.style.cursor=total>5?'pointer':'default';h3.onclick=total>5?()=>{expanded=!expanded;renderRecentFinal(true)}:null}
    const sub=head.querySelector('.sub');if(sub){sub.style.display='block';sub.textContent='Todos los ingresos del mes, tengan o no Down Payment.'}
    let actions=head.querySelector('.tm-recent-head-actions');
    if(!actions){actions=document.createElement('div');actions.className='tm-recent-head-actions';actions.style.cssText='display:flex;gap:8px;align-items:center;margin-left:auto';const existing=head.querySelector('.btn.soft');if(existing){head.insertBefore(actions,existing);actions.appendChild(existing)}else head.appendChild(actions)}
    let pending=actions.querySelector('#tmCarrierPendingCount');
    const count=freshRows().filter(r=>hasCarrier(r)&&statusOf(r)!=='revisado'&&statusOf(r)!=='pagado').length;
    if(count>0){
      if(!pending){pending=document.createElement('button');pending.type='button';pending.id='tmCarrierPendingCount';pending.className='tm-mini amber';actions.insertBefore(pending,actions.firstChild)}
      pending.textContent=`Invoices por revisar: ${count}`;
      pending.onclick=()=>{try{window.tmRefreshReviewQueue?.();document.getElementById('tmReviewQueueCard')?.scrollIntoView({behavior:'smooth',block:'center'})}catch(_){}};
    }else if(pending)pending.remove();
    const viewAll=actions.querySelector('.btn.soft:not(#tmRecentCollapse)');if(viewAll){viewAll.textContent='Ver todos →';viewAll.onclick=()=>go('income')}
    let collapse=actions.querySelector('#tmRecentCollapse');if(expanded&&total>5){if(!collapse){collapse=document.createElement('button');collapse.type='button';collapse.id='tmRecentCollapse';collapse.className='btn soft';actions.insertBefore(collapse,actions.firstChild)}collapse.textContent='Mostrar menos ↑';collapse.onclick=()=>{expanded=false;renderRecentFinal(true)}}else if(collapse)collapse.remove();
  }

  function healthy(body,table,expectedCount){
    const hr=table?.querySelector('thead tr');
    if(!hr||hr.children.length!==11||String(hr.children[0]?.textContent||'').trim().toLowerCase()!=='fecha pago') return false;
    const trs=[...body.querySelectorAll(':scope > tr')];if(!trs.length)return false;
    if(expectedCount===0)return Number(trs[0].querySelector('td')?.getAttribute('colspan'))===11;
    return trs.every(tr=>tr.children.length===11);
  }

  function renderRecentFinal(force=false){
    if(busy&&!force)return;busy=true;
    try{
      const body=document.getElementById('recent');if(!body)return;
      const card=body.closest('.card'),table=body.closest('table');if(!card||!table)return;
      card.querySelectorAll('.tm-filters,.tm-recent-sort,#tmRecentExpand,.tm-recent-footer').forEach(x=>x.remove());
      const allRows=monthRows();setupHeader(card,allRows.length);
      const hr=table.querySelector('thead tr');if(hr)hr.innerHTML='<th>Fecha pago</th><th>Cliente</th><th>Invoice</th><th>Producer</th><th>Método</th><th>Pagó cliente</th><th>Fee</th><th>Neto</th><th>Depósito</th><th>Carrier / PFA</th><th>Acción</th>';
      const rows=expanded?allRows:allRows.slice(0,5);
      body.innerHTML=rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td><b>${esc(companyName(r))}</b></td><td><button class="tm-link" onclick="tmInvoiceDetail('${String(r.invoice||'').replace(/'/g,"\\'")}')">${esc(r.invoice||'')}</button></td><td>${esc(r.producer||'')}</td><td>${esc(r.method||'')}</td><td>${fmt(r.gross)}</td><td>${fmt(r.agencyFee)}</td><td><b>${fmt(r.net)}</b></td><td>${depBadge(r)}</td><td>${carrierBadge(r)}</td><td><div class="tm-actions"><button class="btn soft" onclick="openModal('${r.id}')">Editar</button><button class="btn danger tm-delete" onclick="deleteIncome('${r.id}')">Eliminar</button></div></td></tr>`).join('')||'<tr><td colspan="11">Sin movimientos en este mes.</td></tr>';
      body.dataset.tmRecentFinal='1';
    }finally{setTimeout(()=>{busy=false},25)}
  }

  function ensureHealthy(){const body=document.getElementById('recent');if(!body)return;const table=body.closest('table');if(!table)return;const all=monthRows(),shown=expanded?all.length:Math.min(all.length,5);if(!healthy(body,table,shown))renderRecentFinal(true)}
  function burst(){[0,40,120,260,500,900,1500].forEach(ms=>setTimeout(()=>renderRecentFinal(true),ms));}
  window.tmRefreshRecentMovements=burst;
  const prior=window.render;if(typeof prior==='function')window.render=function(){const out=prior.apply(this,arguments);burst();return out;};
  const start=()=>{const body=document.getElementById('recent');if(!body){setTimeout(start,100);return;}const card=body.closest('.card');if(card)new MutationObserver(()=>{clearTimeout(repairTimer);repairTimer=setTimeout(ensureHealthy,35)}).observe(card,{childList:true,subtree:true});document.getElementById('mo')?.addEventListener('change',()=>{expanded=false;burst()});document.getElementById('yr')?.addEventListener('change',()=>{expanded=false;burst()});window.addEventListener('tm-state-updated',burst);setInterval(ensureHealthy,500);burst();};
  start();
})();