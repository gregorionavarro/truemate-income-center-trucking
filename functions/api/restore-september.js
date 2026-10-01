export async function onRequestGet(context){
  const {DB}=context.env;
  if(!DB) return new Response(JSON.stringify({ok:false,error:'DB missing'}),{status:500,headers:{'content-type':'application/json'}});
  const state={
    r:[
      {id:'SEP-REC10288-01',client:'ARMANDO GARCIA ALONSO',company:'GARCIA TRUCKING',invoice:'REC10288',producer:'Marcela Hernandez',date:'2026-09-04',method:'Stripe',gross:4378.43,agencyFee:0,procFee:127.27,net:4251.16,depStatus:'Depositado',pending:0,defDate:'',defAmt:0,downPayment:2887.20,carrier:'Rocklake',carrierAmt:2887.20,carrierDue:'2026-10-31',carrierStatus:'Pagado',carrierPaidDate:'2026-10-01',note:''},
      {id:'SEP-REC10291-01',client:'DANIEL GOMEZ',company:'ANORANZA ARTESANIAS Y MAS LLC',invoice:'REC10291',producer:'Andres Guisao',date:'2026-09-15',method:'Zelle',gross:500,agencyFee:500,procFee:0,net:500,depStatus:'Depositado',pending:1350,defDate:'2026-09-29',defAmt:1350,downPayment:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'',note:''},
      {id:'SEP-REC10292-01',client:'Juan Carlos Gutierrez',company:'J&J GLOBAL TRANSPORT LLC',invoice:'REC10292',producer:'Marcela Hernandez',date:'2026-09-18',method:'Zelle',gross:500,agencyFee:500,procFee:0,net:500,depStatus:'Depositado',pending:0,defDate:'',defAmt:0,downPayment:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'',note:''},
      {id:'SEP-REC10293-01',client:'FERNANDO SOSA',company:'CABRERA TRANSPORT CORP',invoice:'REC10293',producer:'Marcela Hernandez',date:'2026-09-22',method:'Stripe',gross:2000,agencyFee:2000,procFee:58.30,net:1941.70,depStatus:'Depositado',pending:0,defDate:'',defAmt:0,downPayment:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'',note:''},
      {id:'SEP-REC10294-01',client:'ARMANDO GARCIA ALONSO',company:'GARCIA TRUCKING',invoice:'REC10294',producer:'Marcela Hernandez',date:'2026-09-23',method:'Stripe',gross:1030,agencyFee:0,procFee:30.17,net:999.83,depStatus:'Depositado',pending:0,defDate:'',defAmt:0,downPayment:252.70,carrier:'Rocklake',carrierAmt:252.70,carrierDue:'2026-09-30',carrierStatus:'Pagado',carrierPaidDate:'2026-09-30',note:''},
      {id:'SEP-REC10295-01',client:'FERNANDO SOSA',company:'CABRERA TRANSPORT CORP',invoice:'REC10295',producer:'Marcela Hernandez',date:'2026-09-24',method:'Stripe',gross:1545.30,agencyFee:1500,procFee:45.11,net:1500.19,depStatus:'Depositado',pending:0,defDate:'',defAmt:0,downPayment:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'',note:''},
      {id:'SEP-REC10295-02',client:'FERNANDO SOSA',company:'CABRERA TRANSPORT CORP',invoice:'REC10295',producer:'Marcela Hernandez',date:'2026-09-24',method:'Stripe',gross:1500,agencyFee:1500,procFee:43.80,net:1456.20,depStatus:'Depositado',pending:0,defDate:'',defAmt:0,downPayment:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'',note:''},
      {id:'SEP-REC10290-01',client:'Juan Carlos Gutierrez',company:'J&J GLOBAL TRANSPORT LLC',invoice:'REC10290',producer:'Andres Guisao',date:'2026-09-25',method:'Zelle',gross:1394,agencyFee:1000.66,procFee:0,net:1394,depStatus:'Depositado',pending:0,defDate:'',defAmt:0,downPayment:393.94,carrier:'Rocklake',carrierAmt:393.94,carrierDue:'2026-09-30',carrierStatus:'Revisado',carrierPreparedBy:'Gregorio Navarro',carrierAssignedTo:'Gregorio Navarro',note:'Arrastre de septiembre · pendiente de pago'},
      {id:'SEP-REC10296-01',client:'JUAN CARLOS GUTIERREZ',company:'J&J GLOBAL TRANSPORT LLC',invoice:'REC10296',producer:'Andres Guisao',date:'2026-09-28',method:'Zelle',gross:100,agencyFee:100,procFee:0,net:100,depStatus:'Depositado',pending:0,defDate:'',defAmt:0,downPayment:0,carrier:'',carrierAmt:0,carrierDue:'',carrierStatus:'',note:''}
    ],
    p:['Andres Guisao','Marcela Hernandez','Gregorio Navarro'],
    c:['Imperial PFS','Great West','RPS','Rocklake','Burns and Wilcox'],
    t:[
      {id:'TASK-CARRIER-2345',title:'Completar Carrier/PFA · 2345',note:'greg 3 · $1,800.02 · completar Carrier y fecha límite',date:'',done:false,status:'Abierta'},
      {id:'TASK-DEF-REC10291',title:'Cobrar diferido · REC10291',note:'DANIEL GOMEZ · $1,350.00',date:'2026-09-29',done:false,status:'Abierta'},
      {id:'TASK-CARRIER-REC10290',title:'Completar Carrier/PFA · REC10290',note:'Juan Carlos Gutierrez · $393.94 · completar Carrier y fecha límite',date:'',done:true,status:'Realizada',doneAt:'2026-09-30'},
      {id:'TASK-REVIEW-345-DIF-1-678',title:'Revisar ingreso · 345-DIF-1 678',note:'greg · $3,000.00 · confirmar si es fee, comisión, down payment/prima u otro',date:'2026-09-30',done:true,status:'Realizada',doneAt:'2026-09-30'}
    ],
    a:[],
    l:{RPS:'https://rpsins.epaypolicy.com/',Guardian:'https://guardian-ins.epaypolicy.com/',Rocklake:'https://rocklakeig.epaypolicy.com/','Burns and Wilcox':'https://burnsandwilcox.epaypolicy.com/','Great West':'','Imperial PFS':''},
    w:{users:[{name:'Gregorio Navarro',email:'gregorio.navarro@truemategroup.com',active:true},{name:'Paulina Restrepo',email:'paulina@truemategroup.com',active:true},{name:'Camila Penagos',email:'camila@truemategroup.com',active:true},{name:'Fabiola Bermudez',email:'fabiola.bermudez@truemategroup.com',active:true}],assignments:{carrierReview:'paulina@truemategroup.com',carrierPayment:'gregorio.navarro@truemategroup.com',deferredCollection:'camila@truemategroup.com'},internalNotifications:true},
    h:[],n:[]
  };
  await DB.prepare(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id=1), json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await DB.prepare(`INSERT INTO app_state (id,json,updated_at) VALUES (1,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated_at=CURRENT_TIMESTAMP`).bind(JSON.stringify(state)).run();
  return new Response(JSON.stringify({ok:true,records:state.r.length,tasks:state.t.length,cash:12947.73,fees:7100.66}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
}
