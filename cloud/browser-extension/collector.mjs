// Runs only after an explicit extension click in the active school tab.
// No model, password input, Cookie API, storage export or external upload.
export async function collectCanvas(options){
 try{
  const origin=location.origin;if(location.protocol!=='https:')throw Error('请打开学校的HTTPS课程页面。');
  let requests=0;const MAX_BYTES=8*1024*1024,started=Date.now();
  const bounded=async(response,max)=>{const reader=response.body?.getReader();if(!reader)throw Error('学校返回空内容。');let total=0,parts=[];try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw Error('内容超过测试版上限，请缩小课程范围。');}parts.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(total);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return bytes;};
  const request=async(path)=>{
   const url=new URL(path,origin);if(url.origin!==origin||!url.pathname.startsWith('/api/v1/')||url.username||url.password)throw Error('学校列表跳转到另一网站，已停止读取。');
   if(++requests>180||Date.now()-started>240000)throw Error('读取达到测试版时限，请减少所选课程后重试。');
   await new Promise(r=>setTimeout(r,120));
   const response=await fetch(url.href,{credentials:'include',redirect:'manual',headers:{Accept:'application/json+canvas-string-ids'},signal:AbortSignal.timeout(15000)});
   if(response.status===401||response.type==='opaqueredirect'||response.status>=300&&response.status<400)throw Error('学校登录已过期。请回到官网自行登录并完成验证，再重试。');
   if(response.status===403)throw Error('当前账号无法读取这部分资料；请在学校页面核对权限。');
   if(response.status===429)throw Error('学校要求降低读取频率，请稍后重试。');
   if(!response.ok)throw Error('学校读取失败（HTTP '+response.status+'）。');
   const text=new TextDecoder().decode(await bounded(response,2*1024*1024));let data;try{data=JSON.parse(text);}catch{throw Error('返回了登录页或其他网页，请在学校官网重新核对登录。');}
   return {data,next:response.headers.get('link')?.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1]||''};
  };
  const pages=async(path,max)=>{const out=[],seen=new Set();let next=path;while(next){if(seen.has(next)||seen.size>=20)throw Error('分页过多或重复，列表尚未完整取得。');seen.add(next);const r=await request(next);if(!Array.isArray(r.data))throw Error('学校列表格式不正确。');out.push(...r.data);if(out.length>max)throw Error('列表超过测试版上限，请分批导入。');next=r.next;}return out;};
  const profile=(await request('/api/v1/users/self/profile')).data;if(!profile?.id)throw Error('无法核对当前学校账号。');
  const rows=await pages('/api/v1/courses?enrollment_type=student&enrollment_state=active&include[]=term&per_page=100',200);
  const accountLabel=String(profile.name||profile.id).slice(0,160);
  const now=Date.now(),current=c=>!['completed','deleted','concluded'].includes(c.workflow_state)&&(!c.start_at&&!c.term?.start_at||Date.parse(c.start_at||c.term.start_at)<=now)&&(!c.end_at&&!c.term?.end_at||Date.parse(c.end_at||c.term.end_at)>=now);
  if(options.mode==='discover')return {ok:true,data:{accountLabel,courses:rows.filter(c=>c.workflow_state!=='deleted').map(c=>({id:String(c.id),name:String(c.name||c.course_code||c.id),term:c.term?.name||'',current:current(c),datesKnown:Boolean(c.start_at||c.end_at||c.term?.start_at||c.term?.end_at)}))}};
  if(options.mode!=='collect'||!Array.isArray(options.ids)||!options.ids.length||options.ids.length>5||options.ids.some(id=>!rows.some(c=>String(c.id)===id)))throw Error('请选择当前学校账号下的1到5门课程。');
  const pkg={format:'campus-browser-import',version:1,schoolUrl:origin,capturedAt:new Date().toISOString(),accountLabel,courses:[]};let fileBytes=0;
  for(const id of [...new Set(options.ids)]){
   if(!/^\d{1,32}$/.test(id))throw Error('课程编号不正确。');
   const remote=(await request('/api/v1/courses/'+id+'?include[]=syllabus_body&include[]=term')).data;
   if(String(remote.id)!==id)throw Error('返回的课程编号不匹配。');
   const c={id,name:String(remote.name||id).slice(0,200),term:String(remote.term?.name||rows.find(r=>String(r.id)===id)?.term?.name||'').slice(0,120),syllabusHtml:String(remote.syllabus_body||''),weighted:remote.apply_assignment_group_weights===true,gradingPeriod:remote.has_grading_periods===true,assignments:[],groups:[],files:[],gaps:[],assignmentsComplete:false,groupsComplete:false};
   const fatal=e=>/登录|频率|时限/.test(e.message);
   try{const tasks=await pages('/api/v1/courses/'+id+'/assignments?per_page=100&include[]=submission',500);c.assignments=tasks.map(a=>({id:String(a.id),name:String(a.name||'').slice(0,300),description:String(a.description||''),rubric:a.rubric?JSON.stringify(a.rubric):'',due_at:a.due_at||'',points_possible:a.points_possible,assignment_group_id:String(a.assignment_group_id||''),omit_from_final_grade:a.omit_from_final_grade===true,grading_type:a.grading_type,submission:a.submission?{score:a.submission.score,excused:a.submission.excused===true}:null}));c.assignmentsComplete=true;}catch(e){if(fatal(e))throw e;c.gaps.push('作业：'+e.message);}
   try{c.groups=(await pages('/api/v1/courses/'+id+'/assignment_groups?per_page=100',100)).map(g=>({id:String(g.id),name:g.name||'',group_weight:g.group_weight||0,rules:g.rules||{}}));c.groupsComplete=true;}catch(e){if(fatal(e))throw e;c.gaps.push('评分组：'+e.message);}
   if(!c.syllabusHtml)c.gaps.push('学校大纲页没有正文，请核对课程文件。');
   if(c.syllabusHtml.length>300000||c.assignments.some(a=>a.description.length>80000||a.rubric.length>50000))throw Error('课程正文超过测试版上限，未截断或假报完整，请拆分资料导入。');
   if(options.attachments){
    const document=new DOMParser().parseFromString(c.syllabusHtml,'text/html');
    const syllabusIds=[...new Set([...document.querySelectorAll('a[href]')].flatMap(a=>{try{const u=new URL(a.getAttribute('href'),origin),m=u.pathname.match(/\/files\/(\d+)(?:\/|$)/);return u.origin===origin&&m?[m[1]]:[];}catch{return [];}}))];
    let available=[];try{available=await pages('/api/v1/courses/'+id+'/files?per_page=100',500);}catch(e){if(fatal(e))throw e;c.gaps.push('课程文件列表：'+e.message);}
    const allIds=[...new Set([...syllabusIds,...available.filter(f=>/\.(pdf|docx|txt|md|html?)$/i.test(f.filename||f.display_name||'')).map(f=>String(f.id))])];
    if(allIds.length>8)c.gaps.push('本轮仅尝试前8份大纲/课堂附件，其余文件请后续导入。');
    for(const fileId of allIds.slice(0,8))try{
     const meta=(await request('/api/v1/files/'+fileId)).data,name=String(meta.filename||meta.display_name||'');
     if(!/\.(pdf|docx|txt|md|html?)$/i.test(name))throw Error('格式不支持');
     if(Number(meta.size)>MAX_BYTES-fileBytes)throw Error('超出本包8MB附件预算');
     const url=new URL(meta.url);if(url.protocol!=='https:'||url.username||url.password||/^(localhost|127\.|10\.|192\.168\.|\[)/i.test(url.hostname))throw Error('附件下载地址不支持');
     const response=await fetch(url.href,{credentials:url.origin===origin?'include':'omit',redirect:'follow',signal:AbortSignal.timeout(20000)});
     if(!response.ok)throw Error('下载未成功（'+response.status+'）');
     const bytes=await bounded(response,Math.min(4*1024*1024,MAX_BYTES-fileBytes));if(!bytes.length)throw Error('文件为空');fileBytes+=bytes.length;
     const head=new TextDecoder().decode(bytes.slice(0,1000));if(/<input\b[^>]*type\s*=\s*["']?password/i.test(head))throw Error('返回登录页面');
     let binary='';for(let pos=0;pos<bytes.length;pos+=16384)binary+=String.fromCharCode(...bytes.subarray(pos,pos+16384));
     c.files.push({name:name.replace(/[\/\\\x00-\x1f]/g,'_').slice(0,240),mimeType:meta['content-type']||'application/octet-stream',base64:btoa(binary),kind:syllabusIds.includes(fileId)?'syllabus':'lecture'});
    }catch(e){if(fatal(e))throw e;c.gaps.push('附件 '+fileId+'：'+e.message);}
   }else c.gaps.push('本次未选择下载附件。');
   pkg.courses.push(c);
  }
  // Recheck the session/identity before releasing a mixed-account export.
  if(String((await request('/api/v1/users/self/profile')).data.id)!==String(profile.id))throw Error('采集期间学校账号发生变化，请重新导出。');
  return {ok:true,data:pkg};
 }catch(error){return {ok:false,error:error.message||'读取失败，请在学校官网核对后重试。'};}
}
