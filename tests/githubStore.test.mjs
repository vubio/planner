import test from 'node:test';
import assert from 'node:assert/strict';
import {
 BROWSER_DATABASE_KEY,GITHUB_DATABASE_BRANCH,GITHUB_DATABASE_URL,
 comparableContent,containsPlannerWork,contentFingerprint,createCloudDocument,
 decodeBase64Unicode,encodeBase64Unicode,fetchGithubDatabase,isCloudDocument,
 isStoredPlanner,readLocalDatabase,writeGithubDatabase
} from '../src/githubStore.ts';

const task={id:'t1',title:'GPX4 – ferroptosis 样品',start:'2026-10-23T10:30',duration:90,y:120,height:67,
 color:'#267a9c',project:'TNT',priority:'Normal',status:'Planned',prep:0,notes:'β-actin and GSH',checklist:[{text:'Prepare cells',done:true}],floating:false};
const stored={version:1,data:{tasks:[task],edges:[],questions:[{id:'q1',text:'Ask about 抗体',done:false,at:'2026-10-23T11:00',y:280,color:'#ffefb1'}],notes:'私人的研究笔记',tags:[]},
 archives:[{id:'w1',week:'2026-10-19',label:'Weekly snapshot',created:'2026-10-23T12:00:00Z',data:{tasks:[],edges:[],questions:[],notes:''},html:'<!doctype html>'}],revision:14,activeWeek:'2026-10-19'};

test('unicode and archived planner content round-trip through GitHub Base64',()=>{
 const document=createCloudDocument(stored,new Date('2026-10-23T12:00:00Z'));
 const uploaded=encodeBase64Unicode(JSON.stringify(document));
 const decoded=JSON.parse(decodeBase64Unicode(uploaded));
 assert.deepEqual(decoded,document);
 assert.equal(isCloudDocument(decoded),true);
 assert.equal(decoded.stored.archives[0].html,'<!doctype html>');
 assert.equal(containsPlannerWork(stored),true);
 assert.equal(isStoredPlanner(stored),true);
});

test('fingerprint ignores revision/derived HTML but includes all task and archive records',async()=>{
 const a=await contentFingerprint(stored);
 assert.equal(a,await contentFingerprint({...stored,revision:300,lastHTML:'re-rendered'}));
 assert.notEqual(a,await contentFingerprint({...stored,data:{...stored.data,tasks:[{...task,notes:'Changed'}]}}));
 assert.notEqual(a,await contentFingerprint({...stored,archives:[{...stored.archives[0],label:'Updated'}]}));
 assert.match(comparableContent(stored),/GPX4/);
});

test('local browser data remains readable and invalid data is rejected',()=>{
 const old=globalThis.localStorage;
 try{
  const map=new Map([[BROWSER_DATABASE_KEY,JSON.stringify(stored)]]);
  globalThis.localStorage={getItem:key=>map.get(key)||null};
  assert.deepEqual(readLocalDatabase(),stored);
  map.set(BROWSER_DATABASE_KEY,'{"version":1,"data":{"tasks":false}}');
  assert.throws(()=>readLocalDatabase(),/cannot be read safely/);
 }finally{globalThis.localStorage=old}
});

test('GitHub file fetch and optimistic write target separate data branch',async()=>{
 const old=globalThis.fetch,document=createCloudDocument(stored),calls=[];
 try{
  globalThis.fetch=async(url,init={})=>{
   calls.push({url,init});
   if(init.method==='PUT')return {ok:true,json:async()=>({content:{sha:'next-sha'}})};
   return {ok:true,json:async()=>({type:'file',sha:'previous-sha',content:encodeBase64Unicode(JSON.stringify(document))})};
  };
  const remote=await fetchGithubDatabase();
  assert.deepEqual(remote,{sha:'previous-sha',document});
  const saved=await writeGithubDatabase(document,'token-for-test','previous-sha');
  assert.equal(saved.sha,'next-sha');
  const body=JSON.parse(calls[1].init.body);
  assert.equal(body.branch,GITHUB_DATABASE_BRANCH);
  assert.equal(body.sha,'previous-sha');
  assert.equal(calls[1].url,GITHUB_DATABASE_URL);
  assert.deepEqual(JSON.parse(decodeBase64Unicode(body.content)),document);
  assert.equal(calls[1].init.headers.Authorization,'Bearer token-for-test');
 }finally{globalThis.fetch=old}
});

test('no cloud file returns null; concurrent changes reject a stale write',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({status:404,ok:false});
  assert.equal(await fetchGithubDatabase(),null);
  globalThis.fetch=async()=>({status:409,ok:false});
  await assert.rejects(writeGithubDatabase(createCloudDocument(stored),'test','stale-sha'),error=>error.status===409);
 }finally{globalThis.fetch=old}
});
