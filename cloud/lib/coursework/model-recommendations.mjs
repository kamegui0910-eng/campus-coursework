// Conservative model-family rules, not benchmark scores or live pricing.
// Never invent a model ID; recommendations are a subset of the account's returned list.
export const MODEL_PREFERENCES=[
 {id:'balanced',title:'帮我选',tag:'推荐',description:'课程大纲、资料问答、提纲和日常写作。',reason:'优先选择已知的日常文本模型，兼顾能力与使用成本。'},
 {id:'economy',title:'节省开销',tag:'轻量任务',description:'整理笔记、摘要、简单问答。',reason:'优先轻量系列；不是按实时价格排序。'},
 {id:'quality',title:'复杂作业',tag:'可能更贵',description:'多份资料对照、复杂分析、细致审阅。',reason:'优先能力较强的已知文本系列，可能更慢、费用更高。'},
];
const blocked=/(?:embedding|moderation|whisper|tts|audio|realtime|image|dall-e|sora|transcrib|diariz|computer|search|codex|instruct|preview|experimental|\bpro-max\b)/i;
export function modelCategory(value){
 if(typeof value!=='string'||blocked.test(value)||value.startsWith('ft:'))return null;
 const id=value.toLowerCase().split('/').at(-1);
 if(value==='openrouter/free')return {tier:'economy',family:'free-router',version:0};
 const version=(id.replace(/-\d{4}-\d{2}-\d{2}$/,'').match(/\d+(?:\.\d+)?/g)||[]).filter(n=>Number(n)<100).map(Number).slice(0,2).reduce((sum,n,i)=>sum+n/(i?100:1),0);
 if(/^gpt-\d/.test(id)){
  if(/-nano(?:-|$)/.test(id))return {tier:'economy',family:'gpt-nano',version};
  if(/-mini(?:-|$)/.test(id))return {tier:'balanced',family:'gpt-mini',version};
  if(/^gpt-\d+(?:\.\d+)?(?:o)?(?:-(?:sol|terra))?(?:-\d{4}-\d{2}-\d{2})?$/.test(id))return {tier:'quality',family:'gpt',version};
 }
 if(/^o[134](?:-mini)?(?:-\d{4}-\d{2}-\d{2})?$/.test(id))return {tier: /mini/.test(id)?'balanced':'quality',family:'reasoning',version};
 if(id.startsWith('claude-')){
  if(id.includes('haiku'))return {tier:'economy',family:'haiku',version};
  if(id.includes('sonnet'))return {tier:'balanced',family:'sonnet',version};
  if(id.includes('opus'))return {tier:'quality',family:'opus',version};
 }
 if(id.startsWith('gemini-')){
  if(id.includes('flash-lite'))return {tier:'economy',family:'flash-lite',version};
  if(id.includes('flash'))return {tier:'balanced',family:'flash',version};
  if(/-pro(?:-|$)/.test(id))return {tier:'quality',family:'gemini-pro',version};
 }
 if(/^deepseek-(?:flash|v\d+-flash|chat)$/.test(id))return {tier:'balanced',family:'deepseek-flash',version: id==='deepseek-chat'?0:version+1};
 if(/^deepseek-(?:v\d+-pro|reasoner)$/.test(id))return {tier:'quality',family:'deepseek-pro',version};
 return null;
}
export function modelOptions(models){return [...new Set(models.filter(x=>typeof x==='string'&&x.length<=240))].filter(x=>!blocked.test(x)&&!x.startsWith('ft:')).sort();}
export function recommendModels(models){
 const unique=[...new Set(models)].map(id=>({id,...modelCategory(id)})).filter(row=>row.tier);
 const families={economy:['free-router','gpt-nano','haiku','flash-lite'],balanced:['gpt-mini','sonnet','flash','reasoning','deepseek-flash'],quality:['gpt','opus','gemini-pro','deepseek-pro','reasoning']};
 const pick=tiers=>{
  for(const tier of tiers){const found=unique.filter(x=>x.tier===tier).sort((a,b)=>families[tier].indexOf(a.family)-families[tier].indexOf(b.family)||b.version-a.version||Number(/\d{4}-\d{2}-\d{2}$/.test(a.id))-Number(/\d{4}-\d{2}-\d{2}$/.test(b.id))||a.id.localeCompare(b.id));if(found.length)return found[0].id;}
  return '';
 };
 return {balanced:pick(['balanced','economy']),economy:pick(['economy']),quality:pick(['quality'])};
}
export function recommendation(models,preference='balanced'){
 const choice=MODEL_PREFERENCES.find(p=>p.id===preference);if(!choice)throw Error('请选择受支持的模型使用偏好。');
 const model=recommendModels(models)[preference];
 return {model,preference,title:choice.title,reason:model?choice.reason:'暂时无法可靠判断这些模型的用途，请手动选择文本模型。'};
}
