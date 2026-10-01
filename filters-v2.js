(() => {
  if (window.__tmFiltersV2Loaded) return;
  window.__tmFiltersV2Loaded = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => typeof money==='function'?money(v):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+v||0);
  const badge = r => String(r.depStatus||'').toLowerCase()==='depositado' ? '<span class="badge ok">Depositado</span>' : '<span class="badge proc">En proceso</span>';
  const fmtDate = v => { if(!v) return '—'; const d=new Date(v+'T12:00:00'); return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}); };

  let recentSort='desc';
  const incomeFilter={month:'all',producer:'all',method:'all',sort:'desc',search:''};

  function addStyle(){
    if($('tm-filters-v2-style')) return;
    const st=document.createElement('style'); st.id='tm-filters-v2-style';
    st.textContent=`
      #summary .tm-filters{display:none!important}
      #tmRecentExpand{display:none!important}
      .tm-recent-sort{display:flex;align-items:center;gap:8px;margin-left:auto}
      .tm-recent-sort label{font-size:11px;font-weight:900;text-transform:uppercase;color:#6a7f96}
      .tm-recent-sort select{border:1px solid #d9e3ee;border-radius:9px;padding:8px 10px;background:#fff;color:#20324d;font-weight:700}
      #income .tm-income-filters{display:grid;grid-template-columns:1.25fr repeat(4,minmax(145px,1fr));gap:10px;padding:12px;margin:0 0 14px;background:#f7faff;border:1px solid #dbe6f1;border-radius:13px}
      #income .tm-income-filter label{display:block;font-size:10px;font-weight:900;text-transform:uppercase;color:#6a7f96;margin-bottom:5px}
      #income .tm-income-filter select,#income .tm-income-filter input{width:100%;border:1px solid #d9e3ee;border-radius:9px;padding:9px;background:#fff;color:#20324d}
      .tm-search-wrap{position:relative}.tm-search-wrap span{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:14px;color:#6a7f96}.tm-search-wrap input{padding-left:32px!important}
      @media(max-width:1050px){#income .tm-income-filters{grid-template-columns:1fr 1fr 1fr}.tm-recent-sort{width:100%;margin-top:8px}}
      @media(max-width:650px){#income .tm-income-filters{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function renderRecentClean(){
    const body=$('recent'); if(!body) return;
    const card=body.closest('.card'); const table=body.closest('table'); if(!card||!table) return;
    card.querySelectorAll('.tm-filters').forEach(x=>x.remove());
    $('tmRecentExpand')?.remove();

    const head=card.querySelector('.head');
    if(head && !head.querySelector('.tm-recent-sort')){
      const wrap=document.createElement('div'); wrap.className='tm-recent-sort';
      wrap.innerHTML='<label>Ordenar por fecha</label><select id="tmRecentSort"><option value="desc">Más reciente → más antigua</option><option value="asc">Más antigua → más reciente</option></select>';
      const btn=head.querySelector('.btn.soft'); if(btn) head.insertBefore(wrap,btn); else head.appendChild(wrap);
      wrap.querySelector('select').value=recentSort;
      wrap.querySelector('select').onchange=e=>{recentSort=e.target.value;renderRecentClean();};
    }

    const hr=table.querySelector('thead tr');
    if(hr) hr.innerHTML='<th>Fecha pago</th><th>Cliente</th><th>Invoice</th><th>Neto</th><th>Depósito</th><th>Acción</th>';

    const rows=(Array.isArray(window.S?.r)?S.r:[]).slice().sort((a,b)=>recentSort==='asc'?String(a.date||'').localeCompare(String(b.date||'')):String(b.date||'').localeCompare(String(a.date||''))).slice(0,5);
    body.innerHTML=rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${esc(r.client||'')}</td><td><button class="tm-link" onclick="tmInvoiceDetail('${String(r.invoice||'').replace(/'/g,"\\'")}')">${esc(r.invoice||'')}</button></td><td><b>${fmt(r.net)}</b></td><td>${badge(r)}</td><td><button class="btn soft" onclick="openModal('${r.id}')">Editar</button><button class="btn danger" onclick="deleteIncome('${r.id}')">Eliminar</button></td></tr>`).join('')||'<tr><td colspan="6">Sin movimientos.</td></tr>';
  }

  function ensureIncomeFilters(){
    const body=$('incomeBody'); if(!body) return;
    const panel=body.closest('.panel'); const wrap=body.closest('.tablewrap'); if(!panel||!wrap) return;
    let f=panel.querySelector('.tm-income-filters');
    if(!f){
      f=document.createElement('div'); f.className='tm-income-filters';
      f.innerHTML=`<div class="tm-income-filter"><label>Buscar</label><div class="tm-search-wrap"><span>🔍</span><input id="tmIncomeSearch" type="search" placeholder="Cliente, invoice o empresa"></div></div><div class="tm-income-filter"><label>Mes</label><select id="tmIncomeMonth"><option value="all">Todos</option></select></div><div class="tm-income-filter"><label>Producer</label><select id="tmIncomeProducer"><option value="all">Todos</option></select></div><div class="tm-income-filter"><label>Método</label><select id="tmIncomeMethod"><option value="all">Todos</option><option>Stripe</option><option>Zelle</option><option>Wire</option><option>ACH</option><option>Check</option></select></div><div class="tm-income-filter"><label>Ordenar por fecha</label><select id="tmIncomeSort"><option value="desc">Más reciente → más antigua</option><option value="asc">Más antigua → más reciente</option></select></div>`;
      panel.insertBefore(f,wrap);
      ['tmIncomeMonth','tmIncomeProducer','tmIncomeMethod','tmIncomeSort'].forEach(id=>f.querySelector('#'+id).onchange=()=>{
        incomeFilter.month=f.querySelector('#tmIncomeMonth').value;
        incomeFilter.producer=f.querySelector('#tmIncomeProducer').value;
        incomeFilter.method=f.querySelector('#tmIncomeMethod').value;
        incomeFilter.sort=f.querySelector('#tmIncomeSort').value;
        renderIncomeFiltered();
      });
      f.querySelector('#tmIncomeSearch').oninput=e=>{incomeFilter.search=e.target.value;renderIncomeFiltered();};
    }

    const months=[...new Set((S.r||[]).map(r=>(r.date||'').slice(0,7)).filter(Boolean))].sort().reverse();
    const m=f.querySelector('#tmIncomeMonth'), p=f.querySelector('#tmIncomeProducer'), me=f.querySelector('#tmIncomeMethod'), so=f.querySelector('#tmIncomeSort'), se=f.querySelector('#tmIncomeSearch');
    m.innerHTML='<option value="all">Todos</option>'+months.map(x=>`<option value="${x}">${x}</option>`).join(''); m.value=months.includes(incomeFilter.month)?incomeFilter.month:'all'; incomeFilter.month=m.value;
    p.innerHTML='<option value="all">Todos</option>'+(S.p||[]).map(x=>`<option>${esc(x)}</option>`).join(''); p.value=(S.p||[]).includes(incomeFilter.producer)?incomeFilter.producer:'all'; incomeFilter.producer=p.value;
    me.value=incomeFilter.method; so.value=incomeFilter.sort; if(se&&se.value!==incomeFilter.search)se.value=incomeFilter.search;
  }

  function renderIncomeFiltered(){
    const body=$('incomeBody'); if(!body) return;
    ensureIncomeFilters();
    let rows=(S.r||[]).slice();
    if(incomeFilter.search.trim()){
      const q=incomeFilter.search.trim().toLowerCase();
      rows=rows.filter(r=>[r.client,r.invoice,r.company].some(v=>String(v||'').toLowerCase().includes(q)));
    }
    if(incomeFilter.month!=='all') rows=rows.filter(r=>(r.date||'').slice(0,7)===incomeFilter.month);
    if(incomeFilter.producer!=='all') rows=rows.filter(r=>r.producer===incomeFilter.producer);
    if(incomeFilter.method!=='all') rows=rows.filter(r=>r.method===incomeFilter.method);
    rows.sort((a,b)=>incomeFilter.sort==='asc'?String(a.date||'').localeCompare(String(b.date||'')):String(b.date||'').localeCompare(String(a.date||'')));
    body.innerHTML=rows.map(r=>`<tr><td>${esc(r.date||'')}</td><td>${esc(r.client||'')}</td><td>${esc(r.company||'')}</td><td><button class="tm-link" onclick="tmInvoiceDetail('${String(r.invoice||'').replace(/'/g,"\\'")}')">${esc(r.invoice||'')}</button></td><td>${esc(r.producer||'')}</td><td>${esc(r.method||'')}</td><td>${fmt(r.gross)}</td><td>${fmt(r.agencyFee)}</td><td>${fmt(r.net)}</td><td>${badge(r)}</td><td><button class="btn soft" onclick="openModal('${r.id}')">Editar</button><button class="btn danger" onclick="deleteIncome('${r.id}')">Eliminar</button></td></tr>`).join('')||'<tr><td colspan="11">Sin ingresos para estos filtros.</td></tr>';
  }

  function apply(){ addStyle(); renderRecentClean(); renderIncomeFiltered(); }
  const originalRender=window.render;
  if(typeof originalRender==='function') window.render=function(){originalRender();setTimeout(apply,0)};
  setTimeout(apply,0);
})();