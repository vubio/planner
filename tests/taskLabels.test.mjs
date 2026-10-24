import test from 'node:test';
import assert from 'node:assert/strict';
import {arrangeTaskLabels} from '../src/taskLabels.ts';

const task=(id,x,y,width=18,height=50)=>({id,x,y,width,height,title:id,tagCount:0});
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

test('labels of closely spaced tiny tasks use different, non-overlapping lanes',()=>{
 const tasks=[task('a',300,500),task('b',340,505),task('c',380,510),task('d',420,515)];
 const labels=arrangeTaskLabels(tasks,5000,3000);
 assert.equal(labels.length,tasks.length);
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.equal(overlap(labels[i],labels[j]),false,`${labels[i].id}/${labels[j].id} collide`);
 for(const label of labels)assert.ok(!tasks.some(t=>overlap(label,t)),`${label.id} covers a task`);
});

test('wide non-overlapping tasks keep their full internal text area',()=>{
 assert.deepEqual(arrangeTaskLabels([task('a',300,500,280),task('b',700,650,350)],5000,3000),[]);
});

test('overlapping full-width tasks receive separate title callouts',()=>{
 const labels=arrangeTaskLabels([task('a',300,500,260,85),task('b',350,535,280,90)],5000,3000);
 assert.equal(labels.length,2);
 assert.equal(overlap(labels[0],labels[1]),false);
});

test('label positions stay inside canvas near the top or far right',()=>{
 const labels=arrangeTaskLabels([task('a',2,87),task('b',775,90)],800,800);
 for(const l of labels){assert.ok(l.x>=0&&l.y>=83);assert.ok(l.x+l.width<=800);assert.ok(l.y+l.height<=800)}
});
