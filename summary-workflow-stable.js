(() => {
  if(window.__tmSummaryWorkflowStableLoaded)return;
  window.__tmSummaryWorkflowStableLoaded=true;

  if(!document.getElementById('tm-funds-confirmation-script')){
    const fs=document.createElement('script');fs.id='tm-funds-confirmation-script';fs.src='/funds-confirmation.js?v=2';document.head.appendChild(fs);
  }

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const fmtDate=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})};
  const amountOf=r=>Math.max(+r?.downPayment||0,+r?.carrierAmt||0);
  const statusOf=r=>String(r?.carrierStatus||'').trim().toLowerCase();
  const fundsStatusOf=r=>String(r?.fundsStatus||'').trim().toLowerCase();
  const fundsReady=r=>!r?.fundsStatus||fundsStatusOf(r)==='confirmado';
  const companyName=r=>String(r?.company||'').trim()||String(r?.client||'').trim()||'—';
  let rendering=false,lastSig='';

  function rows(){
    try{const x=JSON.parse(localStorage.getItem('tmic_r')||'[]');if(Array.isArray(x))return x;}catch(_){ }
    try{return (typeof S!=='undefined'&&Array.isArray(S.r))?S.r:[]}catch(_){return[]}
  }
  function monthKey(){return `${document.getElementById('yr')?.value||new Date().getFullYear()}-${document.getElementById('mo')?.value||String(new Date().getMonth()+1).padStart(2,'0')}`}
  function recentRows(){const k=monthKey();return rows().filter(r=>String(r.date||'').slice(0,7)===k).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));}
  function reviewRows(){return rows().filter(r=>fundsReady(r)&&amountOf(r)>0&&!['revisado','pagado'].includes(statusOf(r))).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));}
  function paymentRows(){return rows().filter(r=>fundsReady(r)&&amountOf(r)>0&&statusOf(r)==='revisado').slice().sort((a,b)=>String(a.carrierDue||'9999-12-31').localeCompare(String(b.carrierDue||'9999-12-31')));}
  function depBadge(r){return String(r.depStatus||'').toLowerCase()==='depositado'?'<span class="badge ok">Depositado</span>':'<span class="badge proc">En proceso</span>'}
  function workflowBadge(r){const st=statusOf(r);if(amountOf(r)<=0)return '<span style="color:#9aa8b8">—</span>';if(!fundsReady(r))return '<span class="badge" style="background:#fff1c9;color:#8b6507">Esperando fondos</span>';if(st==='pagado')return '<span class="badge ok">Pagado</span>';if(st==='revisado')return '<span class="badge proc">Listo para pago</span>';return '<span class="badge" style="background:#fff3d4;color:#8c6810">Pendiente revisión</span>'}
  function dayLabel(due){if(!due)return['—','tm-days-warn'];const d=new Date(due+'T12:00:00');if(Number.isNaN(d.getTime()))return['—','tm-days-ok'];const n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12),diff=Math.ceil((d-t)/86400000);if(diff<0)return['Vencido','tm-days-danger'];if(diff===0)return['Hoy','tm-days-danger'];if(diff<=3)return[`${diff} día${diff===1?'':'s'}`,'tm-days-danger'];if(diff<=7)return[`${diff} días`,'tm-days-warn'];return[`${diff} días`,'tm-days-ok'];}

  function ensureStyle(){
    if(document.getElementById('tm-summary-workflow-style'))return;
    const s=document.createElement('style');s.id='tm-summary-workflow-style';s.textContent=`
      #summary .grid2{display:block!important;margin-top:18px!important}
      #summary .grid2>.card{width:100%!important;margin:0!important;padding:16px!important;min-width:0!important}
      #summary .grid2>.card+.card{margin-top:14px!important}
      #summary .grid2 .head{align-items:center!important;margin-bottom:12px!important}
      #summary .grid2 .head h3{font-size:18px!important;margin:0!important;color:#1f416a!important}
      #summary .grid2 .tablewrap{overflow:auto!important}
      #summary .grid2 table{width:100%!important;min-width:980px!important}
      #summary .grid2 th{font-size:10px!important;padding:10px!important}
      #summary .grid2 td{padding:11px 10px!important}
      .tm-days{display:inline-flex;align-items:center;justify-content:center;min-width:62px;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:900}
      .tm-days-danger{background:#ffe3e7;color:#a92439}.tm-days-warn{background:#fff0c8;color:#936100}.tm-days-ok{background:#e8f3fd;color:#245d8c}
      .tm-open-pay{border:0;background:#edf4fb;color:#174675;border-radius:8px;padding:7px 10px;font-weight:900;cursor:pointer}
    `;document.head.appendChild(s);
  }

  window.tmOpenWorkflowCarrier=function(id){if(typeof window.tmEditCarrierObligation==='function')return window.tmEditCarrierObligation(id);if(typeof window.go==='function')return window.go('carrier');};

  function render(force=false){
    const grid=document.querySelector('#summary .grid2');if(!grid)return;
    ensureStyle();
    const recent=recentRows(),review=reviewRows(),pay=paymentRows();
    const sig=JSON.stringify({m:monthKey(),recent:recent.map(r=>[r.id,r.date,r.invoice,r.gross,r.agencyFee,r.net,r.depStatus,r.carrierStatus,r.fundsStatus,amountOf(r)]),review:review.map(r=>[r.id,r.invoice,amountOf(r),r.carrierStatus,r.fundsStatus]),pay:pay.map(r=>[r.id,r.invoice,amountOf(r),r.carrier,r.carrierDue,r.carrierStatus,r.fundsStatus])});
    const stableDom=grid.dataset.tmWorkflowStable==='1'&&document.getElementById('tmRecentStableCard')&&document.getElementById('tmReviewQueueCard')&&document.getElementById('tmCarrierPaymentCard');
    if(!force&&sig===lastSig&&stableDom)return;
    const scrollY=window.scrollY;
    lastSig=sig;rendering=true;
    grid.innerHTML=`
      <div class="card box" id="tmRecentStableCard"><div class="head"><div><h3>Movimientos recientes</h3><div class="sub" style="display:block!important">Todos los ingresos del mes seleccionado, tengan o no Down Payment.</div></div><button class="btn soft" type="button" onclick="go('income')">Ver todos →</button></div><div class="tablewrap"><table><thead><tr><th>Fecha pago</th><th>Cliente</th><th>Invoice</th><th>Producer</th><th>Método</th><th>Pagó cliente</th><th>Fee</th><th>Neto</th><th>Depósito</th><th>Carrier / PFA</th><th>Acción</th></tr></thead><tbody>${recent.length?recent.slice(0,8).map(r=>`<tr><td>${fmtDate(r.date)}</td><td><b>${esc(companyName(r))}</b></td><td>${esc(r.invoice||'')}</td><td>${esc(r.producer||'')}</td><td>${esc(r.method||'')}</td><td>${fmt(r.gross)}</td><td>${fmt(r.agencyFee)}</td><td><b>${fmt(r.net)}</b></td><td>${depBadge(r)}</td><td>${workflowBadge(r)}</td><td><div class="tm-actions"><button class="btn soft" onclick="openModal('${esc(r.id)}')">Editar</button><button class="btn danger tm-delete" onclick="deleteIncome('${esc(r.id)}')">Eliminar</button></div></td></tr>`).join(''):'<tr><td colspan="11" style="color:#6d7d92">Sin movimientos en este mes.</td></tr>'}</tbody></table></div></div>
      <div class="card box" id="tmReviewQueueCard"><div class="head"><div><h3>Invoices pendientes de revisión</h3><div class="sub" style="display:block!important">Ingresos con Down Payment cuyos fondos ya fueron confirmados y todavía deben ser revisados por Operaciones.</div></div><button class="btn soft" type="button" onclick="go('carrier')">Ver Carrier / PFA →</button></div><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Down Payment</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${review.length?review.slice(0,10).map(r=>`<tr><td>${fmtDate(r.date)}</td><td><b>${esc(companyName(r))}</b></td><td>${esc(r.invoice||'')}</td><td><b>${fmt(amountOf(r))}</b></td><td><span class="badge proc">Pendiente de revisión</span></td><td><button class="btn soft" onclick="tmOpenWorkflowCarrier('${esc(r.id)}')">Revisar</button></td></tr>`).join(''):'<tr><td colspan="6" style="color:#6d7d92">No hay invoices pendientes de revisión.</td></tr>'}</tbody></table></div></div>
      <div class="card box" id="tmCarrierPaymentCard"><div class="head"><div><h3>Próximos pagos a Carrier / MGA / PFA</h3><div class="sub" style="display:block!important">Solo casos con fondos confirmados, ya revisados y listos para pago. Permanecen aquí hasta registrar el pago.</div></div><button class="btn soft" type="button" onclick="go('carrier')">Ver todos los pagos →</button></div><div class="tablewrap"><table><thead><tr><th>Carrier / MGA / PFA</th><th>Cliente</th><th>Invoice</th><th>Monto a pagar</th><th>Fecha límite</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${pay.length?pay.slice(0,10).map(r=>{const [txt,cls]=dayLabel(r.carrierDue);return `<tr><td><b>${esc(r.carrier||'—')}</b></td><td><b>${esc(companyName(r))}</b></td><td>${esc(r.invoice||'')}</td><td><b>${fmt(amountOf(r))}</b></td><td>${fmtDate(r.carrierDue)}</td><td><span class="tm-days ${cls}">${esc(txt)}</span></td><td><button class="tm-open-pay" onclick="tmOpenWorkflowCarrier('${esc(r.id)}')">Abrir</button></td></tr>`}).join(''):'<tr><td colspan="7" style="color:#6d7d92">No hay pagos revisados pendientes.</td></tr>'}</tbody></table></div></div>`;
    grid.dataset.tmWorkflowStable='1';
    requestAnimationFrame(()=>{
      rendering=false;
      window.scrollTo(0,scrollY);
      setTimeout(()=>{window.tmRefreshFundsConfirmation?.();window.scrollTo(0,scrollY);},60);
    });
  }

  function burst(){[0,60,180].forEach(ms=>setTimeout(()=>render(false),ms));}
  window.tmRefreshSummaryWorkflow=burst;
  const prior=window.render;if(typeof prior==='function')window.render=function(){const out=prior.apply(this,arguments);burst();return out;};
  document.getElementById('mo')?.addEventListener('change',burst);document.getElementById('yr')?.addEventListener('change',burst);
  window.addEventListener('tm-state-updated',burst);window.addEventListener('storage',e=>{if(e.key==='tmic_r')burst()});
  setInterval(()=>{if(!rendering)render(false)},1200);
  burst();
})();