import {publicUrl,htmlText} from './helpers.mjs';
const limited=(v,max,label)=>{if(typeof v!=='string'||v.length>max)throw Error(label+'格式或长度不正确。');return v;};
const numeric=v=>{if(!/^\d{1,32}$/.test(String(v)))throw Error('课程或作业编号不正确。');return String(v);};
export function validateBrowserPackage(input){
 if(!input||input.format!=='campus-browser-import'||input.version!==1)throw Error('请选择 Coursework 浏览器助手导出的 .coursework.json 文件。');
 const schoolUrl=new URL(publicUrl(input.schoolUrl,'学校网址')).origin;
 if(!input.capturedAt||!Number.isFinite(Date.parse(input.capturedAt)))throw Error('导出日期不正确。');
 if(!Array.isArray(input.courses)||!input.courses.length||input.courses.length>5)throw Error('每个导入包需包含1到5门课程。');
 const seen=new Set();
 const courses=input.courses.map(c=>{
  const id=numeric(c.id);if(seen.has(id))throw Error('导入包包含重复课程。');seen.add(id);
  if(!Array.isArray(c.assignments)||c.assignments.length>500||!Array.isArray(c.groups)||c.groups.length>100)throw Error('作业或评分组超过本版上限。');
  const taskIds=new Set();
  const assignments=c.assignments.map(a=>{
   const aid=numeric(a.id);if(taskIds.has(aid))throw Error('导入包包含重复作业。');taskIds.add(aid);
   const points=a.points_possible==null?null:Number(a.points_possible),score=a.submission?.score==null?null:Number(a.submission.score);
   if(points!==null&&(!Number.isFinite(points)||points<0)||score!==null&&(!Number.isFinite(score)||score<0))throw Error('作业分数格式不正确。');
   return {id:aid,name:limited(a.name,300,'作业名称'),description:limited(a.description||'',80000,'题干'),rubric:limited(a.rubric||'',50000,'评分标准'),due_at:limited(a.due_at||'',100,'截止时间'),points_possible:points,assignment_group_id:String(a.assignment_group_id||''),omit_from_final_grade:a.omit_from_final_grade===true,grading_type:a.grading_type==='not_graded'?'not_graded':'points',submission:a.submission?{score,excused:a.submission.excused===true}:null};
  });
  const groups=c.groups.map(g=>{const weight=Number(g.group_weight);if(!Number.isFinite(weight)||weight<0||weight>1000)throw Error('评分组权重不正确。');return {id:limited(String(g.id),80,'评分组ID'),name:limited(g.name||'',200,'评分组名称'),group_weight:weight,rules:{drop_lowest:Number(g.rules?.drop_lowest)||0,drop_highest:Number(g.rules?.drop_highest)||0}};});
  const gaps=Array.isArray(c.gaps)?c.gaps.slice(0,50).map(v=>limited(String(v),500,'缺口说明')):[];
  return {id,name:limited(c.name,200,'课程名称'),term:limited(c.term||'',120,'学期'),syllabusHtml:limited(c.syllabusHtml||'',300000,'大纲页面'),weighted:c.weighted===true,gradingPeriod:c.gradingPeriod===true,assignments,groups,gaps,assignmentsComplete:c.assignmentsComplete===true,groupsComplete:c.groupsComplete===true};
 });
 return {format:'campus-browser-import',version:1,schoolUrl,capturedAt:input.capturedAt,accountLabel:typeof input.accountLabel==='string'?input.accountLabel.slice(0,160):'',courses};
}
export function browserFiles(input,courseId){
 const raw=input.courses?.find(c=>String(c.id)===String(courseId));
 if(!Array.isArray(raw?.files))return [];
 if(raw.files.length>8)throw Error('每门课最多导入8份附件。');
 let total=0;
 return raw.files.map(f=>{
  const name=limited(f.name,240,'附件名');if(!/\.(pdf|docx|txt|md|html?)$/i.test(name)||/[\/\\\x00-\x1f]/.test(name))throw Error('附件名称或格式不支持。');
  const base64=limited(f.base64,12*1024*1024,'附件内容');if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw Error('附件编码不正确。');
  total+=base64.length;if(total>12*1024*1024)throw Error('单门课附件超过导入上限，请拆分。');
  return {name,base64,mimeType:typeof f.mimeType==='string'?f.mimeType.slice(0,100):'application/octet-stream',kind:f.kind==='syllabus'?'syllabus':'lecture'};
 });
}
export function browserSummary(pkg){return pkg.courses.map(c=>({id:c.id,name:c.name,term:c.term,assignments:c.assignments.length,syllabusCharacters:htmlText(c.syllabusHtml).length,gaps:c.gaps,complete:c.assignmentsComplete&&c.groupsComplete}));}
