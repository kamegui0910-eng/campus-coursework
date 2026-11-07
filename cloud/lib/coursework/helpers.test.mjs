import test from 'node:test';
import assert from 'node:assert/strict';
import { publicUrl, encryptSecret, decryptSecret, ownedMaterials, excerpt, boundedText } from './helpers.mjs';
import { createModelClient } from './models.mjs';

const resource='5f342b52-6d49-4b37-aacf-aa3ea37a8d74';
const fixtureSecret='isolated-test-encryption-secret-never-production';
test('encrypted credentials are bound to the signed-in owner and purpose',async()=>{
  const plain='synthetic-not-real-api-credential';
  const encrypted=await encryptSecret(plain,fixtureSecret,'owner-a','model');
  assert(!encrypted.includes(plain));
  assert.equal(await decryptSecret(encrypted,fixtureSecret,'owner-a','model'),plain);
  await assert.rejects(decryptSecret(encrypted,fixtureSecret,'owner-b','model'),/无法读取/);
  await assert.rejects(decryptSecret(encrypted,fixtureSecret,'owner-a','canvas'),/无法读取/);
  await assert.rejects(encryptSecret(plain,'','owner-a','model'),/尚未配置/);
});
test('cloud endpoints reject embedded secrets and nonpublic destinations',()=>{
  for(const url of ['http://api.example.com','https://127.0.0.1','https://2130706433','https://[::1]','https://localhost','https://host.local','https://user:pass@api.example.com','https://api.example.com/?key=secret','https://api.example.com:8443'])assert.throws(()=>publicUrl(url));
  assert.equal(publicUrl('https://api.example.com/v1/'),'https://api.example.com/v1');
});
test('material binding cannot select another owner or another course',()=>{
  const row={id:resource,owner_id:'owner-a',course_id:'course-a'};
  assert.deepEqual(ownedMaterials([row],[resource],'owner-a','course-a'),[row]);
  assert.throws(()=>ownedMaterials([row],[resource],'owner-b','course-a'),/不属于/);
  assert.throws(()=>ownedMaterials([row],[resource],'owner-a','course-b'),/不属于/);
  assert.throws(()=>ownedMaterials([],['../private'],'owner-a','course-a'));
});
test('chapter selection skips coverage and refuses ambiguous plain-text markers',()=>{
  const value='# Reading index\nChapter 4 — covered\n# Coverage Chapter 4\nOnly metadata.\n# Chapter 4\nSubstantive chapter body.\n## 4-2\nCare and evidence.\n# Chapter 5\nUnrelated.';
  const selected=excerpt(value,'Ch4');
  assert.match(selected.text,/Substantive chapter body/);
  assert(!selected.text.includes('Only metadata'));
  assert(!selected.text.includes('Unrelated'));
  assert.equal(excerpt('Chapter 4 ...... 190\nChapter 4\nActual body','Chapter 4').text,'');
  assert.equal(excerpt(value,'Chapter 8').text,'');
  const nestedMetadata='# Coverage\n## Chapter 4\nCoverage: only a heading listed.\n# Chapter 4\nActual substantive paragraph about audit risk.\n# Chapter 5\nOther chapter.';
  const actual=excerpt(nestedMetadata,'Chapter 4');
  assert.match(actual.text,/Actual substantive paragraph/);
  assert(!actual.text.includes('only a heading listed'));
  assert.equal(excerpt('# Chapter 4 First\nOne body.\n# Chapter 4 Second\nAnother body.','Chapter 4').text,'');
});
test('stream bounds stop oversized model responses',async()=>{
  let cancelled=false;
  const response=new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(20));},cancel(){cancelled=true;}}));
  await assert.rejects(boundedText(response,10),/过大/);
  assert.equal(cancelled,true);
});
const settings=style=>({baseUrl:'https://api.example.com/v1',model:'user-model-7',apiStyle:style});
test('three model formats preserve the user model and their real request contracts',async()=>{
  const captures=[];
  for(const style of ['chat-completions','responses','anthropic']){
    const client=createModelClient({settings:settings(style),apiKey:'synthetic-key',fetchImpl:async(url,init)=>{
      captures.push({style,url,init,body:JSON.parse(init.body)});
      return Response.json(style==='chat-completions'?{choices:[{message:{content:'Result'},finish_reason:'stop'}]}:style==='responses'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Result'}]}]}:{content:[{type:'text',text:'Result'}],stop_reason:'end_turn'});
    }});
    const result=await client.generate({system:'rules',user:'actual materials'});
    assert.equal(result.text,'Result');assert.equal(result.complete,true);
  }
  assert.equal(captures[0].url,'https://api.example.com/v1/chat/completions');
  assert.equal(captures[0].init.headers.Authorization,'Bearer synthetic-key');
  assert.equal(captures[1].body.store,false);
  assert.equal(captures[1].body.instructions,'rules');
  assert.equal(captures[2].init.headers['x-api-key'],'synthetic-key');
  assert.equal(captures[2].init.headers['anthropic-version'],'2026-10-21');
  assert(captures.every(capture=>capture.body.model==='user-model-7'&&capture.init.redirect==='manual'));
});
test('redirects never forward credentials and model-list checks do not generate',async()=>{
  const captures=[];
  const client=createModelClient({settings:settings('chat-completions'),apiKey:'synthetic-key',fetchImpl:async(url,init)=>{
    captures.push({url,init});return new Response('',{status:302,headers:{Location:'https://other.example.com'}});
  }});
  await assert.rejects(client.test(),/跳转/);
  assert.equal(captures.length,1);assert.equal(captures[0].init.method,'GET');
  const unsupported=createModelClient({settings:settings('responses'),fetchImpl:async()=>new Response('',{status:404})});
  const result=await unsupported.test();assert.equal(result.verified,false);assert.equal(result.generationVerified,false);
});
test('truncation is visible and provider-echoed credentials are removed from text',async()=>{
  const client=createModelClient({settings:settings('chat-completions'),apiKey:'synthetic-key',fetchImpl:async()=>Response.json({choices:[{message:{content:'synthetic-key draft'},finish_reason:'length'}]})});
  const result=await client.generate({system:'rules',user:'materials'});
  assert.equal(result.complete,false);assert(result.warning);assert(!result.text.includes('synthetic-key'));
});
