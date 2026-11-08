"use client";
import {useState} from 'react';
import {Check,ChevronDown,SlidersHorizontal} from 'lucide-react';
import {MODEL_PREFERENCES,recommendation,modelOptions} from '@/lib/coursework/model-recommendations.mjs';
type Choice={model:string;selectionMode:string;preference:string};
export default function ModelChooser({models,value,disabled,onChange}:{models:string[];value:Choice;disabled?:boolean;onChange:(choice:Choice)=>void}){
 const [search,setSearch]=useState('');const automatic=value.selectionMode==='recommended',selected=recommendation(models,value.preference||'balanced');
 const options=modelOptions(models),filtered=options.filter(m=>m.toLowerCase().includes(search.toLowerCase()));
 function pick(preference:string){const r=recommendation(models,preference);if(r.model)onChange({model:r.model,preference,selectionMode:'recommended'});}
 return <section className="model-chooser" aria-label="选择模型使用方式"><div className="model-chooser-intro"><span>YOUR STUDY SETUP</span><h3>不用研究模型名，选你的使用方式。</h3><p>从当前账号的模型列表中推荐，选好就可以继续。</p></div>
  <div className="model-plan-list" role="group" aria-label="模型使用偏好">{MODEL_PREFERENCES.map(p=>{const r=recommendation(models,p.id),active=automatic&&value.preference===p.id;return <button type="button" key={p.id} className={active?'active':''} aria-pressed={active} disabled={disabled||!r.model} onClick={()=>pick(p.id)}><span className="model-plan-radio">{active&&<Check size={13}/>}</span><span><b>{p.title}<small>{p.tag}</small></b><p>{p.description}</p>{!r.model&&<em>当前列表没有可可靠推荐的型号</em>}</span></button>;})}</div>
  {automatic&&value.model&&<div className="model-recommendation" role="status"><span><Check size={16}/>已为你选好</span><b>{value.model}</b><p>{selected.reason}</p><small>保存后固定使用这个模型。更换前可以在设置里确认，调用失败不会自动升级型号。</small></div>}
  {!automatic&&value.model&&<p className="model-manual-status">当前由你指定：<b>{value.model}</b></p>}
  {!models.some(m=>recommendation([m],'quality').model)&&<p className="model-choice-note">这个接口的型号暂未识别。请在下方手动选择供应商支持的文本生成模型。</p>}
  <details className="model-manual" open={!automatic}><summary><SlidersHorizontal size={15}/>我想自己选模型 <ChevronDown size={15}/></summary><label className="setup-field"><span>搜索模型名称</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="按名称搜索文本模型" disabled={disabled}/></label><label className="setup-field"><span>手动选择</span><select value={value.model} disabled={disabled} onChange={e=>onChange({model:e.target.value,preference:value.preference||'balanced',selectionMode:'manual'})}><option value="">请选择文本模型</option>{value.model&&!filtered.includes(value.model)&&<option value={value.model}>{value.model}（当前）</option>}{filtered.map(m=><option key={m} value={m}>{m}</option>)}</select><small>已隐藏可识别的语音、绘图、嵌入等专用型号。未识别型号需按供应商文档核对。</small></label></details>
  <p className="model-choice-note">推荐依据是模型系列与用途规则，不是实际质量测评或实时价格比较。具体费用和可用权限以供应商为准。</p>
 </section>;
}
