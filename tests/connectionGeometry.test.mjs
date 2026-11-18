import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceConnectionY,connectionBezierPath} from '../src/connectionGeometry.ts';
test('outgoing arrows choose different points on the source right edge',()=>{
 const upper=sourceConnectionY(65,145,135);
 const lower=sourceConnectionY(65,145,368);
 assert.equal(upper,135);
 assert.equal(lower,196);
 assert.ok(lower>upper);
});
test('anchor remains inside the source for above and below targets',()=>{
 assert.equal(sourceConnectionY(80,60,-100),93.2);
 assert.equal(sourceConnectionY(80,60,1000),126.8);
 assert.equal(sourceConnectionY(80,60,110),110);
});
test('short-gap forward arrows never reverse horizontally in the Bézier handles',()=>{
 const path=connectionBezierPath(230,196,267,360);
 const values=[...path.matchAll(/-?\d+(?:\.\d+)?/g)].map(v=>+v[0]);
 assert.equal(values.length,8);
 assert.equal(values[0],230);assert.equal(values[6],267);
 assert.ok(values[2]>230&&values[2]<267);
 assert.ok(values[4]>230&&values[4]<267);
 assert.ok(values[2]<values[4]);
 assert.equal(values[1],196);assert.equal(values[7],360);
});
test('long and backward links still produce valid cubic paths',()=>{
 for(const [ax,bx] of [[100,400],[250,150],[100,100]]){
  const path=connectionBezierPath(ax,100,bx,220);
  assert.ok(/^M.* C.*$/.test(path));
  assert.ok(!path.includes('NaN'));
 }
});
