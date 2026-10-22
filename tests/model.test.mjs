import test from 'node:test';
import assert from 'node:assert/strict';
import {validData,reaches,recordHTML,dateKey} from '../src/model.ts';
const task={id:'a',title:'<script>alert(1)</script>',start:'2026-10-19T14:45',duration:15,prep:150,y:40,height:66,color:'#628875',project:'Test',priority:'High',status:'Planned',notes:'A & B',checklist:[{text:'<unsafe>',done:false}],floating:false};
const data={tasks:[task],edges:[],questions:[],notes:'notes'};
test('backup validation rejects malformed data before replacement',()=>{assert.equal(validData(data),true);assert.equal(validData({...data,tasks:[{...task,duration:-1}]}),false);assert.equal(validData({...data,tasks:[task,task]}),false);assert.equal(validData({...data,edges:[{id:'e',from:'a',to:'missing',dashed:false}]}),false);assert.equal(validData({...data,tasks:[{...task,color:'red" onload="bad'}]}),false)});
test('graph traversal detects branches and loops without hanging',()=>{const edges=[{from:'a',to:'b'},{from:'a',to:'c'},{from:'c',to:'d'}];assert.equal(reaches(edges,'a','d'),true);assert.equal(reaches(edges,'d','a'),false);assert.equal(reaches([...edges,{from:'d',to:'a'}],'d','b'),true)});
test('archived HTML is standalone and escapes task input',()=>{const html=recordHTML(data,new Date('2026-10-19T00:00'));assert.match(html,/<svg/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/150 min preparation/);assert.match(html,/A &amp; B/);assert.equal(dateKey(new Date(2026,9,19)),'2026-10-19')});
