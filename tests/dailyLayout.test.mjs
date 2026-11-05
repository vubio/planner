import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutDayIntervals} from '../src/dailyLayout.ts';

test('earlier intersecting events remain to the left of later events',()=>{
 const rows=layoutDayIntervals([
  {id:'D',startMinute:13*60+30,endMinute:15*60},
  {id:'B',startMinute:12*60,endMinute:14*60+30},
  {id:'C',startMinute:12*60+30,endMinute:13*60+15},
  {id:'A',startMinute:11*60+30,endMinute:12*60+45},
 ]);
 assert.deepEqual(rows.map(({id,column})=>[id,column]),[['A',0],['B',1],['C',2],['D',2]]);
 assert.equal(rows[0].columns,3);
 assert.ok(rows.every(row=>row.columns===3));
});

test('non-overlapping groups return to full width at the left',()=>{
 const rows=layoutDayIntervals([
  {id:'morning',startMinute:480,endMinute:540},
  {id:'afternoon',startMinute:780,endMinute:840},
 ]);
 assert.deepEqual(rows.map(({column,columns})=>[column,columns]),[[0,1],[0,1]]);
});

test('identical starts use longer blocks on the left',()=>{
 const rows=layoutDayIntervals([
  {id:'short',startMinute:600,endMinute:630},
  {id:'long',startMinute:600,endMinute:720},
 ]);
 assert.deepEqual(rows.map(({id,column})=>[id,column]),[['long',0],['short',1]]);
});
