(() => {
  if (window.__tmSettingsRecoveryLoader) return;
  window.__tmSettingsRecoveryLoader = true;
  const load=()=>{
    if(document.getElementById('tm-settings-stable-script')){
      setTimeout(()=>window.tmRefreshStableSettings?.(),80);
      return;
    }
    const s=document.createElement('script');
    s.id='tm-settings-stable-script';
    s.src='/settings-stable.js?v=2';
    s.onload=()=>setTimeout(()=>window.tmRefreshStableSettings?.(),80);
    document.head.appendChild(s);
  };
  load();
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-v="settings"]'))setTimeout(load,40)},true);
})();