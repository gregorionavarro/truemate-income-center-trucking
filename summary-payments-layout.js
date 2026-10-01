(() => {
  if (window.__tmSummaryPaymentsLayoutLoaded) return;
  window.__tmSummaryPaymentsLayoutLoaded = true;

  const $ = id => document.getElementById(id);
  const fmtMoney = v => typeof money === 'function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

  function ensureStyle(){
    if ($('tm-summary-payments-style')) return;
    const s=document.createElement('style');
    s.id='tm-summary-payments-style';
    s.textContent=`
      #summary .grid2{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)!important;gap:18px!important;margin-top:18px!important}
      #summary .grid2>.card{width:auto!important;margin-top:0!important;padding:16px!important;min-width:0}
      #summary .grid2>.card .head{align-items:center!important;margin-bottom:14px!important}
      #summary .grid2>.card .head h3{font-size:18px!important;margin:0!important;color:#1f416a!important}
      #summary .grid2>.card .head .sub{display:none!important}
      #summary .grid2>.card .btn.soft{border-radius:999px!important;padding:9px 14px!important;font-size:12px!important;font-weight:900!important}
      #summary .grid2 .tablewrap{overflow:auto!important}
      #summary .grid2 table{width:100%!important;min-width:650px!important;font-size:13px!important}
      #summary .grid2>.card:nth-child(2) table{min-width:760px!important}
      #summary .grid2 th{font-size:10px!important;padding:10px!important}
      #summary .grid2 td{padding:11px 10px!important}
      .tm-days{display:inline-flex;align-items:center;justify-content:center;min-width:62px;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:900}
      .tm-days-danger{background:#ffe3e7;color:#a92439}.tm-days-warn{background:#fff0c8;color:#936100}.tm-days-ok{background:#e8f3fd;color:#245d8c}.tm-days-setup{background:#fff0c8;color:#8c6810}
      .tm-carrier-pay-row{cursor:pointer;transition:.15s}.tm-carrier-pay-row:hover{background:#f7fbff}.tm-carrier-pay-row td:first-child{font-weight:900;color:#173f69}
      .tm-open-pay{border:0;background:#edf4fb;color:#174675;border-radius:8px;padding:7px 10px;font-weight:900;cursor:pointer}
      .tm-open-pay.setup{background:#fff3d4;color:#8c6810}
      @media(max-width:1050px){#summary .grid2{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(s);
  }

  function formatDate(v){
    if(!v) return '—';
    const d=new Date(v+'T12:00:00');
    if(Number.isNaN(d.getTime())) return esc(v);
    return d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'});
  }

  function daysLabel(due){
    if(!due)return{text:'Completar',cls:'tm-days-setup'};
    const d=new Date(due+'T12:00:00'); if(Number.isNaN(d.getTime()))return{text:'—',cls:'tm-days-ok'};
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12),diff=Math.ceil((d-today)/86400000);
    if(diff<0)return{text:'Vencido',cls:'tm-days-danger'};
    if(diff===0)return{text:'Hoy',cls:'tm-days-danger'};
    if(diff<=3)return{text:`${diff} día${diff===1?'':'s'}`,cls:'tm-days-danger'};
    if(diff<=7)return{text:`${diff} días`,cls:'tm-days-warn'};
    return{text:`${diff} días`,cls:'tm-days-ok'};
  }

  function openPayment(id){
    if(typeof window.tmEditCarrierObligation==='function') return window.tmEditCarrierObligation(id);
    if(typeof window.go==='function') return window.go('carrier');
  }
  window.tmOpenUpcomingCarrierPayment=openPayment;

  function buildCarrierCard(){
    const grid=document.querySelector('#summary .grid2'); if(!grid||grid.children.length<2)return;
    const card=grid.children[1];
    const rows=(Array.isArray(window.S?.r)?S.r:[])
      .filter(r=>(+r.carrierAmt||+r.downPayment||0)>0&&String(r.carrierStatus||'').toLowerCase()!=='pagado')
      .slice().sort((a,b)=>{
        const ai=!(a.carrier&&a.carrierDue),bi=!(b.carrier&&b.carrierDue);
        if(ai!==bi)return ai?-1:1;
        return String(a.carrierDue||'9999-12-31').localeCompare(String(b.carrierDue||'9999-12-31'));
      }).slice(0,6);
    card.innerHTML=`<div class="head"><div><h3>Próximos pagos a Carrier / MGA / PFA</h3></div><button class="btn soft" type="button" onclick="go('carrier')">Ver todos los pagos →</button></div>
      <div class="tablewrap"><table><thead><tr><th>Carrier / MGA / PFA</th><th>Cliente</th><th>Invoice</th><th>Monto a pagar</th><th>Fecha límite</th><th>Estado</th><th>Acción</th></tr></thead>
      <tbody>${rows.length?rows.map(r=>{const incomplete=!(r.carrier&&r.carrierDue);const dl=daysLabel(r.carrierDue);return `<tr class="tm-carrier-pay-row" onclick="tmOpenUpcomingCarrierPayment('${r.id}')" title="${incomplete?'Completar Carrier/PFA':'Abrir pago'}"><td>${esc(r.carrier||'Pendiente de completar')}</td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td><b>${fmtMoney(r.carrierAmt||r.downPayment)}</b></td><td>${formatDate(r.carrierDue)}</td><td><span class="tm-days ${dl.cls}">${dl.text}</span></td><td><button class="tm-open-pay ${incomplete?'setup':''}" onclick="event.stopPropagation();tmOpenUpcomingCarrierPayment('${r.id}')">${incomplete?'Completar':'Abrir'}</button></td></tr>`}).join(''):'<tr><td colspan="7" style="color:#6d7d92">Sin obligaciones pendientes a Carrier / MGA / PFA.</td></tr>'}</tbody></table></div>`;
  }

  function apply(){ensureStyle();buildCarrierCard();}
  window.tmRefreshSummaryPayments=apply;
  const originalRender=window.render;if(typeof originalRender==='function')window.render=function(){originalRender();setTimeout(apply,0)};
  setTimeout(apply,0);
})();