(function(root){
 'use strict';const $=id=>document.getElementById(id),editor=root.PhotoClockEditor;
 let image=null,state=editor.defaults(),pixels=null,preparing=false,busy=false,generation=0,last=null,recovery=null,recoveryDevice=null;
 const deviceId=()=>typeof bleDevice!=='undefined'?bleDevice?.id:null;
 function say(s){$('seasonUploadStatus').textContent=s;root.addLog?.('Thay ảnh theo mùa: '+s);}
 function controls(locked=false,unsupported=false){
  const off=locked||busy||preparing;
  for(const n of ['seasonUploadFile','seasonUploadTarget'])$(n).disabled=off;
  for(const b of document.querySelectorAll('[data-season-edit]'))b.disabled=off||!image;
  $('seasonUploadClear').disabled=off||!image;
  $('seasonUploadSave').disabled=off||unsupported||!pixels;
  $('seasonUploadRestore').disabled=off||unsupported;
  $('seasonUploadRetry').disabled=off||unsupported||!last;
  $('seasonUploadStop').disabled=!busy;
 }
 function paint(){
  const canvas=$('seasonUploadPreview'),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,800,280);pixels=null;
  if(image){const p=editor.placement(image.naturalWidth,image.naturalHeight,state,800,280);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.drawImage(image,-p.width/2,-p.height/2,p.width,p.height);ctx.restore();
   const raw=ctx.getImageData(0,0,800,280);pixels=editor.quantize(raw.data,state,800,280);raw.data.set(pixels);ctx.putImageData(raw,0,0);
  }root.Season75.controls();
 }
 async function choose(){
  const seq=++generation,file=$('seasonUploadFile').files?.[0];image=null;pixels=null;last=null;preparing=true;root.Season75.controls();
  try{if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760)throw Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 10 MB.');
   const url=URL.createObjectURL(file);try{const next=new Image();await new Promise((ok,no)=>{next.onload=ok;next.onerror=()=>no(Error('Không đọc được ảnh.'));next.src=url;});if(seq!==generation)return;
    if(!next.naturalWidth||next.naturalWidth*next.naturalHeight>32000000)throw Error('Chọn ảnh dưới 32 triệu điểm ảnh.');image=next;state=editor.defaults();say('Căn chỉnh ảnh rồi bấm Lưu ảnh cho mùa đã chọn.');
   }finally{URL.revokeObjectURL(url);}
  }catch(e){say(e.message);}finally{if(seq===generation){preparing=false;paint();}}
 }
 function action(name){if(!image||busy)return;
  if(name==='reset')state=editor.defaults();
  else if(name==='cover'||name==='contain'){state.fit=name;state.zoom=1;state.x=state.y=0;}
  else if(name==='zoomIn')state.zoom=editor.clamp(state.zoom*1.12,.2,8);
  else if(name==='zoomOut')state.zoom=editor.clamp(state.zoom/1.12,.2,8);
  else if(name==='rotate')state.rotation=(state.rotation+90)%360;
  else if(name==='left')state.x-=12;else if(name==='right')state.x+=12;else if(name==='up')state.y-=12;else if(name==='down')state.y+=12;
  paint();
 }
 function picture(){if(!pixels)throw Error('Chọn và căn chỉnh ảnh trước.');const full=new Uint8ClampedArray(800*480*4);full.fill(255);full.set(pixels,800*200*4);return root.Album75.picture(full,800);}
 function clear(){
  if(busy||preparing||root.DeviceOperations?.current||root.Season75.busy()||root.ExternalResourceInstaller?.busy())return;
  ++generation;image=null;pixels=null;last=null;drag=null;state=editor.defaults();$('seasonUploadFile').value='';
  paint();say('Đã xóa ảnh đang chọn trên web. Chọn ảnh khác để căn chỉnh.');
 }
 async function save(restore=false,retry=false){
  if(busy||root.DeviceOperations?.current)return;
  try{
   if(!retry){const index=Number($('seasonUploadTarget').value),image=restore?root.Season75.unpack(Uint8Array.from(atob(root.Season75Data),c=>c.charCodeAt(0)))[index]:picture();last={index,image};}
   if(!last)return;const id=deviceId();if(!id)throw Error('Kết nối đồng hồ trước khi lưu.');
   if(recovery&&id!==recoveryDevice)recovery=null;
   const key='epd75_season_recovery_'+id;
   if(!recovery){const cached=localStorage.getItem(key);if(cached){try{recovery=Uint8Array.from(atob(cached),c=>c.charCodeAt(0));root.Season75.asset(recovery);recoveryDevice=id;}catch(_){recovery=null;localStorage.removeItem(key);}}}
   busy=true;root.Season75.controls();$('seasonUploadProgress').value=0;say('Đang đọc bộ ảnh để giữ lại ba mùa còn lại. Giữ kết nối, không tháo pin.');let reading=-1,writing=-1;
   await root.ExternalResourceInstaller.countdownOperation((client,check,write)=>root.Season75.replace(client,last.index,last.image,{check,write,recovery,snapshot:b=>{let binary='';for(const n of b)binary+=String.fromCharCode(n);try{localStorage.setItem(key,btoa(binary));}catch(_){throw Error('Trình duyệt chưa lưu được bản phục hồi. Hãy giải phóng bộ nhớ trang rồi thử lại. Chưa gửi ảnh.');}recovery=b;recoveryDevice=id;},readProgress:(n,total)=>{const percent=Math.floor(n/total*20)*5;$('seasonUploadProgress').value=.3*n/total;if(percent!==reading){reading=percent;say('Đang đọc bộ ảnh để giữ lại: '+percent+'%.');}},progress:(n,total)=>{const percent=Math.floor(n/total*20)*5;$('seasonUploadProgress').value=.3+.7*n/total;if(percent!==writing){writing=percent;say('Đang lưu ảnh theo mùa: '+percent+'%.');}}}));
   $('seasonUploadProgress').value=1;recovery=null;recoveryDevice=null;localStorage.removeItem(key);
   if(!await root.sendTimeCommand(11,'Đồng hồ bốn mùa'))throw Error('Đã lưu ảnh. Hãy kết nối lại và mở Đồng hồ bốn mùa.');
   say('Đã lưu ảnh cho '+['mùa Xuân','mùa Hạ','mùa Thu','mùa Đông'][last.index]+'. Ba mùa còn lại được giữ nguyên. Chọn mùa này ở phía trên để xem ngay.');
  }catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}finally{busy=false;root.Season75.controls();}
 }
 function stop(){if(!busy)return;root.ExternalResourceInstaller.disconnect();if(typeof bleDevice!=='undefined'&&bleDevice?.gatt?.connected)bleDevice.gatt.disconnect();say('Đã dừng. Giữ trang này mở, kết nối lại cùng đồng hồ rồi bấm Thử lưu lại.');}
 for(const b of document.querySelectorAll('[data-season-edit]'))b.addEventListener('click',()=>action(b.dataset.seasonEdit));
 $('seasonUploadFile').addEventListener('change',choose);
 $('seasonUploadTarget').addEventListener('change',()=>{last=null;root.Season75.controls();});
 let drag=null;const c=$('seasonUploadPreview');c.style.touchAction='none';c.addEventListener('pointerdown',e=>{if(!image||busy)return;drag={x:e.clientX,y:e.clientY,sx:state.x,sy:state.y};c.setPointerCapture(e.pointerId);});
 c.addEventListener('pointermove',e=>{if(!drag||busy)return;const scale=800/c.getBoundingClientRect().width;state.x=editor.clamp(drag.sx+(e.clientX-drag.x)*scale,-800,800);state.y=editor.clamp(drag.sy+(e.clientY-drag.y)*scale,-800,800);paint();});
 for(const ev of ['pointerup','pointercancel'])c.addEventListener(ev,()=>{drag=null;});
 root.SeasonUpload75={controls,save,clear,restore:()=>save(true),retry:()=>save(false,true),stop,busy:()=>busy};paint();
})(globalThis);
