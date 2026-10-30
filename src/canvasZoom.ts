// Map Ctrl + wheel gestures to the planner's existing timeline zoom range.
// Browser wheel events use pixels (0), lines (1), or pages (2).
export function wheelZoom(current:number,deltaY:number,deltaMode=0){
 const pixels=deltaY*(deltaMode===1?40:deltaMode===2?600:1);
 const limited=Math.max(-240,Math.min(240,pixels));
 return Math.round(Math.max(.15,Math.min(4,current*Math.exp(-limited*.0012)))*10000)/10000;
}

// Keep the same point on the timeline underneath the mouse after the zoom.
export function anchoredScrollLeft(contentX:number,cursorX:number,fromZoom:number,toZoom:number){
 return Math.max(0,contentX*toZoom/fromZoom-cursorX);
}

// The 80px timeline ruler stays fixed while the drawing space beneath it scales.
export const canvasY=(logicalY:number,verticalPad:number,scale:number)=>80+(logicalY+verticalPad)*scale;
export const fromCanvasY=(pixelY:number,verticalPad:number,scale:number)=>(pixelY-80)/scale-verticalPad;
export const fromCanvasDeltaY=(pixelDelta:number,scale:number)=>pixelDelta/scale;
export const canvasHeight=(baseHeight:number,scale:number)=>80+(baseHeight-80)*scale;
export const anchoredScrollTop=(contentY:number,cursorY:number,fromZoom:number,toZoom:number)=>
 Math.max(0,80+(contentY-80)*toZoom/fromZoom-cursorY);
