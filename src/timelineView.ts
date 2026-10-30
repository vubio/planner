export type TimelineView = 'week' | 'three' | 'day';

// The weekly viewport fits the workweek. Saturday and Sunday remain on the
// scrollable timeline for tasks that fall outside regular workdays.
export const visibleDayCount = (view: TimelineView): number =>
  view === 'week' ? 5 : view === 'three' ? 3 : 1;

export const isWeekend = (date: Date): boolean =>
  date.getDay() === 0 || date.getDay() === 6;
