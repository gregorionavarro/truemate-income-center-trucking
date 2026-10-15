(() => {
  if (window.__tmMonthlyExecutiveLoaded) return;
  window.__tmMonthlyExecutiveLoaded = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const fmt = v => typeof money === 'function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const rowsAll = () => Array.isArray(window.S?.r) ? S.r : (typeof S !== 'undefined' && Array.isArray(S.r) ? S.r : []);
  const monthKey = () => {
    const y = $('yr')?.value || new Date().getFullYear();
    const m = $('mo')?.value || String(new Date().getMonth()+1).padStart(2,'0');
    return `${y}-${String(m).padStart(2,'0')}`;
  };
  const monthRows = () => rowsAll().filter(r => String(r.date||'').slice(0,7) === monthKey());
  const carrierPaidDate = r => String(r.carrierPaidDate || r.carrierPaidAt || r.date || '').slice(0,10);
  const carrierMonthRows = () => rowsAll().filter(r => r.carrierStatus==='Pagado' && (+r.carrierAmt||0)>0 && carrierPaidDate(r).slice(0,7)===monthKey());
  const monthLabel = () => {
    const names=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const mi = Math.max(0,(+($('mo')?.value||1))-1);
    return `${names[mi]} de ${$('yr')?.value||new Date().getFullYear()}`;
  };

  function ensureStyle(){
    if ($('tm-monthly-exec-style')) return;
    const s=document.createElement('style'); s.id='tm-monthly-exec-style';
    s.textContent=`.tm-month-label{font-size:11px;color:#8293a7;font-weight:800;margin:-2px 0 12px}.tm-exec-row{cursor:pointer}`;
    document.head.appendChild(s);
  }

  function popup(title, body){
    document.querySelector('.tm-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-overlay';
    o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div></div>`;
    o.querySelector('.tm-close').onclick=()=>o.remove();
    o.addEventListener('click',e=>{if(e.target===o)o.remove()});
    document.body.appendChild(o);
  }

  function producerDetail(name){
    const rows=monthRows().filter(r=>r.producer===name && (+r.agencyFee||0)>0).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const byClient={}; rows.forEach(r=>{const k=r.client||'Sin cliente'; if(!byClient[k])byClient[k]={fee:0,n:0}; byClient[k].fee+=+r.agencyFee||0;byClient[k].n++;});
    const total=rows.reduce((a,r)=>a+(+r.agencyFee||0),0), clients=Object.entries(byClient).sort((a,b)=>b[1].fee-a[1].fee);
    popup(`Producer · ${esc(name)} · ${esc(monthLabel())}`,`<div class="tm-exec-summary"><div class="tm-exec-kpi"><small>Fee del mes</small><b>${fmt(total)}</b></div><div class="tm-exec-kpi"><small>Clientes</small><b>${clients.length}</b></div><div class="tm-exec-kpi"><small>Operaciones</small><b>${rows.length}</b></div></div><div class="tablewrap"><table class="tm-exec-detail-table"><thead><tr><th>Cliente</th><th>Operaciones</th><th>Fee cobrado</th></tr></thead><tbody>${clients.map(([c,x])=>`<tr><td>${esc(c)}</td><td>${x.n}</td><td><b>${fmt(x.fee)}</b></td></tr>`).join('')||'<tr><td colspan="3">Sin fees registrados en este mes.</td></tr>'}</tbody></table></div>`);
  }

  function carrierDetail(name){
    const rows=carrierMonthRows().filter(r=>r.carrier===name).slice().sort((a,b)=>carrierPaidDate(b).localeCompare(carrierPaidDate(a)));
    const total=rows.reduce((a,r)=>a+(+r.carrierAmt||0),0);
    popup(`Aseguradora · ${esc(name)} · ${esc(monthLabel())}`,`<div class="tm-exec-summary"><div class="tm-exec-kpi"><small>Total pagado mes</small><b>${fmt(total)}</b></div><div class="tm-exec-kpi"><small>Pagos</small><b>${rows.length}</b></div><div class="tm-exec-kpi"><small>Clientes</small><b>${new Set(rows.map(r=>r.client)).size}</b></div></div><div class="tablewrap"><table class="tm-exec-detail-table"><thead><tr><th>Fecha pago</th><th>Cliente</th><th>Invoice</th><th>Monto</th><th>Comprobantes</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${esc(carrierPaidDate(r)||'')}</td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td><b>${fmt(r.carrierAmt)}</b></td><td data-receipt-row="${i}">Cargando…</td></tr>`).join('')||'<tr><td colspan="5">Sin pagos registrados en este mes.</td></tr>'}</tbody></table></div>`);
    const overlay=document.querySelector('.tm-overlay');
    rows.forEach(async(r,i)=>{
      const cell=overlay?.querySelector('[data-receipt-row="'+i+'"]');
      if(!cell)return;
      if(!r.id){cell.textContent='Sin identificador';return;}
      const base='/api/carrier-receipts?record_id='+encodeURIComponent(String(r.id));
      try{
        const response=await fetch(base,{cache:'no-store'});
        const data=await response.json();
        if(!response.ok)throw Error(data.error||'No disponible');
        if(!cell.isConnected)return;
        cell.replaceChildren();
        if(!data.items?.length){cell.textContent='Sin comprobante';return;}
        for(const item of data.items){
          const group=document.createElement('div');group.style.cssText='display:flex;flex-direction:column;align-items:flex-start;gap:7px;margin:6px 0;min-width:0;max-width:100%';
          const name=document.createElement('div');name.textContent=item.original_name;name.title=item.original_name;name.style.cssText='display:block;max-width:100%;min-width:0;overflow-wrap:anywhere;word-break:break-word;font-size:12px;line-height:1.4';
          const view=document.createElement('a');view.href=base+'&receipt_id='+encodeURIComponent(item.id)+'&inline=1';view.target='_blank';view.rel='noopener';view.textContent='Ver';
          const download=document.createElement('a');download.href=base+'&receipt_id='+encodeURIComponent(item.id);download.textContent='Descargar';
          const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:12px;align-items:center';actions.append(view,download);group.append(name,actions);cell.style.cssText='min-width:210px;max-width:340px;white-space:normal;vertical-align:top';cell.append(group);
        }
      }catch(error){if(cell.isConnected)cell.textContent='No disponible: '+error.message;}
    });
  }

  function methodDetail(name){
    const rows=monthRows().filter(r=>r.method===name && (+r.gross||0)>0).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const total=rows.reduce((a,r)=>a+(+r.gross||0),0), last=rows[0]?.date||'—';
    popup(`Método de pago · ${esc(name)} · ${esc(monthLabel())}`,`<div class="tm-exec-summary"><div class="tm-exec-kpi"><small>Total del mes</small><b>${fmt(total)}</b></div><div class="tm-exec-kpi"><small>Pagos</small><b>${rows.length}</b></div><div class="tm-exec-kpi"><small>Último uso</small><b style="font-size:16px">${esc(last)}</b></div></div><div class="tablewrap"><table class="tm-exec-detail-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Producer</th><th>Monto</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td>${esc(r.producer||'')}</td><td><b>${fmt(r.gross)}</b></td></tr>`).join('')||'<tr><td colspan="5">Sin movimientos en este mes.</td></tr>'}</tbody></table></div>`);
  }

  function renderCard(card,title,items,kind,colorClass){
    const max=items[0]?.[1]||1;
    const visible=items.slice(0,3);
    const attr=kind==='producer'?'data-mproducer':kind==='carrier'?'data-mcarrier':'data-mmethod';
    card.innerHTML=`<div class="tm-exec-title">${title}</div><div class="tm-exec-hint">Haz clic para revisar detalle <span>→</span></div><div class="tm-month-label">${esc(monthLabel())}</div>${visible.length?`<div class="tm-exec-list">${visible.map(([n,v],i)=>`<div class="tm-exec-row" ${attr}="${esc(n)}"><div class="tm-exec-num">${i+1}</div><div class="tm-exec-main"><div class="tm-exec-name">${esc(n)}</div><div class="tm-exec-track"><div class="tm-exec-fill ${colorClass}" style="width:${Math.max(5,v/max*100)}%"></div></div></div><div class="tm-exec-value">${fmt(v)}</div><div class="tm-exec-arrow">›</div></div>`).join('')}</div>`:`<div class="tm-exec-empty"><b>Aún no hay datos registrados</b>No hay movimientos para ${esc(monthLabel())}.</div>`}`;
    card.querySelectorAll(`[${attr}]`).forEach(el=>el.onclick=()=>{const n=el.getAttribute(attr);if(kind==='producer')producerDetail(n);else if(kind==='carrier')carrierDetail(n);else methodDetail(n);});
  }

  function buildMonthly(){
    ensureStyle();
    const wrap=document.querySelector('#summary .insights'); if(!wrap)return;
    const cards=[...wrap.children].filter(x=>!x.classList.contains('tm-hidden-legacy')).slice(0,3);
    if(cards.length<3)return;
    const rows=monthRows();
    const pAgg={},cAgg={},mAgg={};
    rows.forEach(r=>{if(r.producer)pAgg[r.producer]=(pAgg[r.producer]||0)+(+r.agencyFee||0);if(r.method)mAgg[r.method]=(mAgg[r.method]||0)+(+r.gross||0);});
    carrierMonthRows().forEach(r=>{if(r.carrier)cAgg[r.carrier]=(cAgg[r.carrier]||0)+(+r.carrierAmt||0)});
    const sort=o=>Object.entries(o).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    renderCard(cards[0],'Top Producers · Mes',sort(pAgg),'producer','');
    renderCard(cards[1],'Pagos a aseguradoras · Mes',sort(cAgg),'carrier','blue');
    renderCard(cards[2],'Métodos de pago · Mes',sort(mAgg),'method','gold');
  }

  window.tmRefreshMonthlyExecutive=buildMonthly;
  const prevRender=window.render;
  if(typeof prevRender==='function') window.render=function(){prevRender();setTimeout(buildMonthly,30);};
  $('mo')?.addEventListener('change',()=>setTimeout(buildMonthly,40));
  $('yr')?.addEventListener('change',()=>setTimeout(buildMonthly,40));
  setTimeout(buildMonthly,80);
})();