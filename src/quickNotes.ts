export type QuickNote={id:string,title:string,details:string};

// Separate from the planner database: that database is synced to a publicly
// readable GitHub branch. Quick references must not travel there implicitly.
export const QUICK_NOTES_STORAGE_KEY='vubio-planner-quick-notes-local-v1';

export function parseQuickNotes(value:unknown):QuickNote[]{
 if(!value||typeof value!=='object'||(value as any).version!==1||!Array.isArray((value as any).notes))throw Error('Incompatible quick notes');
 const notes=(value as any).notes as unknown[];
 if(!notes.every(note=>note&&typeof note==='object'&&typeof (note as any).id==='string'&&(note as any).id.length>0&&typeof (note as any).title==='string'&&typeof (note as any).details==='string'))throw Error('Invalid quick note');
 const result=notes as QuickNote[];
 if(new Set(result.map(note=>note.id)).size!==result.length)throw Error('Duplicate quick note');
 return result;
}

export function quickNoteDisplayTitle(note:Pick<QuickNote,'title'|'details'>):string{
 return note.title.trim()||note.details.trim().split(/\r?\n/,1)[0]||'Untitled note';
}
