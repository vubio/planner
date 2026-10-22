import React from 'react';
import {createRoot} from 'react-dom/client';
import Planner from './Planner';
import DrivePanel from './DrivePanel';
import {useState} from 'react';
import './style.css';
function App(){
 const [driveOpen,setDriveOpen]=useState(false);
 return <><Planner/><button type="button" onClick={()=>setDriveOpen(true)} style={{position:'fixed',bottom:16,right:16,zIndex:30,background:'#355b47',color:'white',borderRadius:30,padding:'12px 18px',boxShadow:'0 4px 18px #1e3c2b50',fontWeight:700}}>☁ Google Drive</button>{driveOpen&&<DrivePanel close={()=>setDriveOpen(false)} saveCurrent={async()=>{await new Promise(resolve=>setTimeout(resolve,1400));return !!localStorage.getItem('vubio-planner-v1')}}/>}</>;
}
createRoot(document.getElementById('root')!).render(<App/>);
