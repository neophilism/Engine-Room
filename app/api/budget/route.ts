import { NextResponse } from 'next/server';
import {readNeonBudget} from '../../../lib/budget/neon-budget.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 const status=await readNeonBudget();
 return NextResponse.json(status,{headers:{'Cache-Control':'private, no-store'}});
}
