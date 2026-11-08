import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCourseworkService } from './service.ts';

const migrationRoot=fileURLToPath(new URL('../../drizzle/',import.meta.url));
const encryptionKey='only-an-isolated-service-test-encryption-key';
function fixture(fetchImpl=async()=>{throw new Error('Unexpected provider call');}){
  const sqlite=new DatabaseSync(':memory:');
  const migrations=readdirSync(migrationRoot).filter(name=>name.endsWith('.sql')).sort();
  assert(migrations.length,'Generate the real Drizzle migration before running service tests');
  for(const name of migrations)sqlite.exec(readFileSync(migrationRoot+name,'utf8'));
  const db={prepare(sql){return {bind(...values){return {async all(){return {results:sqlite.prepare(sql).all(...values)};},async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){return {success:true,meta:sqlite.prepare(sql).run(...values)};}};}};},async batch(statements){const results=[];for(const statement of statements)results.push(await statement.run());return results;}};
  const objects=new Map();let reads=0;
  const bucket={async put(key,value){const bytes=typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(value);objects.set(key,bytes.slice());},async get(key){reads++;const value=objects.get(key);return value?{text:async()=>new TextDecoder().decode(value),body:value}:null;},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);}};
  const services=owner=>createCourseworkService({db,bucket,encryptionKey,user:{userId:owner,email:owner+'@example.invalid',displayName:owner},fetchImpl});
  return {sqlite,db,bucket,objects,get reads(){return reads;},a:services('owner-a'),b:services('owner-b')};
}
const createCourse=(service,extra={})=>service.handle('course.create',{name:'Isolated course',schoolUrl:'https://school.example.com',externalId:'101',term:'Test term',lmsType:'canvas',...extra});
async function upload(service,course,body,kind='syllabus',fileName='Syllabus.md'){
  const form=new FormData();form.set('courseId',course.id);form.set('kind',kind);form.set('file',new File([body],fileName,{type:'text/markdown'}));form.set('extractionStatus','complete');
  return (await service.upload(form)).material;
}
test('owner-scoped state, preview, download, bindings and delete refuse another user',async()=>{
  const f=fixture(),a=await createCourse(f.a),b=await createCourse(f.b);
  const material=await upload(f.a,a,'# Official syllabus\nRequired reading, grading and course schedule.');
  assert.equal((await f.b.handle('state.get')).courses.length,1);
  assert.equal((await f.b.handle('state.get')).materials.length,0);
  const before=f.reads;
  await assert.rejects(f.b.handle('material.preview',{id:material.id}),/没有找到你的/);
  await assert.rejects(f.b.download(material.id),/没有找到你的/);
  assert.equal(f.reads,before,'foreign material reached R2');
  await assert.rejects(f.b.handle('assignment.save',{courseId:b.id,title:'Wrong binding',instructions:'Test',materialIds:[material.id]}),/不属于/);
  await assert.rejects(f.b.handle('course.delete',{courseId:a.id}),/没有找到你的/);
  assert.equal((await f.a.handle('state.get')).courses.length,1);
  assert([...f.objects.keys()].every(key=>!key.includes('owner-a')));
  f.sqlite.close();
});
test('secrets stay encrypted and endpoint-origin changes clear old credentials',async()=>{
  const f=fixture();
  await f.a.handle('model.save',{baseUrl:'https://api.example.com/v1',model:'my-model',apiStyle:'chat-completions',apiKey:'synthetic-never-real-key'});
  let saved=f.sqlite.prepare('SELECT * FROM campus_settings WHERE owner_id=?').get('owner-a');
  assert(!JSON.stringify(saved).includes('synthetic-never-real-key'));
  assert(saved.model_secret);assert.equal((await f.a.handle('state.get')).settings.hasKey,true);
  assert.equal((await f.b.handle('state.get')).settings.hasKey,false);
  await f.a.handle('model.save',{baseUrl:'https://api.example.com/v1',model:'my-model',apiStyle:'chat-completions'});
  assert.equal((await f.a.handle('state.get')).settings.hasKey,true);
  await f.a.handle('model.save',{baseUrl:'https://different.example.com/v1',model:'my-model',apiStyle:'chat-completions'});
  saved=f.sqlite.prepare('SELECT * FROM campus_settings WHERE owner_id=?').get('owner-a');assert.equal(saved.model_secret,null);
  f.sqlite.close();
});
test('generation uses only owned selected material versions and real chapter body',async()=>{
  const captures=[];
  const f=fixture(async(url,init)=>{captures.push({url,init,body:JSON.parse(init.body)});return Response.json({model:'my-model',choices:[{message:{content:'Reviewable fixture result.'},finish_reason:'stop'}]});});
  const a=await createCourse(f.a),b=await createCourse(f.b);
  const syllabus=await upload(f.a,a,'# Syllabus\nStudents read required chapters and follow the assignment rubric.');
  const notes=await upload(f.a,a,'# Coverage index\nChapter 4 — read\n# Chapter 4\nRelevant body evidence.\n# Chapter 5\nUnrelated later chapter.','textbook_notes','Reading.md');
  const foreign=await upload(f.b,b,'# Syllabus\nPrivate other-owner material.');
  const assignment=await f.a.handle('assignment.save',{courseId:a.id,title:'Chapter task',instructions:'Explain the evidence.',rubric:'Use the relevant evidence.',chapter:'Chapter 4',materialIds:[notes.id]});
  await f.a.handle('model.save',{baseUrl:'https://api.example.com/v1',model:'my-model',apiStyle:'chat-completions',apiKey:'synthetic-generation-key'});
  await assert.rejects(f.a.handle('generate',{courseId:a.id,mode:'draft',assignmentId:assignment.id,materialIds:[foreign.id]}),/不属于/);
  await assert.rejects(f.b.handle('generate',{courseId:b.id,mode:'draft',assignmentId:assignment.id}),/没有找到你的/);
  assert.equal(captures.length,0);
  const output=await f.a.handle('generate',{courseId:a.id,mode:'draft',assignmentId:assignment.id,materialIds:[notes.id]});
  assert.equal(output.status,'ReadyForReview');assert.equal(output.sources.length,2);
  const sent=JSON.parse(captures[0].body.messages[1].content);
  assert(sent.materials.some(source=>source.id===syllabus.id));
  assert(sent.materials.some(source=>source.text.includes('Relevant body evidence')));
  assert(!JSON.stringify(sent).includes('Unrelated later chapter'));assert(!JSON.stringify(sent).includes('Private other-owner material'));
  assert(!JSON.stringify(sent).includes('synthetic-generation-key'));
  assert(output.sources.every(source=>/^[a-f0-9]{64}$/.test(source.loadedTextSha)));
  const newer=await upload(f.a,a,'# Chapter 4\nUpdated relevant body.','textbook_notes','Reading.md');
  assert.notEqual(newer.version,notes.version);
  assert.equal((await f.a.handle('state.get')).outputs[0].status,'NeedsReview');
  await assert.rejects(f.a.handle('generate',{courseId:a.id,mode:'draft',assignmentId:assignment.id,materialIds:[notes.id]}),/已有新版/);
  assert.equal(captures.length,1,'old material version reached provider');
  await f.a.handle('material.delete',{id:notes.id});
  assert.equal((await f.a.handle('state.get')).outputs[0].status,'NeedsReview');
  f.sqlite.close();
});
test('Canvas sync preserves actual assignment/rubric and a page snapshot is not full syllabus',async()=>{
  let calls=0;
  const f=fixture(async(url,init)=>{
    calls++;assert.equal(init.headers.Authorization,'Bearer synthetic-canvas-token');assert.equal(init.redirect,'manual');
    if(url.includes('/users/self/profile'))return Response.json({id:9,name:'Synthetic student',primary_email:'school-student@example.invalid'});
    if(url.includes('/assignments?'))return Response.json([{id:71,name:'Official task',description:'<p>Actual instructions.</p>',rubric:[{description:'Evidence'}],due_at:'2026-12-01T20:00:00Z',updated_at:'revision-one'}]);
    return Response.json({id:101,workflow_state:'available',syllabus_body:'<h1>Syllabus</h1><a href="/files/1">Full syllabus PDF</a>'});
  });
  const c=await createCourse(f.a);
  await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',email:'school-student@example.invalid',apiToken:'synthetic-canvas-token'});
  assert.equal((await f.a.handle('canvas.test')).verified,true);
  const result=await f.a.handle('canvas.sync',{courseId:c.id});assert.equal(result.savedAssignments,1);assert.equal(result.syllabusSaved,true);
  const state=await f.a.handle('state.get');assert.match(state.materials[0].status,/snapshot/);assert.match(state.assignments[0].instructions,/Actual instructions/);assert.match(state.assignments[0].rubric,/Evidence/);
  const before=calls;
  await assert.rejects(f.a.handle('generate',{courseId:c.id,mode:'outline'}),/完整可读的大纲/);
  assert.equal(calls,before,'snapshot-only course called a paid model');
  assert(!JSON.stringify(state).includes('synthetic-canvas-token'));
  f.sqlite.close();
});
test('empty or login-wrapper uploads never become readable course materials',async()=>{
  const f=fixture(),course=await createCourse(f.a);
  await assert.rejects(upload(f.a,course,''),/文件为空/);
  await assert.rejects(upload(f.a,course,'<form><input type="password"></form>','syllabus','syllabus.html'),/登录页面/);
  assert.equal((await f.a.handle('state.get')).materials.length,0);
  f.sqlite.close();
});
test('corrected extraction of the same original creates an immutable repair version',async()=>{
  const f=fixture(),course=await createCourse(f.a),original='synthetic-pdf-bytes-for-storage-test';
  async function imported(body,status){
    const form=new FormData();form.set('courseId',course.id);form.set('kind','syllabus');
    form.set('file',new File([original],'Syllabus.pdf',{type:'application/pdf'}));form.set('text',body);form.set('extractionStatus',status);
    return (await f.a.upload(form)).material;
  }
  const partial=await imported('Partial extracted syllabus.','partial');
  await assert.rejects(f.a.handle('generate',{courseId:course.id,mode:'outline'}),/完整可读的大纲/);
  const completed=await imported('Partial extracted syllabus.','pdf-complete');
  assert.notEqual(partial.id,completed.id);assert.equal(partial.version,completed.version);
  const repaired=await imported('Corrected complete syllabus with requirements.','pdf-complete');
  assert.notEqual(repaired.id,completed.id);assert.equal(repaired.version,completed.version);
  assert.equal((await imported('Corrected complete syllabus with requirements.','pdf-complete')).id,repaired.id);
  assert.equal((await f.a.handle('state.get')).materials.length,3);
  assert.match((await f.a.handle('material.preview',{id:repaired.id})).text,/Corrected complete/);
  f.sqlite.close();
});
test('changing the configured Canvas identity clears old token and sync checks the new identity',async()=>{
  const calls=[];
  const f=fixture(async(url)=>{calls.push(url);return Response.json({id:1,primary_email:'student-a@example.invalid'});});
  const course=await createCourse(f.a);
  await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',email:'student-a@example.invalid',apiToken:'synthetic-account-a-token'});
  assert.equal((await f.a.handle('canvas.test')).verified,true);
  await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',email:'student-b@example.invalid'});
  assert.equal((await f.a.handle('state.get')).canvas.hasToken,false);
  const before=calls.length;
  await assert.rejects(f.a.handle('canvas.sync',{courseId:course.id}),/先保存/);assert.equal(calls.length,before);
  await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',email:'student-b@example.invalid',apiToken:'synthetic-account-a-token'});
  await assert.rejects(f.a.handle('canvas.sync',{courseId:course.id}),/账号.*不一致/);
  assert(calls.every(url=>url.endsWith('/users/self/profile')),'wrong identity reached course API');
  await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',email:'',apiToken:'synthetic-account-a-token'});
  assert.equal((await f.a.handle('state.get')).canvas.hasToken,true);
  await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',email:'student-b@example.invalid'});
  assert.equal((await f.a.handle('state.get')).canvas.hasToken,false,'newly specified account retained an unbound token');
  f.sqlite.close();
});
test('editing requirements or resyncing cannot erase official submitted states',async()=>{
  let submitted=true;
  const f=fixture(async(url)=>{
    if(url.includes('/users/self/profile'))return Response.json({id:1,primary_email:'student@example.invalid'});
    if(url.includes('/assignments?'))return Response.json([{id:71,name:'Official task',description:'Actual instructions.'+(submitted?'':' Updated.'),submission:submitted?{workflow_state:'submitted'}:undefined}]);
    return Response.json({id:101,workflow_state:'available'});
  });
  const course=await createCourse(f.a);
  await upload(f.a,course,'# Complete syllabus\nCourse requirements and grading.');
  await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',email:'student@example.invalid',apiToken:'synthetic-canvas-token'});
  await f.a.handle('canvas.sync',{courseId:course.id});
  const task=(await f.a.handle('state.get')).assignments[0];assert.equal(task.status,'Submitted');
  for(const status of ['Submitted','Graded','SubmissionUnknown']){
    f.sqlite.prepare('UPDATE campus_assignments SET status=? WHERE id=?').run(status,task.id);
    const edited=await f.a.handle('assignment.save',{id:task.id,courseId:course.id,title:'Edited '+status,instructions:'Edited instructions.',rubric:'Edited rubric.',chapter:'Chapter 4',materialIds:[]});
    assert.equal(edited.status,status);
    await assert.rejects(f.a.handle('generate',{courseId:course.id,mode:'draft',assignmentId:task.id}),/已有提交或状态不明/);
  }
  submitted=false;
  await f.a.handle('canvas.sync',{courseId:course.id});
  assert.equal((await f.a.handle('state.get')).assignments[0].status,'SubmissionUnknown');
  f.sqlite.close();
});

test('generation claims are owner-scoped, coalesce concurrent input and reuse saved results',async()=>{
  let calls=0,release;const ready=new Promise(resolve=>release=resolve);
  const f=fixture(async()=>{calls++;await ready;return Response.json({model:'fixture-model',choices:[{message:{content:'Durable result.'},finish_reason:'stop'}]});});
  const c=await createCourse(f.a);await upload(f.a,c,'# Syllabus\nComplete synthetic baseline.');
  await f.a.handle('model.save',{baseUrl:'https://models.example/v1',model:'fixture-model',apiStyle:'chat-completions',apiKey:'synthetic-key'});
  const payload={courseId:c.id,mode:'question',question:'Explain the baseline.',requestId:'same-request'};
  const a=f.a.handle('generate',payload),b=f.a.handle('generate',payload);release();
  const results=await Promise.all([a,b]);assert.equal(calls,1);
  assert(results.some(r=>r.pending));const completed=results.find(r=>!r.pending);assert(completed.id);
  const reused=await f.a.handle('generate',payload);assert.equal(reused.id,completed.id);assert.equal(reused.reused,true);assert.equal(calls,1);
  await assert.rejects(f.a.handle('generate',{...payload,question:'Different input'}),/不同内容/);assert.equal(calls,1);
  const state=await f.a.handle('state.get');assert.equal(state.jobs.length,1);assert.equal(state.jobs[0].status,'completed');assert.equal(state.jobs[0].payload,undefined);
  assert.equal((await f.b.handle('state.get')).jobs.length,0);
  await assert.rejects(f.b.handle('job.retry',{id:state.jobs[0].id,confirmed:true}),/没有找到你的/);
  await f.a.handle('course.delete',{id:c.id});assert.equal((await f.a.handle('state.get')).jobs.length,0);f.sqlite.close();
});
test('unknown generation results require an explicit retry and preserve the first attempt',async()=>{
  let calls=0;const f=fixture(async()=>{calls++;if(calls===1)throw Error('Synthetic network interruption');return Response.json({model:'fixture-model',choices:[{message:{content:'Retried result.'},finish_reason:'stop'}]});});
  const c=await createCourse(f.a);await upload(f.a,c,'# Syllabus\nComplete synthetic baseline.');
  await f.a.handle('model.save',{baseUrl:'https://models.example/v1',model:'fixture-model',apiStyle:'chat-completions',apiKey:'synthetic-key'});
  const payload={courseId:c.id,mode:'question',question:'Explain the baseline.',requestId:'interrupted-request'};
  await assert.rejects(f.a.handle('generate',payload));assert.equal(calls,1);
  await assert.rejects(f.a.handle('generate',payload));assert.equal(calls,1);
  const job=(await f.a.handle('state.get')).jobs[0];assert.equal(job.status,'interrupted');
  await assert.rejects(f.a.handle('job.retry',{id:job.id}),/确认/);assert.equal(calls,1);
  const result=await f.a.handle('job.retry',{id:job.id,confirmed:true});assert(result.id);assert.equal(calls,2);
  const jobs=(await f.a.handle('state.get')).jobs;assert.equal(jobs.length,2);assert(jobs.some(j=>j.retryOf===job.id&&j.status==='completed'));
  f.sqlite.close();
});
test('expired persisted jobs are visible after service reconstruction without invoking a model',async()=>{
  const f=fixture();const c=await createCourse(f.a);
  f.sqlite.prepare("INSERT INTO campus_jobs(id,owner_id,course_id,request_id,fingerprint,status,payload,output_id,retry_of,lease_until,error,created_at,updated_at) VALUES(?,?,?,?,?,'running',?,?,NULL,0,'',?,?)").run(crypto.randomUUID(),'owner-a',c.id,'expired','test','{"mode":"question"}',crypto.randomUUID(),new Date().toISOString(),new Date().toISOString());
  const fresh=createCourseworkService({db:f.db,bucket:f.bucket,encryptionKey,user:{userId:'owner-a',displayName:'Synthetic',email:'synthetic@example.invalid'},fetchImpl:async()=>{throw Error('Must not call provider');}});
  const state=await fresh.handle('state.get');assert.equal(state.jobs[0].status,'interrupted');assert.match(state.jobs[0].error,/核对/);f.sqlite.close();
});

test('artifact review includes the selected draft and exact-version records cannot forge release',async()=>{
 const captures=[];const f=fixture(async(url,init)=>{captures.push(JSON.parse(init.body));return Response.json({model:'my-model',choices:[{message:{content:'Synthetic saved artifact'},finish_reason:'stop'}]});});
 const c=await createCourse(f.a);await upload(f.a,c,'# Complete syllabus\nOfficial grading and schedule.');
 await f.a.handle('model.save',{baseUrl:'https://api.example.com/v1',model:'my-model',apiStyle:'chat-completions',apiKey:'synthetic'});
 const out=await f.a.handle('generate',{courseId:c.id,mode:'question',question:'Explain',requestId:'artifact-original'});
 await assert.rejects(f.b.handle('output.recordReview',{id:out.id,artifactSha:out.artifactSha,stage:'format',note:'Checked format'}),/没有找到你的/);
 await assert.rejects(f.a.handle('output.recordReview',{id:out.id,artifactSha:'0'.repeat(64),stage:'format',note:'Checked format'}));
 await assert.rejects(f.a.handle('output.recordReview',{id:out.id,artifactSha:out.artifactSha,stage:'external',note:'Pretend pass'}));
 const saved=await f.a.handle('output.recordReview',{id:out.id,artifactSha:out.artifactSha,stage:'format',note:'Checked actual paragraph formatting'});
 assert.equal(saved.workflow.format.status,'recorded');assert.equal(saved.workflow.release,'final_audit_pending');
 const review=await f.a.handle('generate',{courseId:c.id,mode:'review',requestId:'artifact-review',reviewOutputId:out.id});
 assert.equal(review.reviewOf,out.id);assert.equal(JSON.parse(captures[1].messages[1].content).reviewArtifact.text,out.text);
 const original=(await f.a.handle('state.get')).outputs.find(o=>o.id===out.id);
 assert.equal(original.workflow.content.status,'assessment_saved');assert.equal(original.workflow.external.status,'not_connected');f.sqlite.close();
});

test('draft review restores the original assignment and rejects conflicting task or artifact bindings',async()=>{
 const captures=[];const f=fixture(async(url,init)=>{captures.push(JSON.parse(init.body));return Response.json({model:'fixture',choices:[{message:{content:'Synthetic draft'},finish_reason:'stop'}]});});
 try{
  const c=await createCourse(f.a);await upload(f.a,c,'# Complete syllabus\nSynthetic course requirements.');
  await f.a.handle('model.save',{baseUrl:'https://models.example.com/v1',model:'fixture',apiStyle:'chat-completions',apiKey:'synthetic'});
  const task=await f.a.handle('assignment.save',{courseId:c.id,title:'Original task',instructions:'Analyze supplied evidence.',rubric:'Use the supplied rubric.',materialIds:[]});
  const other=await f.a.handle('assignment.save',{courseId:c.id,title:'Other task',instructions:'Different instructions.',materialIds:[]});
  const out=await f.a.handle('generate',{courseId:c.id,assignmentId:task.id,mode:'draft',requestId:'bound-draft'});
  await assert.rejects(f.a.handle('generate',{courseId:c.id,assignmentId:other.id,mode:'review',reviewOutputId:out.id,requestId:'wrong-review-task'}),/原稿.*作业/);
  await assert.rejects(f.a.handle('generate',{courseId:c.id,mode:'review',reviewOutputId:out.id,reviewArtifactSha:'0'.repeat(64),requestId:'wrong-review-hash'}),/原稿版本/);
  const review=await f.a.handle('generate',{courseId:c.id,mode:'review',reviewOutputId:out.id,reviewArtifactSha:out.artifactSha,requestId:'bound-review'});
  assert.equal(review.assignmentId,task.id);const prompt=JSON.parse(captures[1].messages[1].content);
  assert.equal(prompt.assignment.id,task.id);assert.equal(prompt.assignment.rubric,'Use the supplied rubric.');assert.equal(prompt.reviewArtifact.text,out.text);
 }finally{f.sqlite.close();}
});
test('replaying confirmed retry coalesces its persistent child job',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;if(calls===1)throw Error('Synthetic unknown result');await new Promise(resolve=>setTimeout(resolve,10));return Response.json({model:'fixture',choices:[{message:{content:'Synthetic retry'},finish_reason:'stop'}]});});
 try{
  const c=await createCourse(f.a);await upload(f.a,c,'# Complete syllabus\nSynthetic course requirements.');await f.a.handle('model.save',{baseUrl:'https://models.example.com/v1',model:'fixture',apiStyle:'chat-completions',apiKey:'synthetic'});
  await assert.rejects(f.a.handle('generate',{courseId:c.id,mode:'question',question:'Explain syllabus.',requestId:'unknown-parent'}));
  const job=(await f.a.handle('state.get')).jobs[0];
  const results=await Promise.all([f.a.handle('job.retry',{id:job.id,confirmed:true}),f.a.handle('job.retry',{id:job.id,confirmed:true})]);
  assert.equal(calls,2);assert(results.some(r=>r.pending));const saved=results.find(r=>r.id);
  const repeated=await f.a.handle('job.retry',{id:job.id,confirmed:true});assert.equal(repeated.id,saved.id);assert.equal(repeated.reused,true);assert.equal(calls,2);
  assert.equal((await f.a.handle('state.get')).jobs.length,2);
  const explicit=await f.a.handle('generate',{courseId:c.id,mode:'question',question:'Explain syllabus.',requestId:'new-after-completed-retry'});assert(explicit.id);assert.equal(calls,3,'a later explicit generation is allowed after the latest attempt completed');
 }finally{f.sqlite.close();}
});
test('new client request ids cannot silently resend identical running or unknown input',async()=>{
 let calls=0,release;const gate=new Promise(resolve=>release=resolve);
 const f=fixture(async()=>{calls++;await gate;throw Error('Synthetic unknown result');});
 try{
  const c=await createCourse(f.a);await upload(f.a,c,'# Complete syllabus\nSynthetic course requirements.');await f.a.handle('model.save',{baseUrl:'https://models.example.com/v1',model:'fixture',apiStyle:'chat-completions',apiKey:'synthetic'});
  const request={courseId:c.id,mode:'question',question:'Explain syllabus.'};
  const first=f.a.handle('generate',{...request,requestId:'first-client'});
  const second=f.a.handle('generate',{...request,requestId:'different-client'});
  const firstOutcome=assert.rejects(first);const pending=await second;assert.equal(pending.pending,true);assert.equal(calls,1);
  release();await firstOutcome;
  await assert.rejects(f.a.handle('generate',{...request,requestId:'storage-cleared-client',retryOf:'invented-bypass'}),/相同内容.*待核对/);assert.equal(calls,1);
  assert.equal((await f.a.handle('state.get')).jobs.length,1);
 }finally{release();f.sqlite.close();}
});
test('model review merges concurrent manual records rather than overwriting them',async()=>{
 let release,started;const gate=new Promise(resolve=>release=resolve),ready=new Promise(resolve=>started=resolve);
 const f=fixture(async(url,init)=>{const prompt=JSON.parse(JSON.parse(init.body).messages[1].content);if(prompt.mode==='review'){started();await gate;}return Response.json({model:'fixture',choices:[{message:{content:'Synthetic artifact'},finish_reason:'stop'}]});});
 try{
  const c=await createCourse(f.a);await upload(f.a,c,'# Complete syllabus\nSynthetic course requirements.');await f.a.handle('model.save',{baseUrl:'https://models.example.com/v1',model:'fixture',apiStyle:'chat-completions',apiKey:'synthetic'});
  const out=await f.a.handle('generate',{courseId:c.id,mode:'question',question:'Explain syllabus.',requestId:'merge-original'});
  const reviewing=f.a.handle('generate',{courseId:c.id,mode:'review',reviewOutputId:out.id,requestId:'merge-review'});await ready;
  await Promise.all(['format','student'].map(stage=>f.a.handle('output.recordReview',{id:out.id,artifactSha:out.artifactSha,stage,note:'Actual synthetic check recorded'})));
  release();await reviewing;const saved=(await f.a.handle('state.get')).outputs.find(o=>o.id===out.id);
  assert.equal(saved.workflow.format.status,'recorded');assert.equal(saved.workflow.student.status,'recorded');assert.equal(saved.workflow.content.status,'assessment_saved');assert.equal(saved.workflow.release,'final_audit_pending');
 }finally{release();f.sqlite.close();}
});
test('changed source or draft bytes cannot receive a stale review record',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return Response.json({model:'fixture',choices:[{message:{content:'Synthetic artifact'},finish_reason:'stop'}]});});
 try{
  const c=await createCourse(f.a),source=await upload(f.a,c,'# Complete syllabus\nSynthetic course requirements.');await f.a.handle('model.save',{baseUrl:'https://models.example.com/v1',model:'fixture',apiStyle:'chat-completions',apiKey:'synthetic'});
  const out=await f.a.handle('generate',{courseId:c.id,mode:'question',question:'Explain syllabus.',requestId:'byte-original'});
  const sourceRow=f.sqlite.prepare('SELECT * FROM campus_materials WHERE id=?').get(source.id),original=f.objects.get(sourceRow.text_key);f.objects.set(sourceRow.text_key,new TextEncoder().encode('Corrupted synthetic source'));
  await assert.rejects(f.a.handle('output.recordReview',{id:out.id,artifactSha:out.artifactSha,stage:'format',note:'Actual format check'}),/校验不一致/);
  await assert.rejects(f.a.handle('generate',{courseId:c.id,mode:'review',reviewOutputId:out.id,requestId:'bad-source-review'}),/校验不一致/);assert.equal(calls,1);
  f.objects.set(sourceRow.text_key,original);f.sqlite.prepare('UPDATE campus_outputs SET body=? WHERE id=?').run('Changed draft body',out.id);
  await assert.rejects(f.a.handle('generate',{courseId:c.id,mode:'review',reviewOutputId:out.id,requestId:'bad-body-review'}),/原稿版本/);assert.equal(calls,1);
 }finally{f.sqlite.close();}
});
test('review saved during an assignment change preserves the assessment without clearing stale state',async()=>{
 let release,started;const gate=new Promise(resolve=>release=resolve),ready=new Promise(resolve=>started=resolve);
 const f=fixture(async(url,init)=>{const prompt=JSON.parse(JSON.parse(init.body).messages[1].content);if(prompt.mode==='review'){started();await gate;}return Response.json({model:'fixture',choices:[{message:{content:'Synthetic artifact'},finish_reason:'stop'}]});});
 try{
  const c=await createCourse(f.a);await upload(f.a,c,'# Complete syllabus\nSynthetic course requirements.');await f.a.handle('model.save',{baseUrl:'https://models.example.com/v1',model:'fixture',apiStyle:'chat-completions',apiKey:'synthetic'});
  const task=await f.a.handle('assignment.save',{courseId:c.id,title:'Original task',instructions:'Original instructions.',rubric:'Original rubric.',materialIds:[]});
  const out=await f.a.handle('generate',{courseId:c.id,assignmentId:task.id,mode:'draft',requestId:'stale-original'});
  const reviewing=f.a.handle('generate',{courseId:c.id,mode:'review',reviewOutputId:out.id,requestId:'stale-review'});await ready;
  await f.a.handle('assignment.save',{id:task.id,courseId:c.id,title:task.title,instructions:'Updated instructions.',rubric:'Updated rubric.',materialIds:[]});release();
  const reviewed=await reviewing;assert.equal(reviewed.status,'NeedsReview');assert(reviewed.gaps.some(g=>g.includes('处理中变化')));
  const saved=(await f.a.handle('state.get')).outputs.find(o=>o.id===out.id);assert.equal(saved.workflow.content.status,'pending');assert.equal(saved.status,'NeedsReview');
  await assert.rejects(f.a.handle('output.recordReview',{id:out.id,artifactSha:out.artifactSha,stage:'content',note:'A stale content check'}),/作业要求已变化/);
 }finally{release();f.sqlite.close();}
});

test('Canvas discovery/import follows pagination, isolates origins and reimports stable records',async()=>{
 const calls=[];
 const f=fixture(async(url,init)=>{
  calls.push(url);assert.equal(new URL(url).origin,'https://school.example.com');
  if(url.includes('/users/self/profile'))return Response.json({id:'student',name:'Fixture student'});
  if(url.includes('/api/v1/courses?enrollment_type'))return Response.json([{id:'101',name:'Course one',workflow_state:'available',term:{id:'fall',name:'Fall'}}],{headers:{link:'<https://school.example.com/api/v1/courses?page=2>; rel="next"'}});
  if(url.includes('/api/v1/courses?page=2'))return Response.json([{id:'102',name:'Course two',workflow_state:'available',term:{id:'fall',name:'Fall'}}]);
  if(url.includes('/assignment_groups?'))return Response.json([{id:'group',name:'All',group_weight:100}]);
  if(url.includes('/assignments?'))return Response.json([{id:'71',name:'Final',points_possible:100,assignment_group_id:'group',description:'Final instructions',submission:{score:90,workflow_state:'graded'}}]);
  return Response.json({id:new URL(url).pathname.split('/').pop(),workflow_state:'available',apply_assignment_group_weights:true,syllabus_body:'<h1>Official syllabus page</h1>'});
 });
 await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',apiToken:'synthetic-canvas-token'});
 const payload={url:'https://school.example.com/courses/101',externalIds:['101','102']};
 const preview=await f.a.handle('canvas.discover',payload);assert.equal(preview.courses.length,2);assert.equal(preview.complete,true);
 assert.equal((await f.a.handle('state.get')).courses.length,0,'preview must not import');
 const result=await f.a.handle('canvas.import',payload);assert.equal(result.complete,false);assert.equal(result.results.length,2);
 await f.a.handle('canvas.import',payload);
 const state=await f.a.handle('state.get');assert.equal(state.courses.length,2);assert.equal(state.assignments.length,2);assert.equal(state.assignments[0].classification.kind,'final');assert.equal(state.assignments[0].impact.percent,100);
 const grades=await f.a.handle('grades.get',{courseId:state.courses[0].id});assert.equal(grades.result.percent,90);
 await assert.rejects(f.b.handle('grades.get',{courseId:state.courses[0].id}),/没有找到你的/);
 const before=calls.length;await assert.rejects(f.a.handle('canvas.discover',{url:'https://another.example.com/courses/101'}),/学校不同/);assert.equal(calls.length,before);
 f.sqlite.close();
});
test('hostile pagination never receives a Canvas credential',async()=>{
 const calls=[];const f=fixture(async(url)=>{calls.push(url);if(url.includes('/users/self/profile'))return Response.json({id:1});return Response.json([{id:'101'}],{headers:{link:'<https://evil.example.com/api/v1/courses?page=2>; rel="next"'}});});
 await f.a.handle('canvas.save',{baseUrl:'https://school.example.com',apiToken:'synthetic-canvas-token'});
 await assert.rejects(f.a.handle('canvas.discover',{url:'https://school.example.com/courses/101'}),/另一个网站/);
 assert(calls.every(url=>new URL(url).origin==='https://school.example.com'));f.sqlite.close();
});

test('browser import needs confirmation, deduplicates and preserves official states without making network calls',async()=>{
 const f=fixture();
 try{
  const pkg={format:'campus-browser-import',version:1,schoolUrl:'https://school.example.com',capturedAt:'2026-11-08T01:00:00Z',accountLabel:'Synthetic student',courses:[{id:'101',name:'Browser course',term:'Fall',syllabusHtml:'<h1>Official syllabus page</h1>',weighted:true,assignmentsComplete:true,groupsComplete:true,assignments:[{id:'71',name:'Final',points_possible:100,assignment_group_id:'1',description:'Explain evidence',rubric:'Use sources',submission:{score:90,workflow_state:'graded'}}],groups:[{id:'1',name:'Final',group_weight:100}],gaps:[]}]};
  await assert.rejects(f.a.handle('browser.import',{package:pkg,externalId:'101'}),/预览/);
  const request={package:pkg,externalId:'101',confirmed:true};
  const first=await f.a.handle('browser.import',request);assert.equal(first.savedAssignments,1);
  await f.a.handle('browser.import',request);
  let state=await f.a.handle('state.get');assert.equal(state.courses.length,1);assert.equal(state.assignments.length,1);assert.equal(state.assignments[0].status,'NeedsReview');assert.equal(state.assignments[0].rubric,'Use sources');
  const grades=await f.a.handle('grades.get',{courseId:first.courseId});assert.equal(grades.result.percent,90);assert(grades.result.warnings.some(x=>x.includes('浏览器导出')));
  f.sqlite.prepare("UPDATE campus_assignments SET status='Submitted' WHERE course_id=?").run(first.courseId);
  pkg.courses[0].assignments[0].description='Updated requirements';await f.a.handle('browser.import',request);
  state=await f.a.handle('state.get');assert.equal(state.assignments[0].status,'Submitted');
  const partial=structuredClone(pkg);partial.courses[0].assignments=[];partial.courses[0].assignmentsComplete=false;
  const incomplete=await f.a.handle('browser.import',{package:partial,externalId:'101',confirmed:true});assert(incomplete.gaps.some(x=>x.includes('保留原评分快照')));
  assert.equal((await f.a.handle('grades.get',{courseId:first.courseId})).result.percent,90);
  assert.equal((await f.a.handle('state.get')).assignments.length,1);
  await assert.rejects(f.b.handle('grades.get',{courseId:first.courseId}),/没有找到你的/);
  await f.b.handle('browser.import',request);assert.equal((await f.b.handle('state.get')).courses.length,1);assert.notEqual((await f.b.handle('state.get')).courses[0].id,first.courseId);
  const older=structuredClone(pkg);older.capturedAt='2026-11-07T01:00:00Z';await assert.rejects(f.a.handle('browser.import',{package:older,externalId:'101',confirmed:true}),/更旧/);
 }finally{f.sqlite.close();}
});

test('anonymous guests have separate data and secrets, with course and storage limits',async()=>{
 const f=fixture();
 try{
  const {guestIdentity,newGuestToken}=await import('../guest-session.mjs');
  const a=createCourseworkService({db:f.db,bucket:f.bucket,encryptionKey,user:await guestIdentity(newGuestToken())});
  const b=createCourseworkService({db:f.db,bucket:f.bucket,encryptionKey,user:await guestIdentity(newGuestToken())});
  const course=await createCourse(a),file=await upload(a,course,'# Guest syllabus');
  assert.equal((await b.handle('state.get')).courses.length,0);await assert.rejects(b.download(file.id),/没有找到你的/);
  await a.handle('model.save',{baseUrl:'https://api.example.com',model:'fixture',apiStyle:'chat-completions',apiKey:'private-guest-model-key'});
  assert.equal((await b.handle('state.get')).settings.hasKey,false);assert.equal((await f.a.handle('state.get')).settings.hasKey,false);
  f.sqlite.prepare('UPDATE campus_materials SET bytes=? WHERE id=?').run(100*1024*1024,file.id);
  await assert.rejects(upload(a,course,'# Another version','syllabus','Other.md'),/100MB/);
  for(let index=1;index<20;index++)await createCourse(a,{name:'Guest '+index});await assert.rejects(createCourse(a),/20门/);
  assert.equal((await f.a.handle('state.get')).courses.length,0);
 }finally{f.sqlite.close();}
});

test('onboarding completion uses saved credentials and owned courses, persists and isolates owners',async()=>{
 const f=fixture();
 assert.equal((await f.a.handle('state.get')).onboarding.completed,false);
 await assert.rejects(f.a.handle('onboarding.save',{mode:'ai',step:3,complete:true,courseDeferred:true,modelReady:true}),/先保存/);
 await assert.rejects(f.a.handle('onboarding.save',{mode:'library',step:3,complete:true}),/第一门/);
 await f.a.handle('onboarding.save',{mode:'library',step:2});
 assert.equal((await f.a.handle('state.get')).onboarding.step,2);
 assert.equal((await f.b.handle('state.get')).onboarding.step,0);
 const c=await createCourse(f.a,{lmsType:'other',schoolUrl:''});assert.equal(c.schoolUrl,'');
 await f.a.handle('onboarding.save',{mode:'library',step:3,complete:true});
 const restored=createCourseworkService({db:f.db,bucket:f.bucket,encryptionKey,user:{userId:'owner-a',email:'a@example.invalid',displayName:'A'}});
 assert.equal((await restored.handle('state.get')).onboarding.completed,true);
 assert.equal((await f.b.handle('state.get')).onboarding.completed,false);
 await f.b.handle('onboarding.save',{mode:'library',step:3,complete:true,courseDeferred:true});
 assert.equal((await f.b.handle('state.get')).onboarding.completed,true);
 await assert.rejects(createCourse(f.b,{schoolUrl:''}),/地址/);
 f.sqlite.close();
});
test('existing workspace remains usable and valid AI setup can finish without provider generation',async()=>{
 const f=fixture();await createCourse(f.a);
 assert.equal((await f.a.handle('state.get')).onboarding.completed,true);
 await f.b.handle('model.save',{baseUrl:'https://api.example.com/v1',model:'test-model',apiStyle:'chat-completions',apiKey:'synthetic-setup-only-key'});
 await f.b.handle('onboarding.save',{mode:'ai',step:3,complete:true,courseDeferred:true});
 assert.equal((await f.b.handle('state.get')).onboarding.completed,true);
 await assert.rejects(f.b.handle('onboarding.save',{step:7}),/步骤/);
 f.sqlite.close();
});

test('model discovery needs no model ID, never saves input, and never forwards a saved key to another origin',async()=>{
 const calls=[];const f=fixture(async(url,init)=>{calls.push({url,init});return Response.json({data:[{id:'first-actual-model'}]});});
 const discovered=await f.a.handle('model.discover',{baseUrl:'https://api.example.com/v1',apiStyle:'chat-completions',apiKey:'synthetic-discovery-key'});
 assert.deepEqual(discovered.models,['first-actual-model']);assert.equal((await f.a.handle('state.get')).settings.hasKey,false);assert.equal(calls[0].init.method,'GET');
 await f.a.handle('model.save',{baseUrl:'https://api.example.com/v1',model:'first-actual-model',apiStyle:'chat-completions',apiKey:'synthetic-saved-key'});
 await assert.rejects(f.a.handle('model.discover',{baseUrl:'https://other.example.com/v1',apiStyle:'chat-completions'}),/当前平台/);assert.equal(calls.length,1);
 await assert.rejects(f.b.handle('model.discover',{baseUrl:'https://api.example.com/v1',apiStyle:'chat-completions'}),/当前平台/);assert.equal(calls.length,1);
 await f.a.handle('model.discover',{baseUrl:'https://api.example.com/v1',apiStyle:'chat-completions'});assert.equal(calls[1].init.headers.Authorization,'Bearer synthetic-saved-key');f.sqlite.close();
});
