// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import type {PoolClient} from 'pg';
import {seedRepositoryAbout} from './repository-about.mjs';
const seed={scopeYear:2026,olderExceptions:[],entries:[{repository:'neophilism/Engine-Room',description:'Software portfolio dashboard'}]};
function database(){return {query:vi.fn(async(sql:string)=>({rows:sql.startsWith('INSERT INTO repositories')?[{id:'repo'}]:sql.startsWith('SELECT project_id')?[{project_id:'project'}]:[],rowCount:1}))};}
const repo={id:1,name:'Engine-Room',full_name:'neophilism/Engine-Room',html_url:'https://github.com/neophilism/Engine-Room',owner:{login:'neophilism'},created_at:'2026-10-07T19:05:35Z',description:null};
describe('owner-authorized About initialization',()=>{
  it('writes a missing description, reads it back, then records success',async()=>{
    let description:string|null=null;
    const fetcher=vi.fn(async(_url:string,options:RequestInit)=>{
      if(options.method==='PATCH')description=JSON.parse(String(options.body)).description;
      return {ok:true,status:200,json:async()=>({...repo,description})};
    });
    expect(await seedRepositoryAbout(database() as unknown as Pick<PoolClient,'query'>,{env:{...process.env,GITHUB_READ_TOKEN:'test-only'},fetcher,seed})).toMatchObject({updated:1,failed:0});
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('preserves an existing owner description',async()=>{
    const fetcher=vi.fn(async()=>({ok:true,status:200,json:async()=>({...repo,description:'Owner description'})}));
    expect(await seedRepositoryAbout(database() as unknown as Pick<PoolClient,'query'>,{env:{...process.env,GITHUB_READ_TOKEN:'test-only'},fetcher,seed})).toMatchObject({preserved:1,updated:0});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('reports a write permission failure without claiming the About section changed',async()=>{
    const fetcher=vi.fn(async(_url:string,options:RequestInit)=>options.method==='PATCH'?{ok:false,status:403,json:async()=>({})}:{ok:true,status:200,json:async()=>repo});
    const db=database();
    expect(await seedRepositoryAbout(db as unknown as Pick<PoolClient,'query'>,{env:{...process.env,GITHUB_READ_TOKEN:'test-only'},fetcher,seed})).toMatchObject({failed:1,updated:0});
    expect(db.query.mock.calls.some(call=>call[0].includes("state='applied'"))).toBe(false);
  });
});
