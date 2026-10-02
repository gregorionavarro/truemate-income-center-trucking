(() => {
  if (window.__tmCarrierPaymentEditUiLoaded) return;
  window.__tmCarrierPaymentEditUiLoaded = true;

  function enhanceCarrierPaymentActions(){
    const body=document.getElementById('carBody');
    if(!body)return;
    body.querySelectorAll('tr').forEach(tr=>{
      const status=String(tr.querySelector('.badge')?.textContent||'').trim().toLowerCase();
      if(status!=='pagado')return;
      const btn=tr.querySelector('button[onclick^="tmEditCarrierObligation("]');
      if(!btn)return;
      btn.textContent='Editar pago';
      btn.title='Editar Carrier/PFA, monto, fecha límite, referencia o fecha de pago';
      btn.setAttribute('aria-label','Editar pago Carrier / PFA');
    });
  }

  const observer=new MutationObserver(()=>setTimeout(enhanceCarrierPaymentActions,40));
  function start(){
    const body=document.getElementById('carBody');
    if(body)observer.observe(body,{childList:true,subtree:true});
    enhanceCarrierPaymentActions();
  }

  window.addEventListener('tm-state-updated',()=>setTimeout(enhanceCarrierPaymentActions,120));
  setTimeout(start,700);
  setInterval(enhanceCarrierPaymentActions,1200);
})();