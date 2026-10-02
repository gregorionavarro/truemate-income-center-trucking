(() => {
  if (window.__tmDeferredIncomeFixLoaded) return;
  window.__tmDeferredIncomeFixLoaded = true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const dayDiff=d=>{if(!d)return 9999;const x=new Date(d+'T12:00:00'),n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12);return Math.ceil((x-t)/86400000)};
  const rowsAll=()=>{try{return (typeof S!=='undefined'&&S&&Array.isArray(S.r))?S.r:[]}catch(_){return[]}};

  function reconcileRecord(r){
    if(!Array.isArray(r.deferredPlan)||!r.deferredPlan.length) return;
    const remaining=r.deferredPlan.reduce((a,p)=>a+(+(p.remaining ?? 0)||0),0);
    if(remaining<=0){
      r.pending=0;r.defAmt=0;r.defDate='';
      r.deferredPlan.forEach(p=>{p.remaining=0;p.status='Pagado';});
      return;
    }
    r.pending=remaining;
    const next=r.deferredPlan.find(p=>(+(p.remaining??0)||0)>0);
    if(next){r.defDate=next.date||'';r.defAmt=+(next.remaining||0);}
  }

  function deferredRows(){
    const out=[];
    rowsAll().forEach(r=>{
      if(r.isDeferredPayment) return;
      if(Array.isArray(r.deferredPlan)&&r.deferredPlan.length){
        reconcileRecord(r);
        if((+r.pending||0)<=0) return;
        r.deferredPlan.forEach((p,i)=>{
          const rem=+(p.remaining ?? 0)||0;
          const status=String(p.status||'Pendiente').toLowerCase();
          if(rem>0 && status!=='pagado') out.push({r,p,index:i,date:p.date||r.defDate||'',amount:rem,planId:p.id||''});
        });
      }else{
        const rem=+(r.pending||0)||0;
        if(rem>0 && r.defDate) out.push({r,p:null,index:0,date:r.defDate,amount:rem,planId:''});
      }
    });
    return out.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
  }

  function status(d){const n=dayDiff(d);if(n<0)return ['Vencido','late'];if(n===0)return ['Hoy','late'];if(n<=7)return [`${n} día${n===1?'':'s'}`,'proc'];return ['Pendiente','proc']}

  function persistDeferred(){try{if(typeof store==='function')store();localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));if(Array.isArray(S.t))localStorage.setItem('tmic_t',JSON.stringify(S.t));return true}catch(e){console.error(e);return false}}

  window.tmDeleteDeferredSchedule=function(id,planId,index){
    const r=rowsAll().find(x=>String(x.id)===String(id));if(!r)return;
    const item=deferredRows().find(x=>String(x.r.id)===String(id)&&(planId?String(x.planId)===String(planId):x.index===+index));if(!item)return;
    document.querySelector('.tm-def-delete-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-def-delete-overlay';
    o.innerHTML=`<div class="tm-def-delete-card"><h3>Eliminar cobro diferido</h3><p><b>${esc(r.client||r.company||'Cliente')}</b> · ${esc(r.invoice||'')} · ${fmt(item.amount)}</p><p>Se eliminará únicamente esta programación de cobro. El ingreso original y su historial se conservan.</p><div><button class="tm-def-cancel" type="button">Cancelar</button><button class="tm-def-confirm" type="button">Eliminar diferido</button></div></div>`;
    document.body.appendChild(o);
    o.querySelector('.tm-def-cancel').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});
    o.querySelector('.tm-def-confirm').onclick=()=>{
      if(Array.isArray(r.deferredPlan)&&r.deferredPlan.length){
        if(planId)r.deferredPlan=r.deferredPlan.filter(p=>String(p.id||'')!==String(planId));else r.deferredPlan.splice(+index,1);
        if(Array.isArray(S.t)&&planId)S.t=S.t.filter(t=>String(t.planId||'')!==String(planId));
        if(r.deferredPlan.length)reconcileRecord(r);else{r.pending=0;r.defAmt=0;r.defDate='';}
      }else{r.pending=0;r.defAmt=0;r.defDate='';}
      if(persistDeferred()){
        o.remove();
        try{if(typeof render==='function')render();}catch(_){}
        setTimeout(renderDeferred,180);
        if(typeof window.tmNotice==='function')window.tmNotice('La programación diferida fue eliminada. El ingreso original se conservó.','Diferido eliminado','success');
      }else if(typeof window.tmNotice==='function')window.tmNotice('No se pudo guardar el cambio.','Diferido','error');
    };
  };

  function ensureDeleteStyle(){if(document.getElementById('tm-def-delete-style'))return;const s=document.createElement('style');s.id='tm-def-delete-style';s.textContent=`.tm-def-delete{background:#fff0f2!important;color:#b33148!important;border:1px solid #f3c3cb!important}.tm-def-delete-overlay{position:fixed;inset:0;background:rgba(16,32,52,.48);z-index:120000;display:flex;align-items:center;justify-content:center;padding:20px}.tm-def-delete-card{width:min(480px,100%);background:#fff;border-radius:16px;padding:22px;box-shadow:0 24px 70px rgba(17,53,90,.28)}.tm-def-delete-card h3{margin:0 0 10px;color:#173f69}.tm-def-delete-card p{color:#5f7185;line-height:1.5}.tm-def-delete-card>div{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.tm-def-delete-card button{border:0;border-radius:10px;padding:10px 14px;font-weight:900;cursor:pointer}.tm-def-cancel{background:#edf4fb;color:#173f69}.tm-def-confirm{background:#fff0f2;color:#b33148;border:1px solid #f3c3cb!important}`;document.head.appendChild(s)}

  function renderDeferred(){
    ensureDeleteStyle();
    const body=document.getElementById('defBody'); if(!body)return;
    const table=body.closest('table'); if(!table)return;
    const hr=table.querySelector('thead tr');
    if(hr) hr.innerHTML='<th>Cliente</th><th>Invoice</th><th>Fecha</th><th>Monto</th><th>Estado</th><th>Acción</th>';
    const rows=deferredRows();
    body.innerHTML=rows.map(x=>{const [txt,cls]=status(x.date);const inv=String(x.r.invoice||'').replace(/'/g,"\\'");const pid=String(x.planId||'').replace(/'/g,"\\'");return `<tr><td>${esc(x.r.client||'')}</td><td><button class="tm-link" onclick="tmInvoiceDetail('${inv}')">${esc(x.r.invoice||'')}</button></td><td>${esc(x.date||'—')}</td><td><b>${fmt(x.amount)}</b></td><td><span class="badge ${cls}">${txt}</span></td><td><div class="tm-actions"><button class="tm-mini green" onclick="tmRegisterDeferredPayment('${x.r.id}'${x.planId?`, '${pid}'`:''})">Registrar pago</button><button class="tm-mini amber" onclick="tmReprogram('${x.r.id}')">Reprogramar</button><button class="tm-mini" onclick="tmInvoiceDetail('${inv}')">Ver factura</button><button class="tm-mini tm-def-delete" onclick="tmDeleteDeferredSchedule('${x.r.id}','${pid}',${x.index})">Eliminar</button></div></td></tr>`}).join('')||'<tr><td colspan="6">Sin diferidos pendientes</td></tr>';
    const near=document.getElementById('nearDef');
    if(near) near.textContent=rows.filter(x=>dayDiff(x.date)<=7).length;
  }

  function deferredPopup(){
    const rows=deferredRows().filter(x=>dayDiff(x.date)<=7);
    document.querySelector('.tm-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-overlay';
    o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>Diferidos próximos / vencidos</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b"><div class="tablewrap"><table><thead><tr><th>Cliente</th><th>Invoice</th><th>Fecha</th><th>Monto</th><th>Acción</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.r.client||'')}</td><td>${esc(x.r.invoice||'')}</td><td>${esc(x.date||'')}</td><td><b>${fmt(x.amount)}</b></td><td><button class="tm-mini green" onclick="tmRegisterDeferredPayment('${x.r.id}'${x.planId?`, '${String(x.planId).replace(/'/g,"\\'")}'`:''})">Registrar pago</button></td></tr>`).join('')||'<tr><td colspan="5">No hay diferidos próximos o vencidos.</td></tr>'}</tbody></table></div></div></div>`;
    o.querySelector('.tm-close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});document.body.appendChild(o);
  }

  function bindDeferredAlert(){
    const alert=document.getElementById('nearDef')?.closest('.alert');
    if(!alert)return;
    alert.dataset.tmclick='1';
    alert.classList.add('tm-clickcard');alert.title='Ver diferidos próximos / vencidos';alert.onclick=deferredPopup;
  }

  function ensureIncomeDelete(){
    const body=document.getElementById('incomeBody'); if(!body)return;
    body.querySelectorAll('button[onclick^="openModal("]').forEach(edit=>{
      const cell=edit.closest('td'); if(!cell||cell.querySelector('.tm-delete'))return;
      const m=(edit.getAttribute('onclick')||'').match(/openModal\('([^']+)'\)/); if(!m)return;
      const del=document.createElement('button');del.type='button';del.className='btn danger tm-delete';del.textContent='Eliminar';del.onclick=()=>window.deleteIncome?.(m[1]);cell.appendChild(del);
    });
  }

  function apply(){try{renderDeferred();bindDeferredAlert();ensureIncomeDelete()}catch(e){console.error('TrueMate deferred/income fix',e)}}
  const prior=window.render;if(typeof prior==='function')window.render=function(){prior();setTimeout(apply,180)};
  const obs=new MutationObserver(()=>setTimeout(apply,50));
  const start=()=>{const d=document.getElementById('defBody'),i=document.getElementById('incomeBody');if(d)obs.observe(d,{childList:true});if(i)obs.observe(i,{childList:true});apply();};
  setTimeout(start,300);
})();