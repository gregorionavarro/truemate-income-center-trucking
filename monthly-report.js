(() => {
  if(window.__tmMonthlyReportLoaded)return;
  window.__tmMonthlyReportLoaded=true;

  const M=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const period=()=>`${document.getElementById('yr')?.value||new Date().getFullYear()}-${document.getElementById('mo')?.value||String(new Date().getMonth()+1).padStart(2,'0')}`;
  const label=()=>`${M[(+document.getElementById('mo')?.value||1)-1]} de ${document.getElementById('yr')?.value||new Date().getFullYear()}`;
  function rows(){try{const x=JSON.parse(localStorage.getItem('tmic_r')||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
  function monthRows(){const k=period();return rows().filter(r=>String(r.date||'').slice(0,7)===k)}
  const sum=(arr,fn)=>arr.reduce((a,x)=>a+(+fn(x)||0),0);
  const company=r=>String(r.company||'').trim()||String(r.client||'').trim()||'—';
  const amtCarrier=r=>Math.max(+r.downPayment||0,+r.carrierAmt||0);

  function agg(arr,keyFn,valFn){const o={};arr.forEach(r=>{const k=keyFn(r)||'Sin especificar';o[k]=(o[k]||0)+(+valFn(r)||0)});return Object.entries(o).sort((a,b)=>b[1]-a[1]);}
  function metrics(){
    const rr=monthRows(),k=period();
    const paidCarrier=rows().filter(r=>String(r.carrierPaidDate||'').slice(0,7)===k&&String(r.carrierStatus||'').toLowerCase()==='pagado');
    const deferred=rows().filter(r=>String(r.defDate||'').slice(0,7)===k);
    return {
      rr,k,
      gross:sum(rr,r=>r.gross),fees:sum(rr,r=>r.agencyFee),net:sum(rr,r=>r.net),
      processing:sum(rr.filter(r=>String(r.depStatus||'').toLowerCase()==='en proceso'),r=>r.net),
      pending:sum(rr,r=>r.pendingAmt??r.pending??0),
      fundsPending:rr.filter(r=>String(r.fundsStatus||'').toLowerCase()==='pendiente de confirmar'),
      dpTotal:sum(rr,r=>amtCarrier(r)),
      reviewPending:rr.filter(r=>amtCarrier(r)>0&&(!r.fundsStatus||String(r.fundsStatus).toLowerCase()==='confirmado')&&!['revisado','pagado'].includes(String(r.carrierStatus||'').toLowerCase())),
      paidCarrier,carrierPaid:sum(paidCarrier,r=>amtCarrier(r)),
      deferred,deferredTotal:sum(deferred,r=>r.defAmt),
      methods:agg(rr,r=>r.method,r=>r.gross),producers:agg(rr,r=>r.producer,r=>r.agencyFee)
    };
  }

  function ensureStyle(){if(document.getElementById('tm-month-report-style'))return;const s=document.createElement('style');s.id='tm-month-report-style';s.textContent=`
    #tmMonthlyReportBtn{margin-top:10px;width:100%;background:#173f69;color:#fff;border:0;border-radius:12px;padding:11px 14px;font-weight:900;cursor:pointer}
    .tm-report-overlay{position:fixed;inset:0;background:rgba(16,32,52,.48);z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto}
    .tm-report-modal{width:min(1050px,100%);background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(17,53,90,.28);overflow:hidden}
    .tm-report-head{padding:18px 22px;border-bottom:1px solid #d9e3ee;display:flex;justify-content:space-between;gap:16px;align-items:center}.tm-report-head h2{margin:0;color:#173f69}.tm-report-body{padding:20px}.tm-report-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.tm-report-kpi{border:1px solid #d9e3ee;border-radius:12px;padding:14px;background:#f8fbff}.tm-report-kpi small{display:block;color:#6d7d92;font-weight:900;text-transform:uppercase}.tm-report-kpi b{display:block;color:#173f69;font-size:21px;margin-top:6px}.tm-report-two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}.tm-report-card{border:1px solid #d9e3ee;border-radius:12px;padding:14px}.tm-report-card h3{margin:0 0 10px;color:#173f69}.tm-report-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #eef3f7}.tm-report-table{overflow:auto;margin-top:16px}.tm-report-table table{min-width:900px}.tm-report-foot{padding:15px 22px;border-top:1px solid #d9e3ee;display:flex;justify-content:flex-end;gap:8px}.tm-report-close,.tm-report-print{border:0;border-radius:10px;padding:10px 14px;font-weight:900;cursor:pointer}.tm-report-close{background:#edf4fb;color:#173f69}.tm-report-print{background:#173f69;color:#fff}@media(max-width:850px){.tm-report-grid{grid-template-columns:1fr 1fr}.tm-report-two{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}

  function addButton(){ensureStyle();const title=document.querySelector('#summary .head');if(!title||document.getElementById('tmMonthlyReportBtn'))return;const box=title.lastElementChild;if(!box)return;const b=document.createElement('button');b.id='tmMonthlyReportBtn';b.type='button';b.textContent='📊 Generar reporte mensual';b.onclick=openReport;box.appendChild(document.createElement('br'));box.appendChild(b)}

  function reportHtml(){const m=metrics();const details=m.rr.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));return `
    <div class="tm-report-grid">
      <div class="tm-report-kpi"><small>Ingresos registrados</small><b>${m.rr.length}</b></div>
      <div class="tm-report-kpi"><small>Cash collected</small><b>${fmt(m.gross)}</b></div>
      <div class="tm-report-kpi"><small>Fees cobrados</small><b>${fmt(m.fees)}</b></div>
      <div class="tm-report-kpi"><small>Neto</small><b>${fmt(m.net)}</b></div>
      <div class="tm-report-kpi"><small>Depósitos en proceso</small><b>${fmt(m.processing)}</b></div>
      <div class="tm-report-kpi"><small>Cartera pendiente</small><b>${fmt(m.pending)}</b></div>
      <div class="tm-report-kpi"><small>Fondos por confirmar</small><b>${m.fundsPending.length}</b></div>
      <div class="tm-report-kpi"><small>Down Payment registrado</small><b>${fmt(m.dpTotal)}</b></div>
      <div class="tm-report-kpi"><small>DP pendientes revisión</small><b>${m.reviewPending.length}</b></div>
      <div class="tm-report-kpi"><small>Carrier pagado en el mes</small><b>${fmt(m.carrierPaid)}</b></div>
      <div class="tm-report-kpi"><small>Diferidos programados</small><b>${fmt(m.deferredTotal)}</b></div>
      <div class="tm-report-kpi"><small>Mes</small><b>${esc(label())}</b></div>
    </div>
    <div class="tm-report-two">
      <div class="tm-report-card"><h3>Métodos de pago</h3>${m.methods.length?m.methods.map(([k,v])=>`<div class="tm-report-row"><span>${esc(k)}</span><b>${fmt(v)}</b></div>`).join(''):'<div>Sin datos.</div>'}</div>
      <div class="tm-report-card"><h3>Fees por Producer</h3>${m.producers.length?m.producers.map(([k,v])=>`<div class="tm-report-row"><span>${esc(k)}</span><b>${fmt(v)}</b></div>`).join(''):'<div>Sin datos.</div>'}</div>
    </div>
    <div class="tm-report-table"><h3>Detalle de ingresos</h3><table><thead><tr><th>Fecha</th><th>Empresa / Cliente</th><th>Invoice</th><th>Producer</th><th>Método</th><th>Pago</th><th>Fee</th><th>Neto</th><th>Fondos</th><th>Carrier/PFA</th></tr></thead><tbody>${details.length?details.map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(company(r))}</td><td>${esc(r.invoice||'')}</td><td>${esc(r.producer||'')}</td><td>${esc(r.method||'')}</td><td>${fmt(r.gross)}</td><td>${fmt(r.agencyFee)}</td><td>${fmt(r.net)}</td><td>${esc(r.fundsStatus||'Histórico')}</td><td>${esc(r.carrierStatus||'—')}</td></tr>`).join(''):'<tr><td colspan="10">Sin ingresos en este mes.</td></tr>'}</tbody></table></div>`}

  function openReport(){document.querySelector('.tm-report-overlay')?.remove();const o=document.createElement('div');o.className='tm-report-overlay';o.innerHTML=`<div class="tm-report-modal"><div class="tm-report-head"><div><h2>Reporte mensual · ${esc(label())}</h2><div class="sub">Resumen financiero y operativo del período seleccionado.</div></div></div><div class="tm-report-body">${reportHtml()}</div><div class="tm-report-foot"><button class="tm-report-close">Cerrar</button><button class="tm-report-print">🖨 Imprimir / Guardar PDF</button></div></div>`;document.body.appendChild(o);o.querySelector('.tm-report-close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});o.querySelector('.tm-report-print').onclick=()=>printReport()}

  function printReport(){const w=window.open('','_blank');if(!w)return;w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>TrueMate Reporte ${esc(label())}</title><style>body{font-family:Arial,sans-serif;color:#20324d;padding:28px}h1,h2,h3{color:#173f69}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.k{border:1px solid #d9e3ee;border-radius:10px;padding:12px}.k small{display:block;color:#6d7d92;font-weight:700;text-transform:uppercase}.k b{font-size:18px;color:#173f69}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:14px}th{background:#edf4fb;text-align:left;padding:8px}td{padding:8px;border-bottom:1px solid #e9eef4}.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eef3f7}.two{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}@media print{body{padding:0}}</style></head><body><h1>TrueMate Income Center · Trucking</h1><h2>Reporte mensual · ${esc(label())}</h2>${reportHtml().replace(/class="tm-report-grid"/g,'class="grid"').replace(/class="tm-report-kpi"/g,'class="k"').replace(/class="tm-report-two"/g,'class="two"').replace(/class="tm-report-row"/g,'class="row"').replace(/class="tm-report-card"/g,'').replace(/class="tm-report-table"/g,'')}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}

  window.tmOpenMonthlyReport=openReport;
  document.getElementById('mo')?.addEventListener('change',addButton);document.getElementById('yr')?.addEventListener('change',addButton);
  setInterval(addButton,1200);setTimeout(addButton,300);
})();