/* Explicit one-packet clock selection, enabled only for inspected releases. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),T=window.VNTransport;
const rows=[
 {name:'Đồng hồ số',description:'Đồng hồ số lớn.',modes:[2,2]},
 {name:'Đồng hồ và lịch tháng',description:'Giờ ở bên phải, lịch tháng ở bên trái. Nếu bạn đang bật Việc cần làm, phần lịch sẽ hiện danh sách đó; có thể tắt trong mục Việc cần làm.',modes:[3,3]},
 {name:'Đồng hồ, thứ và ngày',description:'Lịch tháng bên trái; thứ, ngày và giờ bên phải.',modes:[4,4]},
 {name:'Đồng hồ nhắc ngày lễ',description:'Giờ lớn và số ngày tới ngày lễ gần nhất.',modes:[5,10]},
 {name:'Đồng hồ và ngày lớn',description:'Giờ bên trái; ngày, tháng và âm lịch bên phải.',modes:[10,11]},
 {name:'Đồng hồ lật',description:'Các ô số nền trắng với khe lật, dấu hai chấm đỏ và lịch tháng bên phải. Dùng được cả khi không có ngày đánh dấu.',modes:[11,12]}
];
let busy=false,versionKey='';
function device(){
 if(typeof deviceProtocol==='undefined'||deviceProtocol!==PROTOCOL_NRF52||!gattServer?.connected||!nrf52ModelDetected||nrf52ModelId!==2||!epdCharacteristic)return null;
 const big=nrf52PanelProfile===0x29,ok=big?[191,192,195,196]:nrf52PanelProfile===0x21?[189,190,193,194,197,198]:[];
 if(!ok.includes(nrf52FirmwareVersion))return null;
 return {key:[bleDevice?.id,nrf52PanelProfile,nrf52FirmwareVersion].join('|'),big,id:({189:'ce213',190:'noce213',191:'ce290',192:'noce290',193:'ce213-retro',194:'noce213-retro',195:'ce290-retro',196:'noce290-retro',197:'ce213-retro-up3',198:'noce213-retro-up3'})[nrf52FirmwareVersion],ch:epdCharacteristic};
}
function unavailable(){
 return typeof gattServer==='undefined'||!gattServer?.connected?'Kết nối đồng hồ để xem những giao diện phù hợp.':'Đồng hồ này vẫn dùng nút chuyển giao diện phía trên. Các mẫu chọn trực tiếp chỉ hiện trên phiên bản có hỗ trợ.';
}
function blocked(){return !!(window.VNDataBusy?.()||window.EpdDfuBusy?.()||window.EpdAutoUpdate?.busy?.()||window.countdownOperationBusy||(typeof clockImageUploadBusy!=='undefined'&&clockImageUploadBusy));}
function preview(){const d=device();if(!d)return;const n=Number($('clock-face-select').value),row=rows[n];if(!row)return;$('clock-face-preview').src='face-previews/'+d.id+'-'+(n+1)+'.png';$('clock-face-preview').alt=row.name+' — hình minh họa';$('clock-face-description').textContent=row.description;}
function refresh(){
 const d=device();$('clock-face-controls').hidden=!d;
 if(!d){$('clock-face-availability').textContent=unavailable();if(versionKey){versionKey='';$('clock-face-status').textContent='';}return;}
 if(versionKey!==d.key){versionKey=d.key;$('clock-face-select').replaceChildren();rows.forEach((r,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=r.name;$('clock-face-select').append(option);});const current=rows.findIndex(r=>r.modes[d.big?1:0]===nrf52DisplayMode);$('clock-face-select').value=String(current<0?0:current);$('clock-face-status').textContent='Chọn mẫu rồi bấm Hiển thị trên đồng hồ.';preview();}
 $('clock-face-availability').textContent='Đã nhận diện đồng hồ '+(d.big?'2.9':'2.13')+' inch. Hình bên dưới là mẫu minh họa; ngày giờ thực tế theo đồng hồ.';
 $('clock-face-select').disabled=busy||blocked();$('clock-face-apply').disabled=busy||blocked();
}
async function apply(){
 if(busy||blocked())return;
 const d=device(),n=Number($('clock-face-select').value),row=rows[n];if(!d||!row)return;
 busy=true;refresh();$('clock-face-status').textContent='Đang kiểm tra dữ liệu trên đồng hồ…';
 try{
  await T.run(async()=>{
   const token=T.current(),same=()=>{T.guard(token);if(device()?.key!==d.key||epdCharacteristic!==d.ch)throw Error('Kết nối đã thay đổi. Hãy chọn lại sau khi kết nối.');};
   same();if(!await T.facesReady())throw Error('Cần vào Cập nhật phần mềm → Cài đặt đồng hồ trước khi chọn giao diện.');same();
   const mode=row.modes[d.big?1:0],stamp=Math.floor(Date.now()/1000),zone=Math.round(-new Date().getTimezoneOffset()/60);
   const packet=new Uint8Array([0x20,stamp>>>24&255,stamp>>>16&255,stamp>>>8&255,stamp&255,zone&255,mode|0x40]);
   await T.wait(window.EpdGattWrites.run(d.ch,async()=>{same();if(d.ch.writeValueWithResponse)await d.ch.writeValueWithResponse(packet);else await d.ch.writeValue(packet);}),token);
   same();nrf52DisplayMode=mode;
   $('clock-face-status').textContent='Đã gửi lựa chọn “'+row.name+'”. Chờ màn hình làm mới xong; ngày giờ hiển thị theo thời điểm hiện tại.';
  });
 }catch(e){if(device()?.key===d.key)$('clock-face-status').textContent='Chưa hoàn tất: '+e.message;}
 finally{busy=false;refresh();}
}
$('clock-face-select').addEventListener('change',preview);$('clock-face-apply').addEventListener('click',apply);
window.ClockFacePicker={refresh,apply,supported:()=>!!device()};refresh();setInterval(refresh,500);
})();
