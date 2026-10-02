(() => {
  if (window.__tmDashboardTruckVisualV2) return;
  window.__tmDashboardTruckVisualV2 = true;

  function apply(){
    let st=document.getElementById('tm-dashboard-truck-style');
    if(!st){
      st=document.createElement('style');
      st.id='tm-dashboard-truck-style';
      document.head.appendChild(st);
    }
    st.textContent=`
      #summary .panel>.head{margin-bottom:10px;align-items:flex-start}
      #summary .hero{grid-template-columns:minmax(0,1.58fr) minmax(430px,.92fr);gap:14px;align-items:stretch}
      #summary .cash{position:relative;overflow:hidden;min-height:226px;padding:26px 28px;display:flex;flex-direction:column;justify-content:center;background:#10375f;box-shadow:0 14px 30px rgba(15,49,84,.16)}
      #summary .cash::before{content:"";position:absolute;inset:0;background-image:linear-gradient(90deg,rgba(7,39,72,.98) 0%,rgba(9,48,85,.86) 34%,rgba(9,48,85,.46) 58%,rgba(9,48,85,.08) 100%),url('/truck-hero.svg?v=2');background-size:cover;background-position:center right;background-repeat:no-repeat}
      #summary .cash::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.015),rgba(0,0,0,.05));pointer-events:none}
      #summary .cash>*{position:relative;z-index:1;max-width:57%}
      #summary .cash .big{font-size:clamp(42px,4vw,58px);line-height:.98;letter-spacing:-1.5px;text-shadow:0 3px 16px rgba(0,0,0,.2)}
      #summary .cash .kicker{font-size:12px;letter-spacing:.8px}
      #summary .cash .compare{margin-top:18px}
      #summary .cash .pill{backdrop-filter:blur(6px);background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.12)}
      #summary .side{gap:12px}
      #summary .side .metric{position:relative;min-height:106px;padding:17px 17px 16px 18px;overflow:hidden;border-color:#dfe8f2;box-shadow:0 8px 22px rgba(18,54,90,.06)}
      #summary .side .metric::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#2a6fa8}
      #summary .side .metric:nth-child(1)::before{background:#2aae73}
      #summary .side .metric:nth-child(2)::before{background:#7d57e8}
      #summary .side .metric:nth-child(3)::before{background:#e39a20}
      #summary .side .metric:nth-child(4)::before{background:#2a79c7}
      #summary .side .metric b{font-size:27px;letter-spacing:-.3px}
      #summary .insight,#summary .alert,#summary .box{box-shadow:0 8px 22px rgba(18,54,90,.055)}
      @media(max-width:1100px){#summary .hero{grid-template-columns:1fr}#summary .cash>*{max-width:66%}}
      @media(max-width:700px){#summary .cash{min-height:220px;padding:22px}#summary .cash::before{background-image:linear-gradient(90deg,rgba(7,39,72,.97) 0%,rgba(9,48,85,.84) 48%,rgba(9,48,85,.52) 100%),url('/truck-hero.svg?v=2');background-position:68% center}#summary .cash>*{max-width:100%}}
    `;
  }

  apply();
  window.addEventListener('tm-state-updated',apply);
})();
