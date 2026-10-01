(() => {
  const addStyles = () => {
    if (document.getElementById('tm-delete-style')) return;
    const st = document.createElement('style');
    st.id = 'tm-delete-style';
    st.textContent = `.btn.danger{background:#fff0f2;color:#a72f43;border:1px solid #f2c9d0;margin-left:6px}.btn.danger:hover{background:#ffe2e7}.tm-del-confirm{position:fixed;inset:0;background:rgba(17,39,65,.52);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px}.tm-del-box{width:min(560px,100%);background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(15,49,84,.28);overflow:hidden}.tm-del-head{padding:18px 20px;border-bottom:1px solid #e4ebf2;display:flex;align-items:center;justify-content:space-between}.tm-del-head h3{margin:0;color:#173f69;font-size:19px}.tm-del-head button{border:0;background:transparent;font-size:24px;color:#6d7d92;cursor:pointer}.tm-del-body{padding:20px;color:#43566d;line-height:1.55}.tm-del-label{margin:14px 0;padding:12px 14px;border-radius:12px;background:#f7f9fc;border:1px solid #e2eaf2;font-weight:800;color:#203d60}.tm-del-warn{font-size:12px;color:#a23d4c}.tm-del-foot{padding:15px 20px;border-top:1px solid #e4ebf2;display:flex;justify-content:flex-end;gap:10px}`;
    document.head.appendChild(st);
  };

  function toast(msg){
    if(typeof window.tmNotify==='function'){try{return window.tmNotify('success','Listo',msg)}catch(_){}}
    let x=document.getElementById('tm-delete-toast');
    if(!x){x=document.createElement('div');x.id='tm-delete-toast';x.style.cssText='position:fixed;right:22px;top:22px;z-index:99999;background:#fff;color:#173f69;border:1px solid #cfe3d8;padding:12px 16px;border-radius:12px;font-weight:800;box-shadow:0 12px 28px rgba(0,0,0,.16)';document.body.appendChild(x)}
    x.textContent=msg;x.style.display='block';clearTimeout(x._t);x._t=setTimeout(()=>x.style.display='none',2600);
  }

  function confirmDelete(label,onAccept){
    document.querySelector('.tm-del-confirm')?.remove();
    const o=document.createElement('div');o.className='tm-del-confirm';
    o.innerHTML=`<div class="tm-del-box"><div class="tm-del-head"><h3>Eliminar ingreso</h3><button type="button" aria-label="Cerrar">×</button></div><div class="tm-del-body">¿Confirmas que deseas eliminar este ingreso?<div class="tm-del-label"></div><div class="tm-del-warn">También se eliminarán las tareas automáticas relacionadas con este invoice. Esta acción no se puede deshacer.</div></div><div class="tm-del-foot"><button class="btn soft" type="button" data-cancel>Cancelar</button><button class="btn danger" type="button" data-ok>Eliminar ingreso</button></div></div>`;
    o.querySelector('.tm-del-label').textContent=label;
    const close=()=>o.remove();o.querySelector('.tm-del-head button').onclick=close;o.querySelector('[data-cancel]').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelector('[data-ok]').onclick=()=>{close();onAccept();};document.body.appendChild(o);
  }

  window.deleteIncome = function(id){
    const rows=(typeof S!=='undefined'&&Array.isArray(S.r))?S.r:[];
    const tasks=(typeof S!=='undefined'&&Array.isArray(S.t))?S.t:[];
    const rec = rows.find(x => String(x.id) === String(id));
    if (!rec){toast('No encontré este ingreso. Actualiza la página e intenta de nuevo.');return;}
    const label = `${rec.company||rec.client||'Cliente'} · ${rec.invoice||'Sin invoice'} · ${typeof money==='function'?money(rec.gross||0):'$'+(+rec.gross||0).toFixed(2)}`;
    confirmDelete(label,()=>{
      const newRows=rows.filter(x=>String(x.id)!==String(id));
      const newTasks=tasks.filter(t=>!(t.auto && String(t.invoice||'')===String(rec.invoice||'')));
      try{
        S.r.length=0;newRows.forEach(x=>S.r.push(x));S.t.length=0;newTasks.forEach(x=>S.t.push(x));
        localStorage.setItem('tmic_r',JSON.stringify(S.r));localStorage.setItem('tmic_t',JSON.stringify(S.t));if(typeof store==='function')store();
      }catch(e){console.error('Error guardando eliminación',e);toast('No se pudo guardar la eliminación.');return;}
      toast('Ingreso eliminado correctamente.');
      try{if(typeof render==='function')render();window.tmRefreshRecentMovements?.();window.tmRefreshReviewQueue?.();window.tmRefreshGlobalCarrierCard?.();}catch(_){ }
    });
  };

  function decorateTable(tbodyId){
    const body=document.getElementById(tbodyId);if(!body)return;
    body.querySelectorAll('button[onclick^="openModal("]').forEach(editBtn=>{const cell=editBtn.closest('td');if(!cell||cell.querySelector('.tm-delete'))return;const raw=editBtn.getAttribute('onclick')||'';const m=raw.match(/openModal\('([^']+)'\)/);if(!m)return;const del=document.createElement('button');del.className='btn danger tm-delete';del.type='button';del.textContent='Eliminar';del.onclick=()=>window.deleteIncome(m[1]);cell.appendChild(del);});
  }
  function decorate(){addStyles();decorateTable('recent');decorateTable('incomeBody');}
  const obs=new MutationObserver(()=>setTimeout(decorate,30));
  setTimeout(()=>{const a=document.getElementById('recent'),b=document.getElementById('incomeBody');if(a)obs.observe(a,{childList:true});if(b)obs.observe(b,{childList:true});decorate();},150);
})();