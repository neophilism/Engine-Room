"use client";
import React,{useEffect,useState} from 'react';
type Budget={status:string;paused:boolean;spentUSD:number|null;limitUSD:number;thresholdUSD:number;lastObserved?:string|null};
export function BudgetAlert(){
 const [status,setStatus]=useState<Budget|null>(null);
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   try{const response=await fetch('/api/budget',{cache:'no-store'});if(!response.ok)throw Error('unavailable');const value=await response.json();if(active)setStatus(value);}
   catch{if(active)setStatus({status:'unavailable',paused:true,spentUSD:null,limitUSD:10,thresholdUSD:8});}
  };
  void refresh();const timer=setInterval(()=>{void refresh();},300000);
  return()=>{active=false;clearInterval(timer);};
 },[]);
 if(!status||!status.paused)return null;
 return <aside role="alert" aria-live="polite" style={{padding:16,border:'2px solid currentColor',borderRadius:8,marginBottom:16}}>
  <strong>Engine Room cost protection: background tracking paused</strong>
  <p>Neon consumption estimate: {status.spentUSD===null?'Not available':'$'+status.spentUSD.toFixed(2)}.
  Spending target $10, pause threshold $8. {status.status==='unconfigured'?'Neon API credentials are missing.':status.status==='unavailable'?'Neon usage is temporarily unavailable.':''}</p>
  <p>Ask to approve more spending before resuming automated tracking. Other provider charges are not included in this estimate.</p>
 </aside>;
}
