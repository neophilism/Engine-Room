"use client";
import { useEffect,useState, type FormEvent } from "react";
type Account={id:string;email:string;displayName:string;role:"admin"|"viewer"};
export function AccountPanel(){
 const [user,setUser]=useState<Account|null>(null),[pending,setPending]=useState(true);
 const [email,setEmail]=useState(""),[role,setRole]=useState<"viewer"|"admin">("viewer");
 const [invite,setInvite]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{
  fetch("/api/auth/me",{credentials:"same-origin",cache:"no-store"})
   .then(r=>r.json()).then((r:{user?:Account})=>setUser(r.user||null))
   .catch(()=>setMessage("Account details unavailable"))
   .finally(()=>setPending(false));
 },[]);
 async function createInvite(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setMessage("");setInvite("");
  try{
   const res=await fetch("/api/auth/invite",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,role})});
   const value=await res.json() as {inviteUrl?:string;error?:string};
   if(!res.ok)throw new Error(value.error||"Unable to invite user");
   setInvite(value.inviteUrl||"");setMessage("Invitation created. Share this private one-time link with the recipient.");
  }catch(error){setMessage(error instanceof Error?error.message:"Unable to invite user");}
 }
 async function logout(){
  try{
   const res=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"});
   if(!res.ok)throw new Error("Sign out failed");
   window.location.assign("/login");
  }catch{setMessage("Sign out failed. Try again.");}
 }
 return <main className="content">
  <header className="hero"><p className="eyebrow">Private access</p><h1>Account &amp; registration</h1>
   <p>Every person uses an individual account. Public registration is disabled.</p></header>
  {pending?<p>Loading account…</p>:!user?<p role="alert">Your session has expired. Sign in again.</p>:<>
   <section style={{display:"grid",gap:"0.75rem",maxWidth:500,padding:"1.4rem",border:"1px solid #777",borderRadius:12}}>
    <h2>{user.displayName}</h2>
    <p>{user.email}</p><p>Role: {user.role==="admin"?"Administrator":"Viewer"}</p>
    <button type="button" onClick={logout} style={{padding:"0.65rem",cursor:"pointer"}}>Sign out securely</button>
   </section>
   {user.role==="admin"&&<section style={{marginTop:"2rem",maxWidth:500}}>
    <h2>Invite a registered user</h2>
    <p>Invitations are valid for seven days and can be used once. No email is sent automatically.</p>
    <form onSubmit={createInvite} style={{display:"grid",gap:"0.75rem"}}>
     <label>Recipient email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",width:"100%",padding:"0.65rem"}}/></label>
     <label>Access role<select value={role} onChange={e=>setRole(e.target.value==="admin"?"admin":"viewer")} style={{display:"block",padding:"0.65rem"}}><option value="viewer">Portfolio viewer</option><option value="admin">Administrator (financial and access dashboards)</option></select></label>
     <button type="submit" style={{padding:"0.65rem",cursor:"pointer"}}>Create one-time invitation</button>
    </form>
    {invite&&<div><label>One-time registration link<input readOnly aria-label="Registration link" value={invite} onFocus={e=>e.currentTarget.select()} style={{width:"100%",padding:"0.6rem",marginTop:"0.5rem"}}/></label></div>}
   </section>}
  </>}
  {message&&<p role="status" style={{marginTop:"1rem"}}>{message}</p>}
 </main>;
}
