const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createService,nextRun}=require('./index.cjs');
const {selectScope,htmlText,extractText}=require('./files.cjs');
const skillRoot=path.resolve(__dirname,'../../skills/campus-coursework');

async function fixture(t,extra={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'campus-desktop-test-')),dataDir=path.join(root,'app'),workspaceRoot=path.join(root,'workspace');
  const secret=new Map(),picked=[],opened=[];
  const service=await createService({dataDir,workspaceRoot,skillRoot,secretStore:{get:name=>secret.get(name)||'',set:async(name,value)=>{await new Promise(resolve=>setTimeout(resolve,2));secret.set(name,value);}},selectFiles:async()=>picked.splice(0),openPath:async file=>opened.push(file),saveFile:async({defaultPath,content})=>{const file=path.join(root,defaultPath);fs.writeFileSync(file,content);return file;},...extra});
  t.after(()=>service.close());
  const call=(action,payload)=>service.handle(action,payload);
  const course=async(id='42',title='Same Course')=>{const state=await call('course.create',{title,school_origin:'https://school.example',course_id:id,term:'2026-Fall',section:'A'});return state.courses.find(item=>item.course_id===id);};
  const file=(name,text)=>{const target=path.join(root,name);fs.writeFileSync(target,text);return target;};
  const importFile=async(courseKey,name,text,kind)=>{picked.push(file(name,text));return call('materials.import',{courseKey,kind});};
  return {root,dataDir,workspaceRoot,service,call,course,file,importFile,picked,secret,opened};
}

test('persistent real courses remain isolated, and secret settings await safe storage and never serialize keys',async t=>{
  const f=await fixture(t),a=await f.course('42'),b=await f.course('43');
  assert.notEqual(a.key,b.key);
  const saved=await f.call('models.save',{baseUrl:'https://models.example/v1',model:'test-model',apiStyle:'chat-completions',apiKey:'private-test-key'});
  assert.equal(saved.settings.hasKey,true);assert.equal(saved.settings.apiKey,undefined);
  assert.equal(f.secret.get('modelApiKey'),'private-test-key');
  const raw=fs.readFileSync(path.join(f.dataDir,'config.json'),'utf8');assert.ok(!raw.includes('private-test-key'));
  await f.call('models.save',{baseUrl:'https://other.example/v1',model:'another'});
  assert.equal(f.secret.get('modelApiKey'),'');
  const readback=await f.call('state.get');assert.equal(readback.courses.length,2);
  assert.equal(readback.capabilities.officialSubmission,false);assert.equal(readback.capabilities.externalDetector,false);
});

test('manual imports preserve actual files, readable coverage and correct course ownership; failedPDF stays unverified',async t=>{
  const f=await fixture(t),a=await f.course('42'),b=await f.course('43');
  await f.importFile(a.key,'syllabus.txt','Official course baseline fixture. Attendance and grading.','syllabus');
  const state=await f.call('state.get');const material=state.materials.find(item=>item.courseKey===a.key);
  assert.equal(material.reading.state,'not_read');assert.equal(state.courses.find(item=>item.key===b.key).materialCount,0);
  assert.match((await f.call('material.preview',{courseKey:a.key,id:material.id})).text,/Official course/);
  await assert.rejects(f.call('material.preview',{courseKey:b.key,id:material.id}),/没有找到/);
  const result=await f.importFile(a.key,'scanned.pdf','%PDF-1.7\nnot actual readable text');
  assert.equal(result.imported,0);assert.equal(result.failed.length,1);
  const pending=(await f.call('state.get')).materials.find(item=>item.storage==='unverified');
  assert.ok(fs.existsSync(pending.path));assert.match(pending.reading.missing.join(' '),/提取器/);
});

test('login wrappers are not accepted as course text and local path escapes cannot be opened',async t=>{
  const f=await fixture(t),a=await f.course();
  const result=await f.importFile(a.key,'download.html','<html><title>Sign in</title><input type="password"></html>');
  assert.equal(result.imported,0);assert.match(result.failed[0].message,/登录页面/);
  await assert.rejects(f.call('file.open',{path:f.file('outside.txt','not a course document')}),/只能打开/);
});

test('task generation loads only its course and exact source dependency; gaps never become a detector pass',async t=>{
  let sent;
  const f=await fixture(t,{fetchImpl:async(url,request)=>{sent=JSON.parse(request.body);return new Response(JSON.stringify({model:'stub-model',choices:[{message:{content:'Reviewable draft fixture.'},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});}});
  const a=await f.course('42'),b=await f.course('43');
  await f.importFile(a.key,'syllabus.txt','Syllabus fixture. APA and legitimate assistance only.','syllabus');
  await f.importFile(a.key,'assignment.txt','Compare error and negligence using chapter 4.','assignment');
  await f.importFile(a.key,'chapter4.md','# Ch4\n## Negligence\n4-2a SELECTED_CH4_TEXT\n\n## Next section\nUNRELATED_SECTION','textbook_notes');
  await f.importFile(a.key,'chapter5.md','UNSELECTED_CH5_TEXT','textbook_notes');
  await f.importFile(b.key,'private-note.md','OTHER_COURSE_DO_NOT_SEND','research');
  const state=await f.call('state.get'),materials=state.materials.filter(item=>item.courseKey===a.key);
  const identities=JSON.parse(fs.readFileSync(path.join(f.workspaceRoot,'courses',a.key,'library.json'))).course;
  const helper=await import(pathToFileURL(path.join(skillRoot,'scripts/course-library.mjs')).href);
  const dependency=(name,locators)=>{const item=materials.find(item=>item.title===name);return {material_id:item.id,version:item.version,locators,purpose:'Fixture requirement',requires_read:true};};
  const task={platform:'canvas',item_id:'100',component:'main',title:'Repeated assignment',week:2,module:'M2',requirements_revision:'fixture-v1',requirements_checked_at:'2026-11-06',requirements_status:'historical',requirements_evidence:'isolated fixture',rubric_status:'unknown',dependencies:[dependency('syllabus.txt',['all']),dependency('assignment.txt',['all']),dependency('chapter4.md',['ch4:4-2a'])]};
  const created=helper.runRequest(f.workspaceRoot,{action:'assignment',course:identities,task});
  await f.call('models.save',{baseUrl:'http://127.0.0.1:9999/v1',model:'stub-model'});
  const output=await f.call('generate',{courseKey:a.key,taskKey:created.task_key,mode:'draft',question:'Prepare a learning draft.'});
  const user=sent.messages.find(item=>item.role==='user').content;
  assert.match(user,/SELECTED_CH4_TEXT/);assert.doesNotMatch(user,/UNSELECTED_CH5_TEXT|OTHER_COURSE_DO_NOT_SEND|UNRELATED_SECTION/);
  assert.equal(output.status,'ReadyForReview');assert.equal(output.provenance.externalDetector,'not_run');assert.equal(output.provenance.submission,'not_run');
  assert.ok(output.gaps.length>0);assert.equal(output.provenance.guidance.length,3);assert.ok(fs.existsSync(output.path));
  const exported=await f.call('output.export',{id:output.id});assert.equal(fs.readFileSync(exported.path,'utf8'),output.text);
});

test('missing locator does not silently load the entire source',()=>{
  const result=selectScope('First chapter unrelated body.', ['ch5:5-1']);
  assert.equal(result.text,'');assert.match(result.gap,/未在正文自动匹配/);
  assert.equal(htmlText('<script>bad()</script><p>Safe &amp; clear</p>'),'Safe & clear');
});

test('DOCX import extracts compressed document paragraphs and rejects broken archives',async t=>{
  const f=await fixture(t),zlib=require('node:zlib');
  const xml=Buffer.from('<?xml version="1.0"?><w:document xmlns:w="word"><w:body><w:p><w:r><w:t>First &amp; real paragraph.</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph.</w:t></w:r></w:p></w:body></w:document>');
  const filename=Buffer.from('word/document.xml'),compressed=zlib.deflateRawSync(xml),crc=zlib.crc32(xml);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(xml.length,22);local.writeUInt16LE(filename.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(xml.length,24);central.writeUInt16LE(filename.length,28);
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(local.length+filename.length+compressed.length,16);
  const archive=path.join(f.root,'fixture.docx');fs.writeFileSync(archive,Buffer.concat([local,filename,compressed,central,filename,end]));
  const result=await extractText(archive);assert.match(result.text,/First & real paragraph/);assert.match(result.text,/\nSecond paragraph/);
  const broken=f.file('broken.docx','PK broken body');await assert.rejects(extractText(broken),/Word 文件结构不完整/);
});

test('specific section selection skips earlier coverage metadata and prefers actual exhibit content',()=>{
  const ch4='# Chapter4\n\n## 已读覆盖\n4-2a p.190 has been listed in the index.\n\n## 过失、错误与欺诈\n普通过失（4-2a，p.190）是未尽合理关注。错误不自动证明过失。\n\n## 其他章节\nUNRELATED_CH4_CONTENT';
  const selected4=selectScope(ch4,['ch4:4-2a']);
  assert.equal(selected4.gap,null);assert.match(selected4.text,/合理关注/);assert.doesNotMatch(selected4.text,/已读覆盖|UNRELATED_CH4_CONTENT/);
  const ch3='# Chapter3\n\n## 已读范围\n3-4无独立页码；Exhibit3.3文字已读。\n\n## 风险与内控\nGeneral risk section 3-4 context.\n\n## 已核验Exhibit3.3：Principles Associated with Risk Assessment\nCOSO原则6明确目标，7识别风险，8考虑舞弊，9评估变化。\n\n## 后续内容\nUNRELATED_CH3_CONTENT';
  const selected3=selectScope(ch3,['ch3:3-4:exhibit3.3-text']);
  assert.equal(selected3.gap,null);assert.match(selected3.text,/COSO原则6/);assert.doesNotMatch(selected3.text,/已读范围|General risk|UNRELATED_CH3_CONTENT/);
  const missing=selectScope('# Book\n## 已读覆盖\nExhibit3.3 pending.\n## Risk Assessment\n3-4 conceptual text only.',['ch3:3-4:exhibit3.3-text']);
  assert.equal(missing.text,'');assert.match(missing.gap,/覆盖清单或目录/);
});

test('cached extraction cannot hide missing/changed source bytes; altered cache is regenerated from verified original',async t=>{
  const f=await fixture(t),course=await f.course();
  await f.importFile(course.key,'syllabus.txt','Original verified saved text.','syllabus');
  const material=(await f.call('state.get')).materials[0],cache=path.join(f.dataDir,'extracted',material.version+'.txt');
  fs.writeFileSync(cache,'ALTERED_CACHE_SHOULD_NOT_BE_USED');
  assert.equal((await f.call('material.preview',{courseKey:course.key,id:material.id})).text,'Original verified saved text.');
  fs.writeFileSync(material.path,'CHANGED_SOURCE');
  await assert.rejects(f.call('material.preview',{courseKey:course.key,id:material.id}),/原文件已被修改/);
  fs.unlinkSync(material.path);
  await assert.rejects(f.call('material.preview',{courseKey:course.key,id:material.id}),/原文件已缺失/);
});

test('Canvas preserves observed auth failure and refuses cross-school token use',async t=>{
  const requested=[];
  const f=await fixture(t,{fetchImpl:async(url,request)=>{requested.push({url,request});return new Response(JSON.stringify({error:'private-canvas-key'}),{status:401});}});
  const a=await f.course();await f.call('canvas.save',{baseUrl:'https://school.example',apiToken:'private-canvas-key'});
  await assert.rejects(f.call('canvas.test'),error=>/令牌/.test(error.message)&&!error.message.includes('private-canvas-key'));
  assert.equal(requested[0].request.redirect,'manual');assert.equal(requested[0].request.headers.Authorization,'Bearer private-canvas-key');
  await f.call('canvas.save',{baseUrl:'https://other-school.example'});assert.equal(f.secret.get('canvasApiToken'),'');
  await assert.rejects(f.call('canvas.sync',{courseKey:a.key}),/学校不同/);
});

test('Canvas sync writes actual snapshots, preserves missing chapter/rubric gaps and never marks text read',async t=>{
  const f=await fixture(t,{fetchImpl:async(url)=>{
    const parsed=new URL(url);let body;
    if(parsed.pathname==='/api/v1/courses/42')body={id:42,workflow_state:'available',syllabus_body:'<p>Read official syllabus attachment before planning.</p>',html_url:'https://school.example/courses/42'};
    else if(parsed.pathname.endsWith('/assignments'))body=[{id:100,name:'Essay',description:'<p>Read chapter 4, then explain.</p>',published:true,updated_at:'2026-11-06',rubric:[{id:'purpose',description:'Purpose',points:10}],submission:{workflow_state:'unsubmitted'}}];
    else throw new Error('unexpected test URL');
    return new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
  }});
  const a=await f.course();await f.call('canvas.save',{baseUrl:'https://school.example',apiToken:'fixture-key'});
  const result=await f.call('canvas.sync',{courseKey:a.key});assert.equal(result.savedAssignments,1);
  const state=await f.call('state.get');assert.match(state.courses[0].syllabusStatus,/快照/);
  assert.ok(state.materials.every(item=>item.reading.state==='not_read'));
  assert.ok(state.tasks[0].gaps.some(item=>item.includes('教材章节')));assert.equal(state.tasks[0].rubric_status,'embedded');
  await assert.rejects(f.call('generate',{courseKey:a.key,mode:'outline'}),/完整官方syllabus/);
});

test('archived courses cannot generate or sync; app-open schedule executes only once per due occurrence',async t=>{
  const f=await fixture(t),a=await f.course();
  await f.call('schedule.save',{courseKey:a.key,title:'Fixture reminder',day:1,time:'09:00',mode:'reminder',enabled:true});
  const configFile=path.join(f.dataDir,'config.json');let config=JSON.parse(fs.readFileSync(configFile));config.schedules[0].nextRun='2000-01-01T00:00:00Z';fs.writeFileSync(configFile,JSON.stringify(config));f.service.close();
  const reopened=await createService({dataDir:f.dataDir,workspaceRoot:f.workspaceRoot,skillRoot,secretStore:{get:()=>'',set:async()=>{}}});t.after(()=>reopened.close());
  await reopened.runDueSchedules();const first=await reopened.handle('state.get');await reopened.runDueSchedules();const second=await reopened.handle('state.get');
  assert.equal(first.events.filter(event=>event.title==='课程计划提醒').length,1);assert.equal(second.events.filter(event=>event.title==='课程计划提醒').length,1);
  assert.equal(first.schedules[0].execution,'while-app-running');assert.ok(Date.parse(first.schedules[0].nextRun)>Date.now());
  const indexPath=path.join(f.workspaceRoot,'course-index.json'),index=JSON.parse(fs.readFileSync(indexPath));index.courses[0].status='archived';fs.writeFileSync(indexPath,JSON.stringify(index));
  await assert.rejects(reopened.handle('generate',{courseKey:a.key,mode:'question',question:'test'}),/归档/);
  await assert.rejects(reopened.handle('canvas.sync',{courseKey:a.key}),/归档/);
  assert.ok(Date.parse(nextRun(0,'08:00',new Date('2026-11-06T12:00:00Z')))>Date.parse('2026-11-06T12:00:00Z'));
});
