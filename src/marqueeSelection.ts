export type MarqueeRect={left:number,top:number,right:number,bottom:number};
export const marqueeBounds=(x1:number,y1:number,x2:number,y2:number):MarqueeRect=>({
 left:Math.min(x1,x2),right:Math.max(x1,x2),
 top:Math.min(y1,y2),bottom:Math.max(y1,y2)
});
/** Touching a task's actual rectangular block counts as selecting it. */
export const marqueeOverlaps=(selection:MarqueeRect,task:MarqueeRect):boolean=>
 selection.left<=task.right&&selection.right>=task.left&&
 selection.top<=task.bottom&&selection.bottom>=task.top;
export const combineMarqueeSelection=(previous:readonly string[],hits:readonly string[],additive:boolean):string[]=>
 additive?[...new Set([...previous,...hits])]:[...hits];
