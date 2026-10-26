(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder;
 const WIDTH=480,HEIGHT=208;
 function monochrome(rgba){
  if(!(rgba instanceof Uint8Array)&&!(rgba instanceof Uint8ClampedArray))throw Error('Dữ liệu ảnh không hợp lệ.');
  if(rgba.length!==WIDTH*HEIGHT*4)throw Error('Khung tranh phải là 480 × 208.');
  const grey=new Float32Array(WIDTH*HEIGHT),bits=new Uint8Array(WIDTH*HEIGHT/8);bits.fill(255);
  for(let i=0;i<grey.length;i++){const at=i*4,a=rgba[at+3]/255;grey[i]=(rgba[at]*.299+rgba[at+1]*.587+rgba[at+2]*.114)*a+255*(1-a);}
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   const at=y*WIDTH+x,old=grey[at],white=old>=128,error=old-(white?255:0);
   if(!white)bits[at>>3]&=~(128>>(at&7));
   if(x+1<WIDTH)grey[at+1]+=error*7/16;
   if(y+1<HEIGHT){if(x)grey[at+WIDTH-1]+=error*3/16;grey[at+WIDTH]+=error*5/16;if(x+1<WIDTH)grey[at+WIDTH+1]+=error/16;}
  }return bits;
 }
 function packageImage(bits){
  if(!(bits instanceof Uint8Array)||bits.length!==12480)throw Error('Ảnh chưa đủ kích thước.');
  const payload=new Uint8Array(12492),v=new DataView(payload.buffer);payload.set([65,82,84,49]);v.setUint16(4,WIDTH,true);v.setUint16(6,HEIGHT,true);payload.set(bits,12);
  return builder.wrap(18,payload,1);
 }
 const api={WIDTH,HEIGHT,monochrome,packageImage};if(node){module.exports=api;return;}
 const $=id=>document.getElementById(id),editor=root.PhotoClockEditor;
 const defaults=()=>({...editor.defaults(),fit:'contain'});
 let image=null,bytes=null,token=0,preparing=false,locked=false,settings=defaults();
 function say(text){$('art75UploadStatus').textContent=text;}
 function controls(operationLocked=false,unsupported=false){
  locked=operationLocked;
  $('art75UploadFile').disabled=locked||preparing;$('art75UploadFit').disabled=locked||preparing||!image;
  for(const b of document.querySelectorAll('[data-art-edit]'))b.disabled=locked||preparing||!image;
  $('art75UploadClear').disabled=locked||preparing||!image;
  $('art75UploadSave').disabled=locked||preparing||unsupported||!bytes;
 }
 function repaint(){
  bytes=null;const canvas=$('art75UploadPreview'),context=canvas.getContext('2d',{willReadFrequently:true});
  context.fillStyle='white';context.fillRect(0,0,WIDTH,HEIGHT);
  if(!image)return;
  const p=editor.placement(image.naturalWidth,image.naturalHeight,settings,WIDTH,HEIGHT);
  context.save();context.translate(p.x,p.y);context.rotate(p.angle);context.drawImage(image,-p.width/2,-p.height/2,p.width,p.height);context.restore();
  // Quantize once, directly from the cropped original pixels. Both preview
  // and upload consume these same monochrome bits; never re-dither a preview.
  const pixels=context.getImageData(0,0,WIDTH,HEIGHT),bits=monochrome(pixels.data);
  for(let i=0;i<WIDTH*HEIGHT;i++){const v=bits[i>>3]&(128>>(i&7))?255:0;pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=v;pixels.data[i*4+3]=255;}
  context.putImageData(pixels,0,0);bytes=packageImage(bits);say('Ảnh đen trắng đã sẵn sàng. Đây là khung tranh sẽ lưu lên đồng hồ.');
 }
 async function choose(){
  const current=++token,file=$('art75UploadFile').files?.[0];image=null;bytes=null;repaint();
  if(!file){root.ArtClock75.controls();return;}
  preparing=true;root.ArtClock75.controls();say('Đang chuẩn bị ảnh…');
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 10 MB.');
   const url=URL.createObjectURL(file);
   try{
    const next=new Image();await new Promise((resolve,reject)=>{next.onload=resolve;next.onerror=()=>reject(Error('Không đọc được ảnh này. Hãy chọn ảnh khác.'));next.src=url;});
    if(current!==token)return;if(!next.naturalWidth||next.naturalWidth*next.naturalHeight>32000000)throw Error('Ảnh quá lớn. Hãy chọn ảnh dưới 32 triệu điểm ảnh.');
    image=next;settings=defaults();$('art75UploadFit').value=settings.fit;repaint();
   }finally{URL.revokeObjectURL(url);}
  }catch(e){image=null;bytes=null;say(e.message);}finally{if(current===token){preparing=false;root.ArtClock75.controls();}}
 }
 function action(name){
  if(!image||preparing||locked)return;
  if(name==='reset')settings=defaults();
  else if(name==='cover'||name==='contain'){settings.fit=name;settings.zoom=1;settings.x=settings.y=0;}
  else if(name==='zoomIn')settings.zoom=editor.clamp(settings.zoom*1.12,.2,8);
  else if(name==='zoomOut')settings.zoom=editor.clamp(settings.zoom/1.12,.2,8);
  else if(name==='left')settings.x=editor.clamp(settings.x-12,-800,800);
  else if(name==='right')settings.x=editor.clamp(settings.x+12,-800,800);
  else if(name==='up')settings.y=editor.clamp(settings.y-12,-800,800);
  else if(name==='down')settings.y=editor.clamp(settings.y+12,-800,800);
  else if(name==='rotate')settings.rotation=(settings.rotation+90)%360;
  $('art75UploadFit').value=settings.fit;repaint();root.ArtClock75.controls();
 }
 function clear(){
  if(locked||preparing)return;
  ++token;image=null;bytes=null;drag=null;settings=defaults();$('art75UploadFile').value='';$('art75UploadFit').value=settings.fit;
  repaint();say('Đã xóa ảnh đang chọn trên web. Chọn ảnh khác để căn chỉnh.');root.ArtClock75.controls();
 }
 root.ArtUpload75={...api,controls,choose,action,clear,fit:()=>action($('art75UploadFit').value),save:()=>{if(bytes&&!preparing&&!locked)return root.ArtClock75.saveCustom(bytes.slice());}};
 for(const b of document.querySelectorAll('[data-art-edit]'))b.addEventListener('click',()=>action(b.dataset.artEdit));
 let drag=null;const canvas=$('art75UploadPreview');canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',e=>{if(!image||preparing||locked)return;drag={x:e.clientX,y:e.clientY,sx:settings.x,sy:settings.y};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag||preparing||locked)return;const scale=WIDTH/canvas.getBoundingClientRect().width;settings.x=editor.clamp(drag.sx+(e.clientX-drag.x)*scale,-800,800);settings.y=editor.clamp(drag.sy+(e.clientY-drag.y)*scale,-800,800);repaint();});
 for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{drag=null;});
 $('art75UploadFile').addEventListener('change',choose);$('art75UploadFit').addEventListener('change',root.ArtUpload75.fit);root.ArtClock75.controls();
})(globalThis);
