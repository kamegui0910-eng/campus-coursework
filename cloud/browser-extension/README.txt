Coursework 浏览器助手 0.1.0 — Chrome / Edge 电脑测试版

安装：
1. 解压这个ZIP，保留整个coursework-browser-helper文件夹。
2. 打开 chrome://extensions 或 edge://extensions，启用开发者模式。
3. 点击“加载已解压的扩展程序”，选择包含manifest.json的文件夹。
4. 这不是应用商店正式版，更新测试版本需要重新加载扩展。

使用：
1. 在浏览器里打开学校官方Canvas，亲自登录并完成手机验证。
2. 留在Canvas页面，点击扩展图标→“读取当前学校的课程”。
3. 核对当前账号、课程和学期，一次最多选择5门。
4. 点击导出并保持弹窗打开，保存 .coursework.json。
5. 到Coursework→添加课程→浏览器导入，选择这个文件并预览，确认后保存。
云端地址：https://campus-coursework-mobile-kamegui.kamegui0910.chatgpt.site
当前站点仍保留原来的所有者访问范围；其他测试者可自行部署cloud/或使用本地测试环境，不会自动获得站点访问权限。

会话：
助手使用当前浏览器已有的会话，不读取密码输入框、不读取Cookie API、不导出会话；学校决定会话有效期。过期时停止，请在学校页面重新登录。Coursework不集中保存学校密码。

导出内容：
课程名称、学期、大纲页面、作业/评分组/截止日期、本人可见的作业分数。
可选大纲及课堂附件：每门课最多尝试8份，全包附件合计8MB，单文件4MB。未取得、被拒绝或超过上限的内容会记录缺口。
仅使用本人会话正常可读的Canvas数据接口，不需要API Token。不是完全不使用HTTP接口；不是其他LMS通用适配器。
学校登录、MFA、CAPTCHA由本人完成。本版不提交作业、不答题，不下载第三方视频，不改变学校访问权限。
未知来源文件不要导入；导出包含私人资料，只保存和上传到自己的空间，不要提交GitHub。

原理与来源：
复用Chrome activeTab/scripting官方接口和Canvas正常会话请求。参考MIT项目 jasp-nerd/canvas-course-downloader 的会话采集思路；没有复制其源码。本助手不依赖其扩展、不冒充该项目，也不需要付费模型。
源码、自动测试和实际学校登录测试是不同验收；尚未验证所有学校、SSO或嵌入式浏览器策略。
