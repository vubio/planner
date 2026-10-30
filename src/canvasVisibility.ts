export const taskVisibleOnCanvas=(task:{id:string,status:string},hiddenIds:readonly string[],unfinishedOnly:boolean)=>
 !hiddenIds.includes(task.id)&&(!unfinishedOnly||task.status!=='Done');

export const noteVisibleOnCanvas=(note:{done:boolean,pinned?:boolean,at?:string},unfinishedOnly:boolean)=>
 note.pinned!==false&&!!note.at&&Number.isFinite(new Date(note.at).getTime())&&(!unfinishedOnly||!note.done);
