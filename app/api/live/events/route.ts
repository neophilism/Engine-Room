import { cookies } from 'next/headers';
import { readSession } from '../../../../lib/auth/database';
import { SESSION_COOKIE } from '../../../../lib/auth/security';
import { loadLiveSnapshot } from '../../../../lib/server/live-monitor';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!await readSession(token))return new Response('Authentication required',{status:401});
  const encoder=new TextEncoder();let timer:ReturnType<typeof setInterval>|undefined;let closed=false,busy=false;
  const stream=new ReadableStream({
    start(controller){
      const send=async()=>{
        if(closed||busy)return;busy=true;
        try{
          if(!await readSession(token)){controller.enqueue(encoder.encode('event: session-expired\ndata: {}\n\n'));stop();return;}
          const snapshot=await loadLiveSnapshot();
          controller.enqueue(encoder.encode('event: portfolio\nid: '+snapshot.revision+'\ndata: '+JSON.stringify(snapshot)+'\n\n'));
        }catch{if(!closed)controller.enqueue(encoder.encode('event: source-unavailable\ndata: {}\n\n'));}
        finally{busy=false;}
      };
      function stop(){if(closed)return;closed=true;if(timer)clearInterval(timer);try{controller.close();}catch{/* Client cancelled. */}}
      request.signal.addEventListener('abort',stop,{once:true});
      timer=setInterval(()=>{void send();},15*60*1000);void send();
    },
    cancel(){closed=true;if(timer)clearInterval(timer);}
  });
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
