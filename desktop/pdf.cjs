const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
let library;
async function extractPdf(filePath) {
  const stats = fs.statSync(filePath);
  if (stats.size > 40 * 1024 * 1024) throw new Error('这份 PDF 超过40MB，请先按相关章节拆分后导入。');
  library ||= import(pathToFileURL(path.join(__dirname, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
  const { getDocument } = await library;
  const job = getDocument({ data: new Uint8Array(fs.readFileSync(filePath)), useSystemFonts: true,
    isEvalSupported: false, useWorkerFetch: false,
    standardFontDataUrl: path.join(__dirname, 'node_modules/pdfjs-dist/standard_fonts').replace(/\\/g, '/') + '/' });
  const document = await job.promise;
  try {
    if (document.numPages > 600) throw new Error('这份 PDF 页数较多，请先选择作业相关章节。');
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const body = content.items.map(item => item.str ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
      pages.push(`\n[第 ${pageNumber} 页]\n${body}`);
      page.cleanup();
    }
    const text = pages.join('\n').trim();
    if (text.replace(/\[第 \d+ 页\]/g, '').trim().length < 30) {
      throw new Error('这份 PDF 可能是扫描图片，暂时没有提取到足够正文。请导入可复制文字的版本或人工整理的阅读笔记。');
    }
    return { text, pages: document.numPages };
  } finally { await document.destroy(); }
}
module.exports = { extractPdf };
