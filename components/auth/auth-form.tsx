"use client";
import { useEffect,useState, type FormEvent } from "react";

export function AuthForm({mode}:{mode:"login"|"bootstrap"|"register"}){
 const [email,setEmail]=useState(""),[displayName,setDisplayName]=useState("");
 const [password,setPassword]=useState(""),[invite,setInvite]=useState("");
 const [bootstrapCode,setBootstrapCode]=useState("");
 const [error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  setInvite(params.get("invite")||"");
 },[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{
   const target=mode==="bootstrap"?"bootstrap":mode;
   const res=await fetch("/api/auth/"+target,{
    method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(mode==="login"?{email,password}:mode==="bootstrap"?{email,password,displayName,bootstrapCode}:{invite,password,displayName})
   });
   const data=await res.json() as {ok?:boolean;error?:string};
   if(!res.ok||!data.ok){setError(data.error||"Unable to sign in.");return;}
   const next=new URLSearchParams(window.location.search).get("next");
   window.location.assign(next?.startsWith("/")&&!next.startsWith("//")&&!next.startsWith("/login")?next:"/");
  }catch{setError("Unable to connect. Try again.");}
  finally{setBusy(false);}
 }
 const inputStyle={width:"100%",padding:"0.8rem",marginTop:"0.35rem",borderRadius:8,border:"1px solid #777",color:"inherit",background:"transparent"} as const;
 return <main className="content">
  <header className="hero">
   <p className="eyebrow">Private Portfolio</p>
   <h1>{mode==="login"?"Sign in":mode==="bootstrap"?"Register the first administrator":"Accept your invitation"}</h1>
   <p>{mode==="login"?"Only registered Engine Room users can view the portfolio.":mode==="bootstrap"?"A one-time bootstrap code is required. Once the first administrator exists, this setup cannot be repeated.":"Registration is by invitation only. Ask an administrator for an invitation."}</p>
  </header>
  <form onSubmit={submit} style={{maxWidth:440,display:"grid",gap:"1rem",padding:"1.5rem",border:"1px solid #777",borderRadius:12}}>
   {mode!=="register"&&<label>Email<input style={inputStyle} type="email" name="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
   {mode!=="login"&&<label>Your display name<input style={inputStyle} name="name" autoComplete="name" required minLength={1} maxLength={120} value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label>}
   {mode==="register"&&<label>Invitation code<input style={inputStyle} name="invite" autoComplete="off" required value={invite} onChange={e=>setInvite(e.target.value)}/></label>}
   {mode==="bootstrap"&&<label>Administrator bootstrap code<input style={inputStyle} type="password" name="bootstrapCode" autoComplete="off" required value={bootstrapCode} onChange={e=>setBootstrapCode(e.target.value)}/></label>}
   <label>Password<input style={inputStyle} type="password" name="password" required minLength={mode==="login"?1:12} maxLength={128} autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {mode!=="login"&&<p style={{fontSize:"0.9rem"}}>Choose a unique password of at least 12 characters.</p>}
   {error&&<p role="alert" style={{color:"#ef9a9a"}}>{error}</p>}
   <button disabled={busy} type="submit" style={{padding:"0.8rem",borderRadius:8,cursor:"pointer"}}>{busy?"Checking…":mode==="login"?"Sign in":mode==="bootstrap"?"Create administrator":"Create account"}</button>
  </form>
 </main>;
}
