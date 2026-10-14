/* Persistent 128x250 BWR photos; capability-gated CE and no CE 2.13. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),T=window.VNTransport;
let busy=false,mask=0,consentKey=null;
const u32=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
function say(s){$('photo-status').textContent=s;if(typeof addLog==='function')addLog('Album ảnh: '+s);}
function supported(){return window.VNCountdownSupport?.()&&[128,129,130,131,132,137,138,139,140,141,142,143,144].includes(nrf52FirmwareVersion)&&nrf52PanelProfile===0x21&&gattServer?.connected;}
function assertConnection(){if(!supported())throw Error('Đồng hồ này chưa hỗ trợ lưu nhiều ảnh. Bạn vẫn có thể dùng mục tải ảnh thông thường.');}
function controls(v){busy=v;for(const x of document.querySelectorAll('#photo-album-controls button,#photo-album-controls input,#photo-album-controls select'))x.disabled=v;}
async function action(fn){
 if(busy)return;controls(true);$('photo-progress').value=0;
 try{assertConnection();await T.run(fn,v=>$('photo-progress').value=v);}
 catch(e){say('Chưa hoàn tất: '+e.message);}
 finally{controls(false);}
}
function modeChanged(){const mode=Number($('photo-cycle-mode').value);$('photo-interval-row').hidden=mode!==1;$('photo-daily-note').hidden=mode!==2;for(let i=0;i<8;i++)$('photo-time-'+i).hidden=mode!==2;}
for(let i=0;i<8;i++){
 const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap';
 const text=document.createElement('span');text.id='photo-state-'+i;text.textContent='Ảnh '+(i+1)+': chưa đọc';text.style.minWidth='155px';
 const time=document.createElement('input');time.type='time';time.id='photo-time-'+i;time.setAttribute('aria-label','Giờ hiển thị ảnh '+(i+1));time.style.width='140px';time.hidden=true;
 const show=document.createElement('button');show.type='button';show.textContent='Xem ảnh '+(i+1);show.onclick=()=>action(async()=>{await caps(false);if(!(mask&(1<<i)))throw Error('Ảnh này chưa được lưu. Chọn và lưu ảnh trước.');await T.request(21,[i]);say('Đang hiển thị ảnh '+(i+1)+'. Lịch tự đổi ảnh đã lưu vẫn tiếp tục.');});
 const choose=document.createElement('button');choose.type='button';choose.textContent='Chọn / thay ảnh';choose.setAttribute('aria-label','Chọn hoặc thay ảnh '+(i+1));choose.onclick=()=>{$('photo-slot').value=String(i);$('photo-choose').click();};
 row.append(text,time,show,choose);$('photo-slots').append(row);
}
async function caps(loadSchedule=true){
 assertConnection();await T.probe();const r=await T.request(16);
 if(r.length!==16||r[6]!==1)throw Error('Đồng hồ chưa hỗ trợ album này.');
 mask=r[7];
 for(let i=0;i<8;i++)$('photo-state-'+i).textContent='Ảnh '+(i+1)+': '+(mask&(1<<i)?'đã lưu':'chưa có ảnh');
 if(loadSchedule){
  $('photo-cycle-mode').value=String(r[8]);$('photo-interval').value=String((r[9]|r[10]<<8)||30);
  const base=new DataView(r.buffer,r.byteOffset).getUint32(12,true);
  let bytes=new Uint8Array(20);bytes.fill(255,4);
  if(base){if(base!==0x3e000&&base!==0x3f000)throw Error('Vùng lưu lịch không phù hợp.');bytes=await T.read(base+16,20);}
  for(let i=0;i<8;i++){const m=bytes[4+i*2]|bytes[5+i*2]<<8;$('photo-time-'+i).value=m<1440?String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'):'';}
  modeChanged();
 }
 return r;
}
async function permitWrite(){
 if(consentKey===T.key())return true;
 say('Đang chuẩn bị sao lưu trước khi dùng vùng lưu ảnh. Có thể mất vài phút.');
 if(!await T.ensureBackup()){say('Đã dừng trước khi ghi. Hãy lưu bản sao lưu rồi thử tiếp.');return false;}
 if(!confirm('Bật lưu nhiều ảnh trên đồng hồ? Dữ liệu có sẵn trong vùng lưu ảnh có thể bị thay thế. Hãy giữ file sao lưu. Danh sách việc và dữ liệu tiếng Việt không bị xóa.'))return false;
 consentKey=T.key();return true;
}
function planes(canvas){
 if(canvas.width!==250||canvas.height!==128)throw Error('Ảnh cần đúng 250 × 128. Chọn màn 2.13 đen/trắng/đỏ rồi chỉnh ảnh trước khi lưu.');
 const rgba=canvas.getContext('2d').getImageData(0,0,250,128).data,b=new Uint8Array(8000);b.fill(255);
 let bit=0;
 for(let x=249;x>=0;x--)for(let y=0;y<128;y++,bit++){
  const p=(y*250+x)*4,r=rgba[p],g=rgba[p+1],blue=rgba[p+2];
  const red=r>120&&r>g*1.4&&r>blue*1.4;
  const black=!red&&(r+g+blue)<384,byte=bit>>3,m=128>>(bit&7);
  if(black)b[byte]&=~m;if(red)b[4000+byte]&=~m;
 }
 return b;
}
async function upload(begin,body,bytes){
 const r=await T.probe();if(r[8])throw Error('Đang có phiên truyền chưa hoàn tất. Kết nối lại và đọc trạng thái.');
 await T.request(begin,body);const chunk=r[9]-1;
 for(let pos=0;pos<bytes.length;pos+=chunk){await T.request(18,[pos&255,pos>>8,...bytes.slice(pos,pos+chunk)]);$('photo-progress').value=Math.min(pos+chunk,bytes.length)/bytes.length*100;}
 await T.request(19);
}
async function verify(base,bytes,magic){
 const h=await T.read(base,16),v=new DataView(h.buffer);
 if(v.getUint32(0,true)!==magic||v.getUint32(8,true)!==bytes.length||v.getUint32(12,true)!==T.crc32(bytes))throw Error('Chưa khớp bộ dữ liệu vừa lưu.');
 await T.verify(base+16,bytes);
}
function schedule(){
 const b=new Uint8Array(20);b.fill(255,4);b[0]=1;b[1]=Number($('photo-cycle-mode').value);
 const minutes=Number($('photo-interval').value);if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Khoảng đổi ảnh từ 1 đến 1440 phút.');
 b[2]=minutes&255;b[3]=minutes>>8;const used=new Set();let entries=0;
 for(let i=0;i<8;i++){
  const time=$('photo-time-'+i).value;if(!time)continue;
  if(!/^\d{2}:\d{2}$/.test(time))throw Error('Giờ ảnh không hợp lệ.');
  const parts=time.split(':').map(Number),m=parts[0]*60+parts[1];if(parts[0]>23||parts[1]>59)throw Error('Giờ ảnh không hợp lệ.');
  if(b[1]===2&&mask&(1<<i)){if(used.has(m))throw Error('Hai ảnh không được trùng giờ.');used.add(m);entries++;}
  b[4+i*2]=m&255;b[5+i*2]=m>>8;
 }
 if(b[1]&&!mask)throw Error('Lưu ít nhất một ảnh trước khi bật tự đổi.');
 if(b[1]===2&&!entries)throw Error('Chọn ít nhất một giờ cho ảnh đã lưu.');
 return b;
}
async function saveSchedule(stop=false){
 await caps(false);const b=schedule();if(stop)b[1]=0;
 if(!await permitWrite())return;
 if(b[1])await sendNrf52Mode(0); // Sync clock/timezone without opening a clock face.
 say('Đang lưu lịch đổi ảnh…');
 await upload(20,[...u32(0xc0decafe),...u32(T.crc32(b))],b);
 const r=await caps(false),base=new DataView(r.buffer,r.byteOffset).getUint32(12,true);
 if(base!==0x3e000&&base!==0x3f000)throw Error('Không nhận được lịch đã lưu.');
 await verify(base,b,0x31534856);await caps(true);$('photo-progress').value=100;
 say(b[1]?'Đã lưu lịch và bật tự đổi ảnh. Bạn có thể ngắt kết nối web. Chuyển sang mode đồng hồ/lịch sẽ tạm dừng album.':'Đã tắt tự đổi ảnh; ảnh hiện tại vẫn giữ trên màn.');
}
$('photo-choose').onclick=()=>{$('image_file').click();$('canvas-box').scrollIntoView({behavior:'smooth',block:'center'});};
$('photo-check').onclick=()=>action(async()=>{await caps(true);say(mask?'Đã đọc ảnh đã lưu. Chọn cách đổi ảnh hoặc bấm Xem để hiển thị ngay.':'Chưa có ảnh. Chọn ảnh và lưu vào một ô để bắt đầu.');});
$('photo-save').onclick=()=>action(async()=>{
 const slot=Number($('photo-slot').value);if(!Number.isInteger(slot)||slot<0||slot>7)throw Error('Ô lưu ảnh không hợp lệ.');
 const bytes=planes($('canvas'));await caps(false);
 if(!await permitWrite())return;
 if(mask&(1<<slot)&&!confirm('Thay ảnh đang lưu trong ô '+(slot+1)+'? Các ô khác vẫn được giữ.'))return;
 say('Đang lưu ảnh '+(slot+1)+'. Giữ kết nối; không tháo pin.');
 await upload(17,[...u32(0xc0decafe),slot,...u32(T.crc32(bytes))],bytes);
 let base=0,generation=0;
 for(const a of [0x40000+slot*0x4000,0x42000+slot*0x4000]){
  const h=await T.read(a,16),v=new DataView(h.buffer),g=v.getUint32(4,true);
  if(v.getUint32(0,true)===0x31504856&&v.getUint32(8,true)===8000&&v.getUint32(12,true)===T.crc32(bytes)&&(!base||(g-generation|0)>0)){base=a;generation=g;}
 }
 if(!base)throw Error('Không tìm thấy ảnh vừa ghi. Kết nối lại và đọc album.');
 await verify(base,bytes,0x31504856);await caps(false);$('photo-progress').value=100;
 say('Đã lưu và kiểm tra ảnh '+(slot+1)+'. Bấm Xem ảnh '+(slot+1)+' để xem hoặc Lưu và bắt đầu để tự đổi.');
});
$('photo-schedule-save').onclick=()=>action(()=>saveSchedule(false));
$('photo-stop').onclick=()=>action(async()=>{$('photo-cycle-mode').value='0';modeChanged();await saveSchedule(true);});
$('photo-cycle-mode').addEventListener('change',modeChanged);modeChanged();
window.PhotoAlbumTrial={planes,schedule,get mask(){return mask;}};
})();
