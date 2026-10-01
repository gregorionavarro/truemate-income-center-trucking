(() => {
  if (window.__tmOwnerLinkLoaded) return;
  window.__tmOwnerLinkLoaded = true;
  const OWNER='gregorio.navarro@truemategroup.com';
  const MONTH_KEY='tmic_view_month';
  const YEAR_KEY='tmic_view_year';

  function ensureInitialPeriod(){
    const mo=document.getElementById('mo'),yr=document.getElementById('yr');
    if(!mo||!yr)return;
    let savedMonth='',savedYear='';
    try{
      savedMonth=localStorage.getItem(MONTH_KEY)||'';
      savedYear=localStorage.getItem(YEAR_KEY)||'';
    }catch(_){ }

    // If the user already chose a period, preserve it after reload/refresh.
    if(savedMonth && [...mo.options].some(o=>o.value===savedMonth)) mo.value=savedMonth;
    if(savedYear && [...yr.options].some(o=>o.value===savedYear||o.textContent===savedYear)) yr.value=savedYear;

    // Only default to the real current month when there is no saved selection.
    if(!savedMonth || !savedYear){
      const now=new Date();
      const month=String(now.getMonth()+1).padStart(2,'0');
      const year=String(now.getFullYear());
      if(![...yr.options].some(o=>o.value===year||o.textContent===year)){
        const op=document.createElement('option');op.value=year;op.textContent=year;yr.appendChild(op);
      }
      mo.value=month;
      yr.value=year;
      try{localStorage.setItem(MONTH_KEY,month);localStorage.setItem(YEAR_KEY,year)}catch(_){ }
    }
    try{if(typeof window.render==='function')window.render();}catch(_){ }
    try{window.tmRefreshMonthlyExecutive?.()}catch(_){ }
    try{window.tmRefreshRecentMovements?.()}catch(_){ }
    try{window.tmRefreshSummaryPayments?.()}catch(_){ }
  }

  function addRefreshButton(){
    const tabs=document.querySelector('.tabs');
    if(!tabs||document.getElementById('tmManualRefresh'))return;
    const b=document.createElement('button');
    b.id='tmManualRefresh';
    b.type='button';
    b.className='tab';
    b.textContent='↻ Actualizar datos';
    b.title='Sincronizar y recargar la información más reciente';
    b.style.marginLeft='auto';
    b.onclick=async()=>{
      if(b.disabled)return;
      b.disabled=true;
      const old=b.textContent;
      b.textContent='↻ Actualizando…';
      try{
        // Save the period visible right now before reloading the app.
        const mo=document.getElementById('mo'),yr=document.getElementById('yr');
        if(mo?.value) localStorage.setItem(MONTH_KEY,mo.value);
        if(yr?.value) localStorage.setItem(YEAR_KEY,yr.value);

        const r=await fetch('/api/state',{cache:'no-store'});
        if(r.ok){
          const x=await r.json();
          const s=x?.state||{};
          const map={r:'tmic_r',p:'tmic_p',c:'tmic_c',t:'tmic_t',a:'tmic_a',l:'tmic_l'};
          Object.entries(map).forEach(([k,key])=>{if(s[k]!==undefined)localStorage.setItem(key,JSON.stringify(s[k]));});
        }
        try{window.parent.location.reload();}catch(_){location.reload();}
      }catch(_){
        b.textContent='No se pudo actualizar';
        setTimeout(()=>{b.disabled=false;b.textContent=old;},1800);
      }
    };
    tabs.appendChild(b);
  }

  async function init(){
    ensureInitialPeriod();
    addRefreshButton();
    try{
      const r=await fetch('/cdn-cgi/access/get-identity',{cache:'no-store'});
      if(!r.ok)return;
      const x=await r.json();
      const email=String(x.email||x.user?.email||'').trim().toLowerCase();
      if(email!==OWNER)return;
      const tabs=document.querySelector('.tabs');
      if(!tabs||document.getElementById('tmOwnerAdminLink'))return;
      const a=document.createElement('a');
      a.id='tmOwnerAdminLink';
      a.href='/admin.html';
      a.target='_blank';
      a.rel='noopener';
      a.className='tab';
      a.textContent='Owner · Administración ↗';
      a.style.textDecoration='none';
      const refresh=document.getElementById('tmManualRefresh');
      if(refresh)tabs.insertBefore(a,refresh);else tabs.appendChild(a);
    }catch(_){ }
  }
  setTimeout(init,500);
})();