export const MAX_FILE = 20 * 1024 * 1024;
export const KINDS = new Set(['syllabus','rubric','assignment','textbook','textbook_notes','lecture','research','attachment']);
export const id = value => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error('请重新选择这条课程或资料记录。');
  return value;
};
export function text(value, label, maximum = 240, required = false) {
  if (value != null && typeof value !== 'string') throw new Error(`${label}格式不正确。`);
  const result = (value || '').trim();
  if ((required && !result) || result.length > maximum || result.includes('\0')) throw new Error(`请检查${label}，内容为空或超过长度限制。`);
  return result;
}
export function publicUrl(value, label = '接口地址') {
  let url;
  try { url = new URL(text(value, label, 1500, true)); } catch { throw new Error(`请填写完整的${label}。`); }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      (url.port && url.port !== '443') || !host.includes('.') || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':') ||
      /(?:^|\.)(?:localhost|local|internal|invalid|test|lan|home|onion)$/.test(host)) {
    throw new Error(`${label}需要使用公网 HTTPS 域名，不能包含账号、密码、查询参数或本机地址。`);
  }
  return url.href.replace(/\/+$/, '');
}
export function modelSettings(value = {}) {
  const apiStyle = value.apiStyle || 'chat-completions';
  if (!['chat-completions','responses','anthropic'].includes(apiStyle)) throw new Error('请选择受支持的模型接口格式。');
  const selectionMode=value.selectionMode||'manual',preference=value.preference||'balanced';
  if(!['manual','recommended'].includes(selectionMode)||!['balanced','economy','quality'].includes(preference))throw new Error('请选择有效的模型选择方式。');
  return { selectionMode,preference,provider:text(value.provider,'供应商',80), apiStyle, model:text(value.model,'模型名称',240,true),
    baseUrl:publicUrl(value.baseUrl).replace(/\/(?:chat\/completions|responses|messages|models)$/, '').replace(/\/+$/, '') };
}
export function secretText(value) {
  if (typeof value !== 'string' || value.length > 16384 || /[\r\n\0]/.test(value.trim())) throw new Error('密钥格式不正确，请重新填写。');
  return value.trim();
}
const bytes = value => typeof value === 'string' ? new TextEncoder().encode(value) : value;
export const sha256 = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(value)))].map(byte => byte.toString(16).padStart(2,'0')).join('');
const base64 = value => btoa(String.fromCharCode(...value));
const unbase64 = value => Uint8Array.from(atob(value), letter => letter.charCodeAt(0));
async function aesKey(secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('云端密钥保护尚未配置，请先联系站点所有者；本次没有保存密钥。');
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', bytes(secret)), 'AES-GCM', false, ['encrypt','decrypt']);
}
export async function encryptSecret(value, secret, owner, purpose) {
  if (!value) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes(owner+':'+purpose)}, await aesKey(secret), bytes(value));
  return JSON.stringify({v:1,iv:base64(iv),cipher:base64(new Uint8Array(cipher))});
}
export async function decryptSecret(value, secret, owner, purpose) {
  if (!value) return '';
  try {
    const saved=JSON.parse(value);
    if(saved.v!==1) throw new Error('version');
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(saved.iv),additionalData:bytes(owner+':'+purpose)},await aesKey(secret),unbase64(saved.cipher));
    return new TextDecoder().decode(plain);
  } catch { throw new Error('这份已保存密钥暂时无法读取，请在设置中重新输入。'); }
}
export async function boundedText(response, maximum = 1024 * 1024, label = '服务返回内容') {
  if (Number(response.headers.get('content-length')) > maximum) throw new Error(`${label}过大，已停止读取。`);
  if (!response.body) return '';
  const reader=response.body.getReader(), chunks=[]; let length=0;
  try { for (;;) { const next=await reader.read(); if(next.done)break; length+=next.value.byteLength;
    if(length>maximum){await reader.cancel();throw new Error(`${label}过大，已停止读取。`);} chunks.push(next.value); }
  } finally { reader.releaseLock(); }
  const all=new Uint8Array(length);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(all);
}
export function htmlText(value='') {
  return String(value).replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,' ')
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
}
export function ownedMaterials(rows, requested, owner, course) {
  if (!Array.isArray(requested) || requested.length > 12) throw new Error('一次最多选择12份相关资料。');
  const ids=[...new Set(requested.map(id))];
  const selected=ids.map(key=>rows.find(row=>row.id===key&&row.owner_id===owner&&row.course_id===course));
  if(selected.some(row=>!row))throw new Error('所选资料已不存在，或不属于这个账号和课程，请重新选择。');
  return selected;
}
export function excerpt(value, locator = '', maximum = 18000) {
  if (!locator) return {text:value.slice(0,maximum),gap:value.length>maximum?'这份资料只加载了前'+maximum+'字符。':null};
  const normalize=line=>line.replace(/^#+\s*/,'').trim().toLowerCase().replace(/\b(?:chapter|ch\.?)\s*(\d+)\b/g,'chapter $1').replace(/\s+/g,' ');
  const lines=value.split(/\r?\n/), needle=normalize(locator),structured=lines.some(line=>/^\s*#{1,6}\s/.test(line));
  const metadata=heading=>/^(?:coverage(?:\s+(?:index|summary|chapter\b)|\s*[:：]|$)|(?:reading\s+)?index(?:\s|[:：]|$)|manifest(?:\s|[:：]|$)|(?:table of )?contents(?:\s|[:：]|$)|目录|覆盖范围|阅读覆盖|覆盖索引)/i.test(normalize(heading));
  const candidates=[],stack=[];
  for(let index=0;index<lines.length;index++){
    const line=lines[index],heading=line.match(/^\s*(#{1,6})\s+(.+)$/);
    if(structured&&!heading)continue;
    if(!structured&&!/^\s*(?:chapter\s*\d|ch\.?\s*\d|第.{1,8}章)/i.test(line))continue;
    const level=heading?heading[1].length:1;
    while(stack.length&&stack.at(-1).level>=level)stack.pop();
    const blocked=metadata(line)||stack.some(parent=>parent.blocked),ancestorMatch=stack.some(parent=>parent.matched);
    const current=normalize(line),matches=current===needle||current.startsWith(needle+' ')||current.startsWith(needle+':')||current.startsWith(needle+'：');
    if(!blocked&&matches&&!ancestorMatch)candidates.push({line,index});
    if(heading)stack.push({level,blocked,matched:!blocked&&matches});
  }
  if(candidates.length>1)return {text:'',gap:'找到多个相同章节标记，无法确认对应正文，请上传该章节的单独文件或结构化笔记。'};
  const start=candidates[0]?.index ?? -1;
  if(start<0)return {text:'',gap:'没有找到指定章节“'+locator+'”，请补入对应章节文件或调整资料范围。'};
  const level=(lines[start].match(/^\s*(#+)/)||[])[1]?.length || 1;
  let end=lines.length;
  for(let i=start+1;i<lines.length;i++){const heading=lines[i].match(/^\s*(#+)\s/);if(heading&&heading[1].length<=level||!heading&&/^\s*(?:chapter\s+\d|第.{1,8}章)/i.test(lines[i])){end=i;break;}}
  const found=lines.slice(start,end).join('\n');
  return {text:found.slice(0,maximum),gap:found.length>maximum?'指定章节超过本次读取上限，尚未完整加载。':null};
}
