# 可选的本地资料索引工具

需要反复入库、生成单项资料包和检查版本时，用包内 `scripts/course-library.mjs`。仅依赖支持 ES modules 的 Node.js 和标准库；没有 Node 时按 [资料库流程](course-library.md) 用宿主文件工具维护同等记录，不为一次使用强制安装运行时。它不提供学校登录、下载器、云端附件上传器、正文语义核验或调度器；这些由当前智能体的真实工具完成。

将请求保存为私人 JSON 文件，再运行：

```text
node <skill目录>/scripts/course-library.mjs --root <私人coursework目录> --request <私人请求.json>
node --test <skill目录>/scripts/course-library.test.mjs
```

路径含空格时按当前 shell 规则加引号。请求不要带密码、密钥、Cookie、临时签名链接。所有请求有 `action` 与同一 `course` 身份；编号用字符串。输出中的 `course_directory` 是这门课的目录，不能拿另一门课的目录手填替换。索引有单写入锁；上次异常中断留下锁时先核对原进程/记录，不能让两个写入者同时强制更新。

## 初始化

```json
{
  "action": "init",
  "course": {
    "school_origin": "https://school.example",
    "course_id": "42",
    "term": "2026-Fall",
    "section": "A"
  },
  "collection_mode": "incremental"
}
```

`collection_mode` 可为 `incremental` 或 `all_published`，不表示工具已经采集。课程键由学校域名、课程 ID、学期、section 派生。平台使用不同 origin 的同课入口时由总控先确定同一官方课程身份，不按任意跳转域名另建重复库。

## 保存真实已核验资料

先通过正规工具取得文件并打开正文，核对课程、来源版本及实际内容，再发 `material` 请求；将下列 `course` 替换为完整同课身份：

```json
{
  "action": "material",
  "course": {"school_origin":"https://school.example","course_id":"42","term":"2026-Fall","section":"A"},
  "material": {
    "id": "book-ch4-notes",
    "kind": "textbook_notes",
    "title": "第4章已核验阅读笔记",
    "source_url": "https://school.example/library/book",
    "source_revision": "指定版次及已核验修订信息",
    "file": "<实际笔记绝对路径>",
    "storage": "notes",
    "coverage": ["ch4:4-2a", "ch4:figure4.3"],
    "verified_course": {"school_origin":"https://school.example","course_id":"42","term":"2026-Fall","section":"A"},
    "verification": {"content_verified":true,"evidence":"实际正文与来源核验记录位置"},
    "reading": {
      "state":"partial",
      "covered":["ch4:4-2a"],
      "missing":["ch4:figure4.3"],
      "read_at":"<实际阅读时间>",
      "evidence":"实际授权阅读记录位置"
    }
  }
}
```

`kind` 常用 `syllabus`、`assignment`、`rubric`、`textbook`、`textbook_notes`、`lecture`、`research`。每个 ID 代表稳定来源/保存范围，不因显示标题相同就合并。官方原件与 OCR、摘要/笔记用不同 ID 关联记录，不能把笔记标为原书。可选 `bibliography` 保存书名/作者/版次/年份/ISBN，`applies_to` 保存适用周/模块/任务；二者进入版本记录。其他信息放正文/课程手册，不假定任意新增JSON字段都会被保存。

`storage` 为 `downloaded`、`snapshot`、`notes`、`online_only`。前三种要求实际文件；`online_only` 不接受文件，只记入口，不能生成可复用已保存资料的通过状态。`coverage` 是这份原件/笔记实际具备的范围；`reading.covered` 是已实际读取的范围，二者独立。`all` 只在该独立资料确实完整保存/读取时使用，不代表全书、全课或相邻章节。精确定位标签须在入库与作业依赖中一致。

脚本检查文件非空、常见登录 HTML、PDF/Office 起始格式、课程身份声明及哈希；这些检查不证明全文正确、OCR 完整或确实读过。`verification` 与 `reading` 必须来自实际观察，不能为过关虚填。读取时间不可拿本次入库时间替换历史阅读时间。相同版本重新入库、未提供 `reading` 时保留既有覆盖；显式传入阅读记录可纠正错误。新内容/来源修订/范围产生新版本并保留旧文件，受影响任务记需复核，审计状态记 Stale。

## 绑定作业与生成资料包

`assignment` 请求包含 `task`：

```json
{
  "platform":"canvas",
  "item_id":"100",
  "component":"initial_post",
  "title":"Weekly Discussion",
  "week":2,
  "module":"M2",
  "requirements_revision":"<已保存题干的版本/哈希>",
  "requirements_checked_at":"<实际学校核验时间>",
  "requirements_status":"live_verified",
  "requirements_evidence":"<完整题干和指定章节来源>",
  "rubric_status":"separate",
  "dependencies":[
    {"material_id":"syllabus","version":"<入库返回version>","locators":["all"],"purpose":"课程政策","requires_read":true},
    {"material_id":"assignment-100","version":"<version>","locators":["all"],"purpose":"完整题干及附件要求","requires_read":true},
    {"material_id":"rubric-100","version":"<version>","locators":["all"],"purpose":"本项量表","requires_read":true},
    {"material_id":"book-ch4-notes","version":"<version>","locators":["ch4:4-2a"],"purpose":"题干指定的概念区分","requires_read":true}
  ]
}
```

`rubric_status` 为 `separate`、`embedded`、`not_provided` 或 `unknown`。单独量表须绑定 `kind:rubric`；内嵌量表须绑定作业资料的 `rubric` 定位；没有提供须有真实核验依据，未知阻塞。完整大纲与完整作业要求必须绑定，不能只放一段教材便称资料齐全。

`requirements_status` 为 `live_verified`、`historical`、`unknown`；只有本次真实访问学校要求后才能写live_verified。旧快照可先导入、匹配与研究准备，但资料包保持Blocked等待实时复核。日期和证据必须保留原值，不能把本地入库时间当作学校核验时间。

任务身份为平台+官方条目 ID+component；周/模块是可修正标签。外部活动与 LMS 作业分别记其真实平台/ID，并在手册保留映射。同名下一项作业必须新建真实 ID 的绑定，不能改上项标题冒用。需要整段课堂/附件或跨章节时明确列依赖；缺失的必需资料仍列出缺口，不删依赖来生成 Ready。

生成资料包用 `{"action":"bundle","course":{...},"task":{"platform":"canvas","item_id":"100","component":"initial_post"}}`。结果在本课 `bundles/<task_key>.json`，只列明确依赖的文件与定位，不内嵌全课正文。worker 按定位读取所需内容。ReadyForWork 仅表示所声明依赖的文件/版本/范围/读取与故障检查通过，不能代替本次学校实时复核、依赖完整性审阅、最终审计或提交授权。

版本过时、缺文件/范围、必读未读、未知量表、相关故障等返回 Blocked 和具体 gaps。`bundle_fingerprint` 绑定课程、任务、要求版本及所选来源/范围/哈希；审计记录引用它。任何资料变更后重核真实要求、重绑依赖并重生成包，才能复核草稿/审计；脚本不自动修改外部 Word、审计文件或学校已提交内容。

## 故障与人工补入

`incident` 请求带 `incident`：`id`、`material_id`、可选 `locators`、`stage`、`code`、`evidence`、`entry_url`、`navigation`、`expected_file`。`stage` 为 `lms_access`、`download`、`local_save` 或 `cloud_upload`。原因码为 `login_required`、`mfa_required`、`permission_denied`、`not_published`、`online_only`、`download_timeout`、`invalid_file`、`local_save_failed`、`cloud_upload_failed`、`unknown`；只按实际证据选原因。脚本把原因转为通俗中文，返回正式入口、操作路径、所需文件和目标课程导入位置。`not_published` 与 `online_only` 是限制记录，不伪装技术下载失败。

故障定位与依赖使用相同的精确标签；不填范围表示整项资料。获取下一章失败只阻塞对应章节，不阻塞已保存可用的上一章。手动恢复后发已核验 `material` 请求，并带 `resolves_incident_id`；目标资料和故障所需范围必须匹配，任意同书文件不能解除其他章节缺口。云端上传失败仍保留本机原件；解除 `cloud_upload` 故障还需 `recovery_evidence:{"destination_verified":true,"reference":"<目标任务实际附件/文件核验回执>"}`，仅重新导入本机文件不能算云端恢复。

`all` 表示整个已定义资料，作业依赖all时其中任一章节故障都相关。整项故障（省略locators或写all）只能以核验覆盖all的材料解除，局部章节不足；仅某章受影响就明确列该章定位。这里的all不是要求违规下载整本教材：可将允许保存的单章/笔记定义为独立资料，再对那份资料记all。
