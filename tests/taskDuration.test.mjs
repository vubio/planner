import test from 'node:test';
import assert from 'node:assert/strict';
import {durationParts,taskEnd,withDuration} from '../src/taskDuration.ts';
const local=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
test('minutes are shown as hours and minutes',()=>{
 assert.deepEqual(durationParts(125),{hours:2,minutes:5});
 assert.deepEqual(durationParts(720),{hours:12,minutes:0});
 assert.deepEqual(durationParts(15),{hours:0,minutes:15});
});
test('keep start changes end including overnight',()=>{
 const old={start:'2026-11-17T20:30',duration:125},next=withDuration(old,720,'start',local);
 assert.equal(next.start,old.start); assert.equal(next.duration,720);
 assert.equal(local(taskEnd(next.start,next.duration)),'2026-11-18T08:30');
 assert.equal(old.duration,125);
});
test('keep end shifts start and stays anchored across edits',()=>{
 const old={start:'2026-11-17T20:30',duration:125};
 const first=withDuration(old,725,'end',local),second=withDuration(first,720,'end',local);
 assert.equal(first.start,'2026-11-17T10:30');assert.equal(second.start,'2026-11-17T10:35');
 assert.equal(+taskEnd(first.start,first.duration),+taskEnd(old.start,old.duration));
 assert.equal(+taskEnd(second.start,second.duration),+taskEnd(old.start,old.duration));
});
test('invalid start returns no end',()=>{
 assert.equal(taskEnd('invalid',120),null);
 assert.equal(taskEnd('2026-11-17T20:30',Number.NaN),null);
});
