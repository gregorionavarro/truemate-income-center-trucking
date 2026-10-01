(() => {
  if(window.__tmCarrierDeleteToolsLoaded)return;
  window.__tmCarrierDeleteToolsLoaded=true;

  const OWNER_EMAIL='gregorio.navarro@truemategroup.com';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let owner=false;

  async function loadIdentity(){
    try{const r=await fetch('/cdn-cgi/access/get-identity',{cache:'no-store'});if(!r.ok)return;const x=await r.json();const e=String(x.email||x.user?.email||'').toLowerCase();owner=e===OWNER_EMAIL;}catch(_){}
  }
  loadIdentity();

  function ensureStyle(){
    if(document.getElementById('tm-carrier-delete-style'))return;
    const s=document.createElement('style');s.id='tm-carrier-delete-style';s.textContent=`
      .tm-carrier-delete{margin-left:6px;border:1px solid #f0c4ca;background:#fff1f3;color:#a82f43;border-radius:9px;padding:8px 11px;font-weight:900;cursor:pointer}.tm-carrier-delete:hover{background:#ffe8ec}
      .tm-del-overlay{position:fixed;inset:0;background:rgba(16,32,52,.48);z-index:13000;display:flex;align-items:center;justify-content:center;padding:18px}.tm-del-card{width:min(520px,100%);background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(16,32,52,.3);padding:22px}.tm-del-card h3{margin:0;color:#173f69}.tm-del-card p{color:#5f7185;line-height:1.5}.tm-del-info{background:#f7f9fc;border:1px solid #dce5ee;border-radius:12px;padding:12px;color:#314d6a}.tm-del-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}.tm-del-actions button{border:0;border-radius:10px;padding:10px 14px;font-weight:900;cursor:pointer}.tm-del-cancel{background:#edf4fb;color:#174675}.tm-del-carrier{background:#fff3d4;color:#8c6810}.tm-del-all{background:#b9344d;color:#fff}
    `;document.head.appendChild(s);
  }

  function refreshNow(){
    try{window.tmRefreshCarrierTable?.();}catch(_){}
    try{window.tmRefreshRecentMovements?.();}catch(_){}
    try{window.tmRefreshSummaryPayments?.();}catch(_){}
    setTimeout(()=>{try{window.tmRefreshCarrierTable?.();window.tmRefreshRecentMovements?.();window.tmRefreshSummaryPayments?.();}catch(_){}},120);
  }

  function persist(){
    try{
      localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));
      localStorage.setItem('tmic_t',JSON.stringify(S.t||[]));
    }catch(e){
      console.error('Error guardando eliminación en localStorage',e);
      window.tmNotice?.('No se pudo guardar la eliminación.','No se pudo completar','error');
      return false;
    }
    try{if(typeof store==='function')store();}catch(e){console.warn('store() después de eliminar',e);}
    try{if(typeof render==='function')render();}catch(e){console.warn('render() después de eliminar',e);}
    refreshNow();
    return true;
  }

  function modalFor(r){
    ensureStyle();document.querySelector('.tm-del-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-del-overlay';
    o.innerHTML=`<div class="tm-del-card"><h3>Eliminar registro</h3><p>Selecciona qué deseas borrar. Para evitar perder ingresos reales, puedes eliminar solo la obligación de Carrier/PFA o eliminar todo el ingreso.</p><div class="tm-del-info"><b>${esc(r.client||'Sin cliente')}</b><br>Invoice: ${esc(r.invoice||'—')} · Carrier: ${esc(r.carrier||'—')}</div><div class="tm-del-actions"><button class="tm-del-cancel">Cancelar</button><button class="tm-del-carrier">Eliminar solo Carrier/PFA</button><button class="tm-del-all">Eliminar ingreso completo</button></div></div>`;
    document.body.appendChild(o);
    o.querySelector('.tm-del-cancel').onclick=()=>o.remove();
    o.addEventListener('click',e=>{if(e.target===o)o.remove();});
    o.querySelector('.tm-del-carrier').onclick=()=>{
      const inv=r.invoice;
      r.downPayment=0;r.carrierAmt=0;r.carrier='';r.carrierDue='';r.carrierStatus='No aplica';r.carrierPaidDate='';r.carrierPaidAt='';r.carrierPaidBy='';r.carrierPaidEmail='';r.carrierReviewedAt='';r.carrierReviewedBy='';r.carrierReviewedEmail='';r.carrierPreparedAt='';r.carrierPreparedBy='';r.carrierPreparedEmail='';r.carrierNeedsCompletion=false;r.carrierAssignedTo='';r.carrierAssignedEmail='';
      S.t=(S.t||[]).filter(t=>String(t.carrierSetupInvoice||'')!==String(inv||''));
      if(persist()){o.remove();window.tmNotice?.('Se eliminó la obligación de Carrier/PFA. El ingreso se conservó.','Carrier/PFA eliminado','success');}
    };
    o.querySelector('.tm-del-all').onclick=()=>{
      const id=String(r.id),inv=String(r.invoice||'');
      S.r=(S.r||[]).filter(x=>String(x.id)!==id);
      S.t=(S.t||[]).filter(t=>String(t.invoice||'')!==inv&&String(t.carrierSetupInvoice||'')!==inv);
      if(persist()){o.remove();window.tmNotice?.('Se eliminó el ingreso completo y sus pendientes asociados.','Registro eliminado','success');}
    };
  }

  window.tmDeleteCarrierRecord=function(id){
    if(!owner)return window.tmNotice?.('Solo el Owner puede eliminar registros desde Carrier/PFA.','Acceso restringido','warning');
    const r=(S.r||[]).find(x=>String(x.id)===String(id));if(!r)return window.tmNotice?.('No encontré este registro.','No se pudo completar','error');
    modalFor(r);
  };

  function enhance(){
    if(!owner)return;
    ensureStyle();
    const body=document.getElementById('carBody');if(!body)return;
    [...body.querySelectorAll('tr')].forEach(tr=>{
      const cells=[...tr.cells];if(!cells.length)return;
      const action=cells[cells.length-1];if(!action||action.querySelector('.tm-carrier-delete'))return;
      const open=action.querySelector('button[onclick*="tmEditCarrierObligation"]');
      const m=open?.getAttribute('onclick')?.match(/tmEditCarrierObligation\('([^']+)'\)/);if(!m)return;
      const b=document.createElement('button');b.className='tm-carrier-delete';b.type='button';b.textContent='Eliminar';b.onclick=()=>window.tmDeleteCarrierRecord(m[1]);action.appendChild(b);
    });
  }

  const prevRefresh=window.tmRefreshCarrierTable;
  if(typeof prevRefresh==='function')window.tmRefreshCarrierTable=function(){prevRefresh();setTimeout(enhance,20);};
  setInterval(enhance,1200);
  setTimeout(enhance,500);
})();