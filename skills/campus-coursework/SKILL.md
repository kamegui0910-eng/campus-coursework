---
name: campus-coursework
description: >
  Manage an authorized student's course workflow in Canvas or another school LMS:
  verify login, read each official syllabus, maintain separate course libraries,
  bind each assignment to relevant source versions and chapters, delegate reading
  and writing, schedule recurring work when requested, route every draft through
  final audit and configured detector gates, and verify authorized submissions.
  Use for ongoing course management or packaging a syllabus-to-submission
  workflow; also triggered by 学校系统、课程大纲、作业分工、定时作业、自动交作业.
  A single offline essay edit does not need this course-management workflow.
---

# 课程与作业总控

将使用者授权管理的课程推进到可核验的成果：课程基线、资料覆盖记录、作业台账、责任分工、实际创建的定时任务、可审阅成稿，以及获准提交后的正式回执。按真实课程需要推进，不固定为某个学校、某套教材或某个模型。

## 首次使用与恢复执行

先读当前项目的 AGENTS.md、既有课程手册与执行规则，复用有效配置。没有配置时，按 [首次配置与台账](references/onboarding-state.md) 在使用者工作目录建立私人 `coursework/` 记录；配置模板在 [assets/profile.example.json](assets/profile.example.json)。运行记录不写进 skill 安装目录。

接收者换设备、换宿主或使用自己的模型/API时，先读 [自有模型与运行环境](references/portable-runtime.md)，按 [runtime.example.json](assets/runtime.example.json) 记录非敏感运行配置并核验能力。可将 [START_FOR_AI.txt](START_FOR_AI.txt) 交给能读取本文件夹的智能体开始接入；模型不固定为原作者使用的供应商。普通文本API没有自动获得浏览器、文件、调度或工具执行能力，不凭一个URL就宣称完整流程接通。

- 从既有上下文和已连接学校系统查找入口与课程，缺少关键信息才问使用者；合并询问学校入口、当前课程范围和时区，不重复索取已知信息。
- 登录、持续定时工作、向其他聊天发消息、提交，是不同动作。依据本轮要求和可追溯的既有授权执行；不把“安装/分享 skill”当作运行、排程或提交指令。
- skill 传递流程和规则；模型、额度、连接器、浏览器登录及调度器由调用环境提供。缺能力时完成可用部分，并准确报告未执行项。不能只凭写了提示词就声称创建了 worker 或定时任务。
- 每次运行确认当前日期、课程身份、学期、归档状态和最新有效资料；历史快照不代表当前网页。归档/排除的课程保持停用。

按当前阶段读必要参考，不一次加载全部：

| 正在做的工作 | 先读 |
|---|---|
| 首次接入、恢复、记录授权与状态 | [onboarding-state.md](references/onboarding-state.md) |
| 分享给朋友、换模型/API或运行设备 | [portable-runtime.md](references/portable-runtime.md) |
| 首次学校登录、演示登录步骤、复用或清除会话 | [school-login.md](references/school-login.md) |
| 登录、找大纲、读教材或核对原始要求 | [lms-and-sources.md](references/lms-and-sources.md) |
| 建课程资料库、同步版本、按作业取章节或恢复下载 | [course-library.md](references/course-library.md) |
| 派发任务、创建/更新定时任务 | [delegation-and-schedules.md](references/delegation-and-schedules.md) |
| 起草、修订、排版、审阅或提交 | [writing-and-submission.md](references/writing-and-submission.md) |
| 确定写作阶段需要读取的skill并记录实际应用 | [skill-routing.md](references/skill-routing.md) |
| 最终审计、检测报告、退回修改与放行 | [final-audit.md](references/final-audit.md)；站点与分数解释见 [detector-standards.md](references/detector-standards.md) |

## 1. 登录并发现课程

优先用足以完成任务的已连接工具；需要网页或 Windows 时，读取当前可用 Computer Use 技能及其操作/确认规则，再操作真实页面。使用者已有登录偏好时沿用；其他学校按实际提供的学生/SSO入口，不套用作者学校的邮箱或登录顺序。

首次学校登录或需要恢复时读 [学校登录设置](references/school-login.md)：在本人设备填写入口和账号，可用加密凭据库时按本人选择记住密码；本人演示一次正规登录，保存去除输入值的步骤并复用每个账号自己的持久会话。先核验返回后的学校、本人身份和课程页面。密码不进聊天、提示词或分享包；验证码、CAPTCHA、手机验证或本人同意协议由本人在正规页面完成。跨入教材、图书馆等系统后单独验证访问。

枚举可见的当前课程及各自 term，区分 active、future、concluded、archived。只推进授权范围内的 active 课程。大纲通常按课程提供；每节课的安排从大纲周表和实际 Modules/单元资料读取，不虚构每节课独立的 syllabus。

## 2. 每门新课先读完整官方 syllabus

先定位、保存并完整读取官方大纲，再建立该课学习计划、作业分工和定时执行流程。官方网页大纲也可保存完整正文与来源。读取覆盖所有页面，表格或 OCR 不可靠时核对渲染页面。

提取课程身份和学期、教师与联系方式、学习目标、教材标题/作者/版次/年份/ISBN、逐周安排、考核及分值/权重、截止与关闭时间、出勤、迟交、学术诚信、AI辅助与披露要求。未写的记 unknown，并保留原文位置；分值/权重不自洽时记录冲突，不替教师凑数。

没有拿到完整大纲时，继续定位或记录访问缺口，可核对已发布作业并提示真实截止；不宣称课程基线或完整流程已建好。

然后核对 Modules、Assignments、Discussions、Announcements、Calendar 和相应教材平台的实际要求与已有提交。保存每份资料的来源、读取时间和版本。以大纲作课程基线，具体作业 rubric 管具体作业，明确的后续教师更新按其适用范围更新；冲突保留两边证据。

按 [课程资料库](references/course-library.md) 为每门课独立保存大纲、rubric、教材/授权阅读笔记、周模块和作业材料，并维护来源、版本与实际读取覆盖。可采集全部已发布材料，或随进度补充，两者都在开始作业前同步相关更新。下载/上传失败要给出有证据的通俗原因、具体手动恢复入口与保存目标；手动补入后核验正文和课程归属才算恢复。

## 3. 建台账，派发最小必要任务

每个已发布任务记录真实题干、rubric、附件、指定阅读、字数/页数/格式、截止与关闭时间、已有提交、来源、缺口和负责人。主帖与每条要求的回复分别跟踪；外部平台保留自己的作业 ID，与 LMS 条目建立映射。

同名重复作业按官方任务 ID/component 区分，逐项绑定本课程的资料版本、周/模块和确切 chapter/section/page。只向 worker 提供本项相关资料与适用政策，不因标题相同沿用上周章节；资料修订后标记受影响的资料包、草稿和审计需复核，不静默覆盖或自动重交。

按课程需要设置总控、教材阅读、Discussion、Weekly Summary、Writing/Project、Assessment Preparation、最终审计和提交执行职责；可合并简单任务，不为未布置的类型新建工作。所有待提交文本统一交回指定 `final-audit` 职责，写作 worker 不自行放行。总控维护课程基线与任务索引；worker 各写自己的状态和成果；教材覆盖清单有唯一写入者；最终审计记录由审计者维护；正式提交由单一执行者负责。

派发前读取已存在的任务与成果。交接真实题干、已读来源、缺口、截止、授权范围和输出位置；可用 [worker-prompt.md](assets/worker-prompt.md) 生成具体提示词。用真实工具创建任务并保存返回的 ID。没有跨聊天创建能力时，在当前任务内委派或顺序执行并保留分工，不声称已创建独立聊天。

## 4. 请求持续执行时设置定时任务

先读 [delegation-and-schedules.md](references/delegation-and-schedules.md)。先检查既有排程，按真实截止、学期和使用者时区倒排阅读、草稿、质量检查和提交核验，尽量合并同一职责的循环任务。迟交政策不等于自动延长提交窗口。

用当前环境的实际调度工具创建或更新，验证目标任务、提示词、执行环境、时区、状态及下次运行时间，保存工具返回的 ID。不复制作者原来的时刻、课程 ID、聊天 ID 或 automation ID。

每次定时运行重新核对真实要求、阅读覆盖与既有提交；先处理临近截止且可推进的工作。不以“阅读任务先启动了”代替 Ready 检查。工具未提供时只交付待启用计划和提示词，不宣称自动化已生效。

## 5. 阅读、写作与质量检查

先查现有合法本地教材、阅读 manifest 和笔记。书名已知、登录成功、打开目录/HTML 外壳，都不表示读过正文。只复用已覆盖部分，缺失章节、图表、精确引用和页码到授权阅读器核验，并更新覆盖记录。

读 [writing-and-submission.md](references/writing-and-submission.md) 与 [skill-routing.md](references/skill-routing.md)，按真实题干和具体 rubric 写作。起草/修订前实际读取已安装的相应语言 Anti-Defensive Writing 技能；网页和文件阶段按路由读取对应 Computer Use、Documents/PDF 指导，并在本稿质量记录中保存实际skill应用情况。事实、必要局限、矛盾证据、具体学校要求和必要反思优先。无相关技能时明确记录使用本包写作准则或真实等效工具，不虚报已调用外部skill；必要工具缺失仍按阶段门槛处理。

不得虚构个人经历、课堂参与、讲授、视频、实验结果或引用。缺课堂资料或个人信息时先完成可核验部分并具体列缺口。测验/考试先核对允许的帮助与尝试规则，不自动消耗尝试、替使用者确认独立完成声明或把复习授权当作答题/提交授权。

格式按具体要求与私人配置。可修改的起始预设为 Times New Roman 12pt、全文双倍行距、APA7；不把它称为每所学校的要求。Word/PDF 使用当前可用文档工具和技能，真实渲染并逐页检查；工具不足时报告未验证，不标 ReadyToSubmit。

## 6. 每份成果统一回到最终审计

写作完成后按 [final-audit.md](references/final-audit.md) 交接完整文件/文本、版本哈希、题干与 rubric、来源和质量记录。审计者核查内容、事实、引用、学生观点、学校辅助规则和实际渲染，再通过支持的专用浏览器会话或 Computer Use 操作使用者指定的检测站，保存真实报告。此为智能体工作流，不代表安装 skill 就已经创建浏览器进程或登录检测服务。

本包作者的默认 SOP 按真实符合条件的正文词数选择检测站：**少于300词仅用Copyleaks；达到300词则Copyleaks与Turnitin两站都用，所有本稿必需站均须严格低于20%**，20%不通过。审计保存词数、计数方法/范围、选择理由与必需provider集合；词数不明不能自行降为单站。该阈值是使用者指定的附加条件，不是学校统一政策。Copyleaks自身长度/语言要求仍须满足，不能用生成模型的自评分代替真实检测。非短文本的Turnitin缺权限、错误或无提交前报告仍不通过，不能先正式交作业以换取检测报告。Turnitin官方 `*%` 区间只按已核验语义记录，不编造具体数字。各接收者独立配置账号/权限及文本外发授权。

任一站未达条件，审计者把真实标记、上下文和有证据的修改意见退回写作 worker；按本地和已核验官方解释改善表达、分析及证据，保留事实、引用与必要披露，再重新检查完整版本。默认最多三轮修改，仍不满足则保留待审并报告，不无限重试、不忽略某站或擅自降低门槛。

放行记录绑定最终文件 SHA-256、实际受检文本 SHA-256、题干版本与检测策略。任何后续内容变化使原放行失效；仅审计通过且其他提交条件满足时可标 ReadyToSubmit。更新本分享包不等于启动现有学校任务、改变既有课程授权或解除旧条件。

## 7. 按有效授权提交并保存证据

仅有本人对目标课程/作业和动作的有效授权，且课程允许的帮助、内容完整性与质量检查满足要求时，才进入正式提交。持续授权可涵盖明确课程、学期与作业类型，无需每次重复询问。未有授权时先完成可审阅成果，再提出具体提交请求；不以临近截止补出授权。

提交前重读授权、最终审计放行与最新要求，核对学生、课程、作业、当前文件和受检文本哈希、窗口及已有提交。放行版本不匹配、检测未完成或报告来源不明时停止正式动作。正式动作前持久记录本次提交意图、审计引用和文件哈希/帖子内容标识，避免多 worker 同时发送。上传、派发、点击、提交页预览都不等于成功。

提交后核验服务器回显的正式状态、时间、目标与实际附件/帖子，保存回执或截图并关联本地版本；如能重新打开/下载附件则核对其内容。Turnitin 等状态另记，不能把 Submitted 写成查重通过或 Graded。

若发送后超时或结果不明，记 SubmissionUnknown，先查平台个人提交/帖子记录，再决定下一步；无法排除已提交时停止重发。已有有效提交不自动改写、撤回或重交；需相应授权和核验。

## 8. 汇总与收尾

用简洁中文或使用者选定语言报告具体进展、结果链接、缺口和确需本人操作的步骤。无变化的循环运行尽量安静，相同阻碍不反复刷屏。

课程结束后完成证据归档，停止推进新工作，并用调度工具停用仅属于该课的循环任务；共享总控只移除该课。停用未成功时明确报告并停止内容动作，不声称已关闭。保留历史文件、来源与正式提交证据。

分享时只分发本 skill、空白模板和说明；账号、会话、真实课程资料、教材、同学内容、成绩、私人配置和授权都不随包传递。模型能力与实际执行结果仍依赖调用者环境。
