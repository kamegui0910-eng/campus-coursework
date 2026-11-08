import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createOpenRouterConnect} from './openrouter.mjs';
import {preferredModel} from './model-choice.mjs';
function fixture(fetchImpl){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../../drizzle/0004_far_terrax.sql',import.meta.url),'utf8'));
 const db={prepare(sql){return {bind(...args){return {async run(){return sqlite.prepare(sql).run(...args);},async first(){return sqlite.prepare(sql).get(...args)||null;}};}};}};
 const saved=[];const service=owner=>createOpenRouterConnect({db,encryptionKey:'test-only-not-a-real-production-secret',owner,fetchImpl,saveModel:async p=>saved.push(p)});
 return {sqlite,saved,a:service('a'),b:service('b')};
}
test('PKCE uses encrypted owner-bound one-time state and exchanges only with fixed origin',async()=>{
 let exchanges=0;let challenge;
 const f=fixture(async(url,init)=>{
  assert.equal(init.redirect,'manual');assert(url.startsWith('https://openrouter.ai/api/v1/'));
  if(url.endsWith('/auth/keys')){exchanges++;const body=JSON.parse(init.body);assert.equal(body.code,'synthetic-code');assert.equal(body.code_challenge_method,'S256');
   assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.code_verifier))).toString('base64url'),challenge);
   return Response.json({key:'synthetic-user-authorized-key'});}
  assert(url.endsWith('/models'));return Response.json({data:[{id:'paid-model'},{id:'sample:free'}]});
 });
 const flow=await f.a.start('https://coursework.example');const url=new URL(flow.url);challenge=url.searchParams.get('code_challenge');
 assert.equal(url.origin,'https://openrouter.ai');assert.equal(url.searchParams.get('state'),flow.state);assert.equal(url.searchParams.get('callback_url'),'https://coursework.example/api/connect/openrouter');
 const raw=JSON.stringify(f.sqlite.prepare('SELECT * FROM campus_model_connections').all());assert(!raw.includes(flow.state));
 await assert.rejects(f.b.finish(flow.state,'synthetic-code'),/过期/);assert.equal(exchanges,0);
 await f.a.finish(flow.state,'synthetic-code');assert.equal(exchanges,1);assert.equal(f.saved[0].model,'sample:free');
 await assert.rejects(f.a.finish(flow.state,'synthetic-code'),/过期/);assert.equal(exchanges,1);f.sqlite.close();
});
test('expired and superseded connections cannot exchange; provider failure never exposes key or code',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return Response.json({key:'sensitive-never-echo'}, {status:403});});
 const old=await f.a.start('https://coursework.example'),flow=await f.a.start('https://coursework.example');
 await assert.rejects(f.a.finish(old.state,'synthetic-code'),/过期/);assert.equal(calls,0);
 f.sqlite.exec('UPDATE campus_model_connections SET expires_at=0');await assert.rejects(f.a.finish(flow.state,'synthetic-code'),/过期/);assert.equal(calls,0);
 const fresh=await f.a.start('https://coursework.example');await assert.rejects(f.a.finish(fresh.state,'synthetic-code'),e=>!e.message.includes('sensitive')&&!e.message.includes('synthetic-code'));
 assert.equal(calls,1);assert.equal(f.saved.length,0);f.sqlite.close();
});
test('model preferences use actual offered IDs and preserve an available user choice',()=>{
 assert.equal(preferredModel(['paid','sample:free']),'sample:free');assert.equal(preferredModel(['sample:free','my-choice'],'my-choice'),'my-choice');assert.equal(preferredModel([]),'');
});
