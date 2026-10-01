(() => {
  if (window.__tmCarrierReviewWorkflowLoaded) return;
  window.__tmCarrierReviewWorkflowLoaded = true;

  const OWNER_EMAIL='gregorio.navarro@truemategroup.com';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const today=()=>new Date().toISOString().slice(0,10);
  const nowIso=()=>new Date().toISOString();
  let currentUser={email:'',name:'Usuario'};
  let workflow={users:[],assignments:{carrierReview:'',carrierPayment:'',deferredCollection:''}};

  function nameFor(email){const e=String(email||'').toLowerCase();const u=(workflow.users||[]).find(x=>String(x.email||'').toLowerCase()===e);if(u?.name)return u.name;const local=(e||'Usuario').split('@')[0].replace(/[._-]+/g,' ');return local.replace(/\b\w/g,c=>c.toUpperCase());}
  function isOwner(){return currentUser.email===OWNER_EMAIL;}
  function canReview(){return isOwner()||currentUser.email===String(workflow.assignments?.carrierReview||'').toLowerCase();}
  function canPay(){return isOwner()||currentUser.email===String(workflow.assignments?.carrierPayment||'').toLowerCase();}
  function formatStamp(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-US',{month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'});}

  async function initContext(){
    try{const r=await fetch('/cdn-cgi/access/get-identity',{cache:'no-store'});if(r.ok){const x=await r.json();const email=String(x.email||x.user?.email||'').toLowerCase();if(email)currentUser={email,name:nameFor(email)};}}catch(_){}
    try{const r=await fetch('/api/state',{cache:'no-store'});if(r.ok){const x=await r.json();if(x?.state?.w&&typeof x.state.w==='object')workflow=x.state.w;currentUser.name=nameFor(currentUser.email);}}catch(_){}
  }
  initContext();

  async function audit(action,r,detail,before,after){
    try{await fetch('/api/audit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({user_name:currentUser.name,module:'Carrier / PFA',action,ref:r.invoice||r.id||'',detail,before,after})});}catch(_){}
  }

  function ensureStyle(){
    if($('tm-carrier-review-style'))return;
    const s=document.createElement('style');s.id='tm-carrier-review-style';s.textContent=`
      .tm-audit-box{grid-column:1/-1;border:1px solid #cfe2f5;background:#f5faff;border-radius:14px;padding:14px 16px;margin:2px 0 8px}.tm-audit-title{font-size:16px;font-weight:900;color:#173f69;margin-bottom:12px}.tm-audit-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}.tm-audit-item{padding:0 14px;border-right:1px solid #d6e3ef}.tm-audit-item:first-child{padding-left:0}.tm-audit-item:last-child{border-right:0}.tm-audit-item small{display:block;color:#6b8198;font-size:10px;font-weight:900;text-transform:uppercase;margin-bottom:4px}.tm-audit-item b{display:block;color:#173f69;font-size:14px}.tm-review-note{grid-column:1/-1;background:#eef7ff;border:1px solid #cfe4f8;border-radius:10px;padding:10px 12px;color:#315d83;font-size:12px}.tm-status-reviewed{background:#fff3d2;color:#8b6600}.tm-status-paid{background:#e5f7ee;color:#16744e}.tm-status-pending{background:#edf4fb;color:#245887}.tm-pay-box{grid-column:1/-1;border:1px solid #cfe2f5;background:#f7fbff;border-radius:12px;padding:12px}.tm-pay-box label{display:block;font-size:10px;font-weight:900;text-transform:uppercase;color:#6a7f96;margin:8px 0 5px}.tm-pay-box input{border:1px solid #d9e3ee;border-radius:9px;padding:9px;background:#fff}@media(max-width:850px){.tm-audit-grid{grid-template-columns:1fr 1fr}.tm-audit-item{border-right:0;padding:8px 0}}
    `;document.head.appendChild(s);
  }
  function popup(title,body,footer=''){document.querySelector('.tm-overlay')?.remove();const o=document.createElement('div');o.className='tm-overlay';o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div>${footer?`<div class="tm-pop-f">${footer}</div>`:''}</div>`;o.querySelector('.tm-close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});document.body.appendChild(o);return o;}
  function statusBadge(st){const s=String(st||'Pendiente de completar'),cl=s==='Pagado'?'tm-status-paid':s==='Revisado'?'tm-status-reviewed':'tm-status-pending';return `<span class="badge ${cl}">${esc(s)}</span>`;}
  function snapshot(r){return {carrier:r.carrier||'',carrierAmt:+(r.carrierAmt||0),carrierDue:r.carrierDue||'',carrierStatus:r.carrierStatus||'',carrierPaidDate:r.carrierPaidDate||'',note:r.note||'',carrierPreparedBy:r.carrierPreparedBy||'',carrierReviewedBy:r.carrierReviewedBy||'',carrierPaidBy:r.carrierPaidBy||''};}
  function persist(){try{if(typeof store==='function')store();localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));return true}catch(e){console.error(e);alert('No se pudo guardar el Carrier/PFA.');return false}}

  window.tmEditCarrierObligation=async function(id){
    await initContext();ensureStyle();
    const r=(S.r||[]).find(x=>String(x.id)===String(id));if(!r)return alert('No encontré este pendiente.');
    const status=String(r.carrierStatus||'Pendiente de completar');
    const reviewEmail=String(workflow.assignments?.carrierReview||'').toLowerCase();
    const payEmail=String(workflow.assignments?.carrierPayment||OWNER_EMAIL).toLowerCase();
    const reviewName=nameFor(reviewEmail),payName=nameFor(payEmail);
    const options='<option value="">Seleccionar…</option>'+(S.c||[]).map(c=>`<option value="${esc(c)}" ${c===r.carrier?'selected':''}>${esc(c)}</option>`).join('');
    const assigned=status==='Revisado'?(r.carrierAssignedTo||payName):(status==='Pagado'?'—':reviewName||'Operaciones');
    const updated=r.carrierPaidAt||r.carrierReviewedAt||r.carrierPreparedAt||'';
    const payBlock=status==='Revisado'&&canPay()?`<div class="tm-pay-box"><b style="color:#173f69">Listo para pago</b><div class="sub">Revisado por ${esc(r.carrierReviewedBy||'Operaciones')}. Solo el responsable de pago puede registrar Pagado.</div><label>Fecha de pago al Carrier</label><input id="tmOpPaidDate" type="date" value="${esc(r.carrierPaidDate||today())}"></div>`:'';
    const body=`<div class="tm-kpis"><div class="tm-kpi"><small>Cliente</small><b style="font-size:16px">${esc(r.client||'')}</b></div><div class="tm-kpi"><small>Invoice</small><b style="font-size:16px">${esc(r.invoice||'')}</b></div><div class="tm-kpi"><small>Down Payment</small><b>${fmt(r.downPayment||r.carrierAmt)}</b></div><div class="tm-kpi"><small>Estado actual</small><b>${statusBadge(status)}</b></div></div><div class="tm-grid"><div class="tm-field"><label>Carrier / MGA / PFA</label><select id="tmOpCarrier">${options}</select></div><div class="tm-field"><label>Monto a pagar</label><input id="tmOpAmount" type="number" min="0" step="0.01" value="${+r.carrierAmt||+r.downPayment||0}"></div><div class="tm-field"><label>Fecha límite</label><input id="tmOpDue" type="date" value="${esc(r.carrierDue||'')}"></div><div class="tm-audit-box"><div class="tm-audit-title">Trazabilidad / revisión interna</div><div class="tm-audit-grid"><div class="tm-audit-item"><small>Preparado por</small><b>${esc(r.carrierPreparedBy||'—')}</b></div><div class="tm-audit-item"><small>Última actualización</small><b>${esc(formatStamp(updated))}</b></div><div class="tm-audit-item"><small>Estado actual</small><b>${statusBadge(status)}</b></div><div class="tm-audit-item"><small>Asignado</small><b>${esc(assigned||'—')}</b></div></div></div><div class="tm-field" style="grid-column:1/-1"><label>Nota / número de póliza / referencia</label><textarea id="tmOpNote">${esc(r.note||'')}</textarea></div><div class="tm-review-note">${status==='Pagado'?'Este pago ya está registrado como Pagado.':status==='Revisado'?`Este registro quedó Revisado y asignado a <b>${esc(payName)}</b> para pago.`:`El responsable de revisión es <b>${esc(reviewName||'Operaciones')}</b>. Al terminar debe usar <b>Marcar como Revisado</b>.`}</div>${payBlock}</div>`;
    let footer='<button class="btn soft" id="tmOpCancel" type="button">Cancelar</button>';
    if(status==='Pagado')footer+='<button class="btn navy" id="tmOpSave" type="button">Guardar nota</button>';
    else if(status==='Revisado'&&canPay())footer+='<button class="btn navy" id="tmOpPay" type="button">Registrar pago</button>';
    else if(status==='Revisado')footer+='<button class="btn navy" id="tmOpSave" type="button">Guardar cambios</button>';
    else if(canReview())footer+='<button class="btn navy" id="tmOpReview" type="button">✓ Marcar como Revisado</button>';
    else footer+='<button class="btn navy" id="tmOpSave" type="button">Guardar borrador</button>';
    const o=popup(`Completar Carrier / PFA · ${esc(r.invoice||'')}`,body,footer);o.querySelector('#tmOpCancel').onclick=()=>o.remove();
    const read=()=>({carrier:o.querySelector('#tmOpCarrier').value,due:o.querySelector('#tmOpDue').value,amount:+(o.querySelector('#tmOpAmount').value||0),note:o.querySelector('#tmOpNote').value.trim()});
    const applyDraft=v=>{r.carrier=v.carrier;r.carrierAmt=v.amount;r.downPayment=r.downPayment||v.amount;r.carrierDue=v.due;r.note=v.note;r.carrierPreparedBy=currentUser.name;r.carrierPreparedEmail=currentUser.email;r.carrierPreparedAt=nowIso();r.carrierNeedsCompletion=!(v.carrier&&v.due);};

    o.querySelector('#tmOpSave')?.addEventListener('click',async()=>{const before=snapshot(r),v=read();applyDraft(v);if(!persist())return;o.remove();try{if(typeof render==='function')render();}catch(_){}await audit('Actualizó',r,`Actualizó información de Carrier/PFA. Estado: ${status}.`,before,snapshot(r));});
    o.querySelector('#tmOpReview')?.addEventListener('click',async()=>{const v=read();if(!v.carrier||!v.due||v.amount<=0)return alert('Completa Carrier, monto y fecha límite.');if(!v.note)return alert('Agrega nota, número de póliza o referencia.');const before=snapshot(r);applyDraft(v);const stamp=nowIso();r.carrierStatus='Revisado';r.carrierReviewedBy=currentUser.name;r.carrierReviewedEmail=currentUser.email;r.carrierReviewedAt=stamp;r.carrierAssignedTo=payName;r.carrierAssignedEmail=payEmail;r.carrierNeedsCompletion=false;if(!persist())return;o.remove();try{if(typeof render==='function')render();}catch(_){}await audit('Marcó Revisado',r,`Revisado por ${currentUser.name}. Asignado para pago a ${payName}.`,before,snapshot(r));alert('Quedó Revisado y listo para pago.');});
    o.querySelector('#tmOpPay')?.addEventListener('click',async()=>{const d=o.querySelector('#tmOpPaidDate')?.value;if(!d)return alert('Coloca la fecha de pago al Carrier.');const before=snapshot(r),v=read();applyDraft(v);r.carrierStatus='Pagado';r.carrierPaidDate=d;r.carrierPaidBy=currentUser.name;r.carrierPaidEmail=currentUser.email;r.carrierPaidAt=nowIso();r.carrierAssignedTo='';r.carrierAssignedEmail='';r.carrierNeedsCompletion=false;if(!persist())return;o.remove();try{if(typeof render==='function')render();}catch(_){}await audit('Registró pago',r,`Pago al Carrier registrado por ${currentUser.name} con fecha ${d}.`,before,snapshot(r));alert('Pago al Carrier registrado correctamente.');});
  };

  function enhanceCarrierTable(){const body=$('carBody');if(!body)return;const table=body.closest('table'),hr=table?.querySelector('thead tr');if(hr)hr.innerHTML='<th>Cliente</th><th>Invoice</th><th>Carrier/PFA</th><th>Monto</th><th>Fecha límite</th><th>Estado</th><th>Preparado por</th><th>Fecha pago</th><th>Acción</th>';const rows=(S.r||[]).filter(r=>(+r.carrierAmt||+r.downPayment)>0);const fd=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'});};body.innerHTML=rows.map(r=>`<tr><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td>${esc(r.carrier||'—')}</td><td><b>${fmt(r.carrierAmt||r.downPayment)}</b></td><td>${fd(r.carrierDue)}</td><td>${statusBadge(r.carrierStatus)}</td><td>${esc(r.carrierPreparedBy||'—')}</td><td>${fd(r.carrierPaidDate)}</td><td><button class="btn soft" onclick="tmEditCarrierObligation('${r.id}')">Abrir</button></td></tr>`).join('')||'<tr><td colspan="9">Sin obligaciones</td></tr>';}
  const oldRender=window.render;if(typeof oldRender==='function')window.render=function(){oldRender();setTimeout(enhanceCarrierTable,260);};
  setTimeout(()=>{ensureStyle();enhanceCarrierTable();},500);
})();