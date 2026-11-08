import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AI_PROVIDERS,providerById,providerForUrl} from './provider-guides.mjs';
import {screenshotGuide} from './screenshots.mjs';
import {createModelClient} from '../coursework/models.mjs';
test('real screenshot references have provenance and locally available unmodified PNG assets',()=>{
 for(const provider of AI_PROVIDERS){
  const guide=screenshotGuide(provider.id);
  if(provider.id==='custom'){assert.equal(guide,null);continue;}
  assert(guide.credit);assert(guide.source.startsWith('https://'));assert(guide.items.length);
  for(const item of guide.items){
   assert(item.src.startsWith('/guides/screenshots/'));const bytes=readFileSync(new URL('../../public'+item.src,import.meta.url));
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(bytes.length>10000);assert(item.title&&item.caption);
  }
 }
 assert.equal(providerById('unknown').id,'custom');assert.equal(providerForUrl('https://api.openai.com/v1/').id,'openai');
});
test('Gemini preset reuses documented OpenAI-compatible models endpoint and Bearer authentication',async()=>{
 const p=providerById('gemini');const captures=[];
 const client=createModelClient({settings:{apiStyle:p.style,baseUrl:p.url,model:'_discovery_'},apiKey:'synthetic-gemini-only',fetchImpl:async(url,init)=>{captures.push({url,init});return Response.json({data:[{id:'actual-account-model'}]});}});
 const result=await client.test();assert.deepEqual(result.models,['actual-account-model']);
 assert.equal(captures[0].url,'https://generativelanguage.googleapis.com/v1beta/openai/models');assert.equal(captures[0].init.headers.Authorization,'Bearer synthetic-gemini-only');assert.equal(captures[0].init.method,'GET');
});
