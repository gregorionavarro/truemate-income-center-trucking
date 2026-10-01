const OWNER_EMAIL = "gregorio.navarro@truemategroup.com";

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
function emailFrom(request){return String(request.headers.get("cf-access-authenticated-user-email")||"").trim().toLowerCase();}
async function ensure(DB){
  await DB.prepare(`CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_email TEXT,
    user_name TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    ref TEXT,
    detail TEXT,
    before_json TEXT,
    after_json TEXT
  )`).run();
}
export async function onRequestGet(context){
  if(emailFrom(context.request)!==OWNER_EMAIL) return response({ok:false,error:"Owner only"},403);
  const {DB}=context.env;if(!DB)return response({ok:false,error:"D1 binding DB no disponible"},500);
  await ensure(DB);
  const url=new URL(context.request.url);
  const q=String(url.searchParams.get('q')||'').trim();
  const module=String(url.searchParams.get('module')||'').trim();
  const user=String(url.searchParams.get('user')||'').trim().toLowerCase();
  const limit=Math.min(Math.max(parseInt(url.searchParams.get('limit')||'300',10)||300,1),1000);
  let sql='SELECT id,created_at,user_email,user_name,module,action,ref,detail,before_json,after_json FROM audit_events WHERE 1=1';
  const binds=[];
  if(module){sql+=' AND module=?';binds.push(module);}
  if(user){sql+=' AND lower(user_email)=?';binds.push(user);}
  if(q){sql+=' AND (lower(COALESCE(ref,\'\')) LIKE ? OR lower(COALESCE(detail,\'\')) LIKE ? OR lower(COALESCE(user_name,\'\')) LIKE ?)';const x=`%${q.toLowerCase()}%`;binds.push(x,x,x);}
  sql+=' ORDER BY id DESC LIMIT ?';binds.push(limit);
  const result=await DB.prepare(sql).bind(...binds).all();
  return response({ok:true,events:result.results||[]});
}

export async function onRequestPost(context){
  const email=emailFrom(context.request);
  if(!email) return response({ok:false,error:"Authentication required"},401);
  const {DB}=context.env;if(!DB)return response({ok:false,error:"D1 binding DB no disponible"},500);
  await ensure(DB);
  let body;
  try{body=await context.request.json();}catch(_){return response({ok:false,error:"JSON inválido"},400);}
  const module=String(body?.module||'').trim();
  const action=String(body?.action||'').trim();
  if(!module||!action) return response({ok:false,error:"module y action son requeridos"},400);
  const userName=String(body?.user_name||body?.userName||'Usuario').trim().slice(0,120);
  const ref=String(body?.ref||'').trim().slice(0,200);
  const detail=String(body?.detail||'').trim().slice(0,2000);
  const before=body?.before===undefined||body?.before===null?null:JSON.stringify(body.before).slice(0,12000);
  const after=body?.after===undefined||body?.after===null?null:JSON.stringify(body.after).slice(0,12000);
  await DB.prepare(`INSERT INTO audit_events (user_email,user_name,module,action,ref,detail,before_json,after_json) VALUES (?,?,?,?,?,?,?,?)`)
    .bind(email,userName,module,action,ref,detail,before,after).run();
  return response({ok:true});
}
