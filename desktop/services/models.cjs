'use strict';

const API_STYLES = new Set(['chat-completions', 'responses', 'anthropic']);
const MAX_INPUT_BYTES = 1024 * 1024;

function validateBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('请先填写模型 API 的基础地址。');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('API 基础地址格式不正确，请填写完整网址。'); }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const loopback = hostname === 'localhost' || hostname === '::1' || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('API 地址不能包含账号、密钥、查询参数或片段；请把密钥填写在独立的密钥栏。');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('远程 API 必须使用 HTTPS；本机 localhost、127.0.0.1 或 ::1 可以使用 HTTP。');
  }
  // Accept a copied endpoint as a base without appending it twice.
  url.pathname = url.pathname.replace(/\/(?:chat\/completions|responses|messages|models)\/?$/, '').replace(/\/+$/, '');
  return url.href.replace(/\/+$/, '');
}

function normalizeSettings(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('模型设置尚未配置，请先保存 API 地址和接口格式。');
  const apiStyle = input.apiStyle || 'chat-completions';
  if (!API_STYLES.has(apiStyle)) throw new Error('请选择受支持的模型接口格式。');
  const model = typeof input.model === 'string' ? input.model.trim() : '';
  if (model.length > 240 || /[\r\n\0]/.test(model)) throw new Error('模型 ID 格式不正确，请使用供应商提供的确切名称。');
  return {
    provider: typeof input.provider === 'string' ? input.provider.trim().slice(0, 80) : '',
    baseUrl: validateBaseUrl(input.baseUrl), model, apiStyle
  };
}

function redact(value, key) {
  let text = String(value || '');
  if (key) text = text.split(key).join('[密钥已隐藏]');
  return text.replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [已隐藏]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|github_pat_[A-Za-z0-9_]{12,}|gh[pousr]_[A-Za-z0-9]{12,})\b/g, '[密钥已隐藏]');
}

function numericUsage(usage) {
  if (!usage || typeof usage !== 'object') return undefined;
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
  const result = {
    input_tokens: number(usage.input_tokens ?? usage.prompt_tokens),
    output_tokens: number(usage.output_tokens ?? usage.completion_tokens),
    total_tokens: number(usage.total_tokens)
  };
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
}

function messageText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(part => {
    if (!part || typeof part !== 'object') return '';
    if (['text', 'output_text'].includes(part.type) && typeof part.text === 'string') return part.text;
    if (part.type === 'refusal' && typeof part.refusal === 'string') return part.refusal;
    return '';
  }).filter(Boolean).join('\n');
}

function extractOutput(payload, style) {
  if (style === 'chat-completions') {
    const choice = payload.choices?.[0];
    const text = messageText(choice?.message?.content) || choice?.message?.refusal || '';
    return { text, complete: !['length', 'content_filter', 'tool_calls', 'function_call'].includes(choice?.finish_reason), stopReason: choice?.finish_reason };
  }
  if (style === 'anthropic') {
    return { text: messageText(payload.content), complete: !['max_tokens', 'tool_use', 'pause_turn'].includes(payload.stop_reason), stopReason: payload.stop_reason };
  }
  const outputs = Array.isArray(payload.output) ? payload.output : [];
  const text = typeof payload.output_text === 'string' ? payload.output_text :
    outputs.filter(item => item?.type === 'message').map(item => messageText(item.content)).filter(Boolean).join('\n');
  return { text, complete: (!payload.status || payload.status === 'completed') &&
    !outputs.some(item => ['function_call', 'custom_tool_call'].includes(item?.type)),
    stopReason: payload.incomplete_details?.reason || payload.status };
}

async function readBounded(response, maxBytes) {
  const declared = Number(response.headers?.get?.('content-length') || 0);
  if (declared > maxBytes) throw new Error('模型返回内容过大，已停止读取。请减少本次输入或输出范围。');
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('模型返回内容过大，已停止处理。');
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error('模型返回内容过大，已停止读取。请减少本次输入或输出范围。');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

function createModelClient({ fetchImpl = global.fetch, getSettings, getKey = () => '', timeoutMs = 120000, maxResponseBytes = 4 * 1024 * 1024 }) {
  if (typeof fetchImpl !== 'function' || typeof getSettings !== 'function') throw new Error('模型运行环境尚未初始化。');

  async function configured() {
    const settings = normalizeSettings(await getSettings());
    const rawKey = await getKey();
    const key = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (key.length > 16384 || /[\r\n\0]/.test(key)) throw new Error('API 密钥格式不正确，请重新填写，不要包含换行。');
    return { settings, key };
  }

  async function request(settings, key, endpoint, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = { Accept: 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;
    if (settings.apiStyle === 'anthropic') headers['anthropic-version'] = '2026-10-21';
    if (body) headers['Content-Type'] = 'application/json';
    try {
      const response = await fetchImpl(`${settings.baseUrl}/${endpoint}`, {
        method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal, redirect: 'error'
      });
      const text = await readBounded(response, maxResponseBytes);
      if (!response.ok && endpoint === 'models' && [404, 405, 501].includes(response.status)) {
        return { unsupported: true, status: response.status };
      }
      let data;
      try { data = JSON.parse(text); } catch {
        if (!response.ok) throw new Error(`模型服务返回 HTTP ${response.status}，请检查基础地址、网络或服务状态。`);
        throw new Error('接口返回的不是可识别的 JSON 数据，请核对 API 地址及接口格式。');
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('接口返回的 JSON 结构不符合所选格式，请核对 API 地址。');
      if (!response.ok) {
        const reasons = {
          400: '请求被模型服务拒绝，请核对模型 ID、接口格式和输入长度。',
          401: '模型服务没有接受这份密钥，请检查密钥是否有效。',
          403: '当前账号没有这个模型或接口的访问权限。',
          404: '没有找到这个接口或模型，请核对基础地址和模型 ID。',
          429: '模型服务限制了本次请求，请检查账号额度或稍后重试。'
        };
        const detail = typeof data.error?.message === 'string' ? redact(data.error.message, key).slice(0, 300) : '';
        throw new Error(`${reasons[response.status] || '模型服务暂时没有完成请求，请稍后重试。'}（HTTP ${response.status}）${detail ? ` ${detail}` : ''}`);
      }
      if (data.error || ['failed', 'cancelled'].includes(data.status)) {
        const detail = redact(data.error?.message || data.status, key).slice(0, 300);
        throw new Error(`模型未能完成这次生成。${detail}`);
      }
      return { data };
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'AbortError') throw new Error('模型请求等待超时，未确认本次生成完成；请先检查服务端记录再决定是否重试。');
      if (error instanceof TypeError) throw new Error('无法连接模型服务，请检查 API 地址、网络和证书；如果地址发生跳转，请填写最终 API 地址。');
      throw new Error(redact(error?.message || '模型调用失败。', key));
    } finally { clearTimeout(timer); }
  }

  return {
    async test() {
      const { settings, key } = await configured();
      const result = await request(settings, key, 'models');
      if (result.unsupported) return {
        verified: false, generationVerified: false, status: 'model_list_unavailable', models: [],
        message: '这个接口没有提供模型列表。可手动填写模型 ID 后运行一次任务；当前尚未验证生成能力。'
      };
      const list = result.data.data || result.data.models;
      if (!Array.isArray(list)) return {
        verified: false, generationVerified: false, status: 'unexpected_response', models: [],
        message: '接口已响应，但没有返回可识别的模型列表，请核对接口格式；尚未验证生成能力。'
      };
      const models = list.slice(0, 1000).map(item => typeof item === 'string' ? item : item?.id || item?.name)
        .filter(value => typeof value === 'string').map(value => redact(value, key).slice(0, 240));
      return { verified: true, generationVerified: false, status: 'model_list_verified', models,
        message: '模型列表接口已响应。生成能力还需运行一次任务确认。' };
    },
    async generate({ system = '', user = '' }) {
      const { settings, key } = await configured();
      if (!settings.model) throw new Error('请先在模型设置中填写确切的模型 ID。');
      if (typeof user !== 'string' || !user.trim() || typeof system !== 'string') throw new Error('本次任务没有可发送的内容。');
      if (Buffer.byteLength(system + user, 'utf8') > MAX_INPUT_BYTES) throw new Error('本次资料太长，请缩小到相关章节和当前作业所需范围。');
      let endpoint, body;
      if (settings.apiStyle === 'responses') {
        endpoint = 'responses';
        body = { model: settings.model, instructions: system, input: user, max_output_tokens: 8192, store: false };
      } else if (settings.apiStyle === 'anthropic') {
        endpoint = 'messages';
        body = { model: settings.model, system, messages: [{ role: 'user', content: user }], max_tokens: 8192, stream: false };
      } else {
        endpoint = 'chat/completions';
        body = { model: settings.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], stream: false };
      }
      const { data } = await request(settings, key, endpoint, body);
      const output = extractOutput(data, settings.apiStyle);
      if (!output.text.trim()) throw new Error('模型没有返回可用正文，可能只返回了工具调用或非文本内容；本程序尚未把它视为生成成功。');
      const result = { text: redact(output.text, key), model: redact(data.model || settings.model, key),
        id: typeof data.id === 'string' ? redact(data.id, key) : null,
        usage: numericUsage(data.usage), complete: output.complete };
      if (!output.complete) {
        result.truncated = true;
        result.warning = '模型输出尚未完整结束，或包含本程序未执行的工具步骤；需补全后再审阅。';
      }
      return result;
    }
  };
}

module.exports = { validateBaseUrl, normalizeSettings, createModelClient };
