import test from 'node:test';
import assert from 'node:assert/strict';
import {validData,reaches,recordHTML,dateKey,nextTaskStatus,groupMovementIds,boundedGroupDragY} from '../src/model.ts';
const task={id:'a',title:'<script>alert(1)</script>',start:'2026-10-19T14:45',duration:15,prep:150,y:40,height:66,color:'#628875',project:'Test',priority:'High',status:'Planned',notes:'A & B',checklist:[{text:'<unsafe>',done:false}],floating:false};
const data={tasks:[task],edges:[],questions:[],notes:'notes'};
test('task groups persist in a valid saved planner without breaking older tasks',()=>{
 const second={...task,id:'b',title:'Second grouped task'};
 assert.equal(validData({...data,tasks:[{...task,groupId:'group-1'},{...second,groupId:'group-1'}]}),true);
 assert.equal(validData({...data,tasks:[{...task,groupId:17}]}),false);
 assert.equal(validData({...data,tasks:[{...task,groupId:''}]}),false);
 assert.equal(validData(data),true);
});
test('dragging one grouped task moves every member, preserving other task groups',()=>{
 const tasks=[{id:'a',groupId:'one'},{id:'b',groupId:'one'},{id:'c',groupId:'two'},{id:'d',groupId:'two'},{id:'e'}];
 assert.deepEqual(groupMovementIds(tasks,['a']),['a','b']);
 assert.deepEqual(groupMovementIds(tasks,['a','c']),['a','b','c','d']);
 assert.deepEqual(groupMovementIds(tasks,['e']),['e']);
});
test('dragging a lower selected task cannot hide an upper selected task behind the ruler',()=>{
 const tasks=[{id:'seeded',y:210},{id:'viability',y:32},{id:'unselected',y:5}];
 const selected=new Set(['seeded','viability']);
 const dy=boundedGroupDragY(tasks,selected,-140,12);
 assert.equal(dy,-20);
 assert.equal(tasks[0].y+dy,190);
 assert.equal(tasks[1].y+dy,12);
 assert.equal(tasks[2].y,5);
 // A single dragged item may still move until its own top reaches the boundary.
 assert.equal(boundedGroupDragY(tasks,new Set(['seeded']),-140,12),-140);
});
test('group drag uses the scrolled viewport edge and preserves already hidden positions',()=>{
 const tasks=[{id:'upper',y:60},{id:'lower',y:220}];
 assert.equal(boundedGroupDragY(tasks,new Set(['upper','lower']),-200,-100),-160);
 assert.equal(boundedGroupDragY([{id:'upper',y:-35},{id:'lower',y:120}],new Set(['upper','lower']),-80,12),0);
 assert.equal(boundedGroupDragY([{id:'upper',y:-35},{id:'lower',y:120}],new Set(['upper','lower']),60,12),60);
});
test('task quick action cycles planned to done to failed to planned',()=>{
 const statuses=['Planned'];for(let i=0;i<3;i++)statuses.push(nextTaskStatus(statuses[i]));
 assert.deepEqual(statuses,['Planned','Done','Failed','Planned']);
 assert.equal(nextTaskStatus('In progress'),'Done');
 assert.equal(nextTaskStatus('Stopped'),'Done');
 assert.equal(validData({...data,tasks:[{...task,status:'Failed'}]}),true);
});
test('backup validation rejects malformed data before replacement',()=>{assert.equal(validData(data),true);assert.equal(validData({...data,tasks:[{...task,duration:-1}]}),false);assert.equal(validData({...data,tasks:[task,task]}),false);assert.equal(validData({...data,edges:[{id:'e',from:'a',to:'missing',dashed:false}]}),false);assert.equal(validData({...data,tasks:[{...task,color:'red" onload="bad'}]}),false)});
test('a tag attached to a task remains valid at coordinate 0,0',()=>{
 const tag={id:'tag1',taskId:'a',x:0,y:0,text:'Urgent',color:'#b83f4b',shape:'flag'};
 assert.equal(validData({...data,tags:[tag]}),true);
 assert.equal(validData({...data,tags:[{...tag,taskId:'missing'}]}),false);
 assert.equal(validData({...data,tags:[{...tag,taskId:undefined}]}),false);
});
test('canvas Ask & discuss notes persist with optional anchor, color, and vertical position',()=>{
 const note={id:'question1',text:'Ask B about reagent C',done:false,at:'2026-10-22T10:15',y:145,color:'#ffefb1'};
 const pinned={...data,questions:[note]};
 assert.equal(validData(pinned),true);
 assert.equal(validData({...data,questions:[{id:'legacy',text:'Older question',done:false}]}),true);
 assert.equal(validData({...data,questions:[{...note,color:'not-a-color'}]}),false);
 assert.equal(validData({...data,questions:[{...note,at:'not-a-date'}]}),false);
 const html=recordHTML(pinned,new Date('2026-10-19T00:00'));
 assert.match(html,/ASK \/ DISCUSS/);
 assert.match(html,/Ask B about reagent C/);
});
test('graph traversal detects branches and loops without hanging',()=>{const edges=[{from:'a',to:'b'},{from:'a',to:'c'},{from:'c',to:'d'}];assert.equal(reaches(edges,'a','d'),true);assert.equal(reaches(edges,'d','a'),false);assert.equal(reaches([...edges,{from:'d',to:'a'}],'d','b'),true)});
test('archived HTML is standalone and escapes task input',()=>{const html=recordHTML(data,new Date('2026-10-19T00:00'));assert.match(html,/<svg/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/150 min preparation/);assert.match(html,/A &amp; B/);assert.equal(dateKey(new Date(2026,9,19)),'2026-10-19')});
