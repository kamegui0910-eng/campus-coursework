'use strict';

const routes = [
  ['overview', '总览', 'layout'], ['courses', '我的课程', 'book'], ['library', '课程资料库', 'folder'],
  ['workbench', 'AI 工作台', 'spark'], ['schedules', '定时计划', 'calendar'], ['audit', '审阅与交付', 'shield'],
  ['school-login', '学校登录', 'lock'], ['settings', '连接与设置', 'settings']
];
const paths = {
  layout: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15M6 8h3M15 8h3"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 10h18"/>',
  spark: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h2M12 15h2M7 18h2"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  settings: '<path d="m9.5 3-.6 2.5-2 .9-2.3-.8-2.5 4.3 1.8 1.8v2.5l-1.8 1.7 2.5 4.3 2.3-.7 2 .9.6 2.6h5l.6-2.6 2-.9 2.3.7 2.5-4.3-1.8-1.7v-2.5l1.8-1.8-2.5-4.3-2.3.8-2-.9-.6-2.5Z" transform="translate(0 -1) scale(1 .96)"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 4.5 4.5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  import: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  external: '<path d="M14 3h7v7m0-7-10 10M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  export: '<path d="M12 16V3m-4 4 4-4 4 4M4 14v7h16v-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 7h.01"/>',
  alert: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17h.01"/>',
  outline: '<path d="M9 5h12M9 12h12M9 19h12M3 5h.1M3 12h.1M3 19h.1"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 1-6a9 9 0 1 1 18-5Z"/><path d="M7 10h10M7 14h6"/>',
  link: '<path d="m10 13 4-4M8 15l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 3 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 -1)"/>',
  github: '<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3 3 0 0 0-1-2.5c4-.5 7-2 7-6.5a5 5 0 0 0-1.5-3.5A5 5 0 0 0 19 2s-1.5-.5-4 1a13 13 0 0 0-6 0C6.5 1.5 5 2 5 2a5 5 0 0 0-.5 3.5A5 5 0 0 0 3 9c0 4.5 3 6 7 6.5A3 3 0 0 0 9 18v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const content = document.getElementById('content');
const modal = document.getElementById('modal');
const bridge = Boolean(window.campus?.call);
const emptyState = () => ({workspace:'', courses:[], materials:[], tasks:[], schedules:[], events:[], outputs:[], logins:[], settings:{}, canvas:{}, capabilities:{}});
let state = emptyState();
const ui = {route:'overview', course:'', search:'', filter:'all', busy:false, generating:false, output:null, mode:'outline', question:'', task:'', discovered:[]};
try { ui.course = localStorage.getItem('campus.selectedCourse') || ''; } catch {}
const modes = {syllabus:['大纲理解','book'],outline:['构思提纲','outline'],draft:['写作草稿','edit'],review:['内容审阅','shield'],question:['资料问答','chat']};
const kinds = {syllabus:'课程大纲',assignment:'作业要求',rubric:'评分量表',textbook:'教材',textbook_notes:'阅读笔记',reading_index:'阅读索引',lecture:'课堂材料',research:'研究来源',attachment:'课程附件'};
const courseFor = key => state.courses.find(c => String(c.key) === String(key));
const selectedCourse = () => courseFor(ui.course) || state.courses[0];
const materialsFor = key => state.materials.filter(m => String(m.courseKey) === String(key));
const tasksFor = key => state.tasks.filter(t => String(t.courseKey) === String(key));
const outputsFor = key => state.outputs.filter(o => !key || String(o.courseKey) === String(key));
const newestFirst = items => [...items].sort((a,b) => (Date.parse(b.createdAt || b.time) || 0) - (Date.parse(a.createdAt || a.time) || 0));
const hasModel = () => Boolean(state.settings?.baseUrl && state.settings?.model);
const shortDate = value => {
  if (!value) return '尚未记录';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
};
const courseOptions = (selected, all = false) => `${all ? '<option value="">全部课程</option>' : ''}${state.courses.map(c => `<option value="${h(c.key)}" ${String(c.key) === String(selected) ? 'selected' : ''}>${h(c.title || c.section || c.course_id)}</option>`).join('')}`;
const badge = (text, color = 'gray') => `<span class="badge badge-${color}">${h(text)}</span>`;
const button = (label, action, symbol = '', style = 'outline', extra = '') => {
  const extraClass=extra.match(/\bclass="([^"]*)"/)?.[1] || '';
  return `<button class="button button-${style} ${extraClass}" data-action="${action}" ${extra.replace(/\s*class="[^"]*"/g,'')}>${symbol ? icon(symbol) : ''}${h(label)}</button>`;
};

async function call(action, payload = {}) {
  if (!bridge) throw new Error('请从 Campus Coursework 桌面程序启动，才能使用这个功能。');
  const result = await window.campus.call(action, payload);
  if (result?.ok === false || result?.success === false) throw new Error(result.message || result.error || '这一步没有完成，请检查连接后重试。');
  return result;
}
async function refresh() {
  const result = await call('state.get');
  state = {...emptyState(), ...result};
  state.settings = {...(result?.settings || {})};
  state.canvas = {...(result?.canvas || {})};
  for (const key of ['courses','materials','tasks','schedules','events','outputs','logins']) if (!Array.isArray(state[key])) state[key] = [];
  if (!courseFor(ui.course) && state.courses.length) ui.course = String(state.courses[0].key);
  if (!state.courses.length) ui.course = '';
  updateChrome();
}
function updateChrome() {
  document.getElementById('navigation').innerHTML = routes.map(([key,label,symbol], i) => `${i === 6 ? '<div class="nav-divider"></div>' : ''}<button class="nav-button ${ui.route === key ? 'active' : ''}" data-route="${key}" ${ui.route === key ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${key === 'courses' && state.courses.length ? `<small class="nav-count">${state.courses.length}</small>` : ''}</button>`).join('');
  document.getElementById('breadcrumb-title').textContent = routes.find(r => r[0] === ui.route)?.[1] || '总览';
  const status = document.getElementById('top-model-status');
  status.classList.toggle('configured', hasModel());
  status.innerHTML = `<i></i>${hasModel() ? '模型已配置' : '模型待配置'}`;
  document.getElementById('workspace-status').textContent = state.workspace ? `本地资料库 · ${state.workspace}` : '本地工作空间';
}
function setCourse(key) {
  ui.course = String(key || ''); ui.task = ''; ui.output = null;
  try { localStorage.setItem('campus.selectedCourse', ui.course); } catch {}
}
function navigate(route) {
  if (!routes.some(r => r[0] === route)) return;
  ui.route = route; updateChrome(); render(); content.scrollTop = 0;
}
function toast(message, error = false) {
  const node = document.createElement('div'); node.className = `toast${error ? ' error' : ''}`;
  node.innerHTML = `${icon(error ? 'alert' : 'check')}<span>${h(message)}</span>`;
  document.getElementById('toast-host').appendChild(node);
  setTimeout(() => node.remove(), error ? 7500 : 4500);
}
function setBusy(value, message = '正在处理…') {
  ui.busy = value;
  document.getElementById('progress-track').hidden = !value;
  document.getElementById('runtime-status').textContent = value ? message : '准备就绪';
  document.querySelectorAll('[data-busy-disable]').forEach(el => el.disabled = value);
}
async function run(fn, label = '正在处理…') {
  if (ui.busy) { toast('上一项操作还在进行，请稍等。'); return; }
  setBusy(true, label);
  try { return await fn(); }
  catch (error) {
    const message = error?.message || '操作没有完成，请稍后重试。';
    toast(message, true);
    const errorBox = modal.open && modal.querySelector('.form-error');
    if (errorBox) { errorBox.textContent = message; errorBox.hidden = false; }
  } finally { setBusy(false); }
}
async function mutation(action, payload, message) {
  const result = await call(action, payload);
  if (result?.canceled || result?.cancelled) return result;
  await refresh(); render();
  if (message) toast(result?.message || message);
  return result;
}
function pageTop(eyebrow, title, subtitle, actions = '') {
  return `<div class="page-top"><div><div class="eyebrow">${eyebrow}</div><h1>${h(title)}</h1>${subtitle ? `<p class="page-subtitle">${h(subtitle)}</p>` : ''}</div>${actions ? `<div class="page-top-actions">${actions}</div>` : ''}</div>`;
}
function empty(title, description, symbol = 'folder', action = '', label = '') {
  return `<div class="empty-state"><span class="empty-symbol">${icon(symbol)}</span><h3>${h(title)}</h3><p>${h(description)}</p>${action ? button(label,action,'plus','primary') : ''}</div>`;
}
function courseCard(course, compact = false) {
  let host = course.school_origin || '';
  try { host = new URL(host).hostname; } catch {}
  const archive = /archiv|concluded|finished/i.test(course.status || '');
  return `<article class="course-card"><div class="course-card-top"><span class="course-code">${h(course.section || course.course_id)}</span>${badge(archive ? '已归档' : '课程空间', archive ? 'gray' : 'aqua')}</div><h3>${h(course.title || course.section || course.course_id)}</h3><p class="course-term">${h(course.term || '学期未确认')}<br>${h(host)}</p><div class="course-meta"><span>${icon('folder')}${h(course.materialCount ?? materialsFor(course.key).length)} 份资料</span><span>${icon('file')}${h(course.taskCount ?? tasksFor(course.key).length)} 项任务</span></div><div class="course-card-bottom"><span class="syllabus-note"><i class="tiny-dot"></i>${h(syllabusLabel(course))}</span><button class="button button-small button-quiet" data-action="open-course" data-key="${h(course.key)}">进入课程 ${icon('arrow')}</button></div></article>`;
}
function syllabusLabel(course) {
  const value = String(course.syllabusStatus || '').trim().toLowerCase();
  if (['ready','read','complete','completed'].includes(value)) return '大纲已建立 · 开始前复核更新';
  if (/saved|available|import/i.test(value)) return '大纲已保存 · 读取状态待核验';
  if (materialsFor(course.key).some(m => m.kind === 'syllabus')) return '已有大纲资料 · 按记录范围使用';
  return '先保存并完整读取官方大纲';
}
function activityRows() {
  if (!state.events.length) return `<div class="empty-inline">${icon('clock')}<b>每一步，都会留痕。</b>导入资料、同步课程或生成内容后，<br>这里会记录真实进展。</div>`;
  return newestFirst(state.events).slice(0,4).map(event => `<div class="activity-row"><span class="activity-dot ${h(event.level || '')}"></span><div><b>${h(event.title || '执行记录')}</b><p>${h(event.detail || '')}</p><span class="activity-time">${h(shortDate(event.time))}</span></div></div>`).join('');
}
function renderOverview() {
  const today = new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
  const pending = state.tasks.filter(t => !['submitted','graded','complete','completed'].includes(String(t.status || '').toLowerCase())).length;
  const current=selectedCourse();
  const hasSyllabus=current && materialsFor(current.key).some(material=>material.kind==='syllabus');
  const steps = [
    [Boolean(hasSyllabus), state.courses.length ? '建立大纲与课程基线' : '建立你的课程空间', hasSyllabus ? '大纲资料已保存，完整读取与版本按记录复核。' : state.courses.length ? '先导入当前课程的完整官方 syllabus。' : '先接入一门课，把官方大纲放在最前面。',state.courses.length ? 'import-syllabus' : 'new-course'],
    [hasModel(), '连接自己的模型', hasModel() ? `${state.settings.model} · 可在设置中核验接口。` : '使用自己的 API，密钥由本机安全保存。','go-settings'],
    [state.outputs.length > 0, '从资料到可审阅成果', state.outputs.length ? `已保留 ${state.outputs.length} 份内容记录。` : '选择相关章节，先构思，再写作与审阅。','go-workbench']
  ];
  return `${pageTop('YOUR LEARNING, ORGANIZED.','课程工作台','从官方大纲出发，让每项任务找到它需要的资料。',`<span class="date-label">${h(today)}</span>`)}
  <div class="dashboard-top"><section class="hero"><div class="hero-copy"><div class="eyebrow">ONE SPACE FOR YOUR SEMESTER</div><h2>让课程进度，<br><em>有迹可循。</em></h2><p>课程、章节、资料与想法，在一个空间里接上。</p><div class="hero-actions">${button(state.courses.length ? '进入 AI 工作台' : '接入第一门课程',state.courses.length ? 'go-workbench':'new-course','plus','pink')}${button('导入已有资料库','choose-workspace','import','outline')}</div></div><div class="hero-orbit" aria-hidden="true"><i class="orbit-ring"></i><i class="orbit-ring"></i><i class="orbit-ring"></i><span class="orbit-center">${icon('book')}</span><i class="orbit-dot"></i><i class="orbit-dot aqua"></i></div><span class="hero-caption">SYLLABUS FIRST · ALWAYS</span></section>
  <section class="next-panel"><div class="section-header"><h2>下一步 <span>UP NEXT</span></h2>${badge('按真实进度','gray')}</div>${steps.map(([done,title,detail,action],i)=>`<div class="step-row ${done ? 'done' : i === steps.findIndex(s=>!s[0]) ? 'first':''}"><span class="step-index">${done ? icon('check') : `0${i+1}`}</span><div class="step-copy"><b>${title}</b><p>${h(detail)}</p></div><button class="step-arrow" data-action="${action}" aria-label="${title}">${icon('chevron')}</button></div>`).join('')}</section></div>
  <section class="metrics" aria-label="工作空间统计">${[['book','课程空间',state.courses.length,'门课程'],['folder','课程资料',state.materials.length,'份已存资料'],['file','待推进任务',pending,'项需继续'],['calendar','有效计划',state.schedules.filter(s=>s.enabled).length,'项运行中']].map(([symbol,label,n,unit])=>`<div class="metric"><div class="metric-label"><span class="metric-icon">${icon(symbol)}</span>${label}</div><div class="metric-number">${String(n).padStart(2,'0')}<small>${unit}</small></div></div>`).join('')}</section>
  <div class="dashboard-bottom"><section><div class="section-header"><h2>我的课程 <span>MY COURSES</span></h2><button class="section-link" data-route="courses">全部课程 ${icon('arrow')}</button></div>${state.courses.length ? state.courses.slice(0,2).map(c=>courseCard(c,true)).join('<div class="course-spacer"></div>') : `<button class="course-card course-card-add" data-action="new-course"><span>${icon('plus')}</span><b>从第一门课开始</b><p>大纲、教材与作业资料，从这里各归其位。</p></button>`}</section>
  <section class="activity-panel"><div class="section-header"><h2>最近进展 <span>ACTIVITY</span></h2><span class="tiny-dot"></span></div>${activityRows()}</section></div>`;
}
function renderCourses() {
  return `${pageTop('COURSE SPACES','我的课程','每门课拥有独立资料库，学期、章节和任务不会混在一起。',button('添加课程','new-course','plus','primary'))}
  <div class="workspace-hint">${icon('book')}<span><strong>先读大纲，再安排进度。</strong> 保存完整官方 syllabus，并继续核对作业 rubric 与教师更新。</span></div>
  <div class="course-grid">${state.courses.map(c=>courseCard(c)).join('')}<button class="course-card course-card-add" data-action="new-course"><span>${icon('plus')}</span><b>建立新的课程空间</b><p>用真实课程编号与学期区分每一门课。</p></button></div>`;
}
function readingBadge(material) {
  const reading = typeof material.reading === 'string' ? material.reading : material.reading?.state;
  if (/partial/i.test(reading || '')) return badge('部分覆盖','yellow');
  if (/^read$|^ready$/i.test(reading || '')) return badge('按范围已读','aqua');
  if (material.storage === 'online_only') return badge('在线入口','gray');
  return badge('待读取','pink');
}
function filteredMaterials() {
  const term = ui.search.trim().toLowerCase();
  return state.materials.filter(m => (!ui.course || String(m.courseKey) === String(ui.course)) &&
    (ui.filter === 'all' || ui.filter === 'reading' && ['textbook','textbook_notes','reading_index'].includes(m.kind) || m.kind === ui.filter) &&
    (!term || `${m.title || ''} ${m.kind || ''} ${(m.coverage || []).join(' ')}`.toLowerCase().includes(term)));
}
function materialRows() {
  const materials = filteredMaterials();
  if (!materials.length) return empty(ui.search || ui.filter !== 'all' ? '没有找到相应资料' : '把课程资料放进来','导入官方大纲、评分量表、阅读笔记和作业附件，保留它们各自的来源与范围。','folder', state.courses.length ? 'import-materials' : 'new-course', state.courses.length ? '导入资料' : '先添加课程');
  return `<div class="material-list"><div class="list-head"><span>资料名称 / 来源</span><span class="scope-heading">相关章节</span><span>读取覆盖</span><span></span></div>${materials.map(m=>{
    const color = m.kind === 'syllabus' ? 'pink' : ['textbook_notes','reading_index'].includes(m.kind) ? 'aqua' : m.kind === 'rubric' ? 'yellow' : '';
    return `<div class="material-row"><div class="material-main"><span class="file-icon ${color}">${icon('file')}</span><div class="material-text"><div class="material-name" title="${h(m.title)}">${h(m.title || m.id)}</div><div class="material-subtitle">${h(kinds[m.kind] || m.kind || '课程资料')} · ${h(courseFor(m.courseKey)?.title || courseFor(m.courseKey)?.section || '')}</div></div></div><div class="scope-tags">${(m.coverage || []).slice(0,2).map(c=>`<span class="scope-tag" title="${h(c)}">${h(c === 'all' ? '该份资料的完整范围' : c)}</span>`).join('') || '<span class="scope-tag">范围待核验</span>'}</div><div>${readingBadge(m)}</div><div class="row-actions"><button class="button" data-action="preview-material" data-id="${h(m.id)}" data-course="${h(m.courseKey)}" aria-label="预览 ${h(m.title)}" title="查看资料">${icon('eye')}</button>${m.path ? `<button class="button" data-action="open-material" data-id="${h(m.id)}" data-course="${h(m.courseKey)}" aria-label="打开 ${h(m.title)}" title="打开原文件">${icon('external')}</button>` : ''}</div></div>`;
  }).join('')}</div><p class="list-foot">${icon('info')}显示 ${materials.length} 份资料。已保存与已读取分别记录，部分笔记不代表整本教材已读。</p>`;
}
function renderLibrary() {
  return `${pageTop('THE SOURCE OF YOUR WORK','课程资料库','把资料放对课程，让每项作业只取它真正需要的部分。',`${button('同步课程','sync-course','link','outline','data-busy-disable')}${button('导入资料','import-materials','import','primary','data-busy-disable')}`)}
  <div class="toolbar"><select class="field-select" id="library-course" aria-label="选择课程">${courseOptions(ui.course,true)}</select><label class="search-field">${icon('search')}<input id="material-search" type="search" placeholder="搜索资料名称或章节…" value="${h(ui.search)}" aria-label="搜索资料名称或章节"></label><div class="filter-group">${[['all','全部'],['syllabus','大纲'],['rubric','量表'],['reading','教材 / 笔记']].map(([key,label])=>`<button class="filter-button ${ui.filter === key ? 'active':''}" data-action="filter-materials" data-filter="${key}">${label}</button>`).join('')}</div></div><div id="material-rows">${materialRows()}</div>`;
}
function markdown(text) {
  const escaped = h(text || '').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`\n]+)`/g,'<code>$1</code>');
  return escaped.split(/\n\s*\n/).map(block=>{
    if (/^#{1,3} /.test(block)) return block.split('\n').map(line=>line.replace(/^(#{1,3}) (.*)$/,(_,level,title)=>`<h${level.length}>${title}</h${level.length}>`)).join('');
    const lines=block.split('\n');
    if (lines.every(line=>/^\s*[-*] /.test(line))) return `<ul>${lines.map(line=>`<li>${line.replace(/^\s*[-*] /,'')}</li>`).join('')}</ul>`;
    return `<p>${block}</p>`;
  }).join('');
}
function renderOutput() {
  if (ui.generating) return `<div class="output-header"><div class="output-title">${icon('spark')}正在整理相关资料与内容</div>${badge('生成中','blue')}</div><div class="output-placeholder is-generating"><span>${icon('spark')}</span><h3>让想法慢慢成形。</h3><p>正在调用你配置的模型。完成后，内容会保留在本地成果记录里。</p></div>`;
  const output = ui.output;
  if (!output?.text) return `<div class="output-header"><div class="output-title">${icon('file')}内容预览</div>${badge('等待开始','gray')}</div><div class="output-placeholder"><span>${icon('edit')}</span><h3>从有根据的想法开始。</h3><p>选择课程、工作模式与相关任务。生成结果会显示在这里，供你继续理解、修改和审阅。</p></div>`;
  const gaps=Array.isArray(output.gaps) ? output.gaps : [];
  const incomplete=output.complete===false;
  const warning=output.warning ? String(output.warning) : '';
  const notices=`${incomplete ? `<div class="output-notice incomplete">${icon('alert')}<div><h4>生成未完成</h4><p>${h(warning || '模型因长度或其他限制提前结束。这份内容尚不完整，请补齐后再使用。')}</p></div></div>` : warning ? `<div class="output-notice">${icon('info')}<div><h4>生成提示</h4><p>${h(warning)}</p></div></div>` : ''}${gaps.length ? `<div class="output-notice">${icon('info')}<div><h4>仍有 ${gaps.length} 项资料缺口需要核对</h4><ul>${gaps.map(gap=>`<li>${h(typeof gap==='string'?gap:gap.message || gap.detail || JSON.stringify(gap))}</li>`).join('')}</ul></div></div>` : ''}`;
  const sources=Array.isArray(output.provenance?.sources) ? output.provenance.sources : null;
  const sourceDetails=sources ? `<details class="output-source-details"><summary>本次实际采用 ${sources.length} 份资料</summary><ul>${sources.map(source=>`<li><b>${h(source.title || source.id || '课程资料')}</b><span>${h((source.locators || []).map(locator=>locator==='all'?'该份资料的保存范围':locator).join(' / ') || '范围按来源记录')}</span></li>`).join('')}</ul><p>机器读取记录不代表本人已完成全文阅读；外部检测与正式提交分别核验。</p></details>` : '';
  return `<div class="output-header"><div class="output-title">${icon('file')}<span>${h(output.title || modes[output.mode || ui.mode]?.[0] || '生成内容')}</span></div><div class="output-actions">${incomplete ? badge('生成未完成','pink') : gaps.length ? badge('存在资料缺口','yellow') : ''}${button('复制','copy-output','copy','quiet','class="button-small"')}${output.id ? button('导出','export-output','export','quiet','class="button-small"') : ''}</div></div>${notices ? `<div class="output-notices">${notices}</div>` : ''}<article class="output-paper">${markdown(output.text)}</article><div class="output-meta">${h(output.model || state.settings.model || '')}${output.createdAt ? ` · ${h(shortDate(output.createdAt))}` : ''}<br>此为可修改的学习与写作成果，仍需核查来源、具体 rubric 与学校辅助规则。内容审阅不等于外部检测通过。${sourceDetails}</div>`;
}
function renderWorkbench() {
  const course = selectedCourse();
  const history = newestFirst(outputsFor(course?.key)).slice(0,5);
  const tasks = course ? tasksFor(course.key) : [];
  return `${pageTop('IDEAS, WITH CONTEXT.','AI 工作台','用自己的模型，围绕所选课程资料完成理解、构思、写作与审阅。',button('模型设置','go-settings','settings','outline'))}
  ${!hasModel() ? `<div class="workspace-hint warning">${icon('info')}<span>先在「连接与设置」中填写自己的 API 和模型。应用不会使用共享密钥，也不会虚构生成结果。</span></div>` : ''}
  <div class="workbench-layout"><section class="composer"><h2>${icon('spark')}这次想完成什么？</h2><div class="field"><label for="work-course">课程空间</label><select class="field-select" id="work-course">${state.courses.length ? courseOptions(course?.key) : '<option value="">请先添加课程</option>'}</select></div><div class="field"><label for="work-task">关联任务 <span>可选</span></label><select class="field-select" id="work-task"><option value="">围绕课程资料</option>${tasks.map(t=>`<option value="${h(t.key)}" ${String(t.key) === String(ui.task) ? 'selected':''}>${h(t.title || t.key)}</option>`).join('')}</select></div><div class="field"><label>工作模式</label><div class="mode-grid">${Object.entries(modes).map(([key,[label,symbol]])=>`<button class="mode-button ${ui.mode===key?'active':''}" data-action="set-mode" data-mode="${key}" aria-pressed="${ui.mode===key}">${icon(symbol)}${label}</button>`).join('')}</div></div><div class="field"><label for="work-question">你的要求与想法</label><textarea class="field-textarea" id="work-question" placeholder="例如：根据本项要求和指定章节，帮我整理一个有依据的提纲；缺少的材料请明确指出。">${h(ui.question)}</textarea></div><button class="button button-primary" data-action="generate" data-busy-disable ${ui.generating ? 'disabled':''}>${icon('spark')}${ui.generating ? '正在生成…' : '开始生成'}</button><p class="composer-note">${icon('lock')}所选资料将发送至你配置的模型接口。按课程和任务范围取材，缺项会保留说明。</p>${history.length ? `<div class="output-history"><div class="eyebrow">RECENT OUTPUTS</div>${history.map(o=>`<button class="history-button" data-action="select-output" data-id="${h(o.id)}"><span>${h(o.title || modes[o.mode]?.[0] || '内容记录')}</span><small>${h(shortDate(o.createdAt))}</small></button>`).join('')}</div>` : ''}</section><section class="output-panel" id="output-panel">${renderOutput()}</section></div>`;
}
function renderSchedules() {
  const days=['周日','周一','周二','周三','周四','周五','周六'];
  return `${pageTop('KEEP A STEADY RHYTHM','定时计划','把课程同步与提醒安排在合适的时间。',button('新建计划','new-schedule','plus','primary'))}<div class="workspace-hint warning">${icon('clock')}<span><strong>在程序运行期间执行。</strong> 关闭应用或电脑后，计划不会继续运行；此版本未注册 Windows 后台任务。</span></div>${state.schedules.length ? `<div class="schedule-grid">${state.schedules.map(s=>`<article class="schedule-card"><span class="schedule-symbol">${icon(s.mode === 'sync' ? 'link':'calendar')}</span><div class="schedule-main"><h3>${h(s.title || '课程计划')}</h3><p>${h(courseFor(s.courseKey)?.title || courseFor(s.courseKey)?.section || '未指定课程')} · ${s.mode==='sync'?'同步课程资料':'课程进度提醒'}${s.nextRun ? `<br>下次 ${h(shortDate(s.nextRun))}`:''}</p></div><div class="schedule-time">${h(s.time || '--:--')}<small>每${days[Number(s.day)] || h(s.day || '周')}</small></div><button class="toggle" role="switch" aria-checked="${Boolean(s.enabled)}" aria-label="${s.enabled ? '停用' : '启用'} ${h(s.title)}" data-action="toggle-schedule" data-id="${h(s.id)}"><span></span></button></article>`).join('')}</div>` : empty('为课程留出固定的时间','先选择课程，再设置每周提醒或同步计划。计划执行情况会写入最近进展。','calendar','new-schedule','建立第一个计划')}`;
}
function renderAudit() {
  const reviews=state.outputs.filter(o=>o.mode==='review').length;
  const gaps=state.tasks.filter(t=>t.gaps?.length || t.review_required || /blocked/i.test(t.status || ''));
  return `${pageTop('REVIEW BEFORE RELEASE','审阅与交付','把内容质量、外部检测和提交条件分别核对，保留真实证据。')}
  <div class="audit-banner"><span class="audit-mark">${icon('shield')}</span><div><h2>先让内容经得起核对。</h2><p>有来源、有范围、有版本，再进入下一步。</p></div><span class="small-caps">EVIDENCE BEFORE CONFIDENCE<br>REVIEW · VERIFY · RELEASE</span></div>
  <div class="audit-steps"><section class="audit-step"><div class="audit-step-top"><span class="audit-step-number">01</span>${badge(reviews ? `${reviews} 份内容审阅` : '等待内容','blue')}</div><h3>内容与来源审阅</h3><p>核查题干、rubric、引用、资料范围和必要反思。模型意见用于复核，不能替代真实证据。</p>${button('进入内容审阅','start-review','shield','outline')}</section><section class="audit-step"><div class="audit-step-top"><span class="audit-step-number">02</span>${badge('真实报告待核验','pink')}</div><h3>外部检测报告</h3><p>需使用本人有权使用的提交前入口。这里没有生成或验证 Copyleaks / Turnitin 分数。</p><div class="provider-links">${button('Copyleaks ↗','open-copyleaks','','outline')}${button('Turnitin ↗','open-turnitin','','outline')}</div></section><section class="audit-step"><div class="audit-step-top"><span class="audit-step-number">03</span>${badge('自动提交未启用','gray')}</div><h3>正式交付条件</h3><p>还需有效授权、学校允许的帮助、当前检测报告、开放窗口和最终版本。当前应用不执行正式提交。</p><button class="button button-outline" disabled>${icon('lock')}等待完整提交条件</button></section></div>
  <div class="section-header"><h2>需要继续核对 <span>OPEN ITEMS</span></h2>${badge(`${gaps.length} 项`,'gray')}</div>${gaps.length ? `<div class="material-list">${gaps.slice(0,12).map(t=>`<div class="gap-row"><span>${icon('info')}</span><div><b>${h(t.title || t.key)}</b><p>${h((t.gaps?.length ? t.gaps : [t.review_required ? '相关资料已更新，需要复核当前依赖与内容。' : '当前任务状态需要继续核对。']).join('；'))}</p></div></div>`).join('')}</div>` : `<div class="empty-inline">没有已记录的任务缺口，不代表外部检测或提交条件已经通过。</div>`}`;
}
function loginStatus(profile) {
  const labels={unconfigured:'待演示',saved:'设置已保存','window-open':'登录窗口已打开','needs-user':'需要本人操作',expired:'登录已失效','session-cleared':'会话已清除',configured:'待演示',recording:'正在演示',recorded:'步骤已记录',opened:'登录窗口已打开',reusing:'正在复用会话',verified:'登录已核验',authenticated:'登录已核验',login_required:'需要登录',needs_login:'需要登录',verification_required:'需要本人验证',challenge:'需要本人验证',cleared:'会话已清除',error:'需要处理'};
  const status=profile.lastStatus || '';
  return badge(labels[status] || '登录待核验',['verified','authenticated'].includes(status)?'aqua':/error|challenge|verification|needs-user|expired/.test(status)?'pink':'gray');
}
function loginCard(profile) {
  let school=profile.schoolUrl || '';
  try { school=new URL(school).hostname; } catch {}
  const extra=`data-id="${h(profile.id)}" data-busy-disable`;
  return `<article class="school-login-card">
    <div class="school-login-heading"><span class="settings-symbol aqua">${icon('globe')}</span><div><h2>${h(profile.name || school || '学校登录')}</h2><p>${h(({canvas:'Canvas',blackboard:'Blackboard',other:'其他学校系统'})[profile.lmsType] || '学校系统')} · ${h(school)}</p></div>${loginStatus(profile)}</div>
    <div class="school-login-account"><span>${icon('lock')}${h(profile.email || '账号未填写')}</span><span>${h(profile.hasPassword?'密码已加密保存':'密码由你在学校页面填写')}</span></div>
    <div class="login-record-summary"><span><b>${String((profile.steps || []).length).padStart(2,'0')}</b> 步登录记录</span><span>上次核验 ${h(shortDate(profile.lastVerifiedAt))}</span></div>
    ${profile.lastMessage?`<p class="login-status-message" role="status">${h(profile.lastMessage)}</p>`:''}
    <div class="school-login-actions">${button('打开学校','login-reuse','external','primary',extra)}${button((profile.steps || []).length?'重新演示登录':'演示一次登录','login-record','edit','outline',extra)}${button('检查登录状态','login-verify','check','outline',extra)}</div>
    <details class="login-manage"><summary>账号设置与会话管理</summary><div class="login-secondary-actions">${button('修改设置','login-edit','settings','quiet',extra)}${button('填写已保存账号','login-fill','lock','quiet',extra)}${button('忘记登录步骤','login-forget','outline','quiet',extra)}${button('退出并清除会话','login-clear-session','close','quiet',extra)}${button('删除学校账号','login-delete','close','quiet',extra)}</div><p>清除会话会退出这个学校的内置浏览器；删除账号还会移除本机保存的密码和步骤。</p></details>
  </article>`;
}
function renderSchoolLogin() {
  return `${pageTop('SIGN IN ONCE, KEEP YOUR PLACE','学校登录','保存自己的学校入口，演示一次登录，后续优先使用已有会话。',button('添加学校账号','new-login','plus','primary'))}
    <section class="login-intro"><div class="login-intro-mark">${icon('lock')}</div><div><h2>让登录少几步。</h2><p>账号和密码在这里填写，只留在你的电脑。密码由 Windows 加密保护，不交给 AI，也不放进分享包。你也可以只保存邮箱，直接在学校页面输入密码。</p></div></section>
    <div class="login-setup-steps"><div><span>01</span><b>填写学校与账号</b><p>添加 Canvas、Blackboard 或学校自己的入口。</p></div><div><span>02</span><b>亲自演示一次</b><p>在独立窗口完成登录，回来检查登录状态。</p></div><div><span>03</span><b>继续使用已有会话</b><p>下次打开学校时优先复用；失效后再登录。</p></div></div>
    <div class="login-session-note">${icon('info')}<p>验证码、手机确认和学校要求的再次验证仍需本人完成。Google 或 Microsoft 若不允许内置窗口登录，按窗口提示使用学校支持的方式。</p></div>
    <div class="school-login-list">${state.logins.length?state.logins.map(loginCard).join(''):empty('添加你的第一个学校账号','先保存学校地址与邮箱，再演示登录。每个学校拥有独立的浏览器会话。','globe','new-login','添加学校账号')}</div>`;
}
function renderSettings() {
  const settings=state.settings || {}, canvas=state.canvas || {};
  return `${pageTop('MAKE IT YOUR OWN','连接与设置','每个人连接自己的模型、学校与资料空间。')}
  <div class="login-settings-link"><span class="settings-symbol aqua">${icon('lock')}</span><div><b>学校登录</b><p>保存学校入口和账号，演示一次登录，复用已有会话。</p></div>${button('设置学校登录','go-school-login','arrow','outline')}</div>
  <div class="settings-grid"><div><section class="settings-panel"><div class="settings-title"><span class="settings-symbol">${icon('spark')}</span><div><h2>模型与 API</h2><p>BRING YOUR OWN MODEL</p></div></div><form id="model-form"><div class="field"><label for="api-style">接口类型</label><select class="field-select" id="api-style" name="apiStyle">${[['chat-completions','OpenAI 兼容 · Chat Completions'],['responses','OpenAI · Responses'],['anthropic','Anthropic · Messages']].map(([id,label])=>`<option value="${id}" ${settings.apiStyle===id?'selected':''}>${label}</option>`).join('')}</select></div><div class="field"><label for="api-base">API Base URL</label><input class="field-input" id="api-base" name="baseUrl" type="url" placeholder="https://你的模型接口/v1" value="${h(settings.baseUrl)}" required><p class="field-help">填写供应商提供的基础地址；本机模型可使用 localhost 接口。</p></div><div class="field"><label for="model-id">模型名称</label><input class="field-input" id="model-id" name="model" placeholder="填写供应商提供的确切 model ID" value="${h(settings.model)}" required></div><div class="field"><label for="api-key">API Key <span>${settings.hasKey ? '已保存' : '按供应商要求填写'}</span></label><input class="field-input" id="api-key" name="apiKey" type="password" autocomplete="new-password" placeholder="${settings.hasKey ? '留空保留已保存的密钥' : '仅保存在本机，不随应用分享'}"><p class="field-help">${settings.hasKey ? '密钥不会回显。输入新密钥并保存可替换当前值。' : '应用未内置共享账号或密钥。未连接模型时仍可整理本地资料。'}</p></div><div class="settings-actions"><button class="button button-primary" type="submit" data-busy-disable>${icon('check')}保存设置</button><button class="button button-outline" type="button" data-action="test-model" data-busy-disable>${icon('link')}检测连接</button></div><div class="settings-result" id="model-result" hidden></div></form></section></div>
  <div class="settings-side"><section class="settings-panel"><div class="settings-title"><span class="settings-symbol aqua">${icon('globe')}</span><div><h2>学校系统 · Canvas</h2><p>SCHOOL CONNECTION</p></div></div><form id="canvas-form"><div class="field"><label for="canvas-base">学校 Canvas 地址</label><input class="field-input" id="canvas-base" name="baseUrl" type="url" placeholder="https://你的学校.instructure.com" value="${h(canvas.baseUrl)}" required></div><div class="field"><label for="canvas-token">本人 API Token <span>${canvas.hasToken?'已保存':'按学校授权情况提供'}</span></label><input class="field-input" id="canvas-token" name="apiToken" type="password" autocomplete="new-password" placeholder="${canvas.hasToken?'留空保留现有 Token':'仅在你有权使用时填写'}"><p class="field-help">浏览器登录与应用 API 连接分开；没有可用 Token 时，可以手动下载并导入课程资料。</p></div><div class="settings-actions"><button class="button button-primary button-small" type="submit" data-busy-disable>保存连接</button><button class="button button-outline button-small" type="button" data-action="test-canvas" data-busy-disable>核验连接</button><button class="button button-quiet button-small" type="button" data-action="open-school">打开学校 ↗</button></div><div class="connection-status ${canvas.status==='connected' || canvas.status==='verified' ? 'good':''}"><i></i>${h(canvas.status==='connected' || canvas.status==='verified' ? '学校 API 连接已核验' : canvas.hasToken ? '已保存配置，待核验连接' : '学校 API 尚未连接')}</div><div class="settings-result" id="canvas-result" hidden></div></form><button class="button button-outline button-small section-spacer" data-action="discover-courses" data-busy-disable>${icon('search')}发现可访问课程</button></section><section class="settings-panel"><div class="settings-title"><span class="settings-symbol">${icon('folder')}</span><div><h2>私人资料空间</h2><p>LOCAL FIRST</p></div></div><div class="workspace-location">${h(state.workspace || '首次启动后会建立本机工作空间。')}</div>${button('选择已有资料库','choose-workspace','folder','outline','class="button-small"')}<p class="field-help">切换目录后，课程、资料和任务按该目录读取；不会把私人资料写入分享包。</p></section><section class="settings-panel"><div class="privacy-lines"><div class="privacy-line">${icon('lock')}<div><b>密钥留在本机</b><p>分享 EXE 不会带上你的模型或学校凭据。</p></div></div><div class="privacy-line">${icon('shield')}<div><b>执行状态如实记录</b><p>保存、读取、生成、审阅和正式提交分别核验。</p></div></div></div></section></div></div>`;
}
function render() {
  const renderers={overview:renderOverview,courses:renderCourses,library:renderLibrary,workbench:renderWorkbench,schedules:renderSchedules,audit:renderAudit,'school-login':renderSchoolLogin,settings:renderSettings};
  content.innerHTML=(renderers[ui.route] || renderOverview)();
  if (ui.busy) document.querySelectorAll('[data-busy-disable]').forEach(el=>el.disabled=true);
}
function openModal(title, subtitle, body, wide = false) {
  clearModalPasswords();
  modal.className=`modal${wide?' wide':''}`;
  modal.innerHTML=`<div class="modal-top"><div><h2>${h(title)}</h2>${subtitle ? `<p>${h(subtitle)}</p>`:''}</div><button class="modal-close" data-action="close-modal" aria-label="关闭弹窗">${icon('close')}</button></div><div class="modal-body">${body}</div>`;
  if (!modal.open) modal.showModal();
}
function clearModalPasswords() {
  modal.querySelectorAll('input[type="password"]').forEach(input=>{input.value='';});
}
function loginForm(initial = {}) {
  const school=initial.schoolUrl || state.canvas.baseUrl || selectedCourse()?.school_origin || '';
  const remembering=Boolean(initial.rememberPassword);
  openModal(initial.id?'修改学校登录':'添加学校账号','先填写自己的信息，再到学校页面演示登录。',`<form id="school-login-form" method="post" autocomplete="off">
    <div class="form-error" hidden></div><input type="hidden" name="profileId" value="${h(initial.id)}">
    <div class="field-row"><div class="field"><label for="login-name">学校名称</label><input class="field-input" id="login-name" name="name" placeholder="例如：我的大学" value="${h(initial.name)}" maxlength="100" required></div><div class="field"><label for="login-lms">学校系统</label><select class="field-select" id="login-lms" name="lmsType">${[['canvas','Canvas'],['blackboard','Blackboard'],['other','其他学校系统']].map(([id,label])=>`<option value="${id}" ${initial.lmsType===id?'selected':''}>${label}</option>`).join('')}</select></div></div>
    <div class="field"><label for="login-school-url">学校入口</label><input class="field-input" id="login-school-url" name="schoolUrl" type="url" placeholder="https://学校的正式网址" value="${h(school)}" required><p class="field-help">填写平时进入课程系统的正式地址。</p></div>
    <div class="field"><label for="login-entry-url">登录页面 <span>可选</span></label><input class="field-input" id="login-entry-url" name="loginUrl" type="url" placeholder="留空则使用上面的学校入口" value="${h(initial.loginUrl)}"></div>
    <div class="field"><label for="login-email">学校邮箱或账号</label><input class="field-input" id="login-email" name="email" autocomplete="username" placeholder="你的学校邮箱" value="${h(initial.email)}" maxlength="254" required></div>
    <label class="login-remember"><input id="login-remember" type="checkbox" name="rememberPassword" ${remembering?'checked':''}><span><b>在这台电脑加密保存密码</b><small>可选。勾选后，程序可在已确认的登录页面填写；你也可以在学校页面直接输入。</small></span></label>
    <div class="field"><label for="login-password">学校密码 <span>${initial.hasPassword?'已加密保存':'可选'}</span></label><input class="field-input" id="login-password" name="password" type="password" autocomplete="new-password" placeholder="${initial.hasPassword?'留空保留已保存的密码':'勾选上方选项后可填写'}" ${remembering?'':'disabled'}><p class="field-help">密码不会回显，也不会进入 AI 提示词。取消勾选并保存会移除已保存的密码。</p></div>
    <details class="login-origins"><summary>Google、Microsoft 或其他统一登录网站</summary><div class="field"><label for="login-origins">允许填写账号的登录网站 <span>可选，每行一个</span></label><textarea class="field-textarea" id="login-origins" name="allowedOrigins" rows="3" placeholder="https://accounts.google.com&#10;https://login.microsoftonline.com">${h((initial.allowedOrigins || []).join('\n'))}</textarea><p class="field-help">只添加你确认属于学校登录流程的网站，填写完整的 https:// 域名。学校入口和登录页面本身会自动加入。</p></div></details>
    <div class="modal-actions"><button type="button" class="button button-outline" data-action="close-modal">取消</button><button type="submit" class="button button-primary" data-busy-disable>${icon('check')}保存学校账号</button></div>
  </form>`,true);
}
async function saveLogin(form) {
  if (!form.reportValidity()) return;
  const data=new FormData(form); data.delete('password');
  const values=Object.fromEntries(data);
  const passwordInput=form.elements.password;
  const payload={id:values.profileId || undefined,name:values.name,lmsType:values.lmsType,schoolUrl:values.schoolUrl,loginUrl:values.loginUrl || values.schoolUrl,email:values.email,rememberPassword:form.elements.rememberPassword.checked,allowedOrigins:String(values.allowedOrigins || '').split(/[\s,]+/).filter(Boolean)};
  if (payload.rememberPassword && passwordInput.value) payload.password=passwordInput.value;
  try { await call('login.save',payload); }
  finally { passwordInput.value=''; if (payload.password) delete payload.password; }
  await refresh(); modal.close(); navigate('school-login');
  toast('学校账号已保存。点击“演示一次登录”开始。');
}
function confirmLoginAction(profile, action) {
  const options={
    'login-delete':['删除学校账号','将删除这台电脑保存的账号设置、密码、登录步骤和浏览器会话。','删除账号'],
    'login-clear-session':['退出学校登录','将清除这个学校的内置浏览器会话。账号设置和已保存的密码仍会保留。','退出并清除会话'],
    'login-forget':['忘记登录步骤','下次需要重新演示登录。学校账号与现有会话仍会保留。','忘记步骤']
  };
  const [title,detail,label]=options[action];
  openModal(title,profile.name,`<p class="login-confirm-copy">${h(detail)}</p><div class="modal-actions">${button('取消','close-modal','','outline')}${button(label,'confirm-'+action,'close','primary',`data-id="${h(profile.id)}" data-busy-disable`)}</div>`);
}
function newCourse(initial = {}) {
  const origin=initial.school_origin || state.canvas.baseUrl || '';
  openModal('建立课程空间','课程编号、学期和学校共同区分一门课。',`<form id="new-course-form"><div class="form-error" hidden></div><div class="field"><label for="course-title">课程名称</label><input class="field-input" id="course-title" name="title" placeholder="例如：课程代码 · 课程名称" value="${h(initial.title)}" required></div><div class="field"><label for="school-origin">学校系统地址</label><input class="field-input" id="school-origin" name="school_origin" type="url" placeholder="https://学校的正式 LMS 地址" value="${h(origin)}" required></div><div class="field-row"><div class="field"><label for="course-id">官方课程 ID</label><input class="field-input" id="course-id" name="course_id" placeholder="课程页面中的真实编号" value="${h(initial.course_id)}" required></div><div class="field"><label for="course-section">Section <span>可选</span></label><input class="field-input" id="course-section" name="section" placeholder="班别或 section" value="${h(initial.section)}"></div></div><div class="field"><label for="course-term">学期</label><input class="field-input" id="course-term" name="term" placeholder="例如：2026 Fall · 第一期" value="${h(initial.term)}" required></div><p class="field-help">建好后先导入完整官方 syllabus，核对教材、考核和课程政策。</p><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-modal">取消</button><button type="submit" class="button button-primary" data-busy-disable>${icon('plus')}建立课程</button></div></form>`);
}
function newSchedule() {
  if (!state.courses.length) { newCourse(); return; }
  openModal('安排每周节奏','计划只在程序运行期间执行。',`<form id="schedule-form"><div class="form-error" hidden></div><div class="field"><label for="schedule-title">计划名称</label><input class="field-input" id="schedule-title" name="title" placeholder="例如：周初课程资料同步" required></div><div class="field"><label for="schedule-course">关联课程</label><select class="field-select" id="schedule-course" name="courseKey">${courseOptions(selectedCourse()?.key)}</select></div><div class="field"><label for="schedule-mode">执行内容</label><select class="field-select" id="schedule-mode" name="mode"><option value="sync">同步课程资料</option><option value="reminder">课程进度提醒</option></select></div><div class="field-row"><div class="field"><label for="schedule-day">每周</label><select class="field-select" id="schedule-day" name="day">${[[1,'周一'],[2,'周二'],[3,'周三'],[4,'周四'],[5,'周五'],[6,'周六'],[0,'周日']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></div><div class="field"><label for="schedule-time">本机时间</label><input class="field-input" id="schedule-time" name="time" type="time" value="09:00" required></div></div><p class="field-help">电脑关闭或退出应用时不会运行。课程同步仍需有效的学校 API 连接。</p><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-modal">取消</button><button type="submit" class="button button-primary" data-busy-disable>${icon('calendar')}保存计划</button></div></form>`);
}
function importMaterials(initialKind = 'auto') {
  if (!state.courses.length) { newCourse(); return; }
  const types=[['auto','自动识别 · 按文件名初步分类'],['syllabus','官方 syllabus / 课程大纲'],['rubric','评分量表 / Rubric'],['assignment','作业题干与要求'],['textbook','教材原件'],['textbook_notes','自写阅读笔记'],['lecture','课堂讲义 / 课堂材料'],['research','研究来源 / 其他材料']];
  openModal('导入课程资料','先确定课程与资料类型，再从本机选择文件。',`<form id="import-form"><div class="form-error" hidden></div><div class="field"><label for="import-course">保存到课程</label><select class="field-select" id="import-course" name="courseKey">${courseOptions(selectedCourse()?.key)}</select></div><div class="field"><label for="import-kind">资料类型</label><select class="field-select" id="import-kind" name="kind">${types.map(([id,label])=>`<option value="${id}" ${initialKind===id?'selected':''}>${label}</option>`).join('')}</select><p class="field-help">名称只有编号的文件也可以明确指定为 syllabus 或 rubric。教材原件与自己的阅读笔记分别保存。</p></div><p class="field-help">可选 PDF、Word、TXT、Markdown 等文件。选择多份文件时，它们会使用相同的类型；不同类型请分批导入。保存并不代表已经完成全文阅读。</p><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-modal">取消</button><button type="submit" class="button button-primary" data-busy-disable>${icon('import')}选择文件并导入</button></div></form>`);
}
function modelValues(form) {
  const values=Object.fromEntries(new FormData(form));
  if (!values.apiKey?.trim()) delete values.apiKey;
  return values;
}
function canvasValues(form) {
  const values=Object.fromEntries(new FormData(form));
  if (!values.apiToken?.trim()) delete values.apiToken;
  return values;
}
function resultText(result) {
  if (typeof result === 'string') return result;
  if (result?.message) return result.message;
  if (Array.isArray(result?.models)) return `接口返回 ${result.models.length} 个模型。请确认所填模型支持当前请求类型。`;
  return '连接核验完成。实际生成还需模型支持所选请求类型。';
}
async function saveModel(form, test = false) {
  if (!form.reportValidity()) return;
  const values=modelValues(form);
  await call('models.save',values);
  form.elements.apiKey.value='';
  await refresh(); updateChrome();
  if (test) {
    const result=await call('models.test');
    const box=document.getElementById('model-result');
    if (box) { box.hidden=false; box.textContent=resultText(result); }
    toast('已收到接口核验结果。');
  } else { render(); toast('模型设置已保存。'); }
}
async function saveCanvas(form, test = false) {
  if (!form.reportValidity()) return;
  await call('canvas.save',canvasValues(form));
  form.elements.apiToken.value='';
  await refresh();
  if (test) {
    const result=await call('canvas.test');
    await refresh(); render();
    const box=document.getElementById('canvas-result');
    if (box) { box.hidden=false; box.textContent=resultText(result); }
    toast('已收到学校连接核验结果。');
  } else { render(); toast('学校连接设置已保存。'); }
}
function snapshotComposer() {
  if (document.getElementById('work-question')) ui.question=document.getElementById('work-question').value;
  if (document.getElementById('work-task')) ui.task=document.getElementById('work-task').value;
}
async function generate() {
  snapshotComposer();
  const course=selectedCourse();
  if (!course) { newCourse(); return; }
  if (!hasModel()) { navigate('settings'); toast('先配置自己的模型接口。'); return; }
  if (ui.mode==='question' && !ui.question.trim()) { toast('先写下你想问的问题。'); document.getElementById('work-question')?.focus(); return; }
  const request={courseKey:course.key,mode:ui.mode,question:ui.question};
  if (ui.task) request.taskKey=ui.task;
  ui.generating=true; render();
  try {
    const result=await call('generate',request);
    ui.output=result.output || result;
    if (!ui.output.text && result.text) ui.output={...result};
    await refresh();
    if (ui.output.id) ui.output=state.outputs.find(o=>String(o.id)===String(ui.output.id)) || ui.output;
    if (ui.output.complete===false) toast('模型返回了未完成内容，请先补齐后再使用。',true);
    else if (ui.output.gaps?.length) toast(`内容已保存，仍有 ${ui.output.gaps.length} 项资料缺口需要核对。`);
    else if (ui.output.warning) toast('内容已保存，请先核对界面上的生成提示。');
    else toast('内容已生成，请继续核对与修改。');
  } finally { ui.generating=false; render(); }
}
async function showPreview(courseKey,id) {
  const result=await call('material.preview',{courseKey,id});
  openModal(result.title || '资料预览','按实际保存范围查看，不将部分资料视作整本教材。',`<pre class="preview-text">${h(result.text || '这份文件暂时没有可用的文字预览，请打开原文件核对正文。')}</pre>${result.path ? `<p class="preview-path">${h(result.path)}</p><div class="modal-actions">${button('打开原文件','open-preview-file','external','outline',`data-path="${h(result.path)}"`)}</div>`:''}`,true);
}
async function discoverCourses() {
  const result=await call('canvas.discover');
  ui.discovered=Array.isArray(result) ? result : result.courses || [];
  openModal('可访问的课程','选择需要建立空间的课程，并核对学期信息。',ui.discovered.length ? ui.discovered.map((c,i)=>`<div class="discover-row"><span class="file-icon aqua">${icon('book')}</span><div><h3>${h(c.name || c.title || c.course_code || c.id)}</h3><p>ID ${h(c.id || c.course_id)} · ${h(c.term?.name || c.term || '学期待确认')}</p></div><button class="button button-outline button-small" data-action="add-discovered-course" data-index="${i}">${icon('plus')}添加</button></div>`).join('') : '<div class="empty-inline">没有返回可导入的课程。请核对本人账号、学校地址与可访问的在读课程。</div>');
}

document.addEventListener('click', event=>{
  const element=event.target.closest('button[data-route],button[data-action]');
  if (!element || element.disabled) return;
  if (element.dataset.route) { snapshotComposer(); navigate(element.dataset.route); return; }
  const action=element.dataset.action;
  if (action==='close-modal') { modal.close(); return; }
  if (action==='new-login') { loginForm(); return; }
  if (action==='go-school-login') { navigate('school-login'); return; }
  if (action==='login-edit') { const profile=state.logins.find(p=>p.id===element.dataset.id); if (profile) loginForm(profile); return; }
  if (['login-delete','login-clear-session','login-forget'].includes(action)) {
    const profile=state.logins.find(p=>p.id===element.dataset.id);
    if (profile) confirmLoginAction(profile,action);
    return;
  }
  if (action==='new-course') { newCourse(); return; }
  if (action==='new-schedule') { newSchedule(); return; }
  if (action==='import-materials' || action==='import-syllabus') {
    if (ui.busy) { toast('上一项操作还在进行，请稍等。'); return; }
    importMaterials(action==='import-syllabus' ? 'syllabus' : 'auto'); return;
  }
  if (action==='go-settings') { navigate('settings'); return; }
  if (action==='go-workbench') { navigate('workbench'); return; }
  if (action==='open-course') { setCourse(element.dataset.key); ui.search=''; ui.filter='all'; navigate('library'); return; }
  if (action==='search') { navigate('library'); setTimeout(()=>document.getElementById('material-search')?.focus(),0); return; }
  if (action==='filter-materials') { ui.filter=element.dataset.filter; render(); document.getElementById('material-search')?.focus(); return; }
  if (action==='set-mode') { snapshotComposer(); ui.mode=element.dataset.mode; render(); return; }
  if (action==='start-review') { ui.mode='review'; navigate('workbench'); return; }
  if (action==='select-output') { ui.output=state.outputs.find(o=>String(o.id)===String(element.dataset.id)); document.getElementById('output-panel').innerHTML=renderOutput(); return; }
  if (action==='add-discovered-course') {
    const c=ui.discovered[Number(element.dataset.index)];
    if (c) newCourse({title:c.name||c.title||c.course_code,course_id:String(c.id||c.course_id),school_origin:c.school_origin||state.canvas.baseUrl,section:c.section||c.course_code,term:typeof c.term==='object'?c.term?.name:c.term});
    return;
  }
  run(async()=>{
    if (action==='login-record' || action==='login-reuse') {
      await call('login.open',{id:element.dataset.id,mode:action==='login-record'?'record':'reuse'});
      await refresh(); render();
      toast(action==='login-record'?'请在登录窗口演示一次，完成后回来检查登录状态。':'学校窗口已打开，优先使用已有会话。');
      return;
    }
    if (action==='login-verify') return mutation('login.verify',{id:element.dataset.id},'登录状态已检查，请查看账号卡片。');
    if (action==='login-fill') return mutation('login.fill',{id:element.dataset.id},'已处理填写请求，请在学校窗口确认。');
    if (action==='confirm-login-delete') { await call('login.delete',{id:element.dataset.id}); await refresh(); modal.close(); render(); toast('这个学校账号已从本机移除。'); return; }
    if (action==='confirm-login-clear-session') { await call('login.clearSession',{id:element.dataset.id}); await refresh(); modal.close(); render(); toast('该学校的内置浏览器会话已清除。'); return; }
    if (action==='confirm-login-forget') { await call('login.forgetRecording',{id:element.dataset.id}); await refresh(); modal.close(); render(); toast('已忘记登录步骤，可以重新演示。'); return; }
    if (action==='choose-workspace') return mutation('workspace.choose',{},'已切换本地资料空间。');
    if (action==='sync-course') {
      const course=selectedCourse();
      if (!course) { newCourse(); return; }
      return mutation('canvas.sync',{courseKey:course.key},'课程同步操作已完成，请查看新资料与缺口。');
    }
    if (action==='preview-material') return showPreview(element.dataset.course,element.dataset.id);
    if (action==='open-material') {
      const m=state.materials.find(m=>String(m.id)===String(element.dataset.id)&&String(m.courseKey)===String(element.dataset.course));
      if (m?.path) return call('file.open',{path:m.path});
    }
    if (action==='open-preview-file') return call('file.open',{path:element.dataset.path});
    if (action==='generate') return generate();
    if (action==='copy-output' && ui.output?.text) {
      if (bridge) await call('clipboard.write',{text:ui.output.text});
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(ui.output.text);
      else throw new Error('当前预览环境不支持剪贴板，请在桌面程序中复制内容。');
      toast('内容已复制。'); return;
    }
    if (action==='export-output' && ui.output?.id) {
      const result=await call('output.export',{id:ui.output.id});
      if (!result?.canceled && !result?.cancelled) toast('成果已导出。');
      return;
    }
    if (action==='test-model') return saveModel(document.getElementById('model-form'),true);
    if (action==='test-canvas') return saveCanvas(document.getElementById('canvas-form'),true);
    if (action==='discover-courses') return discoverCourses();
    if (action==='toggle-schedule') {
      const schedule=state.schedules.find(s=>String(s.id)===String(element.dataset.id));
      if (schedule) return mutation('schedule.toggle',{id:schedule.id,enabled:!schedule.enabled},schedule.enabled?'计划已停用。':'计划已启用，程序运行期间会按时检查。');
    }
    if (action==='open-school') {
      const typed=document.getElementById('canvas-base')?.value.trim();
      const url=typed || state.canvas.baseUrl || selectedCourse()?.school_origin;
      if (!url) { toast('先填写学校系统的正式地址。'); document.getElementById('canvas-base')?.focus(); return; }
      return call('external.open',{url});
    }
    if (action==='github') return call('external.open',{url:'https://github.com/kamegui0910-eng/campus-coursework'});
    if (action==='open-copyleaks') return call('external.open',{url:'https://copyleaks.com/ai-detector'});
    if (action==='open-turnitin') return call('external.open',{url:'https://www.turnitin.com/'});
  }, action==='generate' ? '正在调用模型生成内容…' : action==='sync-course' ? '正在核对课程与资料…' : '正在处理…');
});
document.addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target;
  const formId=form.getAttribute('id');
  if (!['new-course-form','schedule-form','model-form','canvas-form','import-form','school-login-form'].includes(formId)) return;
  run(async()=>{
    if (formId==='school-login-form') return saveLogin(form);
    if (formId==='model-form') return saveModel(form);
    if (formId==='canvas-form') return saveCanvas(form);
    const values=Object.fromEntries(new FormData(form));
    if (formId==='import-form') {
      const payload={courseKey:values.courseKey};
      if (values.kind!=='auto') payload.kind=values.kind;
      const result=await call('materials.import',payload);
      if (result?.canceled || result?.cancelled) return;
      setCourse(values.courseKey); ui.filter='all'; ui.search='';
      await refresh(); modal.close(); render();
      const imported=Number(result?.imported || 0), failed=Array.isArray(result?.failed) ? result.failed : [];
      if (failed.length && !imported) toast(`未成功导入。${failed[0].message || '请查看需要补充核验的记录。'}`,true);
      else toast(`已导入 ${imported} 份资料${failed.length ? `，${failed.length} 份需要补充核验` : '，读取与来源状态仍需核验'}。`);
    }
    if (formId==='new-course-form') {
      const result=await call('course.create',values);
      await refresh();
      const course=courseFor(result?.key || result?.course?.key) || state.courses.find(c=>String(c.course_id)===values.course_id&&c.term===values.term);
      if (course) setCourse(course.key);
      modal.close(); navigate('library'); toast('课程空间已建立。先导入完整官方大纲。');
    }
    if (formId==='schedule-form') {
      await call('schedule.save',{...values,day:Number(values.day),enabled:true});
      await refresh(); modal.close(); render(); toast('计划已保存，程序运行期间会按时检查。');
    }
  },'正在保存…');
});
document.addEventListener('change',event=>{
  if (event.target.id==='login-remember') {
    const password=document.getElementById('login-password');
    if (password) { password.disabled=!event.target.checked; if (password.disabled) password.value=''; }
  }
  if (event.target.id==='library-course') { setCourse(event.target.value); document.getElementById('material-rows').innerHTML=materialRows(); }
  if (event.target.id==='work-course') { snapshotComposer(); setCourse(event.target.value); render(); }
  if (event.target.id==='work-task') ui.task=event.target.value;
});
document.addEventListener('input',event=>{
  if (event.target.id==='material-search') { ui.search=event.target.value; document.getElementById('material-rows').innerHTML=materialRows(); }
  if (event.target.id==='work-question') ui.question=event.target.value;
});
document.addEventListener('keydown',event=>{
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='k') {
    event.preventDefault();
    if (modal.open) modal.close();
    navigate('library'); document.getElementById('material-search')?.focus();
  }
});
modal.addEventListener('click',event=>{
  if (event.target!==modal) return;
  const box=modal.getBoundingClientRect();
  if (event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom) modal.close();
});
modal.addEventListener('close',()=>{clearModalPasswords(); modal.innerHTML='';});

async function start() {
  document.getElementById('search-icon').innerHTML=icon('search');
  document.getElementById('github-icon').innerHTML=icon('github');
  document.querySelector('.spark').innerHTML=icon('spark');
  document.getElementById('preview-banner').hidden=bridge;
  updateChrome(); render();
  if (bridge) {
    if (window.campus.onProgress) window.campus.onProgress(progress=>{
      const message=typeof progress==='string'?progress:progress?.message || progress?.title || '正在处理…';
      if (ui.busy) document.getElementById('runtime-status').textContent=message;
      if (ui.route==='school-login' && !modal.open && !ui.busy && (progress?.scope==='login' || progress?.loginId)) {
        refresh().then(render).catch(()=>{});
      }
    });
    try { await refresh(); render(); }
    catch(error) { toast(error?.message || '暂时无法读取本地工作空间。',true); }
  }
}
start();
