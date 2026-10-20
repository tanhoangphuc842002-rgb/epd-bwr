/* Website UI only. Never changes form values, resource payloads or Bluetooth commands. */
(()=>{
'use strict';
const nodes=new WeakMap(),attrs=new WeakMap(),normalize=s=>String(s).replace(/\s+/g,' ').trim();
const skipTags=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);
let vi={},en={},parts=null,shortParts=null;
function configure(base,extra){
 vi={...base};en={};for(const[english,vietnamese]of Object.entries(base))en[normalize(vietnamese)]=english;
 for(const[vietnamese,english]of Object.entries(extra)){en[normalize(vietnamese)]=english;if(!(english in vi))vi[english]=vietnamese;}
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 parts=new RegExp(Object.keys(en).filter(s=>s.length>=4&&/[À-ỹĐđ]/.test(s)).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
 shortParts=new RegExp('(^|[^\\p{L}\\p{N}])('+Object.keys(en).filter(s=>s.length>=2&&s.length<4&&/[À-ỹĐđ]/.test(s)).map(escape).join('|')+')(?=$|[^\\p{L}\\p{N}])','gu');
}
function current(){try{return localStorage.getItem('app-language')==='en'?'en':'vi';}catch(_){return'vi';}}
function translate(text,lang=current()){
 if(typeof text!=='string')return text;
 const key=normalize(text),map=lang==='en'?en:vi;
 let value=map[key];
 if(value===undefined&&lang!=='en')return text;
 if(value===undefined)value=lang==='en'&&parts?key.replace(parts,s=>en[s]).replace(shortParts,(match,gap,s)=>gap+en[s]):key;
 return text.match(/^\s*/)[0]+value+text.match(/\s*$/)[0];
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
