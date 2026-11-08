function initialReview(artifactSha) {
  if(!/^[a-f0-9]{64}$/.test(artifactSha||''))throw Error('成果校验值无效。');
  return {version:1,artifactSha,content:{status:'pending'},format:{status:'pending'},student:{status:'pending'},external:{status:'not_connected'},release:'final_audit_pending'};
}
function recordReview(current,request,{actor='user',at=new Date().toISOString()}={}) {
  if(!current||request.artifactSha!==current.artifactSha)throw Error('成果版本已变化，请重新打开并核对。');
  if(!['content','format','student'].includes(request.stage))throw Error('这里只能记录本人内容、排版和阅读核对，不能标记外部检测或正式放行。');
  const note=typeof request.note==='string'?request.note.trim():'';
  if(note.length<4||note.length>2000)throw Error('请填写4至2000字的实际核对记录。');
  return {...current,[request.stage]:{status:'recorded',note,actor,at,method:'manual_record'},release:'final_audit_pending'};
}

export {initialReview,recordReview};
