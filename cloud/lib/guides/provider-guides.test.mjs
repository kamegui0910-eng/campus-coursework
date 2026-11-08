import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AI_PROVIDERS,providerById,providerForUrl,guideImage} from './provider-guides.mjs';
import {createModelClient} from '../coursework/models.mjs';
test('every manual provider has both four-step device guides with no active or remote SVG content',()=>{
 for(const provider of AI_PROVIDERS){
  assert.equal(provider.steps.length,4);
  for(const device of ['mobile','desktop'])for(let step=0;step<4;step++){
   const path=guideImage(provider.id,device,step),svg=readFileSync(new URL('../../public'+path,import.meta.url),'utf8');
   assert(svg.includes('非官网截图'));assert(svg.includes('<title'));assert(svg.includes('<desc'));
   assert(!/<script|<foreignObject|onload=|href=/i.test(svg));assert(!svg.includes('sk-ant-'));assert(!svg.includes('sk-proj-'));
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
