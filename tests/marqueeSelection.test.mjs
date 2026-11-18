import test from 'node:test';
import assert from 'node:assert/strict';
import {marqueeBounds,marqueeOverlaps,combineMarqueeSelection} from '../src/marqueeSelection.ts';
test('right-drag rectangle normalizes direction in all quadrants',()=>{
 assert.deepEqual(marqueeBounds(250,220,100,70),{left:100,right:250,top:70,bottom:220});
 assert.deepEqual(marqueeBounds(100,70,250,220),{left:100,right:250,top:70,bottom:220});
});
test('selection includes any overlapping task block, excludes non-overlapping blocks',()=>{
 const area=marqueeBounds(100,100,300,300);
 assert.equal(marqueeOverlaps(area,{left:290,right:380,top:210,bottom:250}),true);
 assert.equal(marqueeOverlaps(area,{left:20,right:100,top:180,bottom:220}),true);
 assert.equal(marqueeOverlaps(area,{left:310,right:330,top:180,bottom:220}),false);
 assert.equal(marqueeOverlaps(area,{left:170,right:230,top:310,bottom:350}),false);
});
test('plain rectangle replaces prior selection while Shift adds without duplicates',()=>{
 assert.deepEqual(combineMarqueeSelection(['a','b'],['c','d'],false),['c','d']);
 assert.deepEqual(combineMarqueeSelection(['a','b'],['b','c'],true),['a','b','c']);
 assert.deepEqual(combineMarqueeSelection(['a'],[],false),[]);
});
