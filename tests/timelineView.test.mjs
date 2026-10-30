import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleDayCount,isWeekend} from '../src/timelineView.ts';

test('the weekly canvas fits Monday through Friday without removing weekend days',()=>{
 assert.equal(visibleDayCount('week'),5);
 assert.equal(visibleDayCount('three'),3);
 assert.equal(visibleDayCount('day'),1);
});

test('weekend shading applies to Saturday and Sunday only',()=>{
 for(const date of ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30']){
  assert.equal(isWeekend(new Date(date+'T12:00:00')),false,date);
 }
 assert.equal(isWeekend(new Date('2026-10-31T12:00:00')),true);
 assert.equal(isWeekend(new Date('2026-11-01T12:00:00')),true);
});
