// @vitest-environment node
import {describe,it,expect,vi} from "vitest";
import {probeGitHubAccess} from "./github-access-probe.mjs";

const env={...process.env,GITHUB_READ_TOKEN:"fixture-secret",GITHUB_APP_ID:"",GITHUB_APP_PRIVATE_KEY:"",GITHUB_INSTALLATION_ID:"",GITHUB_API_BASE_URL:"https://api.github.com"};

describe("GitHub credential diagnostic (no secrets)",()=>{
  it("reports a valid token denied access to private repositories without calling them public",async()=>{
    const fetcher=vi.fn(async (input:string,init?:RequestInit)=>{
      expect(init?.headers).toMatchObject({Authorization:"Bearer fixture-secret"});
      return new Response("",{status:input.endsWith("/user")||input.endsWith("/The-Garden")?200:404});
    });
    const report=await probeGitHubAccess({env,fetcher:fetcher as unknown as typeof fetch});
    expect(report).toMatchObject({source:"read-token",available:true,identityHttp:200,
      engineRoomHttp:404,musicAnalyzerHttp:404,publicControlHttp:200,
      reason:"token-accepted-for-public-but-private-repositories-unavailable"});
    expect(JSON.stringify(report)).not.toContain("fixture-secret");
  });
  it("distinguishes an invalid token from repository scope failure",async()=>{
    const report=await probeGitHubAccess({env,fetcher:async()=>new Response("",{status:401})});
    expect(report).toMatchObject({identityHttp:401,reason:"credential-rejected"});
  });
  it("detects missing private pull-request permission even when repository metadata is readable",async()=>{
    const fetcher=async(input:string)=>new Response("",{status:input.includes("/pulls?")?403:200});
    const report=await probeGitHubAccess({env,fetcher:fetcher as unknown as typeof fetch});
    expect(report).toMatchObject({engineRoomHttp:200,musicAnalyzerHttp:200,
      engineRoomPullsHttp:403,musicAnalyzerPullsHttp:403,
      reason:"private-repository-metadata-readable-but-pull-request-permission-denied"});
  });
  it("recognizes successful private-repository access",async()=>{
    const report=await probeGitHubAccess({env,fetcher:async()=>new Response("",{status:200})});
    expect(report).toMatchObject({engineRoomHttp:200,musicAnalyzerHttp:200,reason:"private-access-confirmed"});
  });
});
