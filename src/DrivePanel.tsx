import {useState} from 'react';
import {validData} from './model';

const CONFIG_KEY='vubio-planner-google-client-id';
const STORE_KEY='vubio-planner-v1';
const SCOPE='https://www.googleapis.com/auth/drive.appdata';
const NAME='vubio-experiment-planner.json';

type Saved={version:number,data:unknown,revision:number,archives:unknown[],activeWeek?:string,lastHTML?:string};
type OAuthClient={requestAccessToken:(options:{prompt?:string})=>void};
declare global {interface Window {google?:{accounts:{oauth2:{initTokenClient:(config:{client_id:string,scope:string,callback:(result:{access_token?:string,error?:string})=>void})=>OAuthClient,revoke:(token:string,done:()=>void)=>void}}}}}

function downloadBackup(value:Saved){
 const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='planner-before-drive-restore-'+new Date().toISOString().slice(0,10)+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function loadGoogleScript(){
 if(window.google?.accounts.oauth2)return;
 await new Promise<void>((resolve,reject)=>{
  const element=document.createElement('script');element.src='https://accounts.google.com/gsi/client';
  element.async=true;element.onload=()=>resolve();element.onerror=()=>reject(new Error('Could not load Google sign-in'));
  document.head.appendChild(element);
 });
}

export default function DrivePanel({close,saveCurrent}:{close:()=>void,saveCurrent:()=>Promise<boolean>}){
 const [clientId,setClientId]=useState(()=>localStorage.getItem(CONFIG_KEY)||'');
 const [token,setToken]=useState('');const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState('Google Drive is disconnected. Your existing browser data is unchanged.');
 const origin=location.origin;
 const request=async(uri:string,opts:RequestInit={})=>{
  if(!token)throw Error('Connect your Google account first.');
  const response=await fetch(uri,{...opts,headers:{Authorization:`Bearer ${token}`,...opts.headers}});
  if(!response.ok)throw Error(`Google Drive returned HTTP ${response.status}: ${(await response.text()).slice(0,300)}`);
  return response.json();
 };
 const locate=async()=>{
  const data=await request('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name),nextPageToken&pageSize=100');
  return (data.files||[]).find((file:{id:string,name:string})=>file.name===NAME) as {id:string}|undefined;
 };
 const connect=async()=>{
  const id=clientId.trim();if(!id.endsWith('.apps.googleusercontent.com')){setStatus('Please enter a valid OAuth web client ID.');return;}
  localStorage.setItem(CONFIG_KEY,id);
  try{await loadGoogleScript();window.google!.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPE,callback:result=>{
   if(result.error||!result.access_token){setStatus('Google connection failed: '+(result.error||'No token returned'));return;}
   setToken(result.access_token);setStatus('Connected. Choose upload or restore below. Sync is manual.');
  }}).requestAccessToken({prompt:'consent'})}catch(e){setStatus(String(e))}
 };
 const upload=async()=>{
  if(!confirm('Upload this browser’s planner to Google Drive? This replaces the previous Drive copy.'))return;
  setBusy(true);try{
   if(!await saveCurrent())throw Error('Local save did not complete. Nothing uploaded.');
   const local=localStorage.getItem(STORE_KEY);if(!local)throw Error('No saved planner found.');
   const existing=await locate();const boundary='vubio'+Math.random().toString(36).slice(2);
   const metadata=existing?{name:NAME}:{name:NAME,parents:['appDataFolder']};
   const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${local}\r\n--${boundary}--`;
   await request('https://www.googleapis.com/upload/drive/v3/files'+(existing?'/'+existing.id:'')+'?uploadType=multipart&fields=id',{method:existing?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
   setStatus('Uploaded successfully. Other computers can now restore this copy.');
  }catch(e){setStatus('Upload failed: '+String(e))}finally{setBusy(false)}
 };
 const restore=async()=>{
  setBusy(true);try{
   const file=await locate();if(!file)throw Error('There is no planner backup in this Google Drive app folder.');
   const remote=await request('https://www.googleapis.com/drive/v3/files/'+file.id+'?alt=media') as Saved;
   if(!remote||!validData(remote.data)||!Array.isArray(remote.archives))throw Error('Drive file is not a valid planner backup.');
   if(!confirm('Replace this browser’s planner with the Drive version? A local JSON backup will download first. Unsaved edits could be lost.'))return;
   const existing=localStorage.getItem(STORE_KEY);if(existing)downloadBackup(JSON.parse(existing));
   localStorage.setItem(STORE_KEY,JSON.stringify(remote));
   location.reload();
  }catch(e){setStatus('Restore failed: '+String(e))}finally{setBusy(false)}
 };
 return <div className="overlay" onClick={close}><section className="modal" onClick={event=>event.stopPropagation()} style={{maxWidth:560}}>
  <div className="modal-heading"><h2>Google Drive backup & sync</h2><button onClick={close} aria-label="Close">×</button></div>
  <p>Keep a private copy of your experiment planner in your own Google Drive. Only the app-specific hidden folder is accessible. Your GitHub repository never contains task data.</p>
  <label className="detail-label">Google OAuth web client ID<input value={clientId} onChange={e=>setClientId(e.target.value)} placeholder="123456.apps.googleusercontent.com"/></label>
  <p style={{fontSize:12,lineHeight:1.6}}>Set up the Google Drive API and a Web application OAuth client in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console</a>. Add <strong>{origin}</strong> as an authorized JavaScript origin. See the repository README for the full steps. Never enter a client secret.</p>
  <button className="primary" onClick={connect} disabled={busy}>{token?'Reconnect Google':'Connect Google Drive'}</button>
  <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}><button onClick={upload} disabled={!token||busy}>↑ Upload this planner</button><button onClick={restore} disabled={!token||busy}>↓ Restore from Drive</button><button onClick={()=>{if(token)window.google?.accounts.oauth2.revoke(token,()=>{});setToken('');setStatus('Disconnected. Local data stays here.')}} disabled={!token||busy}>Disconnect</button></div>
  <p role="status" style={{marginTop:13,fontSize:12}}>{busy?'Working… ':''}{status}</p>
  <p style={{fontSize:12,lineHeight:1.6}}>This first version uses manual backup/restore, not automatic two-way merging. Upload before moving to another computer; restore on the other computer before editing.</p>
 </section></div>
}
