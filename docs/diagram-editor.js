/* Temporary, browser-only diagram editor for selected planner tasks. No storage writes. */
(function(){
'use strict';
let serial=0;
const uid=()=> 'dg'+(++serial)+'_'+Math.random().toString(36).slice(2,7);
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const num=(value, fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function friendly(date){const d=new Date(date);return isNaN(+d)?'':d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});}
function buildModel(input){
 const taskList=Array.isArray(input&&input.tasks)?input.tasks:[];
 const seen=new Set(),tasks=taskList.filter(t=>t&&t.id&&!seen.has(t.id)&&seen.add(t.id));
 const valid=new Set(tasks.map(t=>t.id));
 const edges=(Array.isArray(input&&input.edges)?input.edges:[]).filter(e=>e&&valid.has(e.from)&&valid.has(e.to)&&e.from!==e.to);
 const adjacent=new Map(tasks.map(t=>[t.id,[]]));
 edges.forEach(e=>{adjacent.get(e.from).push(e.to);adjacent.get(e.to).push(e.from);});
 const byId=new Map(tasks.map(t=>[t.id,t])),visited=new Set(),components=[];
 const time=t=>Number(new Date(t.start))||0;
 for(const t of tasks.slice().sort((a,b)=>time(a)-time(b)||num(a.y)-num(b.y))){
  if(visited.has(t.id))continue;
  const stack=[t.id],group=[];visited.add(t.id);
  while(stack.length){const id=stack.pop();group.push(byId.get(id));for(const n of adjacent.get(id))if(!visited.has(n)){visited.add(n);stack.push(n);}}
  components.push(group.sort((a,b)=>time(a)-time(b)||num(a.y)-num(b.y)));
 }
 const objects=[],nodeMap=new Map();
 let groupTop=76,maxX=920;
 for(let g=0;g<components.length;g++){
  const group=components[g],ids=new Set(group.map(t=>t.id));
  const indegree=new Map(group.map(t=>[t.id,0])),next=new Map(group.map(t=>[t.id,[]])),layer=new Map(group.map(t=>[t.id,0]));
  edges.forEach(e=>{if(ids.has(e.from)&&ids.has(e.to)){indegree.set(e.to,indegree.get(e.to)+1);next.get(e.from).push(e.to);}});
  const queue=group.filter(t=>indegree.get(t.id)===0).map(t=>t.id),done=new Set();
  for(let i=0;i<queue.length;i++){let id=queue[i];done.add(id);for(const n of next.get(id)){layer.set(n,Math.max(layer.get(n),layer.get(id)+1));indegree.set(n,indegree.get(n)-1);if(indegree.get(n)===0)queue.push(n);}}
  for(const task of group)if(!done.has(task.id))layer.set(task.id,Math.floor(group.indexOf(task)/2));
  const columns=new Map();
  group.forEach(t=>{const depth=clamp(layer.get(t.id),0,12);if(!columns.has(depth))columns.set(depth,[]);columns.get(depth).push(t);});
  const maxPerColumn=Math.max(1,...Array.from(columns.values()).map(arr=>arr.length));
  if(components.length>1)objects.push({id:uid(),type:'text',x:62,y:groupTop-22,text:'Workflow '+(g+1),fontSize:14,font:'Arial',bold:true,italic:false,align:'start',color:'#555555'});
  for(const [depth,column] of columns){
   column.forEach((task,row)=>{
    const x=64+depth*255,y=groupTop+row*133,id=uid();
    nodeMap.set(task.id,id);
    objects.push({id,type:'rect',x,y,w:204,h:91,fill:'#ffffff',stroke:'#303030',strokeWidth:1.5,dash:false,taskId:task.id});
    objects.push({id:uid(),type:'text',parent:id,x:x+12,y:y+24,text:String(task.title||'Untitled task'),font:'Arial',fontSize:15,bold:true,italic:false,align:'start',color:'#191919'});
    const start=new Date(task.start),end=new Date(start.getTime()+Math.max(0,num(task.duration))*60000);
    objects.push({id:uid(),type:'text',parent:id,x:x+12,y:y+52,text:friendly(start),font:'Arial',fontSize:11,bold:false,italic:false,align:'start',color:'#454545'});
    objects.push({id:uid(),type:'text',parent:id,x:x+192,y:y+52,text:friendly(end),font:'Arial',fontSize:11,bold:false,italic:false,align:'end',color:'#454545'});
    const minutes=Math.max(0,Math.round(num(task.duration))),hours=Math.floor(minutes/60),remainder=minutes%60;
    const duration=(hours?hours+' h ':'')+(remainder?remainder+' min':'');
    objects.push({id:uid(),type:'text',parent:id,x:x+102,y:y+78,text:duration||'0 min',font:'Arial',fontSize:10,bold:false,italic:false,align:'middle',color:'#777777'});
    maxX=Math.max(maxX,x+240);
   });
  }
  groupTop+=Math.max(1,maxPerColumn)*133+83;
 }
 edges.forEach(e=>{if(nodeMap.has(e.from)&&nodeMap.has(e.to))objects.unshift({id:uid(),type:'connector',from:nodeMap.get(e.from),to:nodeMap.get(e.to),stroke:'#222222',strokeWidth:1.6,dash:!!e.dashed,arrow:true});});
 return {items:objects,width:Math.max(940,maxX+55),height:Math.max(560,groupTop+20),count:tasks.length,edgeCount:edges.length};
}
const rectOf=o=>{
 if(o.type==='rect'||o.type==='ellipse')return {x:o.x,y:o.y,w:o.w,h:o.h};
 if(o.type==='text')return {x:o.x-(o.align==='end'?String(o.text).length*o.fontSize*.47:o.align==='middle'?String(o.text).length*o.fontSize*.24:0),y:o.y-o.fontSize,w:Math.max(20,String(o.text).length*o.fontSize*.52),h:o.fontSize*1.4};
 if(o.type==='line')return {x:Math.min(o.x1,o.x2),y:Math.min(o.y1,o.y2),w:Math.abs(o.x2-o.x1),h:Math.abs(o.y2-o.y1)};
 return {x:0,y:0,w:0,h:0};
};
const marker='<defs><marker id="dg-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L8 4 L0 8 z" fill="#222222"/></marker></defs>';
function open(input){
 if(document.querySelector('.dg-overlay'))return;
 const original=buildModel(input);
 if(!original.count)return;
 let items=clone(original.items),width=original.width,height=original.height,zoom=1,selected=[],tool='select',draw=null,history=[],future=[],grid=false,dirty=false,connectorFrom=null,clip=[];
 const oldOverflow=document.body.style.overflow;
 const root=document.createElement('div');root.className='dg-overlay';
 root.innerHTML='<div class="dg-dialog" role="dialog" aria-modal="true" aria-label="Experiment diagram editor">'+
 '<header class="dg-head"><div><strong>Make a diagram</strong><small>Temporary editor · '+original.count+' tasks · '+original.edgeCount+' connections · Nothing changes in your planner</small></div>'+
 '<div class="dg-head-actions"><button type="button" data-action="reset" title="Rebuild layout from selected tasks">Auto-layout</button><button type="button" data-action="close" class="dg-close" aria-label="Close diagram editor">✕</button></div></header>'+
 '<div class="dg-toolbar" role="toolbar" aria-label="Diagram tools">'+
 '<div class="dg-tools">'+
 '<button data-tool="select" title="Select and move (V)">Select</button><button data-tool="text" title="Add text (T)">Text</button>'+
 '<button data-tool="rect" title="Draw rectangle (R)">Rectangle</button><button data-tool="ellipse" title="Draw ellipse (E)">Ellipse</button>'+
 '<button data-tool="line" title="Draw line (L)">Line</button><button data-tool="arrow" title="Draw arrow (A)">Arrow</button>'+
 '<button data-tool="connector" title="Click two boxes to add a live connector (C)">Connect boxes</button></div>'+
 '<span class="dg-divider"></span>'+
 '<button data-action="undo" title="Undo (Ctrl+Z)">↶ Undo</button><button data-action="redo" title="Redo (Ctrl+Y)">↷ Redo</button>'+
 '<button data-action="duplicate" title="Duplicate (Ctrl+D)">Duplicate</button><button data-action="delete" title="Delete selection">Delete</button>'+
 '<button data-action="front" title="Bring to front">Front</button><button data-action="back" title="Send to back">Back</button>'+
 '<span class="dg-divider"></span>'+
 '<button data-action="grid" title="Show or hide alignment grid">Grid</button><button data-action="zoomout" title="Zoom out">−</button><span class="dg-zoom">100%</span><button data-action="zoomin" title="Zoom in">+</button><button data-action="fit" title="Fit the page">Fit</button>'+
 '</div>'+
 '<div class="dg-main"><div class="dg-workspace"><div class="dg-scroll"><div class="dg-stage"><svg class="dg-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Editable diagram"></svg></div></div></div>'+
 '<aside class="dg-inspector"><strong>Format & arrange</strong><div class="dg-inspector-body"></div>'+
 '<div class="dg-arrange"><small>Align selected objects</small><div><button data-action="left">Left</button><button data-action="center">Center</button><button data-action="right">Right</button><button data-action="top">Top</button><button data-action="middle">Middle</button><button data-action="bottom">Bottom</button><button data-action="distributeH">Space H</button><button data-action="distributeV">Space V</button></div></div></aside></div>'+
 '<footer class="dg-footer"><span class="dg-status" role="status">Select an object to move, resize or edit it. Double-click text to type directly.</span>'+
 '<div><button data-action="copysvg" title="Copy SVG markup to clipboard">Copy SVG</button><button data-action="copypng" title="Copy PNG image to clipboard">Copy image</button>'+
 '<button data-action="svg">Download SVG</button><button data-action="png" class="dg-primary">Download PNG</button></div></footer></div>';
 document.body.appendChild(root);document.body.style.overflow='hidden';
 const $=q=>root.querySelector(q),svg=$('.dg-svg'),stage=$('.dg-stage'),viewport=$('.dg-scroll'),status=$('.dg-status'),inspector=$('.dg-inspector-body');
 const item=id=>items.find(o=>o.id===id);
 const say=text=>{status.textContent=text;};
 function checkpoint(){history.push(clone(items));if(history.length>50)history.shift();future=[];dirty=true;}
 function close(){if(dirty&&!confirm('Close the diagram editor? Changes in this popup are not saved. Export first if needed.'))return;document.body.style.overflow=oldOverflow;window.removeEventListener('keydown',keyHandler,true);root.remove();}
 function setTool(name){tool=name;connectorFrom=null;draw=null;root.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===name));say(name==='connector'?'Click a first box, then the box to connect.':name==='select'?'Drag objects, resize shapes or select several items with Shift-click.':'Click or drag on the canvas to add '+name+'.');}
 function bounds(){return {width,height};}
 function position(ev){const r=svg.getBoundingClientRect();return {x:(ev.clientX-r.left)*width/Math.max(1,r.width),y:(ev.clientY-r.top)*height/Math.max(1,r.height)};}
 function snap(n){return grid?Math.round(n/10)*10:n;}
 function moveObj(o,dx,dy){
  if(o.type==='line'){o.x1+=dx;o.x2+=dx;o.y1+=dy;o.y2+=dy;}
  else if(o.x!==undefined){o.x+=dx;o.y+=dy;}
 }
 function select(ids){selected=Array.from(new Set(ids));render();renderInspector();}
 function linkPath(o){
  const a=item(o.from),b=item(o.to);if(!a||!b||!('w' in a)||!('w' in b))return '';
  const right=a.x+a.w,left=b.x,y1=clamp(b.y+b.h/2,a.y+12,a.y+a.h-12),y2=b.y+b.h/2;
  if(left>=right){const handle=Math.min(90,(left-right)*.44);return 'M'+right+' '+y1+' C'+(right+handle)+' '+y1+' '+(left-handle)+' '+y2+' '+left+' '+y2;}
  const x1=a.x+a.w/2,x2=b.x+b.w/2;return 'M'+x1+' '+(a.y+a.h)+' C'+x1+' '+(a.y+a.h+42)+' '+x2+' '+(b.y-42)+' '+x2+' '+b.y;
 }
 function lines(o){
  const y=num(o.y),rows=String(o.text||'').split('\n');return rows.map((row,i)=>'<tspan x="'+num(o.x)+'" dy="'+(i===0?0:num(o.fontSize,14)*1.2)+'">'+esc(row)+'</tspan>').join('');
 }
 function objectSvg(o,exporting){
  const attr=' data-diagram-id="'+esc(o.id)+'"';
  if(o.type==='rect'||o.type==='ellipse'){
   const common=' fill="'+esc(o.fill||'#ffffff')+'" stroke="'+esc(o.stroke||'#222222')+'" stroke-width="'+num(o.strokeWidth,1.5)+'"'+(o.dash?' stroke-dasharray="6 4"':'')+(!exporting?attr:'');
   if(o.type==='rect')return '<rect x="'+o.x+'" y="'+o.y+'" width="'+o.w+'" height="'+o.h+'" rx="3"'+common+'/>';
   return '<ellipse cx="'+(o.x+o.w/2)+'" cy="'+(o.y+o.h/2)+'" rx="'+o.w/2+'" ry="'+o.h/2+'"'+common+'/>';
  }
  if(o.type==='text')return '<text x="'+o.x+'" y="'+o.y+'" font-family="'+esc(o.font||'Arial')+'" font-size="'+num(o.fontSize,14)+'" font-weight="'+(o.bold?'bold':'normal')+'" font-style="'+(o.italic?'italic':'normal')+'" text-anchor="'+(o.align||'start')+'" fill="'+esc(o.color||'#222222')+'" xml:space="preserve"'+(!exporting?attr:'')+'>'+lines(o)+'</text>';
  if(o.type==='line'||o.type==='connector'){
   const d=o.type==='connector'?linkPath(o):'M'+o.x1+' '+o.y1+' L'+o.x2+' '+o.y2;
   if(!d)return '';
   const markup='<path d="'+esc(d)+'" fill="none" stroke="'+esc(o.stroke||'#222222')+'" stroke-width="'+num(o.strokeWidth,1.6)+'" stroke-linecap="round" stroke-linejoin="round"'+(o.dash?' stroke-dasharray="6 4"':'')+(o.arrow?' marker-end="url(#dg-head)"':'')+(!exporting?attr:'')+'/>';
   return markup+(!exporting?'<path d="'+esc(d)+'" fill="none" stroke="transparent" stroke-width="16"'+attr+'/>':'');
  }
  return '';
 }
 function contents(exporting){
  let out=marker+'<rect width="'+width+'" height="'+height+'" fill="#ffffff"/>';
  if(grid&&!exporting)out+='<defs><pattern id="dg-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#e9e9e9" stroke-width="1"/></pattern></defs><rect width="'+width+'" height="'+height+'" fill="url(#dg-grid)" pointer-events="none"/>';
  const links=items.filter(o=>o.type==='connector'||o.type==='line');
  const other=items.filter(o=>o.type!=='connector'&&o.type!=='line');
  out+=links.concat(other).map(o=>objectSvg(o,exporting)).join('');
  if(!exporting){
   for(const id of selected){const o=item(id);if(!o||o.type==='connector')continue;let b=rectOf(o);
    out+='<rect x="'+(b.x-4)+'" y="'+(b.y-4)+'" width="'+Math.max(8,b.w+8)+'" height="'+Math.max(8,b.h+8)+'" fill="none" stroke="#2171b5" stroke-width="1.4" stroke-dasharray="4 3" pointer-events="none"/>';
    if(o.type==='rect'||o.type==='ellipse')out+='<rect x="'+(o.x+o.w-5)+'" y="'+(o.y+o.h-5)+'" width="11" height="11" fill="#ffffff" stroke="#2171b5" stroke-width="2" data-diagram-id="'+esc(id)+'" data-handle="resize" style="cursor:nwse-resize"/>';
   }
   if(draw&&draw.kind==='marquee'){let r=draw.r;out+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" fill="#388bc11c" stroke="#2474ac" stroke-width="1.3" stroke-dasharray="4 3" pointer-events="none"/>';}
  }
  return out;
 }
 function toSvg(){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'">'+contents(true)+'</svg>';}
 function render(){
  stage.style.width=(width*zoom)+'px';stage.style.height=(height*zoom)+'px';
  svg.style.width=(width*zoom)+'px';svg.style.height=(height*zoom)+'px';
  svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.innerHTML=contents(false);
  $('.dg-zoom').textContent=Math.round(zoom*100)+'%';
  root.querySelectorAll('[data-action="undo"]').forEach(b=>b.disabled=!history.length);
  root.querySelectorAll('[data-action="redo"]').forEach(b=>b.disabled=!future.length);
  root.querySelectorAll('[data-action="grid"]').forEach(b=>b.classList.toggle('active',grid));
 }
 function field(label,prop,value,type='text',options){
  const valueHtml=options?'<select data-prop="'+prop+'">'+options.map(v=>'<option value="'+esc(v[0])+'"'+(String(value)===String(v[0])?' selected':'')+'>'+esc(v[1])+'</option>').join('')+'</select>':
   type==='textarea'?'<textarea data-prop="'+prop+'" rows="4">'+esc(value)+'</textarea>':
   type==='checkbox'?'<input type="checkbox" data-prop="'+prop+'"'+(value?' checked':'')+'/>':
   '<input type="'+type+'" data-prop="'+prop+'" value="'+esc(value)+'"'+(type==='number'?' step="1"':'')+'/>';
  return '<label class="dg-field"><span>'+esc(label)+'</span>'+valueHtml+'</label>';
 }
 function renderInspector(){
  const os=selected.map(item).filter(Boolean);
  if(os.length!==1){
   inspector.innerHTML='<p class="dg-hint">'+(os.length?os.length+' objects selected. Use alignment, duplicate, delete, or arrow keys to arrange them.':'Click an item or Shift-click multiple. Double-click a text label to edit directly. Select boxes and drag the blue corner to resize.')+'</p><p class="dg-hint">Imported titles, start/end times and duration labels are independent text objects. Move them wherever you like.</p>';
   return;
  }
  const o=os[0];let body=field('X position','x',Math.round(num(o.x,o.x1)),'number')+field('Y position','y',Math.round(num(o.y,o.y1)),'number');
  if(o.type==='text'){
   body+=field('Text (fully editable)','text',o.text,'textarea')+field('Font','font',o.font,'select',[['Arial','Arial'],['Calibri','Calibri'],['Helvetica','Helvetica'],['Georgia','Georgia'],['Times New Roman','Times New Roman'],['Courier New','Courier New']]);
   body+=field('Size','fontSize',o.fontSize,'number')+field('Text color','color',o.color,'color');
   body+=field('Bold','bold',o.bold,'checkbox')+field('Italic','italic',o.italic,'checkbox');
   body+=field('Alignment','align',o.align,'select',[['start','Left'],['middle','Center'],['end','Right']]);
  }else if(o.type==='rect'||o.type==='ellipse'){
   body+=field('Width','w',Math.round(o.w),'number')+field('Height','h',Math.round(o.h),'number');
   body+=field('Fill','fill',o.fill,'color')+field('Border','stroke',o.stroke,'color');
   body+=field('Border width','strokeWidth',o.strokeWidth,'number')+field('Dashed','dash',o.dash,'checkbox');
  }else{
   body+='<p class="dg-hint">Simple black connector/line. Drag a free line to move it. Linked connectors follow boxes automatically.</p>';
   body+=field('Line color','stroke',o.stroke,'color')+field('Line width','strokeWidth',o.strokeWidth,'number');
   body+=field('Dashed','dash',o.dash,'checkbox')+field('Arrowhead','arrow',o.arrow,'checkbox');
  }
  inspector.innerHTML='<small class="dg-item-kind">'+esc(o.type.toUpperCase())+'</small><div class="dg-fields">'+body+'</div>';
 }
 function setProp(prop,value){
  const o=item(selected[0]);if(!o||selected.length!==1)return;
  if(!setProp._editing){checkpoint();setProp._editing=true;}
  const numbers=new Set(['x','y','x1','y1','w','h','fontSize','strokeWidth']);
  const bools=new Set(['bold','italic','dash','arrow']);
  if(numbers.has(prop))value=clamp(num(value),prop==='w'||prop==='h'?18:prop==='fontSize'?7:prop==='strokeWidth'?0.5:-10000,prop==='w'||prop==='h'?3000:10000);
  if(bools.has(prop))value=Boolean(value);
  if(prop==='x'&&o.type==='line')o.x1=value;
  else if(prop==='y'&&o.type==='line')o.y1=value;
  else o[prop]=value;
  render();
 }
 function findTarget(ev){const node=ev.target.closest('[data-diagram-id]');return node?item(node.getAttribute('data-diagram-id')):null;}
 function linkedChildren(ids){const all=new Set(ids);for(const id of ids){const o=item(id);if(o&&(o.type==='rect'||o.type==='ellipse'))items.forEach(t=>{if(t.parent===id)all.add(t.id);});}return [...all];}
 function startDrag(ev){
  if(ev.button!==0)return;
  const p=position(ev),target=findTarget(ev);
  if(tool==='connector'){
   if(target&&(target.type==='rect'||target.type==='ellipse')){
    if(!connectorFrom){connectorFrom=target.id;say('Choose the second box to connect.');}
    else if(connectorFrom!==target.id){checkpoint();items.unshift({id:uid(),type:'connector',from:connectorFrom,to:target.id,stroke:'#222222',strokeWidth:1.6,dash:false,arrow:true});connectorFrom=null;setTool('select');render();}
   }else say('Click a box, then another box to draw a connected arrow.');
   return;
  }
  if(tool==='text'){
   checkpoint();const o={id:uid(),type:'text',x:snap(p.x),y:snap(p.y),text:'New text',font:'Arial',fontSize:15,bold:false,italic:false,align:'start',color:'#222222'};items.push(o);selected=[o.id];setTool('select');render();renderInspector();inlineEdit(o);return;
  }
  if(tool==='rect'||tool==='ellipse'||tool==='line'||tool==='arrow'){
   checkpoint();const o=tool==='rect'||tool==='ellipse'?{id:uid(),type:tool,x:snap(p.x),y:snap(p.y),w:3,h:3,fill:'#ffffff',stroke:'#222222',strokeWidth:1.5,dash:false}:{id:uid(),type:'line',x1:snap(p.x),y1:snap(p.y),x2:snap(p.x)+2,y2:snap(p.y)+2,stroke:'#222222',strokeWidth:1.6,dash:false,arrow:tool==='arrow'};
   items.push(o);selected=[o.id];draw={kind:'create',id:o.id,start:p};svg.setPointerCapture(ev.pointerId);render();return;
  }
  if(tool!=='select')return;
  if(target){
   const id=target.id;
   if(ev.shiftKey){selected=selected.includes(id)?selected.filter(v=>v!==id):selected.concat(id);}
   else if(!selected.includes(id))selected=[id];
   if(!selected.includes(id)){render();renderInspector();return;}
   checkpoint();const moving=linkedChildren(selected),bases=new Map(moving.map(v=>[v,clone(item(v))]));
   draw={kind:ev.target.hasAttribute('data-handle')?'resize':'move',id,start:p,moving,bases};
   svg.setPointerCapture(ev.pointerId);render();renderInspector();
  }else{
   if(!ev.shiftKey)selected=[];
   draw={kind:'marquee',start:p,r:{x:p.x,y:p.y,w:0,h:0},prior:selected.slice()};
   svg.setPointerCapture(ev.pointerId);render();renderInspector();
  }
 }
 function dragMove(ev){
  if(!draw)return;const p=position(ev),dx=snap(p.x-draw.start.x),dy=snap(p.y-draw.start.y);
  if(draw.kind==='marquee'){
   draw.r={x:Math.min(draw.start.x,p.x),y:Math.min(draw.start.y,p.y),w:Math.abs(draw.start.x-p.x),h:Math.abs(draw.start.y-p.y)};
   const r=draw.r,hits=items.filter(o=>o.type!=='connector'&&o.type!=='line').filter(o=>{const b=rectOf(o);return b.x<=r.x+r.w&&b.x+b.w>=r.x&&b.y<=r.y+r.h&&b.y+b.h>=r.y;}).map(o=>o.id);
   selected=[...new Set(draw.prior.concat(hits))];render();return;
  }
  if(draw.kind==='create'){
   const o=item(draw.id);if(!o)return;
   if(o.type==='rect'||o.type==='ellipse'){o.x=snap(Math.min(draw.start.x,p.x));o.y=snap(Math.min(draw.start.y,p.y));o.w=Math.max(10,Math.abs(dx));o.h=Math.max(10,Math.abs(dy));}
   else {o.x2=snap(p.x);o.y2=snap(p.y);}
  }else if(draw.kind==='resize'){
   const o=item(draw.id),base=draw.bases.get(draw.id);if(o&&base){o.w=Math.max(22,base.w+dx);o.h=Math.max(22,base.h+dy);}
  }else if(draw.kind==='move'){
   for(const id of draw.moving){const o=item(id),base=draw.bases.get(id);if(!o||!base)continue;Object.assign(o,clone(base));moveObj(o,dx,dy);}
  }
  render();
 }
 function endDrag(ev){if(!draw)return;const kind=draw.kind;draw=null;if(svg.hasPointerCapture(ev.pointerId))svg.releasePointerCapture(ev.pointerId);if(kind==='create')setTool('select');render();renderInspector();}
 function inlineEdit(o){
  if(o.type!=='text')return;
  const area=document.createElement('textarea');area.className='dg-inline-input';area.value=o.text;
  area.style.left=Math.max(0,(o.x-(o.align==='end'?180:o.align==='middle'?90:0))*zoom)+'px';
  area.style.top=Math.max(0,(o.y-o.fontSize-8)*zoom)+'px';
  area.style.fontSize=Math.max(12,o.fontSize*zoom)+'px';
  area.style.width=Math.min(450,Math.max(180,Math.max(...o.text.split('\n').map(t=>t.length))*o.fontSize*.63))*zoom+'px';
  stage.appendChild(area);area.focus();area.select();let finished=false;
  const finish=save=>{if(finished)return;finished=true;if(save&&area.value!==o.text){checkpoint();o.text=area.value;render();renderInspector();}area.remove();};
  area.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();finish(false);}if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();finish(true);}});
  area.addEventListener('blur',()=>finish(true));
 }
 function undo(){if(!history.length)return;future.push(clone(items));items=history.pop();selected=[];render();renderInspector();}
 function redo(){if(!future.length)return;history.push(clone(items));items=future.pop();selected=[];render();renderInspector();}
 function del(){if(!selected.length)return;checkpoint();const ids=new Set(linkedChildren(selected));items=items.filter(o=>!ids.has(o.id)&&!(o.type==='connector'&&(ids.has(o.from)||ids.has(o.to))));selected=[];render();renderInspector();}
 function duplicate(){
  if(!selected.length)return;
  checkpoint();const originals=linkedChildren(selected).map(item).filter(Boolean),mapped=new Map(originals.map(o=>[o.id,uid()]));const copies=originals.map(o=>{
   const x=clone(o);x.id=mapped.get(o.id);if(x.parent&&mapped.has(x.parent))x.parent=mapped.get(x.parent);else delete x.parent;
   moveObj(x,28,28);return x;
  });
  items=items.concat(copies);
  for(const e of items.filter(o=>o.type==='connector').slice())if(mapped.has(e.from)&&mapped.has(e.to))items.unshift({...clone(e),id:uid(),from:mapped.get(e.from),to:mapped.get(e.to)});
  selected=selected.filter(id=>mapped.has(id)).map(id=>mapped.get(id));render();renderInspector();
 }
 function align(action){
  const obs=selected.map(item).filter(o=>o&&o.type!=='connector'&&o.type!=='line');
  if(obs.length<2){say('Select at least two objects to align.');return;}
  checkpoint();const bs=obs.map(rectOf);
  const minX=Math.min(...bs.map(b=>b.x)),maxX=Math.max(...bs.map(b=>b.x+b.w)),minY=Math.min(...bs.map(b=>b.y)),maxY=Math.max(...bs.map(b=>b.y+b.h));
  if(action==='distributeH'||action==='distributeV'){
   if(obs.length<3){say('Select three or more items to distribute.');return;}
   const horizontal=action==='distributeH',order=obs.slice().sort((a,b)=>horizontal?rectOf(a).x-rectOf(b).x:rectOf(a).y-rectOf(b).y);
   const first=rectOf(order[0]),last=rectOf(order[order.length-1]),extent=horizontal?last.x-first.x:last.y-first.y;
   order.forEach((o,i)=>{if(i===0||i===order.length-1)return;const r=rectOf(o),desired=(horizontal?first.x:first.y)+extent*i/(order.length-1);moveObj(o,horizontal?desired-r.x:0,horizontal?0:desired-r.y);});
  }else obs.forEach(o=>{let r=rectOf(o),dx=0,dy=0;
   if(action==='left')dx=minX-r.x;if(action==='center')dx=(minX+maxX)/2-(r.x+r.w/2);if(action==='right')dx=maxX-(r.x+r.w);
   if(action==='top')dy=minY-r.y;if(action==='middle')dy=(minY+maxY)/2-(r.y+r.h/2);if(action==='bottom')dy=maxY-(r.y+r.h);
   moveObj(o,dx,dy);
  });
  render();renderInspector();
 }
 function reorder(front){if(!selected.length)return;checkpoint();const chosen=items.filter(o=>selected.includes(o.id)),rest=items.filter(o=>!selected.includes(o.id));items=front?rest.concat(chosen):chosen.concat(rest);render();}
 function setZoom(value){zoom=clamp(value,.3,2.5);render();}
 function fit(){const w=viewport.clientWidth-44,h=viewport.clientHeight-44;setZoom(Math.min(1.25,w/width,h/height));}
 function downloadFile(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
 const filename=()=> 'experiment-diagram-'+new Date().toISOString().slice(0,10);
 async function imageBlob(){
  const text=toSvg(),blob=new Blob([text],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
  const image=new Image();
  try{
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
   const scale=Math.min(2,8192/Math.max(width,height));
   const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG conversion failed')),'image/png'));
  }finally{URL.revokeObjectURL(url);}
 }
 async function exportAction(name){
  try{
   if(name==='svg'){downloadFile(toSvg(),'image/svg+xml',filename()+'.svg');say('SVG downloaded — vector quality.');}
   if(name==='copysvg'){await navigator.clipboard.writeText(toSvg());say('SVG source copied. Paste into an SVG-capable editor.');}
   if(name==='png'){const blob=await imageBlob();downloadFile(blob,'image/png',filename()+'.png');say('High-resolution PNG downloaded.');}
   if(name==='copypng'){if(!navigator.clipboard||!navigator.clipboard.write||typeof ClipboardItem==='undefined')throw new Error('Image clipboard unavailable in this browser. Use Download PNG.');
    const blob=await imageBlob();await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);say('Diagram image copied. Paste into your lab notebook.');
   }
  }catch(e){say('Export error: '+(e&&e.message||e));}
 }
 function action(name){
  if(name==='close')close();
  else if(name==='reset'){if(!dirty||confirm('Rebuild the diagram from the selected planner tasks? This discards your current diagram edits.')){checkpoint();const m=buildModel(input);items=clone(m.items);width=m.width;height=m.height;selected=[];fit();renderInspector();}}
  else if(name==='undo')undo();else if(name==='redo')redo();else if(name==='delete')del();else if(name==='duplicate')duplicate();
  else if(name==='grid'){grid=!grid;render();}
  else if(name==='zoomin')setZoom(zoom*1.2);else if(name==='zoomout')setZoom(zoom/1.2);else if(name==='fit')fit();
  else if(name==='front'||name==='back')reorder(name==='front');
  else if(['left','center','right','top','middle','bottom','distributeH','distributeV'].includes(name))align(name);
  else if(['svg','png','copysvg','copypng'].includes(name))exportAction(name);
 }
 function keyHandler(ev){
  if(!root.isConnected)return;
  const active=document.activeElement,isTyping=active&&['TEXTAREA','INPUT','SELECT'].includes(active.tagName);
  if(ev.key==='Escape'){if(isTyping&&active.classList.contains('dg-inline-input'))return;if(connectorFrom){connectorFrom=null;say('Connection cancelled.');return;}if(selected.length){select([]);return;}close();return;}
  if(isTyping)return;
  const cmd=ev.ctrlKey||ev.metaKey,k=ev.key.toLowerCase();
  if(cmd&&k==='z'){ev.preventDefault();ev.shiftKey?redo():undo();}
  else if(cmd&&k==='y'){ev.preventDefault();redo();}
  else if(cmd&&k==='d'){ev.preventDefault();duplicate();}
  else if(cmd&&k==='c'){if(selected.length){ev.preventDefault();clip=linkedChildren(selected).map(item).filter(Boolean).map(clone);say(clip.length+' diagram objects copied internally. Ctrl+V to paste.');}}
  else if(cmd&&k==='v'){if(clip.length){ev.preventDefault();checkpoint();const mapped=new Map(clip.map(o=>[o.id,uid()]));const copies=clip.map(o=>{let c=clone(o);c.id=mapped.get(o.id);if(c.parent&&mapped.has(c.parent))c.parent=mapped.get(c.parent);else delete c.parent;moveObj(c,35,35);return c;});items=items.concat(copies);selected=copies.map(o=>o.id);render();renderInspector();}}
  else if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();del();}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)&&selected.length){ev.preventDefault();checkpoint();const step=ev.shiftKey?10:1,dx=ev.key==='ArrowLeft'?-step:ev.key==='ArrowRight'?step:0,dy=ev.key==='ArrowUp'?-step:ev.key==='ArrowDown'?step:0;linkedChildren(selected).forEach(id=>{const o=item(id);if(o)moveObj(o,dx,dy);});render();}
  else if(!cmd&&!ev.altKey){const map={v:'select',t:'text',r:'rect',e:'ellipse',l:'line',a:'arrow',c:'connector'};if(map[k])setTool(map[k]);}
 }
 root.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.tool)setTool(b.dataset.tool);
  else if(b.dataset.action)action(b.dataset.action);
 });
 inspector.addEventListener('input',ev=>{const n=ev.target;if(!n.dataset||!n.dataset.prop)return;setProp(n.dataset.prop,n.type==='checkbox'?n.checked:n.value);});
 inspector.addEventListener('change',ev=>{if(ev.target.dataset&&ev.target.dataset.prop){setProp._editing=false;renderInspector();}});
 svg.addEventListener('pointerdown',startDrag);
 svg.addEventListener('pointermove',dragMove);
 svg.addEventListener('pointerup',endDrag);
 svg.addEventListener('pointercancel',endDrag);
 svg.addEventListener('dblclick',ev=>{const o=findTarget(ev);if(o&&o.type==='text'){ev.preventDefault();select([o.id]);inlineEdit(o);}});
 window.addEventListener('keydown',keyHandler,true);
 setTool('select');renderInspector();
 requestAnimationFrame(()=>{fit();say('Ready. Move boxes and individual labels freely; only exported files leave this editor.');});
}
window.VubioDiagramEditor={open,preview:input=>{const model=buildModel(input);return {nodes:model.items.filter(o=>o.type==='rect').length,connectors:model.items.filter(o=>o.type==='connector').length,groups:model.items.filter(o=>o.type==='text'&&/^Workflow \d+$/.test(o.text)).length,width:model.width,height:model.height};}};
})();