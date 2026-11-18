import test from 'node:test';
import assert from 'node:assert/strict';
import {hourLabel12,halfDayBands} from '../src/hourRuler.ts';
test('hour numbers use 12-hour clock, without minutes or suffixes',()=>{
 assert.deepEqual([0,7,8,9,10,11,12,13,14,16,20,23].map(hourLabel12),['12','7','8','9','10','11','12','1','2','4','8','11']);
});
test('daytime shows a five-hour AM region and a nine-hour PM region',()=>{
 assert.deepEqual(halfDayBands(7,14),[
  {label:'AM',offset:0,duration:5},
  {label:'PM',offset:5,duration:9},
 ]);
});
test('overnight view divides 24 hours into two 12-hour periods',()=>{
 assert.deepEqual(halfDayBands(0,24),[
  {label:'AM',offset:0,duration:12},
  {label:'PM',offset:12,duration:12},
 ]);
});
test('hour ticks include every visible hour',()=>{
 const ticks=Array.from({length:14},(_,i)=>hourLabel12(7+i));
 assert.equal(ticks.length,14);
 assert.deepEqual(ticks,['7','8','9','10','11','12','1','2','3','4','5','6','7','8']);
});
