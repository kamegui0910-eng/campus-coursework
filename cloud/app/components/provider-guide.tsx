"use client";
import {useEffect,useRef,useState} from 'react';
import {Smartphone,Monitor,ChevronDown,ChevronLeft,ChevronRight,Maximize2,X,Image as ImageIcon,Plus,Minus} from 'lucide-react';
import {providerById} from '@/lib/guides/provider-guides.mjs';
import {screenshotGuide} from '@/lib/guides/screenshots.mjs';
import ProviderHelp from './provider-help';
export default function ProviderGuide({providerId,compact=true}:{providerId:string;compact?:boolean}){
 const p=providerById(providerId),guide=screenshotGuide(providerId),[expanded,setExpanded]=useState(!compact),[device,setDevice]=useState<'mobile'|'desktop'>('mobile'),[step,setStep]=useState(0),[zoom,setZoom]=useState(2);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{setDevice(window.matchMedia('(max-width:640px)').matches?'mobile':'desktop');},[]);
 useEffect(()=>{setStep(0);},[providerId]);
 const item=guide?.items[step],label=`${p.name} ${item?.title||'官方教程'}`;
 return <section className="provider-guide screenshot-guide" aria-label={`${p.name} 官网截图教程`}>
  <button type="button" className="provider-guide-heading" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}><ImageIcon size={22}/><span><b>{p.name} · 查看官网截图</b><small>{guide?'引用现成教程原图，支持放大对照':'自定义平台请按供应商官方页面操作'}</small></span><ChevronDown size={17} className={expanded?'turned':''}/></button>
  {expanded&&<div className="provider-guide-body">
   <div className="provider-guide-devices" role="group" aria-label="选择操作设备"><button type="button" aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}><Smartphone size={15}/>手机怎么操作</button><button type="button" aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}><Monitor size={15}/>电脑怎么操作</button></div>
   <p className="provider-guide-mobile-note">{device==='mobile'?'手机：在 Safari／Chrome 打开下方官方入口。如菜单不全，选择“请求桌面网站”，对照原教程截图；点击放大后可缩放和拖动查看。':'电脑：打开下方官方入口，用原教程截图对照菜单和按钮位置。'}</p>
   {guide&&item?<>
    <figure className="provider-guide-figure"><button type="button" className="screenshot-open" onClick={()=>{setZoom(2);dialog.current?.showModal();}} aria-label={`放大${label}`}><img className="provider-guide-image screenshot-image" src={item.src} alt={`${item.title}；真实控制台截图，来源 ${guide.credit}`} loading="lazy"/><span><Maximize2 size={14}/>点击放大原图</span></button><figcaption><b>{item.title}</b><p>{item.caption}</p></figcaption></figure>
    {guide.items.length>1&&<div className="provider-guide-paging"><button type="button" disabled={step===0} onClick={()=>setStep(i=>i-1)}><ChevronLeft size={15}/>上一张</button><span>{step+1} / {guide.items.length}</span><button type="button" disabled={step===guide.items.length-1} onClick={()=>setStep(i=>i+1)}>下一张<ChevronRight size={15}/></button></div>}
    <p className="provider-guide-attribution">截图来源：<a href={guide.source} target="_top" rel="noreferrer">{guide.credit} · 查看完整原教程 ↗</a></p>
    <small className="provider-guide-reviewed">原图为电脑网页／网页弹窗截图；手机操作说明不代表另拍了手机版截图。界面可能已更新，以当前官网为准。</small>
   </>:<p className="provider-guide-note">不同供应商的控制台各不相同，没有可通用的真实截图。请在自己的供应商后台寻找 API keys，并核对官方基础地址和协议。</p>}
   <p className="provider-guide-note">{p.note}</p>
   {p.keys&&<ProviderHelp href={p.keys} label="打开官方密钥页面"/>}{p.source&&<ProviderHelp href={p.source} label="查看官方说明"/>}
  </div>}
  {guide&&item&&<dialog ref={dialog} className="provider-guide-dialog screenshot-dialog" aria-label={label} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><div className="screenshot-tools"><button type="button" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.5))} aria-label="缩小截图"><Minus size={17}/></button><span>{zoom*100}%</span><button type="button" disabled={zoom>=4} onClick={()=>setZoom(z=>Math.min(4,z+.5))} aria-label="放大截图"><Plus size={17}/></button><button type="button" className="provider-guide-close" onClick={()=>dialog.current?.close()}><X size={18}/>关闭</button></div><div className="screenshot-viewport"><img src={item.src} alt={label} style={{width:`${zoom*100}%`,maxWidth:'none',height:'auto'}}/></div><p className="provider-guide-note">{item.caption}</p><small className="provider-guide-reviewed">来源：{guide.credit} · 原图未修改，放大后可左右、上下滚动。</small></dialog>}
 </section>;
}
