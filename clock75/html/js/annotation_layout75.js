(function(root){
 'use strict';const node=typeof module!=='undefined'&&module.exports;
 const builder=node?require('./resource_builder'):root.EPDResourceBuilder,store=node?require('./resource_store'):root.EPDResourceStore,fonts=node?require('./font_builder'):root.EPDWebFonts;
 function font(project){const bytes=Uint8Array.from(atob(project.files.find(f=>f.name==='ui.ers').base64),c=>c.charCodeAt(0)),assets=builder.decodeUI(store.parsePackage(bytes).payload).faceAssets,v=new DataView(assets.buffer,assets.byteOffset,assets.byteLength),at=16+6*12;return assets.slice(v.getUint32(at+4,true),v.getUint32(at+4,true)+v.getUint32(at+8,true));}
 function glyphs(bytes){const map=new Map();let at=23;while(bytes[at+1]){const n=bytes[at+1];map.set(bytes[at],fonts.decodeGlyph(bytes,bytes[at],bytes.slice(at,at+n)));at+=n;}at=23+((bytes[21]<<8)|bytes[22])+4;while(bytes[at]||bytes[at+1]){const code=bytes[at]*256+bytes[at+1],n=bytes[at+2];map.set(code,fonts.decodeGlyph(bytes,code,bytes.slice(at,at+n)));at+=n;}return map;}
 function measure(map,text){let advance=0,width=0;for(const c of text.normalize('NFC')){const g=map.get(c.codePointAt(0));if(!g)throw Error('Chưa hỗ trợ ký tự “'+c+'” trong nhãn phía trên.');width=Math.max(width,advance+g.x+g.width);advance+=g.advance;}return width;}
 function validate(map,items){for(const i of items)if(i.position===1&&i.label&&measure(map,i.label)>103)throw Error('Nhãn “'+i.label+'” dài hơn ô ngày. Hãy rút gọn để hiện đầy đủ ở phía trên.');}
 const api={font,glyphs,measure,validate};if(node){module.exports=api;return;}
 const $=id=>document.getElementById(id),map=glyphs(font(root.EPDVietnameseProjects.times)),a=CalendarAnnotations;
 const oldAdd=a.addOrUpdate,oldSave=a.save,oldPreview=a.updatePreview;
 a.addOrUpdate=function(){try{validate(map,[{position:this.selectedPosition(),label:$('calendarAnnotationLabel').value.trim()}]);return oldAdd.call(this);}catch(e){this.report(e.message,true);}};
 a.save=async function(){try{validate(map,this.annotations);if(this.annotations.some(i=>i.position===1&&i.label)){
   if(typeof appVersion==='undefined'||appVersion<0x5B)throw Error('Cập nhật phần mềm đồng hồ trước để hiển thị nhãn đầy đủ.');
   await root.ExternalResourceInstaller.countdownOperation(async(client,check)=>{const i=await client.inspect(6);check();if(i.code||i.revision<10)throw Error('Vào Cài đặt đồng hồ để cập nhật dữ liệu chữ nhỏ trước khi lưu.');});
  }return await oldSave.call(this);}catch(e){this.report(e.message,true);}};
 a.positionLabel=p=>p===1?'Phía trên trong ô ngày':'Dưới ngày';
 a.updatePreview=function(){oldPreview.call(this);const c=$('annotationCellCanvas');if(!c)return;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#999';ctx.strokeRect(.5,.5,110,64);
  const date=this.dateParts($('calendarAnnotationDate').value),text=$('calendarAnnotationLabel').value.trim().normalize('NFC'),above=this.selectedPosition()===1;
  $('calendarAnnotationFontSize').disabled=above;const color=Number($('calendarAnnotationColor').value);ctx.fillStyle=color===2?'#b51f25':color===1?'#fff':'#111';
  let pen=107;try{pen-=measure(map,text);let x=pen;for(const ch of above?text:''){const g=map.get(ch.codePointAt(0));for(let y=0;y<g.height;y++)for(let xx=0;xx<g.width;xx++)if(g.pixels[y*g.width+xx])ctx.fillRect(x+g.x+xx,12-g.y-g.height+y,1,1);x+=g.advance;}}catch(_){}
  ctx.fillStyle='#111';ctx.textAlign='center';ctx.font='bold 22px Arial';ctx.fillText(date?date.day:'31',55,above?39:30);ctx.font='13px Arial';ctx.fillText(above||!text?'22':text,55,56,103);
  let note=above?'Nhãn nằm phía trên trong từng ô ngày. Chữ nhỏ giữ nguyên dấu tiếng Việt; dòng âm lịch vẫn ở dưới.':'Nhãn thay dòng âm lịch hoặc ngày lễ của ngày được chọn.';
  try{validate(map,[{position:above?1:0,label:text}]);}catch(e){note=e.message;}
  $('calendarAnnotationPreviewNote').textContent=note;
  $('calendarAnnotationLabelHint').textContent='Nội dung: '+this.labelByteLength(text)+'/40 byte. Nhãn phía trên cần vừa một ô ngày để hiện đủ chữ.';
 };
 root.AnnotationLayout75=api;window.addEventListener('load',()=>a.updatePreview());
})(globalThis);
