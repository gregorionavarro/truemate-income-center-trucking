(() => {
  if (window.__tmDeferredPaymentFixLoaded) return;
  window.__tmDeferredPaymentFixLoaded = true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const today=()=>new Date().toISOString().slice(0,10);
  const dpUid=()=> 'dp'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const norm=v=>String(v||'').trim().toUpperCase();

  function popup(title,body,footer=''){
    document.querySelector('.tm-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-overlay';
    o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div>${footer?`<div class="tm-pop-f">${footer}</div>`:''}</div>`;
    o.querySelector('.tm-close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});document.body.appendChild(o);return o;
  }

  function nextReference(origin,planIndex){
    const base=`${origin}-DIF-${planIndex+1}`;
    let candidate=base,n=2;
    while((S.r||[]).some(x=>norm(x.invoice)===norm(candidate))){candidate=`${base}-${n++}`;}
    return candidate;
  }

  window.tmRegisterDeferredPayment=function(id,planId){
    const r=(S.r||[]).find(x=>String(x.id)===String(id));
    if(!r)return alert('No encontré el registro de la factura origen.');

    if(!Array.isArray(r.deferredPlan)||!r.deferredPlan.length){
      const rem=+r.pending||0;
      r.deferredPlan=rem>0?[{id:dpUid(),date:r.defDate||'',amount:rem,remaining:rem,status:'Pendiente'}]:[];
    }

    const p=planId?r.deferredPlan.find(x=>String(x.id)===String(planId)):r.deferredPlan.find(x=>(+x.remaining||0)>0);
    if(!p)return alert('No hay un pago diferido pendiente para esta factura.');
    const remaining=+p.remaining||0;
    if(remaining<=0)return alert('Esta cuota ya fue pagada.');

    const planIndex=Math.max(0,r.deferredPlan.indexOf(p));
    const suggested=nextReference(r.invoice,planIndex);
    const o=popup(`Registrar pago diferido · ${esc(r.invoice)}`,`
      <div class="tm-kpis">
        <div class="tm-kpi"><small>Cliente</small><b style="font-size:16px">${esc(r.client)}</b></div>
        <div class="tm-kpi"><small>Factura origen</small><b style="font-size:16px">${esc(r.invoice)}</b></div>
        <div class="tm-kpi"><small>Saldo de esta cuota</small><b>${fmt(remaining)}</b></div>
        <div class="tm-kpi"><small>Tipo de movimiento</small><b style="font-size:16px">Pago diferido</b></div>
      </div>
      <div class="tm-grid">
        <div class="tm-field"><label>Invoice / referencia del nuevo cobro</label><input id="tmNewInvoice" value="${esc(suggested)}"><div class="tm-note">Puedes reemplazarla por la invoice real. Si la dejas así, el sistema usa esta referencia única.</div></div>
        <div class="tm-field"><label>Fecha del pago</label><input id="tmPayDate" type="date" value="${today()}"></div>
        <div class="tm-field"><label>Monto recibido</label><input id="tmPayAmount" type="number" min="0.01" step="0.01" value="${remaining.toFixed(2)}"></div>
        <div class="tm-field"><label>Método</label><select id="tmPayMethod"><option>Stripe</option><option>Zelle</option><option>Wire</option><option>ACH</option><option>Check</option></select></div>
        <div class="tm-field"><label>Fee cobrado al cliente</label><input id="tmPayAgencyFee" type="number" min="0" step="0.01" value="0"></div>
        <div class="tm-field" id="tmPayProcWrap"><label>Fee procesador</label><input id="tmPayProcFee" type="number" min="0" step="0.01" value="0"><div class="tm-note">Solo aplica a Stripe.</div></div>
        <div class="tm-field"><label>Estado depósito</label><select id="tmPayDep"><option>En proceso</option><option>Depositado</option></select></div>
        <div class="tm-field"><label>Clasificación del ingreso</label><select id="tmIncomeType"><option value="Por revisar">Por revisar</option><option value="Down payment / Prima">Down payment / Prima</option><option value="Fee agencia">Fee agencia</option><option value="Comisión">Comisión</option><option value="Otro">Otro</option></select><div class="tm-note">Si no estás seguro, déjalo en “Por revisar”. Se creará una tarea para verificarlo.</div></div>
      </div>
      <div class="tm-note" style="margin-top:12px">Este movimiento quedará identificado como <b>Pago diferido</b> y vinculado a la factura origen <b>${esc(r.invoice)}</b>.</div>
    `,`<button class="btn soft" id="tmCancelPay">Cancelar</button><button class="btn navy" id="tmConfirmPay">Registrar pago diferido</button>`);

    const invInput=o.querySelector('#tmNewInvoice'),method=o.querySelector('#tmPayMethod'),amount=o.querySelector('#tmPayAmount'),pf=o.querySelector('#tmPayProcFee'),wrap=o.querySelector('#tmPayProcWrap'),dep=o.querySelector('#tmPayDep');
    const calc=()=>{const stripe=method.value==='Stripe';wrap.style.display=stripe?'block':'none';if(stripe){pf.value=((+amount.value||0)*.029+.30).toFixed(2);dep.value='En proceso'}else{pf.value='0';dep.value='Depositado'}};
    method.onchange=calc;amount.oninput=()=>{if(method.value==='Stripe')calc()};calc();
    o.querySelector('#tmCancelPay').onclick=()=>o.remove();

    o.querySelector('#tmConfirmPay').onclick=()=>{
      let inv=invInput.value.trim();
      if(!inv)inv=nextReference(r.invoice,planIndex);
      const dup=(S.r||[]).find(x=>norm(x.invoice)===norm(inv));
      if(dup)return alert(`La referencia ${inv} ya existe. Usa otra invoice o deja la referencia sugerida por el sistema.`);

      const amt=+amount.value||0;
      if(amt<=0)return alert('Ingresa un monto válido.');
      if(amt>remaining+0.009)return alert(`Este pago no puede superar ${fmt(remaining)}.`);

      const procFee=method.value==='Stripe'?(+pf.value||0):0;
      const agencyFee=+(o.querySelector('#tmPayAgencyFee').value||0);
      const payDate=o.querySelector('#tmPayDate').value||today();
      const incomeType=o.querySelector('#tmIncomeType')?.value||'Por revisar';

      (S.r||[]).push({
        id:dpUid(),client:r.client,company:r.company,invoice:inv,parentInvoice:r.invoice,sourceInvoice:r.invoice,paymentPlanId:p.id,
        paymentType:'Diferido',isDeferredPayment:true,incomeType,reviewStatus:incomeType==='Por revisar'?'Pendiente':'Revisado',
        producer:r.producer,date:payDate,method:method.value,gross:amt,agencyFee,procFee,net:Math.max(0,amt-procFee),depStatus:dep.value,
        depDate:dep.value==='Depositado'?payDate:'',pending:0,defDate:'',defAmt:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'No aplica',
        note:`Pago diferido aplicado a factura origen ${r.invoice} · Clasificación: ${incomeType}`
      });

      p.remaining=Math.max(0,remaining-amt);p.status=p.remaining<=0?'Pagado':'Parcial';
      r.pending=Math.max(0,(+r.pending||0)-amt);
      const next=r.deferredPlan.find(x=>(+x.remaining||0)>0);r.defDate=next?.date||'';r.defAmt=+next?.remaining||0;

      const task=(S.t||[]).find(t=>String(t.planId||'')===String(p.id)&&!t.done);
      if(task&&p.remaining<=0){task.done=true;task.doneAt=today();task.status='Realizada';}
      else if(task&&p.remaining>0){task.note=`${r.client} · ${fmt(p.remaining)}`;}

      if(incomeType==='Por revisar'){
        const exists=(S.t||[]).some(t=>t.reviewInvoice===inv&&!t.done);
        if(!exists)(S.t||[]).push({id:dpUid(),title:`Revisar ingreso · ${inv}`,date:payDate,note:`${r.client} · ${fmt(amt)} · confirmar si es fee, comisión, down payment/prima u otro`,invoice:inv,reviewInvoice:inv,auto:false,done:false,status:'Abierta'});
      }

      try{
        localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));
        localStorage.setItem('tmic_t',JSON.stringify(S.t||[]));
      }catch(e){console.error(e);return alert('No se pudo guardar el pago diferido. Intenta nuevamente.');}

      o.remove();
      alert(`✅ Pago diferido guardado correctamente.\n\nInvoice: ${inv}\nMonto: ${fmt(amt)}${incomeType==='Por revisar'?`\nEstado: Por revisar`:''}`);
      setTimeout(()=>{try{location.reload()}catch(_){}},250);
    };
  };
})();