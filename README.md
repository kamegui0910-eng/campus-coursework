# Campus Coursework

**电脑端 Codex 接续云端开发：**先读 [START_FOR_CODEX.txt](START_FOR_CODEX.txt) 和 [最新交接说明](cloud/HANDOFF.md)，使用 [同步 Skill](cloud/skills/cloud-local-sync/SKILL.md)。

## 中文

**你提供：**自己的 AI 模型/API、课程大纲（Syllabus）、作业要求和课程资料。

**AI 帮你做：**按课程整理资料、安排任务、找到对应章节，帮助阅读、起草和检查作业。缺少资料或下载失败时，会说明原因。

**学校登录：**首次在本机配置账号并演示登录，以后复用有效会话；密码可选择加密保存，学校要求的手机验证仍由本人完成。

**怎么用：**

[手机云端入口](https://campus-coursework-mobile-kamegui.kamegui0910.chatgpt.site)（公开访客可用，无需强制邮箱或 ChatGPT 登录，电脑关机也能用）。[云端源码](cloud/README.md)可另行部署；资料与本机版分别保存。

Windows 用户可从 [Releases](https://github.com/kamegui0910-eng/campus-coursework/releases) 下载完整便携包，解压后打开 EXE，配置自己的模型并添加学校账号。

1. 在支持 skill 的 AI 工具中安装本项目。Codex 用户可复制下面的指令。
2. 配置自己的模型，添加课程大纲和资料。
3. 告诉 AI 先做什么，例如：“使用 campus-coursework，先读这门课的大纲，整理资料，再准备本周作业。”

```text
$skill-installer Install skills/campus-coursework from https://github.com/kamegui0910-eng/campus-coursework
```

也可单独使用 skill 版。网页登录、定时运行和提交，需要你的 AI 工具有相应能力，并取得学校许可。

## English

**You provide:** Your own AI model/API, syllabus, assignment instructions, and course materials.

**AI helps you:** Organize each course, plan tasks, find the right chapters, and help with reading, drafting, and reviewing assignments. It tells you when materials are missing or downloads fail.

**School login:** Set up your account locally and show the login steps once, then reuse a valid session. Password storage is optional and encrypted; school-required verification stays with you.

**How to use:**

[Mobile cloud app](https://campus-coursework-mobile-kamegui.kamegui0910.chatgpt.site) (public guest access without mandatory email or ChatGPT sign-in; works while the computer is off). [Cloud source](cloud/README.md) is available for your own deployment. Cloud and desktop data are stored separately.

On Windows, download the complete portable ZIP from [Releases](https://github.com/kamegui0910-eng/campus-coursework/releases), extract it, open the EXE, connect your model, and add your school account.

1. Install the skill in an AI tool that supports skills. In Codex, paste the install command above.
2. Connect your model and add your syllabus and materials.
3. Ask: “Use campus-coursework. Read my syllabus, organize my course materials, and help me prepare this week’s assignment.”

You can also use the skill on its own. Website access, scheduled work, and submission require tools that support them and permission from your school.

[Skill](skills/campus-coursework/SKILL.md) · [Setup guide / 接入说明](skills/campus-coursework/references/portable-runtime.md)

## Browser import test release / 浏览器导入测试版

没有学校API Token也可在Chrome/Edge正常登录Canvas，用浏览器助手选择课程导出，再在云端“添加课程”预览导入。

[安装和测试步骤](cloud/docs/BROWSER_IMPORT.md) · [浏览器助手源码](cloud/browser-extension/) · [下载测试扩展ZIP](cloud/public/downloads/coursework-browser-helper.zip)。

采集与导入不调用模型、不收集密码或导出会话。手机可使用已导入资料；手机直接登录学校的云端浏览器未配置。这个更新是cloud/版本，desktop/安装包没有重建。网站已公开供访客测试，数据按各自空间隔离；测试者也可自行运行/部署源码。真实学校兼容性仍需试用。
