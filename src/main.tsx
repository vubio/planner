import React from 'react';
import {createRoot} from 'react-dom/client';
import Planner from './Planner';
import DrivePanel from './DrivePanel';
import {useState} from 'react';
import './style.css';
function App(){
 const [driveOpen,setDriveOpen]=useState(false);
 return <><Planner/><button type="button" className="drive-sync-launcher" aria-label="Google Drive backup and sync" onClick={()=>setDriveOpen(true)}>☁ Google Drive</button>{driveOpen&&<DrivePanel close={()=>setDriveOpen(false)} saveCurrent={async()=>{await new Promise(resolve=>setTimeout(resolve,1400));return !!localStorage.getItem('vubio-planner-v1')}}/>}</>;
}
createRoot(document.getElementById('root')!).render(<App/>);
