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
