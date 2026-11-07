# 检测站点与结果解释

作者于2026-11-06更新为检测策略 `qualifying-prose-length-v2`：**真实符合条件的正文少于300词时仅Copyleaks；达到300词时Copyleaks加Turnitin。所有本稿必需站都严格低于20%**。保存词数、范围、计数方法/证据与选站理由，未知词数不降级。此为本SOP额外提交条件，不是学校要求或作者身份证明。接收者用自己的账号、合法入口和数据处理授权；核对最新官方文档及实际界面，不从营销准确率推断本稿结果。“一个模型”在此指一个真实检测服务，不是让生成模型估计AI百分比。

## Copyleaks

官方起点：[AI Detector](https://copyleaks.com/ai-detector)；账号界面从官网进入 `app.copyleaks.com`。正式使用前核对本人的登录、可用额度、文本长度和AI检测能力；本包未包含账号或API凭据。

官方 [AI Text Detection Result](https://docs.copyleaks.com/reference/data-types/authenticity/results/ai-detection) 将 `summary.ai` 定义为被分类为AI的单词比例，取值0–1；若实际读取这个字段，0.199对应19.9%。官方 [results说明](https://docs.copyleaks.com/mcp/results) 中的MCP分数为0–100百分比。读取UI时以实际显示的标签/单位为准，不能把两种量纲直接混用；AI Phrases频次比也不是文档AI百分比。Similarity/plagiarism分数与AI分数分别保存，不能互相替代。

高亮定位/统计作为复核线索，不能据此虚构作者身份。保留当前 scan ID、结果时间、受检文本哈希和实际截图/报告；只测一段不能记为整篇已测。

短文本仍须核对Copyleaks当前的实际最低长度、支持语言和处理条件；本包不假定任何长度都可测。若25词回复等文本仍短于其当前要求，则保留Blocked并报告，不填0%、不拼接其他作业、不用另一个生成模型的判断替代。

## Turnitin

从 [Turnitin官网](https://www.turnitin.com/) 或学校实际授权入口进入，不假定学生有独立的公开全文粘贴检测器。按本人账号核对AI报告权限与提交前扫描路径；未验证的课程登录不等于已有AI报告访问。

按官方 [AI Writing Report](https://guides.turnitin.com/hc/en-us/articles/22774058814093-Using-the-AI-Writing-Report)，指标针对符合条件的长篇散文文本；至少300词。真实正文不足300词的100词主帖或25词回复依本SOP长度例外只用Copyleaks，Turnitin记 `not_required_length_exception`，不声称已测或通过，也不拼接文字凑数。正式报告中的 `*%` 对应0%以上、20%以下而不显示精确值，可保留区间判定，不写成0%；加载、灰色无分数和错误不是低分。

官方 [Canvas工作流](https://guides.turnitin.com/hc/en-us/articles/43269752197645-How-to-add-Turnitin-to-the-Canvas-Assignment-Workflow) 描述交后生成报告，学生访问还取决于教师设置。因此双站分支必须实际验证另有合规提交前入口；达到300词的稿件若只有交后报告，仍为Blocked，不能以缺权限/报错/不可用冒充长度例外，或先交再称为提交前审计。

[Draft Coach FAQ](https://guides.turnitin.com/hc/en-us/articles/28423411707533-Turnitin-Draft-Coach-FAQ) 列出相似度、引用、语法工具，不能仅凭Draft Coach可用就声称有AI检测功能。记录实际提供的功能与报告，不以similarity值代替AI值。

## 本地与互联网“判断标准”的使用

原稿、已确认的学生观点和表达偏好、题干/rubric、已读来源及实际报告是修订依据。互联网资料只采用可核验来源，并保存名称、URL、读取时间、适用产品和限制；优先官方当前说明，旧版本指标与搜索片段不当现行规则。

这些产品使用不同模型和统计，公开说明不提供一套保证“改哪些词就低于20%”的通用规则。把重复套话、欠具体的论证和不清楚的结构作为写作检查项，不把某个词列为机器作者的决定性证据。修订保留事实、来源、学生立场及必要披露，真实复检，不能伪造测试或保证分数。

若以后扩展新站，先识别指标是AI概率、AI文本占比还是其他含义；不要混算平均分。新增接收者、付费或数据持久化方式改变时按本人实际授权处理，不能因另一站不可用就自行换站。
