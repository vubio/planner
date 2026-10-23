import {useEffect,useRef,useState} from 'react';
import {Cloud,CloudOff,RefreshCw,CheckCircle2,AlertTriangle,X,ExternalLink} from 'lucide-react';
import {
 BROWSER_DATABASE_KEY,GITHUB_TOKEN_KEY,RemoteDatabase,SyncMetadata,
 checkGithubToken,containsPlannerWork,contentFingerprint,createCloudDocument,
 fetchGithubDatabase,GithubSyncError,readLocalDatabase,readSyncMetadata,
 writeGithubDatabase,writeSyncMetadata
} from './githubStore';

type SyncStatus='checking'|'empty'|'needs-upload'|'synced'|'pending'|'saving'|'remote-newer'|'conflict'|'offline'|'error';
type SyncState={remote:RemoteDatabase|null,syncedHash:string|null,ready:boolean,pushing:boolean,checking:boolean};

function storedToken(){try{return localStorage.getItem(GITHUB_TOKEN_KEY)||sessionStorage.getItem(GITHUB_TOKEN_KEY)||''}catch{return ''}}
function clock(iso:string){const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'recently'}
function exportBrowserSafetyCopy(content:string){const blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`vubio-planner-before-github-restore-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}

export default function GithubSyncPanel({loaded,revision,dirty,localSaveError}:{loaded:boolean,revision:number,dirty:boolean,localSaveError:boolean}){
 const [status,setStatus]=useState<SyncStatus>('checking'),[detail,setDetail]=useState(''),[open,setOpen]=useState(false);
 const [token,setToken]=useState(storedToken),[draft,setDraft]=useState(''),[remember,setRemember]=useState(()=>{try{return !sessionStorage.getItem(GITHUB_TOKEN_KEY)}catch{return true}});
 const [account,setAccount]=useState(''),[lastSaved,setLastSaved]=useState(''),[connecting,setConnecting]=useState(false);
 const state=useRef<SyncState>({remote:null,syncedHash:null,ready:false,pushing:false,checking:false});
 const statusRef=useRef(status);statusRef.current=status;
 const tokenRef=useRef(token);tokenRef.current=token;
 const saveTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const isMounted=useRef(true);

 const savedLabel=lastSaved?`GitHub saved · ${clock(lastSaved)}`:'Saved to GitHub';
 const labels:Record<SyncStatus,string>={
  checking:'Checking GitHub…',empty:'GitHub database is empty',
  'needs-upload':'Upload this planner to GitHub',synced:savedLabel,
  pending:'Not yet saved to GitHub',saving:'Saving to GitHub…',
  'remote-newer':'Newer GitHub copy available',conflict:'GitHub sync needs attention',
  offline:'GitHub offline · local copy safe',error:'GitHub save needs attention'
 };
 const displayed=localSaveError?'Browser save failed · GitHub not current':dirty&&status==='synced'?'Saving locally · GitHub pending':labels[status];
 const alarm=localSaveError||['pending','remote-newer','conflict','offline','error','needs-upload'].includes(status);

 function setSynced(remote:RemoteDatabase,hash:string){
  const meta:SyncMetadata={sha:remote.sha,hash,savedAt:remote.document.savedAt};
  writeSyncMetadata(meta);
  state.current.remote=remote;state.current.syncedHash=hash;state.current.ready=true;
  setLastSaved(remote.document.savedAt);setStatus('synced');setDetail('All tasks, notes, connections, tags, and weekly archives are in GitHub.');
 }

 async function restoreFromGithub(remote:RemoteDatabase,automatic=false){
  const existing=readLocalDatabase();
  if(!automatic&&containsPlannerWork(existing)){
   if(!confirm('Load the GitHub planner? A JSON backup of this browser’s current work will download first. The GitHub copy will replace the active browser view.'))return;
   exportBrowserSafetyCopy(JSON.stringify(existing,null,2));
  }
  const hash=await contentFingerprint(remote.document.stored);
  // First record the remote identity; after reload, automatic browser saving
  // cannot mistake this restored state for an unrelated local edit.
  writeSyncMetadata({sha:remote.sha,hash,savedAt:remote.document.savedAt});
  localStorage.setItem(BROWSER_DATABASE_KEY,JSON.stringify(remote.document.stored));
  window.location.reload();
 }

 async function inspectGithub(){
  if(!loaded||state.current.checking||state.current.pushing||localSaveError)return;
  state.current.checking=true;
  if(statusRef.current!=='pending'&&statusRef.current!=='saving')setStatus('checking');
  try{
   const existing=readLocalDatabase(),localHash=await contentFingerprint(existing);
   const remote=await fetchGithubDatabase();
   if(!isMounted.current)return;
   state.current.remote=remote;
   if(!remote){
    state.current.ready=false;
    setStatus(containsPlannerWork(existing)?'needs-upload':'empty');
    setDetail('No planner.json exists on the planner-data branch yet. Your browser database has not been touched.');
    return;
   }
   const remoteHash=await contentFingerprint(remote.document.stored),meta=readSyncMetadata();
   setLastSaved(remote.document.savedAt);
   if(localHash===remoteHash){setSynced(remote,localHash);return}
   if(!containsPlannerWork(existing)){
    await restoreFromGithub(remote,true);
    return;
   }
   if(meta?.sha===remote.sha&&meta.hash===remoteHash){
    // This browser changed after its last successful GitHub save.
    state.current.syncedHash=remoteHash;state.current.ready=true;
    setStatus('pending');setDetail('This browser has changes that have not reached GitHub. The browser copy is safe.');
    if(tokenRef.current)queueUpload();
    return;
   }
   if(meta?.hash===localHash&&meta.sha!==remote.sha){
    // The browser has made no local edits since its last confirmed save.
    // It can safely move forward to the version uploaded from another device.
    await restoreFromGithub(remote,true);
    return;
   }
   state.current.ready=false;setStatus('conflict');
   setDetail('Both this browser and GitHub contain different work. Neither has been overwritten. Select which version to keep.');
  }catch(e:any){
   if(!isMounted.current)return;
   state.current.ready=false;setStatus(e instanceof TypeError?'offline':'error');
   setDetail(`${e?.message||'Could not reach GitHub'}. Your browser data is unchanged.`);
  }finally{state.current.checking=false}
 }

 function queueUpload(){
  if(saveTimer.current)clearTimeout(saveTimer.current);
  if(!state.current.pushing){
   setStatus('pending');
   setDetail('Changes are saved in this browser and queued for GitHub. Keep this tab open until the green confirmation appears.');
  }
  saveTimer.current=setTimeout(()=>{void uploadBrowser(false)},1700);
 }

 async function uploadBrowser(manual:boolean){
  if(state.current.pushing||localSaveError)return;
  if(!manual&&!state.current.ready)return;
  const key=tokenRef.current;
  if(!key){setStatus('pending');setDetail('Connect GitHub once on this computer to allow saving changes.');if(manual)setOpen(true);return}
  let attemptedHash='';
  state.current.pushing=true;setStatus('saving');setDetail('Writing the complete database and weekly archives to GitHub…');
  try{
   const local=readLocalDatabase();
   if(!local)throw new Error('There is no saved browser database to upload');
   const remote=state.current.remote;
   if(remote&&containsPlannerWork(remote.document.stored)&&!containsPlannerWork(local))
    throw new Error('An empty local planner cannot automatically replace a nonempty GitHub database. Recover or export your browser data first.');
   attemptedHash=await contentFingerprint(local);
   if(remote&&attemptedHash===await contentFingerprint(remote.document.stored)){
    setSynced(remote,attemptedHash);return;
   }
   const saved=await writeGithubDatabase(createCloudDocument(local),key,remote?.sha||null);
   if(!isMounted.current)return;
   setSynced(saved,attemptedHash);
  }catch(e:any){
   if(!isMounted.current)return;
   state.current.ready=false;
   if(e instanceof GithubSyncError&&e.status===409){
    setStatus('conflict');setDetail('GitHub changed while this save was running. Your browser copy is preserved. Click Check GitHub to review both versions.');
   }else{
    setStatus(e instanceof TypeError?'offline':'error');
    setDetail(`${e?.message||'Could not save to GitHub'}. Your browser copy is still saved locally.`);
   }
  }finally{
   state.current.pushing=false;
   // A user may have edited again while GitHub was uploading the older
   // revision. Detect that and queue one more upload after this finishes.
   if(attemptedHash&&state.current.ready&&tokenRef.current){
    try{const latest=await contentFingerprint(readLocalDatabase());if(latest!==attemptedHash)queueUpload()}catch{}
   }
  }
 }

 async function connect(){
  const next=draft.trim();
  if(!next){setDetail('Paste a fine-grained GitHub personal access token first.');return}
  setConnecting(true);setDetail('Checking the GitHub credential…');
  try{
   const login=await checkGithubToken(next);
   if(remember){localStorage.setItem(GITHUB_TOKEN_KEY,next);sessionStorage.removeItem(GITHUB_TOKEN_KEY)}
   else{sessionStorage.setItem(GITHUB_TOKEN_KEY,next);localStorage.removeItem(GITHUB_TOKEN_KEY)}
   tokenRef.current=next;setToken(next);setAccount(login);setDraft('');
   setDetail(`Connected as ${login}. Your credential is kept on this device, not in the website code or planner.json.`);
   if(state.current.ready&&statusRef.current==='pending')queueUpload();
  }catch(e:any){setDetail(e?.message||'Could not connect to GitHub')}
  finally{setConnecting(false)}
 }

 function disconnect(){
  localStorage.removeItem(GITHUB_TOKEN_KEY);sessionStorage.removeItem(GITHUB_TOKEN_KEY);
  tokenRef.current='';setToken('');setAccount('');setDetail('GitHub writing disconnected on this device. Public saved records are still readable.');
 }

 async function manualUpload(){
  if(state.current.remote){
   if(!confirm('Replace the GitHub planner with this browser’s version? The previous version remains recoverable through Git history.'))return;
   try{state.current.remote=await fetchGithubDatabase()}catch(e:any){setDetail(e?.message||'Cannot check the current GitHub version');return}
  }else if(!confirm('Upload this browser’s complete planner database to GitHub for the first time?'))return;
  await uploadBrowser(true);
 }

 async function manualRestore(){
  setDetail('Checking GitHub for its newest planner version…');
  try{
   // Always refresh before restore: a concurrent save may have made the
   // previous cached SHA stale, especially after a 409 conflict.
   const latest=await fetchGithubDatabase();
   state.current.remote=latest;
   if(!latest){setStatus('needs-upload');setDetail('GitHub has no database to load yet. The browser database is untouched.');return}
   await restoreFromGithub(latest);
  }catch(e:any){setStatus(e instanceof TypeError?'offline':'error');setDetail(`${e?.message||'Could not load GitHub'}. Your browser data is unchanged.`)}
 }

 useEffect(()=>{isMounted.current=true;return()=>{isMounted.current=false;if(saveTimer.current)clearTimeout(saveTimer.current)}},[]);
 useEffect(()=>{if(loaded)void inspectGithub()},[loaded]);
 useEffect(()=>{
  if(!loaded||!state.current.ready)return;
  if(revision>0){
   // inspectGithub has already compared the latest local/remote versions.
   if(tokenRef.current)queueUpload();
   else if(statusRef.current==='synced'){setStatus('pending');setDetail('Saved in this browser; connect GitHub to upload these changes.')}
  }
 },[revision,loaded]);
 useEffect(()=>{
  if(!loaded)return;
  const refresh=()=>{if(document.visibilityState!=='hidden'&&!dirty&&!state.current.pushing&&['synced','remote-newer','conflict','offline','error'].includes(statusRef.current))void inspectGithub()};
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const timer=setInterval(refresh,300000);
  return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);clearInterval(timer)};
 },[loaded,dirty]);

 return <div className="github-sync-widget">
  <button type="button" className={'github-sync-indicator github-'+(localSaveError?'local-error':status)} onClick={()=>setOpen(true)} title={`${displayed}. Click to open GitHub sync settings.`} aria-label={`GitHub cloud status: ${displayed}`}>
   {status==='synced'&&!dirty?<CheckCircle2 size={15}/>:status==='offline'?<CloudOff size={15}/>:alarm?<AlertTriangle size={15}/>:<Cloud size={15}/>}
   <span>{displayed}</span>
  </button>
  {open&&<div className="overlay" onClick={()=>setOpen(false)}><section className="modal github-sync-modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="github-sync-title">
   <div className="modal-heading"><h2 id="github-sync-title">GitHub database sync</h2><button onClick={()=>setOpen(false)} aria-label="Close GitHub settings"><X/></button></div>
   <p className="github-sync-description">Your complete planner is saved locally first. GitHub stores the shared copy in the <a href="https://github.com/vubio/planner/tree/planner-data" target="_blank" rel="noreferrer">planner-data branch <ExternalLink size={12}/></a>, separate from the website code.</p>
   <div className={'github-sync-state github-'+(localSaveError?'local-error':status)}><strong>{displayed}</strong><small>{localSaveError?'Resolve the browser saving warning and export a backup before attempting cloud synchronization.':detail||'Checking the latest database…'}</small></div>
   {(status==='needs-upload'||status==='empty')&&<div className="github-sync-callout"><strong>First-time setup</strong><p>Your lab browser data is still here. Connect GitHub below, then click <em>Upload this browser</em> to create its first cloud backup. Nothing will be erased.</p></div>}
   {(status==='remote-newer'||status==='conflict')&&<div className="github-sync-callout"><strong>Two versions found</strong><p>Load the GitHub copy to see the newest shared data. A JSON backup of this browser will download before its active view is replaced.</p></div>}
   <div className="github-sync-actions">
    <button className="github-primary-action" disabled={localSaveError||dirty||status==='checking'||status==='saving'||!state.current.remote} onClick={()=>void manualRestore()}>Load latest GitHub copy</button>
    <button disabled={localSaveError||dirty||status==='checking'||status==='saving'||!token} onClick={()=>void manualUpload()}>Upload this browser</button>
    <button onClick={()=>void inspectGithub()} disabled={localSaveError||status==='checking'||status==='saving'}><RefreshCw size={14}/> Check GitHub</button>
   </div>
   <div className="github-auth"><div className="github-auth-title"><strong>Allow saving from this computer</strong>{token&&<span>Connected{account?` as ${account}`:''}</span>}</div>
    <p>GitHub requires authorization to write. Create a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">fine-grained access token <ExternalLink size={12}/></a> with access to <code>vubio/planner</code> only and repository <strong>Contents → Read and write</strong>. No other permissions are needed.</p>
    {token?<button onClick={disconnect}>Disconnect writing on this computer</button>:<>
     <label className="github-token-label" htmlFor="github-token-input">GitHub token</label>
     <input id="github-token-input" type="password" autoComplete="off" placeholder="github_pat_…" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void connect()}}/>
     <label className="github-remember"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember on this device (stored in this browser)</label>
     <button className="github-primary-action" onClick={()=>void connect()} disabled={connecting||!draft.trim()}>{connecting?'Checking…':'Connect GitHub'}</button>
    </>}
   </div>
   <p className="github-sync-footnote">The public repository means the planner database is publicly readable. The token is never included in GitHub commits. In a browser without a token, you can still view the GitHub planner and make local changes; uploading edits requires authorization.</p>
  </section></div>}
 </div>
}
