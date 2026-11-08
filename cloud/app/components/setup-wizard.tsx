"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowRight,ArrowLeft,Check,BookOpen,Sparkles,Upload,Link2,ShieldCheck,LoaderCircle,ChevronDown,ExternalLink} from 'lucide-react';
import {campusApi as api} from '@/lib/campus-api';
import {readFile} from '@/lib/client-files';
import BrowserImport from './browser-import';
import ProviderHelp from './provider-help';
import {preferredModel} from '@/lib/coursework/model-choice.mjs';

const providers=[
 {id:'openrouter',name:'OpenRouter',letter:'↗',style:'chat-completions',url:'https://openrouter.ai/api/v1',keys:'https://openrouter.ai/settings/keys',models:'https://openrouter.ai/models'},
 {id:'openai',name:'OpenAI',letter:'O',style:'responses',url:'https://api.openai.com/v1',keys:'https://platform.openai.com/api-keys',models:'https://developers.openai.com/api/docs/models'},
 {id:'deepseek',name:'DeepSeek',letter:'D',style:'chat-completions',url:'https://api.deepseek.com',keys:'https://platform.deepseek.com',models:'https://api-docs.deepseek.com/api/list-models'},
 {id:'claude',name:'Claude',letter:'C',style:'anthropic',url:'https://api.anthropic.com/v1',keys:'https://platform.claude.com/settings/keys',models:'https://platform.claude.com/docs/en/about-claude/models/overview'},
 {id:'custom',name:'其他兼容平台',letter:'＋',style:'chat-completions',url:'',keys:'',models:''},
];
const steps=['选择方式','连接 AI','添加课程','准备就绪'];
type Workspace={onboarding:{mode:string;step:number;completed:boolean;modelReady:boolean;courseCount:number;courseDeferred:boolean};courses:Array<{id:string;name:string}>;materials:Array<{id:string;courseId:string;kind:string;title:string}>;settings:{apiStyle?:string;baseUrl?:string;model?:string;hasKey?:boolean}};
function Logo(){return <a href="/" className="setup-logo"><span aria-hidden="true">C<span>✦</span></span><b>CAMPUS<small>COURSEWORK</small></b></a>;}
export function SetupLoading(){return <main className="setup-shell"><header className="setup-top"><Logo/><span className="setup-private"><ShieldCheck size={15}/>无需邮箱 · 独立空间</span></header><section className="setup-loading"><LoaderCircle className="spin" size={28}/><h1>准备你的学习空间</h1><p>正在读取已保存的配置与进度…</p></section></main>;}

export default function SetupWizard({state,restart=false,loadError='',onRefresh,onComplete,onExit}:{state:Workspace;restart?:boolean;loadError?:string;onRefresh:()=>Promise<any>;onComplete:()=>Promise<void>;onExit?:()=>void}){
 const [step,setStep]=useState(restart?0:state.onboarding.step),[mode,setMode]=useState(state.onboarding.mode),[busy,setBusy]=useState(''),[error,setError]=useState(loadError),[note,setNote]=useState('');
 const firstProvider=providers.find(p=>p.url&&p.url===state.settings.baseUrl)?.id||(state.settings.baseUrl?'custom':'openai');
 const [provider,setProvider]=useState(firstProvider),[config,setConfig]=useState({apiStyle:state.settings.apiStyle||'responses',baseUrl:state.settings.baseUrl||providers.find(p=>p.id==='openai')!.url,model:state.settings.model||'',apiKey:''});
 const [connectionPath,setConnectionPath]=useState<'quick'|'manual'>(state.settings.baseUrl?'manual':'quick');
 const [models,setModels]=useState<string[]>([]),[courseMethod,setCourseMethod]=useState<'file'|'browser'>('file'),[name,setName]=useState(''),[school,setSchool]=useState(''),[chosen,setChosen]=useState(state.courses[0]?.id||''),[file,setFile]=useState<File|undefined>(),[deferred,setDeferred]=useState(state.onboarding.courseDeferred);
 const heading=useRef<HTMLHeadingElement>(null);const selected=providers.find(p=>p.id===provider)!;
 useEffect(()=>{heading.current?.focus();},[step]);
 useEffect(()=>{const status=new URLSearchParams(window.location.search).get('connection');if(status==='connected'){setConnectionPath('manual');setNote('OpenRouter 已授权。可直接沿用当前模型，也可以读取列表后更换。');}if(status==='failed')setError('授权没有完成或已过期，请重新连接。原设置没有被删除。');if(status)window.history.replaceState(null,'',window.location.pathname);},[]);
 const act=async(label:string,work:()=>Promise<void>)=>{if(busy)return;setBusy(label);setError('');setNote('');try{await work();}catch(e){setError(e instanceof Error?e.message:'这一步还没完成，请重试。');}finally{setBusy('');}};
 async function go(next:number,extra:Record<string,unknown>={}){await api('onboarding.save',{mode,step:next,courseDeferred:deferred,...extra});await onRefresh();setStep(next);setNote('');}
 function pickProvider(id:string){const p=providers.find(p=>p.id===id)!;setProvider(id);setConfig({apiStyle:p.style,baseUrl:p.url,model:'',apiKey:''});setModels([]);setNote('');setError('');}
 const sameSaved=Boolean(state.settings.hasKey&&state.settings.baseUrl===config.baseUrl);
 async function discover(){await act('正在读取可用模型…',async()=>{
  if(!config.apiKey&&!sameSaved)throw Error('请先粘贴当前平台的密钥。');
  const checked=await api<{verified:boolean;models:string[];message:string}>('model.discover',config);
  setModels(checked.models||[]);setConfig(c=>({...c,model:preferredModel(checked.models||[],c.model)}));
  setNote(checked.verified?'模型列表已读取。选好模型后保存即可。':checked.message);
 });}
 async function connect(event:FormEvent){event.preventDefault();await act('正在保存连接…',async()=>{
  if(!config.apiKey&&!sameSaved)throw Error('请填入当前平台的 API 密钥，或使用快捷授权。');
  if(!config.model)throw Error('请先读取模型列表并选择模型。');
  const payload:Record<string,unknown>={...config};if(!config.apiKey)delete payload.apiKey;
  await api('model.save',payload);setConfig(c=>({...c,apiKey:''}));delete payload.apiKey;await onRefresh();
  await go(2);
 });}
 async function addCourse(event:FormEvent){event.preventDefault();await act('正在建立第一门课程…',async()=>{
  let id=chosen;if(!id){const c=await api<{id:string}>('course.create',{name,schoolUrl:school,lmsType:'other'});id=c.id;setChosen(id);await onRefresh();}
  if(file){const extracted=await readFile(file,setBusy),form=new FormData();form.set('courseId',id);form.set('kind','syllabus');form.set('file',file);form.set('text',extracted.text);form.set('extractionStatus',extracted.extractionStatus);const response=await fetch('/api/campus',{method:'POST',credentials:'same-origin',body:form});if(!response.headers.get('content-type')?.includes('json'))throw Error('空间连接中断，请刷新后继续。');const saved:any=await response.json();if(!response.ok||!saved.ok)throw Error(saved.error||'大纲没有上传成功，课程已保留，可换文件再试。');setFile(undefined);}
  setDeferred(false);await go(3,{courseDeferred:false});
 });}
 async function finish(){await act('正在保存配置…',async()=>{await api('onboarding.save',{mode,step:3,courseDeferred:deferred,complete:true});await onComplete();});}
 const title=['先告诉我们，你想怎么开始？',mode==='ai'?'选一种连接方式。':'先整理资料，不用连接 AI。','放进第一门课，从这里开始。','你的学习空间，准备好了。'][step];
 const tip=[['从一门课开始','不用写代码，也不需要学校 API 账号。配置过程中，每一步都会告诉你要填什么。'],['少一点配置，多一点进展','快捷授权无需复制密钥；已有平台，也能读取模型列表后直接选择。'],['资料先到位，回答才有依据','Syllabus 就是课程大纲。先放入它，再逐步补充作业要求和课堂材料。'],['接下来，按自己的节奏走','配置已保存。总控台会把课程、资料、作业和学习成果放在一起。']][step];
 return <main className="setup-shell"><header className="setup-top"><Logo/><div className="setup-top-right"><span className="setup-private"><ShieldCheck size={15}/>无需邮箱 · 独立空间</span>{onExit&&<button type="button" onClick={onExit} disabled={Boolean(busy)}>返回已有工作台</button>}</div></header>
 <div className="setup-layout"><aside className="setup-story"><span className="setup-tag">CAMPUS / FIELD NOTES</span><h2>把这学期，<br/>安排明白。</h2><p>课程、资料、待办。<br/>留出时间，做真正重要的事。</p><div className="setup-art" aria-hidden="true"><span className="setup-poster-number">01—04</span><div className="setup-poster-title">LESS SETUP.<br/>MORE<br/><em>HEADSPACE.</em></div><div className="setup-poster-strip"><span>COURSES</span><span>NOTES</span><span>WHAT’S NEXT ↗</span></div></div><div className="setup-story-note"><Sparkles size={18}/><div><b>{tip[0]}</b><p>{tip[1]}</p></div></div><p className="setup-retention">访客空间记在当前浏览器。清理 Cookie 或换设备前，先下载重要资料。</p></aside>
 <section className="setup-panel"><nav className="setup-progress" aria-label="配置进度">{steps.map((label,index)=><div key={label} className={index===step?'current':index<step?'done':''} aria-current={index===step?'step':undefined}><span>{index<step?<Check size={15}/>:index+1}</span><small>{label}</small></div>)}</nav><div className="setup-content"><span className="setup-step-label">STEP {String(step+1).padStart(2,'0')} / 04</span><h1 ref={heading} tabIndex={-1}>{title}</h1>{error&&<div className="setup-error" role="alert">{error}{loadError&&<button type="button" onClick={()=>window.location.reload()}>重新连接空间</button>}</div>}
 {step===0&&<><p className="setup-lead">选一种适合你现在的方式。以后随时可以更改。</p><div className="setup-mode-grid" role="group" aria-label="选择使用方式"><button className={mode==='ai'?'selected':''} aria-pressed={mode==='ai'} disabled={Boolean(busy)} onClick={()=>setMode('ai')}><span className="setup-choice-icon"><Sparkles size={24}/></span><b>让 AI 帮我学习</b><p>整理大纲、解释资料、准备提纲。下一步连接自己的 AI 平台。</p><small>使用自己的 API 额度</small>{mode==='ai'&&<Check size={17}/>}</button><button className={mode==='library'?'selected':''} aria-pressed={mode==='library'} disabled={Boolean(busy)} onClick={()=>setMode('library')}><span className="setup-choice-icon aqua"><BookOpen size={24}/></span><b>先整理课程资料</b><p>先建课程、上传文件。现在不需要密钥，也不会调用模型。</p><small>以后可在设置中连接 AI</small>{mode==='library'&&<Check size={17}/>}</button></div><div className="setup-inline-tip"><ShieldCheck size={17}/><span>不用在这里填写学校密码。学校登录只在学校官方页面完成。</span></div><button className="setup-primary" disabled={Boolean(busy)||Boolean(loadError)} onClick={()=>act('正在保存选择…',()=>go(1))}>开始配置 <ArrowRight size={18}/></button><a className="setup-optional-login" href="/signin-with-chatgpt?return_to=/?setup=1" target="_top">已有账号？可选登录自己的空间</a></>}
 {step===1&&mode==='library'&&<><div className="setup-skip-card"><BookOpen size={36}/><h3>不用先弄懂 API。</h3><p>你选择了先整理课程。下一步添加课程和大纲就能开始，AI 可以以后再接。</p></div><button className="setup-primary" disabled={Boolean(busy)} onClick={()=>act('正在保存进度…',()=>go(2))}>继续添加课程 <ArrowRight size={18}/></button></>}
 {step===1&&mode==='ai'&&<>
  <p className="setup-lead">新手可以直接授权；已有密钥，也可以继续使用。</p>
  <div className="connection-tabs" role="group" aria-label="AI 连接方式">
   <button className={connectionPath==='quick'?'selected':''} aria-pressed={connectionPath==='quick'} disabled={Boolean(busy)} onClick={()=>setConnectionPath('quick')}>快捷授权 <span>无需复制密钥</span></button>
   <button className={connectionPath==='manual'?'selected':''} aria-pressed={connectionPath==='manual'} disabled={Boolean(busy)} onClick={()=>setConnectionPath('manual')}>我已有 API Key</button>
  </div>
  {connectionPath==='quick'?<div className="quick-connect">
   <div className="quick-connect-mark" aria-hidden="true"><Link2 size={28}/><span>01 / CONNECT</span></div>
   <h3>一个账号，连接多个模型。</h3>
   <p>通过 OpenRouter 官方授权，回来就能继续。接口地址和凭证会自动配置。</p>
   <ol><li><span>1</span>前往官方页面登录或注册</li><li><span>2</span>确认授权与使用额度</li><li><span>3</span>自动返回，选择课程</li></ol>
   <form action="/api/connect/openrouter" method="post" target="_top"><button type="submit" className="setup-primary" disabled={Boolean(busy)}>连接 OpenRouter <ArrowRight size={18}/></button></form>
   <p className="setup-fine">需要 OpenRouter 账号。它是独立的第三方平台；实际问答使用你的额度，按所选模型计费。连接时不自动生成、不替你充值。</p>
   <ProviderHelp href="https://openrouter.ai/settings/credits" label="了解额度与账单"/>
   {state.onboarding.modelReady&&<button className="setup-secondary" disabled={Boolean(busy)} onClick={()=>act('正在保存…',()=>go(2))}>使用已有连接，继续 <ArrowRight size={16}/></button>}
  </div>:<>
   <div className="setup-providers" role="group" aria-label="选择 AI 平台">{providers.map(p=><button key={p.id} className={provider===p.id?'selected':''} aria-pressed={provider===p.id} disabled={Boolean(busy)} onClick={()=>pickProvider(p.id)}><span>{p.letter}</span>{p.name}</button>)}</div>
   <form onSubmit={connect} autoComplete="off">
    <div className="connect-field-group"><label className="setup-field" htmlFor="provider-key"><span>API 密钥</span><input id="provider-key" type="password" autoComplete="new-password" value={config.apiKey} onChange={e=>{setConfig(c=>({...c,apiKey:e.target.value}));setModels([]);}} placeholder={sameSaved?'已安全保存，可留空':'粘贴你自己的 API Key'} disabled={Boolean(busy)}/><small>接口地址已填好。密钥加密保存，不会回显。</small></label>{selected.keys&&<ProviderHelp href={selected.keys} label="去官方平台获取密钥"/>}</div>
    <button className="setup-secondary model-discover" type="button" disabled={Boolean(busy)||(!config.apiKey&&!sameSaved)} onClick={discover}><Link2 size={16}/>读取可用模型</button>
    {(models.length>0||config.model)&&<label className="setup-field"><span>选择模型</span><select value={config.model} disabled={Boolean(busy)} onChange={e=>setConfig(c=>({...c,model:e.target.value}))}>{config.model&&!models.includes(config.model)&&<option value={config.model}>{config.model}（当前设置）</option>}{models.map(m=><option key={m} value={m}>{m}</option>)}</select><small>从实际接口读取，不需要去网页寻找或复制 model ID。模型价格请核对供应商账单。</small></label>}
    <details className="setup-help"><summary>还没有密钥，或链接打不开？<ChevronDown size={15}/></summary><p>可以切换到上方“快捷授权”。继续手动连接时，先在官方平台创建 API Key，再粘贴到这里。聊天会员和 API 通常分别计费。</p><p>链接会在当前完整页面打开；如内置浏览器仍拦截，点“复制网址”，粘贴到 Safari 或 Chrome。返回后从已保存步骤继续。</p></details>
    <details className="setup-help" open={provider==='custom'}><summary>高级设置与手动模型名称 <ChevronDown size={15}/></summary><label className="setup-field"><span>接口类型</span><select value={config.apiStyle} onChange={e=>{setConfig(c=>({...c,apiStyle:e.target.value}));setModels([]);}}><option value="responses">OpenAI Responses</option><option value="chat-completions">OpenAI 兼容 Chat Completions</option><option value="anthropic">Anthropic Messages</option></select></label><label className="setup-field"><span>API Base URL</span><input required type="url" value={config.baseUrl} onChange={e=>{setConfig(c=>({...c,baseUrl:e.target.value,apiKey:''}));setModels([]);}} placeholder="供应商官方 API 地址"/><small>仅自定义平台需要更改；填基础地址，不添加 /responses 等路径。</small></label><label className="setup-field"><span>手动模型名称（接口不提供列表时）</span><input value={config.model} onChange={e=>setConfig(c=>({...c,model:e.target.value}))} placeholder="供应商提供的完整 model ID"/></label>{selected.models&&<ProviderHelp href={selected.models} label="查看官方模型说明"/>}</details>
    {note&&<p className="setup-notice" role="status">{note}</p>}
    <button className="setup-primary" disabled={Boolean(busy)||!config.model} type="submit">保存连接，继续 <ArrowRight size={18}/></button>
   </form>
   <p className="setup-fine">读取模型列表不等于已验证问答能力。只有你主动发起任务时，才会调用模型。</p>
  </>}
  <button className="setup-later" disabled={Boolean(busy)} onClick={()=>act('正在保存…',async()=>{setMode('library');await go(2,{mode:'library'});})}>现在不连接，先添加课程</button>
 </>}
 {step===2&&<><p className="setup-lead">先加一门课就好，其他课程以后再添加。</p><div className="setup-methods" role="group" aria-label="选择课程添加方式"><button className={courseMethod==='file'?'selected':''} aria-pressed={courseMethod==='file'} disabled={Boolean(busy)} onClick={()=>setCourseMethod('file')}><Upload size={17}/>我有课程文件</button><button className={courseMethod==='browser'?'selected':''} aria-pressed={courseMethod==='browser'} disabled={Boolean(busy)} onClick={()=>setCourseMethod('browser')}><Link2 size={17}/>从 Canvas 带入</button></div>{courseMethod==='file'?<form onSubmit={addCourse}>{state.courses.length>0&&<label className="setup-field"><span>选择一门课</span><select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">新建课程</option>{state.courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}{!chosen&&<label className="setup-field"><span>这门课叫什么？</span><input required maxLength={200} value={name} onChange={e=>setName(e.target.value)} placeholder="例如：BUS625 · 商业分析" disabled={Boolean(busy)}/><small>按学校显示的名称填写，不需要记课程编号。</small></label>}<label className="setup-upload"><span><Upload size={24}/><b>{file?file.name:'放入课程大纲（选填）'}</b><small>点击选择 PDF、Word 或文字文件</small></span><input type="file" accept=".pdf,.docx,.txt,.md,.html,.htm" disabled={Boolean(busy)} onChange={e=>setFile(e.target.files?.[0])}/></label><p className="setup-fine">大纲通常叫 Syllabus，里面有评分比例和每周安排。每份不超过 20MB；扫描图片可能提取不到正文，失败时课程会保留，可换文件重试。</p><details className="setup-help"><summary>学校网址（选填） <ChevronDown size={15}/></summary><label className="setup-field"><span>课程网站地址</span><input type="url" value={school} onChange={e=>setSchool(e.target.value)} placeholder="https://学校课程网站"/><small>暂时不知道可以留空；不会把示例网址当作真实来源。</small></label></details><button className="setup-primary" type="submit" disabled={Boolean(busy)}>{chosen?'保存并继续':'建立课程并继续'}<ArrowRight size={18}/></button></form>:<><div className="setup-browser-context"><b>电脑 Chrome／Edge 可以使用浏览器助手</b><p>先在学校官网登录并完成手机验证，再导出课程文件。手机暂不能安装这个电脑扩展，可切回“我有课程文件”上传大纲。</p></div><BrowserImport busy={Boolean(busy)} onBusyChange={setBusy} onImported={onRefresh}/>{state.courses.length>0&&<button className="setup-primary" disabled={Boolean(busy)} onClick={()=>act('正在保存进度…',async()=>{setDeferred(false);await go(3,{courseDeferred:false});})}>使用已导入课程，继续 <ArrowRight size={18}/></button>}</>}<button className="setup-later" disabled={Boolean(busy)} onClick={()=>act('正在记录稍后添加…',async()=>{setDeferred(true);await go(3,{courseDeferred:true});})}>暂时没有资料，稍后添加课程</button></>}
 {step===3&&<><p className="setup-lead">核对一下。进入后，这些配置仍然可以更改。</p><div className="setup-summary"><div><Check size={18}/><span><b>独立空间已建立</b><small>无需邮箱，资料按你的空间保存。</small></span></div><div><Sparkles size={18}/><span><b>{mode==='ai'?'AI 设置已保存':'先整理资料，AI 稍后配置'}</b><small>{mode==='ai'?(state.settings.model||'请返回连接步骤补充模型名称'):'不会自动调用模型。'}</small></span></div><div><BookOpen size={18}/><span><b>{state.courses.length?`已添加 ${state.courses.length} 门课程`:'课程选择稍后添加'}</b><small>{state.courses.length?(state.materials.some(m=>m.kind==='syllabus')?'大纲文件已保存，正文完整性请核对。':'还没有大纲，进入后可在资料库补充。'):'总控台会保留添加课程入口。'}</small></span></div></div><div className="setup-inline-tip"><Sparkles size={18}/><span>{mode==='ai'?'下一步可在 AI 工作台选择“读懂大纲”，由你主动发起第一个问题。':'下一步先上传完整课程大纲，再整理这学期的任务。'}</span></div><button className="setup-primary" disabled={Boolean(busy)} onClick={finish}>完成配置，进入总控 <ArrowRight size={18}/></button><p className="setup-fine">不会自动发起付费生成，也不会把草稿提交到学校。</p></>}
 {busy&&<p className="setup-busy" role="status"><LoaderCircle size={16} className="spin"/>{busy}</p>}{step>0&&<button className="setup-back" type="button" disabled={Boolean(busy)} onClick={()=>act('正在返回上一步…',()=>go(step-1))}><ArrowLeft size={15}/>上一步</button>}</div><footer className="setup-panel-footer"><span>配置进度自动保存</span><span>只在你操作时继续</span></footer></section></div></main>;
}
