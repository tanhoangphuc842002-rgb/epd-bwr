(function(root){
 'use strict';
 const $=id=>document.getElementById(id);let busy=false;
 function supported(digital=false){return typeof appVersion!=='undefined'&&[0x57,0x58,0x59,0x5A,0x5B,0x5C,0x5D,0x5E].includes(appVersion)&&(!digital||appVersion===0x5E)&&typeof gattServer!=='undefined'&&!!gattServer?.connected;}
 function controls(force=false){for(const [id,digital] of [['rounded75Mode',false],['digital75Mode',true]]){const b=$(id);if(b)b.disabled=force||busy||!!root.DeviceOperations?.current||!supported(digital);}}
 let digital=false;function say(text){const el=$(digital?'digital75Status':'rounded75Status');if(el)el.textContent=text;root.addLog?.((digital?'Đồng hồ lịch 3: ':'Đồng hồ lịch 2: ')+text);}
 async function show(wantDigital=false){
  if(busy||root.DeviceOperations?.current)return;
  digital=wantDigital;
  if(!supported(digital)){say('Kết nối đồng hồ và cập nhật phần mềm để dùng mẫu này.');return;}
  busy=true;controls();
  try{
   say('Đang kiểm tra dữ liệu…');
   await root.ExternalResourceInstaller.countdownOperation(async(client,check)=>{
    // Read-only capability check. Showing a clock never repartitions personal data.
    const parts=await client.partitions();check();
    const part=parts.find(p=>p.id===7),info=await client.inspect(7);check();
    const update='Vào mục Cài đặt đồng hồ rồi bấm Cài đặt đồng hồ để bổ sung mẫu này.';
    if(!part||info.code||info.length<160||info.length>part.size-32)throw Error(update);
    const tail=await client.readRange(part.offset+32+info.length-12,12);check();
    const v=new DataView(tail.buffer,tail.byteOffset,tail.byteLength),at=v.getUint32(4,true),n=v.getUint32(8,true);
    if(v.getUint32(0,true)!==0x31444e52||at>=info.length-12||n!==info.length-12-at)throw Error(update);
    const head=await client.readRange(part.offset+32+at,16);check();
    if(![84,70,71,49,1,11,48,0].every((x,i)=>head[i]===x)||n!==148+new DataView(head.buffer,head.byteOffset).getUint32(8,true))throw Error(update);
    if(digital){
     if(at<12)throw Error(update);
     const tail2=await client.readRange(part.offset+32+at-12,12);check();
     const d=new DataView(tail2.buffer,tail2.byteOffset,tail2.byteLength),start=d.getUint32(4,true),size=d.getUint32(8,true);
     if(d.getUint32(0,true)!==0x31544744||start>=at-12||size!==at-12-start||size<148)throw Error(update);
     const h=await client.readRange(part.offset+32+start,16);check();
     if(![84,70,71,49,1,11,48,0].every((x,i)=>h[i]===x)||size!==148+new DataView(h.buffer,h.byteOffset).getUint32(8,true))throw Error(update);
    }

   });
   if(!await root.sendTimeCommand(digital?14:13,digital?'Đồng hồ lịch 3':'Đồng hồ lịch 2'))throw Error('Chưa mở được mặt đồng hồ. Hãy kết nối lại rồi thử tiếp.');
   say('Đã mở '+(digital?'đồng hồ lịch 3':'đồng hồ lịch 2')+'. Ngày hiện tại được đánh dấu đỏ.');
  }catch(e){say('Chưa hoàn tất: '+e.message);root.ConsoleUI?.openLog();}
  finally{busy=false;controls();}
 }
 root.RoundedClock75={controls,show:()=>show(false)};root.DigitalCalendar75={controls,show:()=>show(true)};controls();
})(globalThis);
