# Campus Coursework

**电脑端 Codex 接续云端开发：**先读 [AGENTS.md](AGENTS.md)、[START_FOR_CODEX.txt](START_FOR_CODEX.txt) 和 [最新交接说明](cloud/HANDOFF.md)，使用 [同步 Skill](cloud/skills/cloud-local-sync/SKILL.md)。项目状态见 [cloud/STATE.json](cloud/STATE.json)。

## 当前范围

**保留（P0/P1）**

- 云端：`cloud/` 的 Next.js 应用，课程资料存在 Cloudflare D1 / R2。整理课程、上传资料、绑定作业、起草和检查。
- 本地：桌面程序和 [课程 skill](skills/campus-coursework/SKILL.md) 的资料库、取材、起草和内容检查。
- 只读 Canvas 浏览器扩展：本人在学校官网登录后，导出自己能看到的课程资料。不提交、不答题、不收集密码。

**暂停（P2）**

学校登录自动化和作业自动提交停止迭代。相关历史代码和说明留在仓库里，只作参考，默认不运行。

现在的用法是：在学校官方页面人工登录、人工提交；内容检查使用咩咩学校分身。桌面开关 `desktop/scope.cjs` 里 `schoolLoginAutomation` 和 `officialAutoSubmit` 均为 `false`。技能模板的提交模式保持 `draft_only`。

## 中文

**你提供：**自己的 AI 模型/API、课程大纲（Syllabus）、作业要求和课程资料。

**AI 帮你做：**按课程整理资料、安排任务、找到对应章节，帮助阅读、起草和检查作业。缺少资料或下载失败时，会说明原因。登录学校和提交作业由你自己在学校页面完成。

**怎么用：**

[手机云端入口](https://campus-coursework-mobile-kamegui.kamegui0910.chatgpt.site)（公开访客可用，无需强制邮箱或 ChatGPT 登录，电脑关机也能用）。[云端源码](cloud/README.md)可另行部署；资料与本机版分别保存。

Windows 用户可从 [Releases](https://github.com/kamegui0910-eng/campus-coursework/releases) 下载完整便携包，解压后打开 EXE，配置自己的模型并导入课程资料。安装包里的学校自动登录是已暂停的历史功能，请改在学校官网登录。

1. 在支持 skill 的 AI 工具中安装本项目。Codex 用户可复制下面的指令。
2. 配置自己的模型，添加课程大纲和资料。
3. 告诉 AI 先做什么，例如：“使用 campus-coursework，先读这门课的大纲，整理资料，再准备本周作业。不要自动登录或提交。”

```text
$skill-installer Install skills/campus-coursework from https://github.com/kamegui0910-eng/campus-coursework
```

也可单独使用 skill 版。它继续负责资料、起草和检查。自动登录、定时交作业和正式提交已暂停。

## English

**You provide:** Your own AI model/API, syllabus, assignment instructions, and course materials.

**AI helps you:** Organize each course, plan tasks, find the right chapters, and help with reading, drafting, and reviewing assignments. It tells you when materials are missing or downloads fail. You sign in and submit on the school site yourself.

**How to use:**

[Mobile cloud app](https://campus-coursework-mobile-kamegui.kamegui0910.chatgpt.site) (public guest access without mandatory email or ChatGPT sign-in; works while the computer is off). [Cloud source](cloud/README.md) is available for your own deployment. Cloud and desktop data are stored separately.

On Windows, download the complete portable ZIP from [Releases](https://github.com/kamegui0910-eng/campus-coursework/releases), extract it, open the EXE, connect your model, and import course materials. Automated school login in that package is paused historical behavior; sign in on the official school site.

1. Install the skill in an AI tool that supports skills. In Codex, paste the install command above.
2. Connect your model and add your syllabus and materials.
3. Ask: “Use campus-coursework. Read my syllabus, organize my course materials, and help me prepare this week’s assignment. Do not log in or submit for me.”

You can also use the skill on its own for materials, drafting, and review. Automated school login and automatic submission are paused.

[Skill](skills/campus-coursework/SKILL.md) · [Setup guide / 接入说明](skills/campus-coursework/references/portable-runtime.md) · [Scope / 当前范围](AGENTS.md)

## Browser import test release / 浏览器导入测试版

没有学校 API Token 也可在 Chrome/Edge 的学校官网登录 Canvas，用只读浏览器助手选择课程导出，再在云端“添加课程”预览导入。助手不代替你登录，也不提交作业。

[安装和测试步骤](cloud/docs/BROWSER_IMPORT.md) · [浏览器助手源码](cloud/browser-extension/) · [下载测试扩展 ZIP](cloud/public/downloads/coursework-browser-helper.zip)。

采集与导入不调用模型、不收集密码或导出会话。手机可使用已导入资料；手机直接登录学校的云端浏览器未配置，也不在当前范围内。这个更新是 cloud/ 版本，desktop/ 安装包没有重建。网站已公开供访客测试，数据按各自空间隔离；测试者也可自行运行/部署源码。真实学校兼容性仍需试用。
