import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {mergeQuickNotes,parseQuickNotes,quickNoteDisplayTitle} from '../src/quickNotes.ts';

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
test('imports old browser-only notes without duplicating existing synced notes',()=>{
 const synced=[{id:'a',title:'Current shipping address',details:'New address'}];
 const legacy=[{id:'a',title:'Old shipping address',details:'Outdated'},{id:'b',title:'Catalog number',details:'ABC-123'}];
 assert.deepEqual(mergeQuickNotes(synced,legacy),[...synced,legacy[1]]);
 assert.deepEqual(mergeQuickNotes(mergeQuickNotes(synced,legacy),legacy),[...synced,legacy[1]]);
 assert.deepEqual(synced,[{id:'a',title:'Current shipping address',details:'New address'}]);
});
