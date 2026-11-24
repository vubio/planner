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
 assert.ok(out.height>290 && out.height<500, 'compact layout uses less vertical space');
 assert.ok(out.width>=520 && out.width<940, 'diagram fits its objects horizontally');
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

test('fan-out connectors use distinct ports and clean rounded orthogonal routes',()=>{
 const rect={x:64,y:58,w:204,h:55},targets=[0,1,2,3].map(i=>({x:319,y:58+i*69,w:204,h:55}));
 const routes=targets.map((target,i)=>sandbox.window.VubioDiagramEditor.route(rect,target,i,4,0,1));
 const starts=routes.map(path=>path.match(/^M[\d.]+ ([\d.]+)/)?.[1]);
 assert.equal(new Set(starts).size,4,'branches leave from different points on the source edge');
 routes.forEach((path,i)=>{
  assert.ok(path.includes(' Q'),'rounded elbow rather than swooping Bezier');
  assert.equal(path.includes(' C'),false,'no old cubic curls');
  assert.ok(path.endsWith('319 '+(58+i*69+55/2)),'arrow enters target left edge');
 });
});
test('diagram boxes and workflow layout use the compact two-row design',()=>{
 const tasks=[
  task('seed','09:00'),
  task('a','11:00',0),task('b','12:00',25),task('c','13:00',50),task('d','14:00',75)
 ];
 const diagram=preview({tasks,edges:[
  {from:'seed',to:'a'}, {from:'seed',to:'b'}, {from:'seed',to:'c'}, {from:'seed',to:'d'}
 ]});
 assert.equal(diagram.nodes,5);
 assert.equal(diagram.connectors,4);
 assert.ok(diagram.height<420,'four branch rows should fit in a compact export');
 assert.ok(diagram.width<700,'diagram no longer includes a large empty right margin');
});
test('very long titles retain vertical breathing room',()=>{
 const brief=preview({tasks:[task('a','09:00')],edges:[]});
 const longTask={...task('a','09:00'),title:'Retinol preloading HSC-T6 cells across several culture vessels with overnight incubation'};
 const longer=preview({tasks:[longTask],edges:[]});
 assert.ok(longer.height>=brief.height);
});
test('connectors remain valid after boxes are rearranged',()=>{
 const route=sandbox.window.VubioDiagramEditor.route;
 const source={x:310,y:40,w:180,h:55},target={x:130,y:170,w:180,h:55};
 const path=route(source,target);
 assert.match(path,/^M/);
 assert.equal(path.includes('NaN'),false);
});
