(() => {
  if (window.__tmMonthContextLoaded) return;
  window.__tmMonthContextLoaded = true;

  const MONTH_KEY='tmic_view_month';
  const YEAR_KEY='tmic_view_year';
  const NAMES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const $=id=>document.getElementById(id);
  const pad=v=>String(v).padStart(2,'0');
  const label=(y,m)=>`${NAMES[Math.max(0,(+m||1)-1)]} de ${y}`;
  let refreshing=false;

  function selected(){
    const y=$('yr')?.value||String(new Date().getFullYear());
    const m=$('mo')?.value||pad(new Date().getMonth()+1);
    return {y:String(y),m:pad(m),key:`${y}-${pad(m)}`};
  }

  function persist(){
    const s=selected();
    try{localStorage.setItem(MONTH_KEY,s.m);localStorage.setItem(YEAR_KEY,s.y)}catch(_){ }
  }

  function improvePeriodUI(){
    const mo=$('mo'),yr=$('yr');if(!mo||!yr)return;
    const host=mo.parentElement;if(!host||host.dataset.tmPeriodUi)return;
    host.dataset.tmPeriodUi='1';
    host.classList.add('tm-period-picker');
    const tag=document.createElement('div');
    tag.className='tm-period-label';
    tag.innerHTML='<span>PERÍODO</span><b id="tmPeriodText"></b>';
    host.insertBefore(tag,mo);
    const st=document.createElement('style');
    st.id='tm-period-style';
    st.textContent=`
      .tm-period-picker{display:grid!important;grid-template-columns:auto auto;grid-template-areas:'label label' 'month year';gap:7px 8px;align-items:center;background:#f7fbff;border:1px solid #d7e5f2;border-radius:14px;padding:10px 12px;box-shadow:0 4px 14px rgba(23,63,105,.06);min-width:245px}
      .tm-period-label{grid-area:label;display:flex;align-items:center;justify-content:space-between;gap:12px}.tm-period-label span{font-size:9px;font-weight:900;letter-spacing:.65px;color:#6d7d92}.tm-period-label b{font-size:12px;color:#173f69}
      .tm-period-picker #mo{grid-area:month}.tm-period-picker #yr{grid-area:year}.tm-period-picker .month{margin:0!important;border:1px solid #c8daea!important;background:#fff!important;color:#173f69!important;font-weight:800!important;padding:9px 11px!important;min-width:108px!important;cursor:pointer}
      .tm-period-picker #yr{min-width:82px!important}
      @media(max-width:700px){.tm-period-picker{min-width:0;width:100%}}
    `;
    document.head.appendChild(st);
    updatePeriodText();
  }

  function updatePeriodText(){
    const s=selected(),el=$('tmPeriodText');
    if(el)el.textContent=label(s.y,s.m);
  }

  function refreshFinalCarrierSoon(){
    [0,60,180,400,800].forEach(ms=>setTimeout(()=>{
      if(typeof window.tmRefreshGlobalCarrierCard==='function')window.tmRefreshGlobalCarrierCard();
      else window.tmRefreshFinalCarrierCard?.();
    },ms));
  }

  function refreshMonthViews(){
    if(refreshing)return;
    refreshing=true;
    try{
      if(typeof window.render==='function') window.render();
      if(typeof window.tmRefreshMonthlyExecutive==='function') window.tmRefreshMonthlyExecutive();
      if(typeof window.tmRefreshRecentMovements==='function') window.tmRefreshRecentMovements();
      if(typeof window.tmRefreshSummaryPayments==='function') window.tmRefreshSummaryPayments();
      if(typeof window.tmRefreshStableDashboard==='function') window.tmRefreshStableDashboard();
      if(typeof window.tmRefreshDashboardExtras==='function') window.tmRefreshDashboardExtras();
      updatePeriodText();
      refreshFinalCarrierSoon();
    }catch(e){console.warn('Month refresh',e)}
    setTimeout(()=>{refreshing=false},80);
  }

  function restore(){
    const mo=$('mo'),yr=$('yr');
    if(!mo||!yr)return false;
    let m='',y='';
    try{m=localStorage.getItem(MONTH_KEY)||'';y=localStorage.getItem(YEAR_KEY)||''}catch(_){ }
    if(m&&[...mo.options].some(o=>o.value===m))mo.value=m;
    if(y&&[...yr.options].some(o=>o.value===y))yr.value=y;
    improvePeriodUI();
    updatePeriodText();
    setTimeout(refreshMonthViews,30);
    return true;
  }

  function installSelectors(){
    const mo=$('mo'),yr=$('yr');if(!mo||!yr)return false;
    if(!mo.dataset.tmMonthPersist){
      mo.dataset.tmMonthPersist='1';
      mo.addEventListener('change',()=>{persist();updatePeriodText();setTimeout(refreshMonthViews,30);refreshFinalCarrierSoon()});
    }
    if(!yr.dataset.tmMonthPersist){
      yr.dataset.tmMonthPersist='1';
      yr.addEventListener('change',()=>{persist();updatePeriodText();setTimeout(refreshMonthViews,30);refreshFinalCarrierSoon()});
    }
    restore();
    return true;
  }

  function ensureDateWarning(){
    const date=$('date');if(!date)return;
    const wrap=date.closest('.f');if(!wrap)return;
    let box=wrap.querySelector('.tm-month-date-warning');
    if(!box){
      box=document.createElement('div');
      box.className='tm-month-date-warning';
      box.style.cssText='display:none;margin-top:7px;padding:8px 10px;border:1px solid #efd892;background:#fff7df;color:#7f5d0d;border-radius:9px;font-size:11px;line-height:1.35;font-weight:700';
      wrap.appendChild(box);
    }
    const update=()=>{
      const d=String(date.value||'');
      const s=selected();
      if(d&&d.slice(0,7)!==s.key){
        const [yy,mm]=d.split('-');
        box.style.display='block';
        box.textContent=`Atención: estás viendo ${label(s.y,s.m)}, pero este ingreso se guardará en ${label(yy,mm)}.`;
      }else box.style.display='none';
    };
    if(!date.dataset.tmMonthWarn){
      date.dataset.tmMonthWarn='1';
      date.addEventListener('change',update);
      date.addEventListener('input',update);
    }
    update();
  }

  function installSaveWarning(){
    if(window.__tmMonthSaveWrapped||typeof window.save!=='function')return;
    window.__tmMonthSaveWrapped=true;
    const prior=window.save;
    window.save=function(){
      const d=String($('date')?.value||'');
      const s=selected();
      const mismatch=!!d&&d.slice(0,7)!==s.key;
      const [yy,mm]=d.split('-');
      const target=mismatch?label(yy,mm):'';
      const out=prior.apply(this,arguments);
      if(mismatch){
        setTimeout(()=>{
          if(typeof window.tmNotice==='function')window.tmNotice(`El ingreso quedó guardado en ${target}. Tú continúas viendo ${label(s.y,s.m)}.`,'Ingreso guardado en otro mes','warning');
        },250);
      }
      setTimeout(refreshMonthViews,180);
      refreshFinalCarrierSoon();
      return out;
    };
  }

  function improvePendingCarrierShortcut(){
    const b=$('tmCarrierPendingCount');if(!b)return;
    let rows=[];
    try{rows=JSON.parse(localStorage.getItem('tmic_r')||'[]')}catch(_){rows=[]}
    if(!Array.isArray(rows))rows=[];
    const pending=rows.filter(r=>Math.max(+r.downPayment||0,+r.carrierAmt||0)>0&&!(r.carrier&&r.carrierDue)&&String(r.carrierStatus||'').toLowerCase()!=='pagado');
    if(pending.length===1){
      b.title='Abrir el único Carrier/PFA pendiente de completar';
      b.onclick=()=>{if(typeof window.tmEditCarrierObligation==='function')window.tmEditCarrierObligation(pending[0].id);else if(typeof window.go==='function')window.go('carrier')};
    }
  }

  const priorOpen=window.openModal;
  if(typeof priorOpen==='function'){
    window.openModal=function(){
      const r=priorOpen.apply(this,arguments);
      setTimeout(ensureDateWarning,80);
      return r;
    };
  }

  function boot(){
    if(!installSelectors()){setTimeout(boot,120);return;}
    installSaveWarning();
    setTimeout(()=>{refreshMonthViews();improvePendingCarrierShortcut()},350);
    setTimeout(()=>{improvePendingCarrierShortcut();refreshFinalCarrierSoon()},1200);
  }
  boot();
})();