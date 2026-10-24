/* Small, canvas-independent image controls, following the existing photo-clock
 * editor. These functions never connect to a device or change another canvas. */
(function(root){
 'use strict';
 const processor=typeof module!=='undefined'&&module.exports?require('../../../clock-image-processing'):root.EpdClockImageProcessing;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function defaults(){return {rotation:0,zoom:1,x:0,y:0,fit:'cover',...processor.defaults()};}
 function placement(width,height,state,targetWidth=400,targetHeight=480){
  if(!(width>0&&height>0))throw new Error('Kích thước ảnh không hợp lệ.');
  const rotation=((state.rotation%360)+360)%360,rotated=rotation===90||rotation===270;
  const sw=rotated?height:width,sh=rotated?width:height;
  const ratio=(state.fit==='cover'?Math.max:Math.min)(targetWidth/sw,targetHeight/sh)*clamp(state.zoom,.2,8);
  return {x:targetWidth/2+clamp(state.x,-800,800),y:targetHeight/2+clamp(state.y,-800,800),angle:rotation*Math.PI/180,width:width*ratio,height:height*ratio};
 }
 function quantize(pixels,state,width=pixels.length/4,height=1){
  if(!(pixels instanceof Uint8ClampedArray)||pixels.length%4)throw new Error('Dữ liệu ảnh không hợp lệ.');
  return processor.process(pixels,width,height,state);
 }
 const api={defaults,placement,quantize,clamp};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhotoClockEditor=api;
})(globalThis);
