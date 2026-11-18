/** Route outgoing arrows toward the destination rather than always leaving at mid-height. */
export function sourceConnectionY(sourceTop:number,sourceHeight:number,targetCenter:number):number{
 const height=Math.max(1,sourceHeight);
 const inset=Math.min(14,height*.22);
 return Math.max(sourceTop+inset,Math.min(sourceTop+height-inset,targetCenter));
}
/** Keep short forward connections monotonic, without overshooting or curling backward. */
export function connectionBezierPath(ax:number,ay:number,bx:number,by:number):string{
 const gap=bx-ax;
 const handle=gap>=0?Math.min(110,gap*.46):Math.max(40,Math.abs(gap)*.5);
 return `M${ax},${ay} C${ax+handle},${ay} ${bx-handle},${by} ${bx},${by}`;
}
