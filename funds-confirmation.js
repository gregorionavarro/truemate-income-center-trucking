(() => {
  if (window.__tmFundsConfirmationLoaded) return;
  window.__tmFundsConfirmationLoaded = true;

  const OWNER_EMAIL='gregorio.navarro@truemategroup.com';
  const FEATURE_START='2026-10-01';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const fmtDate=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})};
  const companyName=r=>String(r?.company||'').trim()||String(r?.client||'').trim()||'—';
  let currentUser={email:'',name:'Usuario',isOwner:false};

  async function loadIdentity(){
    try{
      const r=await fetch('/api/whoami',{cache:'no-store'});
      if(r.ok){const x=await r.json();currentUser.email=String(x.email||'').toLowerCase();currentUser.isOwner=x.isOwner===true;}
    }catch(_){ }
    if(currentUser.email===OWNER_EMAIL){currentUser.isOwner=true;currentUser.name='Gregorio Navarro';}
    else if(currentUser.email){const local=currentUser.email.split('@')[0].replace(/[._-]+/g,' ');currentUser.name=local.replace(/\b\w/g,c=>c.toUpperCase());}
  }

  function getRows(){
    try{return (typeof S!=='undefined'&&Array.isArray(S.r))?S.r:[]}catch(_){return[]}
  }
  function pendingRows(){return getRows().filter(r=>String(r?.fundsStatus||'').toLowerCase()==='pendiente de confirmar').slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))}
  function persist(){try{if(typeof store==='function')store();localStorage.setItem('tmic_r',JSON.stringify(getRows()));return true}catch(e){console.error(e);return false}}

  function stampPending(r){
    if(!r||r.fundsStatus)return false;
    r.fundsStatus='Pendiente de confirmar';
    r.fundsRecordedAt=new Date().toISOString();
    r.fundsRecordedBy=currentUser.name||'Usuario';
    return true;
  }

  // Desde octubre 2026 todo ingreso nuevo debe pasar por confirmación de fondos.
  // Esto también recupera registros creados mientras el wrapper de save no alcanzó a ejecutarse.
  function adoptNewEraRecords(){
    let changed=false;
    for(const r of getRows()){
      const d=String(r?.date||'');
      if(d>=FEATURE_START && !r?.fundsStatus) changed=stampPending(r)||changed;
    }
    if(changed){persist();try{window.dispatchEvent(new Event('tm-state-updated'));window.tmRefreshSummaryWorkflow?.();}catch(_){ }}
    return changed;
  }

  function preserveFunds(oldRec,newRec){
    if(!oldRec||!newRec)return;
    ['fundsStatus','fundsRecordedAt','fundsRecordedBy','fundsConfirmedAt','fundsConfirmedBy','fundsReference'].forEach(k=>{if(oldRec[k]!==undefined)newRec[k]=oldRec[k];});
  }

  const baseSave=window.save;
  if(typeof baseSave==='function'){
    window.save=function(){
      const editingId=(typeof edit!=='undefined'&&edit)?String(edit):'';
      const before=editingId?getRows().find(r=>String(r.id)===editingId):null;
      const beforeIds=new Set(getRows().map(r=>String(r.id)));
      const out=baseSave.apply(this,arguments);
      const rows=getRows();
      if(editingId){
        const after=rows.find(r=>String(r.id)===editingId);preserveFunds(before,after);
      }else{
        const created=rows.slice().reverse().find(r=>!beforeIds.has(String(r.id)));
        if(created&&!created.fundsStatus) stampPending(created);
      }
      persist();
      try{window.dispatchEvent(new Event('tm-state-updated'));window.tmRefreshSummaryWorkflow?.();}catch(_){ }
      return out;
    };
  }

  function style(){
    if(document.getElementById('tm-funds-style'))return;
    const s=document.createElement('style');s.id='tm-funds-style';s.textContent=`
      #tmFundsCard{border-color:#ead79c!important;background:#fffdf8!important}
      #tmFundsCard .tm-funds-badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:#fff1c9;color:#8b6507;font-size:11px;font-weight:900}
      #tmFundsCard .tm-owner-only{font-size:11px;color:#6d7d92;font-weight:800}
      .tm-funds-overlay{position:fixed;inset:0;background:rgba(16,32,52,.48);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}
      .tm-funds-modal{width:min(520px,100%);background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(17,53,90,.28);overflow:hidden}
      .tm-funds-h{padding:18px 20px;border-bottom:1px solid #d9e3ee}.tm-funds-h h3{margin:0;color:#173f69}.tm-funds-b{padding:20px}.tm-funds-b .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}.tm-funds-b small{display:block;color:#6d7d92;font-weight:800;text-transform:uppercase;font-size:10px;margin-bottom:4px}.tm-funds-b b{color:#20324d}.tm-funds-b input{width:100%;border:1px solid #d9e3ee;border-radius:9px;padding:10px;margin-top:5px}.tm-funds-f{padding:15px 20px;border-top:1px solid #d9e3ee;display:flex;justify-content:flex-end;gap:8px}
      .tm-funds-toast{position:fixed;right:24px;bottom:24px;z-index:100000;background:#fff;border:1px solid #cfe3d8;border-radius:14px;box-shadow:0 16px 45px rgba(17,53,90,.22);padding:14px 16px;color:#176b49;font-weight:900}
    `;document.head.appendChild(s);
  }
  function toast(msg){let t=document.querySelector('.tm-funds-toast');if(t)t.remove();t=document.createElement('div');t.className='tm-funds-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3200)}

  window.tmOpenFundsConfirm=async function(id){
    await loadIdentity();
    if(!currentUser.isOwner){toast('Solo Gregorio Navarro puede confirmar la recepción de fondos.');return;}
    const r=getRows().find(x=>String(x.id)===String(id));if(!r)return;
    document.querySelector('.tm-funds-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-funds-overlay';
    o.innerHTML=`<div class="tm-funds-modal"><div class="tm-funds-h"><h3>Confirmar fondos recibidos</h3></div><div class="tm-funds-b"><div class="row"><div><small>Empresa / cliente</small><b>${esc(companyName(r))}</b></div><div><small>Invoice</small><b>${esc(r.invoice||'')}</b></div><div><small>Método</small><b>${esc(r.method||'—')}</b></div><div><small>Monto</small><b>${fmt(r.gross)}</b></div></div><small>Referencia bancaria / nota (opcional)</small><input id="tmFundsRef" placeholder="Ej. Zelle recibido, ACH 1234, Stripe payout..."></div><div class="tm-funds-f"><button class="btn soft" id="tmFundsCancel">Cancelar</button><button class="btn navy" id="tmFundsConfirm">Confirmar recibido</button></div></div>`;
    document.body.appendChild(o);o.querySelector('#tmFundsCancel').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});
    o.querySelector('#tmFundsConfirm').onclick=()=>{
      r.fundsStatus='Confirmado';r.fundsConfirmedAt=new Date().toISOString();r.fundsConfirmedBy='Gregorio Navarro';r.fundsReference=String(o.querySelector('#tmFundsRef')?.value||'').trim();
      persist();o.remove();toast('Fondos confirmados correctamente.');
      try{window.dispatchEvent(new Event('tm-state-updated'));window.tmRefreshSummaryWorkflow?.();if(typeof render==='function')render();}catch(_){ }
    };
  };

  function renderCard(){
    adoptNewEraRecords();
    style();const grid=document.querySelector('#summary .grid2');if(!grid)return;
    let card=document.getElementById('tmFundsCard');const recent=document.getElementById('tmRecentStableCard');const review=document.getElementById('tmReviewQueueCard');
    if(!card){card=document.createElement('div');card.id='tmFundsCard';card.className='card box';if(review&&review.parentNode===grid)grid.insertBefore(card,review);else if(recent?.nextSibling)grid.insertBefore(card,recent.nextSibling);else grid.appendChild(card);}
    const rows=pendingRows();
    card.innerHTML=`<div class="head"><div><h3>Ingresos pendientes de confirmar</h3><div class="sub" style="display:block!important">Pagos registrados por el equipo que todavía deben ser validados contra Zelle, ACH, Stripe, Wire, Check u otro medio.</div></div><span class="tm-owner-only">Confirmación final: Gregorio Navarro</span></div><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Método</th><th>Monto</th><th>Registrado por</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${rows.length?rows.slice(0,12).map(r=>`<tr><td>${fmtDate(r.date)}</td><td><b>${esc(companyName(r))}</b></td><td>${esc(r.invoice||'')}</td><td>${esc(r.method||'')}</td><td><b>${fmt(r.gross)}</b></td><td>${esc(r.fundsRecordedBy||'Equipo')}</td><td><span class="tm-funds-badge">Pendiente de confirmar</span></td><td>${currentUser.isOwner?`<button class="btn navy" onclick="tmOpenFundsConfirm('${esc(r.id)}')">Confirmar recibido</button>`:'<span class="tm-owner-only">Pendiente Owner</span>'}</td></tr>`).join(''):'<tr><td colspan="8" style="color:#6d7d92">No hay ingresos pendientes de confirmar.</td></tr>'}</tbody></table></div>`;
    if(review&&card.nextSibling!==review)grid.insertBefore(card,review);
  }

  window.tmRefreshFundsConfirmation=renderCard;
  window.addEventListener('tm-state-updated',()=>setTimeout(renderCard,80));
  window.addEventListener('storage',e=>{if(e.key==='tmic_r')setTimeout(renderCard,80)});
  setInterval(renderCard,900);
  loadIdentity().finally(()=>{adoptNewEraRecords();setTimeout(renderCard,120)});
})();