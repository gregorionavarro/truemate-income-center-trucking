(() => {
  if (window.__tmCarrierPendingGuardLoaded) return;
  window.__tmCarrierPendingGuardLoaded = true;

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const fmt = v => typeof window.money==='function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const uid = () => 'cpg'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

  // Important: older/newer modules can leave one amount at 0 while the other has the real DP.
  // Never use ?? here because 0 is not null and would hide a real positive carrierAmt.
  const obligationAmount = r => Math.max(+r?.downPayment||0,+r?.carrierAmt||0);

  function normalizePendingCarrier(){
    let changed=false;
    const rows=Array.isArray(window.S?.r)?S.r:[];
    rows.forEach(r=>{
      const amt=obligationAmount(r);
      if(amt<=0) return;
      const status=String(r.carrierStatus||'').trim().toLowerCase();
      if(status==='pagado') return;

      // A positive amount is always a real Carrier obligation until it is paid.
      if((+r.downPayment||0)<=0){r.downPayment=amt;changed=true;}
      if((+r.carrierAmt||0)<=0){r.carrierAmt=amt;changed=true;}

      const complete=!!String(r.carrier||'').trim() && !!String(r.carrierDue||'').trim();
      if(!complete){
        if(status==='' || status==='no aplica' || status==='pendiente' || status==='pendiente de completar'){
          if(r.carrierStatus!=='Pendiente de completar'){r.carrierStatus='Pendiente de completar';changed=true;}
        }
        if(r.carrierNeedsCompletion!==true){r.carrierNeedsCompletion=true;changed=true;}
        if(!String(r.note||'').trim() || String(r.note||'').trim()==='Pendiente de completar por Operaciones.'){
          if(r.note!=='Pendiente de completar por Operaciones.'){r.note='Pendiente de completar por Operaciones.';changed=true;}
        }

        const hasTask=(S.t||[]).some(t=>!t.done && (String(t.carrierSetupInvoice||'')===String(r.invoice||'') || (String(t.invoice||'')===String(r.invoice||'') && String(t.title||'').toLowerCase().includes('completar carrier'))));
        if(!hasTask){
          (S.t||[]).push({id:uid(),title:`Completar Carrier/PFA · ${r.invoice||''}`,date:'',note:`${r.client||''} · ${fmt(amt)} · completar Carrier y fecha límite`,invoice:r.invoice||'',carrierSetupInvoice:r.invoice||'',assignedTo:'Operaciones',auto:false,done:false,status:'Abierta'});
          changed=true;
        }
      }else{
        if(status==='' || status==='no aplica' || status==='pendiente de completar'){
          r.carrierStatus='Pendiente';changed=true;
        }
        if(r.carrierNeedsCompletion){r.carrierNeedsCompletion=false;changed=true;}
      }
    });
    if(changed){
      try{
        localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));
        localStorage.setItem('tmic_t',JSON.stringify(S.t||[]));
        if(typeof window.store==='function') store();
      }catch(e){console.warn('carrier pending normalize save',e)}
    }
    return changed;
  }

  function dayLabel(due){
    if(!due)return ['Completar','tm-days-warn'];
    const d=new Date(due+'T12:00:00'); if(Number.isNaN(d.getTime()))return ['—','tm-days-ok'];
    const n=new Date(), t=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12);
    const diff=Math.ceil((d-t)/86400000);
    if(diff<0)return ['Vencido','tm-days-danger'];
    if(diff===0)return ['Hoy','tm-days-danger'];
    if(diff<=3)return [`${diff} día${diff===1?'':'s'}`,'tm-days-danger'];
    if(diff<=7)return [`${diff} días`,'tm-days-warn'];
    return [`${diff} días`,'tm-days-ok'];
  }

  function renderUpcomingCarrier(){
    const grid=document.querySelector('#summary .grid2');
    if(!grid || grid.children.length<2) return;
    const card=grid.children[1];
    const rows=(Array.isArray(window.S?.r)?S.r:[])
      .filter(r=>obligationAmount(r)>0 && String(r.carrierStatus||'').trim().toLowerCase()!=='pagado')
      .slice().sort((a,b)=>{
        const ai=!(a.carrier&&a.carrierDue), bi=!(b.carrier&&b.carrierDue);
        if(ai!==bi)return ai?-1:1;
        return String(a.carrierDue||'9999-12-31').localeCompare(String(b.carrierDue||'9999-12-31'));
      }).slice(0,8);

    card.innerHTML=`<div class="head"><div><h3>Próximos pagos a Carrier / MGA / PFA</h3><div class="sub">Pendientes globales: permanecen visibles hasta quedar pagados.</div></div><button class="btn soft" type="button" onclick="go('carrier')">Ver todos los pagos →</button></div>
      <div class="tablewrap"><table><thead><tr><th>Carrier / MGA / PFA</th><th>Cliente</th><th>Invoice</th><th>Monto a pagar</th><th>Fecha límite</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
      ${rows.length?rows.map(r=>{const incomplete=!(r.carrier&&r.carrierDue);const [txt,cls]=dayLabel(r.carrierDue);const amt=obligationAmount(r);return `<tr style="cursor:pointer" onclick="tmEditCarrierObligation('${r.id}')"><td><b>${esc(r.carrier||'Pendiente de completar')}</b></td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td><b>${fmt(amt)}</b></td><td>${r.carrierDue?esc(r.carrierDue):'—'}</td><td><span class="tm-days ${cls}">${incomplete?'Pendiente de completar':txt}</span></td><td><button class="tm-stable-action ${incomplete?'setup':''}" onclick="event.stopPropagation();tmEditCarrierObligation('${r.id}')">${incomplete?'Completar':'Abrir'}</button></td></tr>`}).join(''):'<tr><td colspan="7" style="color:#6d7d92">Sin obligaciones pendientes a Carrier / MGA / PFA.</td></tr>'}
      </tbody></table></div>`;
  }

  function apply(){
    try{normalizePendingCarrier();renderUpcomingCarrier();}catch(e){console.error('carrier pending guard',e)}
  }
  window.tmCarrierPendingGuard=apply;

  const priorRender=window.render;
  if(typeof priorRender==='function'){
    window.render=function(){
      const out=priorRender.apply(this,arguments);
      setTimeout(apply,260);
      return out;
    };
  }

  const priorSave=window.save;
  if(typeof priorSave==='function'){
    window.save=function(){
      const out=priorSave.apply(this,arguments);
      setTimeout(()=>{apply(); try{if(typeof window.render==='function')render();}catch(_){}},220);
      return out;
    };
  }

  setTimeout(apply,450);
  setInterval(apply,1800);
})();