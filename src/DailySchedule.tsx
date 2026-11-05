import {useEffect,useLayoutEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,Clock3,X} from 'lucide-react';
import {layoutDayIntervals} from './dailyLayout';

type DailyTask={id:string,title:string,start:string,duration:number,color:string,status:string,priority:string,project:string};
type DailyBlock={id:string,title:string,start:string,end:string,color:string,notes:string};
type ScheduleEntry={
 id:string,sourceId:string,kind:'task'|'block',title:string,color:string,status:string,
 startMs:number,endMs:number,startMinute:number,endMinute:number,clippedStart:boolean,clippedEnd:boolean,
 project:string
};
type PositionedEntry=ScheduleEntry&{column:number,columns:number};
type Draft={id:string,startMs:number,endMs:number};
type ScrollIntent='initial'|'today'|'start'|'end'|'keep';

const PIXELS_PER_MINUTE=1.2;
const MINUTE_MS=60000;
const MIN_DURATION=15*MINUTE_MS;
const midnight=(value:Date)=>new Date(value.getFullYear(),value.getMonth(),value.getDate());
const nextDay=(value:Date,delta=1)=>{const result=midnight(value);result.setDate(result.getDate()+delta);return result};
const sameDay=(a:Date,b:Date)=>midnight(a).getTime()===midnight(b).getTime();
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const minuteOfDay=(value:number,startMs:number,endMs:number)=>{
 if(value<=startMs)return 0;
 if(value>=endMs)return 1440;
 const time=new Date(value);
 return time.getHours()*60+time.getMinutes()+time.getSeconds()/60;
};
const timeLabel=(value:number)=>new Date(value).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
const hourLabel=(hour:number)=>hour===24?'12 AM':new Date(2026,0,1,hour).toLocaleTimeString([],{hour:'numeric'});

export default function DailySchedule({
 initialDate,now,tasks,timeBlocks,onClose,onEditTask,onEditBlock,onChangeTask,onChangeBlock
}:{
 initialDate:Date,now:Date,tasks:DailyTask[],timeBlocks:DailyBlock[],
 onClose:()=>void,onEditTask:(id:string)=>void,onEditBlock:(id:string)=>void,
 onChangeTask:(id:string,start:Date,duration:number)=>void,
 onChangeBlock:(id:string,start:Date,end:Date)=>void
}){
 const [date,setDate]=useState(()=>midnight(initialDate));
 const [draft,setDraft]=useState<Draft|null>(null);
 const [gridWidth,setGridWidth]=useState(850);
 const scrollRef=useRef<HTMLDivElement>(null);
 const gridRef=useRef<HTMLDivElement>(null);
 const intentRef=useRef<ScrollIntent>('initial');
 const keptScrollRef=useRef(0);
 const lastChangeRef=useRef(0);
 const dragCleanupRef=useRef<(()=>void)|null>(null);
 const dayStart=midnight(date).getTime(),dayEnd=nextDay(date).getTime();

 const entries=useMemo(()=>{
  const collected:ScheduleEntry[]=[];
  const add=(id:string,sourceId:string,kind:'task'|'block',title:string,color:string,status:string,project:string,baseStart:number,baseEnd:number)=>{
   const startMs=draft?.id===id?draft.startMs:baseStart;
   const endMs=draft?.id===id?draft.endMs:baseEnd;
   if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<=dayStart||startMs>=dayEnd)return;
   const visibleStart=Math.max(startMs,dayStart),visibleEnd=Math.min(endMs,dayEnd);
   collected.push({
    id,sourceId,kind,title,color,status,project,startMs,endMs,
    startMinute:minuteOfDay(visibleStart,dayStart,dayEnd),
    endMinute:Math.max(minuteOfDay(visibleStart,dayStart,dayEnd)+1,minuteOfDay(visibleEnd,dayStart,dayEnd)),
    clippedStart:startMs<dayStart,clippedEnd:endMs>dayEnd
   });
  };
  for(const task of tasks){
   const start=new Date(task.start).getTime();
   add('task:'+task.id,task.id,'task',task.title,task.color,task.status,task.project,start,start+task.duration*MINUTE_MS);
  }
  for(const block of timeBlocks){
   add('block:'+block.id,block.id,'block',block.title,block.color,'Reserved','',new Date(block.start).getTime(),new Date(block.end).getTime());
  }
  return layoutDayIntervals(collected);
 },[tasks,timeBlocks,dayStart,dayEnd,draft]);

 const countTasks=entries.filter(entry=>entry.kind==='task').length;
 const countBlocks=entries.filter(entry=>entry.kind==='block').length;
 const maxColumns=Math.max(1,...entries.map(entry=>entry.columns));
 const isToday=sameDay(date,now);
 const nowMinute=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;

 const setScroll=(intent:ScrollIntent)=>{
  const scroll=scrollRef.current;if(!scroll)return;
  const maxScroll=Math.max(0,scroll.scrollHeight-scroll.clientHeight);
  if(intent==='start')scroll.scrollTop=0;
  else if(intent==='end')scroll.scrollTop=maxScroll;
  else if(intent==='keep')scroll.scrollTop=clamp(keptScrollRef.current,0,maxScroll);
  else{
   const reference=isToday?nowMinute:9*60;
   scroll.scrollTop=clamp(reference*PIXELS_PER_MINUTE-scroll.clientHeight*.36,0,maxScroll);
  }
 };
 useLayoutEffect(()=>{
  // The new day's list is laid out before restoring the scroll position.
  const intent=intentRef.current;
  setScroll(intent);
  intentRef.current='keep';
 },[date]);
 useLayoutEffect(()=>{
  if(!gridRef.current)return;
  const observer=new ResizeObserver(entries=>setGridWidth(entries[0].contentRect.width));
  observer.observe(gridRef.current);
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};
  window.addEventListener('keydown',escape);
  return()=>window.removeEventListener('keydown',escape);
 },[onClose]);
 useEffect(()=>()=>dragCleanupRef.current?.(),[]);

 const changeDay=(delta:number,intent:ScrollIntent='keep')=>{
  const scroll=scrollRef.current;
  keptScrollRef.current=scroll?.scrollTop||0;
  intentRef.current=intent;
  lastChangeRef.current=Date.now();
  setDraft(null);
  setDate(current=>nextDay(current,delta));
 };
 const jumpToday=()=>{
  intentRef.current='today';
  lastChangeRef.current=Date.now();
  if(sameDay(date,now))setScroll('today');
  else setDate(midnight(now));
 };
 const scrollAcrossMidnight=(event:React.WheelEvent<HTMLDivElement>)=>{
  const scroll=event.currentTarget;
  if(Date.now()-lastChangeRef.current<650||dragCleanupRef.current)return;
  const remaining=scroll.scrollHeight-scroll.clientHeight-scroll.scrollTop;
  if(event.deltaY>0&&remaining<=2)changeDay(1,'start');
  if(event.deltaY<0&&scroll.scrollTop<=2)changeDay(-1,'end');
 };

 const commitChange=(entry:PositionedEntry,nextStart:number,nextEnd:number)=>{
  if(nextStart===entry.startMs&&nextEnd===entry.endMs)return;
  if(entry.kind==='task')onChangeTask(entry.sourceId,new Date(nextStart),Math.round((nextEnd-nextStart)/MINUTE_MS));
  else onChangeBlock(entry.sourceId,new Date(nextStart),new Date(nextEnd));
 };
 const adjustedEdge=(entry:PositionedEntry,edge:'start'|'end',deltaMinutes:number)=>{
  const delta=deltaMinutes*MINUTE_MS;
  if(edge==='start')return {
   startMs:clamp(entry.startMs+delta,dayStart,entry.endMs-MIN_DURATION),
   endMs:entry.endMs
  };
  return {
   startMs:entry.startMs,
   endMs:clamp(entry.endMs+delta,entry.startMs+MIN_DURATION,dayEnd)
  };
 };
 const beginResize=(event:ReactPointerEvent<HTMLButtonElement>,entry:PositionedEntry,edge:'start'|'end')=>{
  event.preventDefault();event.stopPropagation();
  if(dragCleanupRef.current)dragCleanupRef.current();
  const scroll=scrollRef.current;if(!scroll)return;
  const initialY=event.clientY,initialScroll=scroll.scrollTop;
  let pointerY=event.clientY,latest={startMs:entry.startMs,endMs:entry.endMs};
  const updatePreview=()=>{
   const distance=pointerY-initialY+scroll.scrollTop-initialScroll;
   const deltaMinutes=Math.round(distance/(PIXELS_PER_MINUTE*15))*15;
   latest=adjustedEdge(entry,edge,deltaMinutes);
   setDraft({id:entry.id,...latest});
  };
  const move=(ev:PointerEvent)=>{pointerY=ev.clientY;updatePreview()};
  const timer=window.setInterval(()=>{
   const rect=scroll.getBoundingClientRect();
   if(pointerY<rect.top+34)scroll.scrollTop-=15;
   else if(pointerY>rect.bottom-34)scroll.scrollTop+=15;
   updatePreview();
  },35);
  const cleanup=()=>{
   window.removeEventListener('pointermove',move);
   window.removeEventListener('pointerup',finish);
   window.removeEventListener('pointercancel',cancel);
   window.clearInterval(timer);
   dragCleanupRef.current=null;
  };
  const finish=()=>{cleanup();setDraft(null);commitChange(entry,latest.startMs,latest.endMs)};
  const cancel=()=>{cleanup();setDraft(null)};
  dragCleanupRef.current=cancel;
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',finish,{once:true});
  window.addEventListener('pointercancel',cancel,{once:true});
 };
 const keyboardResize=(event:React.KeyboardEvent<HTMLButtonElement>,entry:PositionedEntry,edge:'start'|'end')=>{
  if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;
  event.preventDefault();event.stopPropagation();
  const {startMs,endMs}=adjustedEdge(entry,edge,event.key==='ArrowDown'?15:-15);
  commitChange(entry,startMs,endMs);
 };

 return <div className="overlay daily-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="daily-schedule" role="dialog" aria-modal="true" aria-labelledby="daily-schedule-title">
   <header className="daily-schedule-header">
    <div className="daily-schedule-heading">
     <span><Clock3 size={15}/> DAILY SCHEDULE</span>
     <h2 id="daily-schedule-title">{date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</h2>
     <small>{countTasks} task{countTasks===1?'':'s'}{countBlocks>0?` · ${countBlocks} reserved block${countBlocks===1?'':'s'}`:''}</small>
    </div>
    <div className="daily-schedule-actions">
     <button onClick={()=>changeDay(-1)} title="Previous day" aria-label="Previous day"><ChevronLeft size={18}/></button>
     <button className="daily-today" onClick={jumpToday}><CalendarDays size={15}/> Today</button>
     <button onClick={()=>changeDay(1)} title="Next day" aria-label="Next day"><ChevronRight size={18}/></button>
     <button className="daily-close" onClick={onClose} aria-label="Close daily schedule"><X size={19}/></button>
    </div>
   </header>
   <div className="daily-schedule-hint">Drag the top or bottom edge to adjust time in 15-minute steps. Click a task to edit it. Scroll past midnight to change days.</div>
   <div className="daily-schedule-scroll" ref={scrollRef} onWheel={scrollAcrossMidnight}>
    <div className="daily-schedule-grid" ref={gridRef} style={{height:1440*PIXELS_PER_MINUTE,minWidth:Math.max(0,maxColumns*115+78)}}>
     {Array.from({length:25},(_,hour)=><div key={hour} className="daily-hour-line" style={{top:hour*60*PIXELS_PER_MINUTE}}><span>{hourLabel(hour)}</span></div>)}
     {Array.from({length:24},(_,hour)=><div key={'half-'+hour} className="daily-half-line" style={{top:(hour*60+30)*PIXELS_PER_MINUTE}}/>)}
     {entries.map(entry=>{
      const short=entry.endMinute-entry.startMinute<43;
      const top=entry.startMinute*PIXELS_PER_MINUTE;
      const height=Math.max(12,(entry.endMinute-entry.startMinute)*PIXELS_PER_MINUTE);
      const slotWidth=clamp((gridWidth-78)/entry.columns,115,205);
      const left=78+slotWidth*entry.column+3;
      const width=slotWidth-6;
      return <div
       key={entry.id}
       className={'daily-schedule-event'+(entry.kind==='block'?' daily-reserved':'')+(entry.status==='Done'?' daily-done':'')+(short?' daily-short':'')}
       style={{top,height,left,width,backgroundColor:entry.color+'2b',borderColor:entry.color}}
       title={`${entry.title} · ${timeLabel(entry.startMs)}–${timeLabel(entry.endMs)} · Click to edit`}
       onClick={()=>entry.kind==='task'?onEditTask(entry.sourceId):onEditBlock(entry.sourceId)}
      >
       {!entry.clippedStart&&<button className="daily-resize-handle daily-resize-start" aria-label={`Adjust start of ${entry.title}`} title="Drag to change start" onPointerDown={event=>beginResize(event,entry,'start')} onKeyDown={event=>keyboardResize(event,entry,'start')} onClick={event=>event.stopPropagation()}/>}
       <div className="daily-event-title">{entry.title}</div>
       {!short&&<div className="daily-event-time">{timeLabel(entry.startMs)}–{timeLabel(entry.endMs)}{entry.clippedStart||entry.clippedEnd?' ↗':''}</div>}
       {!short&&entry.project&&<small>{entry.project}</small>}
       {!entry.clippedEnd&&<button className="daily-resize-handle daily-resize-end" aria-label={`Adjust end of ${entry.title}`} title="Drag to change end" onPointerDown={event=>beginResize(event,entry,'end')} onKeyDown={event=>keyboardResize(event,entry,'end')} onClick={event=>event.stopPropagation()}/>}
      </div>
     })}
     {isToday&&<div className="daily-now-line" style={{top:nowMinute*PIXELS_PER_MINUTE}}><span>Now {timeLabel(now.getTime())}</span></div>}
     {entries.length===0&&<div className="daily-empty"><CalendarDays size={28}/><strong>No scheduled tasks today</strong><span>Use the main canvas to plan your next experiment.</span></div>}
    </div>
   </div>
  </section>
 </div>;
}
