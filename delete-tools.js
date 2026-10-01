(() => {
  const addStyles = () => {
    if (document.getElementById('tm-delete-style')) return;
    const st = document.createElement('style');
    st.id = 'tm-delete-style';
    st.textContent = `.btn.danger{background:#fff0f2;color:#a72f43;border:1px solid #f2c9d0;margin-left:6px}.btn.danger:hover{background:#ffe2e7}`;
    document.head.appendChild(st);
  };

  function toast(msg){
    let x=document.getElementById('tm-delete-toast');
    if(!x){x=document.createElement('div');x.id='tm-delete-toast';x.style.cssText='position:fixed;right:22px;top:22px;z-index:99999;background:#173f69;color:#fff;padding:12px 16px;border-radius:12px;font-weight:800;box-shadow:0 12px 28px rgba(0,0,0,.20)';document.body.appendChild(x)}
    x.textContent=msg;x.style.display='block';clearTimeout(x._t);x._t=setTimeout(()=>x.style.display='none',2200);
  }

  window.deleteIncome = function(id){
    const rows=(typeof S!=='undefined'&&Array.isArray(S.r))?S.r:[];
    const tasks=(typeof S!=='undefined'&&Array.isArray(S.t))?S.t:[];
    const rec = rows.find(x => String(x.id) === String(id));
    if (!rec) return alert('No encontré este ingreso. Actualiza la página e intenta de nuevo.');
    const label = `${rec.client || 'Cliente'} · ${rec.invoice || 'Sin invoice'} · ${typeof money==='function'?money(rec.gross||0):'$'+(+rec.gross||0).toFixed(2)}`;
    const ok = confirm(`¿Eliminar este ingreso?\n\n${label}\n\nTambién se eliminarán las tareas automáticas relacionadas con este invoice. Esta acción no se puede deshacer.`);
    if (!ok) return;

    const newRows=rows.filter(x=>String(x.id)!==String(id));
    const newTasks=tasks.filter(t=>!(t.auto && String(t.invoice||'')===String(rec.invoice||'')));

    try{
      S.r.length=0;newRows.forEach(x=>S.r.push(x));
      S.t.length=0;newTasks.forEach(x=>S.t.push(x));
      localStorage.setItem('tmic_r',JSON.stringify(S.r));
      localStorage.setItem('tmic_t',JSON.stringify(S.t));
    }catch(e){
      console.error('Error guardando eliminación',e);
      return alert('No se pudo guardar la eliminación. Intenta nuevamente.');
    }

    toast('Ingreso eliminado correctamente.');
    setTimeout(()=>{ try{ location.reload(); }catch(_){} },350);
  };

  function decorateTable(tbodyId){
    const body = document.getElementById(tbodyId);
    if (!body) return;
    body.querySelectorAll('button[onclick^="openModal("]').forEach(editBtn => {
      const cell = editBtn.closest('td');
      if (!cell || cell.querySelector('.tm-delete')) return;
      const raw = editBtn.getAttribute('onclick') || '';
      const m = raw.match(/openModal\('([^']+)'\)/);
      if (!m) return;
      const id = m[1];
      const del = document.createElement('button');
      del.className = 'btn danger tm-delete';
      del.type = 'button';
      del.textContent = 'Eliminar';
      del.onclick = () => window.deleteIncome(id);
      cell.appendChild(del);
    });
  }

  function decorate(){addStyles();decorateTable('recent');decorateTable('incomeBody');}
  const obs=new MutationObserver(()=>setTimeout(decorate,30));
  setTimeout(()=>{
    const a=document.getElementById('recent'),b=document.getElementById('incomeBody');
    if(a)obs.observe(a,{childList:true});if(b)obs.observe(b,{childList:true});decorate();
  },150);
})();