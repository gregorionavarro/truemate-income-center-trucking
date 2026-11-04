(() => {
  if (window.__tmCarrierClientNoteDisplayLoaded) return;
  window.__tmCarrierClientNoteDisplayLoaded = true;
  function showNote() {
    const popup = document.querySelector('.tm-overlay .tm-pop');
    if (!popup || popup.querySelector('#tmCarrierClientNoteDisplay')) return;
    const heading = popup.querySelector('h3')?.textContent || '';
    if (!heading.includes('Carrier / PFA')) return;
    const invoice = heading.split('·').slice(1).join('·').trim();
    if (!invoice) return;
    const rec = (typeof S !== 'undefined' ? S.r || [] : []).find(r => String(r.invoice || '').trim() === invoice);
    if (!rec) return;
    const operationalNote = popup.querySelector('#tmFlexNote, #tmOpNote');
    if (!operationalNote) return;
    const wrap = operationalNote.closest('.tm-field');
    if (!wrap?.parentNode) return;
    const box = document.createElement('div');
    box.id = 'tmCarrierClientNoteDisplay';
    box.className = 'tm-field';
    box.style.gridColumn = '1 / -1';
    const label = document.createElement('label');
    label.textContent = 'Nota importante del cliente · registrada en Ingresos (solo lectura)';
    const body = document.createElement('div');
    body.style.cssText = 'padding:12px;border:1px solid #d9e3ee;border-radius:9px;background:#f7fbff;color:#25476c;white-space:pre-wrap;overflow-wrap:anywhere;min-height:44px';
    body.textContent = String(rec.clientNote || '').trim() || 'Sin nota del cliente';
    box.append(label, body);
    wrap.parentNode.insertBefore(box, wrap);
  }
  new MutationObserver(showNote).observe(document.body, {childList:true, subtree:true});
  showNote();
})();