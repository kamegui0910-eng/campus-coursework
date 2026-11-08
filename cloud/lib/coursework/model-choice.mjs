export function preferredModel(models,current=''){
 if(current&&models.includes(current))return current;
 return models.find(x=>x==='openrouter/free')||models.find(x=>x.endsWith(':free'))||models.find(x=>/deepseek-chat|gpt.*mini|claude.*haiku/.test(x))||models[0]||'';
}
