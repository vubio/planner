import test from 'node:test';
import assert from 'node:assert/strict';
import {visiblePinnedNotes} from '../src/noteInbox.ts';

const palette=['#ffefb1','#d7eaf4','#e4d9f7'];
const notes=[
 {id:'late-blue',at:'2026-10-28T14:30',color:palette[1],done:false},
 {id:'handled',at:'2026-10-26T09:00',color:palette[0],done:true},
 {id:'early-purple',at:'2026-10-27T08:00',color:palette[2],done:false},
 {id:'early-blue',at:'2026-10-26T15:00',color:palette[1],done:false},
];
const ids=items=>items.map(item=>item.id);

test('all notes retain original order by default',()=>{
 assert.deepEqual(ids(visiblePinnedNotes(notes,false,'original',palette)),ids(notes));
});

test('unfinished filter omits handled notes without modifying stored data',()=>{
 assert.deepEqual(ids(visiblePinnedNotes(notes,true,'original',palette)),['late-blue','early-purple','early-blue']);
 assert.equal(notes.length,4);
});

test('pinned-time sort follows canvas dates, including across days',()=>{
 assert.deepEqual(ids(visiblePinnedNotes(notes,false,'time',palette)),['handled','early-blue','early-purple','late-blue']);
});

test('color sort groups palette colors and orders each color chronologically',()=>{
 assert.deepEqual(ids(visiblePinnedNotes(notes,false,'color',palette)),['handled','early-blue','late-blue','early-purple']);
});

test('unfinished-only works with both sorts and an empty result',()=>{
 assert.deepEqual(ids(visiblePinnedNotes(notes,true,'time',palette)),['early-blue','early-purple','late-blue']);
 assert.deepEqual(visiblePinnedNotes([notes[1]],true,'color',palette),[]);
});
