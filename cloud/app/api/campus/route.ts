import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { createCourseworkService } from '@/lib/coursework/service';
import { MAX_FILE, boundedText } from '@/lib/coursework/helpers.mjs';

export const dynamic = 'force-dynamic';
const json = (data:unknown,status=200) => Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});

async function service(){
  const user=await getChatGPTUser();
  if(!user)return {error:json({ok:false,error:'请先登录，再打开自己的课程空间。'},401)};
  if(!env.DB||!env.BUCKET)return {error:json({ok:false,error:'云端资料库尚未连接完成，请联系站点所有者。'},503)};
  return {app:createCourseworkService({db:env.DB,bucket:env.BUCKET,encryptionKey:env.CAMPUS_ENCRYPTION_KEY,user})};
}
function failure(error:unknown){
  const message=error instanceof Error?error.message:'这一步尚未完成，请稍后重试。';
  const safe=/D1_|SQLITE|R2|database|binding|Internal Server/i.test(message)?'云端存储暂时没有完成操作，请稍后重试；没有据此标记成功。':message.slice(0,500);
  return json({ok:false,error:safe},400);
}
async function boundedBody(request:Request,maximum:number){
  if(Number(request.headers.get('content-length'))>maximum)throw new Error('上传内容过大，请按章节拆分后再上传。');
  if(!request.body)return new Uint8Array();
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>maximum){await reader.cancel();throw new Error('上传内容过大，请按章节拆分后再上传。');}chunks.push(next.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
export async function GET(request:Request){
  try{
    if(new URL(request.url).searchParams.get('health')==='1'){
      const tables=env.DB?await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('campus_courses','campus_materials','campus_assignments','campus_outputs','campus_settings','campus_jobs')").all():null;
      const ready=Boolean(env.DB&&env.BUCKET&&env.CAMPUS_ENCRYPTION_KEY&&tables?.results.length===6);
      return json({ok:ready,data:{ready,database:Boolean(env.DB),files:Boolean(env.BUCKET),encryption:Boolean(env.CAMPUS_ENCRYPTION_KEY),schemaTables:tables?.results.length||0}},ready?200:503);
    }
    const current=await service();if(current.error)return current.error;
    const materialId=new URL(request.url).searchParams.get('download');
    if(materialId)return await current.app!.download(materialId);
    return json({ok:true,data:await current.app!.handle('state.get')});
  }catch(error){return failure(error);}
}
export async function POST(request:Request){
  try{
    const origin=request.headers.get('origin');
    if(!origin||origin!==new URL(request.url).origin)return json({ok:false,error:'这个请求不是从当前课程网页发出的，请重新打开页面。'},403);
    const current=await service();if(current.error)return current.error;
    const contentType=request.headers.get('content-type')||'';
    if(contentType.startsWith('multipart/form-data')){
      const body=await boundedBody(request,MAX_FILE+2*1024*1024);
      const form=await new Request(request.url,{method:'POST',headers:{'Content-Type':contentType},body:body.buffer}).formData();
      return json({ok:true,data:await current.app!.upload(form)});
    }
    if(!contentType.startsWith('application/json'))return json({ok:false,error:'请求格式不正确，请重新打开课程网页。'},415);
    const raw=await boundedText(request,1024*1024,'请求内容');
    let input:any;try{input=JSON.parse(raw);}catch{return json({ok:false,error:'请求内容不是有效的 JSON。'},400);}
    if(!input||typeof input.action!=='string'||input.payload!=null&&(typeof input.payload!=='object'||Array.isArray(input.payload)))throw new Error('请求内容格式不正确。');
    return json({ok:true,data:await current.app!.handle(input.action,input.payload||{})});
  }catch(error){return failure(error);}
}
