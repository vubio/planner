/** Collision-aware title callouts for very narrow or overlapping timeline blocks. */
export type LabelRect={id:string,x:number,y:number,width:number,height:number,title:string,tagCount:number};
export type PlacedLabel={id:string,x:number,y:number,width:number,height:number,anchorX:number,anchorY:number,attachX:number,attachY:number};

const LABEL_WIDTH=224;
const GAP=11;
type Box={x:number,y:number,width:number,height:number};
const intersects=(a:Box,b:Box,pad=0)=>a.x<b.x+b.width+pad&&a.x+a.width+pad>b.x&&a.y<b.y+b.height+pad&&a.y+a.height+pad>b.y;
const overlapArea=(a:Box,b:Box)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
const clamp=(v:number,min:number,max:number)=>Math.min(Math.max(v,min),max);

export function arrangeTaskLabels(tasks:LabelRect[],canvasWidth:number,canvasHeight:number):PlacedLabel[]{
 const callouts=tasks.filter(t=>t.width<190||tasks.some(other=>other.id!==t.id&&intersects(t,other,1)));
 const occupied:Box[]=[...tasks];
 const placed:PlacedLabel[]=[];
 for(const task of callouts.sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id))){
  const labelHeight=70+(task.tagCount?23:0);
  const ownCenterX=task.x+task.width/2,ownCenterY=task.y+task.height/2;
  const candidateBoxes:Box[]=[];
  const add=(x:number,y:number)=>candidateBoxes.push({x:clamp(x,0,Math.max(0,canvasWidth-LABEL_WIDTH)),y:clamp(y,83,Math.max(83,canvasHeight-labelHeight)),width:LABEL_WIDTH,height:labelHeight});
  // Keep callouts near their task when possible; stagger into free lanes when crowded.
  for(let lane=0;lane<5;lane++){
   const offset=lane*(labelHeight+GAP);
   add(task.x,task.y-labelHeight-GAP-offset);
   add(ownCenterX-LABEL_WIDTH/2,task.y-labelHeight-GAP-offset);
   add(task.x,task.y+task.height+GAP+offset);
   add(ownCenterX-LABEL_WIDTH/2,task.y+task.height+GAP+offset);
   add(task.x+task.width+GAP+lane*28,task.y);
   add(task.x-LABEL_WIDTH-GAP-lane*28,task.y);
  }
  let best=candidateBoxes[0],bestScore=Infinity;
  for(const box of candidateBoxes){
   let collisions=0;
   for(const other of occupied){
    if(intersects(box,other,5))collisions+=10000+overlapArea(box,other)*10;
   }
   const distance=Math.hypot(clamp(ownCenterX,box.x,box.x+box.width)-ownCenterX,clamp(ownCenterY,box.y,box.y+box.height)-ownCenterY);
   const score=collisions+distance;
   if(score<bestScore){best=box;bestScore=score}
   if(score===0)break;
  }
  occupied.push(best);
  const attachX=clamp(ownCenterX,best.x,best.x+best.width),attachY=clamp(ownCenterY,best.y,best.y+best.height);
  placed.push({id:task.id,...best,anchorX:ownCenterX,anchorY:ownCenterY,attachX,attachY});
 }
 return placed;
}
