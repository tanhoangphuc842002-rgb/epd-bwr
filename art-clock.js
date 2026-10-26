/* Art is stored in existing CRC-checked photo slots, never in firmware ROM. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),T=root.VNTransport,A=root.PhotoAlbumShared;
 const known=()=>typeof deviceProtocol!=='undefined'&&deviceProtocol===PROTOCOL_NRF52&&nrf52ModelDetected&&nrf52ModelId===2&&!!gattServer?.connected&&
  (nrf52PanelProfile===33?[246,247,250,251,254,255].includes(nrf52FirmwareVersion):nrf52PanelProfile===41&&[248,249,252,253,254,255].includes(nrf52FirmwareVersion));
 const full=()=>known()&&[250,251,252,253,254,255].includes(nrf52FirmwareVersion);
 const corner=()=>nrf52PanelProfile===41?{x:176,width:120,height:80}:{x:146,width:104,height:72};
 const selected=()=>known()&&$('art-clock-layout').value==='art';
 const en=()=>root.EpdWebsiteI18n?.current()==='en';
 const text=s=>root.EpdWebsiteI18n?.translate(s)||s;
 const wording=(vi,english)=>en()?english:vi;
 const busy=()=>!!A.busy()||!!T.busy()||clockImageUploadBusy||!!root.EpdDfuBusy?.();
 let loading=false,imageToken=0,deviceKey='';
 const originalTarget=root.getClockImageTarget,originalUpdate=root.updateClockImageAvailability,originalUpload=root.uploadClockImage,originalRender=root.renderClockImage;
 root.getClockImageTarget=function(){
  const t=originalTarget();if(!selected()||!t)return t;
  return {...t,width:full()?(nrf52PanelProfile===41?296:250):(nrf52PanelProfile===41?176:148),height:128,artClock:true,
   title:wording('Đồng hồ tranh','Art clock'),description:full()?wording('Tranh phủ toàn màn hình; ô trắng góc trên bên phải hiển thị giờ và ngày tháng năm.','Full-screen art with time and date in a white top-right corner.'):wording('Tranh bên trái; giờ, ngày và thứ bên phải. Giờ tự cập nhật mỗi phút.','Art on the left; time, date and weekday on the right. Time updates every minute.')};
 };
 function controls(){
  const ok=known(),key=ok?T.key()+'|'+nrf52FirmwareVersion:'';
  if(key!==deviceKey){deviceKey=key;if(ok&&!root.SmallClockAlbum?.hasRetry())$('art-clock-layout').value=nrf52DisplayMode===15?'art':'classic';}
  const active=selected(),locked=busy()||loading;
  $('art-clock-controls').hidden=!ok;$('art-clock-gallery').hidden=!active;
  $('art-clock-layout-label').textContent=wording('Cách hiển thị','Layout');
  $('art-clock-layout').options[0].textContent=wording('Đồng hồ và ảnh','Clock and image');
  $('art-clock-layout').options[1].textContent=wording('Đồng hồ tranh','Art clock');
  $('art-clock-help').textContent=wording('Chọn một bức tranh hoặc tải ảnh của bạn, chỉnh khung rồi bấm Tải lên đồng hồ. Tranh đã lưu vẫn dùng được khi ngắt kết nối web.','Choose a painting or upload your own image, adjust the crop, then upload it to the clock. Saved art remains available offline.');
  const width=full()?(nrf52PanelProfile===41?296:250):(nrf52PanelProfile===41?176:148);
  $('art-clock-dimensions').textContent=wording(`Khung ảnh: ${width} × 128 px. ${full()?'Góc trắng được chừa sẵn cho giờ và ngày. ':''}Dùng chung 8 ô ảnh trong album; thay ảnh ở ô đang chọn sẽ có thông báo xác nhận.`,`Image area: ${width} × 128 px. ${full()?'The white corner is reserved for time and date. ':''}Shares the album's 8 photo slots; replacing an occupied slot asks for confirmation.`);
  $('art-clock-layout').disabled=!ok||locked;
  const names={spring:['Xuân','Spring'],summer:['Hạ','Summer'],autumn:['Thu','Autumn'],winter:['Đông','Winter']};
  for(const b of document.querySelectorAll('[data-art-season]')){
   b.disabled=!ok||locked;const name=names[b.dataset.artSeason][en()?1:0];b.querySelector('span').textContent=name;b.querySelector('img').alt=name;
  }
  // Shared photo actions own this lock, including the ordinary upload button.
  if(active)$('clock-image-upload-button').disabled=locked;
 }
 async function ready(){
  if(!selected())return;
  if(!await T.facesReady({readiness:true}))throw Error(wording('Vào Cài đặt đồng hồ và bấm Cài đặt / cập nhật dữ liệu trước khi dùng Đồng hồ tranh.','Open Settings and install/update clock data before using Art clock.'));
 }
 root.renderClockImage=function(){originalRender();if(selected()&&full()){const box=corner(),ctx=$('clock-image-canvas').getContext('2d');ctx.fillStyle='white';ctx.fillRect(box.x,0,box.width,box.height);}};
 root.updateClockImageAvailability=function(){controls();originalUpdate();controls();};
 root.uploadClockImage=function(){return selected()?root.SmallClockAlbum.saveAndShow():originalUpload();};
 $('art-clock-layout').onchange=()=>{if(busy())return;imageToken++;root.updateClockImageAvailability();if(clockImageOriginal)clockImageFit(false);};
 async function choose(season){
  if(!selected()||busy()||loading)return;
  const key=T.key(),token=++imageToken;loading=true;controls();
  try{
   const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(wording('Chưa tải được tranh. Hãy tải lại trang.','Could not load art. Reload the page.')));im.src=document.querySelector('[data-art-season="'+season+'"] img').src;});
   if(token!==imageToken||key!==T.key()||!selected())return;
   clockImageOriginal=image;clockImageRotation=0;clockImageScale=1;clockImageOffsetX=clockImageOffsetY=0;
   resetClockQuickOverlay(true);clockImageFit(true);
   const canvas=$('clock-image-canvas'),ratio=Math.max(canvas.width/image.width,canvas.height/image.height);
   clockImageOffsetX=(image.width*ratio-canvas.width)*0.25;renderClockImage();
   $('clock-image-status').textContent=wording('Đã chọn tranh. Có thể chỉnh khung rồi bấm Tải lên đồng hồ.','Art selected. Adjust the crop if needed, then upload to the clock.');
  }catch(e){$('clock-image-status').textContent=e.message;}
  finally{loading=false;controls();}
 }
 for(const b of document.querySelectorAll('[data-art-season]'))b.onclick=()=>choose(b.dataset.artSeason);
 root.ArtClock={known,full,corner,selected,ready,controls,text,choose};controls();
 $('language-selector')?.addEventListener('change',()=>setTimeout(controls,0));
})(globalThis);
