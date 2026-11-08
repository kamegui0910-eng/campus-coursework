import test from 'node:test';
import assert from 'node:assert/strict';
import {modelCategory,recommendModels,recommendation,modelOptions} from './model-recommendations.mjs';
test('course recommendation filters specialist IDs and chooses only offered, known models',()=>{
 const list=['text-embedding-3-large','gpt-image-1','gpt-4o-audio-preview','gpt-5-codex','gpt-5','gpt-5-mini-2025-08-07','gpt-5-mini','gpt-5-nano'];
 const picked=recommendModels(list);assert.deepEqual(picked,{balanced:'gpt-5-mini',economy:'gpt-5-nano',quality:'gpt-5'});
 for(const id of Object.values(picked))assert(list.includes(id));
 assert(!modelOptions(list).includes('gpt-5-codex'));assert.equal(modelCategory('gpt-4o-audio-preview'),null);
});
test('provider families have meaningful choices and snapshots do not outrank stable aliases',()=>{
 assert.deepEqual(recommendModels(['claude-haiku-4-5','claude-sonnet-4-5','claude-opus-4-6']),{balanced:'claude-sonnet-4-5',economy:'claude-haiku-4-5',quality:'claude-opus-4-6'});
 assert.deepEqual(recommendModels(['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.5-pro']),{balanced:'gemini-2.5-flash',economy:'gemini-2.5-flash-lite',quality:'gemini-2.5-pro'});
 assert.equal(recommendModels(['deepseek-chat','deepseek-flash','deepseek-v4-pro']).balanced,'deepseek-flash');
 assert.equal(recommendModels(['gpt-5-mini-2025-08-07','gpt-5-mini']).balanced,'gpt-5-mini');
});
test('unknown or only powerful models do not silently become the low-cost default',()=>{
 assert.deepEqual(recommendModels(['private-custom-model']),{balanced:'',economy:'',quality:''});
 assert.equal(recommendation(['gpt-5'],'balanced').model,'');assert.equal(recommendation(['gpt-5'],'economy').model,'');assert.equal(recommendation(['gpt-5'],'quality').model,'gpt-5');
 assert.throws(()=>recommendation(['gpt-5-mini'],'invalid'),/偏好/);
});
