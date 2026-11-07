'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = new Set(['canvas', 'blackboard', 'other']);
const LABELS = new Set(['student-login', 'login', 'continue', 'next', 'account', 'email', 'password', 'submit', 'other']);
const STATUSES = new Set(['unconfigured', 'recording', 'saved', 'window-open', 'verified', 'needs-user', 'expired', 'error', 'session-cleared']);
const clone = value => JSON.parse(JSON.stringify(value));
const text = (value, maximum, label, required = false) => {
  if (value != null && typeof value !== 'string') throw new Error(`${label}格式不正确。`);
  const result = (value || '').trim();
  if (required && !result) throw new Error(`请填写${label}。`);
  if (result.length > maximum || /[\u0000-\u001f]/.test(result)) throw new Error(`${label}过长或包含无效字符。`);
  return result;
};
function checkedUrl(value, label = '学校网址') {
  let url;
  try { url = new URL(text(value, 1500, label, true)); } catch { throw new Error(`请填写完整的${label}，例如 https://school.example。`); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
    throw new Error(`${label}请使用 HTTPS，并且不要在网址里放账号或密码。`);
  }
  if (url.search || url.hash) throw new Error(`${label}请填写不带问号参数的固定入口；临时登录链接可能含有验证码或会话信息。`);
  return url;
}
function checkedSelector(value) {
  if (!value) return undefined;
  const selector = text(value, 240, '登录步骤定位');
  // Structural selectors and type/name attributes never need an entered account or password.
  if (!/^[a-zA-Z0-9_#.\- >:+()[\]="']+$/.test(selector) || /\[(?!\s*(?:type|name)\s*=)/i.test(selector) ||
      /\[\s*(?:type|name)\s*=\s*["']?[^\]"']*[\s@:/]/i.test(selector) || /:has|:contains|:is|:not/i.test(selector)) {
    throw new Error('这条登录步骤含有不适合保存的定位信息，请重新演示。');
  }
  return selector;
}
function safeStep(input, origins) {
  if (!input || typeof input !== 'object' || !['navigate', 'click', 'field'].includes(input.kind)) throw new Error('登录步骤格式不正确。');
  const origin = checkedUrl(input.origin, '登录步骤网址').origin;
  if (!origins.includes(origin)) throw new Error('这个登录页面还没有获得允许，请先在学校登录设置中添加它的网址。');
  const result = { kind: input.kind, origin };
  if (input.path != null) {
    let url;
    try { url = new URL(String(input.path), origin); } catch { throw new Error('登录步骤的网址格式不正确。'); }
    if (url.origin !== origin) throw new Error('登录步骤不能跳到另一个未经允许的网站。');
    result.path = url.pathname.slice(0, 500).replace(/[a-zA-Z0-9_-]{40,}/g, ':redacted');
  }
  const selector = checkedSelector(input.selector);
  if (selector) result.selector = selector;
  if (input.kind === 'field') {
    if (!['email', 'password'].includes(input.field) || !selector) throw new Error('登录输入框只能记住账号框或密码框的位置。');
    result.field = input.field;
  }
  if (input.kind === 'click' && !selector) throw new Error('没有找到这一步的按钮位置，请重新演示。');
  if (LABELS.has(input.label)) result.label = input.label;
  return result;
}

async function createLoginStore({ dataDir, secretStore } = {}) {
  if (typeof dataDir !== 'string' || !dataDir) throw new Error('缺少学校登录资料目录。');
  const root = path.resolve(dataDir);
  fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, 'school-logins.json');
  const secrets = secretStore || { get: () => '', set: async () => { throw new Error('当前电脑无法加密保存密码，请使用登录窗口自行输入。'); } };
  let rows = [];
  if (fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    if (saved.schema_version !== 1 || !Array.isArray(saved.profiles)) throw new Error('学校登录设置格式不正确，请保留原文件并重新配置。');
    rows = saved.profiles.map(item => {
      if (!ID.test(item.id)) throw new Error('学校登录记录编号不正确。');
      const school = checkedUrl(item.schoolUrl), login = checkedUrl(item.loginUrl || item.schoolUrl, '登录入口');
      const origins = [...new Set([school.origin, login.origin, ...(item.allowedOrigins || []).map(value => checkedUrl(value, '允许的登录网站').origin)])];
      return {
        id: item.id, name: text(item.name, 100, '学校名称', true), lmsType: TYPES.has(item.lmsType) ? item.lmsType : 'other',
        schoolUrl: school.href, loginUrl: login.href, email: text(item.email, 254, '学校账号'), allowedOrigins: origins,
        rememberPassword: item.rememberPassword === true, steps: (item.steps || []).slice(-80).map(step => safeStep(step, origins)),
        lastStatus: STATUSES.has(item.lastStatus) ? item.lastStatus : 'unconfigured',
        lastMessage: text(item.lastMessage, 300, '登录状态'), lastVerifiedAt: typeof item.lastVerifiedAt === 'string' ? item.lastVerifiedAt : null
      };
    });
  }
  let pending = Promise.resolve();
  const key = id => `loginPassword:${id}`;
  const find = id => {
    if (!ID.test(String(id))) throw new Error('请先选择已保存的学校登录设置。');
    const profile = rows.find(item => item.id === id);
    if (!profile) throw new Error('没有找到这份学校登录设置，请重新选择。');
    return profile;
  };
  const persist = () => {
    const temporary = `${file}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({ schema_version: 1, profiles: rows }, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(temporary, file);
  };
  const mutate = action => {
    const work = pending.catch(() => {}).then(action);
    pending = work;
    return work;
  };
  const view = async profile => ({ ...clone(profile), hasPassword: Boolean(await secrets.get(key(profile.id))) });
  async function save(payload = {}) {
    return mutate(async () => {
      const previous = payload.id ? find(payload.id) : null;
      const school = checkedUrl(payload.schoolUrl ?? previous?.schoolUrl);
      const login = checkedUrl(payload.loginUrl || previous?.loginUrl || school.href, '登录入口');
      const email = text(payload.email ?? previous?.email, 254, '学校账号');
      const name = text(payload.name ?? previous?.name, 100, '学校名称', true);
      const lmsType = payload.lmsType || previous?.lmsType || 'other';
      if (!TYPES.has(lmsType)) throw new Error('请选择 Canvas、Blackboard 或其他学校系统。');
      const extra = payload.allowedOrigins ?? previous?.allowedOrigins ?? [];
      if (!Array.isArray(extra) || extra.length > 16) throw new Error('允许的登录网站最多填写16个。');
      const origins = [...new Set([school.origin, login.origin, ...extra.map(value => checkedUrl(value, '允许的登录网站').origin)])];
      const id = previous?.id || randomUUID();
      const changed = Boolean(previous && (new URL(previous.schoolUrl).origin !== school.origin || new URL(previous.loginUrl).origin !== login.origin || previous.email !== email));
      const rememberPassword = payload.rememberPassword == null ? Boolean(previous?.rememberPassword) : payload.rememberPassword === true;
      if (payload.password != null && typeof payload.password !== 'string') throw new Error('密码格式不正确。');
      const password = payload.password || '';
      if (password.length > 4096 || /\u0000/.test(password)) throw new Error('密码格式不正确。');
      const profile = {
        id, name, lmsType,
        schoolUrl: school.href, loginUrl: login.href, email, allowedOrigins: origins, rememberPassword,
        steps: changed ? [] : (previous?.steps || []).filter(step => origins.includes(step.origin)),
        lastStatus: changed ? 'unconfigured' : previous?.lastStatus || 'unconfigured',
        lastMessage: changed ? '账号或登录网站已更换，请重新登录。' : previous?.lastMessage || '',
        lastVerifiedAt: changed ? null : previous?.lastVerifiedAt || null
      };
      const existingPassword = await secrets.get(key(id));
      const keep = rememberPassword && !changed;
      const nextPassword = rememberPassword && password ? password : keep ? existingPassword : '';
      if (nextPassword !== existingPassword) await secrets.set(key(id), nextPassword);
      rows = previous ? rows.map(item => item.id === id ? profile : item) : [...rows, profile];
      persist();
      return { ...await view(profile), sessionResetRequired: changed };
    });
  }
  async function record(id, input) {
    return mutate(async () => {
      const profile = find(id), step = safeStep(input, profile.allowedOrigins);
      if (JSON.stringify(profile.steps.at(-1)) !== JSON.stringify(step)) profile.steps.push(step);
      profile.steps = profile.steps.slice(-80);
      persist();
      return view(profile);
    });
  }
  return {
    list: async () => { await pending.catch(() => {}); return Promise.all(rows.map(view)); },
    get: async id => { await pending.catch(() => {}); return view(find(id)); },
    credentials: async id => { await pending.catch(() => {}); const profile = find(id); return { email: profile.email, password: profile.rememberPassword ? await secrets.get(key(id)) || '' : '' }; },
    save, record,
    remove: id => mutate(async () => {
      const profile = find(id);
      if (await secrets.get(key(id))) await secrets.set(key(id), '');
      rows = rows.filter(item => item !== profile); persist(); return { removed: true };
    }),
    forgetRecording: id => mutate(async () => { const profile = find(id); profile.steps = []; profile.lastStatus = 'unconfigured'; profile.lastMessage = '登录步骤已清除，请重新演示。'; profile.lastVerifiedAt = null; persist(); return view(profile); }),
    updateStatus: (id, { status, message = '', verified = false } = {}) => mutate(async () => {
      if (!STATUSES.has(status)) throw new Error('登录状态不正确。');
      if (status === 'verified' && verified !== true) throw new Error('确认学校页面已登录后，才能标记登录成功。');
      const profile = find(id), password = await secrets.get(key(id));
      let safeMessage = text(message, 300, '登录状态');
      if (password) safeMessage = safeMessage.split(password).join('[已隐藏]');
      safeMessage = safeMessage.replace(/https?:\/\/[^\s]+/g, value => { try { const url = new URL(value); return url.origin + url.pathname; } catch { return '[登录网址]'; } });
      profile.lastStatus = status; profile.lastMessage = safeMessage;
      if (status === 'verified' && verified === true) profile.lastVerifiedAt = new Date().toISOString();
      if (['expired', 'session-cleared'].includes(status)) profile.lastVerifiedAt = null;
      persist(); return view(profile);
    })
  };
}

module.exports = { createLoginStore };
