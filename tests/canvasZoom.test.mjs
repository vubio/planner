import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelZoom,anchoredScrollLeft,canvasY,fromCanvasY,fromCanvasDeltaY,canvasHeight,anchoredScrollTop} from '../src/canvasZoom.ts';

test('Ctrl-wheel changes only the timeline zoom within existing min/max bounds',()=>{
 assert.ok(wheelZoom(1,-100)>1,'wheel up zooms in');
 assert.ok(wheelZoom(1,100)<1,'wheel down zooms out');
 assert.equal(wheelZoom(4,-100),4);
 assert.equal(wheelZoom(.15,100),.15);
 assert.equal(wheelZoom(1,0),1);
 assert.ok(wheelZoom(1,-3,1)>1,'line-mode mouse wheels work too');
});

test('the canvas point under the cursor remains fixed when zooming',()=>{
 const oldLeft=2300,cursorX=220,zoomBefore=1,zoomAfter=1.5;
 const contentX=oldLeft+cursorX;
 const newLeft=anchoredScrollLeft(contentX,cursorX,zoomBefore,zoomAfter);
 assert.equal(newLeft,3560);
 assert.equal(contentX*zoomAfter/zoomBefore-newLeft,cursorX);
 assert.equal(anchoredScrollLeft(5,100,1,.5),0,'scroll is bounded at the left edge');
});

test('vertical positions and heights scale around the fixed 80px ruler',()=>{
 const pad=1950;
 assert.equal(canvasY(100,pad,1),2130);
 assert.equal(canvasY(100,pad,1.5),3155);
 assert.equal(fromCanvasY(canvasY(-200,pad,.6),pad,.6),-200);
 assert.equal(canvasHeight(5000,1.5),7460);
 assert.equal(fromCanvasDeltaY(90,1.5),60,'drag distance is converted to logical coordinates');
 const oldTop=1950,mouseY=340,from=1,to=1.5;
 const nextTop=anchoredScrollTop(oldTop+mouseY,mouseY,from,to);
 assert.equal(80+((oldTop+mouseY)-80)*to/from-nextTop,mouseY);
});
