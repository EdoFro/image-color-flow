/* Geometría de selección y edición de los destacados separados. */
(function (root) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function handles(r) { return [['nw',r.x,r.y],['n',r.x+r.width/2,r.y],['ne',r.x+r.width,r.y],['e',r.x+r.width,r.y+r.height/2],['se',r.x+r.width,r.y+r.height],['s',r.x+r.width/2,r.y+r.height],['sw',r.x,r.y+r.height],['w',r.x,r.y+r.height/2]].map(([edge,x,y])=>({edge,x,y})); }
  function hit(rects, selected, p, width, height) {
    const r = rects[selected];
    if (r) { const tolerance = Math.min(9, r.width * width / 4, r.height * height / 4); const h = handles(r).find(q => Math.hypot((q.x-p.x)*width,(q.y-p.y)*height)<=tolerance); if (h) return {index:selected,edge:h.edge}; }
    const order = [...rects.keys()].reverse(); if (r) { order.splice(order.indexOf(selected),1); order.unshift(selected); }
    for (const index of order) { const q=rects[index]; if (p.x>=q.x&&p.x<=q.x+q.width&&p.y>=q.y&&p.y<=q.y+q.height) return {index,edge:'move'}; }
    return null;
  }
  function transform(rect, start, end, edge) {
    if (edge==='move') return {...rect,x:clamp(rect.x+end.x-start.x,0,1-rect.width),y:clamp(rect.y+end.y-start.y,0,1-rect.height)};
    let left=rect.x,top=rect.y,right=rect.x+rect.width,bottom=rect.y+rect.height;
    if(edge.includes('w'))left=clamp(end.x,0,right-.02);if(edge.includes('e'))right=clamp(end.x,left+.02,1);
    if(edge.includes('n'))top=clamp(end.y,0,bottom-.02);if(edge.includes('s'))bottom=clamp(end.y,top+.02,1);
    return {x:left,y:top,width:Math.max(.02,right-left),height:Math.max(.02,bottom-top)};
  }
  root.PaintHighlightEditor={handles,hit,transform};
})(typeof window==='undefined'?globalThis:window);
