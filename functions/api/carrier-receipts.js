const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const who=req=>String(req.headers.get("cf-access-authenticated-user-email")||"").trim().toLowerCase();
const allowed=email=>email.endsWith("@truemategroup.com");
const validId=id=>typeof id==="string"&&id.length>0&&id.length<150&&/^[a-zA-Z0-9_-]+$/.test(id);
async function init(db){await db.prepare("CREATE TABLE IF NOT EXISTS carrier_receipts (id TEXT PRIMARY KEY, record_id TEXT NOT NULL, invoice TEXT NOT NULL, original_name TEXT NOT NULL, mime TEXT NOT NULL, byte_size INTEGER NOT NULL, object_key TEXT NOT NULL, uploaded_by TEXT NOT NULL, uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();}
async function record(db,id){const row=await db.prepare("SELECT json FROM app_state WHERE id=1").first();if(!row)return null;let state;try{state=JSON.parse(row.json)}catch{return null}return (state.r||[]).find(x=>String(x.id)===id)||null;}
export async function onRequest({request,env}){
 const email=who(request);if(!allowed(email))return reply({ok:false,error:"Se requiere acceso corporativo autenticado."},403);
 const db=env.DB,bucket=env.PAYMENT_RECEIPTS;
 if(!db||!bucket)return reply({ok:false,error:"El administrador debe configurar el binding R2 PAYMENT_RECEIPTS en Cloudflare Pages."},503);
 await init(db);
 const url=new URL(request.url), id=url.searchParams.get("record_id");
 if(!validId(id))return reply({ok:false,error:"Identificador inválido"},400);
 const r=await record(db,id);
 if(!r)return reply({ok:false,error:"Factura no encontrada"},404);
 if(request.method==="GET"){
   const receiptId=url.searchParams.get("receipt_id");
   if(receiptId){
     const meta=await db.prepare("SELECT * FROM carrier_receipts WHERE id=? AND record_id=?").bind(receiptId,id).first();
     if(!meta)return reply({ok:false,error:"Comprobante no encontrado"},404);
     const obj=await bucket.get(meta.object_key);if(!obj)return reply({ok:false,error:"Archivo no disponible"},404);
     return new Response(obj.body,{headers:{"content-type":meta.mime,"content-disposition":'attachment; filename="'+meta.original_name.replace(/["\\\r\n]/g,"_")+'"',"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
   }
   const rows=await db.prepare("SELECT id,original_name,mime,byte_size,uploaded_by,uploaded_at FROM carrier_receipts WHERE record_id=? ORDER BY uploaded_at DESC").bind(id).all();
   return reply({ok:true,items:rows.results||[]});
 }
 if(request.method==="POST"){
   if(!["Pagado","Revisado"].includes(String(r.carrierStatus||"")))return reply({ok:false,error:"Solo se admiten comprobantes en pagos revisados o pagados"},409);
   const ct=String(request.headers.get("content-type")||"");if(!ct.includes("multipart/form-data"))return reply({ok:false,error:"Se requiere archivo"},400);
   const form=await request.formData();const file=form.get("file");
   if(!file||typeof file.arrayBuffer!=="function")return reply({ok:false,error:"Selecciona un archivo"},400);
   const mime=String(file.type||"").toLowerCase(),size=Number(file.size||0);
   if(!["image/jpeg","image/png","application/pdf"].includes(mime)||size<1||size>10*1024*1024)return reply({ok:false,error:"Solo JPG, PNG o PDF hasta 10 MB"},400);
   const bytes=new Uint8Array(await file.arrayBuffer());
   const valid=mime==="application/pdf"?bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70:mime==="image/png"?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   if(!valid)return reply({ok:false,error:"El contenido no coincide con el tipo de archivo"},400);
   const receiptId=crypto.randomUUID(),objectKey="carrier-receipts/"+id+"/"+receiptId;
   const original=String(file.name||"comprobante").slice(0,150).replace(/[\\/\x00-\x1f]/g,"_");
   await bucket.put(objectKey,bytes,{httpMetadata:{contentType:mime}});
   try{await db.prepare("INSERT INTO carrier_receipts (id,record_id,invoice,original_name,mime,byte_size,object_key,uploaded_by) VALUES (?,?,?,?,?,?,?,?)").bind(receiptId,id,String(r.invoice||""),original,mime,size,objectKey,email).run();}
   catch(e){await bucket.delete(objectKey);throw e;}
   return reply({ok:true,id:receiptId},201);
 }
 return reply({ok:false,error:"Método no permitido"},405);
}
