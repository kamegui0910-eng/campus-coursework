// Deterministic, annotated instructional images; explicitly not official screenshots.
import {mkdir,writeFile} from 'node:fs/promises';
import {AI_PROVIDERS} from '../lib/guides/provider-guides.mjs';
const root=new URL('../public/guides/',import.meta.url);await mkdir(root,{recursive:true});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function t(x,y,text,size=22,color='#37343F',weight=500){return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${esc(text)}</text>`;}
function rect(x,y,w,h,fill,stroke='none',rx=8){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;}
for(const p of AI_PROVIDERS)for(const device of ['mobile','desktop'])for(let step=0;step<4;step++){
 const mobile=device==='mobile',w=mobile?600:900,h=mobile?740:580;
 const x=mobile?104:42,y=mobile?103:100,screenW=mobile?392:816,screenH=mobile?540:378;
 const title=`${p.name} · ${mobile?'手机浏览器':'电脑网页'} · ${step+1}/4`;
 let body=rect(0,0,w,h,'#f5f4f0')+t(26,36,title,mobile?22:24,'#37343F',750)+t(26,70,'操作示意图 · 非官网截图',18,'#726a7a');
 body+=rect(x,y,screenW,screenH,'#fff','#37343F',mobile?28:10);
 if(mobile)body+=rect(x+145,y+8,102,16,'#37343F','none',8);
 body+=rect(x+14,y+(mobile?38:14),screenW-28,36,'#eeeaf3')+t(x+26,y+(mobile?63:39),step===3?'Coursework / 连接设置':p.console,mobile?18:20);
 const sx=x+24,sy=y+(mobile?105:88),inner=screenW-48;
 if(step===0){
  body+=t(sx,sy,'1  打开官方入口',mobile?25:28,'#4051E8',750);
  body+=rect(sx,sy+24,inner,mobile?88:54,'#f5ff7a');
  const host=p.keys?new URL(p.keys).hostname:'供应商官方域名';body+=t(sx+12,sy+58,host,mobile?21:25,'#37343F',700);
  if(mobile)body+=t(sx+12,sy+88,'在 Safari / Chrome 中登录',17);
  body+=t(sx,sy+(mobile?160:120),'API keys / 密钥管理',mobile?23:27,'#37343F',700);
  body+=rect(sx,sy+(mobile?185:145),inner,52,'#4051e8')+t(sx+14,sy+(mobile?219:180),'打开 API keys  →',22,'white',700);
 }else if(step===1){
  body+=t(sx,sy,'2  创建密钥',mobile?25:28,'#4051E8',750);
  body+=t(sx,sy+50,p.id==='gemini'?'项目 / Project':'名称 / Name',21);
  body+=rect(sx,sy+69,inner,48,'#f8f7fa','#d6cfde')+t(sx+12,sy+101,p.id==='gemini'?'选择自己的项目  ▾':'Coursework（示例名称）',mobile?19:23);
  body+=rect(sx,sy+147,inner,58,'#ff62c0','#37343F')+t(sx+14,sy+184,p.action,mobile?21:27,'#37343F',750);
  body+=t(sx,sy+245,'↑  在官方页面完成创建',mobile?21:24,'#4051E8',700);
 }else if(step===2){
  body+=t(sx,sy,'3  复制 API key',mobile?25:28,'#4051E8',750);
  body+=rect(sx,sy+35,inner,100,'#f8f7fa','#d6cfde');body+=t(sx+12,sy+76,'•••• •••• •••• ••••',mobile?26:32);
  body+=rect(sx+inner-98,sy+91,88,40,'#39f5d6','#37343F')+t(sx+inner-85,sy+118,'Copy',20,'#37343F',700);
  body+=t(sx,sy+183,'这里只显示遮罩，不是真实密钥',mobile?20:24);
  body+=t(sx,sy+224,'复制后返回 Coursework',mobile?22:27,'#4051E8',750);
 }else{
  body+=t(sx,sy,'4  粘贴并读取模型',mobile?25:28,'#4051E8',750);
  body+=t(sx,sy+43,'API 密钥',20)+rect(sx,sy+59,inner,45,'#f8f7fa','#d6cfde')+t(sx+12,sy+90,'•••• •••• ••••',23);
  body+=rect(sx,sy+123,inner,49,'#f5ff7a','#37343F')+t(sx+12,sy+155,'读取可用模型  →',22,'#37343F',700);
  body+=t(sx,sy+211,'选择模型 → 保存连接',mobile?22:27,'#4051E8',750);
 }
 body+=t(26,h-27,mobile?'找不到按钮？试试浏览器的“请求桌面网站”。':'按钮名称与位置可能更新，以官方页面为准。',mobile?18:20,'#726a7a');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(p.steps[step].join('。'))}。这是位置与操作示意，不是官网截图。</desc><g font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">${body}</g></svg>`;
 await writeFile(new URL(`${p.id}-${device}-${step+1}.svg`,root),svg);
}
console.log(`Generated ${AI_PROVIDERS.length*2*4} public guide images.`);
