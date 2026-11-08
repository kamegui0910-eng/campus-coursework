import { publicUrl } from './helpers.mjs';

// Adapter boundary: future providers return the same course/assessment snapshot.
export const LMS_PROVIDERS = [{id:'canvas',label:'Canvas',discovery:true},{id:'blackboard',label:'Blackboard',discovery:false},{id:'moodle',label:'Moodle',discovery:false},{id:'brightspace',label:'Brightspace',discovery:false}];
export function parseCourseLink(value) {
  let url; try { url=new URL(String(value).trim()); } catch { throw new Error('请粘贴完整的学校课程网址。'); }
  if(url.username||url.password)throw new Error('课程网址不能包含账号或密码。');
  const baseUrl=new URL(publicUrl(url.origin,'学校地址')).origin;
  const match=url.pathname.match(/^\/(?:api\/v1\/)?courses\/(\d{1,32})(?:\/|$)/);
  if(!match)throw new Error('请粘贴 Canvas 的课程页面网址，例如 https://学校/courses/123。其他系统目前可以手动建立资料库。');
  return {provider:'canvas',baseUrl,externalId:match[1],sourceUrl:baseUrl+'/courses/'+match[1]};
}
export function termIsCurrent(course,now=Date.now()) {
  if(['completed','deleted','concluded'].includes(course.workflow_state))return false;
  const start=course.start_at||course.term?.start_at,end=course.end_at||course.term?.end_at;
  return (!start||Date.parse(start)<=now)&&(!end||Date.parse(end)>=now);
}
export function classifyAssignment(task,siblings=[]) {
  const title=String(task.name||task.title||'');
  if(/\bfinal\b|期末/i.test(title))return {kind:'final',label:'期末',basis:'名称匹配，待核对'};
  if(/\bmid[ -]?term\b|期中/i.test(title))return {kind:'midterm',label:'期中',basis:'名称匹配，待核对'};
  const stem=value=>String(value).toLowerCase().replace(/\d+(?:\.\d+)*/g,'#').replace(/\s+/g,' ').trim();
  const recurring=/\bweekly\b|每周|周作业/i.test(title)||siblings.filter(other=>stem(other.name||other.title)===stem(title)).length>=3;
  return recurring?{kind:'recurring',label:'重复任务',basis:'名称规律，频率待核对'}:{kind:'assignment',label:'作业',basis:'学校发布任务'};
}
export function assignmentImpact(task,snapshot) {
  if(task.omit_from_final_grade||task.grading_type==='not_graded'||task.submission?.excused)return {percent:0,high:false,basis:'不计入总评'};
  const groups=snapshot?.groups||[],all=snapshot?.assignments||[];
  const group=groups.find(g=>String(g.id)===String(task.assignment_group_id));
  const siblings=all.filter(a=>!a.omit_from_final_grade&&a.grading_type!=='not_graded'&&!a.submission?.excused&&(!snapshot?.weighted||String(a.assignment_group_id)===String(task.assignment_group_id)));
  const points=Number(task.points_possible),total=siblings.reduce((sum,a)=>sum+(Number(a.points_possible)||0),0);
  const rules=group?.rules||{};
  if(snapshot?.gradingIncomplete||siblings.some(a=>a.points_possible==null)||!Number.isFinite(points)||!total||snapshot?.weighted&&(!group||rules.drop_lowest||rules.drop_highest))return {percent:null,high:false,basis:'权重未知或有丢分规则'};
  const percent=(snapshot?.weighted?Number(group.group_weight):100)*points/total;
  return {percent,high:percent>=10,basis:snapshot?.weighted?'评分组权重 × 组内分值比例（估算）':'已发布作业分值比例（估算）',groupWeight:snapshot?.weighted?Number(group.group_weight):null};
}
export function calculateGrades(snapshot,{scores={},ungraded='exclude',target=null}={}) {
  const warnings=[],groups=snapshot?.groups||[],tasks=(snapshot?.assignments||[]).filter(a=>!a.omit_from_final_grade&&a.grading_type!=='not_graded'&&!a.submission?.excused);
  if(!['exclude','zero'].includes(ungraded))throw new Error('请选择未评分作业的处理方式。');
  const missingGroup=Boolean(snapshot?.weighted&&tasks.some(a=>!groups.some(g=>String(g.id)===String(a.assignment_group_id))));
  if(missingGroup)warnings.push('部分作业找不到评分组，计算范围不完整，请重新同步后核对。');
  const unsupported=Boolean(snapshot?.gradingIncomplete)||missingGroup||groups.some(g=>g.rules?.drop_lowest||g.rules?.drop_highest)||tasks.some(a=>Number(a.points_possible)===0)||snapshot?.gradingPeriod;
  if(snapshot?.provenance==='user-browser-export')warnings.push('成绩来自用户浏览器导出快照，非学校实时核验结果；请核对采集日期与学校成绩。');
  if(snapshot?.gradingGap)warnings.push('采集存在资料缺口：'+snapshot.gradingGap);
  if(unsupported)warnings.push('存在丢弃分数、零分额外加分或分期评分规则；当前计算器不支持这些规则，不能替代 Canvas 正式成绩。');
  if(tasks.some(a=>a.submission?.score==null&&!Object.hasOwn(scores,String(a.id))))warnings.push('部分作业尚未评分；未发布作业不在计算范围内。');
  if(snapshot?.weighted&&Math.abs(groups.reduce((s,g)=>s+Number(g.group_weight||0),0)-100)>0.01)warnings.push('评分组权重合计不等于100%，请核对额外加分或学校规则。');
  let knownEarned=0,knownWeight=0,remainingWeight=0,earned=0,weight=0;
  const selectedGroups=snapshot?.weighted?groups:[{id:'all',name:'全部作业',group_weight:100}];
  const breakdown=selectedGroups.map(g=>{
    const list=tasks.filter(a=>!snapshot?.weighted||String(a.assignment_group_id)===String(g.id));
    let numerator=0,denominator=0,total=0,gradedPoints=0,gradedEarned=0;
    for(const a of list){
      const points=Number(a.points_possible);if(!Number.isFinite(points)||points<=0)continue;total+=points;
      const override=Object.hasOwn(scores,String(a.id)),raw=override?scores[String(a.id)]:a.submission?.score;
      if(raw!==null&&raw!==undefined&&raw!==''){
        const score=Number(raw);if(!Number.isFinite(score)||score<0)throw new Error('假设分数需为非负数字。');
        numerator+=score;denominator+=points;gradedPoints+=points;gradedEarned+=score;
      } else if(ungraded==='zero')denominator+=points;
    }
    const w=Number(g.group_weight)||0;
    if(denominator){earned+=numerator/denominator*w;weight+=w;}
    if(total){knownEarned+=gradedEarned/total*w;knownWeight+=gradedPoints/total*w;remainingWeight+=(total-gradedPoints)/total*w;}
    return {id:String(g.id),name:g.name,weight:w,earned:numerator,possible:denominator,percent:denominator?numerator/denominator*100:null};
  });
  const desired=target==null||target===''?null:Number(target);
  if(desired!==null&&(!Number.isFinite(desired)||desired<0||desired>100))throw new Error('目标总评请输入0到100。');
  const required=desired!==null&&remainingWeight>0?(desired-knownEarned)/remainingWeight*100:null;
  return {percent:weight?earned/weight*100:null,breakdown,ungraded,warnings,unsupported,remainingWeight,knownWeight,target:desired,requiredRemainingPercent:required,targetStatus:required===null?'no-remaining':required>100?'above-100':required<=0?'already-covered':'possible',estimate:true};
}
