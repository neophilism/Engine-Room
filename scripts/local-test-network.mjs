// Imported only by the isolated Playwright web server. Test fixtures never leave loopback.
if(process.env.ENGINE_ROOM_TEST_SERVER!=='1')throw new Error('Local verification network guard requires test server mode');
const loopback=new Set(['127.0.0.1','localhost','[::1]']);
if(!loopback.has(new URL(process.env.DATABASE_URL).hostname))throw new Error('Local browser tests require an isolated loopback database');
const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(!loopback.has(url.hostname))return Promise.reject(new Error('External network is disabled for isolated verification'));
  return nativeFetch(input,init);
};
