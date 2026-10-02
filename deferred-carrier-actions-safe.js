(() => {
  if (window.__tmDeferredCarrierActionsSafe) return;
  window.__tmDeferredCarrierActionsSafe = true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const rows=()=>{try{return (typeof S!=='undefined'&&S&&Array.isArray(S.r))?S.r:[]}catch(_){return[]}};

  function persist(){
    try{
      if(typeof store==='function') store();
      localStorage.setItem('tmic_r',JSON.stringify(rows()));
      if(typeof S!=='undefined'&&S&&Array.isArray(S.t)) localStorage.setItem('tmic_t',JSON.stringify(S.t));
      return true;
    }catch(e){console.error(e);return false;}
  }
  function notice(msg,title='TrueMate',type='success'){
    if(typeof window.tmNotice==='function') window.tmNotice(msg,title,type);
  }

  function deferredItems(){
    const out=[];
    rows().forEach(r=>{
      if(r.isDeferredPayment) return;
      if(Array.isArray(r.deferredPlan)&&r.deferredPlan.length){
        r.deferredPlan.forEach((p,i)=>{
          const rem=+(p.remaining??0)||0;
          if(rem>0&&String(p.status||'Pendiente').toLowerCase()!=='pagado') out.push({r,p,index:i,planId:String(p.id||''),date:p.date||r.defDate||'',amount:rem});
        });
      }else if((+r.pending||0)>0&&r.defDate){
        out.push({r,p:null,index:0,planId:'',date:r.defDate,amount:+r.pending||0});
      }
    });
    return out.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
  }

  function reconcile(r){
    if(!Array.isArray(r.deferredPlan)||!r.deferredPlan.length){
      if((+r.pending||0)<=0){r.pending=0;r.defDate='';r.defAmt=0;}
      return;
    }
    const open=r.deferredPlan.filter(p=>(+(p.remaining??0)||0)>0&&String(p.status||'').toLowerCase()!=='pagado');
    r.pending=open.reduce((a,p)=>a+(+(p.remaining??0)||0),0);
    const next=open.slice().sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')))[0];
    r.defDate=next?.date||'';
    r.defAmt=next?+(next.remaining||0):0;
  }

  function confirmDelete(item){
    document.querySelector('.tm-safe-confirm')?.remove();
    const o=document.createElement('div');o.className='tm-safe-confirm';
    o.innerHTML=`<div class="tm-safe-card"><h3>Eliminar cobro diferido</h3><p><b>${esc(item.r.client||item.r.company||'Cliente')}</b> · ${esc(item.r.invoice||'')} · ${money(item.amount)}</p><p>Se eliminará <b>solo esta programación de cobro</b>. El ingreso original y su historial se conservan.</p><div><button class="tm-safe-cancel">Cancelar</button><button class="tm-safe-delete">Eliminar diferido</button></div></div>`;
    document.body.appendChild(o);
    o.querySelector('.tm-safe-cancel').onclick=()=>o.remove();
    o.addEventListener('click',e=>{if(e.target===o)o.remove()});
    o.querySelector('.tm-safe-delete').onclick=()=>{deleteDeferred(item);o.remove();};
  }

  function deleteDeferred(item){
    const r=rows().find(x=>String(x.id)===String(item.r.id));if(!r)return;
    if(Array.isArray(r.deferredPlan)&&r.deferredPlan.length){
      if(item.planId) r.deferredPlan=r.deferredPlan.filter(p=>String(p.id||'')!==item.planId);
      else r.deferredPlan.splice(item.index,1);
      reconcile(r);
      try{if(typeof S!=='undefined'&&Array.isArray(S.t)&&item.planId)S.t=S.t.filter(t=>String(t.planId||'')!==item.planId);}catch(_){}
    }else{
      r.pending=0;r.defDate='';r.defAmt=0;
    }
    if(!persist()){notice('No se pudo guardar el cambio.','Diferido','error');return;}
    try{if(typeof render==='function')render();}catch(_){}
    setTimeout(()=>{try{window.tmRefreshDeferred?.();}catch(_){} patchDeferred();},180);
    notice('La programación diferida fue eliminada. El ingreso original se conservó.','Diferido eliminado','success');
  }

  function patchDeferred(){
    const body=document.getElementById('defBody');if(!body)return;
    const items=deferredItems();
    [...body.querySelectorAll('tr')].forEach(tr=>{
      if(tr.querySelector('.tm-safe-def-delete'))return;
      const tds=tr.querySelectorAll('td');if(tds.length<6)return;
      const inv=(tds[1]?.textContent||'').trim(),date=(tds[2]?.textContent||'').trim();
      const item=items.find(x=>String(x.r.invoice||'').trim()===inv&&String(x.date||'').trim()===date);
      if(!item)return;
      const box=tds[5].querySelector('.tm-actions')||tds[5];
      const b=document.createElement('button');b.type='button';b.className='tm-mini tm-safe-def-delete';b.textContent='Eliminar';b.onclick=()=>confirmDelete(item);box.appendChild(b);
    });
  }

  function enhanceCarrierPopup(id){
    const r=rows().find(x=>String(x.id)===String(id));if(!r)return;
    const pay=document.querySelector('.tm-overlay .tm-flex-pay');if(!pay||pay.querySelector('#tmSafePaidMethod'))return;
    const method=document.createElement('div');
    method.innerHTML=`<label>Método de pago al Carrier</label><select id="tmSafePaidMethod"><option value="">Seleccionar…</option>${['ACH','Wire','Zelle','Check','Card','Otro'].map(x=>`<option ${String(r.carrierPaidMethod||'')===x?'selected':''}>${x}</option>`).join('')}</select><label>Referencia / confirmación</label><input id="tmSafePaidRef" type="text" value="${esc(r.carrierPaidReference||'')}" placeholder="Ej. confirmación bancaria, check #, referencia">`;
    pay.appendChild(method);
    const overlay=pay.closest('.tm-overlay');if(!overlay||overlay.dataset.tmSafeCarrierBound)return;
    overlay.dataset.tmSafeCarrierBound='1';
    overlay.addEventListener('click',e=>{
      const btn=e.target.closest('#tmFlexPay,#tmFlexSave');if(!btn)return;
      r.carrierPaidMethod=String(overlay.querySelector('#tmSafePaidMethod')?.value||'').trim();
      r.carrierPaidReference=String(overlay.querySelector('#tmSafePaidRef')?.value||'').trim();
      persist();
    },true);
  }

  function wrapCarrier(){
    if(window.__tmSafeCarrierWrapped||typeof window.tmEditCarrierObligation!=='function')return;
    const original=window.tmEditCarrierObligation;
    window.tmEditCarrierObligation=async function(id){const out=await original.apply(this,arguments);setTimeout(()=>enhanceCarrierPopup(id),30);return out;};
    window.__tmSafeCarrierWrapped=true;
  }

  function style(){if(document.getElementById('tm-safe-actions-style'))return;const s=document.createElement('style');s.id='tm-safe-actions-style';s.textContent=`
    .tm-safe-def-delete{background:#fff0f2!important;color:#b33148!important;border:1px solid #f3c3cb!important}
    .tm-safe-confirm{position:fixed;inset:0;background:rgba(16,32,52,.48);z-index:120000;display:flex;align-items:center;justify-content:center;padding:20px}.tm-safe-card{width:min(480px,100%);background:#fff;border-radius:16px;padding:22px;box-shadow:0 24px 70px rgba(17,53,90,.28)}.tm-safe-card h3{margin:0 0 10px;color:#173f69}.tm-safe-card p{color:#5f7185;line-height:1.5}.tm-safe-card>div{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.tm-safe-card button{border:0;border-radius:10px;padding:10px 14px;font-weight:900;cursor:pointer}.tm-safe-cancel{background:#edf4fb;color:#173f69}.tm-safe-delete{background:#fff0f2;color:#b33148;border:1px solid #f3c3cb!important}
    .tm-flex-pay select{width:100%;border:1px solid #d9e3ee;border-radius:9px;padding:9px;background:#fff}
  `;document.head.appendChild(s);}

  function apply(){style();patchDeferred();wrapCarrier();}
  const obs=new MutationObserver(()=>setTimeout(apply,40));
  setTimeout(()=>{const body=document.getElementById('defBody');if(body)obs.observe(body,{childList:true,subtree:true});apply();},450);
  window.addEventListener('tm-state-updated',()=>setTimeout(apply,100));
  setInterval(wrapCarrier,1200);
})();
