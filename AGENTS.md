# Campus Coursework — 当前范围

先读本文件、[README.md](README.md)、[cloud/STATE.json](cloud/STATE.json) 和 [cloud/docs/DECISIONS.md](cloud/docs/DECISIONS.md)。2026-11-20 起按下面的边界继续，不把已暂停模块当成待实现的下一项。

## 保留（P0/P1）

- 云端：`cloud/` 的 Next.js 应用，数据用 Cloudflare D1 / R2。课程资料、上传下载、作业资料绑定、AI 起草与检查、成果保存。
- 本地：桌面程序和 `skills/campus-coursework` 里的课程资料库、按作业取材、起草、内容检查。
- 只读 Canvas 浏览器扩展：`cloud/browser-extension/`。本人在学校官网登录后导出可见课程资料，不提交作业、不答题、不收集密码。

## 暂停（P2）

学校登录自动化和作业自动提交停止迭代。历史参考代码和说明保留，不删除。

当前路径是：本人在学校官方页面人工登录、人工提交；内容检查使用咩咩学校分身。不要新建登录回放、凭据代填、定时代交或正式提交执行。

桌面开关在 `desktop/scope.cjs`，默认 `schoolLoginAutomation: false`、`officialAutoSubmit: false`。技能模板 `submission.mode` 保持 `draft_only`。不要为了“补齐流程”把这两个开关打开。
