import { githubToken } from './github-runtime.mjs';

/**
 * Private, bounded runtime credential probe.
 * Only returns HTTP statuses and authentication mode; never logs or persists
 * credentials, GitHub response bodies, identities, or token-scope headers.
 * A valid token is not proof that it can read selected private repositories.
 */
export async function probeGitHubAccess({env=process.env,fetcher=fetch}={}) {
  const configured=Boolean(env.GITHUB_READ_TOKEN?.trim());
  const appConfigured=Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_INSTALLATION_ID);
  const source=configured?'read-token':appConfigured?'installation':'missing';
  let token;
  try {token=await githubToken(env,fetcher);}
  catch{return {source,available:false,identityHttp:null,engineRoomHttp:null,musicAnalyzerHttp:null,engineRoomPullsHttp:null,musicAnalyzerPullsHttp:null,publicControlHttp:null,reason:'credential-exchange-failed'};}
  if(!token)return {source,available:false,identityHttp:null,engineRoomHttp:null,musicAnalyzerHttp:null,publicControlHttp:null,reason:'no-runtime-credential'};
  const base=(env.GITHUB_API_BASE_URL||'https://api.github.com').replace(/\/$/,'');
  const check=async path=>{
    try {
      const r=await fetcher(base+path,{
        headers:{Accept:'application/vnd.github+json','User-Agent':'Engine-Room-Access-Diagnostic',
          Authorization:'Bearer '+token},
        signal:AbortSignal.timeout(7000)
      });
      return r.status;
    } catch {return null;}
  };
  // Compare the *same runtime credential* on authenticated identity, two
  // known-private repositories and a known-public control.
  const [identityHttp,engineRoomHttp,musicAnalyzerHttp,engineRoomPullsHttp,musicAnalyzerPullsHttp,publicControlHttp]=await Promise.all([
    source==='installation'?Promise.resolve(null):check('/user'),
    check('/repos/neophilism/Engine-Room'),
    check('/repos/neophilism/Music-Analyzer'),
    check('/repos/neophilism/Engine-Room/pulls?state=all&per_page=1'),
    check('/repos/neophilism/Music-Analyzer/pulls?state=all&per_page=1'),
    check('/repos/neophilism/The-Garden')
  ]);
  const privateReadable=engineRoomHttp===200 && musicAnalyzerHttp===200 &&
    engineRoomPullsHttp===200 && musicAnalyzerPullsHttp===200;
  const reason=privateReadable?'private-access-confirmed':
    identityHttp===401?'credential-rejected':
    (engineRoomHttp===404||musicAnalyzerHttp===404) && publicControlHttp===200
      ? 'token-accepted-for-public-but-private-repositories-unavailable'
      : engineRoomHttp===200 && musicAnalyzerHttp===200 &&
        ([engineRoomPullsHttp,musicAnalyzerPullsHttp].some(n=>n===403 || n===404))
        ? 'private-repository-metadata-readable-but-pull-request-permission-denied'
      : 'credential-or-network-access-incomplete';
  return {source,available:true,identityHttp,engineRoomHttp,musicAnalyzerHttp,engineRoomPullsHttp,musicAnalyzerPullsHttp,publicControlHttp,reason};
}
