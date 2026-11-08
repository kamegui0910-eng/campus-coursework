// Small, attributed UI screenshot excerpts for instructional comparison. Original files are unmodified.
export const SCREENSHOTS={
 openai:{credit:'Codecademy',source:'https://www.codecademy.com/article/creating-an-openai-api-key',items:[
 {src:'/guides/screenshots/openai-keys.png',title:'找到 API keys 与创建按钮',caption:'对照左侧 API keys 和右上角 Create new secret key。此图为教程中的历史控制台，当前布局可能不同。'},
 {src:'/guides/screenshots/openai-create.png',title:'填写密钥名称与项目',caption:'核对所属项目和权限，点击 Create secret key。只复制创建后显示的密钥，回到下方输入。'}]},
 claude:{credit:'Outlet Docs',source:'https://useoutlet.dev/docs/users/anthropic-api-key',items:[
 {src:'/guides/screenshots/claude-keys.png',title:'找到 Claude 的 API keys',caption:'图中 1 标出 API keys，2 标出右上角 Create key。先登录自己的 Claude Console。'},
 {src:'/guides/screenshots/claude-create.png',title:'创建自己的 API key',caption:'图中标出名称、有效期和 Create key。按自己的需要核对到期时间、账号和工作区。'}]},
 gemini:{credit:'Keith Lin / AutoIt Studio',source:'https://keithlin.autoit.studio/post/google-gemini-api-key-guide?lang=en',items:[
 {src:'/guides/screenshots/gemini-keys.png',title:'找到 Google AI Studio 的创建按钮',caption:'进入 API Keys，红框标出右上角 Create API key。没有项目时，请按官网提示创建或导入项目。'},
 {src:'/guides/screenshots/gemini-create.png',title:'为 API key 选择项目',caption:'图中依次标出名称、项目和 Create key。选择你自己的项目；图中名称只是原教程的示例。'}]},
 deepseek:{credit:'shengjidaguai-china / goutoujunshi-jev-chat',source:'https://github.com/shengjidaguai-china/goutoujunshi-jev-chat/blob/main/documentation/guides/android-deepseek/README.md',items:[
 {src:'/guides/screenshots/deepseek-keys.png',title:'找到 DeepSeek 的创建入口',caption:'左侧选择 API keys；红框是创建 API key。原教程已遮挡列表中的密钥。'},
 {src:'/guides/screenshots/deepseek-create.png',title:'填写名称并创建',caption:'输入用于辨认的名称，点击创建。复制新密钥后返回 Coursework，再读取模型。'}]},
 openrouter:{credit:'OpenRouter 官方文档',source:'https://openrouter.ai/docs/guides/overview/auth/oauth',items:[
 {src:'/guides/screenshots/openrouter-authorize.png',title:'快捷授权页面长什么样',caption:'这是官方文档中的授权确认页，应用名称为原教程示例。Coursework 的快捷授权无需复制 API key；手动模式请使用自己的已有密钥。'}]},
};
export const screenshotGuide=id=>SCREENSHOTS[id]||null;
