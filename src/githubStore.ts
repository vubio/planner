import {validData} from './model.ts';

// The public website is built from main. Planner records are committed to a
// separate branch, so saving an experiment never rebuilds GitHub Pages.
export const GITHUB_DATABASE_BRANCH='planner-data';
export const GITHUB_DATABASE_PATH='planner.json';
export const GITHUB_DATABASE_URL=`https://api.github.com/repos/vubio/planner/contents/${GITHUB_DATABASE_PATH}`;
export const BROWSER_DATABASE_KEY='vubio-planner-v1';
export const GITHUB_TOKEN_KEY='vubio-planner-github-token-v1';
export const GITHUB_SYNC_META_KEY='vubio-planner-github-sync-v1';

export type PlannerStored={version:number,data:any,archives?:any[],revision?:number,activeWeek?:string,lastHTML?:string};
export type CloudDocument={kind:'vubio-planner-database',schemaVersion:1,savedAt:string,stored:PlannerStored};
export type RemoteDatabase={sha:string,document:CloudDocument};
export type SyncMetadata={sha:string,hash:string,savedAt:string};

export function readLocalDatabase():PlannerStored|null {
 const raw=localStorage.getItem(BROWSER_DATABASE_KEY);
 if(!raw)return null;
 const result=JSON.parse(raw);
 if(!isStoredPlanner(result))throw new Error('This browser has a planner database that cannot be read safely');
 return result;
}

export function isStoredPlanner(value:any):value is PlannerStored {
 return !!value&&value.version===1&&validData(value.data)&&
   (value.archives===undefined||(Array.isArray(value.archives)&&value.archives.every((a:any)=>a&&validData(a.data))));
}

export function containsPlannerWork(snapshot:PlannerStored|null):boolean {
 if(!snapshot)return false;
 const d=snapshot.data;
 return !!(d.tasks.length||d.edges.length||d.questions.length||d.tags?.length||d.notes?.trim()||snapshot.archives?.length);
}

// The local revision and generated HTML change during page initialization even
// when a person has not edited a task. Only compare actual user records.
export function comparableContent(snapshot:PlannerStored|null):string {
 if(!snapshot)return JSON.stringify({data:{tasks:[],edges:[],questions:[],notes:'',tags:[]},archives:[]});
 return JSON.stringify({data:snapshot.data,archives:snapshot.archives||[]});
}

export async function contentFingerprint(snapshot:PlannerStored|null):Promise<string> {
 const bytes=new TextEncoder().encode(comparableContent(snapshot));
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}

export function encodeBase64Unicode(value:string):string {
 const bytes=new TextEncoder().encode(value);
 let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}

export function decodeBase64Unicode(value:string):string {
 const binary=atob(value.replace(/\s/g,''));
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}

export function createCloudDocument(snapshot:PlannerStored,when=new Date()):CloudDocument {
 if(!isStoredPlanner(snapshot))throw new Error('Cannot upload an invalid planner database');
 return {kind:'vubio-planner-database',schemaVersion:1,savedAt:when.toISOString(),stored:snapshot};
}

export function isCloudDocument(value:any):value is CloudDocument {
 return !!value&&value.kind==='vubio-planner-database'&&value.schemaVersion===1&&
   typeof value.savedAt==='string'&&isStoredPlanner(value.stored);
}

export class GithubSyncError extends Error {
 readonly status:number;
 constructor(message:string,status:number){super(message);this.name='GithubSyncError';this.status=status}
}

const headers=(token?:string):HeadersInit=>({Accept:'application/vnd.github+json',...(token?{Authorization:`Bearer ${token}`}:{})});

export async function fetchGithubDatabase(token?:string):Promise<RemoteDatabase|null> {
 const response=await fetch(`${GITHUB_DATABASE_URL}?ref=${GITHUB_DATABASE_BRANCH}&_=${Date.now()}`,{
  method:'GET',headers:headers(token),cache:'no-store'
 });
 if(response.status===404)return null;
 if(!response.ok)throw new GithubSyncError(`GitHub could not load the database (HTTP ${response.status})`,response.status);
 const file=await response.json();
 if(file.type!=='file'||typeof file.sha!=='string')
  throw new Error('GitHub returned an unsupported database file');
 let encoded=file.content;
 // The Contents endpoint omits inline data for files over 1 MB. Read the
 // underlying Git blob instead so long-lived planners remain accessible.
 if(file.encoding==='none'||typeof encoded!=='string'||!encoded.length){
  const blob=await fetch(`https://api.github.com/repos/vubio/planner/git/blobs/${file.sha}`,{
   method:'GET',headers:headers(token),cache:'no-store'
  });
  if(!blob.ok)throw new GithubSyncError(`GitHub could not read the full database (HTTP ${blob.status})`,blob.status);
  const value=await blob.json();
  if(value.encoding!=='base64'||typeof value.content!=='string')throw new Error('GitHub returned an unsupported database encoding');
  encoded=value.content;
 }
 const doc=JSON.parse(decodeBase64Unicode(encoded));
 if(!isCloudDocument(doc))throw new Error('The GitHub planner database has an incompatible format');
 return {sha:file.sha,document:doc};
}

export async function writeGithubDatabase(document:CloudDocument,token:string,currentSha:string|null):Promise<RemoteDatabase> {
 const body={message:`Save planner database · ${new Date().toISOString()}`,
  content:encodeBase64Unicode(JSON.stringify(document)),branch:GITHUB_DATABASE_BRANCH,
  ...(currentSha?{sha:currentSha}:{})};
 const response=await fetch(GITHUB_DATABASE_URL,{method:'PUT',headers:{...headers(token),'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(response.status===409||response.status===422)throw new GithubSyncError('The GitHub database changed before this save. Your browser copy has been preserved.',409);
 if(!response.ok)throw new GithubSyncError(response.status===401||response.status===403
  ?`GitHub denied saving (HTTP ${response.status}). Check your token has Contents: Read and write for vubio/planner.`
  :`GitHub saving failed (HTTP ${response.status})`,response.status);
 const result=await response.json();
 if(typeof result.content?.sha!=='string')throw new Error('GitHub did not confirm the saved database file');
 return {sha:result.content.sha,document};
}

export async function checkGithubToken(token:string):Promise<string> {
 const response=await fetch('https://api.github.com/user',{method:'GET',headers:headers(token),cache:'no-store'});
 if(!response.ok)throw new GithubSyncError(`GitHub could not verify your token (HTTP ${response.status})`,response.status);
 const user=await response.json();
 if(typeof user.login!=='string')throw new Error('GitHub did not return an account name');
 return user.login;
}

export function readSyncMetadata():SyncMetadata|null {
 try{const v=JSON.parse(localStorage.getItem(GITHUB_SYNC_META_KEY)||'null');return v&&typeof v.sha==='string'&&typeof v.hash==='string'&&typeof v.savedAt==='string'?v:null}catch{return null}
}

export function writeSyncMetadata(meta:SyncMetadata){localStorage.setItem(GITHUB_SYNC_META_KEY,JSON.stringify(meta))}
