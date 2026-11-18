export type DurationAnchor='start'|'end';
export const durationParts=(totalMinutes:number)=>{
 const total=Math.max(0,Math.round(Number(totalMinutes)||0));
 return {hours:Math.floor(total/60),minutes:total%60};
};
export const taskEnd=(start:string,duration:number):Date|null=>{
 const initial=new Date(start).getTime();
 return Number.isFinite(initial)&&Number.isFinite(duration)?new Date(initial+duration*60000):null;
};
/** Preserve the selected boundary when the task duration changes. */
export function withDuration<T extends {start:string,duration:number}>(task:T,nextDuration:number,anchor:DurationAnchor,formatLocal:(date:Date)=>string):T{
 const duration=Math.max(0,Math.round(Number(nextDuration)||0));
 const end=anchor==='end'?taskEnd(task.start,task.duration):null;
 return {...task,duration,start:end?formatLocal(new Date(end.getTime()-duration*60000)):task.start};
}
