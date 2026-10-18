import {expect} from '@playwright/test';
import {test} from './fixtures';
import {Pool} from 'pg';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {persistPlanDocument} from '../../lib/sync/plan-import.mjs';
const repoId=randomUUID(),projectId=randomUUID(),userId=randomUUID(),token=randomBytes(32).toString('base64url');
let db:Pool;
test.beforeAll(async()=>{
 const connectionString=process.env.ENGINE_ROOM_BROWSER_DATABASE_URL;
 if(!connectionString||!['localhost','127.0.0.1'].includes(new URL(connectionString).hostname))throw new Error('Accuracy browser fixtures require an isolated local test database');
 db=new Pool({connectionString});
 await db.query("INSERT INTO engine_room_users(id,email,display_name,password_hash,role) VALUES($1,$2,'Accuracy fixture','not-a-login-hash','admin')",[userId,userId+'@example.invalid']);
 await db.query("INSERT INTO engine_room_auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[createHash('sha256').update(token).digest('hex'),userId]);
 await db.query("INSERT INTO projects(id,slug,display_name,status) VALUES($1,'accuracy-browser-fixture','GitHub Count Fixture','active-development')",[projectId]);
 await db.query("INSERT INTO repositories(id,github_repository_id,owner_login,name,full_name,html_url,visibility) VALUES($1,891001,'accuracy','browser','accuracy/browser','https://github.com/accuracy/browser','public')",[repoId]);
 await db.query("INSERT INTO project_repositories(project_id,repository_id,relationship) VALUES($1,$2,'primary')",[projectId,repoId]);
 await db.query("INSERT INTO github_repository_sync(repository_id,last_success_at) VALUES($1,now())",[repoId]);
 await db.query(`INSERT INTO github_pull_requests(github_pull_request_id,repository_id,number,title,state,draft,html_url,created_at,updated_at,merged_at,base_ref)
  SELECT 891000+n,$1,n,'Browser accuracy fixture',(CASE WHEN n<=4 THEN 'open' ELSE 'closed' END)::github_pull_request_state,n=1,
  'https://github.com/accuracy/browser/pull/'||n,now(),now(),CASE WHEN n>9 THEN now() ELSE NULL END,'main' FROM generate_series(1,120) n`,[repoId]);
 // Production-shaped source payload: the old per-unit document join transferred
 // this large body 210 times and exceeded the web server's 256 MB heap.
 const items=Array.from({length:210},(_,i)=>({ordinal:i+1,sourceItemId:'MEM-'+(i+1),title:'Memory fixture '+i,scope:'original',numbers:i<120?[i+1]:[],reason:'Explicit browser fixture mapping'}));
 await persistPlanDocument(db,{id:repoId,full_name:'accuracy/browser'},{path:'registry/prs.json',ref:'d'.repeat(40),items,
  body:JSON.stringify({units:items.map(item=>({id:item.sourceItemId,title:item.title,prs:item.numbers})),padding:'x'.repeat(900000)})});
});
test.afterAll(async()=>{
 if(!db)return;
 try{
 await db.query('DELETE FROM project_plan_items WHERE repository_id=$1',[repoId]);
 await db.query('DELETE FROM project_plan_documents WHERE repository_id=$1',[repoId]);
 await db.query('DELETE FROM engine_room_users WHERE id=$1',[userId]);
 await db.query('DELETE FROM github_pull_requests WHERE repository_id=$1',[repoId]);
 await db.query('DELETE FROM github_repository_sync WHERE repository_id=$1',[repoId]);
 await db.query('DELETE FROM project_repositories WHERE project_id=$1',[projectId]);
 await db.query('DELETE FROM projects WHERE id=$1',[projectId]);
 await db.query('DELETE FROM repositories WHERE id=$1',[repoId]);
 }finally{await db.end();}
});
test('renders actual GitHub counters before planning, at desktop and mobile widths',async({page,context})=>{
 await context.addCookies([{name:'engine_room_session',value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict',secure:false}]);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:950});await page.goto('/');
  const card=page.locator('article.project-progress-stack').filter({has:page.getByRole('link',{name:'GitHub Count Fixture',exact:true})});
  await expect(card).toBeVisible();
  const facts=card.getByLabel('GitHub pull request counts');
  for(const [label,count] of [['Open','4'],['Closed','116'],['Merged','111'],['Closed without merge','5']]){
   const pair=facts.locator('dl > div').filter({has:page.locator('dt',{hasText:new RegExp('^'+label+'$')})});
   await expect(pair.locator('dd')).toHaveText(count);
  }
  await expect(card.locator('details.planning-details')).not.toHaveAttribute('open','');
  await expect(card.getByText('120 total PRs',{exact:false})).toBeVisible();
  await card.getByRole('button',{name:'Expand GitHub Count Fixture'}).click();
  await expect(card.locator('.project-expansion-drawer')).toBeVisible();
 }
});
