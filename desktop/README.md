# Campus Coursework 桌面版

独立的 Windows 课程工作台。双击 EXE 后即可管理课程、资料和内容工作，不需要另外运行 Codex 或其他 AI Agent。每位使用者在程序内配置自己的模型/API。

## 启动与分享

解压完整便携包，双击 `CampusCoursework.exe`。请保留同目录的资源文件；发给朋友时发送完整 ZIP。程序内含运行环境，接收者无需另装 Node.js。

首次打开可新建课程，或在资料库设置中选择已有 `coursework` 目录。资料保存在个人工作空间；模型与学校密钥使用 Windows 加密存储，不随应用分享。

## 这版可以操作的内容

- 课程与资料：按课程分别建库，导入 PDF、DOCX、Markdown、文字与官方网页快照，查看保存范围、读取状态和来源版本。
- 内容工作台：选择课程和作业资料，使用自己的模型做大纲整理、问答、草稿和内容审阅，保存并导出成果及其资料依据。
- 模型设置：OpenAI 兼容 Chat Completions、Responses 和 Anthropic 接口；远程地址使用 HTTPS，本机接口可使用 loopback HTTP。
- 学校连接：使用本人有权使用的 Canvas API token 测试连接、发现课程并同步所选课程的官方资料。这是资料同步，不是自动登录。
- 进度与计划：保存按周同步或提醒计划，程序运行时触发。关闭程序或电脑时不会继续执行；本版不自动配置 Windows 常驻服务，也不会自动提交作业。
- 审阅：在工作台做内容检查，辅助检查使用咩咩学校分身。保留真实缺口；不会制造检测分数或自动把草稿标成已提交。

新导入文件、文字提取和模型摘要不等于完整阅读或来源核验完成。遇到扫描 PDF、受限教材或未发布资料时，会保留原件和具体缺口，提供人工补充路径。

## 配置模型

在“设置”填写接口格式、基础地址和确切模型 ID，再输入自己的密钥并保存。点击“检测连接”后，以真实返回结果为准；模型列表可访问不代表已完成一次生成。按需在工作台发起请求，费用与权限由使用者自己的供应商账号决定。

程序不内置共享密钥、作者会话、课程材料或模型权重。正式提交由你在学校页面完成。当前桌面版不会自动操作检测站，也不会自动提交。

## 学校登录（已暂停）

学校登录自动化已暂停。`desktop/scope.cjs` 中 `schoolLoginAutomation` 默认为 `false`，程序不会打开自动登录窗口、回放步骤或填写已存密码。请在学校官方页面人工登录；有 Canvas 时用只读浏览器助手导出资料。作业人工提交，检查使用咩咩学校分身。

历史登录模块仍在源码中，供查看和清除本机旧账号、会话与步骤。不要把它当作当前功能继续扩展。`officialAutoSubmit` 同样默认为 `false`。

学校浏览器登录与 Canvas API token 是两个入口。API 同步只读取课程资料，登录成功也不会自动生成 API token，更不会提交作业。

## 开发与构建

源码采用 Electron + 原生 HTML/CSS/JavaScript，资料索引复用仓库中的 `skills/campus-coursework`。无外部 CDN。

```text
cd desktop
npm install
npm start
node --test services/*.test.cjs
```

Windows 打包可用 `scripts/build-portable.ps1 -RuntimeZip <已校验的Electron45.2.3 Windows x64 ZIP> -OutputRoot <输出目录>`。构建器拒绝覆盖已有版本目录；先完成依赖安装，再构建。`fetch-runtime.ps1` 提供本项目缓存下载，包含固定 SHA-256 校验。

运行数据和 `node_modules` 不提交源码仓库。桌面版源代码版本为0.2.1，底层课程 skill 为1.6.0；两者分别管理版本。
