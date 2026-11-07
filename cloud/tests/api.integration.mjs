import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = process.env.CAMPUS_QA_URL || 'http://127.0.0.1:5173';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Integration fixtures must only run against loopback preview');
const key = 'synthetic-cloud-api-key-not-real-4567';
const made = [];
const passed = [];
let cookie = '';
async function request(action, payload = {}, options = {}) {
  const response = await fetch(base + '/api/campus', { method: 'POST',
    headers: { 'Content-Type':'application/json', Origin:options.origin || base, ...(options.anonymous ? {} : { Cookie:cookie }) },
    body:JSON.stringify({ action, payload }) });
  const value = response.headers.get('content-type')?.includes('json')
    ? await response.json() : {ok:false,error:'Non-JSON response'};
  return { status:response.status, ...value };
}
async function success(action, payload = {}) {
  const result = await request(action, payload);
  assert(result.ok, action + ': ' + result.error);
  return result.data;
}
async function upload(courseId, fileName, body, kind = 'syllabus') {
  const form = new FormData();
  form.set('courseId', courseId); form.set('kind', kind);
  form.set('file', new File([body], fileName, {type:fileName.endsWith('.html')?'text/html':'text/markdown'}));
  form.set('text', body); form.set('extractionStatus', 'complete');
  const response = await fetch(base + '/api/campus', {method:'POST',headers:{Cookie:cookie,Origin:base},body:form});
  return { status:response.status, ...await response.json() };
}
try {
  const health = await fetch(base + '/api/campus?health=1');
  assert.equal(health.status, 200, 'Local database/files/encryption health is not ready');
  assert.equal((await request('state.get', {}, {anonymous:true})).status, 401);
  const login = await fetch(base + '/signin-with-chatgpt?return_to=/', {redirect:'manual'});
  assert.equal(login.status, 302);
  cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert(cookie, 'The starter local-only mock identity did not issue a cookie');
  const initial = await success('state.get');
  assert.equal(initial.settings.hasKey, false, 'Use an isolated preview without a real API credential');
  const home = await fetch(base + '/', {headers:{Cookie:cookie}});
  assert.equal(home.status,200);
  const html = await home.text();
  assert.match(html,/Campus Coursework/);
  assert.match(html,/viewport/);
  passed.push('Authenticated server-rendered app and unauthorized API refusal');
  const stamp = Date.now();
  for (const suffix of ['A','B']) {
    const course = await success('course.create', {name:`QA-${stamp}-${suffix}`,schoolUrl:'https://school.example.org',externalId:'123',term:'Isolated test',lmsType:'canvas'});
    made.push(course.id);
  }
  assert.equal((await request('course.create', {name:'Forbidden cross-site request'}, {origin:'https://other.example.org'})).status,403);
  const body = '# Cloud-only syllabus fixture\n\nRequired reading, weekly schedule, grading and assignment rules.\n';
  const uploaded = await upload(made[0], 'Syllabus.md', body);
  assert(uploaded.ok, uploaded.error);
  const material = uploaded.data.material;
  const preview = await success('material.preview', {id:material.id});
  assert(JSON.stringify(preview).includes('Cloud-only syllabus fixture'));
  const download = await fetch(base + '/api/campus?download=' + material.id, {headers:{Cookie:cookie}});
  assert.equal(await download.text(),body);
  const unauthDownload = await fetch(base + '/api/campus?download=' + material.id);
  assert.equal(unauthDownload.status,401);
  const wrongCourse = await request('assignment.save', {courseId:made[1],title:'Wrong course binding',instructions:'Test',materialIds:[material.id]});
  assert.equal(wrongCourse.ok,false);
  const wrapper = await upload(made[0], 'login.html', '<html><body>School sign in<form><input type="password"></form></body></html>');
  assert.equal(wrapper.ok,false);
  passed.push('D1 course isolation, R2 upload/preview/original download, login-wrapper refusal and CSRF protection');
  await success('assignment.save', {courseId:made[0],title:'Repeated title',instructions:'Read Chapter 2.',chapter:'Chapter 2',materialIds:[material.id]});
  const withoutModel = await request('generate', {courseId:made[0],mode:'syllabus',materialIds:[]});
  assert.equal(withoutModel.ok,false);
  await success('model.save',{baseUrl:'https://api.example.org/v1',model:'fixture-model',apiStyle:'chat-completions',apiKey:key});
  let state = await success('state.get');
  assert.equal(state.settings.hasKey,true);
  assert.equal(JSON.stringify(state).includes(key),false);
  await success('model.save',{baseUrl:'https://other.example.org/v1',model:'fixture-model',apiStyle:'chat-completions'});
  state = await success('state.get');
  assert.equal(state.settings.hasKey,false);
  passed.push('Assignment persistence, missing-model gate and encrypted per-user setting without secret reflection');
  await success('material.delete',{id:material.id});
  assert.equal((await request('material.preview',{id:material.id})).ok,false);
} finally {
  for (const courseId of made) {
    const result = await request('course.delete',{courseId}).catch(() => null);
    assert(result?.ok, 'Could not remove isolated test course');
  }
}
fs.mkdirSync('outputs',{recursive:true});
const report = { testedAt:new Date().toISOString(),base,passed,paidModelCalls:0,liveSchoolCalls:0,browserUI:'not run: Work browser automation disabled',syntheticDataCleaned:true };
fs.writeFileSync('outputs/api-integration-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
