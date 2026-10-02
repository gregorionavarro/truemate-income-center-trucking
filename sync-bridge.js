(() => {
  if (window.__tmSyncBridgeLoaded) return;
  window.__tmSyncBridgeLoaded = true;

  let pendingSync = false;
  let blurHooked = false;

  function readJson(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '');
      return v ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function copyStateIntoApp(){
    try {
      if (typeof S !== 'undefined' && S) {
        S.r = readJson('tmic_r', []);
        S.p = readJson('tmic_p', S.p || []);
        S.c = readJson('tmic_c', S.c || []);
        S.t = readJson('tmic_t', []);
      }
    } catch (e) {
      console.warn('TrueMate sync bridge: no se pudo actualizar S', e);
    }
  }

  function isEditing(){
    try {
      const el = document.activeElement;
      if (!el) return false;
      const tag = String(el.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    } catch (_) {
      return false;
    }
  }

  function refreshViews(){
    try { window.tmRefreshMonthlyExecutive?.(); } catch (_) {}
    try { window.tmRefreshSummaryPayments?.(); } catch (_) {}
    try { window.tmRefreshStableDashboard?.(); } catch (_) {}
    try { window.tmRefreshDashboardExtras?.(); } catch (_) {}
    try { window.tmRefreshGlobalCarrierCard?.(); } catch (_) {}
    try { window.tmRefreshFinalCarrierCard?.(); } catch (_) {}
    try { window.tmRefreshRecentMovements?.(); } catch (_) {}
  }

  function doRenderSync(){
    pendingSync = false;
    try { if (typeof render === 'function') render(); } catch (_) {}
    [0,80,250].forEach(ms=>setTimeout(refreshViews,ms));
  }

  function hookDeferredBlur(){
    if (blurHooked) return;
    blurHooked = true;
    document.addEventListener('focusout', () => {
      if (!pendingSync) return;
      setTimeout(() => {
        if (!isEditing() && pendingSync) doRenderSync();
      }, 120);
    }, true);
  }

  function syncIntoApp() {
    copyStateIntoApp();
    // Never rebuild the screen while someone is typing. The old behavior
    // recreated Configuración every few seconds and erased the text/cursor.
    if (isEditing()) {
      pendingSync = true;
      hookDeferredBlur();
      return;
    }
    doRenderSync();
  }

  hookDeferredBlur();
  window.addEventListener('tm-state-updated', syncIntoApp);
  window.tmSyncStateNow = syncIntoApp;
})();
