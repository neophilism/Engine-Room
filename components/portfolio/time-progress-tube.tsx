import React from "react";
import type { TimeForecast } from "../../lib/domain/time-completion";

function duration(days:number|null):string {
  if (days===null || !Number.isFinite(days))return "N/A";
  if(days<=0)return "0 days";
  if(days<1)return "~"+Math.max(1,Math.ceil(days*24))+" hours";
  if(days<60)return "~"+Math.ceil(days)+" days";
  if(days<730)return "~"+(days/30.4375).toFixed(1)+" months";
  return "~"+(days/365.25).toFixed(1)+" years";
}
function date(value:string|null):string {
  if(!value)return "N/A";
  const d=new Date(value);
  return Number.isFinite(d.valueOf())?d.toLocaleDateString("en-US",
    {timeZone:"UTC",month:"short",day:"numeric",year:"numeric"}):"N/A";
}

/**
 * An independent time track: elapsed calendar days vs dynamically projected
 * total calendar days. Never repurpose the milestone/completion track.
 */
export function TimeProgressTube({forecast,label,compact=false}:{
  forecast?:TimeForecast|null;label:string;compact?:boolean
}){
  const available=forecast?.state==="forecast"||forecast?.state==="complete";
  const timePercent=available?(forecast?.timePercent??0):0;
  const calendar=forecast?.state==="complete"?"Complete":
    forecast?.state==="forecast"?
      duration(forecast.calendarRemainingDays)+" remaining · "+date(forecast.calendarFinishAt):"Unavailable";
  const cycle=forecast?.state==="complete"?"Complete":
    forecast?.prCycleRemainingDays!=null?
      duration(forecast.prCycleRemainingDays)+" remaining · "+date(forecast.prCycleFinishAt):"Insufficient PR-cycle evidence";
  return <div className={"time-progress-readout"+(compact?" time-progress-compact":"")}>
    <div className="time-progress-heading">
      <span className="time-progress-label">Time elapsed
        {forecast?.elapsedDays!=null?" · "+duration(forecast.elapsedDays):""}</span>
      <strong>{available?timePercent.toFixed(1)+"% of forecast duration":"Time N/A"}</strong>
    </div>
    {available?<div className="time-progress-tube" role="progressbar"
      aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={timePercent}
      aria-valuetext={duration(forecast?.elapsedDays??null)+" elapsed; calendar "+calendar+
        "; PR-cycle "+cycle+"; estimate updated "+date(forecast?.asOf??null)}
      title={"Calendar: "+calendar+". PR-cycle: "+cycle}>
      <span className="time-progress-chamber" aria-hidden="true">
        <span className="time-progress-fill" style={{width:timePercent+"%"}} />
      </span>
    </div>:<div className="time-progress-unmeasured" role="status"
      aria-label={label+": estimate unavailable"} title={forecast?.reason??"Insufficient GitHub evidence"}>
      Insufficient verified history to estimate a finish date
    </div>}
    <div className="time-forecast-details">
      <span><b>Calendar pace:</b> {calendar}</span>
      <span><b>PR-cycle pace:</b> {cycle}{forecast?.parallelPrSlots!=null?
        " · "+forecast.parallelPrSlots+" observed parallel PR lane"+(forecast.parallelPrSlots===1?"":"s"):""}</span>
    </div>
    {!compact&&<div className="time-forecast-provenance">
      {forecast?.startBasis==="repository-created"?"Clock starts at GitHub repository creation":
        forecast?.startBasis==="first-pr"?"Clock starts at first observed GitHub PR":
        "Project inception not independently recorded"}
      {" · "+(forecast?.sampleSize??0)+" accepted timestamps"}
      {forecast?.syncedAt?" · Source sync "+date(forecast.syncedAt):" · Source sync unverified"}
      {forecast?.syncedAt&&Number.isFinite(Date.parse(forecast.asOf))&&
        Date.parse(forecast.asOf)-Date.parse(forecast.syncedAt)>48*60*60*1000?
        " · GitHub source observation may be stale":""}
      {forecast?.state==="unavailable"?" · "+(forecast.reason??"Unknown pace"):""}
    </div>}
  </div>;
}
