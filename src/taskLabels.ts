/** Gentle compact-title placement: nearby text, never detached callout cards. */
export type TaskLabelRect={id:string,x:number,y:number,width:number,height:number,title:string,layout?:TaskTitleMode};
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
  const labelWidth=Math.min(194,Math.max(120,t.title.length*7.3+16)),labelHeight=54;
  // Only small, predictable nudges. Some overlap is intentional in dense areas.
  const candidates:[number,number,number][]=[
   [0,-labelHeight-4,0],[0,t.height+5,15],
   [-18,-labelHeight-4,6],[18,-labelHeight-4,6],
   [-18,t.height+5,21],[18,t.height+5,21],
   [0,-labelHeight-18,28],[0,t.height+18,33]
  ];
  let best={left:0,top:-labelHeight-4},bestScore=Infinity;
  for(const [dx,dy,bias] of candidates){
   const box={x:Math.max(0,t.x+dx),y:Math.max(82,t.y+dy),width:labelWidth,height:labelHeight};
   const labelObstruction=used.reduce((sum,other)=>sum+overlap(box,other),0);
   const bodyObstruction=tasks.filter(other=>other.id!==t.id).reduce((sum,other)=>sum+overlap(box,other),0);
   const score=bias+labelObstruction*.18+bodyObstruction*.07;
   if(score<bestScore){bestScore=score;best={left:box.x-t.x,top:box.y-t.y}}
  }
  used.push({x:t.x+best.left,y:t.y+best.top,width:labelWidth,height:labelHeight});
  return {id:t.id,...best};
 });
}
