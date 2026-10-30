export const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
// One-click outcome cycle: planned/in-progress/stopped → done → failed → planned.
export const nextTaskStatus=(status:string)=>status==='Done'?'Failed':status==='Failed'?'Planned':'Done';
/** Replace one directed link A→B with A→C and C→B, leaving other links intact. */
export function splitConnection<T extends {id:string,from:string,to:string,dashed:boolean}>(edges:readonly T[],edgeId:string,insertedId:string,firstId:string,secondId:string):T[]{
 const original=edges.find(edge=>edge.id===edgeId);
 if(!original)throw new Error('Connection no longer exists');
 if(!insertedId||insertedId===original.from||insertedId===original.to||firstId===secondId)throw new Error('Invalid inserted task or connection IDs');
 return edges.flatMap(edge=>edge.id===edgeId?[
  {...edge,id:firstId,to:insertedId},
  {...edge,id:secondId,from:insertedId},
 ]:[edge]);
}
export function groupMovementIds(tasks:{id:string,groupId?:string}[],selected:string[]):string[]{
 const selectedSet=new Set(selected);
 const groupIds=new Set(tasks.filter(t=>selectedSet.has(t.id)&&t.groupId).map(t=>t.groupId));
 return tasks.filter(t=>selectedSet.has(t.id)||(t.groupId&&groupIds.has(t.groupId))).map(t=>t.id);
}
/** Limit the shared drag offset using the TOPMOST moving task, not the grabbed one.
 * Already out-of-bounds positions are never made worse or snapped unexpectedly. */
export function boundedGroupDragY(tasks:readonly {id:string,y:number}[],movingIds:ReadonlySet<string>,requestedDy:number,canvasTopY:number):number{
 const positions=tasks.filter(task=>movingIds.has(task.id)).map(task=>task.y);
 if(!positions.length)return requestedDy;
 const topmost=Math.min(...positions);
 return Math.max(requestedDy,Math.min(canvasTopY,topmost)-topmost);
}
/** Smoothly scroll the timeline when a dragged pointer approaches its upper or lower edge. */
export function verticalEdgeScrollSpeed(pointerY:number,top:number,bottom:number,threshold=72,maxStep=19):number{
 if(pointerY<top+threshold)return -Math.min(maxStep,Math.max(0,(top+threshold-pointerY)/threshold*maxStep));
 if(pointerY>bottom-threshold)return Math.min(maxStep,Math.max(0,(pointerY-(bottom-threshold))/threshold*maxStep));
 return 0;
}
export function validData(d:any):boolean {
 if(!d||!Array.isArray(d.tasks)||!Array.isArray(d.edges)||!Array.isArray(d.questions)||typeof d.notes!=='string')return false;
 // Optional for compatibility with planner databases saved before time blocks existed.
 if(d.timeBlocks!==undefined&&(!Array.isArray(d.timeBlocks)||!d.timeBlocks.every((b:any)=>b&&typeof b.id==='string'&&b.id.length>0&&typeof b.title==='string'&&typeof b.notes==='string'&&typeof b.start==='string'&&typeof b.end==='string'&&Number.isFinite(new Date(b.start).getTime())&&Number.isFinite(new Date(b.end).getTime())&&new Date(b.end).getTime()>new Date(b.start).getTime()&&/^#[0-9a-f]{6}$/i.test(b.color))||new Set(d.timeBlocks.map((b:any)=>b.id)).size!==d.timeBlocks.length))return false;
 if(d.tags!==undefined&&(!Array.isArray(d.tags)||!d.tags.every((t:any)=>typeof t.id==='string'&&typeof t.text==='string'&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&
   // Attached labels don't use x/y coordinates; new ones intentionally start at 0,0.
   (typeof t.taskId==='string'||(t.x>=0&&t.y>=80))&&/^#[0-9a-f]{6}$/i.test(t.color)&&['flag','pill','diamond'].includes(t.shape))))return false;
 const ids=new Set<string>();
 for(const t of d.tasks){if(!t||typeof t.id!=='string'||ids.has(t.id)||!['title','start','color','project','priority','status','notes'].every(k=>typeof t[k]==='string')||(t.groupId!==undefined&&(typeof t.groupId!=='string'||!t.groupId))||!Number.isFinite(new Date(t.start).getTime())||!Number.isFinite(t.duration)||t.duration<15||!Number.isFinite(t.prep)||t.prep<0||!Number.isFinite(t.y)||t.y < -50000||!Number.isFinite(t.height)||t.height<44||!/^#[0-9a-f]{6}$/i.test(t.color)||!Array.isArray(t.checklist)||!t.checklist.every((c:any)=>typeof c.text==='string'&&typeof c.done==='boolean'))return false;ids.add(t.id)}
 return (d.tags===undefined||d.tags.every((tag:any)=>tag.taskId===undefined||typeof tag.taskId==='string'&&ids.has(tag.taskId)))&&d.edges.every((e:any)=>typeof e.id==='string'&&ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to&&typeof e.dashed==='boolean')&&d.questions.every((q:any)=>typeof q.id==='string'&&typeof q.text==='string'&&typeof q.done==='boolean'&&(q.pinned===undefined||typeof q.pinned==='boolean')&&
   (q.at===undefined||(typeof q.at==='string'&&Number.isFinite(new Date(q.at).getTime())))&&
   (q.y===undefined||(Number.isFinite(q.y)&&q.y>=-50000))&&
   (q.color===undefined||/^#[0-9a-f]{6}$/i.test(q.color)));
}
export function reaches(edges:{from:string,to:string}[],from:string,to:string):boolean {const seen=new Set<string>(),todo=[from];while(todo.length){const id=todo.pop()!;if(id===to)return true;if(seen.has(id))continue;seen.add(id);edges.filter(e=>e.from===id).forEach(e=>todo.push(e.to))}return false}
export const escapeHTML=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function recordHTML(data:any,week:Date){
 const esc=escapeHTML,origin=new Date(week);origin.setHours(0,0,0,0);const days=7,dw=240;
 const x=(v:string|Date)=>{const d=new Date(v),mid=new Date(d);mid.setHours(0,0,0,0);return Math.round((mid.getTime()-origin.getTime())/86400000)*dw+(d.getHours()+d.getMinutes()/60)*10};
 const height=Math.max(500,...data.tasks.map((t:any)=>t.y+t.height+140),...data.questions.map((q:any)=>(q.y||0)+180));
 const tasks=data.tasks.filter((t:any)=>x(t.start)+t.duration/6>=0&&x(t.start)<days*dw);
 const timeBlocks=(data.timeBlocks||[]).filter((b:any)=>x(b.end)>0&&x(b.start)<days*dw);
 const reserved=timeBlocks.map((b:any)=>`<g><rect x="${x(b.start)}" y="58" width="${Math.max(1,x(b.end)-x(b.start))}" height="${height-58}" fill="${b.color}" fill-opacity=".10"/><path d="M${x(b.start)},58 V${height} M${x(b.end)},58 V${height}" stroke="${b.color}" stroke-opacity=".4" stroke-width="1.5"/><text x="${x(b.start)+4}" y="74" font-size="11" font-weight="bold" fill="${b.color}">${esc(b.title.slice(0,30))}</text></g>`).join('');
 const sticky=data.questions.filter((q:any)=>q.pinned!==false&&q.at&&Number.isFinite(new Date(q.at).getTime())&&x(q.at)>=0&&x(q.at)<days*dw).map((q:any)=>`<g><rect x="${x(q.at)}" y="${(q.y||0)+90}" width="150" height="55" rx="7" fill="${q.color||'#ffefb1'}" stroke="#b19c6a"/><text x="${x(q.at)+8}" y="${(q.y||0)+108}" font-size="10" fill="#6e6549">ASK / DISCUSS</text><text x="${x(q.at)+8}" y="${(q.y||0)+130}" font-size="11">${esc(q.text.slice(0,26))}${q.text.length>26?'…':''}</text></g>`).join('');
 const lines=data.edges.map((e:any)=>{const a=data.tasks.find((t:any)=>t.id===e.from),b=data.tasks.find((t:any)=>t.id===e.to);if(!a||!b)return '';return `<path d="M${x(a.start)+a.duration/6},${a.y+90+a.height/2} L${x(b.start)},${b.y+90+b.height/2}" stroke="${a.color}" stroke-width="2" fill="none" ${e.dashed?'stroke-dasharray="6 5"':''}/>`}).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${days*dw}" height="${height}" role="img" aria-label="Saved weekly timeline">${Array.from({length:days},(_,i)=>{const d=new Date(origin);d.setDate(d.getDate()+i);return `<rect x="${i*dw}" y="0" width="${dw}" height="${height}" fill="${i%2?'#f5f7f2':'#fff'}" stroke="#ddd"/><text x="${i*dw+12}" y="25">${esc(d.toDateString())}</text><text x="${i*dw+12}" y="47" font-size="10">00:00             08:00             16:00</text>`}).join('')}${reserved}${lines}${tasks.map((t:any)=>`<rect x="${x(t.start)-t.prep/6}" y="${t.y+90}" width="${t.prep/6}" height="${t.height}" fill="${t.color}" fill-opacity=".06" stroke="${t.color}" stroke-dasharray="5 4"/><rect x="${x(t.start)}" y="${t.y+90}" width="${Math.max(4,t.duration/6)}" height="${t.height}" fill="${t.color}" fill-opacity=".2" stroke="${t.color}"/><text x="${x(t.start)}" y="${t.y+82}" font-size="12">${esc(t.title)} · ${esc(t.status)}</text>`).join('')}${sticky}</svg>`;
 return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Vubio record ${dateKey(week)}</title><style>body{font:14px system-ui;color:#304637;padding:30px}table{border-collapse:collapse;width:100%}th,td{padding:12px;border:1px solid #ddd;text-align:left;vertical-align:top}pre{white-space:pre-wrap}.timeline{overflow:auto;border:1px solid #ddd}svg{font-family:system-ui}h2{margin-top:30px}</style><h1>Experiment planner · ${dateKey(week)}</h1><p>Captured ${new Date().toLocaleString()}. Timeline uses all 24 hours. The table preserves all tasks and connections across weeks.</p><div class="timeline">${svg}</div><h2>Reserved time</h2>${(data.timeBlocks||[]).map((b:any)=>`<p><strong>${esc(b.title)}</strong> · ${esc(b.start)}–${esc(b.end)}${b.notes?` · ${esc(b.notes)}`:''}</p>`).join('')}<h2>Tasks & connections</h2><table><tr><th>Task / project</th><th>Time</th><th>Outcome</th><th>Details</th><th>Next steps</th></tr>${data.tasks.map((t:any)=>`<tr><td>${esc(t.title)}<br>${esc(t.project)}</td><td>${esc(t.start)}<br>${t.duration} min · ${t.prep} min preparation</td><td>${esc(t.status)}</td><td><pre>${esc(t.notes)}</pre>${t.checklist.map((c:any)=>`<p>${c.done?'☑':'☐'} ${esc(c.text)}</p>`).join('')}</td><td>${data.edges.filter((e:any)=>e.from===t.id).map((e:any)=>`${e.dashed?'Potential: ':''}${esc(data.tasks.find((a:any)=>a.id===e.to)?.title||'')}`).join('<br>')}</td></tr>`).join('')}</table><h2>Scratchpad</h2><pre>${esc(data.notes)}</pre><h2>Ask & discuss</h2>${data.questions.map((q:any)=>`<p>${q.done?'☑':'☐'} ${esc(q.text)}</p>`).join('')}</html>`;
}
