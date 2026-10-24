/* Fixed 800x480 image workspace. Editing never writes to a device. */
(function(root){
 'use strict';
 const editor=root.PhotoClockEditor,$=id=>document.getElementById(id);
 const defaults=()=>({...editor.defaults(),contrast:0,redThreshold:120,bwThreshold:128});
 let bitmap=null,state=defaults(),loading=false,generation=0,frame=0;
 const sliders=[['image75Brightness','brightness'],['image75Contrast','contrast'],['image75Red','redThreshold'],['image75BW','bwThreshold']];
 function locked(){return loading||!!root.DeviceOperations?.current;}
 function profile(){
  $('canvasSize').value='7.5_800_480';$('ditherMode').value='threeColor';
  const c=$('canvas');
  if(c.width!==800||c.height!==480){c.width=800;c.height=480;}
 }
 function controls(force=false){
  const off=force||locked();$('imageFile').disabled=off;
  document.querySelectorAll('[data-image75-edit]').forEach(el=>el.disabled=off||!bitmap);
 }
 function render(commit=false){
  if(!bitmap)return;
  profile();state.fit=$('image75Fit').value;
  const c=$('canvas'),ctx=c.getContext('2d'),p=editor.placement(bitmap.width,bitmap.height,state,800,480);
  ctx.fillStyle='white';ctx.fillRect(0,0,800,480);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(state.mirror?-1:1,state.flip?-1:1);
  ctx.drawImage(bitmap,-p.width/2,-p.height/2,p.width,p.height);ctx.restore();
  const data=ctx.getImageData(0,0,800,480);
  /* Keep the reference site's error diffusion: a hard threshold fills midtones
   * with solid black. Render the final BWR pixels once, before export. */
  if(typeof root.floydSteinbergDither==='function'){
   const c=editor.clamp(state.contrast,-100,100),factor=259*(c+255)/(255*(259-c));
   const brightness=editor.clamp(state.brightness,-100,100)*2.55;
   for(let i=0;i<data.data.length;i+=4){
    for(let channel=0;channel<3;channel++)data.data[i+channel]=editor.clamp(factor*(data.data[i+channel]-128)+128+brightness,0,255);
   }
   root.floydSteinbergDither(data,1,'threeColor',state);
  }else data.data.set(editor.quantize(data.data,state));
  ctx.putImageData(data,0,0);
  if(typeof paintManager!=='undefined'&&paintManager){paintManager.captureBaseImage();paintManager.redrawAll();if(commit)paintManager.saveToHistory();}
  $('image75ZoomValue').textContent=Math.round(state.zoom*100)+'%';
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});}
 function flush(commit=false){
  const pending=!!frame;if(frame){cancelAnimationFrame(frame);frame=0;}
  /* A plain export must not overwrite an Undo/restored canvas when nothing
   * changed in the image controls. Pending slider edits still reach export. */
  if(pending||commit)render(commit);
 }
 function reset(){
  state=defaults();$('image75Fit').value=state.fit;
  sliders.forEach(([id,key])=>$(id).value=state[key]);flush(true);
 }
 function change(action){
  if(!bitmap||locked())return;
  if(action==='reset'){reset();return;}
  if(action==='left')state.x=editor.clamp(state.x-10,-800,800);
  if(action==='right')state.x=editor.clamp(state.x+10,-800,800);
  if(action==='up')state.y=editor.clamp(state.y-10,-800,800);
  if(action==='down')state.y=editor.clamp(state.y+10,-800,800);
  if(action==='zoomIn')state.zoom=editor.clamp(state.zoom*1.1,.2,8);
  if(action==='zoomOut')state.zoom=editor.clamp(state.zoom/1.1,.2,8);
  if(action==='rotateLeft')state.rotation=(state.rotation+270)%360;
  if(action==='rotateRight')state.rotation=(state.rotation+90)%360;
  if(action==='mirror')state.mirror=!state.mirror;
  if(action==='flip')state.flip=!state.flip;
  if(action==='center'){state.x=state.y=0;state.zoom=1;}
  flush(true);
 }
 function clearSource(){generation++;bitmap?.close?.();bitmap=null;if(frame)cancelAnimationFrame(frame);frame=0;controls();}
 async function loadFromInput(){
  if(locked())return;const file=$('imageFile').files?.[0];if(!file)return;
  const ticket=++generation;loading=true;controls();
  try{
   if(file.size>25*1024*1024)throw new Error('Hãy chọn ảnh nhỏ hơn 25 MB.');
   let next;
   if(typeof root.createImageBitmap==='function'){try{next=await root.createImageBitmap(file);}catch(_){}}
   if(!next)next=await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(url);resolve(im);};im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Không đọc được ảnh. Hãy chọn ảnh JPG, PNG, BMP hoặc WebP.'));};im.src=url;});
   if(ticket!==generation){next.close?.();return;}
   if(!next.width||!next.height||next.width*next.height>32000000){next.close?.();throw new Error('Hãy chọn ảnh nhỏ hơn 32 triệu điểm ảnh.');}
   if(typeof cropManager!=='undefined'&&cropManager?.isCropMode())cropManager.exitCropMode();
   if(typeof paintManager!=='undefined'&&paintManager)paintManager.setActiveTool(null,'');
   bitmap?.close?.();bitmap=next;reset();$('imageFileName').textContent=file.name;
   $('image75Status').textContent='Kéo ảnh để căn khung, chỉnh nếu cần rồi bấm Gửi ảnh. Ảnh này không lưu vào mục Đồng hồ+ảnh.';
  }catch(error){$('image75Status').textContent=error.message;}
  finally{if(ticket===generation){loading=false;controls();}}
 }
 root.Image75Editor={profile,controls,flush,change,clearSource,loadFromInput,hasImage:()=>!!bitmap};
 document.querySelectorAll('[data-image75-action]').forEach(button=>button.addEventListener('click',()=>change(button.dataset.image75Action)));
 $('image75Fit').addEventListener('change',()=>{if(locked())return;state.x=state.y=0;state.zoom=1;flush(true);});
 sliders.forEach(([id,key])=>{$(id).addEventListener('input',()=>{if(locked())return;state[key]=Number($(id).value);schedule();});$(id).addEventListener('change',()=>{if(!locked())flush(true);});});
 const c=$('canvas');let drag=null;
 c.addEventListener('pointerdown',e=>{
  if(!bitmap||locked()||(typeof paintManager!=='undefined'&&paintManager?.currentTool))return;
  const r=c.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:state.x,sy:state.y,rx:800/r.width,ry:480/r.height};
  e.preventDefault();c.setPointerCapture(e.pointerId);
 });
 c.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||locked())return;e.preventDefault();state.x=editor.clamp(drag.sx+(e.clientX-drag.x)*drag.rx,-800,800);state.y=editor.clamp(drag.sy+(e.clientY-drag.y)*drag.ry,-800,800);schedule();});
 function end(e){if(drag?.id===e.pointerId){drag=null;if(c.hasPointerCapture(e.pointerId))c.releasePointerCapture(e.pointerId);if(!locked())flush(true);}}
 c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
 profile();controls();
})(globalThis);
