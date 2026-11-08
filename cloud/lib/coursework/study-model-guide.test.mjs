import test from 'node:test';
import assert from 'node:assert/strict';
import {studyAdvice} from './study-model-guide.mjs';
test('learning guide only applies an available text model and falls back explicitly when stronger models are absent',()=>{
 const simple=studyAdvice(['gpt-5-mini'],'computing','code');assert.equal(simple.model,'gpt-5-mini');assert.equal(simple.preference,'balanced');assert.equal(simple.fallback,true);
 const advanced=studyAdvice(['gpt-5-mini','gpt-5'],'computing','code');assert.equal(advanced.model,'gpt-5');assert.equal(advanced.preference,'quality');
 assert.equal(studyAdvice(['unknown-private-model'],'law','documents').model,'');
});
test('media guidance cannot advertise direct ingestion that Coursework does not implement',()=>{
 for(const material of ['tables','images','video','audio']){
  const result=studyAdvice(['gpt-5-mini'],'media',material);assert.equal(result.material.direct,false);assert(result.material.site.includes('本站'));assert.equal(result.preference,'balanced');
 }
 const video=studyAdvice(['gpt-5-mini'],'media','video');assert(video.material.action.includes('转写稿'));assert(video.material.site.includes('暂不读取'));
 const fallback=studyAdvice(['gpt-5-mini'],'missing','missing');assert.equal(fallback.major.id,'general');assert.equal(fallback.material.id,'documents');
});
