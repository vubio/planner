export const taskVisibleOnCanvas=(task:{id:string,status:string},hiddenIds:readonly string[],unfinishedOnly:boolean)=>
 !hiddenIds.includes(task.id)&&(!unfinishedOnly||task.status!=='Done');

export const noteVisibleOnCanvas=(note:{done:boolean,pinned?:boolean,at?:string},unfinishedOnly:boolean)=>
 note.pinned!==false&&!!note.at&&Number.isFinite(new Date(note.at).getTime())&&(!unfinishedOnly||!note.done);

// A connection is visually completed as soon as either endpoint is done.
// This is display-only: it does not change the arrow or either task's status.
export const connectionVisuallyDone=(source:{status:string},target:{status:string})=>
 source.status==='Done'||target.status==='Done';
