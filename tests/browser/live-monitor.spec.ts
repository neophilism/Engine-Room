import {expect} from "@playwright/test";
import {test} from "./fixtures";
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {persistPlanDocument} from '../../lib/sync/plan-import.mjs';
import {processWebhookInbox} from '../../lib/sync/github-runtime.mjs';

const projectId=randomUUID(),repoId=randomUUID(),userId=randomUUID(),token=randomBytes(32).toString('base64url');
const githubRepoId=790001,githubPrId=790081;
test.describe.configure({mode:'serial'});
let db:Pool;
test.beforeAll(async()=>{
  db=new Pool({connectionString:process.env.ENGINE_ROOM_BROWSER_DATABASE_URL});
  await db.query("INSERT INTO engine_room_users(id,email,display_name,password_hash,role) VALUES($1,$2,'Live browser fixture','not-a-login-hash','admin')",[userId,userId+'@example.invalid']);
  await db.query("INSERT INTO engine_room_auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[createHash('sha256').update(token).digest('hex'),userId]);
  await db.query("INSERT INTO projects(id,slug,display_name,status) VALUES($1,'live-monitor-fixture','Live Monitor Fixture','active-development')",[projectId]);
  await db.query("INSERT INTO repositories(id,github_repository_id,owner_login,name,full_name,html_url,default_branch,visibility) VALUES($1,$2,'browser-fixture','live','browser-fixture/live','https://github.com/browser-fixture/live','main','public')",[repoId,githubRepoId]);
  await db.query("INSERT INTO project_repositories(project_id,repository_id,relationship) VALUES($1,$2,'primary')",[projectId,repoId]);
  await db.query("INSERT INTO github_repository_sync(repository_id,last_success_at) VALUES($1,now())",[repoId]);
  await db.query("INSERT INTO github_pull_requests(github_pull_request_id,repository_id,number,title,state,draft,html_url,created_at,updated_at,head_sha,base_ref) VALUES($1,$2,81,'Original browser work','open',false,'https://github.com/browser-fixture/live/pull/81',now(),now(),$3,'main')",[githubPrId,repoId,'a'.repeat(40)]);
  const registry={schemaVersion:1,repository:'browser-fixture/live',roadmapVersion:1,planVerified:true,
    plannedPrCount:1,observedAt:'2026-10-13T00:00:00Z',pullRequests:[],units:[{id:'BRW-01',
      title:'Original browser work',origin:'original',prs:[81],dependsOn:[],
      externalDependencies:[],externalPrerequisites:[]}]};
  await persistPlanDocument(db,{id:repoId,full_name:'browser-fixture/live'},
    {path:'registry/prs.json',body:JSON.stringify(registry),ref:'fixture',
      items:[{ordinal:1,title:'Original browser work',numbers:[81],reason:'Explicit test mapping',scope:'original'}]});
  await db.query('UPDATE engine_room_live_state SET last_worker_at=now(),last_error=NULL');
});
test.beforeEach(async({context})=>{
  await context.addCookies([{name:'engine_room_session',value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict',secure:false}]);
});
test.afterAll(async()=>{
  if(!db)return;
  await db.query('DELETE FROM engine_room_users WHERE id=$1',[userId]);
  await db.end();
});

test('push updates refresh data without reloading or losing filters and expansion',async({page})=>{
  await page.goto('/');
  await expect(page.getByLabel('Portfolio data status')).toContainText('PUSH CONNECTED');
  await page.getByRole('searchbox',{name:'Search projects',exact:true}).fill('Live Monitor Fixture');
  await page.getByRole('button',{name:'Expand Live Monitor Fixture',exact:true}).click();
  await page.locator('.dashboard-operations-details summary').click();
  await page.getByRole('button',{name:'Compact monitor',exact:true}).click();
  const marker=randomUUID();
  await page.evaluate(value=>{(window as unknown as Record<string,unknown>).liveMarker=value;},marker);
  const start=Date.now();
  await db.query("UPDATE github_pull_requests SET title='Updated browser work',checks_state='failing',checks_observed_at=now(),updated_at=now() WHERE github_pull_request_id=$1",[githubPrId]);
  await db.query('UPDATE engine_room_live_state SET revision=revision+1,changed_at=now(),last_worker_at=now()');
  await expect(page.getByRole('link',{name:'#81 Updated browser work',exact:true})).toBeVisible({timeout:10000});
  expect(Date.now()-start).toBeLessThan(10000);
  await expect(page.getByRole('searchbox',{name:'Search projects',exact:true})).toHaveValue('Live Monitor Fixture');
  await expect(page.getByRole('button',{name:'Collapse Live Monitor Fixture',exact:true})).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('button',{name:'Compact monitor',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>(window as unknown as Record<string,unknown>).liveMarker)).toBe(marker);
});

test('signed delivery is stored once and processing updates the read model',async({request})=>{
  const body=JSON.stringify({repository:{id:githubRepoId,name:'live',full_name:'browser-fixture/live',owner:{login:'browser-fixture'},html_url:'https://github.com/browser-fixture/live',default_branch:'main'},
    pull_request:{id:githubPrId,number:81,title:'Merged browser work',state:'closed',draft:false,html_url:'https://github.com/browser-fixture/live/pull/81',created_at:'2026-10-01T00:00:00Z',updated_at:new Date(Date.now()+1000).toISOString(),merged_at:new Date().toISOString(),head:{sha:'a'.repeat(40)},base:{ref:'main'}}});
  const headers={'x-github-delivery':randomUUID(),'x-github-event':'pull_request','x-hub-signature-256':'sha256='+createHmac('sha256','browser-fixture-secret-for-signed-delivery-tests').update(body).digest('hex'),'content-type':'application/json'};
  expect((await request.post('/api/github/webhook',{headers,data:body})).status()).toBe(202);
  expect((await request.post('/api/github/webhook',{headers,data:body})).status()).toBe(200);
  expect((await request.post('/api/github/webhook',{headers:{...headers,'x-hub-signature-256':'sha256='+'0'.repeat(64)},data:body})).status()).toBe(401);
  expect(await processWebhookInbox(db,{env:{NODE_ENV:'test',ENGINE_ROOM_GITHUB_OWNER:'browser-fixture'}})).toMatchObject({processed:1,failed:0});
  expect((await db.query('SELECT state,merged_at FROM github_pull_requests WHERE github_pull_request_id=$1',[githubPrId])).rows[0])
    .toMatchObject({state:'closed',merged_at:expect.any(Date)});
});

test('search, project history, and notification links resolve to working pages',async({page})=>{
  await page.goto('/search?q=Live%20Monitor%20Fixture');
  await expect(page.getByText('Search is temporarily unavailable.')).toHaveCount(0);
  await page.locator('.search-results').getByRole('link',{name:'Live Monitor Fixture',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Live Monitor Fixture');
  await page.getByRole('link',{name:'View stored plan history',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Live Monitor Fixture');
  await expect(page.locator('.plan-history-version pre')).toContainText('Original browser work');
  await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Alerts',exact:true}).click();
  await expect(page).toHaveURL(/\/alerts$/);
  await expect(page.getByRole('heading',{name:'Source and development alerts',exact:true})).toBeVisible();
});

test('signed-in administrator controls honor origin checks and record the actual actor',async({page})=>{
  const current=await page.request.get('/api/admin/settings');
  expect(current.status()).toBe(200);
  const before=await current.json();
  const input={expectedRevision:before.revision,settings:{githubReconciliationEnabled:true,githubReconciliationIntervalMinutes:30}};
  expect((await page.request.put('/api/admin/settings',{headers:{Origin:'https://untrusted.example'},data:input})).status()).toBe(403);
  const updated=await page.request.put('/api/admin/settings',{headers:{Origin:'http://127.0.0.1:3108'},data:input});
  expect(updated.status()).toBe(200);
  const next=await updated.json();
  expect((await db.query('SELECT actor FROM engine_room_control_audit WHERE revision=$1',[next.revision])).rows[0].actor).toBe('user:'+userId);
  expect((await page.request.put('/api/admin/settings',{headers:{Origin:'http://127.0.0.1:3108'},data:{expectedRevision:next.revision,settings:before.settings}})).status()).toBe(200);
});

test('lost push and polling sources replace a previous Live signal with Disconnected',async({page})=>{
  await page.route('**/api/live/events',route=>route.abort());
  await page.route('**/api/live',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.goto('/');
  await expect(page.getByLabel('Portfolio data status')).toContainText('Disconnected');
});

test('expired sessions close the stream and offer a working sign-in route',async({page})=>{
  await page.goto('/');
  await expect(page.getByLabel('Portfolio data status')).toContainText('PUSH CONNECTED');
  await db.query("UPDATE engine_room_auth_sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",[userId]);
  await expect(page.getByLabel('Portfolio data status')).toContainText('Session expired',{timeout:10000});
  await expect(page.getByRole('link',{name:'Sign in again',exact:true})).toHaveAttribute('href','/login');
});
