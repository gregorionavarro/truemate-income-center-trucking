(() => {
  if(window.__tmAppNoticesLoaded)return;
  window.__tmAppNoticesLoaded=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensureStyle(){
    if(document.getElementById('tm-global-notice-style'))return;
    const s=document.createElement('style');s.id='tm-global-notice-style';
    s.textContent=`
      .tm-global-notice{position:fixed;right:24px;bottom:24px;z-index:12000;width:min(430px,calc(100vw - 32px));background:#fff;border:1px solid #d9e5ee;border-radius:17px;box-shadow:0 22px 60px rgba(17,53,90,.24);padding:17px;display:flex;gap:13px;align-items:flex-start;animation:tmNoticeIn .18s ease-out}
      .tm-global-notice.success{border-color:#cde6d8}.tm-global-notice.warning{border-color:#efd892}.tm-global-notice.error{border-color:#efc8cf}
      .tm-global-notice .ico{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:900;flex:0 0 auto}
      .tm-global-notice.success .ico{background:#e5f7ee;color:#16744e}.tm-global-notice.warning .ico{background:#fff4d8;color:#8c6810}.tm-global-notice.error .ico{background:#fff0f2;color:#a72f43}
      .tm-global-notice h4{margin:1px 0 4px;color:#173f69;font-size:16px}.tm-global-notice p{margin:0;color:#5f7185;font-size:13px;line-height:1.45}.tm-global-notice .x{margin-left:auto;border:0;background:transparent;color:#6d7d92;font-size:21px;cursor:pointer;padding:0}.tm-global-notice .bar{height:3px;background:#e9eef4;border-radius:99px;overflow:hidden;margin-top:10px}.tm-global-notice .bar i{display:block;height:100%;background:#7bbd98;animation:tmNoticeBar 5.2s linear forwards}
      @keyframes tmNoticeIn{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes tmNoticeBar{from{width:100%}to{width:0}}
    `;
    document.head.appendChild(s);
  }

  function classify(text){
    const t=String(text||'').toLowerCase();
    if(/no se pudo|error|inválid|falló|no encontr/.test(t))return 'error';
    if(/agrega|completa|coloca|selecciona|debe|falta|no puede/.test(t))return 'warning';
    return 'success';
  }

  window.tmNotice=function(message,title,type){
    ensureStyle();
    document.querySelector('.tm-global-notice')?.remove();
    const kind=type||classify(message);
    const t=document.createElement('div');t.className=`tm-global-notice ${kind}`;
    const ico=kind==='success'?'✓':kind==='warning'?'!':'×';
    const ttl=title||(kind==='success'?'Listo':kind==='warning'?'Revisión requerida':'No se pudo completar');
    t.innerHTML=`<div class="ico">${ico}</div><div style="flex:1"><h4>${esc(ttl)}</h4><p>${esc(message)}</p><div class="bar"><i></i></div></div><button class="x" type="button">×</button>`;
    t.querySelector('.x').onclick=()=>t.remove();
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),5400);
  };

  // Evita los avisos nativos del navegador y conserva el flujo existente.
  window.alert=function(message){window.tmNotice(String(message||''));};
})();