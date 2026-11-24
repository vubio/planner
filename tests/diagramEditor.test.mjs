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
 assert.equal(out.width/out.height,16/9,'diagram exports in landscape 16:9');
 assert.ok(out.width>=960&&out.height>=540,'page is at least PowerPoint slide-sized');
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
 assert.equal(diagram.width,960);
 assert.equal(diagram.height,540);
 assert.ok(diagram.boxHeights.every(height=>height===55),'compact single-line tasks remain short');
});
test('very long titles retain vertical breathing room',()=>{
 const brief=preview({tasks:[task('a','09:00')],edges:[]});
 const longTask={...task('a','09:00'),title:'Retinol preloading HSC-T6 cells across several culture vessels with overnight incubation'};
 const longer=preview({tasks:[longTask],edges:[]});
 assert.ok(longer.boxHeights[0]>brief.boxHeights[0], 'long titles increase box height only when required');
});
test('connectors remain valid after boxes are rearranged',()=>{
 const route=sandbox.window.VubioDiagramEditor.route;
 const source={x:310,y:40,w:180,h:55},target={x:130,y:170,w:180,h:55};
 const path=route(source,target);
 assert.match(path,/^M/);
 assert.equal(path.includes('NaN'),false);
});

test('portrait-like selections still export to 16:9 landscape pages',()=>{
 const tasks=Array.from({length:13},(_,i)=>({...task(String(i),'09:00',i*12),title:'Experimental step '+i}));
 const input={tasks,edges:tasks.slice(1).map(t=>({from:'0',to:t.id}))};
 const original=JSON.stringify(input);
 const out=preview(input);
 assert.equal(out.nodes,13);
 assert.equal(out.connectors,12);
 assert.equal(out.width/out.height,16/9);
 assert.ok(out.height>540,'tall workflows expand the page to avoid clipping');
 assert.equal(JSON.stringify(input),original);
});
test('one-click swatches provide common and pastel colors alongside the custom picker',()=>{
 const palette=sandbox.window.VubioDiagramEditor.colors;
 assert.equal(palette.length,22);
 assert.ok(palette.some(p=>p.hex==='#000000'));
 assert.ok(palette.some(p=>p.hex==='#ffffff'));
 assert.ok(palette.some(p=>p.hex==='#3879c8'));
 assert.ok(palette.some(p=>p.hex==='#daf0df'));
 assert.ok(script.includes('data-color-prop'));
 assert.ok(script.includes('data-color-value'));
 assert.ok(script.includes('Custom</span><input type="color"'));
});
test('empty diagram preview remains a valid landscape page',()=>{
 const out=preview({tasks:[],edges:[]});
 assert.equal(out.nodes,0);
 assert.equal(out.width,960);
 assert.equal(out.height,540);
});
