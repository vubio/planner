import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const script=readFileSync(new URL('../public/diagram-editor.js',import.meta.url),'utf8');
const sandbox={window:{}};
vm.runInNewContext(script,sandbox,{timeout:3000});
const preview=sandbox.window.VubioDiagramEditor.preview;
const task=(id,at,y=0)=>({id,title:'Task '+id,start:'2026-11-24T'+at,duration:120,y});
test('make-diagram accepts separate workflow groups without inventing cross-links',()=>{
 const input={tasks:[task('a','09:00'),task('b','12:00'),task('c','15:00'),task('d','09:30',100),task('e','12:30',100)],edges:[
 {from:'a',to:'b'},{from:'a',to:'c'},{from:'d',to:'e'},{from:'a',to:'not-selected'}
 ]};
 const original=JSON.stringify(input),out=preview(input);
 assert.equal(out.nodes,5);assert.equal(out.connectors,3);assert.equal(out.groups,2);
 assert.ok(out.height>500);assert.ok(out.width>=940);
 assert.equal(JSON.stringify(input),original,'diagram conversion cannot mutate planner data');
});
test('unconnected selections stay separate, with no arrows',()=>{
 const out=preview({tasks:[task('x','08:00'),task('y','11:00')],edges:[]});
 assert.equal(out.nodes,2);assert.equal(out.groups,2);assert.equal(out.connectors,0);
});
test('missing selected link endpoints are ignored',()=>{
 const out=preview({tasks:[task('x','08:00'),task('y','11:00')],edges:[{from:'x',to:'y'},{from:'x',to:'z'}]});
 assert.equal(out.nodes,2);assert.equal(out.connectors,1);assert.equal(out.groups,1);
});
test('diagram editor is temporary and does not call storage or a server',()=>{
 assert.equal(/localStorage|sessionStorage|indexedDB|fetch\s*\(/.test(script),false);
 assert.equal(typeof sandbox.window.VubioDiagramEditor.open,'function');
});
