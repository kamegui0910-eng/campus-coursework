# Campus Coursework 云端版

手机和电脑使用同一个网页，电脑关机后仍可访问。每个人连接自己的模型/API，课程资料按账号分别保存。

你提供课程大纲、作业要求和相关材料；AI 帮你整理、列提纲、起草和检查。支持 PDF、DOCX 和文字文件上传，保留原件、提取文字和成果依据。

首次使用：用自己的 ChatGPT 账号登录，在设置中连接模型，建立课程并上传完整 Syllabus。使用 Canvas API 时另填自己的学校地址和 Token。

当前云端版提供课程库、上传下载、作业资料绑定、AI 工作台和成果保存。Windows 登录演示、学校网页 SSO、后台调度、外部检测和正式提交尚未接入云端。本机 EXE 的资料、账号密码和会话不会自动上传。

## Development

Use Node 24 and a compatible current npm. Install dependencies, generate schema migrations, run checks and build through the Sites workflow. The tracked hosting manifest uses D1 `DB` and R2 `BUCKET`.

- `npm ci`
- `npm run db:generate` after changing `db/schema.ts`; inspect and commit generated SQL and metadata.
- `node --test lib/coursework/*.test.mjs`
- `node node_modules/typescript/lib/tsc.js --noEmit`
- `npm run dev` for loopback preview; apply local migrations using the generated Wrangler configuration.

Configure `CAMPUS_ENCRYPTION_KEY` as a runtime secret. It protects users' saved API credentials; it is separate from their own model API keys. Keep it stable across deployments. Never commit `.dev.vars`, secrets, user data or local tool state.

Sites supplies ChatGPT sign-in. Every user-data operation checks the current user ID; file downloads pass through the authenticated API. Preview-only mock authentication is provided by the starter and is excluded from production builds.

## English

A cloud course workspace that works on your phone while your computer is off. Bring your own model/API, syllabus, assignment instructions and course materials. Organize each course, choose relevant sources, and prepare and review drafts.

Sign in with ChatGPT, connect your model, create a course and upload its complete syllabus. Canvas API access requires your own school URL and Token. Desktop files and school sessions are not uploaded automatically. Cloud browser login, background scheduling, external detectors and official submission are not connected in this version.
