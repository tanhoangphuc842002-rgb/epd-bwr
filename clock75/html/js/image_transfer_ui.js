/* Presentation only: never sends Bluetooth commands or estimates transfer speed. */
(function(root){
 'use strict';
 let current=null;
 const bar=()=>root.document.getElementById('imageTransferProgress');
 function show(owner,message,value){
  if(current!==owner)return;
  const p=bar(),label=root.document.getElementById('imageTransferStatus');
  if(p){if(value===null)p.removeAttribute('value');else p.value=Math.max(0,Math.min(100,value));}
  if(label)label.textContent=message;
 }
 root.ImageTransferUI={
  start(owner){current=owner;show(owner,'Đang chuẩn bị ảnh…',0);bar()?.scrollIntoView?.({block:'nearest',behavior:'smooth'});},
  update(owner,sent,total,layer){if(total>0){const percent=Math.floor(100*sent/total);show(owner,`Đang gửi ảnh: ${percent}% · Lớp ${layer==='bw'?'đen':'đỏ'}`,percent);}},
  refresh(owner){show(owner,'Đã gửi đủ dữ liệu. Đang chờ đồng hồ làm mới màn hình…',null);},
  complete(owner,confirmed){show(owner,confirmed?'Đã gửi ảnh và làm mới màn hình.':'Đã gửi ảnh. Vui lòng chờ màn hình làm mới xong.',100);},
  fail(owner){show(owner,'Chưa hoàn tất. Kiểm tra kết nối rồi bấm Gửi ảnh để thử lại.',bar()?.value||0);}
 };
})(globalThis);
