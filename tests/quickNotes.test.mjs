import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {parseQuickNotes,quickNoteDisplayTitle} from '../src/quickNotes.ts';

test('accepts simple independent quick notes',()=>{
 const records=[{id:'a',title:'Shipping address',details:'123 Lab Street\nDallas, TX'},{id:'b',title:'Catalog number',details:'AB-4321'}];
 assert.deepEqual(parseQuickNotes({version:1,notes:records}),records);
});
test('rejects invalid notes without silently discarding them',()=>{
 assert.throws(()=>parseQuickNotes({version:1,notes:[{id:'a',title:'missing details'}]}));
 assert.throws(()=>parseQuickNotes({version:1,notes:[{id:'a',title:'A',details:''},{id:'a',title:'B',details:''}]}));
 assert.throws(()=>parseQuickNotes({version:2,notes:[]}));
});
test('uses a simple first-line fallback when the title is empty',()=>{
 assert.equal(quickNoteDisplayTitle({title:'',details:'Catalog #123\nPrice'}),'Catalog #123');
 assert.equal(quickNoteDisplayTitle({title:'',details:''}),'Untitled note');
});
