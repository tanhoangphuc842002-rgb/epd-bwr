/* Calendar selection: one SET_TIME packet, no cycling through intermediate faces. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),T=window.VNTransport;
const rows=[
 {name:'Lịch thông tin',description:'Lịch tháng kèm năm, tháng, âm lịch, tuần và mã đồng hồ.',modes:[1,1]},
 {name:'Lịch tháng lớn',description:'Số tháng lớn màu đỏ, tên tháng bằng chữ; bảng lịch tháng ở bên trái.',modes:[9,9]},
 {name:'Lịch âm',description:'Bảng ngày âm lịch; số tháng lớn màu đen, năm màu đỏ và ngày dương lịch bên dưới.',modes:[7,5]}
];
let busy=false,versionKey='';
function device(){
 if(typeof deviceProtocol==='undefined'||deviceProtocol!==PROTOCOL_NRF52||!gattServer?.connected||!nrf52ModelDetected||nrf52ModelId!==2||!epdCharacteristic)return null;
 const id=({213:'ce213',214:'noce213',215:'ce290',216:'noce290',217:'ce213-up3',218:'noce213-up3'})[nrf52FirmwareVersion],big=nrf52PanelProfile===0x29;
 if(!id||!(big?[215,216]:nrf52PanelProfile===0x21?[213,214,217,218]:[]).includes(nrf52FirmwareVersion))return null;
 return{key:[bleDevice?.id,nrf52PanelProfile,nrf52FirmwareVersion].join('|'),id,big,ch:epdCharacteristic};
}
function blocked(){return !!(window.VNDataBusy?.()||window.EpdDfuBusy?.()||window.EpdAutoUpdate?.busy?.()||window.countdownOperationBusy||(typeof clockImageUploadBusy!=='undefined'&&clockImageUploadBusy));}
function preview(){const d=device(),n=Number($('calendar-face-select').value),row=rows[n];if(!d||!row)return;$('calendar-face-preview').src='calendar-previews/'+d.id+'-'+(n+1)+'.png';$('calendar-face-preview').alt=row.name+' — hình minh họa';$('calendar-face-description').textContent=row.description;}
function refresh(){
 const d=device();$('calendar-face-controls').hidden=!d;
 if(!d){$('calendar-face-availability').textContent=typeof gattServer==='undefined'||!gattServer?.connected?'Kết nối đồng hồ để xem những giao diện lịch phù hợp.':'Đồng hồ này vẫn dùng nút Chuyển sang chế độ lịch phía trên. Cập nhật phần mềm có hỗ trợ để chọn trực tiếp.';versionKey='';return;}
 if(versionKey!==d.key){versionKey=d.key;$('calendar-face-select').replaceChildren();rows.forEach((r,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=r.name;$('calendar-face-select').append(o);});const n=rows.findIndex(r=>r.modes[d.big?1:0]===nrf52DisplayMode);$('calendar-face-select').value=String(n<0?0:n);$('calendar-face-status').textContent='Chọn mẫu rồi bấm Hiển thị lịch trên đồng hồ.';preview();}
 $('calendar-face-availability').textContent='Đã nhận diện đồng hồ '+(d.big?'2.9':'2.13')+' inch. Chọn mẫu lịch bạn muốn dùng; ngày tháng thực tế theo đồng hồ.';
 $('calendar-face-select').disabled=busy||blocked();$('calendar-face-apply').disabled=busy||blocked();
}
async function apply(){
 if(busy||blocked())return;const d=device(),row=rows[Number($('calendar-face-select').value)];if(!d||!row)return;
 busy=true;refresh();$('calendar-face-status').textContent='Đang kiểm tra dữ liệu trên đồng hồ…';
 try{await T.run(async()=>{
  const token=T.current(),same=()=>{T.guard(token);if(device()?.key!==d.key||epdCharacteristic!==d.ch)throw Error('Kết nối đã thay đổi. Hãy kết nối lại rồi chọn lịch.');};
  same();if(!await T.facesReady())throw Error('Vào Cập nhật phần mềm → Cài đặt đồng hồ để cài dữ liệu mới trước.');same();
  const mode=row.modes[d.big?1:0],stamp=Math.floor(Date.now()/1000),zone=Math.round(-new Date().getTimezoneOffset()/60),packet=new Uint8Array([0x20,stamp>>>24&255,stamp>>>16&255,stamp>>>8&255,stamp&255,zone&255,mode|0x40]);
  await T.wait(window.EpdGattWrites.run(d.ch,async()=>{same();if(d.ch.writeValueWithResponse)await d.ch.writeValueWithResponse(packet);else await d.ch.writeValue(packet);}),token);same();nrf52DisplayMode=mode;
  $('calendar-face-status').textContent='Đã chọn “'+row.name+'”. Chờ màn hình làm mới xong.';
 });}catch(e){if(device()?.key===d.key)$('calendar-face-status').textContent='Chưa hoàn tất: '+e.message;}
 finally{busy=false;refresh();}
}
$('calendar-face-select').addEventListener('change',preview);$('calendar-face-apply').addEventListener('click',apply);
window.CalendarFacePicker={refresh,apply,supported:()=>!!device()};refresh();setInterval(refresh,500);
})();
