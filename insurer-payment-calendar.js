(() => {
  if (window.__tmInsurerPaymentCalendarLoaded) return;
  window.__tmInsurerPaymentCalendarLoaded = true;

  const STORAGE_KEY = 'tmic_payment_calendar';
  const BLOCK_ID = 'tm-insurer-payment-calendar';
  const STYLE_ID = 'tm-insurer-payment-calendar-style';

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const moneyFmt = v => new Intl.NumberFormat('en-US', {
    style:'currency', currency:'USD'
  }).format(+v || 0);

  function currentMonthKey(){
    const y = document.getElementById('yr')?.value || new Date().getFullYear();
    const m = document.getElementById('mo')?.value || String(new Date().getMonth()+1).padStart(2,'0');
    return `${y}-${String(m).padStart(2,'0')}`;
  }

  function monthLabel(key){
    const [y,m] = String(key).split('-').map(Number);
    if (!y || !m) return key;
    return new Date(y,m-1,1).toLocaleDateString('es-US',{month:'long',year:'numeric'});
  }

  function loadRules(){
    try{
      const x = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(x) ? x : [];
    }catch(_){ return []; }
  }

  function saveRules(rows){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(rows) ? rows : []));
    render();
  }

  function paymentDates(rule, monthKey){
    const [year,month] = monthKey.split('-').map(Number);
    if (!year || !month) return [];
    const lastDay = new Date(year,month,0).getDate();
    const out = [];

    if (Array.isArray(rule.dates)) {
      for (const raw of rule.dates) {
        const d = String(raw || '');
        if (d.startsWith(monthKey + '-')) out.push(d);
      }
    }

    if (Array.isArray(rule.days)) {
      for (const n of rule.days) {
        const day = Math.max(1, Math.min(lastDay, Number(n) || 0));
        if (!day) continue;
        out.push(`${monthKey}-${String(day).padStart(2,'0')}`);
      }
    }

    return [...new Set(out)].sort();
  }

  function weekOfMonth(dateStr){
    const d = new Date(dateStr + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return Math.min(5, Math.floor((d.getDate()-1)/7)+1);
  }

  function ensureStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${BLOCK_ID}{margin:16px 0 0;background:#fff;border:1px solid #d9e3ee;border-radius:16px;box-shadow:0 6px 20px rgba(20,55,90,.05);padding:18px}
      #${BLOCK_ID} .tm-pc-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}
      #${BLOCK_ID} h3{margin:0;color:#1f416a;font-size:18px}
      #${BLOCK_ID} .tm-pc-sub{color:#6d7d92;font-size:12px;margin-top:4px}
      #${BLOCK_ID} .tm-pc-weeks{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:14px 0}
      #${BLOCK_ID} .tm-pc-week{border:1px solid #d9e3ee;background:#f8fbff;border-radius:12px;padding:12px;min-height:92px}
      #${BLOCK_ID} .tm-pc-week b{display:block;color:#173f69;margin-bottom:6px}
      #${BLOCK_ID} .tm-pc-count{font-size:12px;color:#6d7d92}
      #${BLOCK_ID} .tm-pc-table{overflow:auto}
      #${BLOCK_ID} table{width:100%;border-collapse:collapse;min-width:760px;font-size:13px}
      #${BLOCK_ID} th{background:#edf4fb;color:#50657f;text-transform:uppercase;font-size:10px;text-align:left;padding:10px}
      #${BLOCK_ID} td{padding:10px;border-bottom:1px solid #e9eef4;vertical-align:top}
      #${BLOCK_ID} .tm-pc-empty{padding:16px;border:1px dashed #cfdbe8;background:#f8fbff;border-radius:12px;color:#60738a;font-size:13px}
      #${BLOCK_ID} .tm-pc-badge{display:inline-flex;padding:5px 8px;border-radius:999px;background:#fff3d4;color:#8c6810;font-size:11px;font-weight:800}
      #${BLOCK_ID} .tm-pc-note{margin-top:10px;color:#6d7d92;font-size:11px}
      @media(max-width:1000px){#${BLOCK_ID} .tm-pc-weeks{grid-template-columns:1fr 1fr}}
      @media(max-width:620px){#${BLOCK_ID} .tm-pc-weeks{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function findAnchor(){
    const headings = [...document.querySelectorAll('h1,h2,h3,h4')];
    const h = headings.find(el => /Comparativo mensual por línea de negocio/i.test(el.textContent || ''));
    if (!h) return null;
    return h.closest('.card') || h.closest('.panel') || h.parentElement;
  }

  function buildRows(monthKey){
    const rules = loadRules();
    const rows = [];
    for (const rule of rules) {
      for (const date of paymentDates(rule, monthKey)) {
        rows.push({
          insurer: rule.insurer || rule.name || 'Aseguradora',
          line: rule.line || '—',
          date,
          amount: Number(rule.amount) || 0,
          status: rule.status || 'Estimado',
          notes: rule.notes || '',
          week: weekOfMonth(date)
        });
      }
    }
    return rows.sort((a,b)=>a.date.localeCompare(b.date));
  }

  function render(){
    ensureStyle();
    const anchor = findAnchor();
    if (!anchor) return;

    let block = document.getElementById(BLOCK_ID);
    if (!block) {
      block = document.createElement('div');
      block.id = BLOCK_ID;
      anchor.insertAdjacentElement('afterend', block);
    } else if (block.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement('afterend', block);
    }

    const monthKey = currentMonthKey();
    const rows = buildRows(monthKey);
    const weeks = [1,2,3,4,5].map(n => {
      const x = rows.filter(r => r.week === n);
      return {week:n,count:x.length,total:x.reduce((a,r)=>a+r.amount,0)};
    });

    block.innerHTML = `
      <div class="tm-pc-head">
        <div>
          <h3>Calendario de pagos de aseguradoras</h3>
          <div class="tm-pc-sub">Fechas probables de pago · ${esc(monthLabel(monthKey))}. Este bloque es independiente y no modifica los cálculos actuales.</div>
        </div>
      </div>

      <div class="tm-pc-weeks">
        ${weeks.map(w=>`<div class="tm-pc-week">
          <b>Semana ${w.week}</b>
          <div class="tm-pc-count">${w.count} pago${w.count===1?'':'s'} programado${w.count===1?'':'s'}</div>
          <div style="margin-top:8px;font-weight:900;color:#173f69">${w.total ? moneyFmt(w.total) : '—'}</div>
        </div>`).join('')}
      </div>

      ${rows.length ? `
        <div class="tm-pc-table"><table>
          <thead><tr><th>Aseguradora</th><th>Línea</th><th>Fecha probable</th><th>Semana</th><th>Monto ref.</th><th>Estado</th><th>Nota</th></tr></thead>
          <tbody>${rows.map(r=>`<tr>
            <td><b>${esc(r.insurer)}</b></td>
            <td>${esc(r.line)}</td>
            <td>${esc(new Date(r.date+'T12:00:00').toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}))}</td>
            <td>Semana ${r.week || '—'}</td>
            <td>${r.amount ? moneyFmt(r.amount) : 'Referencia'}</td>
            <td><span class="tm-pc-badge">${esc(r.status)}</span></td>
            <td>${esc(r.notes || '—')}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      ` : `
        <div class="tm-pc-empty">
          Aún no hay calendarios de pago configurados para este mes. El bloque aparece sin alterar ventas, cartera, comparativos ni registros existentes.
        </div>
      `}

      <div class="tm-pc-note">Las fechas son de referencia hasta que se confirme el calendario real de cada aseguradora.</div>
    `;
  }

  window.tmSetInsurerPaymentCalendar = rows => saveRules(rows);
  window.tmGetInsurerPaymentCalendar = () => loadRules();
  window.tmRefreshInsurerPaymentCalendar = render;

  const rerender = () => setTimeout(render, 0);
  document.getElementById('mo')?.addEventListener('change', rerender);
  document.getElementById('yr')?.addEventListener('change', rerender);
  window.addEventListener('tm-state-updated', rerender);

  const observer = new MutationObserver(() => {
    if (!document.getElementById(BLOCK_ID) || !findAnchor()) rerender();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(render, 100);
  setTimeout(render, 500);
  setTimeout(render, 1200);
})();
