import { NextResponse } from 'next/server';
import { loadLiveSnapshot } from '../../../lib/server/live-monitor';
export const dynamic='force-dynamic';
export async function GET(){
  try{return NextResponse.json(await loadLiveSnapshot(),{headers:{'Cache-Control':'no-store'}});}
  catch{return NextResponse.json({error:'Source state unavailable'},{status:503});}
}
