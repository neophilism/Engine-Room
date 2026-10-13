import React from "react";
import type { PlannedProgress } from "../../lib/domain/planned-progress";
import type { TimeForecast } from "../../lib/domain/time-completion";
import { PlannedProgressTube } from "./planned-progress-tube";
import { TimeProgressTube } from "./time-progress-tube";

export function DualProgress({progress,forecast,workLabel,timeLabel,compact=false}:{
  progress:PlannedProgress;forecast?:TimeForecast|null;
  workLabel:string;timeLabel:string;compact?:boolean
}){
  return <div className="dual-progress">
    <PlannedProgressTube progress={progress} label={workLabel} compact={compact}/>
    <TimeProgressTube forecast={forecast} label={timeLabel} compact={compact}/>
  </div>;
}
