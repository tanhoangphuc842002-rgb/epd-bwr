(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const store=node?require('./resource_store'):root.EPDResourceStore;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder;
 function normalizeLabel(label){
  if(typeof label!=='string')throw Error('Hãy nhập tên sự kiện.');
  const s=label.normalize('NFC').trim(),bytes=new TextEncoder().encode(s);
  if(Array.from(s).length>20||bytes.length>60)throw Error('Tên sự kiện tối đa 20 ký tự có dấu.');
  if(/[\p{Control}\p{Format}\p{Surrogate}]/u.test(label)||Array.from(label).some(c=>c.codePointAt(0)>0xffff||c.codePointAt(0)>=0xfffe))throw Error('Tên sự kiện không hỗ trợ biểu tượng hoặc ký tự ẩn.');
  return s;
 }
 function encode(date,label,legacy=false){
  if(typeof date!=='string'||!/^20\d\d-\d\d-\d\d$/.test(date))throw new Error('Chọn ngày đích trong khoảng 2000–2099.');
  const t=Date.parse(date+'T00:00:00Z');
  if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==date)throw new Error('Ngày đích không hợp lệ.');
  label=normalizeLabel(label);
  if(legacy&&!/^[\x20-\x7e]{0,16}$/.test(label))throw Error('Cập nhật phần mềm đồng hồ lên v5.21 để lưu tên sự kiện tiếng Việt có dấu.');
  const data=new Uint8Array(legacy?24:68),v=new DataView(data.buffer);v.setUint32(0,t/86400000,true);
  data.set(new TextEncoder().encode(label),4);
  const payload=new Uint8Array(16+data.length),p=new DataView(payload.buffer);
  p.setUint32(0,0x314e4443,true);p.setUint16(4,1,true);p.setUint16(6,16,true);
  p.setUint16(8,data.length,true);p.setUint32(12,store.crc32(data),true);payload.set(data,16);
  return payload;
 }
 function decode(payload){
  if(!(payload instanceof Uint8Array)||![40,84].includes(payload.length))throw new Error('Dữ liệu đếm ngược không hợp lệ.');
  const v=new DataView(payload.buffer,payload.byteOffset,payload.byteLength),d=payload.subarray(16);
  const legacy=payload.length===40,max=legacy?16:60,end=d.indexOf(0,4);
  if(v.getUint32(0,true)!==0x314e4443||v.getUint16(4,true)!==1||v.getUint16(6,true)!==16||v.getUint16(8,true)!==d.length||v.getUint16(10,true)||v.getUint32(12,true)!==store.crc32(d)||end<4||end>4+max||d.subarray(end).some(x=>x))throw new Error('Dữ liệu đếm ngược bị lỗi hoặc chưa được cài.');
  const day=v.getUint32(16,true);if(day<10957||day>=47482)throw new Error('Ngày đích ngoài phạm vi.');
  const label=new TextDecoder('utf-8',{fatal:true}).decode(d.subarray(4,end));
  const date=new Date(day*86400000).toISOString().slice(0,10);encode(date,label,legacy);return {date,label};
 }
 async function save(client,payload,check=()=>{},onWrite=()=>{}){
  decode(payload);const status=store.parseStatus(await client.status());check();
  if(status.code||status.active||status.entered)throw new Error('Đồng hồ chưa sẵn sàng. Hãy hoàn tất cài đặt hoặc kết nối lại.');
  const parts=await client.partitions();check();const part=parts.find(p=>p.id===10&&p.type===10);
  if(!part)throw new Error('Hãy bấm Cài đặt đồng hồ trước khi lưu đếm ngược.');
  const old=await client.readPackage(part);check();const before=store.parsePackage(old);
  if(before.revision===0xffffffff)throw new Error('Cần cài lại bộ dữ liệu.');
  const bytes=builder.wrap(10,payload,before.revision+1),pack=store.parsePackage(bytes);store.validateTarget(pack,parts);
  let entered=false;
  try{
   entered=true;onWrite();await client.upload(bytes,()=>check(),parts);check();
   const info=await client.inspect(10);check();
   if(info.code||info.crc!==pack.crc||info.length!==payload.length||info.revision!==pack.revision)throw new Error('Đồng hồ chưa xác nhận lưu thành công.');
   await client.leave();check();entered=false;
  }catch(error){
   if(entered&&!client.closed){
    try{check();await client.request(5);await client.upload(old,()=>check(),parts);await client.leave();check();}
    catch(restore){throw new Error(error.message+' Chưa khôi phục được dữ liệu cũ: '+restore.message);}
   }
   throw error;
  }
 }
 async function read(client,check=()=>{}){
  const parts=await client.partitions();check();const part=parts.find(p=>p.id===10&&p.type===10);
  if(!part)throw new Error('Hãy cài đặt đồng hồ trước, sau đó lưu ngày kết thúc đếm ngược.');
  const bytes=await client.readPackage(part);check();return decode(store.parsePackage(bytes).payload);
 }
 let busy=false;
 function controls(force=false){
  if(node)return;
  const supported=typeof appVersion!=='undefined'&&appVersion>=0x3e&&typeof gattServer!=='undefined'&&!!gattServer?.connected;
  for(const id of ['countdown75Save','countdown75Read','countdown75ModeButton']){
   const button=root.document.getElementById(id);if(button)button.disabled=force||busy||!!root.DeviceOperations?.current||!supported;
  }
 }
 function report(text){
  for(const id of ['countdown75Status','countdown75QuickStatus']){const e=root.document.getElementById(id);if(e)e.textContent=text;}
  if(root.addLog)root.addLog(text);
 }
 async function act(action){
  if(busy||root.DeviceOperations?.current){report('Đồng hồ đang xử lý. Hãy chờ thao tác hiện tại hoàn tất.');return;}
  busy=true;controls();
  try{
   if(typeof appVersion==='undefined'||appVersion<0x3e||typeof gattServer==='undefined'||!gattServer?.connected)throw new Error('Hãy kết nối đồng hồ 7.5 có hỗ trợ đếm ngược.');
   if(action==='apply'){
    const label=normalizeLabel(root.document.getElementById('countdown75Label').value),payload=encode(root.document.getElementById('countdown75Date').value,label,appVersion<0x52);
    if(label&&root.ExternalResourceInstaller.ensureFonts)await root.ExternalResourceInstaller.ensureFonts([{slot:4,text:label}],null,report);
    report('Đang lưu ngày đích và tên sự kiện…');
    await root.ExternalResourceInstaller.countdownOperation((client,check,write)=>save(client,payload,check,write));
    if(!await root.sendTimeCommand(8,'Đếm ngược'))throw new Error('Đã lưu nhưng chưa bật được chế độ. Hãy thử lại.');
    report('Đã lưu và bật đếm ngược. Đồng hồ đang làm mới màn hình.');
   }else{
    report(action==='show'?'Đang mở đồng hồ đếm ngược…':'Đang đọc ngày kết thúc đã lưu…');
    const config=await root.ExternalResourceInstaller.countdownOperation((client,check)=>read(client,check));
    if(action==='show'){
     if(!await root.sendTimeCommand(8,'Đồng hồ đếm ngược'))throw new Error('Chưa mở được đồng hồ đếm ngược. Hãy kiểm tra kết nối rồi thử lại.');
     report('Đã mở đồng hồ đếm ngược với ngày kết thúc đã lưu. Chờ màn hình làm mới.');
    }else{
     root.document.getElementById('countdown75Date').value=config.date;root.document.getElementById('countdown75Label').value=config.label;
     report('Đã đọc ngày kết thúc và tên sự kiện đang lưu.');
    }
   }
  }catch(e){report(e.message);}finally{busy=false;controls();}
 }
 const api={normalizeLabel,encode,decode,save,read,controls,apply:()=>act('apply'),load:()=>act('load'),show:()=>act('show')};
 if(node)module.exports=api;else{root.Countdown75=api;controls();}
})(globalThis);
