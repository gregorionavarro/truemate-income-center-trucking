(() => {
  if (window.__tmTasksStableLoaded) return;
  window.__tmTasksStableLoaded = true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);

  function getTasks(){try{return (typeof S!=='undefined'&&S&&Array.isArray(S.t))?S.t:[]}catch(_){return[]}}
  function persistTasks(){
    try{localStorage.setItem('tmic_t',JSON.stringify(S.t||[]))}catch(_){ }
    try{store()}catch(e){console.error('No se pudo guardar tarea con store()',e)}
  }
  function toast(msg){
    let x=document.getElementById('tm-task-toast');
    if(!x){x=document.createElement('div');x.id='tm-task-toast';x.style.cssText='position:fixed;right:22px;top:22px;z-index:99999;background:#173f69;color:#fff;padding:12px 16px;border-radius:12px;font-weight:800;box-shadow:0 12px 28px rgba(0,0,0,.20)';document.body.appendChild(x)}
    x.textContent=msg;x.style.display='block';clearTimeout(x._t);x._t=setTimeout(()=>x.style.display='none',2200);
  }

  window.tmTaskDone=function(id,done=true){
    const t=getTasks().find(x=>String(x.id)===String(id));
    if(!t){alert('No encontré esa tarea. Actualiza la página e intenta de nuevo.');return;}
    t.done=!!done;
    t.status=done?'Realizada':'Abierta';
    t.doneAt=done?today():'';
    persistTasks();
    toast(done?'Tarea marcada como realizada.':'Tarea reabierta.');
    setTimeout(()=>{try{window.tmOpenTasks?.()}catch(e){console.error(e)}},30);
    setTimeout(()=>{try{render()}catch(e){console.error('Render de tareas',e)}},100);
  };

  window.tmOpenTasks=function(){
    const tasks=getTasks();
    const open=tasks.filter(t=>!t.done).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
    const done=tasks.filter(t=>!!t.done).sort((a,b)=>String(b.doneAt||'').localeCompare(String(a.doneAt||'')));
    document.querySelector('.tm-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-overlay';
    const row=(t,isDone)=>`<div class="tm-v2-task ${isDone?'tm-v2-done':''}"><div><b>${esc(t.title||'Tarea')}</b><div class="tm-note">${esc(t.note||'')}</div></div><div>${esc(t.date||'—')}</div><div>${isDone?`<button type="button" class="tm-mini" data-task-reopen="${esc(t.id)}">Reabrir</button>`:`<button type="button" class="tm-mini green" data-task-done="${esc(t.id)}">Marcar realizada</button>`}</div></div>`;
    o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>Tareas</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b"><h4 style="color:#173f69">Abiertas (${open.length})</h4>${open.map(t=>row(t,false)).join('')||'<div class="tm-note">No hay tareas abiertas.</div>'}<h4 style="color:#173f69;margin-top:20px">Realizadas (${done.length})</h4>${done.slice(0,50).map(t=>row(t,true)).join('')||'<div class="tm-note">No hay tareas realizadas.</div>'}</div></div>`;
    o.querySelector('.tm-close').onclick=()=>o.remove();
    o.addEventListener('click',e=>{
      if(e.target===o){o.remove();return;}
      const reopen=e.target.closest('[data-task-reopen]');
      if(reopen){e.preventDefault();e.stopPropagation();window.tmTaskDone(reopen.getAttribute('data-task-reopen'),false);return;}
      const doneBtn=e.target.closest('[data-task-done]');
      if(doneBtn){e.preventDefault();e.stopPropagation();window.tmTaskDone(doneBtn.getAttribute('data-task-done'),true);}
    });
    document.body.appendChild(o);
  };

  function renderTaskTabStable(){
    const el=document.getElementById('taskList');if(!el)return;
    const tasks=getTasks();
    const open=tasks.filter(t=>!t.done).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
    const done=tasks.filter(t=>!!t.done).sort((a,b)=>String(b.doneAt||'').localeCompare(String(a.doneAt||'')));
    el.innerHTML=`<div>${open.map(t=>`<div class="card box" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>${esc(t.title||'Tarea')}</b><div class="sub">${esc(t.note||'')} · ${esc(t.date||'')}</div></div><button type="button" class="tm-mini green" data-tab-done="${esc(t.id)}">Marcar realizada</button></div></div>`).join('')||'<div class="sub">No hay tareas abiertas.</div>'}</div>${done.length?`<div style="margin-top:18px"><h3 style="color:#173f69">Tareas realizadas</h3>${done.slice(0,20).map(t=>`<div class="card box tm-v2-done" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>${esc(t.title||'Tarea')}</b><div class="sub">${esc(t.note||'')} · ${esc(t.date||'')}</div></div><button type="button" class="tm-mini" data-tab-reopen="${esc(t.id)}">Reabrir</button></div></div>`).join('')}</div>`:''}`;
    el.querySelectorAll('[data-tab-done]').forEach(b=>b.onclick=()=>window.tmTaskDone(b.getAttribute('data-tab-done'),true));
    el.querySelectorAll('[data-tab-reopen]').forEach(b=>b.onclick=()=>window.tmTaskDone(b.getAttribute('data-tab-reopen'),false));
  }

  const prior=window.render;
  if(typeof prior==='function') window.render=function(){prior();setTimeout(renderTaskTabStable,160)};
  setTimeout(renderTaskTabStable,250);
})();