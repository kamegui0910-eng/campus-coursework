import {sha256,encryptSecret,decryptSecret,boundedText,secretText} from './helpers.mjs';
import {createModelClient} from './models.mjs';
export const OPENROUTER_BASE='https://openrouter.ai/api/v1';
import {preferredModel} from './model-choice.mjs';
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export function createOpenRouterConnect({db,encryptionKey,owner,fetchImpl=fetch,saveModel}){
 return {
  async start(origin){
   const state=random(),verifier=random(),expires=Date.now()+10*60*1000;
   const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
   const challenge=btoa(String.fromCharCode(...digest)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
   const secret=await encryptSecret(verifier,encryptionKey,owner,'openrouter-pkce');
   await db.prepare('INSERT INTO campus_model_connections (owner_id,state_hash,verifier_secret,expires_at) VALUES (?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET state_hash=excluded.state_hash,verifier_secret=excluded.verifier_secret,expires_at=excluded.expires_at').bind(owner,await sha256(state),secret,expires).run();
   const url=new URL('https://openrouter.ai/auth');url.searchParams.set('callback_url',new URL('/api/connect/openrouter',origin).href);url.searchParams.set('state',state);url.searchParams.set('code_challenge',challenge);url.searchParams.set('code_challenge_method','S256');url.searchParams.set('key_label','Campus Coursework');
   return {state,url:url.href};
  },
  async finish(state,code){
   if(!/^[a-f0-9]{64}$/.test(state)||typeof code!=='string'||!code||code.length>2048)throw Error('授权回调无效，请重新连接。');
   // Consume once, atomically, scoped to the same owner and unexpired browser flow.
   const row=await db.prepare('DELETE FROM campus_model_connections WHERE owner_id=? AND state_hash=? AND expires_at>? RETURNING verifier_secret').bind(owner,await sha256(state),Date.now()).first();
   if(!row)throw Error('授权已过期或已使用，请重新连接。');
   const verifier=await decryptSecret(row.verifier_secret,encryptionKey,owner,'openrouter-pkce');
   let apiKey;
   try{
    const response=await fetchImpl(OPENROUTER_BASE+'/auth/keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,code_verifier:verifier,code_challenge_method:'S256'}),redirect:'manual',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('exchange');
    const result=JSON.parse(await boundedText(response,32000,'授权返回'));apiKey=secretText(result.key);
    if(!apiKey)throw Error('missing key');
   }catch{throw Error('OpenRouter 授权未完成，请重新连接；没有保存凭证。');}
   const settings={provider:'openrouter',apiStyle:'chat-completions',baseUrl:OPENROUTER_BASE,model:'openrouter/auto'};
   // List-only request; never generate or spend credits during connection.
   try{const result=await createModelClient({settings,apiKey,fetchImpl}).test();settings.model=preferredModel(result.models)||settings.model;}catch{}
   await saveModel({...settings,apiKey});return {connected:true};
  }
 };
}
