import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const digest = value => createHash('sha256').update(value).digest('hex');
const need = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`缺少 ${name}`);
  return value.trim();
};
const stableUrl = value => {
  const url = new URL(need(value, '稳定来源网址'));
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      [...url.searchParams.keys()].some(key => /^(access_token|token|code|signature|sig|x-amz-.+)$/i.test(key))) {
    throw new Error('请提供不含密码、令牌或临时签名的正规稳定入口');
  }
  return url.href;
};
export function courseIdentity(input) {
  const origin = new URL(stableUrl(input.school_origin)).origin;
  return { school_origin: origin, course_id: need(input.course_id, '官方课程ID'),
    term: need(input.term, '学期'), section: input.section || null };
}
export function courseDirectory(root, input) {
  const course = courseIdentity(input);
  return path.join(path.resolve(root), 'courses', `course-${digest(JSON.stringify(course)).slice(0, 20)}`);
}
const taskKey = task => digest(JSON.stringify([
  need(task.platform, '平台'), need(task.item_id, '作业ID'), need(task.component, '作业组成部分')
])).slice(0, 20);
const stamp = () => new Date().toISOString();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const save = (file, value) => {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temp, file);
};

function inspectFile(file) {
  const data = fs.readFileSync(file);
  if (!data.length || !data.toString('utf8').trim()) throw new Error('文件为空，不能记为已下载');
  const start = data.subarray(0, 16384).toString('utf8');
  if (/<input\b[^>]*type\s*=\s*["']?password/i.test(start) ||
      /<title[^>]*>[^<]*(sign in|log in|login|登录)/i.test(start)) {
    throw new Error('保存到的是登录页，尚未取得需要的资料');
  }
  const ext = path.extname(file).toLowerCase();
  if (ext === '.pdf' && !data.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new Error('文件内容不是有效的PDF开头，不能记为已下载');
  }
  if (['.docx', '.xlsx', '.pptx'].includes(ext) && data.subarray(0, 2).toString() !== 'PK') {
    throw new Error('文件内容不是相应的Office文件，需重新下载并打开核验');
  }
  return { data, sha256: digest(data), ext: /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '.bin' };
}

const causes = {
  login_required: '学校或教材账号还没登录成功，所以暂时拿不到这份资料。',
  mfa_required: '登录页面要求你本人用手机或其他验证方式确认，完成后才能继续。',
  permission_denied: '当前账号没有这份资料的访问权限；请先核对账号和选课权限。',
  not_published: '老师还没开放这份资料，开放后再自动检查。',
  online_only: '这个入口目前只允许在线阅读，尚未取得可下载文件；可保留合法阅读笔记和定位。',
  download_timeout: '下载没有在规定时间内完成；目前不能确定是网络还是网站响应造成的。',
  invalid_file: '拿到的文件为空、损坏或只是登录页面，还不是需要的正文。',
  local_save_failed: '资料已找到，但没有成功保存到本机；请检查实际报错和保存位置。',
  cloud_upload_failed: '资料已经保存在本机，但还没成功传到当前云端任务；可以从该任务的正式附件入口手动上传。',
  unknown: '这次没有成功拿到资料，现有信息还不足以确定原因。'
};

function collectBundle(catalog, key, dir) {
  const task = catalog.assignments[key];
  if (!task) throw new Error('找不到这个作业ID和组成部分，不能按标题猜测资料');
  const gaps = [];
  if (task.review_required) gaps.push('资料或要求已更新，需要重新核对作业绑定');
  if (task.requirements_status !== 'live_verified') gaps.push('作业要求尚未完成本次学校实时复核');
  if (!task.dependencies.length) gaps.push('尚未建立作业资料依赖');
  const kinds = task.dependencies.map(dep => catalog.materials[dep.material_id]?.kind);
  if (!kinds.includes('syllabus')) gaps.push('尚未绑定完整官方syllabus基线');
  if (!kinds.includes('assignment')) gaps.push('尚未绑定保存的作业完整要求');
  if (task.rubric_status === 'unknown') gaps.push('尚未核实这项作业的rubric');
  if (task.rubric_status === 'separate' && !kinds.includes('rubric')) gaps.push('尚未绑定单独发布的rubric');
  if (task.rubric_status === 'embedded' && !task.dependencies.some(dep =>
    catalog.materials[dep.material_id]?.kind === 'assignment' && dep.locators.includes('rubric'))) {
    gaps.push('尚未绑定题干中内嵌的rubric范围');
  }
  const sources = task.dependencies.map(dep => {
    const material = catalog.materials[dep.material_id];
    const version = material?.versions.find(item => item.version === dep.version);
    if (!version) { gaps.push(`找不到资料版本：${dep.material_id}/${dep.version}`); return dep; }
    if (material.current_version !== dep.version) gaps.push(`资料已有新版：${dep.material_id}`);
    if (!version.file) gaps.push(`资料尚未保存为可复用文件或笔记：${dep.material_id}`);
    else {
      const actual = path.resolve(dir, version.file);
      if (!fs.existsSync(actual) || digest(fs.readFileSync(actual)) !== version.sha256) {
        gaps.push(`资料文件缺失或哈希已变：${dep.material_id}`);
      }
    }
    for (const locator of dep.locators) {
      if (!version.coverage.includes(locator)) gaps.push(`未取得所需范围：${dep.material_id} ${locator}`);
      if (dep.requires_read && !version.reading.covered.includes(locator)) {
        gaps.push(`尚未实际读取：${dep.material_id} ${locator}`);
      }
    }
    for (const incident of Object.values(catalog.incidents)) {
      const relevant = !incident.locators?.length || incident.locators.includes('all') || dep.locators.includes('all') ||
        incident.locators.some(locator => dep.locators.includes(locator));
      if (incident.material_id === dep.material_id && incident.status === 'open' && relevant) gaps.push(incident.explanation);
    }
    return { ...dep, kind: material.kind, title: material.title, source_url: version.source_url,
      file: version.file, absolute_file: version.file ? path.resolve(dir, version.file) : null,
      sha256: version.sha256, storage: version.storage, reading: version.reading };
  });
  return { course: catalog.course, task_key: key, title: task.title, week: task.week,
    module: task.module, requirements_revision: task.requirements_revision,
    requirements_checked_at: task.requirements_checked_at, generated_at: stamp(),
    requirements_status: task.requirements_status,
    status: gaps.length ? 'Blocked' : 'ReadyForWork', gaps: [...new Set(gaps)], sources,
    bundle_fingerprint: digest(JSON.stringify({ course: catalog.course, task_key: key,
      requirements_revision: task.requirements_revision, dependencies: sources.map(source => ({
        material_id: source.material_id, version: source.version, locators: source.locators,
        requires_read: source.requires_read, sha256: source.sha256 })) })),
    note: '只包含明确绑定的资料和定位；ReadyForWork不表示审计放行或提交成功。' };
}

// One catalog writer per course. This helper never logs in, downloads, reads a book, or submits work.
export function runRequest(root, request) {
  const course = courseIdentity(request.course);
  const dir = courseDirectory(root, course);
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, '.library.lock');
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx'); }
  catch { throw new Error('这门课的资料库正在更新或上次操作未正常结束；先核对写入者，不要并发覆盖'); }
  try {
    const file = path.join(dir, 'library.json');
    const exists = fs.existsSync(file);
    const catalog = exists ? JSON.parse(fs.readFileSync(file, 'utf8')) : {
      schema_version: 1, course, collection_mode: 'incremental', materials: {}, assignments: {}, incidents: {}
    };
    if (!same(catalog.course, course)) throw new Error('课程身份不匹配');
    let output;
    if (request.action === 'init') {
      if (request.collection_mode) {
        if (!['incremental', 'all_published'].includes(request.collection_mode)) throw new Error('未知采集模式');
        catalog.collection_mode = request.collection_mode;
      }
      output = { course, course_directory: dir, library_file: file, collection_mode: catalog.collection_mode };
    } else if (!exists) throw new Error('先init建立这门课的资料库');
    else if (request.action === 'material') {
      const item = request.material;
      const id = need(item.id, '资料ID');
      if (!same(courseIdentity(item.verified_course), course)) throw new Error('导入文件的已核验课程与目标课程不同');
      if (item.verification?.content_verified !== true) throw new Error('尚未实际打开核验正文，不能导入为有效资料');
      need(item.verification.evidence, '正文、课程和版本核验依据');
      if (!['downloaded', 'snapshot', 'notes', 'online_only'].includes(item.storage)) throw new Error('未知保存状态');
      if (!Array.isArray(item.coverage) || !item.coverage.length || item.coverage.some(x => typeof x !== 'string' || !x.trim())) {
        throw new Error('需列出实际保存范围coverage，不能假设整本或全课程');
      }
      const reading = item.reading || { state: 'not_read', covered: [], missing: [] };
      if (!['not_read', 'partial', 'read'].includes(reading.state) || !Array.isArray(reading.covered) ||
          reading.covered.some(x => !item.coverage.includes(x))) throw new Error('读取覆盖必须属于实际资料范围');
      if (reading.covered.length) { need(reading.evidence, '实际阅读依据'); need(reading.read_at, '实际阅读时间'); }
      if (reading.state === 'not_read' && reading.covered.length) throw new Error('未读状态不能同时声称已读');
      if (reading.state === 'read' && item.coverage.some(x => !reading.covered.includes(x))) throw new Error('未覆盖全部列出范围，需记partial');
      const sourceUrl = stableUrl(item.source_url);
      const local = item.file ? inspectFile(path.resolve(item.file)) : null;
      if (item.storage !== 'online_only' && !local) throw new Error('这个保存状态需要实际文件');
      if (item.storage === 'online_only' && local) throw new Error('有笔记/快照时请用notes或snapshot，不能写成原教材下载');
      const kind = need(item.kind, '资料类型');
      const version = digest(JSON.stringify({ sha256: local?.sha256 || null, source_url: sourceUrl,
        source_revision: item.source_revision || null, coverage: item.coverage, storage: item.storage, kind,
        bibliography: item.bibliography || null, applies_to: item.applies_to || null }));
      const material = catalog.materials[id] || { id, kind, title: need(item.title, '资料标题'), current_version: null, versions: [] };
      if (material.kind !== kind) throw new Error('同一资料ID不能改成另一种资料类型');
      const previous = material.current_version;
      let record = material.versions.find(value => value.version === version);
      if (!record) {
        const relative = local ? `materials/${digest(id).slice(0, 20)}/${version}${local.ext}` : null;
        if (local) {
          const destination = path.join(dir, relative);
          fs.mkdirSync(path.dirname(destination), { recursive: true });
          if (!fs.existsSync(destination)) fs.writeFileSync(destination, local.data, { flag: 'wx' });
          else if (digest(fs.readFileSync(destination)) !== local.sha256) throw new Error('资料库存档被改动，停止导入');
        }
        record = { version, source_url: sourceUrl, source_revision: item.source_revision || null,
          file: relative, sha256: local?.sha256 || null, storage: item.storage, coverage: item.coverage,
          bibliography: item.bibliography || null, applies_to: item.applies_to || null,
          reading, verification: item.verification, imported_at: stamp(), last_checked_at: stamp() };
        material.versions.push(record);
      } else {
        if (item.reading) record.reading = reading;
        record.verification = item.verification; record.last_checked_at = stamp();
      }
      material.current_version = version;
      material.title = need(item.title, '资料标题');
      catalog.materials[id] = material;
      const affected = [];
      if (previous && previous !== version) {
        for (const [key, task] of Object.entries(catalog.assignments)) {
          if (task.dependencies.some(dep => dep.material_id === id)) {
            task.review_required = true; task.audit_status = 'Stale'; affected.push(key);
          }
        }
      }
      if (item.resolves_incident_id) {
        const incident = catalog.incidents[item.resolves_incident_id];
        if (!incident || incident.material_id !== id || !local) throw new Error('缺少匹配的故障和已核验文件，不能解除资料缺口');
        const neededScope = incident.locators?.length ? incident.locators : ['all'];
        if (!item.coverage.includes('all') && neededScope.some(locator => !item.coverage.includes(locator))) {
          throw new Error('补充文件没有覆盖这次故障所需的章节/范围，不能解除其他章节的缺口');
        }
        if (incident.stage === 'cloud_upload' && (item.recovery_evidence?.destination_verified !== true ||
            !item.recovery_evidence?.reference)) {
          throw new Error('本机文件已保存不表示云端上传成功；需目标任务的实际附件/文件核验回执');
        }
        incident.status = 'resolved'; incident.resolved_at = stamp(); incident.resolved_version = version;
        if (item.recovery_evidence) incident.recovery_evidence = item.recovery_evidence;
      }
      output = { material_id: id, version, file: record.file, storage: record.storage, affected_task_keys: affected };
    } else if (request.action === 'assignment') {
      const task = request.task;
      const key = taskKey(task);
      need(task.requirements_revision, '作业要求版本');
      need(task.requirements_checked_at, '实际核验要求的时间');
      need(task.requirements_evidence, '题干、rubric及指定章节核验依据');
      if (!['live_verified', 'historical', 'unknown'].includes(task.requirements_status)) {
        throw new Error('需记录requirements_status为live_verified/historical/unknown');
      }
      if (!['separate', 'embedded', 'not_provided', 'unknown'].includes(task.rubric_status)) {
        throw new Error('需记录rubric_status为separate/embedded/not_provided/unknown');
      }
      if (!Array.isArray(task.dependencies)) throw new Error('缺少dependencies数组');
      for (const dep of task.dependencies) {
        need(dep.material_id, '绑定资料ID'); need(dep.version, '绑定资料版本');
        need(dep.purpose, '该资料对应的作业要求');
        if (!Array.isArray(dep.locators) || !dep.locators.length || dep.locators.some(x => typeof x !== 'string' || !x.trim())) {
          throw new Error('依赖需要明确章节/节/页或all定位，不能只写教材名称');
        }
        if (typeof dep.requires_read !== 'boolean') throw new Error('每项依赖需明确requires_read');
      }
      catalog.assignments[key] = { ...task, title: need(task.title, '作业标题'), review_required: false,
        audit_status: 'NotReviewed', updated_at: stamp() };
      output = { task_key: key, ...collectBundle(catalog, key, dir) };
    } else if (request.action === 'bundle') {
      const key = taskKey(request.task);
      output = collectBundle(catalog, key, dir);
      const destination = path.join(dir, 'bundles', `${key}.json`);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      save(destination, output);
      output.bundle_file = destination;
    } else if (request.action === 'incident') {
      const incident = request.incident;
      const code = incident.code || 'unknown';
      if (!Object.hasOwn(causes, code)) throw new Error('未知原因代码，请用unknown并保存实际现象');
      need(incident.evidence, '实际观察到的现象/证据位置');
      const entry = stableUrl(incident.entry_url);
      const id = need(incident.id, '故障ID');
      const materialId = need(incident.material_id, '目标资料ID');
      if (incident.locators && (!Array.isArray(incident.locators) || incident.locators.some(x => typeof x !== 'string' || !x.trim()))) {
        throw new Error('故障locators需要明确范围标签数组；不填表示整个资料');
      }
      if (incident.stage && !['lms_access', 'download', 'local_save', 'cloud_upload'].includes(incident.stage)) throw new Error('未知失败阶段');
      output = { id, material_id: materialId, locators: incident.locators || [], stage: incident.stage || 'download', code, evidence: incident.evidence,
        explanation: causes[code], status: ['not_published', 'online_only'].includes(code) ? 'limitation' : 'open',
        recorded_at: stamp(), entry_url: entry,
        manual_recovery: { navigation: need(incident.navigation, '手动打开路径'),
          expected_file: need(incident.expected_file, '应下载的文件或合法替代资料'),
          import_into: `${dir} → ${materialId}`,
          instructions: '在正规页面完成本人登录/验证，按允许方式下载资料；交回原任务或放入上述课程目录。重新打开并核验课程、版本及正文后导入，不能仅凭文件名解除缺口。不要在聊天发送密码或验证码。' } };
      catalog.incidents[id] = output;
    } else throw new Error('支持的action为init/material/assignment/bundle/incident');
    catalog.updated_at = stamp();
    save(file, catalog);
    return output;
  } finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== '--root' || args[2] !== '--request') {
      throw new Error('用法：node course-library.mjs --root 私人资料目录 --request 请求.json');
    }
    const result = runRequest(args[1], JSON.parse(fs.readFileSync(args[3], 'utf8').replace(/^\uFEFF/, '')));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
