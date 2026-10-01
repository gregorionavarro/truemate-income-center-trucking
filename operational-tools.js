(() => {
  if (window.__tmOperationalToolsLoaded) return;
  window.__tmOperationalToolsLoaded = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => typeof money === 'function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const today = () => new Date().toISOString().slice(0,10);
  const daysTo = d => { if(!d) return 999; return Math.ceil((new Date(d+'T12:00:00')-new Date())/864e5); };
  const uid2 = () => 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

  function style(){
    if ($('tm-op-style')) return;
    const s=document.createElement('style'); s.id='tm-op-style';
    s.textContent=`
      .tm-filters{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px;padding:12px;margin:0 0 14px;background:#f7faff;border:1px solid #dbe6f1;border-radius:13px}
      .tm-filter label{display:block;font-size:10px;font-weight:900;text-transform:uppercase;color:#6a7f96;margin-bottom:5px}.tm-filter select,.tm-filter input{width:100%;border:1px solid #d9e3ee;border-radius:9px;padding:9px;background:#fff;color:#20324d}
      .tm-link{border:0;background:transparent;color:#195b93;font-weight:800;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px}.tm-mini{border:0;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer;background:#edf4fb;color:#174675}.tm-mini.green{background:#e8f7ef;color:#19724d}.tm-mini.amber{background:#fff4d8;color:#8c6810}.tm-mini.red{background:#ffe9ed;color:#a72f43}.tm-actions{display:flex;gap:6px;flex-wrap:wrap}
      .tm-clickcard{cursor:pointer;transition:.15s}.tm-clickcard:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(20,55,90,.10)}
      .tm-overlay{position:fixed;inset:0;background:rgba(14,31,49,.55);z-index:5000;display:flex;align-items:flex-start;justify-content:center;padding:35px 14px;overflow:auto}.tm-pop{width:min(980px,100%);background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.25);overflow:hidden}.tm-pop-h{display:flex;justify-content:space-between;align-items:center;padding:17px 20px;border-bottom:1px solid #dde6ef}.tm-pop-h h3{margin:0;color:#173f69}.tm-pop-b{padding:20px}.tm-pop-f{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #dde6ef}.tm-close{font-size:25px;border:0;background:none;cursor:pointer;color:#5f7288}.tm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.tm-field label{display:block;font-size:11px;font-weight:800;color:#5d7189;margin-bottom:5px}.tm-field input,.tm-field select,.tm-field textarea{width:100%;border:1px solid #d9e3ee;border-radius:9px;padding:10px}.tm-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.tm-kpi{border:1px solid #dde6ef;border-radius:12px;padding:12px}.tm-kpi small{display:block;text-transform:uppercase;font-weight:900;color:#70859b;font-size:10px}.tm-kpi b{display:block;font-size:20px;color:#173f69;margin-top:5px}.tm-status{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:800}.tm-status.paid{background:#e8f7ef;color:#19724d}.tm-status.pending{background:#fff4d8;color:#8c6810}.tm-status.late{background:#ffe9ed;color:#a72f43}.tm-status.partial{background:#edf4fb;color:#245887}
      #yearCards .card{cursor:pointer}.tm-note{font-size:12px;color:#6d7d92;margin-top:6px}
      @media(max-width:900px){.tm-filters,.tm-grid,.tm-kpis{grid-template-columns:1fr 1fr}}@media(max-width:600px){.tm-filters,.tm-grid,.tm-kpis{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }

  function popup(title,body,footer=''){
    document.querySelector('.tm-overlay')?.remove();
    const o=document.createElement('div'); o.className='tm-overlay';
    o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div>${footer?`<div class="tm-pop-f">${footer}</div>`:''}</div>`;
    o.querySelector('.tm-close').onclick=()=>o.remove(); o.addEventListener('click',e=>{if(e.target===o)o.remove()}); document.body.appendChild(o); return o;
  }

  function invoiceRecords(invoice){ return S.r.filter(r => r.invoice === invoice).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')); }
  function invoiceTotals(invoice){
    const rows=invoiceRecords(invoice); const paid=rows.reduce((a,r)=>a+(+r.gross||0),0); const fees=rows.reduce((a,r)=>a+(+r.agencyFee||0),0); const proc=rows.reduce((a,r)=>a+(+r.procFee||0),0);
    const base=rows[0]||{}; const pending=Math.max(0,+base.pending||0); return {rows,paid,fees,proc,pending,base};
  }

  window.tmInvoiceDetail=function(invoice){
    const x=invoiceTotals(invoice); const b=x.base;
    const body=`<div class="tm-kpis"><div class="tm-kpi"><small>Total recibido</small><b>${fmt(x.paid)}</b></div><div class="tm-kpi"><small>Fees</small><b>${fmt(x.fees)}</b></div><div class="tm-kpi"><small>Saldo pendiente</small><b>${fmt(x.pending)}</b></div><div class="tm-kpi"><small>Pagos registrados</small><b>${x.rows.length}</b></div></div>
    <div class="tm-note"><b>${esc(b.client||'')}</b> · ${esc(b.company||'')} · Invoice ${esc(invoice)}</div><div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Fecha</th><th>Método</th><th>Producer</th><th>Pago</th><th>Fee</th><th>Neto</th><th>Depósito</th></tr></thead><tbody>${x.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.method)}</td><td>${esc(r.producer)}</td><td>${fmt(r.gross)}</td><td>${fmt(r.agencyFee)}</td><td>${fmt(r.net)}</td><td>${esc(r.depStatus)}</td></tr>`).join('')}</tbody></table></div>`;
    popup(`Invoice · ${esc(invoice)}`,body);
  };

  function statusFor(r){
    const rem=+r.pending||0; if(rem<=0)return ['Pagado','paid']; if(r.defDate&&daysTo(r.defDate)<0)return ['Vencido','late']; if(invoiceRecords(r.invoice).length>1)return ['Parcial','partial']; return ['Pendiente','pending'];
  }

  window.tmRegisterDeferredPayment=function(id){
    const r=S.r.find(x=>x.id===id); if(!r)return alert('No encontré el registro.');
    const remaining=+r.pending||0; if(remaining<=0)return alert('Esta factura ya no tiene saldo pendiente.');
    const o=popup(`Registrar pago · ${esc(r.invoice)}`,`<div class="tm-kpis"><div class="tm-kpi"><small>Cliente</small><b style="font-size:16px">${esc(r.client)}</b></div><div class="tm-kpi"><small>Saldo actual</small><b>${fmt(remaining)}</b></div><div class="tm-kpi"><small>Invoice</small><b style="font-size:16px">${esc(r.invoice)}</b></div><div class="tm-kpi"><small>Producer</small><b style="font-size:16px">${esc(r.producer)}</b></div></div><div class="tm-grid"><div class="tm-field"><label>Fecha del pago</label><input id="tmPayDate" type="date" value="${today()}"></div><div class="tm-field"><label>Monto recibido</label><input id="tmPayAmount" type="number" min="0.01" step="0.01" value="${remaining.toFixed(2)}"></div><div class="tm-field"><label>Método</label><select id="tmPayMethod"><option>Stripe</option><option>Zelle</option><option>Wire</option><option>ACH</option><option>Check</option></select></div><div class="tm-field"><label>Fee cobrado al cliente</label><input id="tmPayAgencyFee" type="number" min="0" step="0.01" value="0"></div><div class="tm-field"><label>Fee procesador</label><input id="tmPayProcFee" type="number" min="0" step="0.01" value="0"></div><div class="tm-field"><label>Próxima fecha (si queda saldo)</label><input id="tmNextDate" type="date"></div></div><div class="tm-note">El pago quedará como un nuevo movimiento de la misma invoice y reducirá automáticamente el saldo pendiente.</div>`,`<button class="btn soft" id="tmCancelPay">Cancelar</button><button class="btn navy" id="tmConfirmPay">Registrar pago</button>`);
    const method=o.querySelector('#tmPayMethod'), amount=o.querySelector('#tmPayAmount'), pf=o.querySelector('#tmPayProcFee');
    const calc=()=>{const a=+amount.value||0;pf.value=(method.value==='Stripe'?(a*.029+.30):0).toFixed(2)}; method.onchange=calc; amount.oninput=calc; calc();
    o.querySelector('#tmCancelPay').onclick=()=>o.remove();
    o.querySelector('#tmConfirmPay').onclick=()=>{
      const amt=+amount.value||0; if(amt<=0)return alert('Ingresa un monto válido.'); if(amt>remaining+0.009)return alert('El pago no puede superar el saldo pendiente.');
      const procFee=+pf.value||0, agencyFee=+(o.querySelector('#tmPayAgencyFee').value||0), next=Math.max(0,remaining-amt), nextDate=o.querySelector('#tmNextDate').value;
      const nr={id:uid2(),client:r.client,company:r.company,invoice:r.invoice,producer:r.producer,date:o.querySelector('#tmPayDate').value||today(),method:method.value,gross:amt,agencyFee,procFee,net:Math.max(0,amt-procFee),depStatus:method.value==='Stripe'?'En proceso':'Depositado',depDate:method.value==='Stripe'?'':(o.querySelector('#tmPayDate').value||today()),pending:0,defDate:'',defAmt:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'No aplica',note:'Pago aplicado a saldo pendiente de '+r.invoice};
      S.r.push(nr); r.pending=next; r.defAmt=next; r.defDate=next>0?nextDate:'';
      S.t=S.t.filter(t=>!(t.auto&&t.invoice===r.invoice&&String(t.title||'').startsWith('Cobrar diferido')));
      if(next>0&&nextDate)S.t.push({id:uid2(),title:'Cobrar diferido · '+r.invoice,date:nextDate,note:r.client+' · '+fmt(next),invoice:r.invoice,auto:true});
      store(); render(); o.remove(); alert(next>0?`Pago registrado. Saldo restante: ${fmt(next)}`:'Pago registrado. La factura quedó saldada.');
    };
  };

  window.tmReprogram=function(id){const r=S.r.find(x=>x.id===id);if(!r)return;const d=prompt('Nueva fecha de cobro (YYYY-MM-DD)',r.defDate||today());if(!d)return;r.defDate=d;r.defAmt=+r.pending||r.defAmt||0;S.t=S.t.filter(t=>!(t.auto&&t.invoice===r.invoice&&String(t.title||'').startsWith('Cobrar diferido')));S.t.push({id:uid2(),title:'Cobrar diferido · '+r.invoice,date:d,note:r.client+' · '+fmt(r.pending||r.defAmt),invoice:r.invoice,auto:true});store();render();};

  function enhanceDeferred(){
    const body=$('defBody'); if(!body)return; const table=body.closest('table');
    const hr=table.querySelector('thead tr'); if(hr&&!hr.querySelector('.tm-action-th')){const th=document.createElement('th');th.className='tm-action-th';th.textContent='Acción';hr.appendChild(th)}
    body.innerHTML=''; const rows=S.r.filter(r=>+r.pending>0).sort((a,b)=>(a.defDate||'9999').localeCompare(b.defDate||'9999'));
    body.innerHTML=rows.map(r=>{const st=statusFor(r);return `<tr><td>${esc(r.client)}</td><td><button class="tm-link" onclick="tmInvoiceDetail('${String(r.invoice).replace(/'/g,"\\'")}')">${esc(r.invoice)}</button></td><td>${esc(r.defDate||'—')}</td><td>${fmt(r.pending)}</td><td><span class="tm-status ${st[1]}">${st[0]}</span></td><td><div class="tm-actions"><button class="tm-mini green" onclick="tmRegisterDeferredPayment('${r.id}')">Registrar pago</button><button class="tm-mini amber" onclick="tmReprogram('${r.id}')">Reprogramar</button><button class="tm-mini" onclick="tmInvoiceDetail('${String(r.invoice).replace(/'/g,"\\'")}')">Ver factura</button></div></td></tr>`}).join('')||'<tr><td colspan="6">Sin diferidos pendientes</td></tr>';
  }

  const filter={month:'all',producer:'all',method:'all',sort:'desc'};
  function addRecentFilters(){
    const recent=$('recent'); if(!recent)return; const box=recent.closest('.card'); if(!box||box.querySelector('.tm-filters'))return;
    const wrap=box.querySelector('.tablewrap'); const f=document.createElement('div');f.className='tm-filters';f.innerHTML=`<div class="tm-filter"><label>Mes</label><select id="tmMonth"><option value="all">Todos</option></select></div><div class="tm-filter"><label>Producer</label><select id="tmProducer"><option value="all">Todos</option></select></div><div class="tm-filter"><label>Método</label><select id="tmMethod"><option value="all">Todos</option><option>Stripe</option><option>Zelle</option><option>Wire</option><option>ACH</option><option>Check</option></select></div><div class="tm-filter"><label>Ordenar por fecha</label><select id="tmSort"><option value="desc">Más reciente → más antigua</option><option value="asc">Más antigua → más reciente</option></select></div>`;wrap.parentNode.insertBefore(f,wrap);
    const months=[...new Set(S.r.map(r=>(r.date||'').slice(0,7)).filter(Boolean))].sort().reverse();$('tmMonth').innerHTML+=$.call?'' : '';
    f.querySelector('#tmMonth').innerHTML='<option value="all">Todos</option>'+months.map(k=>`<option value="${k}">${k}</option>`).join('');
    f.querySelector('#tmProducer').innerHTML='<option value="all">Todos</option>'+S.p.map(p=>`<option>${esc(p)}</option>`).join('');
    ['tmMonth','tmProducer','tmMethod','tmSort'].forEach(id=>f.querySelector('#'+id).onchange=()=>{filter.month=f.querySelector('#tmMonth').value;filter.producer=f.querySelector('#tmProducer').value;filter.method=f.querySelector('#tmMethod').value;filter.sort=f.querySelector('#tmSort').value;renderRecentFiltered()});
  }

  function renderRecentFiltered(){
    const body=$('recent'); if(!body)return; let rows=S.r.slice(); if(filter.month!=='all')rows=rows.filter(r=>(r.date||'').slice(0,7)===filter.month);if(filter.producer!=='all')rows=rows.filter(r=>r.producer===filter.producer);if(filter.method!=='all')rows=rows.filter(r=>r.method===filter.method);rows.sort((a,b)=>filter.sort==='asc'?(a.date||'').localeCompare(b.date||''):(b.date||'').localeCompare(a.date||''));rows=rows.slice(0,20);
    const table=body.closest('table'), hr=table.querySelector('thead tr');
    if(hr&&!hr.querySelector('.tm-date-th')){const th=document.createElement('th');th.className='tm-date-th';th.textContent='Fecha pago';hr.insertBefore(th,hr.firstChild)}
    body.innerHTML=rows.map(r=>`<tr><td>${esc(r.date||'—')}</td><td>${esc(r.client)}</td><td><button class="tm-link" onclick="tmInvoiceDetail('${String(r.invoice).replace(/'/g,"\\'")}')">${esc(r.invoice)}</button></td><td>${esc(r.producer)}</td><td>${esc(r.method)}</td><td>${fmt(r.gross)}</td><td>${fmt(r.agencyFee)}</td><td>${fmt(r.net)}</td><td><span class="badge ${r.depStatus==='Depositado'?'ok':'proc'}">${esc(r.depStatus)}</span></td><td><div class="tm-actions"><button class="btn soft" onclick="openModal('${r.id}')">Editar</button>${typeof deleteIncome==='function'?`<button class="btn danger" onclick="deleteIncome('${r.id}')">Eliminar</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="10">Sin registros con estos filtros</td></tr>';
  }

  function monthDetail(i){const year=+$('yr').value,k=year+'-'+String(i+1).padStart(2,'0'),rows=S.r.filter(r=>(r.date||'').slice(0,7)===k),gross=rows.reduce((a,r)=>a+(+r.gross||0),0),fees=rows.reduce((a,r)=>a+(+r.agencyFee||0),0),net=rows.reduce((a,r)=>a+(+r.net||0),0);const pa={};rows.forEach(r=>pa[r.producer]=(pa[r.producer]||0)+(+r.gross||0));const top=Object.entries(pa).sort((a,b)=>b[1]-a[1])[0];popup(`${M[i]} de ${year}`,`<div class="tm-kpis"><div class="tm-kpi"><small>Total cobrado</small><b>${fmt(gross)}</b></div><div class="tm-kpi"><small>Fees</small><b>${fmt(fees)}</b></div><div class="tm-kpi"><small>Neto</small><b>${fmt(net)}</b></div><div class="tm-kpi"><small>Operaciones</small><b>${rows.length}</b></div></div><div class="tm-note">Top Producer: <b>${esc(top?.[0]||'—')}</b></div><div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Producer</th><th>Método</th><th>Pago</th><th>Fee</th></tr></thead><tbody>${rows.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.client)}</td><td><button class="tm-link" onclick="tmInvoiceDetail('${String(r.invoice).replace(/'/g,"\\'")}')">${esc(r.invoice)}</button></td><td>${esc(r.producer)}</td><td>${esc(r.method)}</td><td>${fmt(r.gross)}</td><td>${fmt(r.agencyFee)}</td></tr>`).join('')||'<tr><td colspan="7">Sin movimientos</td></tr>'}</tbody></table></div>`)}
  function enhanceYear(){const cards=$('yearCards');if(!cards)return;[...cards.children].forEach((c,i)=>{c.classList.add('tm-clickcard');c.onclick=()=>monthDetail(i);c.title='Ver detalle del mes'})}

  function listPopup(type){let title='',rows=[];if(type==='carrier'){title='Carrier/PFA vencidos';rows=S.r.filter(r=>r.carrierStatus==='Pendiente'&&r.carrierDue&&daysTo(r.carrierDue)<0).map(r=>[r.client,r.invoice,r.carrier,r.carrierDue,fmt(r.carrierAmt)])}if(type==='def'){title='Diferidos próximos / vencidos';rows=S.r.filter(r=>+r.pending>0&&r.defDate&&daysTo(r.defDate)<=7).map(r=>[r.client,r.invoice,r.defDate,fmt(r.pending),`<button class="tm-mini green" onclick="tmRegisterDeferredPayment('${r.id}')">Registrar pago</button>`])}if(type==='dep'){title='Depósitos en proceso';rows=S.r.filter(r=>r.depStatus==='En proceso').map(r=>[r.client,r.invoice,r.date,fmt(r.net),`<button class="tm-mini green" onclick="tmMarkDeposited('${r.id}')">Marcar depositado</button>`])}if(type==='tasks'){title='Tareas abiertas';rows=S.t.map(t=>[t.title,t.invoice||'',t.date||'',t.note||'',''])}popup(title,`<div class="tablewrap"><table><tbody>${rows.map(a=>'<tr>'+a.map(x=>`<td>${x}</td>`).join('')+'</tr>').join('')||'<tr><td>No hay registros.</td></tr>'}</tbody></table></div>`)}
  window.tmMarkDeposited=function(id){const r=S.r.find(x=>x.id===id);if(!r)return;r.depStatus='Depositado';r.depDate=today();store();render();document.querySelector('.tm-overlay')?.remove();};
  function enhanceAlerts(){const map=[['lateCarrier','carrier'],['nearDef','def'],['procN','dep'],['taskN','tasks']];map.forEach(([id,t])=>{const e=$(id)?.closest('.alert');if(e&&!e.dataset.tmclick){e.dataset.tmclick='1';e.classList.add('tm-clickcard');e.onclick=()=>listPopup(t);e.title='Ver detalle'}})}

  function decorateInvoices(){['incomeBody'].forEach(id=>{const body=$(id);if(!body)return;[...body.rows].forEach(tr=>{if(tr.cells.length>3){const cell=tr.cells[3];const inv=cell.textContent.trim();if(inv&&!cell.querySelector('.tm-link'))cell.innerHTML=`<button class="tm-link">${esc(inv)}</button>`,cell.querySelector('button').onclick=()=>tmInvoiceDetail(inv)}})})}

  function enhance(){style();addRecentFilters();renderRecentFiltered();enhanceDeferred();enhanceYear();enhanceAlerts();decorateInvoices();}
  if(typeof render==='function'&&!window.__tmOperationalRenderPatch){window.__tmOperationalRenderPatch=true;const old=render;render=function(){old();setTimeout(enhance,0)}}
  setTimeout(enhance,80);
})();