/**
 * Estimates refer to approved, accepted plan units, never raw/unmapped PR counts.
 * The primary bar is elapsed calendar time / (elapsed + adaptive remaining
 * calendar time). It is NOT a second work-completion percentage.
 *
 * Source timestamps must come from recorded GitHub events (never sync time).
 * No evidence -> no date. Forecasts are descriptive, not commitments.
 */
export type CompletionEvent = {
  openedAt?: string | null;
  completedAt: string;
};
export type TimeEvidence = {
  startedAt?: string | null;
  startBasis?: "repository-created" | "first-pr";
  syncedAt?: string | null;
  accepted: readonly CompletionEvent[];
};
export type TimeForecast = {
  state: "unavailable" | "forecast" | "complete";
  reason?: string;
  asOf: string;
  startBasis?: TimeEvidence["startBasis"];
  startedAt: string | null;
  syncedAt: string | null;
  elapsedDays: number | null;
  timePercent: number | null;
  calendarRemainingDays: number | null;
  calendarFinishAt: string | null;
  prCycleRemainingDays: number | null;
  prCycleFinishAt: string | null;
  parallelPrSlots: number | null;
  sampleSize: number;
  confidence: "limited" | "developing" | "established" | null;
};
const DAY = 86400000;
const MAX_DAYS = 365.25 * 100;
const safe = (n: number) => Number.isFinite(n) && n >= 0 && n <= MAX_DAYS;
const rounded = (n: number) => Math.round(n * 10) / 10;
function instant(value?: string | null): number | null {
  if (!value || !/^\d{4}-\d\d-\d\dT/.test(value)) return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}
function finish(now: number, days: number): string | null {
  const when = now + days * DAY;
  return Number.isFinite(when) && Number.isFinite(new Date(when).valueOf()) ? new Date(when).toISOString() : null;
}
function median(data: number[]): number {
  const sorted = [...data].sort((a,b)=>a-b);
  const mid = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid])/2;
}
function overlappingPrSlots(events: {opened: number; done: number}[]): number {
  // Observed overlapping PR lifecycles are a proxy for work lanes, NOT an
  // assertion about currently logged-in agents or uninterrupted work.
  const points = events.flatMap(e=>[{at:e.opened,delta:1},{at:e.done,delta:-1}]);
  points.sort((a,b)=>a.at-b.at || a.delta-b.delta);
  let active=0, peak=1;
  for (const point of points) { active+=point.delta; peak=Math.max(peak,active); }
  return Math.max(1, Math.min(peak, events.length));
}

export function estimateTimeCompletion(
  progress: { planned: number; completed: number },
  evidence: TimeEvidence | null | undefined,
  asOf: string
): TimeForecast {
  const now = instant(asOf);
  const start = instant(evidence?.startedAt);
  const base: TimeForecast = {
    state:"unavailable", asOf, startedAt:start===null?null:new Date(start).toISOString(),
    startBasis:evidence?.startBasis, syncedAt:evidence?.syncedAt ?? null,
    elapsedDays:now!==null&&start!==null&&start<=now?rounded((now-start)/DAY):null,
    timePercent:null, calendarRemainingDays:null,calendarFinishAt:null,
    prCycleRemainingDays:null,prCycleFinishAt:null,parallelPrSlots:null,
    sampleSize:0,confidence:null
  };
  if (!Number.isSafeInteger(progress.planned) || progress.planned <= 0 ||
    !Number.isSafeInteger(progress.completed) || progress.completed < 0 ||
    progress.completed > progress.planned || now===null) {
    return {...base,reason:"An approved, valid plan and an observation time are required."};
  }
  if (progress.completed === progress.planned) {
    return {...base,state:"complete",timePercent:100,calendarRemainingDays:0,
      prCycleRemainingDays:0,calendarFinishAt:asOf,prCycleFinishAt:asOf,
      confidence:null,reason:"All approved units are merged; production acceptance is separate."};
  }
  if (progress.completed===0) return {...base,reason:"No accepted planned units to measure delivery pace."};
  if (start===null || start>=now) return {...base,reason:"Project start is not verified by GitHub history."};
  const elapsed=(now-start)/DAY;
  if (!safe(elapsed) || elapsed===0) return {...base,reason:"Project age is outside the supported range."};

  const completed = (evidence?.accepted ?? []).map(event=>({
    done:instant(event.completedAt),opened:instant(event.openedAt)
  })).filter((e):e is {done:number;opened:number|null}=>e.done!==null && e.done>=start && e.done<=now)
    .sort((a,b)=>a.done-b.done);
  if (!completed.length) return {...base,reason:"Accepted work has no verified merge timestamps."};

  // Lifetime calendar pace includes blockers, staffing gaps and idle periods.
  // Adjust it with recent accepted-work velocity so improvement or slowdown
  // changes the total-time denominator, not just the milestone bar.
  const lifetimeDaysPerUnit=elapsed/progress.completed;
  let recentDaysPerUnit=lifetimeDaysPerUnit;
  let weight=0;
  if (completed.length>=3) {
    const recent=completed.slice(-Math.min(completed.length,6));
    const period=(now-recent[0].done)/DAY;
    if (period>0) {
      recentDaysPerUnit=Math.max(1/24,period/(recent.length-1));
      weight=Math.min(0.7,(recent.length-1)*0.14);
    }
  }
  const calendarPerUnit=lifetimeDaysPerUnit*(1-weight)+recentDaysPerUnit*weight;
  const remaining=progress.planned-progress.completed;
  const calendarDays=calendarPerUnit*remaining;
  if (!safe(calendarDays)) return {...base,reason:"Calendar projection exceeds the supported horizon."};
  const calendarFinishAt=finish(now,calendarDays);
  if (!calendarFinishAt) return {...base,reason:"Invalid calendar projection."};
  const timePercent=rounded(100*elapsed/(elapsed+calendarDays));

  // This second model uses PR creation-to-merge cycles, not time since project
  // inception. It is optimistic when workflows are blocked or capacity falls.
  const cycles=completed.filter(e=>e.opened!==null && e.opened>=start && e.opened<e.done)
    .slice(-12).map(e=>({opened:e.opened!,done:e.done}));
  const cycleDays=cycles.map(e=>(e.done-e.opened)/DAY).filter(x=>safe(x)&&x>0);
  const parallelPrSlots=cycleDays.length?overlappingPrSlots(cycles):null;
  const prDays=cycleDays.length ? median(cycleDays)*remaining/(parallelPrSlots??1):null;
  const validPrDays=prDays!==null && safe(prDays)?prDays:null;
  const size=completed.length;
  return {...base,state:"forecast",sampleSize:size,
    confidence:size>=8?"established":size>=3?"developing":"limited",
    elapsedDays:rounded(elapsed),timePercent,
    calendarRemainingDays:rounded(calendarDays),calendarFinishAt,
    prCycleRemainingDays:validPrDays===null?null:rounded(validPrDays),
    prCycleFinishAt:validPrDays===null?null:finish(now,validPrDays),
    parallelPrSlots};
}

/** All constituent projects must finish; concurrent project durations do not add. */
export function aggregateTimeCompletion(
  forecasts: readonly (TimeForecast | null | undefined)[],
  asOf: string
): TimeForecast | null {
  if (!forecasts.length) return null;
  const known=forecasts.filter((f):f is TimeForecast=>!!f);
  if(known.length!==forecasts.length || known.some(f=>f.state==="unavailable"))
    return {...estimateTimeCompletion({planned:0,completed:0},null,asOf),
      reason:"Not all projects have sufficient verified completion evidence."};
  if (known.every(f=>f.state==="complete"))
    return {...known[0],state:"complete",asOf,timePercent:100,
      calendarRemainingDays:0,prCycleRemainingDays:0,calendarFinishAt:asOf,prCycleFinishAt:asOf};
  const now=instant(asOf);
  const starts=known.map(x=>instant(x.startedAt)).filter((x):x is number=>x!==null);
  const calendarDates=known.filter(x=>x.state==="forecast").map(x=>instant(x.calendarFinishAt));
  if(now===null || !starts.length || calendarDates.some(x=>x===null))
    return {...estimateTimeCompletion({planned:0,completed:0},null,asOf),reason:"Portfolio start or an unfinished project forecast is unavailable."};
  const startedAt=Math.min(...starts), latest=Math.max(...(calendarDates as number[]));
  const elapsed=(now-startedAt)/DAY, calendarDays=(latest-now)/DAY;
  const cycleDates=known.filter(x=>x.state==="forecast").map(x=>instant(x.prCycleFinishAt));
  const cycleFinish=cycleDates.some(x=>x===null)?null:Math.max(...(cycleDates as number[]));
  const cycleDays=cycleFinish===null?null:(cycleFinish-now)/DAY;
  return {...known[0],state:"forecast",asOf,startedAt:new Date(startedAt).toISOString(),startBasis:undefined,
    syncedAt:known.map(f=>f.syncedAt).filter((s):s is string=>!!s).sort()[0]??null,
    elapsedDays:rounded(elapsed),timePercent:rounded(100*elapsed/(elapsed+calendarDays)),
    calendarRemainingDays:rounded(calendarDays),calendarFinishAt:new Date(latest).toISOString(),
    prCycleRemainingDays:cycleDays===null?null:rounded(cycleDays),
    prCycleFinishAt:cycleFinish===null?null:new Date(cycleFinish).toISOString(),
    parallelPrSlots:null,sampleSize:known.reduce((n,f)=>n+f.sampleSize,0),
    confidence:known.some(f=>f.confidence==="limited")?"limited":known.some(f=>f.confidence==="developing")?"developing":"established"};
}
