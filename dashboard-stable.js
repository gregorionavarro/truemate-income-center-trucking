(() => {
  if (window.__tmDashboardStableLoaded) return;
  window.__tmDashboardStableLoaded = true;

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => typeof money==='function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const fmtDate = v => {
    if(!v) return '—';
    const d=new Date(v+'T12:00:00');
    return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'});
  };

  function addStyle(){
    if(document.getElementById('tm-dashboard-stable-style')) return;
    const s=document.createElement('style');
    s.id='tm-dashboard-stable-style';
    s.textContent=`
      #summary .grid2{display:block!important;margin-top:18px!important}
      #summary .grid2>.card{width:100%!important;margin:0!important;padding:16px!important;min-width:0!important}
      #summary .grid2>.card+.card{margin-top:16px!important}
      #summary .grid2 .tablewrap{overflow-x:auto!important}
      #summary .grid2 table{width:100%!important;min-width:1080px!important;table-layout:auto!important}
      #summary .grid2>.card:nth-child(2) table{min-width:900px!important}
      #summary .grid2 th{font-size:10px!important;padding:10px!important}
      #summary .grid2 td{font-size:13px!important;padding:11px 10px!important}
      #summary .tm-filters,#summary .tm-recent-sort,#tmRecentExpand{display:none!important}
      #settings .analytics{display:grid!important;grid-template-columns:1fr 1fr!important;gap:18px!important;margin-top:18px!important}
      #settings .card{display:block!important;min-height:150px}
      .tm-settings-help{font-size:12px;color:#6d7d92;margin:4px 0 12px}
      .tm-settings-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .tm-settings-input{border:1px solid #d9e3ee;border-radius:10px;padding:10px 12px;min-width:220px;color:#20324d}
      .tm-stable-action{border:0;background:#edf4fb;color:#174675;border-radius:8px;padding:7px 10px;font-weight:900;cursor:pointer}
      .tm-stable-action.setup{background:#fff3d4;color:#8c6810}
      @media(max-width:900px){#settings .analytics{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(s);
  }

  function depBadge(r){
    return String(r.depStatus||'').toLowerCase()==='depositado'
      ? '<span class="badge ok">Depositado</span>'
      : '<span class="badge proc">En proceso</span>';
  }

  function renderRecentStable(){
    const body=document.getElementById('recent');
    if(!body) return;
    const card=body.closest('.card');
    const table=body.closest('table');
    if(!card||!table) return;

    card.querySelectorAll('.tm-filters,.tm-recent-sort').forEach(x=>x.remove());
    const head=card.querySelector('.head');
    if(head){
      const h3=head.querySelector('h3'); if(h3) h3.textContent='Movimientos recientes';
      const sub=head.querySelector('.sub'); if(sub) sub.textContent='Últimos cobros procesados.';
      const btn=head.querySelector('.btn.soft'); if(btn){btn.textContent='Ver todos →';btn.onclick=()=>go('income');}
    }

    const hr=table.querySelector('thead tr');
    if(hr) hr.innerHTML='<th>Fecha pago</th><th>Cliente</th><th>Invoice</th><th>Producer</th><th>Método</th><th>Pagó cliente</th><th>Fee</th><th>Neto</th><th>Depósito</th><th>Acción</th>';

    const rows=(S.r||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,5);
    body.innerHTML=rows.map(r=>`<tr>
      <td>${fmtDate(r.date)}</td>
      <td>${esc(r.client||'')}</td>
      <td><button class="tm-link" onclick="tmInvoiceDetail('${String(r.invoice||'').replace(/'/g,"\\'")}')">${esc(r.invoice||'')}</button></td>
      <td>${esc(r.producer||'')}</td>
      <td>${esc(r.method||'')}</td>
      <td>${fmt(r.gross)}</td>
      <td>${fmt(r.agencyFee)}</td>
      <td><b>${fmt(r.net)}</b></td>
      <td>${depBadge(r)}</td>
      <td><div class="tm-actions"><button class="btn soft" onclick="openModal('${r.id}')">Editar</button>${typeof deleteIncome==='function'?`<button class="btn danger" onclick="deleteIncome('${r.id}')">Eliminar</button>`:''}</div></td>
    </tr>`).join('') || '<tr><td colspan="10">Sin movimientos.</td></tr>';
  }

  function dayInfo(due){
    if(!due) return ['Completar','tm-days-warn'];
    const d=new Date(due+'T12:00:00');
    if(Number.isNaN(d.getTime())) return ['—','tm-days-ok'];
    const n=new Date(), t=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12);
    const diff=Math.ceil((d-t)/86400000);
    if(diff<0) return ['Vencido','tm-days-danger'];
    if(diff===0) return ['Hoy','tm-days-danger'];
    if(diff<=3) return [`${diff} día${diff===1?'':'s'}`,'tm-days-danger'];
    if(diff<=7) return [`${diff} días`,'tm-days-warn'];
    return [`${diff} días`,'tm-days-ok'];
  }

  function openCarrier(id){
    if(typeof window.tmEditCarrierObligation==='function') return window.tmEditCarrierObligation(id);
    if(typeof window.go==='function') return window.go('carrier');
  }
  window.tmStableOpenCarrier=openCarrier;

  function renderCarrierStable(){
    const grid=document.querySelector('#summary .grid2');
    if(!grid || grid.children.length<2) return;
    const card=grid.children[1];
    const rows=(S.r||[])
      .filter(r=>(+r.carrierAmt||+r.downPayment||0)>0 && String(r.carrierStatus||'').toLowerCase()!=='pagado')
      .slice().sort((a,b)=>{
        const ai=!(a.carrier&&a.carrierDue), bi=!(b.carrier&&b.carrierDue);
        if(ai!==bi) return ai?-1:1;
        return String(a.carrierDue||'9999-12-31').localeCompare(String(b.carrierDue||'9999-12-31'));
      }).slice(0,6);

    card.innerHTML=`<div class="head"><div><h3>Próximos pagos a Carrier / MGA / PFA</h3><div class="sub">Incluye pendientes de meses anteriores hasta que se completen o paguen.</div></div><button class="btn soft" type="button" onclick="go('carrier')">Ver todos los pagos →</button></div>
      <div class="tablewrap"><table><thead><tr><th>Carrier / MGA / PFA</th><th>Cliente</th><th>Invoice</th><th>Monto a pagar</th><th>Fecha límite</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
      ${rows.length?rows.map(r=>{const incomplete=!(r.carrier&&r.carrierDue);const [txt,cls]=dayInfo(r.carrierDue);return `<tr style="cursor:pointer" onclick="tmStableOpenCarrier('${r.id}')"><td><b>${esc(r.carrier||'Pendiente de completar')}</b></td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td><b>${fmt(r.carrierAmt||r.downPayment)}</b></td><td>${fmtDate(r.carrierDue)}</td><td><span class="tm-days ${cls}">${txt}</span></td><td><button class="tm-stable-action ${incomplete?'setup':''}" onclick="event.stopPropagation();tmStableOpenCarrier('${r.id}')">${incomplete?'Completar':'Abrir'}</button></td></tr>`}).join(''):'<tr><td colspan="7" style="color:#6d7d92">Sin obligaciones pendientes a Carrier / MGA / PFA.</td></tr>'}
      </tbody></table></div>`;
  }

  window.tmSettingsAddProducer=function(){
    const el=document.getElementById('tmStableNewProd'); const x=(el?.value||'').trim();
    if(!x) return; if((S.p||[]).includes(x)) return alert('Ese Producer ya existe.');
    S.p.push(x); el.value=''; store(); render();
  };
  window.tmSettingsAddCarrier=function(){
    const el=document.getElementById('tmStableNewCar'); const x=(el?.value||'').trim();
    if(!x) return; if((S.c||[]).includes(x)) return alert('Ese Carrier/MGA/PFA ya existe.');
    S.c.push(x); el.value=''; store(); render();
  };
  window.tmSettingsRemoveProducer=function(x){
    if((S.r||[]).some(r=>r.producer===x)) return alert('Hay ingresos usando este Producer. No se puede eliminar.');
    S.p=S.p.filter(y=>y!==x); store(); render();
  };
  window.tmSettingsRemoveCarrier=function(x){
    if((S.r||[]).some(r=>r.carrier===x)) return alert('Hay ingresos usando este Carrier/MGA/PFA. No se puede eliminar.');
    S.c=S.c.filter(y=>y!==x); store(); render();
  };

  function renderSettingsStable(){
    const view=document.getElementById('settings');
    if(!view) return;
    const panel=view.querySelector('.panel');
    if(!panel) return;
    let analytics=panel.querySelector('.analytics');
    if(!analytics){analytics=document.createElement('div');analytics.className='analytics';panel.appendChild(analytics);}
    analytics.innerHTML=`
      <div class="card box"><h3>Producers</h3><div class="tm-settings-help">Personas que registran o generan fees.</div><div class="chips">${(S.p||[]).map(x=>`<span class="chip">${esc(x)}<span class="x" onclick="tmSettingsRemoveProducer('${String(x).replace(/'/g,"\\'")}')">×</span></span>`).join('')||'<span class="sub">No hay Producers configurados.</span>'}</div><div class="tm-settings-row" style="margin-top:14px"><input id="tmStableNewProd" class="tm-settings-input" placeholder="Nombre del Producer"><button class="btn navy" onclick="tmSettingsAddProducer()">Agregar Producer</button></div></div>
      <div class="card box"><h3>Carrier / MGA / PFA</h3><div class="tm-settings-help">Catálogo utilizado al registrar obligaciones y próximos pagos.</div><div class="chips">${(S.c||[]).map(x=>`<span class="chip">${esc(x)}<span class="x" onclick="tmSettingsRemoveCarrier('${String(x).replace(/'/g,"\\'")}')">×</span></span>`).join('')||'<span class="sub">No hay Carrier/MGA/PFA configurados.</span>'}</div><div class="tm-settings-row" style="margin-top:14px"><input id="tmStableNewCar" class="tm-settings-input" placeholder="Nombre Carrier / MGA / PFA"><button class="btn navy" onclick="tmSettingsAddCarrier()">Agregar Carrier</button></div></div>`;
  }

  function apply(){
    try{addStyle();renderRecentStable();renderCarrierStable();renderSettingsStable();}catch(e){console.error('TrueMate stable dashboard fix',e)}
  }

  window.tmRefreshStableDashboard=apply;
  const prior=window.render;
  if(typeof prior==='function'){
    window.render=function(){prior();setTimeout(apply,60)};
  }
  setTimeout(apply,200);
})();
