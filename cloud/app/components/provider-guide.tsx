"use client";
import {useEffect,useRef,useState} from 'react';
import {Smartphone,Monitor,ChevronDown,ChevronLeft,ChevronRight,Maximize2,X} from 'lucide-react';
import {GUIDE_REVIEWED,providerById,guideImage} from '@/lib/guides/provider-guides.mjs';
import ProviderHelp from './provider-help';
export default function ProviderGuide({providerId,compact=false}:{providerId:string;compact?:boolean}){
 const p=providerById(providerId),[expanded,setExpanded]=useState(!compact),[device,setDevice]=useState<'mobile'|'desktop'>('mobile'),[step,setStep]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{setDevice(window.matchMedia('(max-width: 640px)').matches?'mobile':'desktop');},[]);
 useEffect(()=>{setStep(0);},[providerId]);
 const entry=p.steps[step],src=guideImage(p.id,device,step),label=`${p.name} ${device==='mobile'?'手机':'电脑'}第 ${step+1} 步：${entry[0]}`;
 const viewer=<><img className="provider-guide-image" src={src} alt={label+'。'+entry[1]+'（操作示意，非官网截图）'} width={device==='mobile'?600:900} height={device==='mobile'?740:580}/><figcaption><b>{String(step+1).padStart(2,'0')} / {entry[0]}</b><p>{entry[1]}</p></figcaption></>;
 return <section className="provider-guide" aria-label={`${p.name} API 接入图解`}>
  <button type="button" className="provider-guide-heading" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}><img src="/guides/connection-overview.png" loading="lazy" width={74} height={50} alt="电脑与手机连接密钥的插画"/><span><b>{p.name} · 接入图解</b><small>手机 / 电脑 · 每一步都有图</small></span><ChevronDown size={17} className={expanded?'turned':''}/></button>
  {expanded&&<div className="provider-guide-body">
   <div className="provider-guide-devices" role="group" aria-label="选择教程设备"><button type="button" aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}><Smartphone size={15}/>手机浏览器</button><button type="button" aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}><Monitor size={15}/>电脑网页</button></div>
   {device==='mobile'&&<p className="provider-guide-mobile-note">用 Safari／Chrome 打开官方页面；如布局不完整，在浏览器菜单选择“请求桌面网站”。不需要在聊天 App 中找 API 设置。</p>}
   <div className="provider-guide-steps" role="group" aria-label="选择图解步骤">{p.steps.map((s:string[],i:number)=><button key={s[0]} type="button" aria-pressed={step===i} aria-label={`第 ${i+1} 步：${s[0]}`} onClick={()=>setStep(i)}>{i+1}<span>{['打开','创建','复制','接通'][i]}</span></button>)}</div>
   <figure className="provider-guide-figure">{viewer}<button type="button" className="provider-guide-zoom" onClick={()=>dialog.current?.showModal()}><Maximize2 size={14}/>放大图片</button></figure>
   <div className="provider-guide-paging"><button type="button" disabled={step===0} onClick={()=>setStep(i=>i-1)}><ChevronLeft size={15}/>上一步</button><span>{step+1} / {p.steps.length}</span>{step<3?<button type="button" onClick={()=>setStep(i=>i+1)}>下一步<ChevronRight size={15}/></button>:<button type="button" onClick={()=>{setExpanded(false);document.getElementById('provider-key')?.focus();}}>去填写密钥<ChevronRight size={15}/></button>}</div>
   <p className="provider-guide-note">{p.note}</p>
   {p.keys&&<ProviderHelp href={p.keys} label="打开官方密钥页面"/>}{p.source&&<ProviderHelp href={p.source} label="核对官方使用说明"/>}
   <small className="provider-guide-reviewed">操作示意，非官网截图 · 核对于 {GUIDE_REVIEWED} · 页面可能更新</small>
  </div>}
  <dialog ref={dialog} className="provider-guide-dialog" aria-label={label} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><button type="button" className="provider-guide-close" onClick={()=>dialog.current?.close()}><X size={18}/>关闭图解</button><figure>{viewer}</figure></dialog>
 </section>;
}
