# Coursework — 电脑端 Codex 接续入口

这份文件用于把云端开发成果接回电脑端开发会话。GitHub `main` 是共享交付入口；聊天历史不会随 Git 自动同步。先读本文件和 `sync/latest.json`，旧清单里“GitHub 403”“尚未发布”“仅所有者可访问”是历史状态，已被本文件取代。

## 当前已交付

- GitHub：`https://github.com/kamegui0910-eng/campus-coursework`，分支 `main`。
- 至少包含主分支提交 `08810c5743689f9727211b80e2e93124932f03a3`（PR #6）；该提交之后的交接文档提交也需要接收。不要把这个最低基线当作永远最新 HEAD。
- 当前线上 Coursework：Sites 第 12 版，源码 `f99e6cf055c8a97950eb4b43c02df319e055d96e`。
- 网站：https://campus-coursework-mobile-kamegui.kamegui0910.chatgpt.site ，公开访客可使用；无需强制邮箱或 ChatGPT 登录。
- 云端源码在 GitHub 的 **cloud/**，Windows 桌面程序是另一套实现。原有桌面代码与现有本地修改应保留。
- 本次交接只更新源码/说明；生产运行版仍是已发布的 v12。

## 先安全接收代码

1. 读取现有仓库的 AGENTS.md（若有），执行 `git status --short`，核对远端 URL、当前分支与本地修改。
2. 使用 `cloud/skills/cloud-local-sync/SKILL.md`。根目录也有同步 Skill；以 cloud/ 内最新副本为准。
3. `git fetch origin main`，核验上面的最低基线是 `origin/main` 的祖先，记录实际远端 SHA。
4. 工作区有修改或历史分叉时，在新的分支/worktree 接收 `origin/main` 并比较，不自动 stash，不执行 reset --hard、clean 或覆盖解压。需要快进时也先确认本地工作区干净。
5. 按 cloud/package-lock.json 安装/验证云端项目；保留本机 .env、.dev.vars、私有资料、数据库和学校登录会话。不要把云端 cloud/ 直接替换 Windows 桌面实现。
6. 如需迁移桌面功能，先对照差异单独实施、重建安装包并验收。拉取网页源码不等于 EXE 已更新。

如果现有机器没有仓库，克隆到一个新的独立目录即可，不覆盖旧项目。用户已经授权接收、集成及修复常规冲突，先完成可独立推进的部分；只有真正缺少授权或目标信息时才询问。

## 今天完成了什么

- 学校课程：Canvas URL 识别、多课程发现/预览/导入、作业类型与预计权重、成绩试算；浏览器助手复用学生自己在官网完成的登录，不导出 Cookie、不收集学校密码。手机可使用导入后的课程，但不能安装电脑 Chrome/Edge 扩展。
- 云端入口：独立访客空间、按 owner 隔离的记录和加密凭据、初次进入的四步配置与进度保存。
- AI 连接：OpenAI、Claude、Gemini、DeepSeek、OpenRouter、自定义兼容接口；OpenRouter 官方 PKCE 授权可免复制密钥，其他平台手动接入；模型列表读取与同源密钥保护。
- 问题修复：连接按钮旁的加载/错误/成功反馈、客户端/供应商超时、密钥首尾空白处理；用户已反馈 API 连接正常。
- 教程：真实控制台截图来自公开教程，附来源、缩放与滚动查看；来源记录在 public/guides/screenshots/ATTRIBUTION.md。不要恢复已被用户否定的自绘流程图。
- 模型选择：从账号实际返回的型号中推荐日常/轻量/较强文本型号，保存时服务端重新核验；保存后固定使用，不隐式升级型号或跨平台重试。工作台与成果展示实际使用型号。
- 模型扫盲：12 类专业、6 类材料，说明候选系列、典型作业、核对流程、官方能力与当前产品支持的差别。专业/材料浏览是本地页面状态，不触发模型调用。
- 设计偏好：原创、清楚、避免模板堆叠感；用户给定 #FF62C0 / #F5FF7A / #39F5D6 / #4051E8 / #37343F。最新连接错误要靠近操作按钮，帮助不要淹没主要操作。

## 当前能力边界与下一项

目前主要是文字分析：PDF/DOCX 等先提取正文。尚未接入完整 Excel/CSV 工作簿解析和公式执行、原图/扫描件 OCR、原生音视频、代码运行、真实学校端到端兼容性验收、Windows 桌面功能对齐、跨设备私有资料迁移。模型本身支持某种媒体，不代表本站已接入。

验证过应用行为、类型、构建与公开资源；尚未完成真实浏览器视觉交互、真实 OpenRouter 账号完整授权回跳及付费模型质量评测。应用测试与浏览器扩展 collector 测试分开运行；合并运行存在 service 超时，见 docs/DECISIONS.md。

下一步先在电脑端启动项目，实际检查手机/桌面配置流程、截图放大、推荐选择和错误反馈；用虚构课程资料做端到端检查。有效账号和付费推理另按已有授权/预算处理，不要把 mock 通过当真实效果验收。

## 验证入口

在 cloud/ 下：

```bash
npm ci
node --test lib/campus-request.test.mjs lib/guides/*.test.mjs lib/guest-session.test.mjs lib/coursework/*.test.mjs
node --test browser-extension/collector.test.mjs
node node_modules/typescript/lib/tsc.js --noEmit
npm run build
```

Windows 宿主应使用支持 glob 的终端或展开测试文件列表。运行前阅读 package.json 和当前宿主的环境说明。Sites 项目使用 Cloudflare D1/R2 等绑定，不能把缺少绑定的本地空页面当作云端已连通。

## 月喵独立接续记录

月喵源码不是 Coursework 仓库的 cloud/。截至本次核对，它的 Sites 项目为 `appgprj_6ae3bcd3c1dc8191925540dd3ffe0aa9`，已上线第 13 版： https://moonmeow-shirley.kamegui0910.chatgpt.site 。该版本的源码提交为 `c7d56c314432e6b5d7ce97e32f5f16acbd6d7ead`，包含今日情境、两种对话语气、临时情境过期、五体系共用情境和原有事实记忆确认流程。客户档案仍保存在各浏览器 localStorage，不是云端客户共享。

本次未找到可确认的月喵 GitHub 仓库，因此没有把月喵源码混入 Coursework。需要月喵时，先读 moonmeow-development Skill；通过已授权 Sites 源仓库接收准确版本，或使用对应独立 Git bundle。旧 Drive START_HERE 文件不是最新完整源码包，不要只凭文件名认定已经同步。

已在本云端工作区保存月喵独立接续包：`/workspace/control/moonmeow-handoff-2026-11-08.zip`，其中 source.bundle 对应上述提交，SHA-256 为 `66489b850aae5c39fa65922e765825278a2b6753064428424791148979b035f4`。这个云端本地路径不是电脑端的路径；接收文件或访问 Sites 之前不能声称电脑已得到月喵源码。接收后先保留本地修改、核对目录布局，再集成。

## 接续后请回报

实际远端提交、本地接收分支/目录、保留了哪些修改、测试/构建结果、源码是否更新、EXE 是否重建、是否改动线上部署，以及剩余具体问题。不要声称更新了模型权重或已将完整聊天注入其他会话。
