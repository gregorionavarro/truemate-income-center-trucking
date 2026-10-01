(() => {
  if (window.__tmCarrierReviewFlexLoaded) return;
  window.__tmCarrierReviewFlexLoaded = true;

  const OWNER_EMAIL='gregorio.navarro@truemategroup.com';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const today=()=>new Date().toISOString().slice(0,10);
  const nowIso=()=>new Date().toISOString();
  let currentUser={email:'',name:'Usuario'};
  let workflow={users:[],assignments:{carrierReview:'',carrierPayment:'',deferredCollection:''}};

  function nameFor(email){const e=String(email||'').trim().toLowerCase();const u=(workflow.users||[]).find(x=>String(x.email||'').trim().toLowerCase()===e);if(u?.name)return u.name;const local=(e||'Usuario').split('@')[0].replace(/[._-]+/g,' ');return local.replace(/\b\w/g,c=>c.toUpperCase());}
  function activeTeamUser(){if(currentUser.email===OWNER_EMAIL)return true;return (workflow.users||[]).some(u=>u.active!==false&&String(u.email||'').toLowerCase()===currentUser.email);}
  function canPay(){return currentUser.email===OWNER_EMAIL||currentUser.email===String(workflow.assignments?.carrierPayment||'').toLowerCase();}
  function stamp(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'});}
  function paidStamp(r){if(!r?.carrierPaidDate&&!r?.carrierPaidAt)return'—';const date=r.carrierPaidDate?new Date(r.carrierPaidDate+'T12:00:00').toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}):'—';if(!r.carrierPaidAt)return date;const d=new Date(r.carrierPaidAt);const time=Number.isNaN(d.getTime())?'':d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});return `${date}${time?` · ${time}`:''}`;}

  async function loadContext(){
    try{const r=await fetch('/cdn-cgi/access/get-identity',{cache:'no-store'});if(r.ok){const x=await r.json();const email=String(x.email||x.user?.email||'').toLowerCase();if(email)currentUser.email=email;}}catch(_){}
    try{let r;if(currentUser.email===OWNER_EMAIL)r=await fetch('/api/admin',{cache:'no-store'});if(!r||!r.ok)r=await fetch('/api/state',{cache:'no-store'});if(r.ok){const x=await r.json();const w=x.workflow||x?.state?.w;if(w&&typeof w==='object')workflow=w;}}catch(_){}
    currentUser.name=nameFor(currentUser.email);
  }

  function ensureStyle(){
    if(document.getElementById('tm-review-flex-style'))return;
    const s=document.createElement('style');s.id='tm-review-flex-style';s.textContent=`
      .tm-review-flex-box{grid-column:1/-1;background:#fff6d9;border:1px solid #f0d98a;border-radius:12px;padding:13px 15px;color:#745710;font-size:13px;line-height:1.45}.tm-review-flex-box b{color:#5f470b}.tm-review-flex-title{font-size:15px;font-weight:900;margin-bottom:5px;color:#7b5b0a}
      .tm-flex-audit{grid-column:1/-1;border:1px solid #cfe2f5;background:#f5faff;border-radius:14px;padding:14px 16px;margin:2px 0 8px}.tm-flex-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0}.tm-flex-item{padding:0 12px;border-right:1px solid #d6e3ef}.tm-flex-item:first-child{padding-left:0}.tm-flex-item:last-child{border-right:0}.tm-flex-item small{display:block;color:#6b8198;font-size:10px;font-weight:900;text-transform:uppercase;margin-bottom:4px}.tm-flex-item b{display:block;color:#173f69;font-size:14px}
      .tm-flex-pay{grid-column:1/-1;border:1px solid #cfe2f5;background:#f7fbff;border-radius:12px;padding:14px 16px}.tm-flex-pay label{display:block;font-size:10px;font-weight:900;text-transform:uppercase;color:#6a7f96;margin:8px 0 5px}.tm-flex-pay input{border:1px solid #d9e3ee;border-radius:9px;padding:9px;background:#fff}.tm-pay-meta{font-size:12px;color:#5d7188;margin-top:4px}
      .tm-toast{position:fixed;right:24px;bottom:24px;z-index:9999;width:min(410px,calc(100vw - 32px));background:#fff;border:1px solid #cfe3d8;border-radius:16px;box-shadow:0 18px 50px rgba(17,53,90,.22);padding:16px;display:flex;gap:12px;align-items:flex-start;animation:tmToastIn .18s ease-out}.tm-toast-icon{width:36px;height:36px;border-radius:50%;background:#e5f7ee;color:#16744e;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;flex:0 0 auto}.tm-toast h4{margin:1px 0 4px;color:#173f69;font-size:15px}.tm-toast p{margin:0;color:#5f7185;font-size:12px;line-height:1.45}.tm-toast button{margin-left:auto;border:0;background:transparent;color:#6d7d92;font-size:20px;cursor:pointer}@keyframes tmToastIn{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
      .tm-pay-time{display:block;color:#6d7d92;font-size:10px;margin-top:3px}.tm-carrier-edit-btn{white-space:nowrap}
      @media(max-width:900px){.tm-flex-grid{grid-template-columns:1fr 1fr}.tm-flex-item{border-right:0;padding:7px 0}}
    `;document.head.appendChild(s);
  }
  function badge(st){const s=String(st||'Pendiente de completar');const c=s==='Pagado'?'ok':s==='Revisado'?'proc':'tm-pending-complete';return `<span class="badge ${c}">${esc(s)}</span>`;}
  function popup(title,body,footer){document.querySelector('.tm-overlay')?.remove();const o=document.createElement('div');o.className='tm-overlay';o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div><div class="tm-pop-f">${footer}</div></div>`;o.querySelector('.tm-close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});document.body.appendChild(o);return o;}
  function toast(title,text){document.querySelector('.tm-toast')?.remove();const t=document.createElement('div');t.className='tm-toast';t.innerHTML=`<div class="tm-toast-icon">✓</div><div><h4>${esc(title)}</h4><p>${esc(text)}</p></div><button type="button">×</button>`;t.querySelector('button').onclick=()=>t.remove();document.body.appendChild(t);setTimeout(()=>t.remove(),5200);}
  function snapshot(r){return {carrier:r.carrier||'',carrierAmt:+(r.carrierAmt||0),carrierDue:r.carrierDue||'',carrierStatus:r.carrierStatus||'',carrierPaidDate:r.carrierPaidDate||'',note:r.note||'',carrierPreparedBy:r.carrierPreparedBy||'',carrierReviewedBy:r.carrierReviewedBy||'',carrierPaidBy:r.carrierPaidBy||''};}
  function persist(){try{if(typeof store==='function')store();localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));return true}catch(e){console.error(e);alert('No se pudo guardar el Carrier/PFA.');return false}}
  async function audit(action,r,detail,before,after){try{await fetch('/api/audit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({user_name:currentUser.name,module:'Carrier / PFA',action,ref:r.invoice||r.id||'',detail,before,after})});}catch(_){}}

  function refreshCarrierTable(){
    const body=document.getElementById('carBody');if(!body)return;
    const table=body.closest('table'),hr=table?.querySelector('thead tr');
    if(hr)hr.innerHTML='<th>Cliente</th><th>Invoice</th><th>Carrier/PFA</th><th>Monto</th><th>Fecha límite</th><th>Estado</th><th>Preparado por</th><th>Pago / registro</th><th>Acción</th>';
    const rows=(S.r||[]).filter(r=>(+r.carrierAmt||+r.downPayment||0)>0);
    const fd=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'});};
    body.innerHTML=rows.map(r=>{const st=String(r.carrierStatus||'Pendiente');const paid=st==='Pagado';let pay='—';if(paid){const date=fd(r.carrierPaidDate);let time='';if(r.carrierPaidAt){const d=new Date(r.carrierPaidAt);if(!Number.isNaN(d.getTime()))time=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});}pay=`<b>${date}</b>${time?`<span class="tm-pay-time">Registrado ${esc(time)}</span>`:''}`;}return `<tr><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td>${esc(r.carrier||'—')}</td><td><b>${fmt(r.carrierAmt||r.downPayment)}</b></td><td>${fd(r.carrierDue)}</td><td>${badge(st)}</td><td>${esc(r.carrierPreparedBy||'—')}</td><td>${pay}</td><td><button class="btn soft tm-carrier-edit-btn" onclick="tmEditCarrierObligation('${r.id}')">${paid?'Editar':'Abrir'}</button></td></tr>`;}).join('')||'<tr><td colspan="9">Sin obligaciones</td></tr>';
  }
  window.tmRefreshCarrierTable=refreshCarrierTable;
  function refreshAll(){try{if(typeof render==='function')render();}catch(_){}setTimeout(()=>{try{window.tmRefreshSummaryPayments?.();}catch(_){}try{refreshCarrierTable();}catch(_){}try{window.tmRefreshPaymentPortals?.();}catch(_){}},80);setTimeout(()=>{try{window.tmRefreshSummaryPayments?.();refreshCarrierTable();}catch(_){}},350);}

  window.tmEditCarrierObligation=async function(id){
    await loadContext();ensureStyle();
    const r=(S.r||[]).find(x=>String(x.id)===String(id));if(!r)return alert('No encontré este pendiente.');
    if((+r.carrierAmt||+r.downPayment||0)>0&&String(r.carrierStatus||'')==='No aplica'){r.carrierStatus='Pendiente';persist();}
    const status=String(r.carrierStatus||'Pendiente de completar');
    const reviewEmail=String(workflow.assignments?.carrierReview||'').toLowerCase(),payEmail=String(workflow.assignments?.carrierPayment||OWNER_EMAIL).toLowerCase();
    const reviewName=nameFor(reviewEmail)||'Operaciones',payName=nameFor(payEmail)||'Owner';
    const assigned=status==='Revisado'?(r.carrierAssignedTo||payName):status==='Pagado'?'—':reviewName;
    const options='<option value="">Seleccionar…</option>'+(S.c||[]).map(c=>`<option value="${esc(c)}" ${c===r.carrier?'selected':''}>${esc(c)}</option>`).join('');
    const reviewedBy=r.carrierReviewedBy||'—',updated=r.carrierPaidAt||r.carrierReviewedAt||r.carrierPreparedAt||'';
    const reviewBox=status==='Pagado'?`<div class="tm-review-flex-box"><div class="tm-review-flex-title">Revisión completada</div>El caso fue revisado por <b>${esc(reviewedBy)}</b> y ya está registrado como Pagado.</div>`:status==='Revisado'?`<div class="tm-review-flex-box"><div class="tm-review-flex-title">Revisión completada</div>Revisado por <b>${esc(reviewedBy)}</b>. Ahora el responsable principal de pago es <b>${esc(payName)}</b>.</div>`:`<div class="tm-review-flex-box"><div class="tm-review-flex-title">Revisión pendiente</div>Responsable principal: <b>${esc(reviewName)}</b>. Si esa persona no está disponible, <b>otro usuario activo del equipo puede finalizar la revisión</b>; el sistema guardará exactamente quién la realizó.</div>`;
    const payBlock=status==='Revisado'&&canPay()?`<div class="tm-flex-pay"><b style="color:#173f69">Listo para pago</b><div class="sub">Asignado principalmente a ${esc(payName)}.</div><label>Fecha de pago al Carrier</label><input id="tmFlexPaidDate" type="date" value="${esc(r.carrierPaidDate||today())}"></div>`:'';
    const paidEdit=status==='Pagado'?`<div class="tm-flex-pay"><b style="color:#173f69">Pago registrado</b><div class="tm-pay-meta">Registrado por <b>${esc(r.carrierPaidBy||'—')}</b> · ${esc(stamp(r.carrierPaidAt))}</div><label>Fecha de pago al Carrier</label><input id="tmFlexPaidDate" type="date" value="${esc(r.carrierPaidDate||today())}"></div>`:'';
    const body=`<div class="tm-kpis"><div class="tm-kpi"><small>Cliente</small><b style="font-size:16px">${esc(r.client||'')}</b></div><div class="tm-kpi"><small>Invoice</small><b style="font-size:16px">${esc(r.invoice||'')}</b></div><div class="tm-kpi"><small>Down Payment</small><b>${fmt(r.downPayment||r.carrierAmt)}</b></div><div class="tm-kpi"><small>Estado actual</small><b>${badge(status)}</b></div></div><div class="tm-grid"><div class="tm-field"><label>Carrier / MGA / PFA</label><select id="tmFlexCarrier">${options}</select></div><div class="tm-field"><label>Monto a pagar</label><input id="tmFlexAmount" type="number" min="0" step="0.01" value="${+r.carrierAmt||+r.downPayment||0}"></div><div class="tm-field"><label>Fecha límite</label><input id="tmFlexDue" type="date" value="${esc(r.carrierDue||'')}"></div><div class="tm-flex-audit"><div class="tm-flex-grid"><div class="tm-flex-item"><small>Preparado por</small><b>${esc(r.carrierPreparedBy||'—')}</b></div><div class="tm-flex-item"><small>Revisado por</small><b>${esc(reviewedBy)}</b></div><div class="tm-flex-item"><small>Última actualización</small><b>${esc(stamp(updated))}</b></div><div class="tm-flex-item"><small>Estado</small><b>${badge(status)}</b></div><div class="tm-flex-item"><small>Asignado principal</small><b>${esc(assigned)}</b></div></div></div><div class="tm-field" style="grid-column:1/-1"><label>Nota / número de póliza / referencia</label><textarea id="tmFlexNote">${esc(r.note||'')}</textarea></div>${reviewBox}${payBlock}${paidEdit}</div>`;
    let footer='<button class="btn soft" id="tmFlexCancel" type="button">Cancelar</button>';
    if(status==='Pagado')footer+='<button class="btn navy" id="tmFlexSave" type="button">Guardar cambios</button>';
    else if(status==='Revisado'&&canPay())footer+='<button class="btn navy" id="tmFlexPay" type="button">Registrar pago</button>';
    else if(status==='Revisado')footer+='<button class="btn navy" id="tmFlexSave" type="button">Guardar cambios</button>';
    else if(activeTeamUser())footer+='<button class="btn navy" id="tmFlexReview" type="button">✓ Marcar como Revisado</button>';
    else footer+='<button class="btn navy" id="tmFlexSave" type="button">Guardar borrador</button>';
    const o=popup(`Completar Carrier / PFA · ${esc(r.invoice||'')}`,body,footer);o.querySelector('#tmFlexCancel').onclick=()=>o.remove();
    const read=()=>({carrier:o.querySelector('#tmFlexCarrier').value,due:o.querySelector('#tmFlexDue').value,amount:+(o.querySelector('#tmFlexAmount').value||0),note:o.querySelector('#tmFlexNote').value.trim()});
    const draft=v=>{r.carrier=v.carrier;r.carrierAmt=v.amount;r.downPayment=r.downPayment||v.amount;r.carrierDue=v.due;r.note=v.note;r.carrierPreparedBy=currentUser.name;r.carrierPreparedEmail=currentUser.email;r.carrierPreparedAt=nowIso();r.carrierNeedsCompletion=!(v.carrier&&v.due);};

    o.querySelector('#tmFlexSave')?.addEventListener('click',async()=>{const before=snapshot(r),v=read();draft(v);if(status==='Pagado'){const d=o.querySelector('#tmFlexPaidDate')?.value;if(!d)return alert('Coloca la fecha de pago al Carrier.');r.carrierPaidDate=d;r.carrierStatus='Pagado';r.carrierNeedsCompletion=false;}if(!persist())return;o.remove();refreshAll();await audit('Actualizó',r,`Actualizó información de Carrier/PFA. Estado: ${status}.`,before,snapshot(r));toast('Cambios guardados',`Se actualizó ${r.invoice||'el registro'} correctamente.`);});
    o.querySelector('#tmFlexReview')?.addEventListener('click',async()=>{const v=read();if(!v.carrier||!v.due||v.amount<=0)return alert('Completa Carrier, monto y fecha límite.');if(!v.note)return alert('Agrega nota, número de póliza o referencia.');const before=snapshot(r);draft(v);const t=nowIso();r.carrierStatus='Revisado';r.carrierReviewedBy=currentUser.name;r.carrierReviewedEmail=currentUser.email;r.carrierReviewedAt=t;r.carrierAssignedTo=payName;r.carrierAssignedEmail=payEmail;r.carrierNeedsCompletion=false;if(!persist())return;o.remove();refreshAll();await audit('Marcó Revisado',r,`Responsable principal: ${reviewName}. Revisión finalizada por ${currentUser.name}. Asignado para pago a ${payName}.`,before,snapshot(r));toast('Revisión completada',`Revisado por ${currentUser.name}. Quedó listo para pago por ${payName}.`);});
    o.querySelector('#tmFlexPay')?.addEventListener('click',async()=>{const d=o.querySelector('#tmFlexPaidDate')?.value;if(!d)return alert('Coloca la fecha de pago al Carrier.');const before=snapshot(r),v=read();draft(v);const registeredAt=nowIso();r.carrierStatus='Pagado';r.carrierPaidDate=d;r.carrierPaidBy=currentUser.name;r.carrierPaidEmail=currentUser.email;r.carrierPaidAt=registeredAt;r.carrierAssignedTo='';r.carrierAssignedEmail='';r.carrierNeedsCompletion=false;if(!persist())return;o.remove();refreshAll();await audit('Registró pago',r,`Pago al Carrier registrado por ${currentUser.name} con fecha ${d}.`,before,snapshot(r));toast('Pago al Carrier registrado',`${r.carrier||'Carrier'} · ${fmt(r.carrierAmt||r.downPayment)} · registrado ${stamp(registeredAt)}.`);});
  };

  setTimeout(()=>{ensureStyle();refreshCarrierTable();},650);
})();