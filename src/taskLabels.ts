/** Gentle compact-title placement: nearby text, never detached callout cards. */
export type TaskLabelRect={id:string,x:number,y:number,width:number,height:number,title:string,layout?:TaskTitleMode,hasProject?:boolean,checklistCount?:number};
export type CompactTitlePosition={id:string,left:number,top:number};
export type TaskTitleMode='standard'|'vertical'|'compact';
export type TaskTitleFit={width:number,height:number,title:string,hasProject?:boolean,checklistCount?:number};
type Box={x:number,y:number,width:number,height:number};

/** Put titles inside tall narrow blocks when their text can reasonably wrap.
 * Only the time range needs to move outside those blocks. */
export function taskTitleMode(task:TaskTitleFit):TaskTitleMode{
 if(task.width>=160)return 'standard';
 if(task.width<64)return 'compact';
 const charsPerLine=Math.max(1,Math.floor((task.width-16)/7.1));
 const lines=Math.max(1,Math.ceil(task.title.trim().length/charsPerLine));
 const needed=54+lines*17+(task.hasProject?22:0)+(task.checklistCount?26:0);
 return task.height>=needed?'vertical':'compact';
}

const overlap=(a:Box,b:Box)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));

export function placeCompactTitles(tasks:TaskLabelRect[]):CompactTitlePosition[]{
 const compact=tasks.filter(t=>t.layout?t.layout==='compact':t.width<160).sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));
 const used:Box[]=[];
 return compact.map(t=>{
  const labelWidth=Math.min(194,Math.max(120,t.title.length*7.3+16));
  // The title, time and box should read as one item. Most titles occupy one
  // line, so reserving a fixed two-line label height leaves needless space.
  const titleLines=Math.min(2,Math.max(1,Math.ceil(t.title.trim().length*6.8/(labelWidth-10))));
  const labelHeight=37+(titleLines-1)*16+(t.hasProject?21:0)+(t.checklistCount?9:0);
  const closeAbove=-labelHeight-2,closeBelow=t.height+3;
  // Only small, predictable nudges. Some overlap is intentional in dense areas.
  const candidates:[number,number,number][]=[
   [0,closeAbove,0],[0,closeBelow,15],
   [-18,closeAbove,6],[18,closeAbove,6],
   [-18,closeBelow,21],[18,closeBelow,21],
   [0,closeAbove-12,28],[0,closeBelow+12,33]
  ];
  let best={left:0,top:closeAbove},bestScore=Infinity;
  for(const [dx,dy,bias] of candidates){
   const box={x:Math.max(0,t.x+dx),y:Math.max(82,t.y+dy),width:labelWidth,height:labelHeight};
   const labelObstruction=used.reduce((sum,other)=>sum+overlap(box,other),0);
   const bodyObstruction=tasks.filter(other=>other.id!==t.id).reduce((sum,other)=>sum+overlap(box,other),0);
   const ownObstruction=overlap(box,{x:t.x,y:t.y,width:t.width,height:t.height});
   const score=bias+labelObstruction*.18+bodyObstruction*.07+ownObstruction*.5;
   if(score<bestScore){bestScore=score;best={left:box.x-t.x,top:box.y-t.y}}
  }
  used.push({x:t.x+best.left,y:t.y+best.top,width:labelWidth,height:labelHeight});
  return {id:t.id,...best};
 });
}
