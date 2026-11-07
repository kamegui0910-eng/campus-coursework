# Campus Coursework

把课程大纲、资料库、阅读覆盖、作业分工和最终审阅串在一起的可移植智能体 skill。

**English:** A portable agent skill for syllabus-first course libraries, chapter-aware assignment workflows, recurring coordination, and verifiable review. Bring your own model, accounts, and tools.

入口：[skills/campus-coursework/SKILL.md](skills/campus-coursework/SKILL.md) · [首次接入](skills/campus-coursework/START_FOR_AI.txt) · [更新记录](CHANGELOG.md)

## 可以做什么

- 从本人有权访问的 Canvas 或其他学校系统定位、保存并完整读取官方 syllabus。
- 每门课单独建资料库，关联 rubric、教材或授权阅读笔记、课堂材料、附件和教师更新。
- 用真实作业 ID 和 component 区分同名任务，绑定确切资料版本与 chapter、section、page。
- 按进度增量采集，或先收集全部已发布资料；开始作业前检查相关材料是否更新。
- 按需分配阅读、研究、写作、最终审计和提交职责，并在宿主支持时建立用户要求的排程。
- 下载失败时记录实际现象，用通俗中文说明原因，并提供手动下载、导入和验证步骤。
- 让成稿进入最终审计；符合学校规则及用户有效授权后提交，并保存正式回执。

本仓库提供 skill 指令、参考、空白模板和可选的本地资料索引脚本。模型推理、浏览器、文件执行、学校登录和调度能力由接收者的智能体宿主提供；这里没有托管 API、模型权重或已经登录的共享账号。

## 快速开始

### 1. 取得完整 skill

下载或克隆本仓库，把整个 `skills/campus-coursework/` 文件夹复制到你的宿主当前支持的 skills 目录。保持 `SKILL.md`、`references/`、`assets/` 和 `scripts/` 的相对位置。

使用支持 GitHub 来源的 Codex skill 安装器时，可让 `$skill-installer` 从本仓库安装 `skills/campus-coursework` 路径。

可直接把以下指令交给 Codex，安装本仓库的 skill：

```text
$skill-installer 从 https://github.com/kamegui0910-eng/campus-coursework 安装 skills/campus-coursework
```

安装方式与宿主支持范围见 [官方 skill 说明](https://learn.chatgpt.com/docs/build-skills)。

宿主尚不支持自动发现 skill 时，也可以允许智能体读取本地文件夹，再把 [START_FOR_AI.txt](skills/campus-coursework/START_FOR_AI.txt) 交给它。

### 2. 连接你自己的模型和工具

在宿主已有设置里选择自己的模型、API 和凭据管理方式，再按 [运行环境接入说明](skills/campus-coursework/references/portable-runtime.md) 做实际能力检查。

| 工作 | 需要的宿主能力 |
|---|---|
| 资料库与离线准备 | 文件读取、持久保存、相对链接访问 |
| 学校与教材访问 | 适用的连接器或受支持浏览器，以及本人有效登录 |
| Word/PDF 成稿检查 | 相应文档处理与真实渲染工具 |
| 持续执行 | 实际调度器、可运行环境及正确时区 |
| 第三方文本检测 | 本人账号、提交前检测入口及文本外发授权 |
| 正式提交 | 学校允许的帮助、完整审计、有效授权和服务器回执核验 |

只有普通文字聊天 API 时，可以处理提供给它的材料，但需要另有工具执行层才能登录网页、保存文件、定时运行或提交。

### 3. 开始一次课程接入

在支持 skills 的宿主中使用：

```text
使用 $campus-coursework。
先核验我的学校入口、本学期课程和当前运行环境。
完整保存并读取每门课的官方 syllabus，再建立各课资料库。
按真实作业要求关联 rubric、指定章节和课堂材料。
先完成资料整理与可审阅成果；缺少登录时让我在正规页面处理。
```

在接入时提供自己的学校入口和课程范围。运行配置保存在选定工作目录的私人 `coursework/` 下，初始模板为 `draft_only`。

安装或读取本仓库本身不创建排程、不上传学校文本，也不授予发布、提交、重交或联系他人的权限。

## 每门课怎样取材

课程按学校、官方 course ID、学期和 section 隔离。资料保存稳定来源、内容哈希、版本、保存状态、实际读取范围与缺口。

例如，两项都叫 Weekly Summary，但分别指定 Ch4 和 Ch5：它们以真实任务 ID 区分，各自绑定对应章节、当周课堂材料和适用 rubric。worker 只接收当前作业相关的文件和定位，不加载整门课的全部正文。

新版本保留旧文件，并让相关资料包、草稿和审计进入复核。已有效提交的内容不会因资料更新自动重交。

文件已保存不等于已读，教材目录不等于正文；部分章节笔记也不表示整本教材已下载。只允许在线阅读时，保留合法笔记与定位，缺失范围继续列为缺口。

详见 [课程资料库与作业取材](skills/campus-coursework/references/course-library.md)。

## 下载失败怎样恢复

失败记录区分学校访问、下载、本地保存和云端上传。例如：

- 返回登录页：说明尚未取得正文，提供正式登录及原课程入口。
- 页面明确要求手机验证：由本人在正规界面确认后继续。
- 文件尚未发布：标未发布，后续同步，不补造内容。
- 仅观察到超时：保留现象，不猜成账号或验证问题。
- 本地已存、云端上传失败：保留原件，指引从目标任务的正式附件入口上传。

手动补文件后，重新核验课程、版本、正文和所需范围。错误课程文件、登录 HTML、空文件或错误章节不能解除原缺口。

## 最终审计与提交

审计检查题干与 rubric、真实来源、引用、学生事实、学校辅助规则、篇幅、渲染和当前版本。

如需使用第三方检测，必须配置自己的账号、入口和文本处理授权，并取得真实报告。本包提供 Copyleaks/Turnitin 的预设选站与阈值 SOP；这些是用户配置的额外条件，学校政策优先。检测分数不能证明原创性、作者身份或学校许可，模型自评分也不能替代报告。

审计放行绑定实际稿件、受检文本和资料依赖版本。材料、要求或正文改变后重新核对；未满足当前全部条件时保留待审。正式提交由单一执行者完成，上传或点击按钮不算成功，需核验服务器正式状态和目标内容。

详见 [最终审计](skills/campus-coursework/references/final-audit.md) 与 [写作和提交](skills/campus-coursework/references/writing-and-submission.md)。

## 可选的本地索引脚本

脚本使用 Node.js 标准库，管理每课资料版本、精确依赖、故障和单项资料包：

```text
node skills/campus-coursework/scripts/course-library.mjs --root <私人资料目录> --request <请求.json>
node --test skills/campus-coursework/scripts/course-library.test.mjs
```

请求格式见 [辅助脚本说明](skills/campus-coursework/references/course-library-helper.md)。脚本不会自行登录学校、下载教材、核验正文含义或提交作业。

## 验证与数据范围

v1.5.0 的本地索引脚本已通过 11 项行为测试及独立复测，覆盖课程隔离、章节匹配、版本失效和人工恢复。学校端的完整联网测试仍受登录障碍阻塞；本项目没有据此宣称下载、检测、提交的全流程已跑通。接收者应在自己的环境逐阶段核验。

仓库只发布通用流程、空白模板和脚本。个人课程库、教材原文、作业、成绩、同学内容、账号、会话、密钥、私人配置及授权记录应保留在个人工作目录。

反馈问题时请描述宿主能力、失败阶段、可复现步骤和去除敏感信息的错误现象；不要上传学校凭据或私人课程文件。
