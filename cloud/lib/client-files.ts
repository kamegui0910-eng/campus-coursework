export async function readFile(file: File, progress: (message: string) => void) {
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error("请选择不超过 20 MB 的文件。较大的教材请按章节拆分。");
  const ext = file.name.split(".").pop()?.toLowerCase(); let text = "", extractionStatus = "browser-text";
  if (ext === "pdf") {
    progress("正在读取 PDF…");
    const pdfjs = await import("pdfjs-dist");
    // This only runs in the browser. Vite emits the worker as a same-origin asset.
    // @ts-ignore Vite resolves the asset URL query at build time.
    pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    try {
      if (document.numPages > 300) throw new Error("这份 PDF 超过 300 页，请按章节拆分后上传。");
      const pages: string[] = []; let characters = 0;
      for (let number = 1; number <= document.numPages; number++) {
        progress(`正在读取 PDF · ${number}/${document.numPages} 页`);
        const page = await document.getPage(number), content = await page.getTextContent();
        const part = content.items.map(item => "str" in item ? item.str : "").join(" ");
        pages.push(part); characters += part.length;
        if (characters > 500000) throw new Error("这份资料文字较多，请按章节拆分后上传。");
        page.cleanup();
      }
      text = pages.join("\n\n"); extractionStatus = "pdf-complete";
    } finally { await document.destroy(); }
    if (!text.trim()) throw new Error("这份 PDF 可能是扫描件，暂时提取不到文字。请上传可复制文字的版本，或补充阅读笔记。");
  } else if (ext === "docx") {
    progress("正在读取 Word 文件…"); const { unzipSync, strFromU8 } = await import("fflate");
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: entry => entry.name === "word/document.xml" && entry.originalSize <= 4 * 1024 * 1024 });
    if (!entries["word/document.xml"]) throw new Error("Word 正文未能读取，或内容过大。请另存为 PDF、TXT 或分章文件。");
    const document = new DOMParser().parseFromString(strFromU8(entries["word/document.xml"]), "application/xml");
    if (document.querySelector("parsererror")) throw new Error("Word 正文格式有误，请另存为 PDF 或 TXT 后上传。");
    text = Array.from(document.getElementsByTagNameNS("*", "p")).map(p => Array.from(p.getElementsByTagNameNS("*", "t")).map(node => node.textContent || "").join("")).join("\n"); extractionStatus = "docx-complete";
  } else if (["txt", "md", "html", "htm", "json"].includes(ext || "")) {
    text = await file.text();
    if (["html", "htm"].includes(ext || "")) { const document = new DOMParser().parseFromString(text, "text/html"); document.querySelectorAll("script,style,noscript").forEach(element => element.remove()); text = document.body.textContent || ""; }
  } else throw new Error("请上传 PDF、DOCX、TXT、Markdown、HTML 或 JSON 文件。");
  if (!text.trim()) throw new Error("文件里没有可读取的正文，请检查原件后重新上传。");
  if (text.length > 500000) throw new Error("文字超过单份资料上限，请按章节拆分后上传。");
  return { text: text.trim(), extractionStatus };
}
