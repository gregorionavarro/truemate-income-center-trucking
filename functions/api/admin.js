const OWNER_EMAIL = "gregorio.navarro@truemategroup.com";

const DEFAULT_W = {
  users: [
    { name: "Gregorio Navarro", email: "gregorio.navarro@truemategroup.com", active: true },
    { name: "Paulina Restrepo", email: "paulina@truemategroup.com", active: true },
    { name: "Camila Penagos", email: "camila@truemategroup.com", active: true },
    { name: "Fabiola Bermudez", email: "fabiola.bermudez@truemategroup.com", active: true }
  ],
  assignments: {
    carrierReview: "paulina@truemategroup.com",
    carrierPayment: "gregorio.navarro@truemategroup.com",
    deferredCollection: "camila@truemategroup.com"
  },
  internalNotifications: true
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
function emailFrom(request){return String(request.headers.get("cf-access-authenticated-user-email")||"").trim().toLowerCase();}
async function ensureTable(DB){
  await DB.prepare(`CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_email TEXT,user_name TEXT,module TEXT NOT NULL,action TEXT NOT NULL,ref TEXT,detail TEXT,before_json TEXT,after_json TEXT
  )`).run();
}
async function readState(DB){
  await ensureTable(DB);
  const row=await DB.prepare("SELECT json FROM app_state WHERE id = 1").first();
  if(!row?.json)return {r:[],p:[],c:[],t:[],a:[],l:{},w:DEFAULT_W,h:[],n:[]};
  try{const parsed=JSON.parse(row.json);return {...parsed,w:parsed?.w&&typeof parsed.w==='object'?parsed.w:DEFAULT_W};}
  catch(_){return {r:[],p:[],c:[],t:[],a:[],l:{},w:DEFAULT_W,h:[],n:[]};}
}
function assignmentName(k){return ({carrierReview:'Revisar Down Payment',carrierPayment:'Pagar Carrier / PFA',deferredCollection:'Cobrar diferidos'})[k]||k;}
async function auditChanges(DB,email,before,after){
  const details=[];
  for(const k of ['carrierReview','carrierPayment','deferredCollection']){
    const a=String(before?.assignments?.[k]||''),b=String(after?.assignments?.[k]||'');
    if(a!==b)details.push(`${assignmentName(k)}: ${a||'—'} → ${b||'—'}`);
  }
  const oldUsers=JSON.stringify(before?.users||[]),newUsers=JSON.stringify(after?.users||[]);
  if(oldUsers!==newUsers)details.push('Se modificaron usuarios del equipo');
  if(!details.length)return;
  await DB.prepare(`INSERT INTO audit_events (user_email,user_name,module,action,ref,detail,before_json,after_json) VALUES (?,?,?,?,?,?,?,?)`)
    .bind(email,'Gregorio Navarro','Administración','Configuración','Responsables y usuarios',details.join(' · '),JSON.stringify(before||{}),JSON.stringify(after||{})).run();
}

export async function onRequestGet(context){
  const email=emailFrom(context.request);if(email!==OWNER_EMAIL)return response({ok:false,error:'Owner only'},403);
  const {DB}=context.env;if(!DB)return response({ok:false,error:'D1 binding DB no disponible'},500);
  const state=await readState(DB);return response({ok:true,owner:true,workflow:state.w||DEFAULT_W});
}

export async function onRequestPost(context){
  const email=emailFrom(context.request);if(email!==OWNER_EMAIL)return response({ok:false,error:'Owner only'},403);
  const {DB}=context.env;if(!DB)return response({ok:false,error:'D1 binding DB no disponible'},500);
  let body;try{body=await context.request.json();}catch(_){return response({ok:false,error:'JSON inválido'},400);}
  const workflow=body?.workflow;
  if(!workflow||!Array.isArray(workflow.users)||!workflow.assignments||typeof workflow.assignments!=='object')return response({ok:false,error:'Configuración inválida'},400);
  const cleanUsers=workflow.users.map(u=>({name:String(u?.name||'').trim(),email:String(u?.email||'').trim().toLowerCase(),active:u?.active!==false})).filter(u=>u.name&&u.email);
  const cleanWorkflow={
    users:cleanUsers,
    assignments:{
      carrierReview:String(workflow.assignments.carrierReview||'').trim().toLowerCase(),
      carrierPayment:String(workflow.assignments.carrierPayment||'').trim().toLowerCase(),
      deferredCollection:String(workflow.assignments.deferredCollection||'').trim().toLowerCase()
    },
    internalNotifications:workflow.internalNotifications!==false
  };
  const state=await readState(DB),before=state.w||DEFAULT_W;state.w=cleanWorkflow;
  await DB.prepare(`INSERT INTO app_state (id,json,updated_at) VALUES (1,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET json=excluded.json,updated_at=CURRENT_TIMESTAMP`).bind(JSON.stringify(state)).run();
  await auditChanges(DB,email,before,cleanWorkflow);
  return response({ok:true,workflow:cleanWorkflow});
}
