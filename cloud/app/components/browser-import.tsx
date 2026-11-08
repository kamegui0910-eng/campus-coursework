"use client";
import {useState} from 'react';
import {readFile} from '@/lib/client-files';
import {validateBrowserPackage,browserSummary,browserFiles} from '@/lib/coursework/browser-package.mjs';

export default function BrowserImport({busy,onImported,onBusyChange}:{busy:boolean;onImported:()=>Promise<void>;onBusyChange:(message:string)=>void}){
 const [raw,setRaw]=useState<any>(null),[pkg,setPkg]=useState<any>(null),[selected,setSelected]=useState<string[]>([]),[consent,setConsent]=useState(false),[message,setMessage]=useState(''),[results,setResults]=useState<any[]>([]),[working,setWorking]=useState(false);
 async function preview(file?:File){setRaw(null);setPkg(null);setResults([]);setConsent(false);setMessage('');if(!file)return;try{if(!file.size||file.size>24*1024*1024)throw Error('请选择不超过24MB的 .coursework.json 导入包。');const value=JSON.parse(await file.text()),validated=validateBrowserPackage(value);for(const c of validated.courses)browserFiles(value,c.id);setRaw(value);setPkg(validated);setSelected(validated.courses.map((c:any)=>c.id));}catch(e){setMessage(e instanceof Error?e.message:'导入包无法读取。');}}
 async function save(){if(!pkg||!consent||busy||!selected.length)return;setWorking(true);onBusyChange('正在保存浏览器课程资料…');setResults([]);const report:any[]=[];try{
  for(const c of pkg.courses.filter((c:any)=>selected.includes(c.id))){
   try{
    // Project to the public import schema: session state, unknown fields and file
    // bytes never enter this JSON request. Files use the existing upload path.
    const metadata={...pkg,courses:[c]};if(new TextEncoder().encode(JSON.stringify(metadata)).length>950000)throw Error('这门课的题干内容超过单次导入上限，请分章手动导入。');
    const response=await fetch('/api/campus',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'browser.import',payload:{confirmed:true,externalId:c.id,package:metadata}})});
    if(!response.headers.get('content-type')?.includes('json'))throw Error('Coursework登录已过期，请重新登录后导入。');
    const result:any=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'课程没有保存成功。');
    const item={...result.data,filesSaved:0,fileGaps:[] as string[]};report.push(item);
    for(const f of browserFiles(raw,c.id))try{
     const binary=atob(f.base64),bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0)),file=new File([bytes],f.name,{type:f.mimeType});
     setMessage('正在提取 '+f.name+'…');const extracted=await readFile(file,setMessage),form=new FormData();form.set('courseId',item.courseId);form.set('kind',f.kind);form.set('file',file);form.set('text',extracted.text);form.set('extractionStatus',extracted.extractionStatus);
     const uploaded=await fetch('/api/campus',{method:'POST',credentials:'same-origin',body:form});if(!uploaded.headers.get('content-type')?.includes('json'))throw Error('Coursework登录已过期');const saved:any=await uploaded.json();if(!uploaded.ok||!saved.ok)throw Error(saved.error||'附件未保存');item.filesSaved++;
    }catch(e){item.fileGaps.push(f.name+'：'+(e instanceof Error?e.message:'未能提取，请保留原文件后手动导入'));}
   }catch(e){report.push({name:c.name,error:e instanceof Error?e.message:'导入未完成'});}
  }
  setResults(report);setMessage('逐门处理结束，请核对结果与缺口。原始导入包请保留，以便失败时重试。');await onImported();
 }catch(e){setResults(report);setMessage(e instanceof Error?e.message:'保存未完成，已完成的结果仍保留。');}finally{setWorking(false);onBusyChange('');}}
 return <section className="browser-import"><span className="eyebrow">无需学校 API TOKEN</span><h3>用已登录的浏览器带入课程</h3><p>在电脑 Chrome／Edge 中正常登录学校、完成手机验证，再用浏览器助手导出你选择的课程。这里只接收课程资料，不接收学校密码、Cookie或登录会话。</p><ol><li><a href="/downloads/coursework-browser-helper.zip" download>下载浏览器助手测试包</a>，解压后按包内说明安装。</li><li>打开已登录的 Canvas 页面，点击助手，核对学期并导出 .coursework.json。</li><li>在下方选择文件，预览后保存到当前 Coursework 账号。</li></ol><p className="field-help">这是桌面浏览器采集入口，导入后的资料可在手机使用。手机直接登录学校的云端浏览器尚未配置。助手不包含自动答题或提交功能。</p><label className="field"><span>选择浏览器导出包</span><input type="file" accept=".coursework.json,application/json" disabled={busy||working} onChange={e=>{void preview(e.target.files?.[0]);e.target.value='';}}/></label>{pkg&&<div className="import-preview"><b>{new URL(pkg.schoolUrl).hostname}</b><p>浏览器显示的账号：{pkg.accountLabel||'未提供'} · 采集于 {new Date(pkg.capturedAt).toLocaleString()}</p><p className="field-help">这是用户导出的快照，身份与内容未由学校向 Coursework 独立认证。请确认属于你本人。</p>{browserSummary(pkg).map((c:any)=><label className="import-course" key={c.id}><input type="checkbox" disabled={working} checked={selected.includes(c.id)} onChange={e=>setSelected(v=>e.target.checked?[...v,c.id]:v.filter(id=>id!==c.id))}/><span><b>{c.name}</b><small>{c.term||'学期未提供，请核对'} · {c.assignments}项作业 · {browserFiles(raw,c.id).length}份附件</small><small>{c.syllabusCharacters?'大纲页面已采集，完整性待核对':'尚未取得大纲正文'}{!c.complete?' · 列表有缺口':''}</small>{c.gaps.map((gap:string,i:number)=><small key={i}>{gap}</small>)}</span></label>)}<label><input type="checkbox" checked={consent} disabled={working} onChange={e=>setConsent(e.target.checked)}/>我确认选中资料属于我有权访问的课程，并保存到当前账号的云端资料库。</label><button className="button button-primary" disabled={busy||working||!consent||!selected.length} onClick={save}>{working?'正在导入…':`确认导入 ${selected.length} 门课程`}</button></div>}{message&&<p role="status">{message}</p>}{results.map((r,i)=><div className="import-report" key={i}><b>{r.name}</b><p>{r.error||`${r.savedAssignments}项作业、${r.filesSaved}份可读附件已保存。`}</p>{[...(r.gaps||[]),...(r.fileGaps||[])].map((gap:string,j:number)=><p key={j}>{gap}</p>)}</div>)}</section>;
}
