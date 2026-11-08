import { boundedText, modelSettings, secretText } from './helpers.mjs';

const redact = (value,key) => String(value||'').split(key||'\0').join('[密钥已隐藏]').replace(/Bearer\s+[^\s"'<>]+/gi,'Bearer [已隐藏]');
const messageText = value => typeof value==='string'?value:Array.isArray(value)?value.filter(part=>['text','output_text'].includes(part?.type)).map(part=>part.text||'').join('\n'):'';
export function extractOutput(data, style) {
  if(style==='chat-completions'){
    const choice=data.choices?.[0];
    return {text:messageText(choice?.message?.content)||choice?.message?.refusal||'',complete:!['length','content_filter','tool_calls','function_call'].includes(choice?.finish_reason)};
  }
  if(style==='anthropic')return {text:messageText(data.content),complete:!['max_tokens','tool_use','pause_turn'].includes(data.stop_reason)};
  return {text:typeof data.output_text==='string'?data.output_text:(data.output||[]).filter(item=>item.type==='message').map(item=>messageText(item.content)).join('\n'),
    complete:(!data.status||data.status==='completed')&&!(data.output||[]).some(item=>['function_call','custom_tool_call'].includes(item.type))};
}
export function createModelClient({settings,apiKey='',fetchImpl=fetch,timeoutMs=50000}) {
  const config=modelSettings(settings), key=secretText(apiKey);
  async function request(endpoint,body){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    const headers={Accept:'application/json'};
    if(config.apiStyle==='anthropic'){
      if(key)headers['x-api-key']=key;
      headers['anthropic-version']='2026-10-21';
    }else if(key)headers.Authorization='Bearer '+key;
    if(body)headers['Content-Type']='application/json';
    try{
      const response=await fetchImpl(config.baseUrl+'/'+endpoint,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,redirect:'manual',signal:controller.signal});
      if(response.status>=300&&response.status<400)throw new Error('接口发生跳转，请填写最终接口地址；密钥没有转发到新网站。');
      if(!body&&[404,405,501].includes(response.status))return {unsupported:true};
      const raw=await boundedText(response,2*1024*1024,'模型返回内容');
      let data;try{data=JSON.parse(raw);}catch{throw new Error('模型接口没有返回可识别的 JSON，请检查接口地址和格式。');}
      if(!response.ok){
        const reasons={400:'请求被拒绝，请检查模型名称和接口格式。',401:'密钥未被接受，请检查是否有效。',403:'这个账号没有接口或模型的使用权限。',404:'没有找到接口或模型。',429:'模型限流或额度不足，请检查账号后再试。'};
        throw new Error((reasons[response.status]||'模型服务没有完成请求。')+'（HTTP '+response.status+'）');
      }
      if(!data||typeof data!=='object'||Array.isArray(data)||data.error||['failed','cancelled'].includes(data.status))throw new Error('模型服务返回了未完成或错误结果。');
      return {data};
    }catch(error){
      if(controller.signal.aborted)throw new Error('模型请求超时，尚未确认完成。请先检查供应商记录再决定是否重试。');
      if(error instanceof TypeError)throw new Error('暂时无法连接模型接口，请检查网络、证书和地址。');
      throw new Error(redact(error.message,key));
    }finally{clearTimeout(timer);}
  }
  return {
    async test(){
      const result=await request('models');
      if(result.unsupported)return {verified:false,generationVerified:false,models:[],message:'此接口没有模型列表，请填写模型名称后运行一次任务；尚未验证生成能力。'};
      const list=result.data.data||result.data.models;
      if(Array.isArray(list)&&!list.length)return {verified:false,generationVerified:false,models:[],message:'账号返回的模型列表为空。请核对 API key 的模型读取权限，或在高级设置填写平台提供的模型名称。'};
      if(!Array.isArray(list))return {verified:false,generationVerified:false,models:[],message:'接口已响应，但未返回模型列表；请检查接口格式。'};
      return {verified:true,generationVerified:false,models:list.slice(0,1000).map(item=>typeof item==='string'?item:item.id||item.name).filter(value=>typeof value==='string').map(value=>redact(value,key).slice(0,240)),message:'模型列表已核验，生成能力需运行一次任务确认。'};
    },
    async generate({system,user}){
      if(typeof user!=='string'||!user.trim()||new TextEncoder().encode(system+user).length>1024*1024)throw new Error('本次输入为空或过大，请缩小资料范围。');
      let endpoint,body;
      if(config.apiStyle==='responses'){endpoint='responses';body={model:config.model,instructions:system,input:user,max_output_tokens:8192,store:false};}
      else if(config.apiStyle==='anthropic'){endpoint='messages';body={model:config.model,system,messages:[{role:'user',content:user}],max_tokens:8192,stream:false};}
      else{endpoint='chat/completions';body={model:config.model,messages:[{role:'system',content:system},{role:'user',content:user}],stream:false};}
      const {data}=await request(endpoint,body),result=extractOutput(data,config.apiStyle);
      if(!result.text.trim())throw new Error('模型没有返回可用正文；工具调用或空结果尚未视为生成成功。');
      const overLimit=result.text.length>100000;
      return {text:redact(result.text.slice(0,100000),key),model:redact(data.model||config.model,key).slice(0,240),complete:result.complete&&!overLimit,
        warning:overLimit?'模型返回超过10万字符，只保存了读取上限内的部分，请缩小任务后补齐。':result.complete?null:'模型输出尚未完整结束，请先补齐再使用。'};
    }
  };
}
