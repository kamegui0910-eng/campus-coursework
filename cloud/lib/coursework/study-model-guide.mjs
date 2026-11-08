import {recommendModels} from './model-recommendations.mjs';
export const STUDY_GUIDE_REVIEWED='2026-11-08';
export const STUDY_MAJORS=[
 {id:'general',label:'通用课程 / 尚未确定',tasks:'读大纲、整理课堂笔记、准备论文提纲、对照评分标准修改草稿。',focus:'先看是否能依据资料回答、保留出处、承认信息缺口。日常任务不必一开始就用最强型号。',workflow:'先做资料摘要，再让模型列证据和待核对点，最后由你回到原文检查。'},
 {id:'business',label:'商科 / 会计 / 金融',tasks:'财报文字解读、商业案例、市场调研、预算差异解释、Excel 公式思路。',focus:'文字解释与精确计算分开。模型能解释比率和假设，但数字、单位、公式、现金流仍应在 Excel 或 Python 中复算。',workflow:'先提供指标口径、关键表格和公式，再做结论与假设分析；完整工作簿需要表格读取与计算工具。'},
 {id:'economics',label:'经济 / 统计 / 数据分析',tasks:'解释回归结果、讨论识别策略、整理变量定义、审查统计代码。',focus:'会讲统计概念，不等于已经算对。关注样本、缺失值、显著性和因果假设；结果需要 R、Python、Stata 等工具重现。',workflow:'先运行分析并提供输出，再让模型解释系数、局限和可替代的解释。'},
 {id:'computing',label:'计算机 / 软件 / 信息系统',tasks:'解释代码、排查报错、比较算法、讨论系统设计、审阅测试方案。',focus:'跨文件逻辑和复杂排错可考虑更强推理型号；简单注释和概念问答用日常型号即可。模型写出测试，不代表运行通过。',workflow:'提供最小复现、依赖版本、输入输出和错误信息；在自己的开发环境执行代码与测试。'},
 {id:'engineering',label:'工程 / 数学 / 物理 / 化学',tasks:'推导步骤、公式解释、实验报告、工程约束分析、比较解题方法。',focus:'多步推导可考虑较强推理型号。重点核对量纲、边界条件、近似假设和数值误差；手写公式或图纸需要先识别图像。',workflow:'先给完整题目与已知量，让模型逐步列假设，再用计算器、数值工具或实验数据检查结果。'},
 {id:'humanities',label:'文学 / 历史 / 语言 / 哲学',tasks:'细读文章、比较论点、梳理论证、翻译与语气调整、准备文献综述。',focus:'优先看长文理解、表达组织和证据定位。可考虑 GPT 日常文本系列或 Claude Sonnet；多文献冲突分析再考虑更强型号。',workflow:'给出原文、版本和引用要求，让模型把主张与原文段落逐项对应；不要直接采用无法找到的引文。'},
 {id:'law',label:'法律 / 公共政策',tasks:'案例要素梳理、IRAC 提纲、法规与政策文本对照、分析争议观点。',focus:'长文对照与复杂论证可考虑 Claude Sonnet / Opus 或 GPT 推理系列。专业正确性取决于法域、时间和原始法源，不是型号名称。',workflow:'先限定法域和条文版本，提供原始材料；逐条核对条文、判例和引用是否真实存在。'},
 {id:'social',label:'心理 / 社会 / 政治 / 社会科学',tasks:'研究方法讨论、访谈主题编码、问卷思路、文献观点对照。',focus:'定性材料可先用日常文本型号；复杂研究设计再考虑更强推理。统计结论需复算，相关关系不等于因果。',workflow:'使用匿名化课程材料，先约定编码标准，再抽样复核模型的分类和解释。'},
 {id:'health',label:'医学 / 护理 / 生命科学',tasks:'课程概念解释、研究论文比较、实验方法梳理、学习性病例讨论。',focus:'关注原论文证据、适用人群、研究局限和指南版本。模型建议用于学习，不替代临床判断；不上传可识别患者资料。',workflow:'提供去标识化教学材料和原始出处，逐条回查关键结论、剂量、单位与研究条件。'},
 {id:'education',label:'教育 / 师范 / 课程设计',tasks:'教案提纲、学习目标、练习题、评分量表与课堂反思。',focus:'日常文本型号通常是合理起点；跨材料评价或复杂课程设计再考虑更强型号。效果取决于年级、学习目标和评分标准。',workflow:'先明确学生阶段、课程目标和 rubric，再检查难度、覆盖范围与评价的一致性。'},
 {id:'design',label:'设计 / 建筑 / 艺术',tasks:'设计说明、方案比较、作品论述；图纸、版面、色彩和构图分析。',focus:'文字说明用文本模型；看版面或图纸要有视觉能力和真正的图片输入。可考虑具备相应能力的 GPT、Claude、Gemini 型号，不能只看品牌。',workflow:'需要看图时先确认产品能发送原图；本站当前请提供设计文字说明或已核对的 OCR 文本。'},
 {id:'media',label:'传媒 / 影视 / 新闻',tasks:'采访提纲、逐字稿整理、叙事结构、带时间戳的内容分析。',focus:'文字稿可以用日常文本模型；直接看视频可研究 Gemini 原生视频 API。配音、转录、剪辑和视频理解是不同能力。',workflow:'先准备带时间戳的转写稿或镜头笔记；保留原始音视频，核对说话人、事实与画面对应。'},
];
export const DISCIPLINE_MODEL_HINTS={
 general:'可先比较 GPT mini、Claude Sonnet、Gemini Flash；先用一份大纲测试回答是否有据可查。',
 business:'财报文字与商业案例可先比较 Claude Sonnet、GPT mini；复杂假设对照可考虑 GPT 推理系列。数值计算另用表格或执行工具。',
 economics:'日常统计解释可先比较 GPT mini、DeepSeek Flash；复杂方法与识别逻辑可考虑 GPT 推理系列或 Claude Sonnet。统计结果由 R / Python / Stata 重现。',
 computing:'代码阅读与一般排错可先比较 Claude Sonnet、GPT 日常系列或 DeepSeek 文本系列；复杂算法与跨文件分析再考虑较强推理型号。',
 engineering:'多步推导可比较 GPT 推理系列、DeepSeek Pro 等候选；涉及图纸或实验图像时，另核对 GPT / Gemini / Claude 的具体视觉型号与输入流程。',
 humanities:'长文梳理与论证组织可先比较 Claude Sonnet、GPT 日常系列；简单阅读摘要用轻量型号，多文献矛盾分析再考虑 Opus 或更强推理型号。',
 law:'长篇法源与争议论证可比较 Claude Sonnet / Opus、GPT 推理系列；简单要素提取可先用日常型号。选择依据是原文核对效果，不是品牌。',
 social:'访谈整理与文献归纳可先比较 GPT mini、Claude Sonnet；研究设计与复杂证据对照可再比较更强推理型号。',
 health:'教学文献归纳可先比较 Claude Sonnet、GPT 日常系列；复杂研究方法对照再考虑更强型号。专业真实性与临床适用性必须回到原始资料核对。',
 education:'教案与练习题初稿可先比较 GPT mini、Claude Haiku；较长的评价标准、课程论证可考虑 Claude Sonnet 或 GPT 日常系列。',
 design:'设计说明可用 GPT / Claude 日常文本系列；要看构图、版面或图纸，可研究 Gemini、GPT、Claude 的视觉型号和原图接入条件。',
 media:'采访稿与叙事文字可先比较 Claude Sonnet、GPT mini；原生视频理解可研究 Gemini 官方支持型号，音频转录则选择独立的转录流程。',
};
export const STUDY_MATERIALS=[
 {id:'documents',label:'文档 / PDF / Word / 论文',preference:'balanced',platform:'可考虑 GPT mini、Claude Sonnet、Gemini Flash 等日常文本系列；多文献矛盾、复杂论证再看更强系列。',need:'主要看上下文长度、原文证据定位和输出结构。扫描页、图表、排版与脚注不能靠纯文字提取完整保留。',siteStatus:'可分析已提取的文字',site:'本站目前提取可复制文字 PDF、DOCX、TXT、Markdown、HTML、JSON 的正文后发送给模型；不会把 PDF 页面图像直接传入。',direct:true,action:'用于文档文字分析'},
 {id:'tables',label:'Excel / CSV / 数据表',preference:'balanced',platform:'解释公式、读分析报告可用 GPT、Claude、Gemini 的文本系列；精确统计、重算工作簿需要另接 Excel / Python / R 等工具。',need:'表格读取、公式关系、计算执行和结果验证比“模型越大越好”更关键。纯语言模型可能算错，也可能漏掉隐藏表或格式。',siteStatus:'完整 Excel 工作簿尚未接入',site:'本站暂不直接解析 XLSX / XLS / CSV 工作簿，也不运行公式。可把关键行、列名、公式或分析结果粘贴成文字，或整理成 TXT / Markdown 再上传。',direct:false,action:'用于表格说明与公式文字分析'},
 {id:'code',label:'代码 / 算法 / 报错',preference:'quality',platform:'复杂算法、排错、架构与代码审阅可考虑 GPT 推理系列、Claude Sonnet / Opus；DeepSeek 文本系列也可作为候选。简单概念讲解不必升级。',need:'优先给出可复现输入、依赖版本和预期输出。生成代码、看懂代码、运行代码、通过测试是四件不同的事。',siteStatus:'支持代码文字讨论，不执行程序',site:'本站可分析粘贴的代码或 TXT / Markdown 中的代码。暂不执行 Python、Notebook 或项目测试，也不自动读取代码仓库。',direct:false,action:'用于代码文字分析'},
 {id:'images',label:'图片 / 扫描件 / 图纸',preference:'balanced',platform:'需要具体型号具备视觉能力，并通过产品发送原图。GPT、Claude、Gemini 都有相应型号；DeepSeek Flash 也有官方视觉接口。',need:'视觉理解、OCR、读坐标、识别表格不是同一种能力。手写公式、小字、比例尺和复杂图形要回看原图。',siteStatus:'原图与扫描件 OCR 尚未接入',site:'本站当前不发送原图给模型，也没有扫描件 OCR。请先准备已核对的 OCR 文字或文字说明，再用下方型号分析。',direct:false,action:'用于 OCR 后的文字分析'},
 {id:'video',label:'视频 / 课堂录像 / 镜头',preference:'balanced',platform:'直接理解视频可研究 Gemini 官方原生视频 API 的支持型号。其他产品的抽帧、转写方案也可分析视频，但需要额外接入流程。',need:'画面、声音、时间戳和采样率都影响结论。能处理文字稿不代表能看到画面；视频理解也不等于视频生成或剪辑。',siteStatus:'原生视频上传与理解尚未接入',site:'本站暂不读取 MP4、视频链接或音轨。请先提供带时间戳的转写稿、字幕或镜头文字笔记；下方推荐只用于这些文字材料。',direct:false,action:'用于视频转写稿的文字分析'},
 {id:'audio',label:'音频 / 采访 / 课堂录音',preference:'balanced',platform:'先选择语音转录流程，再用文本模型整理和分析。Gemini 原生多模态、OpenAI 转录工具等是可研究的前处理方案，需核对具体型号和接口。',need:'先核对转录质量、说话人和时间戳，再做摘要或访谈编码。聊天模型不自动具备转录输入能力。',siteStatus:'音频转录尚未接入',site:'本站暂不读取 MP3、WAV 或录音。请先转换为已核对的文字稿，再上传 TXT / Markdown 或粘贴重点片段。',direct:false,action:'用于录音转写稿的文字分析'},
];
export const MODEL_FAMILY_GUIDE=[
 {name:'GPT mini / nano',fit:'mini 可作课程阅读、提纲和问答起点；nano 更偏轻量整理。',choose:'先试实际账号可用的日常型号；复杂论证再比较更强系列。',dependency:'当前本站使用文字输入。文件、视觉或计算能力还取决于具体型号和已接入工具。'},
 {name:'GPT 旗舰 / 推理系列',fit:'复杂多步分析、数学与代码推理、跨资料核对的候选。',choose:'通常比轻量型号更慢或更贵；并不保证每个专业任务都更好。',dependency:'数值计算需计算器或执行工具；本站目前不执行代码或重算 Excel。'},
 {name:'Claude Haiku / Sonnet / Opus',fit:'Haiku 偏轻量；Sonnet 可作长文组织与代码讨论的起点；Opus 可用于复杂分析候选。',choose:'按资料长度、分析深度、速度和费用选择，不把系列名称当专业准确性的保证。',dependency:'官方 API 支持 PDF / 图片时需相应输入格式；本站目前仅发送提取后的文字。'},
 {name:'Gemini Flash / Pro',fit:'Flash 可作日常多模态与文字任务起点；Pro 可作较复杂分析候选。',choose:'涉及原生音视频时查看具体型号的官方能力表和接口，不只看 Flash / Pro 名称。',dependency:'本站的 Gemini 连接目前走文字请求；原生视频、音频与视觉流程尚未接入。'},
 {name:'DeepSeek Flash / Pro 等文本系列',fit:'课程概念、文字分析、代码与数学讨论的候选。',choose:'按账号返回的当前型号和实际任务试用；不硬填旧别名，不把“推理”理解为一定算对。',dependency:'Flash 的官方视觉能力需要图片输入流程；本站当前仍按文字分析使用。'},
 {name:'嵌入 / 转录 / 绘图专用型号',fit:'嵌入用于检索；转录用于语音变文字；绘图用于图像生成。',choose:'它们不是可以直接替代课程问答模型的同一类选项。',dependency:'需要各自的工具与文件处理流程，因此不会出现在本站日常文本推荐中。'},
];
export const STUDY_GUIDE_SOURCES=[
 {label:'OpenAI：模型选择',url:'https://developers.openai.com/api/docs/guides/model-selection'},
 {label:'OpenAI：文件输入',url:'https://developers.openai.com/api/docs/guides/file-inputs'},
 {label:'OpenAI：计算执行工具',url:'https://developers.openai.com/api/docs/guides/tools-code-interpreter'},
 {label:'Claude：PDF 支持',url:'https://platform.claude.com/docs/en/build-with-claude/pdf-support'},
 {label:'Claude：图片输入',url:'https://platform.claude.com/docs/en/build-with-claude/vision'},
 {label:'Gemini：视频理解',url:'https://ai.google.dev/gemini-api/docs/video-understanding'},
 {label:'Gemini：文档理解',url:'https://ai.google.dev/gemini-api/docs/document-processing'},
 {label:'DeepSeek：视觉能力',url:'https://api-docs.deepseek.com/guides/vision/'},
];
export function studyAdvice(models,majorId='general',materialId='documents'){
 const major=STUDY_MAJORS.find(m=>m.id===majorId)||STUDY_MAJORS[0],material=STUDY_MATERIALS.find(m=>m.id===materialId)||STUDY_MATERIALS[0];
 const choices=recommendModels(models),preferred=choices[material.preference],preference=preferred?material.preference:'balanced',model=preferred||choices.balanced||'';
 return {major,material,modelHint:DISCIPLINE_MODEL_HINTS[major.id],preference,model,fallback:!preferred,reason:material.preference==='quality'?'复杂代码与推导可考虑更强推理；这只是任务匹配建议。':'先用日常文本模型处理文字内容，再按实际结果决定是否升级。'};
}
