(() => {
  if(window.__tmIncomeClientNoteLoaded)return;
  window.__tmIncomeClientNoteLoaded=true;
  let editingId=null;
  const $=id=>document.getElementById(id);

  function ensureField(id){
    const client=$('client');if(!client)return;
    let wrap=$('tmClientNoteWrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='tmClientNoteWrap';
      wrap.className='f';
      wrap.style.margin='14px 0 4px';
      wrap.innerHTML='<label style="display:block;font-size:11px;font-weight:800;color:#546880;margin-bottom:5px">Nota importante del cliente</label><textarea id="tmClientNote" placeholder="Información importante para seguimiento, servicio, documentos, pagos, etc." style="width:100%;min-height:82px;border:1px solid #d9e3ee;border-radius:9px;padding:10px;resize:vertical"></textarea><div class="sub" style="font-size:10px;margin-top:4px">Esta nota pertenece al ingreso/cliente y no reemplaza la nota de Carrier/PFA.</div>';
    }

    // Mantener la nota justo encima de 4 · Carrier / PFA.
    const carrierHeading=[...document.querySelectorAll('.section')].find(x=>String(x.textContent||'').includes('Carrier / PFA'));
    if(carrierHeading&&carrierHeading.parentNode){
      if(wrap.parentNode!==carrierHeading.parentNode||wrap.nextSibling!==carrierHeading){
        carrierHeading.parentNode.insertBefore(wrap,carrierHeading);
      }
    }else if(!wrap.parentNode){
      const mb=client.closest('.mb');
      if(mb)mb.appendChild(wrap);
    }

    const rec=id?(S.r||[]).find(x=>String(x.id)===String(id)):null;
    const input=$('tmClientNote');if(input)input.value=rec?.clientNote||'';
  }

  const prevOpen=window.openModal;
  if(typeof prevOpen==='function')window.openModal=function(id){
    editingId=id||null;
    prevOpen(id);
    setTimeout(()=>ensureField(id),80);
  };

  const prevClose=window.closeModal;
  if(typeof prevClose==='function')window.closeModal=function(){prevClose();setTimeout(()=>{editingId=null;},0);};

  const prevSave=window.save;
  if(typeof prevSave==='function')window.save=function(){
    const note=String($('tmClientNote')?.value||'').trim();
    const id=editingId;
    const invoice=String($('invoice')?.value||'').trim();
    const beforeIds=new Set((S.r||[]).map(x=>String(x.id)));
    prevSave();
    setTimeout(()=>{
      let rec=id?(S.r||[]).find(x=>String(x.id)===String(id)):null;
      if(!rec)rec=[...(S.r||[])].reverse().find(x=>!beforeIds.has(String(x.id)));
      if(!rec&&invoice)rec=[...(S.r||[])].reverse().find(x=>String(x.invoice||'').trim()===invoice);
      if(!rec)return;
      rec.clientNote=note;
      try{localStorage.setItem('tmic_r',JSON.stringify(S.r||[]));if(typeof store==='function')store();if(typeof render==='function')render();}catch(e){console.error('client note save',e);}
      editingId=null;
    },120);
  };

  setTimeout(()=>ensureField(editingId),500);
})();