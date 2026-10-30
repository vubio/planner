export type NoteOrder = 'original' | 'time' | 'color';

export type InboxNote = {id:string;done:boolean;at?:string;color?:string;pinned?:boolean};

/** Keep the stored note order unchanged; sorting is a view-only operation. */
export function visiblePinnedNotes<T extends InboxNote>(notes:readonly T[],pendingOnly:boolean,order:NoteOrder,palette:readonly string[]):T[]{
 const visible=notes.filter(note=>!pendingOnly||!note.done);
 if(order==='original')return visible;
 const pinnedTime=(note:T)=>{
  if(note.pinned===false)return Number.POSITIVE_INFINITY;
  const value=note.at?new Date(note.at).getTime():NaN;
  return Number.isFinite(value)?value:Number.POSITIVE_INFINITY;
 };
 if(order==='time')return visible.sort((a,b)=>pinnedTime(a)-pinnedTime(b));
 const colorRank=(note:T)=>{
  const index=palette.indexOf(note.color||palette[0]);
  return index<0?palette.length:index;
 };
 return visible.sort((a,b)=>colorRank(a)-colorRank(b)||
  (a.color||'').localeCompare(b.color||'')||pinnedTime(a)-pinnedTime(b));
}
