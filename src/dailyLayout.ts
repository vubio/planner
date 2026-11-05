export type DayInterval={id:string,startMinute:number,endMinute:number};

export type PositionedInterval<T extends DayInterval>=T&{column:number,columns:number};

/**
 * Place intersecting appointments in chronological columns. An appointment
 * starting later never jumps to the left of one that is still in progress.
 * Once a connected overlap group ends, the next group starts at the left.
 */
export function layoutDayIntervals<T extends DayInterval>(intervals:T[]):PositionedInterval<T>[] {
 const sorted=[...intervals].sort((a,b)=>a.startMinute-b.startMinute||b.endMinute-a.endMinute||a.id.localeCompare(b.id));
 const result:PositionedInterval<T>[]=[];
 let group:T[]=[],groupEnd=-Infinity;

 const finishGroup=()=>{
  if(!group.length)return;
  const ends:number[]=[],placed:{item:T,column:number}[]=[];
  for(const item of group){
   const rightmostActive=ends.reduce((highest,end,column)=>end>item.startMinute?Math.max(highest,column):highest,-1);
   let column=ends.findIndex((end,index)=>index>rightmostActive&&end<=item.startMinute);
   if(column<0){column=ends.length;ends.push(item.endMinute)}
   else ends[column]=item.endMinute;
   placed.push({item,column});
  }
  const columns=ends.length;
  for(const {item,column} of placed)result.push({...item,column,columns});
 };

 for(const item of sorted){
  if(group.length&&item.startMinute>=groupEnd){finishGroup();group=[];groupEnd=-Infinity}
  group.push(item);
  groupEnd=Math.max(groupEnd,item.endMinute);
 }
 finishGroup();
 return result;
}
