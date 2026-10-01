(() => {
  if (window.__tmFinalOpsFixesLoaded) return;
  window.__tmFinalOpsFixesLoaded = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => typeof money==='function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const today = () => new Date().toISOString().slice(0,10);

  function ensureStyle(){
    if($('tm-final-ops-style')) return;
    const s=document.createElement('style');
    s.id='tm-final-ops-style';
    s.textContent=`
      .tm-carrier-row{cursor:pointer}.tm-carrier-row:hover{background:#f7fbff}
      .tm-open-carrier{border:0;background:#edf4fb;color:#174675;border-radius:8px;padding:7px 10px;font-weight:900;cursor:pointer}
      .tm-paid-date{display:none}.tm-paid-date.on{display:block}
      .tm-carrier-status{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:900}
      .tm-carrier-status.paid{background:#e6f7ee;color:#16754c}
      .tm-carrier-status.pending{background:#fff3d4;color:#956d0a}
      .tm-carrier-status.incomplete{background:#fff0d9;color:#946515}
    `;
    document.head.appendChild(s);
  }

  function toast(msg){
    let x=$('tm-carrier-toast');
    if(!x){x=document.createElement('div');x.id='tm-carrier-toast';x.style.cssText='position:fixed;right:22px;top:58px;z-index:99999;background:#173f69;color:#fff;padding:12px 16px;border-radius:12px;font-weight:800;box-shadow:0 12px 28px rgba(0,0,0,.20)';document.body.appendChild(x)}
    x.textContent=msg;x.style.display='block';clearTimeout(x._t);x._t=setTimeout(()=>x.style.display='none',2600);
  }

  function persist(){
    localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));
    localStorage.setItem('tmic_t',JSON.stringify(S.t||[]));
    localStorage.setItem('tmic_p',JSON.stringify(S.p||[]));
    localStorage.setItem('tmic_c',JSON.stringify(S.c||[]));
  }

  function dedupeDeleteButtons(){
    ['incomeBody','recent'].forEach(id=>{
      const body=$(id); if(!body) return;
      [...body.querySelectorAll('tr')].forEach(tr=>{
        const dels=[...tr.querySelectorAll('button')].filter(b=>(b.textContent||'').trim().toLowerCase()==='eliminar');
        dels.slice(1).forEach(b=>b.remove());
        if(dels[0]) dels[0].classList.add('tm-delete');
      });
    });
  }

  function popup(title,body,footer=''){
    document.querySelector('.tm-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-overlay';
    o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div>${footer?`<div class="tm-pop-f">${footer}</div>`:''}</div>`;
    o.querySelector('.tm-close').onclick=()=>o.remove();
    o.addEventListener('click',e=>{if(e.target===o)o.remove()});
    document.body.appendChild(o);return o;
  }

  window.tmEditCarrierObligation=function(id){
    const r=(S.r||[]).find(x=>String(x.id)===String(id));
    if(!r) return alert('No encontré este pendiente.');
    const options='<option value="">Seleccionar…</option>'+(S.c||[]).map(c=>`<option value="${esc(c)}" ${c===r.carrier?'selected':''}>${esc(c)}</option>`).join('');
    const status=r.carrierStatus||'Pendiente de completar';
    const o=popup(`Completar Carrier / PFA · ${esc(r.invoice||'')}`,
      `<div class="tm-kpis"><div class="tm-kpi"><small>Cliente</small><b style="font-size:16px">${esc(r.client||'')}</b></div><div class="tm-kpi"><small>Invoice</small><b style="font-size:16px">${esc(r.invoice||'')}</b></div><div class="tm-kpi"><small>Down Payment</small><b>${fmt(r.downPayment||r.carrierAmt)}</b></div><div class="tm-kpi"><small>Responsable</small><b style="font-size:16px">Operaciones</b></div></div>
      <div class="tm-grid"><div class="tm-field"><label>Carrier / MGA / PFA</label><select id="tmOpCarrier">${options}</select></div><div class="tm-field"><label>Monto a pagar</label><input id="tmOpAmount" type="number" min="0" step="0.01" value="${+r.carrierAmt||+r.downPayment||0}"></div><div class="tm-field"><label>Fecha límite</label><input id="tmOpDue" type="date" value="${esc(r.carrierDue||'')}"></div><div class="tm-field"><label>Estado</label><select id="tmOpStatus"><option>Pendiente de completar</option><option>Pendiente</option><option>Pagado</option><option>No aplica</option></select></div><div class="tm-field tm-paid-date" id="tmPaidDateWrap"><label>Fecha de pago al Carrier</label><input id="tmOpPaidDate" type="date" value="${esc(r.carrierPaidDate||'')}"></div><div class="tm-field" style="grid-column:1/-1"><label>Nota</label><textarea id="tmOpNote">${esc(r.note||'')}</textarea></div></div>`,
      `<button class="btn soft" id="tmOpCancel">Cancelar</button><button class="btn navy" id="tmOpSave">Guardar</button>`);

    const st=o.querySelector('#tmOpStatus'); st.value=status;
    const paidWrap=o.querySelector('#tmPaidDateWrap'),paid=o.querySelector('#tmOpPaidDate');
    const syncPaid=()=>{const isPaid=st.value==='Pagado';paidWrap.classList.toggle('on',isPaid);if(isPaid&&!paid.value)paid.value=today();};
    st.onchange=syncPaid; syncPaid();
    o.querySelector('#tmOpCancel').onclick=()=>o.remove();
    o.querySelector('#tmOpSave').onclick=()=>{
      const newCarrier=o.querySelector('#tmOpCarrier').value;
      const newAmt=+(o.querySelector('#tmOpAmount').value||0);
      const newDue=o.querySelector('#tmOpDue').value;
      const newNote=o.querySelector('#tmOpNote').value;
      let newStatus=st.value;
      const complete=!!newCarrier&&!!newDue;
      if(newStatus==='Pagado'&&!paid.value) return alert('Coloca la fecha de pago al Carrier.');
      if(!complete&&newStatus!=='Pagado'&&newStatus!=='No aplica') newStatus='Pendiente de completar';
      if(complete&&newStatus==='Pendiente de completar') newStatus='Pendiente';

      r.carrier=newCarrier;
      r.carrierAmt=newAmt;
      r.downPayment=r.downPayment||newAmt;
      r.carrierDue=newDue;
      r.note=newNote;
      r.carrierStatus=newStatus;
      r.carrierPaidDate=newStatus==='Pagado'?paid.value:'';
      r.carrierNeedsCompletion=!complete&&newStatus!=='Pagado'&&newStatus!=='No aplica';

      try{persist();}
      catch(e){console.error('Error persistiendo Carrier/PFA',e);return alert('No se pudo guardar el Carrier/PFA.');}

      o.remove();
      toast(newStatus==='Pagado'?'Pago al Carrier guardado correctamente.':'Carrier/PFA actualizado correctamente.');
      setTimeout(()=>{try{render();}catch(e){console.warn('Render posterior al guardado',e)}},20);
    };
  };

  function daysLabel(due){
    if(!due)return ['—','tm-days-ok'];
    const d=new Date(due+'T12:00:00'),now=new Date(),td=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
    const diff=Math.ceil((d-td)/86400000);
    if(diff<0)return ['Vencido','tm-days-danger']; if(diff===0)return ['Hoy','tm-days-danger']; if(diff<=3)return [`${diff} día${diff===1?'':'s'}`,'tm-days-danger']; if(diff<=7)return [`${diff} días`,'tm-days-warn']; return [`${diff} días`,'tm-days-ok'];
  }
  function fmtDate(v){if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'});}

  function renderUpcomingCarrier(){
    const grid=document.querySelector('#summary .grid2'); if(!grid||grid.children.length<2)return;
    const card=grid.children[1];
    const rows=(S.r||[]).filter(r=>(+r.carrierAmt||+r.downPayment||0)>0&&r.carrierDue&&String(r.carrierStatus||'').toLowerCase()!=='pagado').slice().sort((a,b)=>String(a.carrierDue||'').localeCompare(String(b.carrierDue||''))).slice(0,5);
    card.innerHTML=`<div class="head"><div><h3>Próximos pagos a Carrier / MGA / PFA</h3></div><button class="btn soft" type="button" onclick="go('carrier')">Ver todos los pagos →</button></div><div class="tablewrap"><table><thead><tr><th>Carrier / MGA / PFA</th><th>Cliente</th><th>Invoice</th><th>Monto a pagar</th><th>Fecha límite</th><th>Días restantes</th><th>Acción</th></tr></thead><tbody>${rows.length?rows.map(r=>{const [txt,cls]=daysLabel(r.carrierDue);return `<tr class="tm-carrier-row" onclick="tmEditCarrierObligation('${r.id}')"><td><b>${esc(r.carrier||'Pendiente de completar')}</b></td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td><b>${fmt(r.carrierAmt||r.downPayment)}</b></td><td>${fmtDate(r.carrierDue)}</td><td><span class="tm-days ${cls}">${txt}</span></td><td><button class="tm-open-carrier" onclick="event.stopPropagation();tmEditCarrierObligation('${r.id}')">Abrir</button></td></tr>`}).join(''):'<tr><td colspan="7">Sin pagos pendientes a Carrier / MGA / PFA.</td></tr>'}</tbody></table></div>`;
  }

  function statusBadge(r){
    const s=String(r.carrierStatus||'Pendiente de completar');
    const c=s==='Pagado'?'paid':s==='Pendiente de completar'?'incomplete':'pending';
    return `<span class="tm-carrier-status ${c}">${esc(s)}</span>`;
  }

  function enhanceCarrierTable(){
    const body=$('carBody'); if(!body)return;
    const table=body.closest('table'),hr=table?.querySelector('thead tr');
    if(hr) hr.innerHTML='<th>Cliente</th><th>Invoice</th><th>Carrier/PFA</th><th>Monto</th><th>Fecha límite</th><th>Estado</th><th>Fecha pago</th><th>Acción</th>';
    const rows=(S.r||[]).filter(r=>(+r.carrierAmt||+r.downPayment)>0);
    body.innerHTML=rows.map(r=>`<tr><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td>${esc(r.carrier||'—')}</td><td><b>${fmt(r.carrierAmt||r.downPayment)}</b></td><td>${fmtDate(r.carrierDue)}</td><td>${statusBadge(r)}</td><td>${fmtDate(r.carrierPaidDate)}</td><td><button class="btn soft" onclick="tmEditCarrierObligation('${r.id}')">${r.carrier&&r.carrierDue?'Editar':'Completar'}</button></td></tr>`).join('')||'<tr><td colspan="8">Sin obligaciones</td></tr>';
  }

  function apply(){ensureStyle();dedupeDeleteButtons();renderUpcomingCarrier();enhanceCarrierTable();}
  const oldRender=window.render;
  if(typeof oldRender==='function') window.render=function(){oldRender();setTimeout(apply,180);};
  const obs=new MutationObserver(()=>setTimeout(dedupeDeleteButtons,20));
  setTimeout(()=>{['incomeBody','recent'].forEach(id=>{const e=$(id);if(e)obs.observe(e,{childList:true,subtree:true});});apply();},300);
})();