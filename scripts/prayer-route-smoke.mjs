// Opt-in, local HTTP smoke test of the real Next route with a synthetic
// Supabase HTTP server. This does NOT exercise real Auth, PostgREST or RLS.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const encode=(x)=>Buffer.from(JSON.stringify(x)).toString('base64url');
const user={id:'0ca318e2-8b44-4a64-9b58-2af31ab941c7',aud:'authenticated',role:'authenticated',email:'probe@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const exp=Math.floor(Date.now()/1000)+3600;
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,role:'authenticated',exp})}.fake`;
const session={access_token:token,refresh_token:'fake-refresh',token_type:'bearer',expires_in:3600,expires_at:exp,user};
const cookie=`sb-127-auth-token=base64-${encode(session)}`;
let flag='off';
const fake=createServer((req,res)=>{
  res.setHeader('content-type','application/json');
  if(req.url==='/auth/v1/user') {
    if(req.headers.authorization!==`Bearer ${token}`){res.statusCode=401;res.end('{"message":"not authenticated"}');return;}
    res.end(JSON.stringify(user));return;
  }
  if(req.url==='/rest/v1/rpc/setting_bool' && req.method==='POST') {
    if(req.headers.authorization!==`Bearer ${token}`){res.statusCode=401;res.end('{"message":"not authenticated"}');return;}
    if(flag==='error'){res.statusCode=503;res.end('{"message":"simulated outage"}');return;}
    let body='';req.on('data',c=>body+=c);req.on('end',()=>{
      try {const payload=JSON.parse(body);res.end(JSON.stringify(payload.p_key==='companion.calculated_prayer_times' && flag==='on'));}
      catch {res.statusCode=400;res.end('{}');}
    });return;
  }
  res.statusCode=404;res.end('{}');
});
await new Promise((r)=>fake.listen(0,'127.0.0.1',r));
// Reserve an ephemeral test port, then let Next listen on it. There is a small
// unavoidable race; a collision fails the test rather than using another app.
const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));
const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const root=resolve(import.meta.dirname,'..');
const next=spawn(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),'dev','-H','0.0.0.0','-p',String(port)],{
  cwd:resolve(root,'web'),detached:true,env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${fake.address().port}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fake-anon'},stdio:['ignore','pipe','pipe'],
});
let logs='';
try {
  await new Promise((resolveReady,reject)=>{
    const timeout=setTimeout(()=>reject(new Error(`Next startup timed out\n${logs}`)),60000);
    const receive=(chunk)=>{logs+=chunk.toString();if(logs.includes('Ready in')){clearTimeout(timeout);resolveReady();}};
    next.stdout.on('data',receive);next.stderr.on('data',receive);
    next.once('error',e=>{clearTimeout(timeout);reject(e);});
    next.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Next exited ${code}\n${logs}`));});
  });
  const url=`http://localhost:${port}/companion/prayer-times`;
  const request=(headers={})=>fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
  const anonymous=await request();
  assert.equal(anonymous.status,307);assert.equal(anonymous.headers.get('location'),'/sign-in?next=/companion/prayer-times');
  const signed={cookie};
  for(const [state,visible] of [['off',false],['on',true],['error',false],['off',false]]) {
    flag=state;const response=await request(signed);const html=await response.text();
    assert.equal(response.status,200,`flag ${state}`);
    assert.match(response.headers.get('cache-control')||'',/no-store/);
    assert.equal(html.includes('>Calculate today</button>'),visible,`flag ${state}`);
    if(!visible) assert.match(html,/Calculated prayer times are not switched on/);
  }
  console.log('Prayer route HTTP smoke passed: anonymous redirect, off/on/off and simulated setting outage fail closed; responses are no-store. Synthetic Supabase only.');
} catch(e) {console.error(logs);throw e;}
finally {
  try {process.kill(-next.pid,'SIGTERM');} catch { /* already exited */ }
  if(next.exitCode===null) await Promise.race([once(next,'exit'),new Promise(r=>setTimeout(r,5000))]);
  try {process.kill(-next.pid,'SIGKILL');} catch { /* already exited */ }
  await new Promise(r=>fake.close(r));
}
