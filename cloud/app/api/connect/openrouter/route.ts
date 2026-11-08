import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {getCourseworkUser} from '@/app/guest-auth';
import {createCourseworkService} from '@/lib/coursework/service';
import {createOpenRouterConnect} from '@/lib/coursework/openrouter.mjs';
export const dynamic='force-dynamic';
const COOKIE='__Host-campus-model-connect';
function result(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
async function context(){
 const user=await getCourseworkUser();if(!user||!env.DB||!env.BUCKET)throw Error('空间连接已失效，请回到配置页刷新。');
 const service=createCourseworkService({db:env.DB,bucket:env.BUCKET,encryptionKey:env.CAMPUS_ENCRYPTION_KEY,user});
 return createOpenRouterConnect({db:env.DB,encryptionKey:env.CAMPUS_ENCRYPTION_KEY,owner:user.userId,saveModel:(p:Record<string,unknown>)=>service.handle('model.save',p)});
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return result({ok:false,error:'请从本站发起授权。'},403);
 try{const flow=await (await context()).start(new URL(request.url).origin);
 (await cookies()).set(COOKIE,flow.state,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:600});
 if(request.headers.get('accept')?.includes('text/html'))return new Response(null,{status:303,headers:{Location:flow.url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 return result({ok:true,data:{url:flow.url}});
 }catch{return result({ok:false,error:'暂时无法开始授权，请刷新重试或使用已有密钥。'},400);}
}
export async function GET(request:Request){
 const url=new URL(request.url),jar=await cookies();let status='failed';
 try{
  const state=url.searchParams.get('state'),expected=jar.get(COOKIE)?.value;
  if(!state||!expected||state!==expected||url.searchParams.has('error'))throw Error('invalid callback');
  await (await context()).finish(state,url.searchParams.get('code'));status='connected';
 }catch{}finally{jar.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});}
 // Strip authorization code from navigation and never echo provider errors or credentials.
 return new Response(null,{status:303,headers:{Location:new URL('/?connection='+status,url.origin).href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
