(() => {
  if (window.__tmBusinessRulesV2Loaded) return;
  window.__tmBusinessRulesV2Loaded = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => typeof money === 'function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const today = () => new Date().toISOString().slice(0,10);
  const uid2 = () => 'v2'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const daysTo = d => { if(!d) return 999; return Math.ceil((new Date(d+'T12:00:00')-new Date())/864e5); };

  function addStyle(){
    if ($('tm-v2-style')) return;
    const s=document.createElement('style'); s.id='tm-v2-style';
    s.textContent=`
      .tm-hidden{display:none!important}.tm-v2-plan{grid-column:1/-1;border:1px solid #d9e3ee;background:#f8fbff;border-radius:12px;padding:12px;margin-top:2px}.tm-v2-plan-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.tm-v2-plan-title{font-size:12px;font-weight:900;color:#38536f;margin-bottom:10px}.tm-v2-task{display:grid;grid-template-columns:1fr 140px 180px;gap:10px;align-items:center;border:1px solid #e0e8f0;border-radius:12px;padding:12px;margin-bottom:9px}.tm-v2-done{opacity:.55}.tm-v2-producer-row{cursor:pointer}.tm-v2-producer-row:hover{background:#f5f9fd}.tm-v2-origin{font-size:11px;color:#6d7d92;margin-top:4px}.tm-v2-required{color:#b23a4b}.tm-v2-processor-note{font-size:11px;color:#6d7d92;margin-top:5px}
      @media(max-width:800px){.tm-v2-plan-grid,.tm-v2-task{grid-template-columns:1fr 1fr}}@media(max-width:520px){.tm-v2-plan-grid,.tm-v2-task{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }

  function popup(title,body,footer=''){
    document.querySelector('.tm-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-overlay';
    o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div>${footer?`<div class="tm-pop-f">${footer}</div>`:''}</div>`;
    o.querySelector('.tm-close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});document.body.appendChild(o);return o;
  }

  function processorFieldRules(){
    const method=$('method'), pf=$('procFee'); if(!method||!pf)return;
    const field=pf.closest('.f'); if(!field)return;
    const apply=()=>{
      const stripe=method.value==='Stripe'; field.classList.toggle('tm-hidden',!stripe);
      if(!stripe){pf.value='0'; const gross=+($('gross')?.value||0); if($('netInput'))$('netInput').value=gross.toFixed(2);}
    };
    if(!method.dataset.tmV2Bound){method.dataset.tmV2Bound='1';method.addEventListener('change',()=>setTimeout(apply,0));}
    apply();
  }

  function ensureDeferredPlanUI(){
    const pending=$('pendingAmt'), d1=$('defDate'), a1=$('defAmt'); if(!pending||!d1||!a1)return;
    const fields=pending.closest('.fields'); if(!fields)return;
    let plan=$('tmDeferredPlanBox');
    if(!plan){
      plan=document.createElement('div');plan.id='tmDeferredPlanBox';plan.className='tm-v2-plan';
      plan.innerHTML=`<div class="tm-v2-plan-title">Programación del saldo diferido</div><div class="tm-v2-plan-grid"><div class="f"><label>Número de pagos diferidos</label><select id="tmDeferredCount"><option value="1">1 pago</option><option value="2">2 pagos</option></select></div><div class="f" id="tmPay2DateWrap"><label>Fecha pago 2</label><input type="date" id="tmDefDate2"></div><div class="f" id="tmPay2AmtWrap"><label>Monto pago 2</label><input type="number" min="0" step="0.01" id="tmDefAmt2"></div></div><div class="tm-v2-processor-note">Si es 1 pago, el monto será automáticamente igual al saldo pendiente. Si son 2 pagos, la suma de ambos debe ser igual al saldo pendiente.</div>`;
      fields.appendChild(plan);
    }
    const pendingField=pending.closest('.f'), dateField=d1.closest('.f'), amountField=a1.closest('.f');
    if(pendingField?.querySelector('label'))pendingField.querySelector('label').textContent='Saldo pendiente / diferido';
    if(dateField?.querySelector('label'))dateField.querySelector('label').textContent='Fecha pago 1';
    const count=$('tmDeferredCount');
    const sync=()=>{
      const has=(+pending.value||0)>0; plan.style.display=has?'block':'none';
      if(!has)return;
      const two=count.value==='2'; amountField.classList.toggle('tm-hidden',!two); $('tmPay2DateWrap').classList.toggle('tm-hidden',!two); $('tmPay2AmtWrap').classList.toggle('tm-hidden',!two);
      if(!two){a1.value=(+pending.value||0).toFixed(2); if($('tmDefAmt2'))$('tmDefAmt2').value=''; if($('tmDefDate2'))$('tmDefDate2').value='';}
    };
    if(!pending.dataset.tmV2Bound){pending.dataset.tmV2Bound='1';pending.addEventListener('input',sync)}
    if(!count.dataset.tmV2Bound){count.dataset.tmV2Bound='1';count.addEventListener('change',sync)}
    sync();
  }

  const originalOpen=window.openModal;
  if(typeof originalOpen==='function'){
    window.openModal=function(id){
      document.body.dataset.tmEditingId=id||'';
      originalOpen(id);
      setTimeout(()=>{
        processorFieldRules(); ensureDeferredPlanUI();
        if(id){
          const r=S.r.find(x=>x.id===id); if(r?.deferredPlan?.length){
            $('tmDeferredCount').value=String(Math.min(2,r.deferredPlan.length));
            const p1=r.deferredPlan[0],p2=r.deferredPlan[1];
            if(p1){$('defDate').value=p1.date||'';$('defAmt').value=+p1.amount||0}
            if(p2){$('tmDefDate2').value=p2.date||'';$('tmDefAmt2').value=+p2.amount||0}
            $('tmDeferredCount').dispatchEvent(new Event('change'));
          }
        }
      },0);
    };
  }

  const originalSave=window.save;
  if(typeof originalSave==='function'){
    window.save=function(){
      ensureDeferredPlanUI(); processorFieldRules();
      const pending=+($('pendingAmt')?.value||0), count=+$('tmDeferredCount')?.value||1;
      let plan=[];
      if(pending>0){
        const d1=$('defDate').value;
        if(!d1)return alert('Selecciona la fecha del pago diferido.');
        if(count===1){
          $('defAmt').value=pending.toFixed(2);
          plan=[{id:uid2(),date:d1,amount:pending,remaining:pending,status:'Pendiente'}];
        }else{
          const a1=+($('defAmt').value||0),d2=$('tmDefDate2').value,a2=+($('tmDefAmt2').value||0);
          if(!d2)return alert('Selecciona la fecha del segundo pago diferido.');
          if(a1<=0||a2<=0)return alert('Los dos montos diferidos deben ser mayores a $0.');
          if(Math.abs((a1+a2)-pending)>0.01)return alert(`Los dos pagos deben sumar exactamente ${fmt(pending)}.`);
          plan=[{id:uid2(),date:d1,amount:a1,remaining:a1,status:'Pendiente'},{id:uid2(),date:d2,amount:a2,remaining:a2,status:'Pendiente'}];
        }
      }
      const editingId=document.body.dataset.tmEditingId||'';
      const signature={invoice:$('invoice')?.value,client:$('client')?.value,date:$('date')?.value,gross:+($('gross')?.value||0)};
      originalSave();
      let rec=editingId?S.r.find(x=>x.id===editingId):null;
      if(!rec)rec=[...S.r].reverse().find(x=>x.invoice===signature.invoice&&x.client===signature.client&&x.date===signature.date&&Math.abs((+x.gross||0)-signature.gross)<0.01);
      if(rec){
        rec.deferredPlan=plan;
        if(plan.length){rec.defDate=plan[0].date;rec.defAmt=plan[0].remaining;}
        S.t=S.t.filter(t=>!(t.auto&&t.invoice===rec.invoice&&String(t.title||'').startsWith('Cobrar diferido')));
        plan.forEach((p,i)=>S.t.push({id:uid2(),title:`Cobrar diferido ${i+1}/${plan.length} · ${rec.invoice}`,date:p.date,note:`${rec.client} · ${fmt(p.remaining)}`,invoice:rec.invoice,auto:true,planId:p.id,done:false}));
        store(); render();
      }
    };
  }

  function originRecordById(id){return S.r.find(x=>x.id===id)}
  function groupOriginForInvoice(invoice){
    const direct=S.r.find(r=>r.invoice===invoice); return direct?.parentInvoice||direct?.sourceInvoice||invoice;
  }
  function relatedRecords(origin){return S.r.filter(r=>r.invoice===origin||r.parentInvoice===origin||r.sourceInvoice===origin).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));}

  window.tmInvoiceDetail=function(invoice){
    const origin=groupOriginForInvoice(invoice),rows=relatedRecords(origin),base=S.r.find(r=>r.invoice===origin)||rows[0]||{};
    const paid=rows.reduce((a,r)=>a+(+r.gross||0),0),fees=rows.reduce((a,r)=>a+(+r.agencyFee||0),0),pending=Math.max(0,+base.pending||0);
    const body=`<div class="tm-kpis"><div class="tm-kpi"><small>Factura origen</small><b style="font-size:16px">${esc(origin)}</b></div><div class="tm-kpi"><small>Total recibido</small><b>${fmt(paid)}</b></div><div class="tm-kpi"><small>Fees</small><b>${fmt(fees)}</b></div><div class="tm-kpi"><small>Saldo pendiente</small><b>${fmt(pending)}</b></div></div><div class="tm-note"><b>${esc(base.client||'')}</b> · ${esc(base.company||'')}</div><div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Fecha</th><th>Factura cobro</th><th>Relación</th><th>Método</th><th>Pago</th><th>Fee</th><th>Neto</th><th>Depósito</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.invoice)}</td><td>${r.invoice===origin?'Origen':'Pago de '+esc(origin)}</td><td>${esc(r.method)}</td><td>${fmt(r.gross)}</td><td>${fmt(r.agencyFee)}</td><td>${fmt(r.net)}</td><td>${esc(r.depStatus)}</td></tr>`).join('')}</tbody></table></div>`;
    popup(`Historial financiero · ${esc(origin)}`,body);
  };

  window.tmRegisterDeferredPayment=function(id,planId){
    const r=originRecordById(id); if(!r)return alert('No encontré el registro.');
    if(!Array.isArray(r.deferredPlan)||!r.deferredPlan.length){
      const rem=+r.pending||0; r.deferredPlan=rem>0?[{id:uid2(),date:r.defDate||'',amount:rem,remaining:rem,status:'Pendiente'}]:[];
    }
    const p=planId?r.deferredPlan.find(x=>x.id===planId):r.deferredPlan.find(x=>(+x.remaining||0)>0);
    if(!p)return alert('No hay un pago diferido pendiente.');
    const remaining=+p.remaining||0;
    const o=popup(`Registrar pago diferido · ${esc(r.invoice)}`,`<div class="tm-kpis"><div class="tm-kpi"><small>Cliente</small><b style="font-size:16px">${esc(r.client)}</b></div><div class="tm-kpi"><small>Factura origen</small><b style="font-size:16px">${esc(r.invoice)}</b></div><div class="tm-kpi"><small>Saldo de esta cuota</small><b>${fmt(remaining)}</b></div><div class="tm-kpi"><small>Saldo total</small><b>${fmt(r.pending)}</b></div></div><div class="tm-grid"><div class="tm-field"><label>Nueva factura / invoice de cobro <span class="tm-v2-required">*</span></label><input id="tmNewInvoice" placeholder="Ej. REC10310"></div><div class="tm-field"><label>Fecha del pago</label><input id="tmPayDate" type="date" value="${today()}"></div><div class="tm-field"><label>Monto recibido</label><input id="tmPayAmount" type="number" min="0.01" step="0.01" value="${remaining.toFixed(2)}"></div><div class="tm-field"><label>Método</label><select id="tmPayMethod"><option>Stripe</option><option>Zelle</option><option>Wire</option><option>ACH</option><option>Check</option></select></div><div class="tm-field"><label>Fee cobrado al cliente</label><input id="tmPayAgencyFee" type="number" min="0" step="0.01" value="0"></div><div class="tm-field" id="tmPayProcWrap"><label>Fee procesador</label><input id="tmPayProcFee" type="number" min="0" step="0.01" value="0"><div class="tm-v2-processor-note">Solo aplica cuando el método es Stripe.</div></div><div class="tm-field"><label>Estado depósito</label><select id="tmPayDep"><option>En proceso</option><option>Depositado</option></select></div></div><div class="tm-note">La nueva factura de cobro quedará vinculada a la factura origen ${esc(r.invoice)}. Así puedes tener una factura distinta sin perder la trazabilidad.</div>`,`<button class="btn soft" id="tmCancelPay">Cancelar</button><button class="btn navy" id="tmConfirmPay">Registrar pago</button>`);
    const method=o.querySelector('#tmPayMethod'),amount=o.querySelector('#tmPayAmount'),pf=o.querySelector('#tmPayProcFee'),wrap=o.querySelector('#tmPayProcWrap'),dep=o.querySelector('#tmPayDep');
    const calc=()=>{const stripe=method.value==='Stripe';wrap.classList.toggle('tm-hidden',!stripe);if(stripe){pf.value=((+amount.value||0)*.029+.30).toFixed(2);dep.value='En proceso'}else{pf.value='0';dep.value='Depositado'}};method.onchange=calc;amount.oninput=()=>{if(method.value==='Stripe')calc()};calc();
    o.querySelector('#tmCancelPay').onclick=()=>o.remove();
    o.querySelector('#tmConfirmPay').onclick=()=>{
      const inv=o.querySelector('#tmNewInvoice').value.trim(); if(!inv)return alert('Ingresa la nueva factura / invoice de cobro.');
      if(S.r.some(x=>x.invoice===inv))return alert('Esa invoice ya existe. Usa la nueva factura generada para este cobro.');
      const amt=+amount.value||0;if(amt<=0)return alert('Ingresa un monto válido.');if(amt>remaining+0.009)return alert(`Este pago no puede superar ${fmt(remaining)}.`);
      const procFee=method.value==='Stripe'?(+pf.value||0):0,agencyFee=+(o.querySelector('#tmPayAgencyFee').value||0),payDate=o.querySelector('#tmPayDate').value||today();
      S.r.push({id:uid2(),client:r.client,company:r.company,invoice:inv,parentInvoice:r.invoice,sourceInvoice:r.invoice,paymentPlanId:p.id,producer:r.producer,date:payDate,method:method.value,gross:amt,agencyFee,procFee,net:Math.max(0,amt-procFee),depStatus:dep.value,depDate:dep.value==='Depositado'?payDate:'',pending:0,defDate:'',defAmt:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'No aplica',note:`Pago diferido de factura origen ${r.invoice}`});
      p.remaining=Math.max(0,remaining-amt);p.status=p.remaining<=0?'Pagado':'Parcial';r.pending=Math.max(0,(+r.pending||0)-amt);
      const next=r.deferredPlan.find(x=>(+x.remaining||0)>0);r.defDate=next?.date||'';r.defAmt=+next?.remaining||0;
      const task=S.t.find(t=>t.planId===p.id&&!t.done);if(task&&p.remaining<=0){task.done=true;task.doneAt=today();task.status='Realizada'}else if(task&&p.remaining>0){task.note=`${r.client} · ${fmt(p.remaining)}`;}
      store();render();o.remove();alert(r.pending>0?`Pago registrado. Saldo total pendiente: ${fmt(r.pending)}`:'Pago registrado. La factura origen quedó saldada.');
    };
  };

  function deferredRows(){
    const out=[];S.r.filter(r=>+r.pending>0).forEach(r=>{
      if(!Array.isArray(r.deferredPlan)||!r.deferredPlan.length)r.deferredPlan=[{id:uid2(),date:r.defDate||'',amount:+r.pending||0,remaining:+r.pending||0,status:'Pendiente'}];
      r.deferredPlan.forEach((p,i)=>{if((+p.remaining||0)>0)out.push({r,p,i,total:r.deferredPlan.length})});
    });return out.sort((a,b)=>(a.p.date||'9999').localeCompare(b.p.date||'9999'));
  }

  function renderDeferredV2(){
    const body=$('defBody');if(!body)return;const table=body.closest('table'),hr=table.querySelector('thead tr');
    hr.innerHTML='<th>Cliente</th><th>Factura origen</th><th>Pago</th><th>Fecha</th><th>Monto</th><th>Estado</th><th>Acción</th>';
    body.innerHTML=deferredRows().map(({r,p,i,total})=>{const late=p.date&&daysTo(p.date)<0;const st=late?'Vencido':p.status==='Parcial'?'Parcial':'Pendiente';const cls=late?'late':p.status==='Parcial'?'partial':'pending';return `<tr><td>${esc(r.client)}</td><td><button class="tm-link" onclick="tmInvoiceDetail('${String(r.invoice).replace(/'/g,"\\'")}')">${esc(r.invoice)}</button></td><td>${i+1}/${total}</td><td>${esc(p.date||'—')}</td><td>${fmt(p.remaining)}</td><td><span class="tm-status ${cls}">${st}</span></td><td><div class="tm-actions"><button class="tm-mini green" onclick="tmRegisterDeferredPayment('${r.id}','${p.id}')">Registrar pago</button><button class="tm-mini" onclick="tmInvoiceDetail('${String(r.invoice).replace(/'/g,"\\'")}')">Ver historial</button></div></td></tr>`}).join('')||'<tr><td colspan="7">Sin diferidos pendientes</td></tr>';
  }

  window.tmTaskDone=function(id,done=true){const t=S.t.find(x=>x.id===id);if(!t)return;t.done=done;t.status=done?'Realizada':'Abierta';t.doneAt=done?today():'';store();render();window.tmOpenTasks?.();};
  window.tmOpenTasks=function(){
    const open=S.t.filter(t=>!t.done).sort((a,b)=>(a.date||'').localeCompare(b.date||'')),done=S.t.filter(t=>t.done).sort((a,b)=>(b.doneAt||'').localeCompare(a.doneAt||''));
    const row=(t,isDone)=>`<div class="tm-v2-task ${isDone?'tm-v2-done':''}"><div><b>${esc(t.title)}</b><div class="tm-note">${esc(t.note||'')}</div></div><div>${esc(t.date||'—')}</div><div>${isDone?`<button class="tm-mini" onclick="tmTaskDone('${t.id}',false)">Reabrir</button>`:`<button class="tm-mini green" onclick="tmTaskDone('${t.id}',true)">Marcar realizada</button>`}</div></div>`;
    popup('Tareas',`<h4 style="color:#173f69">Abiertas (${open.length})</h4>${open.map(t=>row(t,false)).join('')||'<div class="tm-note">No hay tareas abiertas.</div>'}<h4 style="color:#173f69;margin-top:20px">Realizadas (${done.length})</h4>${done.slice(0,20).map(t=>row(t,true)).join('')||'<div class="tm-note">No hay tareas realizadas.</div>'}`);
  };

  function renderTaskTab(){const el=$('taskList');if(!el)return;const open=S.t.filter(t=>!t.done).sort((a,b)=>(a.date||'').localeCompare(b.date||''));el.innerHTML=open.map(t=>`<div class="card box" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>${esc(t.title)}</b><div class="sub">${esc(t.note||'')} · ${esc(t.date||'')}</div></div><button class="tm-mini green" onclick="tmTaskDone('${t.id}',true)">Marcar realizada</button></div></div>`).join('')||'<div class="sub">No hay tareas abiertas.</div>';}

  function producerRows12(){
    const end=new Date(+$('yr')?.value||new Date().getFullYear(),+( $('mo')?.value||new Date().getMonth()+1),1),start=new Date(end);start.setMonth(start.getMonth()-12);
    return S.r.filter(r=>{const d=new Date((r.date||'1900-01-01')+'T12:00:00');return d>=start&&d<end&&(+r.agencyFee||0)>0});
  }
  window.tmProducerDetail=function(name){
    const rows=producerRows12().filter(r=>r.producer===name);const byClient={};rows.forEach(r=>{const k=r.client||'Sin nombre';byClient[k]=(byClient[k]||0)+(+r.agencyFee||0)});
    const clients=Object.entries(byClient).sort((a,b)=>b[1]-a[1]);
    popup(`Fees cobrados · ${esc(name)}`,`<div class="tm-kpis"><div class="tm-kpi"><small>Producer</small><b style="font-size:16px">${esc(name)}</b></div><div class="tm-kpi"><small>Clientes</small><b>${clients.length}</b></div><div class="tm-kpi"><small>Operaciones</small><b>${rows.length}</b></div><div class="tm-kpi"><small>Total fees</small><b>${fmt(rows.reduce((a,r)=>a+(+r.agencyFee||0),0))}</b></div></div><div class="tablewrap"><table><thead><tr><th>Cliente</th><th>Fee total</th></tr></thead><tbody>${clients.map(([c,v])=>`<tr><td>${esc(c)}</td><td>${fmt(v)}</td></tr>`).join('')}</tbody></table></div><div class="tablewrap" style="margin-top:18px"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Método</th><th>Fee</th></tr></thead><tbody>${rows.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.client)}</td><td>${esc(r.invoice)}</td><td>${esc(r.method)}</td><td>${fmt(r.agencyFee)}</td></tr>`).join('')}</tbody></table></div>`);
  };
  function renderProducerRank(){const box=$('producerRank');if(!box)return;const agg={};producerRows12().forEach(r=>agg[r.producer]=(agg[r.producer]||0)+(+r.agencyFee||0));const arr=Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,6),mx=arr[0]?.[1]||1;box.innerHTML=arr.map(([n,v])=>`<div class="rank tm-v2-producer-row" onclick="tmProducerDetail('${String(n).replace(/'/g,"\\'")}')"><b>${esc(n)}</b><div class="track"><div class="fill g" style="width:${Math.max(5,v/mx*100)}%"></div></div><b style="text-align:right">${fmt(v)}</b></div>`).join('')||'<div class="sub" style="margin-top:15px">Sin datos suficientes.</div>';}

  function decorateAlerts(){const a4=document.querySelector('.alert.a4');if(a4){a4.classList.add('tm-clickcard');a4.onclick=()=>tmOpenTasks();}if($('taskN'))$('taskN').textContent=S.t.filter(t=>!t.done).length;}

  const prevRender=window.render;
  if(typeof prevRender==='function'){
    window.render=function(){prevRender();setTimeout(()=>{renderDeferredV2();renderTaskTab();renderProducerRank();decorateAlerts();processorFieldRules();},0);};
  }

  addStyle();setTimeout(()=>{processorFieldRules();ensureDeferredPlanUI();renderDeferredV2();renderTaskTab();renderProducerRank();decorateAlerts();},250);
})();
