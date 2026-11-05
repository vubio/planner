import {useEffect,useState,type FormEvent} from 'react';
import {Plus,StickyNote,X} from 'lucide-react';
import {quickNoteDisplayTitle,type QuickNote} from './quickNotes';
const noteId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),value=>value.toString(16).padStart(2,'0')).join('');

export default function QuickNotesPanel({notes,onChange}:{notes:QuickNote[],onChange:(notes:QuickNote[])=>void}){
 const [editing,setEditing]=useState<QuickNote|null>(null);
 const [showList,setShowList]=useState(false);
 const openNew=()=>setEditing({id:noteId(),title:'',details:''});
 const persist=(next:QuickNote[])=>{onChange(next);setEditing(null)};
 const submit=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(!editing||!(editing.title.trim()||editing.details.trim()))return;
  const note={...editing,title:editing.title.trim(),details:editing.details.trim()};
  const found=notes.some(item=>item.id===note.id);
  persist(found?notes.map(item=>item.id===note.id?note:item):[...notes,note]);
 };
 const deleteNote=()=>{
  if(!editing||!notes.some(note=>note.id===editing.id))return;
  if(confirm('Delete this quick note?'))persist(notes.filter(note=>note.id!==editing.id));
 };
 useEffect(()=>{
  if(!editing&&!showList)return;
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setEditing(null);setShowList(false)}};
  window.addEventListener('keydown',escape);
  return()=>window.removeEventListener('keydown',escape);
 },[editing,showList]);

 const notesList=<div className="quick-notes-list" role="list" aria-label="Quick notes">
  {notes.map(note=><div role="listitem" key={note.id}>
   <button className="quick-note-row" type="button" title={`${quickNoteDisplayTitle(note)} · Double-click to open`} aria-label={`Open ${quickNoteDisplayTitle(note)}`}
    onDoubleClick={()=>setEditing({...note})} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setEditing({...note})}}}>
     <StickyNote size={13}/><span>{quickNoteDisplayTitle(note)}</span>
    </button>
   </div>)}
  {!notes.length&&<div className="quick-notes-empty">Addresses, catalog numbers, and other handy references.</div>}
 </div>;

 return <>
  <section className="sidebar-quick-notes" aria-label="Quick notes">
   <div className="quick-notes-heading"><h3><StickyNote size={14}/> QUICK NOTES <small>{notes.length||''}</small></h3>
    <button className="quick-note-add" type="button" onClick={openNew} title="Add quick note" aria-label="Add quick note"><Plus size={16}/></button>
   </div>
   {notesList}
   <small className="quick-notes-local">Included in planner sync · Double-click to open</small>
  </section>
  <button className="quick-notes-mobile" type="button" onClick={()=>setShowList(true)} title="Quick notes" aria-label="Open quick notes"><StickyNote size={18}/></button>
  {showList&&<div className="overlay quick-note-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setShowList(false)}}>
   <section className="modal quick-notes-mobile-modal" role="dialog" aria-modal="true" aria-label="Quick notes">
    <div className="modal-heading"><h2>Quick notes</h2><button onClick={()=>setShowList(false)} aria-label="Close quick notes"><X size={18}/></button></div>
    {notesList}
    <div className="modal-footer"><small>Included in planner sync</small><button className="primary" onClick={()=>{setShowList(false);openNew()}}><Plus size={15}/> Add note</button></div>
   </section>
  </div>}
  {editing&&<div className="overlay quick-note-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setEditing(null)}}>
   <form className="modal quick-note-modal" role="dialog" aria-modal="true" aria-label="Quick note" onSubmit={submit} onClick={event=>event.stopPropagation()}>
    <div className="modal-heading"><h2>Quick note</h2><button type="button" onClick={()=>setEditing(null)} aria-label="Close quick note"><X size={18}/></button></div>
    <label className="detail-label">Name
     <input autoFocus value={editing.title} maxLength={160} placeholder="e.g. Shipping address" onChange={event=>setEditing({...editing,title:event.target.value})}/>
    </label>
    <label className="detail-label quick-note-detail-label">Details
     <textarea value={editing.details} rows={7} placeholder="Write or paste the information here…" onChange={event=>setEditing({...editing,details:event.target.value})}/>
    </label>
    <p className="quick-note-privacy">Saved with your planner and synced to a publicly readable GitHub branch. Do not store passwords or private information here.</p>
    <div className="modal-footer">
     {notes.some(note=>note.id===editing.id)?<button type="button" className="danger" onClick={deleteNote}>Delete note</button>:<span/>}
     <button className="primary" type="submit" disabled={!(editing.title.trim()||editing.details.trim())}>Save note</button>
    </div>
   </form>
  </div>}
 </>;
}
