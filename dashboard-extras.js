(() => {
  if (window.__tmDashboardExtrasLoaded) return;
  window.__tmDashboardExtrasLoaded = true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const getRows=()=>{try{return (typeof S!=='undefined'&&S&&Array.isArray(S.r))?S.r:[]}catch(_){return[]}};
  const monthKey=()=>`${document.getElementById('yr')?.value||new Date().getFullYear()}-${String(document.getElementById('mo')?.value||new Date().getMonth()+1).padStart(2,'0')}`;
  const dayDiff=v=>{if(!v)return 999;const d=new Date(v+'T12:00:00'),n=new Date();const t=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12);return Number.isNaN(d.getTime())?999:Math.ceil((d-t)/86400000)};

  function style(){
    if(document.getElementById('tm-dashboard-extras-style'))return;
    const s=document.createElement('style');s.id='tm-dashboard-extras-style';s.textContent=`
      #summary .insights>.card:first-child{position:relative!important}
      .tm-month-fee-total{position:absolute;top:16px;right:16px;background:#edf7f2;border:1px solid #cfeadd;color:#176b49;border-radius:12px;padding:8px 11px;text-align:right;box-shadow:0 3px 10px rgba(22,107,73,.06)}
      .tm-month-fee-total small{display:block;font-size:9px;text-transform:uppercase;font-weight:900;letter-spacing:.35px;color:#5c806f}
      .tm-month-fee-total b{display:block;font-size:17px;color:#174675;margin-top:2px}
      .tm-team-activity{margin-top:18px}
      .tm-team-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
      .tm-team-person{border:1px solid #dce6f0;border-radius:12px;padding:12px;background:#fbfdff}
      .tm-team-person b{display:block;color:#173f69;font-size:14px}.tm-team-person span{display:block;color:#6d7d92;font-size:11px;margin-top:4px}.tm-team-person strong{display:block;color:#20324d;font-size:12px;margin-top:8px}
      @media(max-width:700px){.tm-team-grid{grid-template-columns:1fr}.tm-month-fee-total{position:static;margin:8px 0 12px;text-align:left}}
    `;document.head.appendChild(s);
  }

  function feeBadge(){
    const card=document.querySelector('#summary .insights>.card:first-child');if(!card)return;
    const total=getRows().filter(r=>String(r.date||'').slice(0,7)===monthKey()).reduce((a,r)=>a+(+r.agencyFee||0),0);
    let box=card.querySelector('.tm-month-fee-total');
    if(!box){box=document.createElement('div');box.className='tm-month-fee-total';card.appendChild(box)}
    box.innerHTML=`<small>Fees del mes</small><b>${fmt(total)}</b>`;
  }

  function operationalCounters(){
    const rows=getRows();
    const carrierLate=rows.filter(r=>(+r.carrierAmt||+r.downPayment||0)>0&&r.carrierDue&&String(r.carrierStatus||'').toLowerCase()!=='pagado'&&dayDiff(r.carrierDue)<0).length;
    let deferredNear=0;
    rows.forEach(r=>{
      if(Array.isArray(r.deferredPlan)&&r.deferredPlan.length){
        deferredNear+=r.deferredPlan.filter(p=>(+p.remaining||0)>0&&p.date&&dayDiff(p.date)<=7).length;
      }else if((+r.pending||0)>0&&r.defDate&&dayDiff(r.defDate)<=7){deferredNear++;}
    });
    const tasks=Array.isArray(S?.t)?S.t.filter(t=>!t.done&&String(t.status||'').toLowerCase()!=='realizada').length:0;
    const late=document.getElementById('lateCarrier'),near=document.getElementById('nearDef'),task=document.getElementById('taskN'),alert=document.getElementById('alertN');
    if(late)late.textContent=carrierLate;
    if(near)near.textContent=deferredNear;
    if(task)task.textContent=tasks;
    if(alert){const proc=+(document.getElementById('procN')?.textContent||0);alert.textContent=carrierLate+deferredNear+proc;}
  }

  function readActivity(){
    try{return JSON.parse(localStorage.getItem('tmic_a')||'[]')}catch(_){return[]}
  }
  function fmtAccess(v){
    if(!v)return 'Sin registro';const d=new Date(v);if(Number.isNaN(d.getTime()))return v;
    return d.toLocaleString('es-US',{month:'short',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function teamActivity(){
    const view=document.getElementById('settings');const panel=view?.querySelector('.panel');if(!panel)return;
    let box=panel.querySelector('.tm-team-activity');
    if(!box){box=document.createElement('div');box.className='card box tm-team-activity';panel.appendChild(box)}
    const rows=readActivity().slice().sort((a,b)=>String(b.lastAccess||'').localeCompare(String(a.lastAccess||'')));
    box.innerHTML=`<h3>Último acceso del equipo</h3><div class="sub">Muestra la última vez que cada usuario autorizado abrió el Income Center.</div><div class="tm-team-grid">${rows.length?rows.map(x=>`<div class="tm-team-person"><b>${esc(x.name||x.email||'Usuario')}</b><span>${esc(x.email||'')}</span><strong>Último acceso: ${esc(fmtAccess(x.lastAccess))}</strong></div>`).join(''):'<div class="sub">Los accesos comenzarán a registrarse desde esta actualización.</div>'}</div>`;
  }

  function apply(){try{style();feeBadge();operationalCounters();teamActivity()}catch(e){console.error('TrueMate dashboard extras',e)}}
  const prior=window.render;if(typeof prior==='function')window.render=function(){prior();setTimeout(apply,180)};
  document.getElementById('mo')?.addEventListener('change',()=>setTimeout(()=>{feeBadge();operationalCounters()},120));
  document.getElementById('yr')?.addEventListener('change',()=>setTimeout(()=>{feeBadge();operationalCounters()},120));
  setInterval(()=>{feeBadge();operationalCounters();teamActivity()},5000);
  setTimeout(apply,250);
})();