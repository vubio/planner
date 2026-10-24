import test from 'node:test';
import assert from 'node:assert/strict';
import {placeCompactTitles} from '../src/taskLabels.ts';

const task=(id,x,y,width=18,height=50)=>({id,x,y,width,height,title:id});

test('tiny task titles stay beside their own blocks instead of migrating across the canvas',()=>{
 const tasks=[task('a',300,500),task('b',340,505),task('c',380,510),task('d',420,515)];
 const titles=placeCompactTitles(tasks);
 assert.equal(titles.length,4);
 for(const title of titles){
  const original=tasks.find(t=>t.id===title.id);
  assert.ok(Math.abs(title.left)<=20,`horizontal offset too large for ${title.id}`);
  assert.ok(Math.abs(title.top)<=original.height+74,`vertical offset too large for ${title.id}`);
 }
 assert.ok(new Set(titles.map(t=>t.top)).size>1,'close titles should nudge into at least two positions');
});

test('wide and moderately wide tasks keep their titles directly inside the block',()=>{
 assert.deepEqual(placeCompactTitles([task('a',300,500,280),task('b',700,650,160)]),[]);
});

test('compact titles do not move when another wide task overlaps a block',()=>{
 const titles=placeCompactTitles([task('a',300,500,260,85),task('b',350,535,280,90),task('c',620,800,20)]);
 assert.equal(titles.length,1);
 assert.equal(titles[0].id,'c');
});

test('near-top compact titles stay below the sticky time ruler',()=>{
 const titles=placeCompactTitles([task('a',2,88),task('b',60,92)]);
 for(const title of titles){const original=title.id==='a'?task('a',2,88):task('b',60,92);assert.ok(original.y+title.top>=82)}
});
