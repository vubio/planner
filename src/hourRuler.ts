/** Display compact 12-hour ruler labels without minutes or repeated AM/PM. */
export function hourLabel12(hour24:number):string{
 const normalized=((hour24%24)+24)%24;
 return String(normalized%12||12);
}
export type HalfDayBand={label:'AM'|'PM',offset:number,duration:number};
/** Visible half-day segments within the daytime (7–21) or overnight (0–24) ruler. */
export function halfDayBands(startHour:number,totalHours:number):HalfDayBand[]{
 const bands:HalfDayBand[]=[];
 const end=startHour+totalHours;
 for(let hour=startHour;hour<end;){
  const next=Math.min(end,hour<12?12:24);
  bands.push({label:hour<12?'AM':'PM',offset:hour-startHour,duration:next-hour});
  hour=next;
 }
 return bands;
}
