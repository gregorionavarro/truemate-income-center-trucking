(() => {
  if (window.__tmCamilaCarrierFlowLoaded) return;
  window.__tmCamilaCarrierFlowLoaded = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => typeof money==='function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const uid = () => 'cf'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const today = () => new Date().toISOString().slice(0,10);
  let tmEditingId = null;

  function addStyle(){
    if ($('tm-camila-carrier-style')) return;
    const s=document.createElement('style');
    s.id='tm-camila-carrier-style';
    s.textContent=`.tm-carrier-note{grid-column:1/-1;border:1px solid #d8e7f5;background:#f4f9ff;border-radius:12px;padding:12px 14px;color:#365b7e;font-size:12px;line-height:1.45}.tm-carrier-note b{color:#173f69}.tm-pending-complete{background:#fff4d8;color:#8c6810}.tm-carrier-action{display:flex;gap:6px;flex-wrap:wrap}`;
    document.head.appendChild(s);
  }

  function ensureDownPaymentField(){
    const gross=$('gross'); if(!gross) return;
    const fields=gross.closest('.fields'); if(!fields) return;
    let wrap=$('tmDownPaymentWrap');
    if(!wrap){
      wrap=document.createElement('div');wrap.className='f';wrap.id='tmDownPaymentWrap';
      wrap.innerHTML='<label>Down Payment / pago a Carrier</label><input type="number" min="0" step="0.01" id="tmDownPayment"><div class="sub" style="font-size:10px;margin-top:4px">Solo ingresa el monto. Carrier y fecha límite los completa Operaciones.</div>';
      const fee=$('agencyFee')?.closest('.f'); if(fee&&fee.nextSibling) fields.insertBefore(wrap,fee.nextSibling); else fields.appendChild(wrap);
    }
    const feeLabel=$('agencyFee')?.closest('.f')?.querySelector('label'); if(feeLabel) feeLabel.textContent='Fee cobrado (Maintenance Fees)';
  }

  function simplifyCarrierSection(){
    const carrier=$('carrierName'); if(!carrier) return;
    const section=carrier.closest('.fields'); if(!section) return;
    ['carrierName','carrierAmt','carrierDue','carrierStatus','note'].forEach(id=>{const e=$(id)?.closest('.f');if(e)e.style.display='none';});
    let note=section.querySelector('.tm-carrier-note');
    if(!note){note=document.createElement('div');note.className='tm-carrier-note';section.appendChild(note);}
    note.innerHTML='<b>Carrier / MGA / PFA se completa después.</b><br>La persona que registra el ingreso solo coloca el Down Payment. El sistema crea automáticamente el pendiente y Operaciones completa Carrier, fecha límite, estado y nota desde la pestaña <b>Carrier / PFA</b>.';
    const heading=[...document.querySelectorAll('.section')].find(x=>x.textContent.includes('Carrier / PFA')); if(heading) heading.textContent='4 · Carrier / PFA · lo completa Operaciones';
  }

  const previousOpen=window.openModal;
  if(typeof previousOpen==='function') window.openModal=function(id){
    tmEditingId=id||null;
    previousOpen(id);
    setTimeout(()=>{
      addStyle();ensureDownPaymentField();simplifyCarrierSection();
      const dp=$('tmDownPayment');
      if(dp){
        const r=id?(S.r||[]).find(x=>String(x.id)===String(id)):null;
        dp.value=r ? (+((r.downPayment ?? r.carrierAmt) || 0)).toFixed(2) : '';
      }
    },30);
  };

  const previousClose=window.closeModal;
  if(typeof previousClose==='function') window.closeModal=function(){
    previousClose();
    setTimeout(()=>{tmEditingId=null;},0);
  };

  function ensureCarrierTask(r){
    if(!r||!(+r.carrierAmt>0)) return;
    const complete=!!r.carrier&&!!r.carrierDue;
    let task=(S.t||[]).find(t=>String(t.carrierSetupInvoice||'')===String(r.invoice||'')&&!t.done);
    if(complete){if(task){task.done=true;task.status='Realizada';task.doneAt=today();}return;}
    if(!task)(S.t||[]).push({id:uid(),title:`Completar Carrier/PFA · ${r.invoice}`,date:'',note:`${r.client||''} · ${fmt(r.carrierAmt)} · completar Carrier y fecha límite`,invoice:r.invoice,carrierSetupInvoice:r.invoice,assignedTo:'Operaciones',auto:false,done:false,status:'Abierta'});
    else task.note=`${r.client||''} · ${fmt(r.carrierAmt)} · completar Carrier y fecha límite`;
  }

  const previousSave=window.save;
  if(typeof previousSave==='function') window.save=function(){
    ensureDownPaymentField();simplifyCarrierSection();
    const dp=+($('tmDownPayment')?.value||0);
    if(dp<0)return alert('El Down Payment no puede ser negativo.');
    const gross=+($('gross')?.value||0);
    if(dp>gross+0.01)return alert('El Down Payment no puede ser mayor que el pago recibido.');

    const editingId=tmEditingId;
    const existing=editingId?(S.r||[]).find(x=>String(x.id)===String(editingId)):null;
    const preserve=existing?{carrier:existing.carrier||'',carrierDue:existing.carrierDue||'',carrierStatus:existing.carrierStatus||'',note:existing.note||''}:null;
    const beforeIds=new Set((S.r||[]).map(x=>String(x.id)));
    const invoiceBefore=$('invoice')?.value||'';

    // Important: persist the Down Payment through the original save path too.
    if($('carrierName'))$('carrierName').value='';
    if($('carrierAmt'))$('carrierAmt').value=String(dp||0);
    if($('carrierDue'))$('carrierDue').value='';
    if($('carrierStatus'))$('carrierStatus').value='No aplica';

    previousSave();

    // The original save closes the modal immediately; keep our captured ID and then enrich the record.
    setTimeout(()=>{
      let rec=null;
      if(editingId) rec=(S.r||[]).find(x=>String(x.id)===String(editingId));
      if(!rec) rec=[...(S.r||[])].reverse().find(x=>!beforeIds.has(String(x.id)));
      if(!rec && invoiceBefore) rec=[...(S.r||[])].reverse().find(x=>String(x.invoice||'')===String(invoiceBefore));
      if(!rec){console.error('Carrier flow: no se encontró el registro guardado');return;}

      rec.downPayment=dp;
      if(dp>0){
        rec.carrierAmt=dp;
        if(preserve&&(preserve.carrier||preserve.carrierDue)){
          rec.carrier=preserve.carrier;rec.carrierDue=preserve.carrierDue;rec.note=preserve.note;
          rec.carrierStatus=preserve.carrierStatus||((preserve.carrier&&preserve.carrierDue)?'Pendiente':'Pendiente de completar');
        }else{
          rec.carrier='';rec.carrierDue='';rec.carrierStatus='Pendiente de completar';rec.note='Pendiente de completar por Operaciones.';
        }
        rec.carrierNeedsCompletion=!(rec.carrier&&rec.carrierDue);
        ensureCarrierTask(rec);
      }else{
        rec.carrierAmt=0;rec.carrier='';rec.carrierDue='';rec.carrierStatus='No aplica';rec.carrierNeedsCompletion=false;
      }
      try{
        store();
        localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));
        localStorage.setItem('tmic_t',JSON.stringify(S.t||[]));
        render();
      }catch(e){console.error('Carrier flow save',e);}
      tmEditingId=null;
    },30);
  };

  function popup(title,body,footer=''){document.querySelector('.tm-overlay')?.remove();const o=document.createElement('div');o.className='tm-overlay';o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div>${footer?`<div class="tm-pop-f">${footer}</div>`:''}</div>`;o.querySelector('.tm-close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});document.body.appendChild(o);return o;}

  window.tmEditCarrierObligation=function(id){
    const r=(S.r||[]).find(x=>String(x.id)===String(id));if(!r)return alert('No encontré este pendiente.');
    const options='<option value="">Seleccionar…</option>'+(S.c||[]).map(c=>`<option ${c===r.carrier?'selected':''}>${esc(c)}</option>`).join('');
    const o=popup(`Completar Carrier / PFA · ${esc(r.invoice||'')}`,`<div class="tm-kpis"><div class="tm-kpi"><small>Cliente</small><b style="font-size:16px">${esc(r.client||'')}</b></div><div class="tm-kpi"><small>Invoice</small><b style="font-size:16px">${esc(r.invoice||'')}</b></div><div class="tm-kpi"><small>Down Payment</small><b>${fmt(r.downPayment||r.carrierAmt)}</b></div><div class="tm-kpi"><small>Responsable</small><b style="font-size:16px">Operaciones</b></div></div><div class="tm-grid"><div class="tm-field"><label>Carrier / MGA / PFA</label><select id="tmOpCarrier">${options}</select></div><div class="tm-field"><label>Monto a pagar</label><input id="tmOpAmount" type="number" min="0" step="0.01" value="${+r.carrierAmt||+r.downPayment||0}"></div><div class="tm-field"><label>Fecha límite</label><input id="tmOpDue" type="date" value="${esc(r.carrierDue||'')}"></div><div class="tm-field"><label>Estado</label><select id="tmOpStatus"><option>Pendiente de completar</option><option>Pendiente</option><option>Pagado</option><option>No aplica</option></select></div><div class="tm-field" style="grid-column:1/-1"><label>Nota</label><textarea id="tmOpNote">${esc(r.note||'')}</textarea></div></div>`,`<button class="btn soft" id="tmOpCancel">Cancelar</button><button class="btn navy" id="tmOpSave">Guardar</button>`);
    o.querySelector('#tmOpStatus').value=r.carrierStatus||'Pendiente de completar';o.querySelector('#tmOpCancel').onclick=()=>o.remove();
    o.querySelector('#tmOpSave').onclick=()=>{r.carrier=o.querySelector('#tmOpCarrier').value;r.carrierAmt=+(o.querySelector('#tmOpAmount').value||0);r.downPayment=r.downPayment||r.carrierAmt;r.carrierDue=o.querySelector('#tmOpDue').value;r.note=o.querySelector('#tmOpNote').value;const complete=!!r.carrier&&!!r.carrierDue;let st=o.querySelector('#tmOpStatus').value;if(!complete&&st!=='Pagado'&&st!=='No aplica')st='Pendiente de completar';if(complete&&st==='Pendiente de completar')st='Pendiente';r.carrierStatus=st;r.carrierNeedsCompletion=!complete&&st!=='Pagado'&&st!=='No aplica';ensureCarrierTask(r);store();o.remove();render();alert(complete?'Carrier/PFA actualizado correctamente.':'Guardado. Aún falta completar Carrier o fecha límite.');};
  };

  function renderCarrierOperational(){const body=$('carBody');if(!body)return;const table=body.closest('table');const hr=table?.querySelector('thead tr');if(hr)hr.innerHTML='<th>Cliente</th><th>Invoice</th><th>Carrier/PFA</th><th>Monto</th><th>Fecha límite</th><th>Estado</th><th>Acción</th>';const rows=(S.r||[]).filter(r=>(+r.carrierAmt||+r.downPayment)>0);body.innerHTML=rows.map(r=>{const incomplete=!(r.carrier&&r.carrierDue)&&r.carrierStatus!=='Pagado';const status=incomplete?'Pendiente de completar':(r.carrierStatus||'Pendiente');return `<tr><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td>${esc(r.carrier||'—')}</td><td><b>${fmt(r.carrierAmt||r.downPayment)}</b></td><td>${esc(r.carrierDue||'—')}</td><td><span class="badge ${status==='Pagado'?'ok':incomplete?'tm-pending-complete':'proc'}">${esc(status)}</span></td><td><button class="btn soft" onclick="tmEditCarrierObligation('${r.id}')">${incomplete?'Completar':'Editar'}</button></td></tr>`;}).join('')||'<tr><td colspan="7">Sin obligaciones</td></tr>';}

  const priorRender=window.render;if(typeof priorRender==='function')window.render=function(){priorRender();setTimeout(renderCarrierOperational,140);};
  addStyle();setTimeout(()=>{ensureDownPaymentField();simplifyCarrierSection();renderCarrierOperational();},350);
})();