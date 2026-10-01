(() => {
  if (window.__tmInvoiceGuardLoaded) return;
  window.__tmInvoiceGuardLoaded = true;

  const norm = v => String(v || '').trim().toUpperCase();
  const invoiceInput = () => document.getElementById('invoice');
  const modal = () => document.getElementById('modal');

  function currentEditId() {
    try { return typeof edit !== 'undefined' ? edit : null; } catch (_) { return null; }
  }

  function records() {
    try { return (typeof S !== 'undefined' && Array.isArray(S.r)) ? S.r : []; } catch (_) { return []; }
  }

  function findDuplicate() {
    const input = invoiceInput();
    if (!input) return null;
    const inv = norm(input.value);
    if (!inv) return null;
    const editing = currentEditId();
    return records().find(r => norm(r.invoice) === inv && r.id !== editing) || null;
  }

  function ensureMessage() {
    const input = invoiceInput();
    if (!input) return null;
    let msg = document.getElementById('tm-invoice-warning');
    if (!msg) {
      msg = document.createElement('div');
      msg.id = 'tm-invoice-warning';
      msg.style.cssText = 'display:none;margin-top:6px;padding:8px 10px;border-radius:8px;background:#fff0f2;border:1px solid #f0bcc5;color:#a72f43;font-size:11px;font-weight:800;line-height:1.35';
      input.parentElement.appendChild(msg);
    }
    return msg;
  }

  function paint() {
    const input = invoiceInput();
    const msg = ensureMessage();
    if (!input || !msg) return;
    const dup = findDuplicate();
    if (dup) {
      input.style.borderColor = '#c64658';
      input.style.boxShadow = '0 0 0 3px rgba(198,70,88,.10)';
      msg.style.display = 'block';
      msg.textContent = `⚠️ Invoice duplicada. Ya existe ${dup.invoice} para ${dup.client || 'otro cliente'}${dup.date ? ' · '+dup.date : ''}. Usa otra factura antes de guardar.`;
    } else {
      input.style.borderColor = '';
      input.style.boxShadow = '';
      msg.style.display = 'none';
      msg.textContent = '';
    }
  }

  function bind() {
    const input = invoiceInput();
    if (!input || input.dataset.tmInvoiceGuard === '1') return;
    input.dataset.tmInvoiceGuard = '1';
    input.addEventListener('input', paint);
    input.addEventListener('blur', paint);
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const onclick = String(btn.getAttribute('onclick') || '').replace(/\s/g,'');
    if (onclick === 'save()') {
      paint();
      const dup = findDuplicate();
      if (dup) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        alert(`Invoice duplicada: ${dup.invoice}\n\nYa fue registrada para ${dup.client || 'otro cliente'}${dup.date ? ' el '+dup.date : ''}.\n\nNo se guardó el ingreso. Corrige el número de factura.`);
      }
    }
  }, true);

  const obs = new MutationObserver(() => { bind(); if (modal()?.classList.contains('on')) setTimeout(paint, 0); });
  obs.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  bind();
})();
