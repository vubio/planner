import test from 'node:test';
import assert from 'node:assert/strict';
import {taskVisibleOnCanvas,noteVisibleOnCanvas} from '../src/canvasVisibility.ts';

test('unfinished-only canvas toggle hides done tasks but preserves the separate sidebar filter',()=>{
 const planned={id:'a',status:'Planned'},done={id:'b',status:'Done'},failed={id:'c',status:'Failed'};
 assert.equal(taskVisibleOnCanvas(done,[],false),true);
 assert.equal(taskVisibleOnCanvas(done,[],true),false);
 assert.equal(taskVisibleOnCanvas(planned,[],true),true);
 assert.equal(taskVisibleOnCanvas(failed,[],true),true);
 assert.equal(taskVisibleOnCanvas(planned,['a'],false),false);
 assert.equal(taskVisibleOnCanvas(planned,['a'],true),false);
});

test('unfinished-only canvas toggle also hides handled pinned notes, but not the inbox records',()=>{
 const note={done:true,at:'2026-10-30T13:30'};
 assert.equal(noteVisibleOnCanvas(note,false),true);
 assert.equal(noteVisibleOnCanvas(note,true),false);
 assert.equal(noteVisibleOnCanvas({...note,done:false},true),true);
 assert.equal(noteVisibleOnCanvas({...note,pinned:false},false),false);
 assert.equal(noteVisibleOnCanvas({...note,at:undefined},false),false);
});
