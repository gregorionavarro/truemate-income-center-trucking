const OWNER_EMAIL='gregorio.navarro@truemategroup.com';

function response(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

function b64urlJson(part){
  try{
    const s=part.replace(/-/g,'+').replace(/_/g,'/');
    const padded=s+'='.repeat((4-s.length%4)%4);
    return JSON.parse(atob(padded));
  }catch(_){return null;}
}

function emailFrom(request){
  const direct=String(request.headers.get('cf-access-authenticated-user-email')||'').trim().toLowerCase();
  if(direct)return direct;
  const token=String(request.headers.get('cf-access-jwt-assertion')||'').trim();
  if(!token)return '';
  const parts=token.split('.');
  if(parts.length!==3)return '';
  const payload=b64urlJson(parts[1]);
  if(!payload)return '';
  const now=Math.floor(Date.now()/1000);
  if(payload.exp && now>=Number(payload.exp))return '';
  if(payload.nbf && now<Number(payload.nbf))return '';
  const iss=String(payload.iss||'');
  if(!/^https:\/\/[a-z0-9.-]+\.cloudflareaccess\.com\/?$/i.test(iss))return '';
  return String(payload.email||'').trim().toLowerCase();
}

export async function onRequestGet(context){
  const email=emailFrom(context.request);
  return response({ok:true,authenticated:!!email,email,isOwner:email===OWNER_EMAIL});
}
