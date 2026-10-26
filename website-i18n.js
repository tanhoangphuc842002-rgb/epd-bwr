/* Website UI only. Never changes form values, resource payloads or Bluetooth commands. */
(()=>{
'use strict';
const nodes=new WeakMap(),attrs=new WeakMap(),normalize=s=>String(s).replace(/\s+/g,' ').trim();
const skipTags=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);
let vi={},en={},parts=null,shortParts=null;
function configure(base,extra){
 extra={...extra,
  'Chọn ảnh của tôi':'Choose my own image','Dừng tải':'Stop upload','Tải lại tranh':'Retry image upload',
  'Đang chờ đồng hồ sẵn sàng và kiểm tra dữ liệu…':'Waiting for the clock and checking its data…',
  'Đang dừng phiên tải bị ngắt để tải lại ảnh…':'Stopping the interrupted transfer before retrying…',
  'Ảnh đã lưu đầy đủ; không cần truyền lại.':'The image is already saved; no need to send it again.',
  'Đang kiểm tra ảnh vừa lưu…':'Checking the saved image…',
  'Bấm Tải lại tranh để thử lại ảnh đã chọn.':'Choose Retry image upload to retry the selected image.',
  'Ảnh và cách hiển thị đã lưu đầy đủ. Bạn có thể sử dụng đồng hồ.':'The image and display settings are saved. Your clock is ready.',
  'Đang kết nối lại đồng hồ để tải lại tranh…':'Reconnecting to retry the image upload…',
  'Hãy kết nối lại đúng đồng hồ đã chọn ảnh rồi bấm Tải lại tranh. Chưa gửi thay đổi.':'Reconnect to the same clock, then choose Retry image upload. No changes were sent.',
  'Chưa kết nối đúng đồng hồ. Hãy kết nối lại rồi bấm Tải lại tranh.':'The same clock is not connected. Reconnect, then choose Retry image upload.',
  'Hãy kết nối lại đúng đồng hồ đã chọn ảnh. Chưa gửi thay đổi.':'Reconnect to the same clock. No changes were sent.'
 };
 vi={...base};en={};for(const[english,vietnamese]of Object.entries(base))en[normalize(vietnamese)]=english;
 for(const[vietnamese,english]of Object.entries(extra)){en[normalize(vietnamese)]=english;if(!(english in vi))vi[english]=vietnamese;}
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 parts=new RegExp(Object.keys(en).filter(s=>s.length>=4&&/[À-ỹĐđ]/.test(s)).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
 shortParts=new RegExp('(^|[^\\p{L}\\p{N}])('+Object.keys(en).filter(s=>s.length>=2&&s.length<4&&/[À-ỹĐđ]/.test(s)).map(escape).join('|')+')(?=$|[^\\p{L}\\p{N}])','gu');
}
function current(){try{return localStorage.getItem('app-language')==='en'?'en':'vi';}catch(_){return'vi';}}
function navigationCopy(value,lang){
 if(lang==='en')return value.replace(/^Software update$/,'Settings').replace(/Software update(?=\s*→|\s+first\.)/g,'Settings');
 return value.replace(/^Cập nhật phần mềm$/,'Cài đặt').replace(/Cập nhật phần mềm(?=\s*→)/g,'Cài đặt').replace(/mục Cập nhật phần mềm/g,'mục Cài đặt');
}
function translate(text,lang=current()){
 if(typeof text!=='string')return text;
 if(lang==='en')text=text.replace(/Đã kiểm tra xong \(([\d.]+) giây\)\. Đang lưu ảnh\. Giữ kết nối và không tháo pin\./g,'Checks completed ($1 seconds). Saving the image. Stay connected and keep the battery in place.');
 const key=normalize(text),map=lang==='en'?en:vi;
 let value=map[key];
 if(value===undefined&&lang!=='en')return navigationCopy(text,lang);
 if(value===undefined)value=lang==='en'&&parts?key.replace(parts,s=>en[s]).replace(shortParts,(match,gap,s)=>gap+en[s]):key;
 return text.match(/^\s*/)[0]+navigationCopy(value,lang)+text.match(/\s*$/)[0];
}
function ignored(element){return !element||skipTags.has(element.tagName)||!!element.closest('[data-no-i18n],#daily-quote-list,#daily-quote-author-preview');}
function textNode(node,lang=current()){
 if(ignored(node.parentElement)||!node.nodeValue?.trim())return;
 const raw=node.nodeValue,prior=nodes.get(node);
 const source=prior&&raw===prior.last?prior.source:raw;
 const last=translate(source,lang);nodes.set(node,{source,last});if(raw!==last)node.nodeValue=last;
}
function attributes(element,lang=current()){
 if(!element||element.closest('[data-no-i18n]'))return;let state=attrs.get(element);if(!state){state={};attrs.set(element,state);}
 for(const name of ['placeholder','title','aria-label','alt']){
  if(!element.hasAttribute(name))continue;const raw=element.getAttribute(name),prior=state[name],source=prior&&raw===prior.last?prior.source:raw,last=translate(source,lang);
  state[name]={source,last};if(raw!==last)element.setAttribute(name,last);
 }
}
function subtree(root,lang=current()){
 if(root.nodeType===Node.TEXT_NODE){textNode(root,lang);return;}
 if(root.nodeType!==Node.ELEMENT_NODE)return;
 attributes(root,lang);if(ignored(root))return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const list=[];while(walker.nextNode())list.push(walker.currentNode);for(const n of list)textNode(n,lang);
 for(const el of root.querySelectorAll('[placeholder],[title],[aria-label],[alt]'))attributes(el,lang);
}
function apply(lang=current()){
 lang=lang==='en'?'en':'vi';try{localStorage.setItem('app-language',lang);}catch(_){}
 document.documentElement.lang=lang;document.title=translate('E-Paper Tag - Bluetooth Controller',lang);
 const selector=document.getElementById('language-selector');if(selector)selector.value=lang;
 // Refresh only illustration URLs: choosing a website language never writes to the clock.
 window.ClockFacePicker?.refreshPreview?.();
 window.CalendarFacePicker?.refreshPreview?.();
 subtree(document.body,lang);
}
function observe(){
 const observer=new MutationObserver(changes=>{const lang=current();for(const m of changes){
  if(m.type==='characterData')textNode(m.target,lang);
  else if(m.type==='attributes')attributes(m.target,lang);
  else for(const n of m.addedNodes)subtree(n,lang);
 }});
 observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label','alt']});
 // Dialog messages are UI, not outgoing resource data. Inputs and drafts are untouched.
 for(const name of ['alert','confirm']){const original=window[name].bind(window);window[name]=message=>original(translate(message));}
}
window.EpdWebsiteI18n={configure,current,translate,apply,observe,textNode,attributes};
})();
