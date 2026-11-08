import test from 'node:test';
import assert from 'node:assert/strict';
import {campusRequest} from './campus-request.mjs';
import {secretText} from './coursework/helpers.mjs';
test('request returns model results and propagates a server rejection for inline feedback',async()=>{
 const data=await campusRequest('model.discover',{}, {fetchImpl:async()=>Response.json({ok:true,data:{models:['available-model']}})});assert.deepEqual(data.models,['available-model']);
 await assert.rejects(campusRequest('model.discover',{}, {fetchImpl:async()=>Response.json({ok:false,error:'密钥未被接受（HTTP 401）'},{status:400})}),/401/);
});
test('a stalled model request is aborted and explained without leaving an endless busy state',async()=>{
 await assert.rejects(campusRequest('model.discover',{}, {timeoutMs:10,fetchImpl:async(_url,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))}),/读取模型超时/);
});
test('non-JSON and offline failures have actionable messages',async()=>{
 await assert.rejects(campusRequest('model.discover',{}, {fetchImpl:async()=>new Response('not json')}),/刷新/);
 await assert.rejects(campusRequest('model.discover',{}, {fetchImpl:async()=>{throw new TypeError('offline');}}),/检查网络/);
});
test('pasted key accepts outer whitespace but rejects internal line breaks',()=>{
 assert.equal(secretText(' \n synthetic-key \r\n'),'synthetic-key');assert.throws(()=>secretText('key\nother'),/格式/);
});
