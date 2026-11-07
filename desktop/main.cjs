const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, net, Menu, clipboard, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { extractPdf } = require('./pdf.cjs');

app.setName('Campus Coursework');
const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const qaData = option('data-dir');
if (qaData) app.setPath('userData', path.resolve(qaData));
let window;
let service;
let loginStore;
let loginBrowser;
const allowedActions = new Set(['state.get','course.create','workspace.choose','materials.import',
  'material.preview','file.open','output.export','models.save','models.test','generate','canvas.save',
  'canvas.test','canvas.discover','canvas.sync','schedule.save','schedule.toggle','external.open','app.info','clipboard.write',
  'login.save','login.open','login.fill','login.verify','login.clearSession','login.delete','login.forgetRecording']);
function checkedUrl(value) {
  const url = new URL(String(value || ''));
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('请使用不含账号密码的正规 http/https 网页地址。');
  }
  return url.href;
}
function writeJson(file, value) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function normalizeWorkspace(value) {
  const selected = path.resolve(value);
  return !fs.existsSync(path.join(selected, 'courses')) && fs.existsSync(path.join(selected, 'coursework/courses'))
    ? path.join(selected, 'coursework') : selected;
}
async function secretStore(dataDir) {
  const file = path.join(dataDir, 'secrets.encrypted.json');
  let encrypted = {};
  try { encrypted = JSON.parse(fs.readFileSync(file, 'utf8')).values || {}; } catch {}
  const cache = {};
  const available = await safeStorage.isAsyncEncryptionAvailable();
  if (available) {
    for (const [name, value] of Object.entries(encrypted)) {
      try {
        const decoded = await safeStorage.decryptStringAsync(Buffer.from(value, 'base64'));
        cache[name] = decoded.result;
        if (decoded.shouldReEncrypt) encrypted[name] = (await safeStorage.encryptStringAsync(decoded.result)).toString('base64');
      } catch { cache[name] = ''; }
    }
  }
  let saving = Promise.resolve();
  return {
    get: name => cache[name] || '',
    set: (name, value) => {
      const work = saving.catch(() => {}).then(async () => {
        if (!available) throw new Error('Windows 密钥保护暂时不可用，尚未保存密钥。请重新启动程序后再试。');
        const next = { ...encrypted };
        if (!value) delete next[name];
        else next[name] = (await safeStorage.encryptStringAsync(String(value))).toString('base64');
        writeJson(file, { version: 1, values: next });
        encrypted = next;
        cache[name] = String(value || '');
      });
      saving = work;
      return work;
    }
  };
}
async function initialize() {
  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });
  const bootFile = path.join(dataDir, 'desktop.json');
  let boot = {};
  try { boot = JSON.parse(fs.readFileSync(bootFile, 'utf8')); } catch {}
  const requestedWorkspace = option('workspace');
  if (requestedWorkspace) {
    const selected = normalizeWorkspace(requestedWorkspace);
    if (!fs.statSync(selected).isDirectory()) throw new Error('指定课程资料库目录不存在。');
    boot.workspace = selected;
    writeJson(bootFile, boot);
  }
  const packagedSkill = path.join(__dirname, 'skills/campus-coursework');
  const skillRoot = fs.existsSync(packagedSkill) ? packagedSkill : path.resolve(__dirname, '../skills/campus-coursework');
  const { createService } = require('./services/index.cjs');
  const { createLoginStore } = require('./services/logins.cjs');
  const secrets = await secretStore(dataDir);
  loginStore = await createLoginStore({ dataDir, secretStore: secrets });
  const notify = value => { if (window && !window.isDestroyed()) window.webContents.send('campus:progress', value); };
  service = await createService({
    dataDir, workspaceRoot: boot.workspace, skillRoot, secretStore: secrets,
    fetchImpl: (url, init) => net.fetch(url, init), pdfExtractor: extractPdf,
    selectWorkspace: async () => {
      const result = await dialog.showOpenDialog(window, { title: '选择课程资料库目录', properties: ['openDirectory','createDirectory'] });
      if (result.canceled) return null;
      boot.workspace = normalizeWorkspace(result.filePaths[0]);
      writeJson(bootFile, boot);
      return boot.workspace;
    },
    selectFiles: async ({ title, extensions } = {}) => {
      const result = await dialog.showOpenDialog(window, { title: title || '导入课程资料',
        properties: ['openFile','multiSelections'], filters: [{ name: '课程资料', extensions: extensions || ['pdf','txt','md','html','docx','json'] }] });
      return result.canceled ? [] : result.filePaths;
    },
    saveFile: async ({ defaultPath, content }) => {
      const result = await dialog.showSaveDialog(window, { title: '导出成果', defaultPath,
        filters: [{ name: 'Markdown / 纯文本', extensions: ['md','txt'] }] });
      if (result.canceled || !result.filePath) return null;
      fs.writeFileSync(result.filePath, String(content), 'utf8');
      return result.filePath;
    },
    openExternal: value => shell.openExternal(checkedUrl(value)),
    openPath: async file => { const error = await shell.openPath(file); if (error) throw new Error('文件未能打开：' + error); },
    onProgress: notify
  });
  window = new BrowserWindow({
    width: 1440, height: 960, minWidth: 900, minHeight: 680, backgroundColor: '#F7F8F3',
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Campus Coursework · 课程工作空间', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false }
  });
  const { createLoginBrowser } = require('./login-browser.cjs');
  loginBrowser = createLoginBrowser({ BrowserWindow, session, ipcMain, dialog,
    store: loginStore, parentWindow: () => window, onProgress: notify });
  Menu.setApplicationMenu(null);
  const entry = pathToFileURL(path.join(__dirname, 'ui/index.html')).href;
  window.webContents.on('will-navigate', (event, url) => { if (url !== entry) event.preventDefault(); });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders,
      'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"] } });
  });
  ipcMain.handle('campus:action', async (event, request) => {
    try {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame ||
          !request || !allowedActions.has(request.action)) throw new Error('这个操作不受支持。');
      if (request.action === 'app.info') return { ok: true, data: { name: app.getName(), version: app.getVersion(),
        dataDir, electron: process.versions.electron, platform: process.platform, independent: true } };
      if (request.action === 'clipboard.write') {
        const text = request.payload?.text;
        if (typeof text !== 'string' || text.length > 1000000) throw new Error('这段内容暂时无法复制，请使用导出。');
        await clipboard.writeText(text);
        if (await clipboard.readText() !== text) throw new Error('当前 Windows 会话没有开放剪贴板，请使用“导出”保存成果。');
        return { ok: true, data: { copied: true } };
      }
      if (request.action.startsWith('login.')) {
        return { ok: true, data: await loginBrowser.handle(request.action, request.payload || {}) };
      }
      if (request.action === 'state.get') {
        const state = await service.handle('state.get');
        return { ok: true, data: { ...state, logins: await loginStore.list(),
          capabilities: { ...state.capabilities, schoolLogin: true, browserLoginSessions: true, browserAutomation: 'login-only' } } };
      }
      return { ok: true, data: await service.handle(request.action, request.payload || {}) };
    } catch (error) {
      return { ok: false, error: String(error.message || '操作未完成').slice(0, 1200) };
    }
  });
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => app.quit());
  await window.loadFile(path.join(__dirname, 'ui/index.html'));
}
app.whenReady().then(initialize).catch(error => {
  dialog.showErrorBox('Campus Coursework 启动失败', String(error.message || error));
  app.quit();
});
let quitReady = false;
let quitting = false;
app.on('before-quit', event => {
  if (quitReady) return;
  event.preventDefault();
  if (quitting) return;
  quitting = true;
  service?.close();
  Promise.resolve(loginBrowser?.close()).catch(() => {}).finally(() => { quitReady = true; app.quit(); });
});
app.on('window-all-closed', () => { service?.close(); app.quit(); });
