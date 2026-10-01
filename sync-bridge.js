(() => {
  if (window.__tmSyncBridgeLoaded) return;
  window.__tmSyncBridgeLoaded = true;

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

  function refreshViews(){
    try { window.tmRefreshMonthlyExecutive?.(); } catch (_) {}
    try { window.tmRefreshSummaryPayments?.(); } catch (_) {}
    try { window.tmRefreshStableDashboard?.(); } catch (_) {}
    try { window.tmRefreshDashboardExtras?.(); } catch (_) {}
    try { window.tmRefreshGlobalCarrierCard?.(); } catch (_) {}
    try { window.tmRefreshFinalCarrierCard?.(); } catch (_) {}
    try { window.tmRefreshRecentMovements?.(); } catch (_) {}
  }

  function syncIntoApp() {
    copyStateIntoApp();
    try { if (typeof render === 'function') render(); } catch (_) {}
    // Several legacy modules schedule late renders. Re-apply the final dashboard
    // renderers after those timers so the visible table cannot fall back to the base layout.
    [0,40,120,300,650,1100,1700].forEach(ms=>setTimeout(refreshViews,ms));
  }

  window.addEventListener('tm-state-updated', syncIntoApp);
  window.tmSyncStateNow = syncIntoApp;
})();
