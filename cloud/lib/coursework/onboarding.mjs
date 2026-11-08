export function setupStatus(row,{modelReady=false,courseCount=0,outputCount=0}={}){
 // Preserve existing workspaces; new, empty visitors always begin at welcome.
 const legacy=!row&&(courseCount>0||outputCount>0);
 return {mode:row?.mode||(legacy&&!modelReady?'library':'ai'),step:row?Number(row.step):0,courseDeferred:Boolean(row?.course_deferred),completed:row?Boolean(row.completed_at):legacy,modelReady:Boolean(modelReady),courseCount};
}
export function setupChange(payload,current){
 const mode=payload.mode??current.mode,step=payload.step??current.step;
 if(!['ai','library'].includes(mode)||!Number.isInteger(step)||step<0||step>3)throw Error('请按向导选择使用方式和当前步骤。');
 const deferred=payload.courseDeferred??current.courseDeferred;
 if(typeof deferred!=='boolean')throw Error('请确认是否稍后添加课程。');
 if(payload.complete===true){
  if(mode==='ai'&&!current.modelReady)throw Error('请先保存 AI 平台、模型名称和密钥，或选择先整理课程资料。');
  if(!current.courseCount&&!deferred)throw Error('请添加第一门课程，或明确选择稍后添加。');
 }
 return {mode,step,courseDeferred:deferred,completed:payload.complete===true};
}
