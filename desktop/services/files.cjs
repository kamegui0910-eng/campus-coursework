const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const MAX_FILE_BYTES = 30 * 1024 * 1024;
function inside(root, target) {
  const base = path.resolve(root), actual = path.resolve(target);
  const relative = path.relative(base, actual);
  if (!relative || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('资料路径不属于这门课程，已停止读取。');
  }
  if (fs.existsSync(actual)) {
    const real = fs.realpathSync(actual), realBase = fs.realpathSync(base);
    const realRelative = path.relative(realBase, real);
    if (realRelative.startsWith('..' + path.sep) || realRelative === '..' || path.isAbsolute(realRelative)) {
      throw new Error('资料链接指向课程目录之外，已停止读取。');
    }
  }
  return actual;
}
function unescapeText(text) {
  const named = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' };
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    if (!entity.startsWith('#')) return named[entity.toLowerCase()] || _;
    const point = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2),16) : parseInt(entity.slice(1),10);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  });
}
function htmlText(text) {
  return unescapeText(text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<(?:br\b[^>]*|\/(?:p|div|h[1-6]|li|tr|section))>/gi,'\n')
    .replace(/<[^>]*>/g,'')).replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
function docxText(buffer) {
  let end = -1;
  for (let i=buffer.length-22;i>=Math.max(0,buffer.length-65558);i--) {
    if (buffer.readUInt32LE(i)===0x06054b50) { end=i; break; }
  }
  if (end<0) throw new Error('Word 文件结构不完整，请重新保存为 DOCX 后导入。');
  let offset=buffer.readUInt32LE(end+16), count=buffer.readUInt16LE(end+10);
  const documents=[];
  for(let i=0;i<count;i++) {
    if(offset+46>buffer.length || buffer.readUInt32LE(offset)!==0x02014b50) throw new Error('Word 文件目录损坏。');
    const flags=buffer.readUInt16LE(offset+8), method=buffer.readUInt16LE(offset+10);
    const size=buffer.readUInt32LE(offset+20), nameLength=buffer.readUInt16LE(offset+28);
    const extraLength=buffer.readUInt16LE(offset+30), commentLength=buffer.readUInt16LE(offset+32);
    const entry=buffer.subarray(offset+46,offset+46+nameLength).toString('utf8');
    if(['word/document.xml','word/footnotes.xml','word/endnotes.xml'].includes(entry)) {
      if(flags & 1) throw new Error('这份 Word 文件已加密，请解密后再导入。');
      const local=buffer.readUInt32LE(offset+42);
      if(local+30>buffer.length || buffer.readUInt32LE(local)!==0x04034b50) throw new Error('Word 文件正文损坏。');
      const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);
      const compressed=buffer.subarray(start,start+size);
      if(compressed.length!==size) throw new Error('Word 文件正文未保存完整。');
      const xml=method===0?compressed:method===8?zlib.inflateRawSync(compressed,{maxOutputLength:16*1024*1024}):null;
      if(!xml) throw new Error('这份 Word 文件使用了尚不支持的压缩格式。');
      documents.push(htmlText(xml.toString('utf8').replace(/<\/w:p>/g,'\n').replace(/<w:tab\b[^>]*\/>/g,'\t')));
    }
    offset+=46+nameLength+extraLength+commentLength;
  }
  if(!documents.length) throw new Error('Word 文件没有可读取的正文。');
  return documents.join('\n\n');
}
async function extractText(file, pdfExtractor) {
  const stat=fs.statSync(file);
  if(!stat.isFile() || stat.size===0) throw new Error('文件为空，尚未取得需要的正文。');
  if(stat.size>MAX_FILE_BYTES) throw new Error('文件超过30MB，请按章节拆分后导入。');
  const buffer=fs.readFileSync(file), ext=path.extname(file).toLowerCase();
  let text, pages;
  if(ext==='.pdf') {
    if(buffer.subarray(0,5).toString()!=='%PDF-') throw new Error('拿到的不是有效PDF，可能只是登录页面，请重新下载原文件。');
    if(!pdfExtractor) throw new Error('PDF已保存，但当前正文提取器不可用。请在阅读器核对，并导入对应TXT或MD笔记。');
    const result=await pdfExtractor(file);
    text=typeof result==='string'?result:result?.text; pages=result?.pages;
  } else if(ext==='.docx') text=docxText(buffer);
  else if(['.txt','.md','.html','.htm','.json','.csv'].includes(ext)) {
    text=buffer.toString('utf8').replace(/^\uFEFF/,'');
    if(text.includes('\u0000') || /\uFFFD/.test(text.slice(0,1000))) throw new Error('文字编码无法可靠读取，请另存为UTF-8文本后导入。');
    if(['.html','.htm'].includes(ext)) {
      if(/<input\b[^>]*type\s*=\s*["']?password/i.test(text) || /<title[^>]*>[^<]*(sign in|log in|login|登录)/i.test(text)) {
        throw new Error('这次保存的是登录页面，不是课程正文。请先登录学校，再下载所需文件。');
      }
      text=htmlText(text);
    }
  } else throw new Error('请导入PDF、DOCX、TXT、MD、HTML或JSON课程资料。');
  if(typeof text!=='string' || !text.trim()) throw new Error('文件已保存，但没有提取到正文；扫描PDF可能需要OCR，请导入可读取的文本或笔记。');
  return {text:text.trim(),pages:pages||null};
}

function selectScope(text, locators, limit=18000) {
  if(!Array.isArray(locators) || !locators.length) return {text:'',gap:'没有明确资料定位，未读取整份资料来猜测。'};
  if(locators.includes('all')) return {text:text.slice(0,limit),gap:text.length>limit?`正文超过本次${limit}字符读取上限，需分段核对余下部分。`:null};
  const headings=[...text.matchAll(/^\s*(#{1,6})\s+([^\n]+)$/gm)];
  const sections=[];
  if(!headings.length)sections.push({heading:'',level:0,start:0,contentStart:0,end:text.length});
  else{
    if(headings[0].index>0)sections.push({heading:'',level:0,start:0,contentStart:0,end:headings[0].index});
    headings.forEach((heading,index)=>sections.push({heading:heading[2],level:heading[1].length,start:heading.index,contentStart:heading.index+heading[0].length,end:headings[index+1]?.index??text.length}));
  }
  const metadata=/^(?:已读|阅读覆盖|覆盖|目录|索引|来源|访问|下载|调用|版本|read\b|coverage\b|contents\b|index\b|manifest\b|参考文献|references\b)/i;
  const selected=new Map();
  const normalized=value=>value.toLowerCase().replace(/\s+/g,'');
  for(const locator of locators) {
    const pieces=String(locator).split(':').filter(Boolean);
    const candidates=pieces.filter(value=>!/^ch\d+$/i.test(value)&&value.length>2&&!/^(core|core-notes|notes|rubric|chapter|reading)$/i.test(value)).map(value=>value.replace(/-text$/i,''));
    // The most specific locator must match substantive content; a broader chapter mention is not proof of a figure.
    const needle=candidates.find(value=>/exhibit|figure|table|图表|图\d|表\d/i.test(value))||candidates.at(-1);
    const matches=needle?sections.filter(section=>!metadata.test(section.heading.trim())&&text.slice(section.contentStart,section.end).trim()).map(section=>{
      const titleMatch=normalized(section.heading).includes(normalized(needle));
      const bodyMatch=normalized(text.slice(section.contentStart,section.end)).includes(normalized(needle));
      return {...section,score:titleMatch?2:bodyMatch?1:0};
    }).filter(section=>section.score):[];
    if(!matches.length)return {text:[...selected.values()].join('\n\n').slice(0,limit),gap:`定位 ${locator} 未在正文自动匹配；覆盖清单或目录中的提及不算正文，请核对具体章节。`};
    const best=Math.max(...matches.map(section=>section.score));
    for(const section of matches.filter(value=>value.score===best))selected.set(section.start,text.slice(section.start,section.end));
  }
  const joined=[...selected.entries()].sort((a,b)=>a[0]-b[0]).map(entry=>entry[1]).join('\n\n');
  return {text:joined.slice(0,limit),gap:joined.length>limit?'相关内容超出本次读取上限，需要分段核对。':null};
}

module.exports={inside,htmlText,extractText,selectScope,docxText,MAX_FILE_BYTES};
