/* Four known firmware builds only; never sends these extensions to other clocks. */
(function(root){
 'use strict';
 const $=id=>root.document.getElementById(id),T=root.VNTransport,A=root.PhotoAlbumShared;
 let locked=false;
 const supported=()=>typeof deviceProtocol!=='undefined'&&deviceProtocol===PROTOCOL_NRF52&&nrf52ModelDetected&&nrf52ModelId===2&&
  ((nrf52PanelProfile===0x21&&[242,243].includes(nrf52FirmwareVersion))||(nrf52PanelProfile===0x29&&[244,245].includes(nrf52FirmwareVersion)))&&!!gattServer?.connected;
 function controls(value=false){locked=!!value||!!A.busy()||!!T.busy();for(const e of root.document.querySelectorAll('#clock-album-controls button,#clock-album-controls input,#clock-album-controls select'))e.disabled=locked||!supported();}
 function status(s){A.say(s);}
 function progress(n){$('clock-album-progress').value=n;}
 function assert(){if(!supported())throw Error('Hãy kết nối đồng hồ đã cập nhật chức năng ảnh luân phiên. Chưa gửi thay đổi.');}
 async function read(loadSettings=false){
  assert();const r=await A.caps(false),slots=[];for(let i=0;i<8;i++)if(r[7]&(1<<i))slots.push(i+1);
  $('clock-album-slots').textContent=slots.length?'Ảnh đã lưu: '+slots.join(', '):'Chưa có ảnh đã lưu.';
  if(loadSettings&&r[8]===3)$('clock-album-interval').value=r[9]|r[10]<<8;
  return r;
 }
 function slot(){const n=Number($('clock-album-slot').value);if(!Number.isInteger(n)||n<0||n>7)throw Error('Ô ảnh không hợp lệ.');return n;}
 async function savePhoto(){
  assert();const index=slot(),r=await read(),target=getClockImageTarget(),canvas=$('clock-image-canvas');
  if(!clockImageOriginal)throw Error('Chọn và chỉnh một ảnh ở trên trước khi lưu.');
  if(!target||![148,194].includes(target.width)||canvas.width!==target.width||canvas.height!==128)throw Error('Kích thước ảnh chưa đúng. Chưa ghi dữ liệu.');
  renderClockImage();const full=root.document.createElement('canvas');full.width=A.geometry().width;full.height=128;
  const ctx=full.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,full.width,128);ctx.drawImage(canvas,0,0);
  const bytes=A.planes(full);
  if(!await A.permitWrite())return;
  if((r[7]&(1<<index))&&!confirm('Thay ảnh đang lưu trong ô '+(index+1)+'? Các ô khác được giữ nguyên.'))return;
  status('Đang lưu ảnh. Giữ kết nối và không tháo pin.');progress(0);
  await A.upload(17,[...A.u32(0xc0decafe),index,...A.u32(T.crc32(bytes))],bytes,progress);
  const geo=A.geometry(),first=geo.photo+index*geo.span;let base=0,generation=0;
  for(const address of [first,first+geo.step]){
   const h=await T.read(address,16),v=new DataView(h.buffer,h.byteOffset),g=v.getUint32(4,true);
   if(v.getUint32(0,true)===0x31504856&&v.getUint32(8,true)===bytes.length&&v.getUint32(12,true)===T.crc32(bytes)&&(!base||(g-generation|0)>0)){base=address;generation=g;}
  }
  if(!base)throw Error('Chưa xác nhận được ảnh vừa lưu.');await A.verify(base,bytes,0x31504856);
  await read();progress(100);status('Đã lưu ảnh. Chọn Hiển thị ảnh đã chọn và giờ, hoặc Lưu và bắt đầu luân phiên.');
 }
 async function schedule(kind){
  assert();const r=await read();if(!r[7])throw Error('Lưu ít nhất một ảnh trước khi bắt đầu.');
  const chosen=kind==='hold'&&r[11]<8?r[11]:slot();
  if(kind!=='cycle'&&!(r[7]&(1<<chosen)))throw Error('Ô ảnh này chưa có ảnh.');
  const minutes=Number($('clock-album-interval').value);
  if(kind==='cycle'&&(!Number.isInteger(minutes)||minutes<1||minutes>1440))throw Error('Khoảng đổi ảnh từ 1 đến 1440 phút.');
  if(!await A.permitWrite())return;
  const b=new Uint8Array(20);b.fill(255,4);b[0]=1;b[1]=kind==='cycle'?3:5;b[2]=(kind==='cycle'?minutes:30)&255;b[3]=(kind==='cycle'?minutes:30)>>8;if(b[1]===5)b[4]=chosen;
  // Sync local wall-clock seconds without rendering the previous face first.
  const time=new Uint8Array(4),now=new Date();
  new DataView(time.buffer).setUint32(0,Math.floor(now.getTime()/1000)-now.getTimezoneOffset()*60,false);
  await sendCommand(new Uint8Array([NRF52_CMD_SET_TIME,...time,0,255]));
  status('Đang lưu cách đổi ảnh. Giữ kết nối.');progress(0);
  await A.upload(20,[...A.u32(0xc0decafe),...A.u32(T.crc32(b))],b,progress);
  const reply=await A.caps(false),base=new DataView(reply.buffer,reply.byteOffset).getUint32(12,true),start=A.geometry().schedule;
  if(base!==start&&base!==start+0x1000)throw Error('Chưa xác nhận được lịch đổi ảnh.');
  await A.verify(base,b,0x31534856);nrf52DisplayMode=14;progress(100);
  status(kind==='cycle'?'Đã bật đồng hồ và ảnh luân phiên. Bạn có thể ngắt kết nối web.':'Đã giữ một ảnh cùng đồng hồ. Giờ vẫn tiếp tục chạy.');
 }
 const run=fn=>{if(locked)return;if(clockImageUploadBusy){status('Hãy chờ truyền ảnh xong rồi thử lại.');return;}return A.action(async()=>{assert();return fn();});};
 $('clock-album-read').onclick=()=>run(async()=>{await read(true);status('Đã đọc các ô ảnh đã lưu.');});
 $('clock-album-save').onclick=()=>run(savePhoto);
 $('clock-album-show').onclick=()=>run(()=>schedule('show'));
 $('clock-album-start').onclick=()=>run(()=>schedule('cycle'));
 $('clock-album-hold').onclick=()=>run(()=>schedule('hold'));
 root.SmallClockAlbum={controls,supported};controls();
 root.SmallClockBattery={async read(){
  if(!supported())return false;
  const characteristic=epdCharacteristic,device=bleDevice;
  try{return await T.run(async()=>{
   const reply=await T.request(23);
   if(characteristic!==epdCharacteristic||device!==bleDevice||!gattServer?.connected)return false;
   if(reply.length!==7||reply[6]<5||reply[6]>100)throw Error('Số đo điện áp chưa hợp lệ.');
   root.SharedBattery?.notification(new TextEncoder().encode('v='+reply[6]*100));return true;
  });}catch(e){if(typeof addLog==='function')addLog('Chưa đọc được điện áp pin: '+e.message);return false;}
 }};
 if(typeof module!=='undefined'&&module.exports)module.exports={supported};
})(globalThis);
