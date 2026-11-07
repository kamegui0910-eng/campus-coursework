'use strict';
const path = require('node:path');

function createLoginBrowser({ BrowserWindow, session, ipcMain, dialog, store, parentWindow, onProgress } = {}) {
  const windows = new Map();
  const partitions = new Map();
  let closing = false;
  const emit = (message, level = 'info') => onProgress?.({ scope: 'login', title: '学校登录', detail: message, message, level });
  const safeUrl = value => {
    const url = new URL(String(value));
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('学校登录只支持正式 HTTPS 网站。');
    return url;
  };
  const live = context => Boolean(context?.window && !context.window.isDestroyed() && !context.window.webContents.isDestroyed());
  const profileSession = id => {
    if (!partitions.has(id)) partitions.set(id, session.fromPartition('persist:campus-login-' + id));
    return partitions.get(id);
  };
  const flush = async value => {
    await value.cookies.flushStore();
    await Promise.resolve(value.flushStorageData());
  };
  async function status(id, state, message, verified = false) {
    const result = await store.updateStatus(id, { status: state, message, verified });
    emit(message, state === 'error' ? 'error' : 'info');
    return result;
  }
  function stopReplay(context) {
    context.replaying = false;
    clearTimeout(context.timer);
  }
  async function drainRecording(context) {
    context.recording = false;
    if (live(context)) context.window.webContents.send('campus:login-mode', { recording: false });
    await context.queue.catch(() => {});
  }
  async function needUser(context, message) {
    stopReplay(context);
    if (closing || windows.get(context.id) !== context) return null;
    return status(context.id, 'needs-user', message);
  }
  async function isolated(context, method, args = []) {
    if (!live(context)) throw new Error('请先打开这所学校的登录窗口。');
    const profile = await store.get(context.id), current = safeUrl(context.window.webContents.getURL());
    if (!profile.allowedOrigins.includes(current.origin)) throw new Error('这个登录网站尚未获得允许。');
    const code = `globalThis.__campusSchoolLogin?.[${JSON.stringify(method)}](...${JSON.stringify(args)})`;
    return context.window.webContents.executeJavaScriptInIsolatedWorld(999, [{ code }]);
  }
  async function verify(id, automatic = false) {
    const profile = await store.get(id), context = windows.get(id);
    if (!live(context)) throw new Error('请先打开学校窗口，再检查登录状态。');
    const current = safeUrl(context.window.webContents.getURL());
    if (!profile.allowedOrigins.includes(current.origin)) return automatic ? null : needUser(context, '当前网站还未获得允许，请先核对登录设置。');
    const schoolOrigin = new URL(profile.schoolUrl).origin;
    if (current.origin !== schoolOrigin) return automatic ? null : needUser(context, '请先完成学校的身份验证，回到学校页面后再检查账号。');
    let proven = false, wrongAccount = false;
    if (profile.lmsType === 'canvas' && profile.email) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await profileSession(id).fetch(new URL('/api/v1/users/self/profile', profile.schoolUrl).href, { method: 'GET', redirect: 'manual', credentials: 'include', signal: controller.signal, headers: { Accept: 'application/json' } });
        if (response.ok && (response.headers.get('content-type') || '').includes('json')) {
          const reader = response.body.getReader(), chunks = [];
          let length = 0;
          try {
            while (true) {
              const item = await reader.read();
              if (item.done) break;
              length += item.value.byteLength;
              if (length > 65536) { await reader.cancel(); throw new Error('Profile response exceeds limit'); }
              chunks.push(Buffer.from(item.value));
            }
          } finally { reader.releaseLock(); }
          if (length) {
            const value = JSON.parse(Buffer.concat(chunks).toString('utf8')), expected = profile.email.toLowerCase();
            if (value.id != null) {
              proven = [value.primary_email, value.login_id, value.email].some(email => typeof email === 'string' && email.toLowerCase() === expected);
              wrongAccount = !proven;
            }
          }
        }
      } catch {} finally { clearTimeout(timeout); }
    }
    if (wrongAccount) return needUser(context, '当前登录的是另一个学校账号。请退出后选择设置中的学校邮箱，程序已停止自动操作。');
    if (!proven && current.origin === schoolOrigin) {
      const inspection = await isolated(context, 'inspect', [profile.email]);
      proven = Boolean(inspection && !inspection.blocked && !inspection.loginFields && inspection.emailVisible && inspection.logout);
    }
    if (proven) {
      context.recording = false; stopReplay(context);
      context.window.webContents.send('campus:login-mode', { recording: false });
      await context.queue;
      await flush(profileSession(id));
      return status(id, 'verified', '已核对学校账号，登录会话已保存在这台电脑。', true);
    }
    if (automatic) return null;
    return needUser(context, '还没有核对到你的学校账号。请在学校窗口完成登录，并打开显示学校邮箱的个人资料页后再检查。');
  }
  async function fillFields(context, onlyStep = null) {
    if (!live(context)) throw new Error('请先打开这所学校的登录窗口。');
    const profile = await store.get(context.id), current = safeUrl(context.window.webContents.getURL());
    if (!profile.allowedOrigins.includes(current.origin)) return { filled: false, count: 0, message: '当前网站未获得允许。' };
    const inspection = await isolated(context, 'inspect', [profile.email]);
    if (!inspection || inspection.blocked) return { filled: false, count: 0, message: '当前页面需要本人验证，或显示登录错误，请先在学校窗口处理。' };
    const steps = (onlyStep ? [onlyStep] : profile.steps).filter(step => step.kind === 'field' && step.origin === current.origin && step.path === current.pathname);
    if (!steps.length) return { filled: false, count: 0, message: '还没有学到这个页面的账号框位置，请先演示一次登录。' };
    const credentials = await store.credentials(context.id);
    let count = 0;
    for (const step of steps) {
      const value = step.field === 'password' ? credentials.password : credentials.email;
      if (!value) continue;
      const result = await isolated(context, 'fill', [step.selector, step.field, value, current.origin, current.pathname]);
      if (result?.filled) count++;
    }
    return { filled: count > 0, count, message: count ? '已填写当前页面学到的登录框。' : '没有可填写的已学字段；未记住的密码请在学校页面输入。' };
  }
  function scheduleReplay(context, delay = 450) {
    if (!context.replaying || !live(context)) return;
    clearTimeout(context.timer);
    context.timer = setTimeout(() => replay(context).catch(() => needUser(context, '登录步骤与页面暂时不匹配，请在学校窗口继续操作或重新演示。')), delay);
  }
  async function replay(context) {
    if (!context.replaying || context.busy || !live(context)) return;
    if (Date.now() > context.deadline || context.actions >= 80) return needUser(context, '登录需要你继续完成，请在学校窗口操作；可重新演示更新步骤。');
    context.busy = true;
    try {
      const profile = await store.get(context.id);
      const page = safeUrl(context.window.webContents.getURL());
      const verifyKey = page.origin + page.pathname;
      if (context.verificationKey !== verifyKey || Date.now() - context.verificationTime >= 1500) {
        context.verificationKey = verifyKey; context.verificationTime = Date.now();
        if (await verify(context.id, true)) return;
      }
      if (!context.replaying || !live(context)) return;
      const inspection = await isolated(context, 'inspect', [profile.email]);
      if (!inspection) return scheduleReplay(context);
      if (inspection.blocked) return needUser(context, inspection.blocked === 'credential-error' ? '学校页面显示账号或密码有误，请本人检查；程序已停止重试。' : '学校现在需要你完成验证码、手机确认或身份验证。');
      const index = profile.steps.findIndex((step, i) => i >= context.cursor && step.kind !== 'navigate' && step.origin === inspection.origin && step.path === inspection.path && step.label !== 'other');
      if (index < 0) {
        if (!context.usedLoginEntry && profile.loginUrl !== profile.schoolUrl) {
          context.usedLoginEntry = true;
          await navigate(context, profile.loginUrl);
        } else scheduleReplay(context, 600);
        return;
      }
      const step = profile.steps[index];
      let done = false;
      if (step.kind === 'field') {
        const result = await fillFields(context, step);
        done = result.filled;
        if (!done && step.field === 'password' && !profile.hasPassword) return needUser(context, '没有保存学校密码，请在学校窗口输入后继续。');
      } else if (step.kind === 'click') {
        if (!['student-login', 'login', 'continue', 'next', 'account', 'submit'].includes(step.label)) return needUser(context, '这一步不属于已学到的登录操作，请本人继续。');
        const sendsPassword = inspection.passwordField && ['login', 'continue', 'next', 'submit'].includes(step.label);
        if (sendsPassword && context.passwordSubmissions >= 1) return needUser(context, '已尝试一次密码登录，后续步骤请本人检查，程序不会重复提交密码。');
        // Count before dispatch: navigation may destroy the execution context after the submit.
        if (sendsPassword) context.passwordSubmissions++;
        const result = await isolated(context, 'click', [step.selector, step.label, profile.email, inspection.origin, inspection.path]);
        done = result?.clicked === true;
      }
      if (done) { context.cursor = index + 1; context.actions++; }
      scheduleReplay(context, done ? 650 : 450);
    } finally { context.busy = false; }
  }
  async function approve(context, value) {
    const target = safeUrl(value), profile = await store.get(context.id);
    if (profile.allowedOrigins.includes(target.origin)) return true;
    stopReplay(context);
    if (context.prompting) return false;
    context.prompting = true;
    try {
      const answer = await dialog.showMessageBox(context.window, { type: 'question', title: '允许学校登录跳转？', message: '学校登录要打开一个新网站。请确认它属于你的学校或学校使用的身份服务。', detail: target.origin + '\n允许后才能在这里记录步骤或填写已保存账号。', buttons: ['先不允许', '允许这个网站'], defaultId: 0, cancelId: 0, noLink: true });
      if (answer.response !== 1) { await needUser(context, '已停止跳到尚未允许的网站。可核对学校入口后重新打开。'); return false; }
      await store.save({ id: profile.id, allowedOrigins: [...profile.allowedOrigins, target.origin] });
      return true;
    } finally { context.prompting = false; }
  }
  async function navigate(context, value) {
    if (!live(context) || !(await approve(context, value))) return false;
    context.allowedOrigins = (await store.get(context.id)).allowedOrigins;
    try { await context.window.loadURL(safeUrl(value).href); return true; }
    catch { if (live(context) && !context.prompting) await needUser(context, '学校登录页没有打开。请检查网络，或使用学校允许的系统浏览器登录。'); return false; }
  }
  function queueRecord(context, step) {
    if (!context.recording) return;
    context.queue = context.queue.catch(() => {}).then(() => store.record(context.id, step));
    context.queue.catch(() => needUser(context, '这一步没有保存，请核对允许的登录网站，或重新演示。').catch(() => {}));
  }
  const recordListener = (event, step) => {
    const context = [...windows.values()].find(value => live(value) && event.sender === value.window.webContents);
    if (!context?.recording || event.senderFrame !== event.sender.mainFrame) return;
    let current;
    try { current = safeUrl(event.senderFrame.url); } catch { return; }
    if (step?.origin !== current.origin || step?.path !== current.pathname) return;
    queueRecord(context, step);
  };
  const readyListener = event => {
    const context = [...windows.values()].find(value => live(value) && event.sender === value.window.webContents);
    if (!context || event.senderFrame !== event.sender.mainFrame) return;
    event.sender.send('campus:login-mode', { recording: context.recording });
  };
  ipcMain.on('campus:login-record', recordListener);
  ipcMain.on('campus:login-ready', readyListener);
  async function open(id, mode = 'reuse') {
    let profile = await store.get(id), context = windows.get(id);
    if (!['record', 'reuse'].includes(mode)) throw new Error('请选择演示登录或使用已保存会话。');
    if (context) {
      stopReplay(context); await drainRecording(context);
      if (live(context)) context.window.close();
      await flush(profileSession(id));
    }
    if (mode === 'record') { await store.forgetRecording(id); profile = await store.get(id); }
    const isolatedSession = profileSession(id);
    context = { id, window: null, recording: mode === 'record', replaying: mode === 'reuse', mode, cursor: 0, actions: 0, passwordSubmissions: 0, usedLoginEntry: false, deadline: Date.now() + 30000, timer: null, queue: Promise.resolve(), prompting: false, busy: false, verificationKey: null, verificationTime: 0 };
    const owner = parentWindow?.();
    const browser = new BrowserWindow({ width: 1100, height: 850, minWidth: 700, minHeight: 600, title: '学校登录 · ' + profile.name, parent: owner && !owner.isDestroyed() ? owner : undefined, show: true, autoHideMenuBar: true,
      webPreferences: { session: isolatedSession, preload: path.join(__dirname, 'login-page-preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false, devTools: false, navigateOnDragDrop: false, safeDialogs: true } });
    context.window = browser; windows.set(id, context);
    isolatedSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    isolatedSession.setPermissionCheckHandler(() => false);
    isolatedSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      let target;
      try { target = new URL(details.url); } catch { callback({ cancel: true }); return; }
      if (['data:', 'blob:', 'about:'].includes(target.protocol)) { callback({ cancel: false }); return; }
      const origin = target.origin.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
      const approved = context.allowedOrigins?.includes(origin) === true;
      const secureResource = ['https:', 'wss:'].includes(target.protocol) || (['http:', 'ws:'].includes(target.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
      const allowed = secureResource && (details.resourceType !== 'mainFrame' || approved);
      callback({ cancel: !allowed });
      if (!allowed && details.resourceType === 'mainFrame') {
        approve(context, details.url).then(async permitted => {
          if (!permitted || !live(context)) return;
          context.allowedOrigins = (await store.get(id)).allowedOrigins;
          if (details.method === 'GET') await navigate(context, details.url);
          else await needUser(context, '已允许这个登录网站，请在学校窗口重新点击刚才的登录按钮。');
        }).catch(() => needUser(context, '已停止打开不受支持的登录网址。'));
      }
    });
    isolatedSession.on('will-download', event => event.preventDefault());
    context.allowedOrigins = profile.allowedOrigins;
    const guardNavigation = (event, legacyUrl) => {
      const value = event.url || legacyUrl;
      let target;
      try { target = safeUrl(value); } catch { event.preventDefault(); needUser(context, '已停止打开不受支持的登录链接，请使用学校的正式网页。').catch(() => {}); return; }
      if (!context.allowedOrigins.includes(target.origin)) {
        event.preventDefault();
        approve(context, value).then(async approved => { if (approved && live(context)) { context.allowedOrigins = (await store.get(id)).allowedOrigins; await navigate(context, value); } }).catch(() => needUser(context, '新登录网站还没有保存，请在设置中核对。'));
      }
    };
    browser.webContents.on('will-navigate', guardNavigation);
    browser.webContents.on('will-redirect', guardNavigation);
    browser.webContents.on('will-attach-webview', event => event.preventDefault());
    browser.webContents.setWindowOpenHandler(({ url }) => {
      navigate(context, url).then(async () => { context.allowedOrigins = (await store.get(id)).allowedOrigins; }).catch(() => needUser(context, '这个登录弹窗无法打开，请使用学校允许的登录方式。'));
      return { action: 'deny' };
    });
    const completedNavigation = async (_event, value) => {
      try {
        const current = safeUrl(value || browser.webContents.getURL());
        if (!context.allowedOrigins.includes(current.origin)) return;
        if (context.recording) queueRecord(context, { kind: 'navigate', origin: current.origin, path: current.pathname });
        scheduleReplay(context);
      } catch {}
    };
    browser.webContents.on('did-navigate', completedNavigation);
    browser.webContents.on('did-navigate-in-page', completedNavigation);
    browser.webContents.on('did-finish-load', () => scheduleReplay(context));
    browser.webContents.on('did-fail-load', (_event, code, _description, _url, mainFrame) => {
      if (mainFrame && code !== -3 && !context.prompting) needUser(context, '学校登录页加载失败，请检查网络或使用学校允许的系统浏览器。').catch(() => {});
    });
    browser.on('closed', () => {
      stopReplay(context); context.recording = false;
      if (windows.get(id) === context) windows.delete(id);
      flush(isolatedSession).catch(() => {});
    });
    await status(id, mode === 'record' ? 'recording' : 'window-open', mode === 'record' ? '请在学校窗口演示一次登录，完成后返回检查学校账号。' : '已打开这个账号的独立学校窗口，先检查并复用有效会话。');
    await navigate(context, mode === 'record' ? profile.loginUrl : profile.schoolUrl);
    return { opened: true, mode, profile: await store.get(id) };
  }
  async function clearSession(id) {
    await store.get(id);
    const context = windows.get(id);
    if (context) {
      stopReplay(context); await drainRecording(context);
      if (live(context)) context.window.close();
    }
    const value = profileSession(id);
    await value.closeAllConnections();
    await value.clearStorageData();
    await value.clearCache();
    await value.clearAuthCache();
    await flush(value);
    return status(id, 'session-cleared', '这个账号的浏览器会话已清除；选择记住的密码仍由本机凭据库单独保存。');
  }
  return {
    async handle(action, payload = {}) {
      if (closing) throw new Error('程序正在关闭，请稍后重试。');
      switch (action) {
        case 'login.save': {
          const context = payload.id ? windows.get(payload.id) : null;
          const wasRecording = Boolean(context?.recording), wasReplaying = Boolean(context?.replaying);
          const previousOrigins = context ? [...context.allowedOrigins] : [];
          if (context) { stopReplay(context); await drainRecording(context); }
          let result;
          try { result = await store.save(payload); }
          catch (error) {
            if (live(context)) {
              context.recording = wasRecording; context.replaying = wasReplaying;
              context.window.webContents.send('campus:login-mode', { recording: wasRecording });
              scheduleReplay(context);
            }
            throw error;
          }
          if (context) context.allowedOrigins = result.allowedOrigins;
          if (result.sessionResetRequired) await clearSession(result.id);
          else if (live(context)) {
            const removedTrust = previousOrigins.some(origin => !result.allowedOrigins.includes(origin));
            if (removedTrust) await needUser(context, '允许的登录网站已修改，自动操作已停止；请核对学校窗口后继续。');
            else {
              context.recording = wasRecording; context.replaying = wasReplaying;
              context.window.webContents.send('campus:login-mode', { recording: wasRecording });
              scheduleReplay(context);
            }
          }
          return store.get(result.id);
        }
        case 'login.open': return open(payload.id, payload.mode || 'reuse');
        case 'login.fill': return fillFields(windows.get(payload.id));
        case 'login.verify': return verify(payload.id);
        case 'login.clearSession': return clearSession(payload.id);
        case 'login.delete': await clearSession(payload.id); return store.remove(payload.id);
        case 'login.forgetRecording': {
          const context = windows.get(payload.id);
          if (context) { stopReplay(context); await drainRecording(context); }
          return store.forgetRecording(payload.id);
        }
        default: throw new Error('学校登录操作不受支持。');
      }
    },
    async close() {
      closing = true;
      ipcMain.removeListener('campus:login-record', recordListener);
      ipcMain.removeListener('campus:login-ready', readyListener);
      for (const context of windows.values()) { stopReplay(context); context.recording = false; await context.queue.catch(() => {}); if (live(context)) context.window.destroy(); }
      await Promise.allSettled([...partitions.values()].map(flush));
    }
  };
}

module.exports = { createLoginBrowser };
