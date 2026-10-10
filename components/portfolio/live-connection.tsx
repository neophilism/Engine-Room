"use client";
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import type { LiveSnapshot } from '../../lib/domain/live-monitor';

export function LiveConnection(){
  const [snapshot,setSnapshot]=useState<LiveSnapshot|null>(null);
  const [connected,setConnected]=useState(false);
  const [expired,setExpired]=useState(false);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    let source:EventSource|undefined,active=true,revision:string|undefined,sessionExpired=false;
    const expire=()=>{if(!active)return;sessionExpired=true;setExpired(true);setConnected(false);source?.close();clearInterval(timer);};
    const receive=(data:LiveSnapshot)=>{
      if(!active)return;
      setSnapshot(data);
      setUnavailable(false);
      if(revision!==undefined&&revision!==data.revision)window.dispatchEvent(new CustomEvent('engine-room-data-changed'));
      revision=data.revision;
    };
    const poll=async()=>{
      if(document.visibilityState==='hidden'||!active||sessionExpired)return;
      try{
        const response=await fetch('/api/live',{cache:'no-store'});
        if(response.status===401){expire();return;}
        if(!response.ok)throw new Error('Source unavailable');
        receive(await response.json());
      }catch{if(active){setConnected(false);setUnavailable(true);}}
    };
    if(typeof EventSource!=='undefined'){
      source=new EventSource('/api/live/events');
      source.addEventListener('portfolio',event=>{
        if(!active)return;
        setConnected(true);try{receive(JSON.parse((event as MessageEvent).data));}catch{setConnected(false);}
      });
      source.addEventListener('session-expired',expire);
      source.addEventListener('source-unavailable',()=>{if(active){setConnected(false);setUnavailable(true);}});
      source.onerror=()=>{if(active){setConnected(false);void poll();}};
    }
    void poll();const timer=setInterval(()=>{void poll();},15000);
    return()=>{active=false;source?.close();clearInterval(timer);};
  },[]);
  const state=expired?'Session expired':unavailable?'Disconnected':snapshot?({live:'Live','catching-up':'Catching up',stale:'Stale',disconnected:'Disconnected'}[snapshot.state]):'Connecting';
  return <div className="live-readout" aria-label="Portfolio data status" title={snapshot?
      `GitHub source state. Oldest repository sync: ${snapshot.oldestSyncAt||'N/A'}. ${snapshot.pendingEvents} pending events. ${snapshot.failedRepositories} source errors. ${connected?'Push connected':'Polling fallback'}. GitHub reconciliation: ${snapshot.pollingMinutes} minutes.`:'Connecting to source state'}>
    <span className={`system-light live-state-${unavailable||expired?'disconnected':snapshot?.state||'disconnected'}`} aria-hidden="true"/>
    <span><small>{connected?'GITHUB · PUSH CONNECTED':'GITHUB · POLLING / RECOVERY'}</small><strong>{state}</strong>
      {expired&&<Link href="/login">Sign in again</Link>}</span>
  </div>;
}
