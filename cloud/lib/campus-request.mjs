// Shared request behavior; every request finishes with a result or a visible timeout.
export async function campusRequest(action,payload={},options={}){
 const fetchImpl=options.fetchImpl||fetch,timeoutMs=options.timeoutMs??(action==='model.discover'?22000:65000);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetchImpl('/api/campus',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal:controller.signal});
  if(!response.headers.get('content-type')?.includes('json'))throw Error('空间连接已失效或服务未返回结果。请刷新页面后重试。');
  const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'这一步没有完成，请稍后再试。');return result.data;
 }catch(error){
  if(controller.signal.aborted)throw Error(action==='model.discover'?'读取模型超时，请检查平台地址与网络后重试。尚未保存密钥，也没有发起付费问答。':'请求超时，请刷新查看最新状态后再试。');
  if(error instanceof TypeError)throw Error('无法连接课程服务，请检查网络后重试。');throw error;
 }finally{clearTimeout(timer);}
}
