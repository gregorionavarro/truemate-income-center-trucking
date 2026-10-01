(() => {
  if (window.__tmExecutiveRankingsV2Loaded) return;
  window.__tmExecutiveRankingsV2Loaded = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => typeof money === 'function' ? money(v) : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const rowsAll = () => Array.isArray(window.S?.r) ? S.r : [];
  const last12 = () => {
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth()-12);
    return rowsAll().filter(r => {
      if(!r.date) return false;
      const d = new Date(r.date+'T12:00:00');
      return !Number.isNaN(d.getTime()) && d >= cutoff;
    });
  };

  function ensureStyle(){
    if ($('tm-exec-rank-style-v2')) return;
    const s=document.createElement('style'); s.id='tm-exec-rank-style-v2';
    s.textContent=`
      #summary .insights{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:16px!important}
      .tm-exec-card{padding:20px!important;min-height:238px;position:relative;overflow:hidden}
      .tm-exec-title{font-size:13px;text-transform:uppercase;color:#526a84;font-weight:950;letter-spacing:.7px;margin-bottom:4px}
      .tm-exec-hint{font-size:11px;color:#8293a7;font-weight:800;margin-bottom:15px;display:flex;align-items:center;gap:5px}
      .tm-exec-list{display:flex;flex-direction:column;gap:13px}
      .tm-exec-row{display:grid;grid-template-columns:34px minmax(0,1fr) 112px 18px;gap:10px;align-items:center;padding:2px 0;cursor:pointer;border-radius:10px;transition:.15s}
      .tm-exec-row:hover{background:#f4f8fc;transform:translateX(2px)}
      .tm-exec-num{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#edf4fb;color:#2b557f;font-weight:950;font-size:14px}
      .tm-exec-main{min-width:0}.tm-exec-name{font-weight:950;color:#173f69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:16px}
      .tm-exec-track{height:7px;background:#edf1f5;border-radius:99px;overflow:hidden;margin-top:6px}.tm-exec-fill{height:100%;background:linear-gradient(90deg,#249b62,#73d8a0);border-radius:99px}.tm-exec-fill.blue{background:linear-gradient(90deg,#2f7ac0,#77b9ee)}.tm-exec-fill.gold{background:linear-gradient(90deg,#c8921d,#edc864)}
      .tm-exec-value{text-align:right;font-weight:950;color:#173f69;font-size:15px}.tm-exec-arrow{font-size:20px;color:#5c7b99;font-weight:900}
      .tm-exec-toggle{margin-top:14px;border:0;background:#edf4fb;color:#195b93;font-weight:900;cursor:pointer;padding:8px 11px;font-size:12px;border-radius:9px}
      .tm-exec-empty{padding:20px 2px;color:#6d7d92;font-size:14px;line-height:1.55}.tm-exec-empty b{display:block;color:#173f69;margin-bottom:5px;font-size:17px}
      .tm-exec-detail-table{width:100%;border-collapse:collapse;font-size:13px}.tm-exec-detail-table th{background:#edf4fb;color:#50657f;text-transform:uppercase;font-size:10px;text-align:left;padding:9px}.tm-exec-detail-table td{padding:9px;border-bottom:1px solid #e9eef4}.tm-exec-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}.tm-exec-kpi{border:1px solid #dde6ef;border-radius:12px;padding:12px}.tm-exec-kpi small{display:block;color:#70859b;text-transform:uppercase;font-weight:900;font-size:10px}.tm-exec-kpi b{display:block;color:#173f69;font-size:20px;margin-top:4px}
      .tm-recent-expand{border:0;border-radius:9px;padding:9px 12px;background:#173f69;color:#fff;font-weight:900;cursor:pointer;margin-left:8px}.tm-recent-expand.secondary{background:#edf4fb;color:#173f69}
      .analytics{display:none!important}
      @media(max-width:1100px){#summary .insights{grid-template-columns:1fr!important}.tm-exec-card{min-height:0}}
      @media(max-width:950px){.tm-exec-row{grid-template-columns:32px 1fr 90px 16px}.tm-exec-summary{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }

  function ensureLegacyPlaceholders(){
    if($('tm-exec-legacy-placeholders')) return;
    const p=document.createElement('div');p.id='tm-exec-legacy-placeholders';p.style.display='none';
    p.innerHTML='<span id="topProd"></span><span id="topProdSub"></span><span id="topCar"></span><span id="topCarSub"></span><span id="topMethod"></span><span id="topMethodSub"></span><span id="alertN"></span>';
    document.body.appendChild(p);
  }

  function popup(title, body){
    document.querySelector('.tm-overlay')?.remove();
    const o=document.createElement('div');o.className='tm-overlay';
    o.innerHTML=`<div class="tm-pop"><div class="tm-pop-h"><h3>${title}</h3><button class="tm-close" type="button">×</button></div><div class="tm-pop-b">${body}</div></div>`;
    o.querySelector('.tm-close').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});document.body.appendChild(o);
  }

  function producerDetail(name){
    const rows=last12().filter(r=>r.producer===name && (+r.agencyFee||0)>0).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const byClient={}; rows.forEach(r=>{const k=r.client||'Sin cliente'; if(!byClient[k])byClient[k]={fee:0,n:0}; byClient[k].fee+=+r.agencyFee||0;byClient[k].n++;});
    const total=rows.reduce((a,r)=>a+(+r.agencyFee||0),0), clients=Object.entries(byClient).sort((a,b)=>b[1].fee-a[1].fee);
    popup(`Producer · ${esc(name)}`,`<div class="tm-exec-summary"><div class="tm-exec-kpi"><small>Fee total</small><b>${fmt(total)}</b></div><div class="tm-exec-kpi"><small>Clientes</small><b>${clients.length}</b></div><div class="tm-exec-kpi"><small>Operaciones</small><b>${rows.length}</b></div></div><div class="tablewrap"><table class="tm-exec-detail-table"><thead><tr><th>Cliente</th><th>Operaciones</th><th>Fee cobrado</th></tr></thead><tbody>${clients.map(([c,x])=>`<tr><td>${esc(c)}</td><td>${x.n}</td><td><b>${fmt(x.fee)}</b></td></tr>`).join('')||'<tr><td colspan="3">Sin fees registrados.</td></tr>'}</tbody></table></div><div style="height:14px"></div><div class="tablewrap"><table class="tm-exec-detail-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Fee</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td><b>${fmt(r.agencyFee)}</b></td></tr>`).join('')||'<tr><td colspan="4">Sin movimientos.</td></tr>'}</tbody></table></div>`);
  }

  function carrierDetail(name){
    const rows=rowsAll().filter(r=>r.carrier===name && r.carrierStatus==='Pagado' && (+r.carrierAmt||0)>0).slice().sort((a,b)=>(b.carrierDue||b.date||'').localeCompare(a.carrierDue||a.date||''));
    const total=rows.reduce((a,r)=>a+(+r.carrierAmt||0),0);
    popup(`Aseguradora · ${esc(name)}`,`<div class="tm-exec-summary"><div class="tm-exec-kpi"><small>Total pagado</small><b>${fmt(total)}</b></div><div class="tm-exec-kpi"><small>Pagos</small><b>${rows.length}</b></div><div class="tm-exec-kpi"><small>Clientes</small><b>${new Set(rows.map(r=>r.client)).size}</b></div></div><div class="tablewrap"><table class="tm-exec-detail-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Monto</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.carrierDue||r.date||'')}</td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td><b>${fmt(r.carrierAmt)}</b></td></tr>`).join('')||'<tr><td colspan="4">Sin pagos registrados.</td></tr>'}</tbody></table></div>`);
  }

  function methodDetail(name){
    const rows=rowsAll().filter(r=>r.method===name && (+r.gross||0)>0).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const total=rows.reduce((a,r)=>a+(+r.gross||0),0), last=rows[0]?.date||'—';
    popup(`Método de pago · ${esc(name)}`,`<div class="tm-exec-summary"><div class="tm-exec-kpi"><small>Total procesado</small><b>${fmt(total)}</b></div><div class="tm-exec-kpi"><small>Pagos</small><b>${rows.length}</b></div><div class="tm-exec-kpi"><small>Último uso</small><b style="font-size:16px">${esc(last)}</b></div></div><div class="tablewrap"><table class="tm-exec-detail-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Invoice</th><th>Producer</th><th>Monto</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.client||'')}</td><td>${esc(r.invoice||'')}</td><td>${esc(r.producer||'')}</td><td><b>${fmt(r.gross)}</b></td></tr>`).join('')||'<tr><td colspan="5">Sin movimientos.</td></tr>'}</tbody></table></div>`);
  }

  function rankingCard(card,title,items,kind,colorClass,expanded){
    const max=items[0]?.[1]||1, visible=expanded?items:items.slice(0,3);
    const attr=kind==='producer'?'data-producer':kind==='carrier'?'data-carrier':'data-method';
    card.innerHTML=`<div class="tm-exec-title">${title}</div><div class="tm-exec-hint">Haz clic para revisar detalle <span>→</span></div>${visible.length?`<div class="tm-exec-list">${visible.map(([n,v],i)=>`<div class="tm-exec-row" ${attr}="${esc(n)}"><div class="tm-exec-num">${i+1}</div><div class="tm-exec-main"><div class="tm-exec-name">${esc(n)}</div><div class="tm-exec-track"><div class="tm-exec-fill ${colorClass}" style="width:${Math.max(5,v/max*100)}%"></div></div></div><div class="tm-exec-value">${fmt(v)}</div><div class="tm-exec-arrow">›</div></div>`).join('')}</div>`:`<div class="tm-exec-empty"><b>Aún no hay datos registrados</b>La información aparecerá aquí cuando existan movimientos.</div>`}${items.length>3?`<button class="tm-exec-toggle">${expanded?'Ver menos ↑':'Ver más ↓'}</button>`:''}`;
    card.querySelectorAll(`[${attr}]`).forEach(el=>{el.onclick=()=>{const n=el.getAttribute(attr); if(kind==='producer')producerDetail(n); else if(kind==='carrier')carrierDetail(n); else methodDetail(n);};});
    const tog=card.querySelector('.tm-exec-toggle'); if(tog)tog.onclick=()=>{card.dataset.expanded=expanded?'0':'1';build()};
  }

  function build(){
    ensureStyle();ensureLegacyPlaceholders();
    const insightWrap=document.querySelector('#summary .insights'); if(!insightWrap) return;
    let cards=[...insightWrap.children].filter(x=>!x.classList.contains('tm-hidden-legacy'));
    if(cards.length<3) return;
    if(cards[3]){cards[3].style.display='none';cards[3].classList.add('tm-hidden-legacy');}
    cards=[...insightWrap.children].filter(x=>!x.classList.contains('tm-hidden-legacy')).slice(0,3);
    const [prodCard,carCard,methodCard]=cards; cards.forEach(c=>c.classList.add('tm-exec-card'));

    const pAgg={}; last12().forEach(r=>{if(r.producer)pAgg[r.producer]=(pAgg[r.producer]||0)+(+r.agencyFee||0)});
    const producers=Object.entries(pAgg).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    rankingCard(prodCard,'Top Producers · Últimos 12 meses',producers,'producer','',prodCard.dataset.expanded==='1');

    const cAgg={}; rowsAll().forEach(r=>{if(r.carrier&&r.carrierStatus==='Pagado')cAgg[r.carrier]=(cAgg[r.carrier]||0)+(+r.carrierAmt||0)});
    const carriers=Object.entries(cAgg).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    rankingCard(carCard,'Pagos a aseguradoras · Histórico',carriers,'carrier','blue',carCard.dataset.expanded==='1');

    const mAgg={}; rowsAll().forEach(r=>{if(r.method)mAgg[r.method]=(mAgg[r.method]||0)+(+r.gross||0)});
    const methods=Object.entries(mAgg).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    rankingCard(methodCard,'Métodos de pago · Histórico',methods,'method','gold',methodCard.dataset.expanded==='1');
  }

  let recentExpanded=false;
  function applyRecentLimit(){
    const body=$('recent'); if(!body)return;
    const rows=[...body.querySelectorAll('tr')];
    rows.forEach((tr,i)=>tr.style.display=(recentExpanded||i<5)?'':'none');
    const box=body.closest('.card'); if(!box)return;
    const head=box.querySelector('.head'); if(!head)return;
    let btn=$('tmRecentExpand');
    if(!btn){btn=document.createElement('button');btn.id='tmRecentExpand';btn.className='tm-recent-expand';head.appendChild(btn);btn.onclick=()=>{recentExpanded=!recentExpanded;applyRecentLimit();};}
    const count=rows.length;
    btn.style.display=count>5?'inline-flex':'none';
    btn.textContent=recentExpanded?'Mostrar menos ↑':`Mostrar más (${Math.max(0,count-5)}) ↓`;
  }

  function watchRecent(){
    const body=$('recent'); if(!body||body.dataset.tmExecWatched)return;
    body.dataset.tmExecWatched='1';
    new MutationObserver(()=>setTimeout(applyRecentLimit,0)).observe(body,{childList:true});
    applyRecentLimit();
  }

  const originalRender=window.render;
  if(typeof originalRender==='function') window.render=function(){originalRender();setTimeout(()=>{build();watchRecent();applyRecentLimit();},0)};
  setTimeout(()=>{build();watchRecent();applyRecentLimit();},0);
})();