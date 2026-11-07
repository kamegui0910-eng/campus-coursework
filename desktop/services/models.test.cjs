'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { validateBaseUrl, normalizeSettings, createModelClient } = require('./models.cjs');

async function stub(t, handler) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let text = '';
    for await (const chunk of req) text += chunk;
    const request = { path: req.url, method: req.method, headers: req.headers, body: text ? JSON.parse(text) : null };
    requests.push(request);
    handler(request, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { baseUrl: `http://127.0.0.1:${server.address().port}/v1`, requests };
}
function json(res, body, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); }
function client(baseUrl, apiStyle = 'chat-completions', extra = {}) {
  return createModelClient({ getSettings: () => ({ baseUrl, apiStyle, model: 'chosen-model' }), getKey: () => 'unit-test-key', ...extra });
}

test('settings whitelist excludes secrets and only permits HTTPS or literal loopback HTTP', () => {
  assert.equal(validateBaseUrl('https://api.example/v1/chat/completions/'), 'https://api.example/v1');
  assert.equal(validateBaseUrl('http://localhost:11434/v1/'), 'http://localhost:11434/v1');
  assert.equal(validateBaseUrl('http://[::1]:11434/v1'), 'http://[::1]:11434/v1');
  for (const bad of ['', 'file:///local', 'http://api.example/v1', 'http://localhost.evil/v1',
    'https://user:password@api.example/v1', 'https://api.example/v1?key=secret', 'https://api.example/v1#secret']) {
    assert.throws(() => validateBaseUrl(bad));
  }
  const normalized = normalizeSettings({ baseUrl: 'https://api.example/v1', model: ' model-id ', apiKey: 'not-to-return', hasKey: true });
  assert.deepEqual(Object.keys(normalized).sort(), ['apiStyle', 'baseUrl', 'model', 'provider']);
  assert.equal(normalized.model, 'model-id');
  assert.throws(() => normalizeSettings(null), /尚未配置/);
  assert.throws(() => normalizeSettings({ baseUrl: 'https://api.example', apiStyle: 'invented' }), /格式/);
});

test('chat model listing is separate from generation and request preserves supplied model and prompts', async t => {
  const server = await stub(t, (request, res) => {
    if (request.path === '/v1/models') json(res, { data: [{ id: 'chosen-model' }, { id: 'another-model' }] });
    else json(res, { id: 'completion-1', model: 'chosen-model', choices: [{ message: { content: 'Draft text' }, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 8, total_tokens: 13 } });
  });
  const api = client(server.baseUrl);
  const connection = await api.test();
  assert.equal(connection.verified, true);
  assert.equal(connection.generationVerified, false);
  assert.deepEqual(connection.models, ['chosen-model', 'another-model']);
  const result = await api.generate({ system: 'Use actual sources.', user: 'Explain chapter 4.' });
  assert.equal(result.text, 'Draft text');
  assert.equal(result.complete, true);
  assert.deepEqual(result.usage, { input_tokens: 5, output_tokens: 8, total_tokens: 13 });
  const sent = server.requests[1];
  assert.equal(sent.path, '/v1/chat/completions');
  assert.equal(sent.headers.authorization, 'Bearer unit-test-key');
  assert.deepEqual(sent.body.messages, [{ role: 'system', content: 'Use actual sources.' }, { role: 'user', content: 'Explain chapter 4.' }]);
  assert.equal(sent.body.model, 'chosen-model');
  assert.doesNotMatch(JSON.stringify(result), /unit-test-key/);
});

test('Responses and Anthropic use actual endpoint shapes and expose only response text', async t => {
  const server = await stub(t, (request, res) => {
    if (request.path === '/v1/responses') json(res, {
      id: 'response-1', status: 'completed', output: [
        { type: 'reasoning', content: [{ type: 'text', text: 'private thinking is ignored' }] },
        { type: 'message', content: [{ type: 'output_text', text: 'Evidence-based answer' }] }
      ]
    });
    else json(res, { id: 'message-1', content: [{ type: 'thinking', thinking: 'ignored' }, { type: 'text', text: 'Reviewed answer' }], stop_reason: 'end_turn' });
  });
  const response = await client(server.baseUrl, 'responses').generate({ system: 'Rule', user: 'Question' });
  assert.equal(response.text, 'Evidence-based answer');
  assert.deepEqual(server.requests[0].body, { model: 'chosen-model', instructions: 'Rule', input: 'Question', max_output_tokens: 8192, store: false });
  const anthropic = await client(server.baseUrl, 'anthropic').generate({ system: 'Rule', user: 'Question' });
  assert.equal(anthropic.text, 'Reviewed answer');
  assert.equal(server.requests[1].path, '/v1/messages');
  assert.equal(server.requests[1].headers['anthropic-version'], '2026-10-21');
  assert.equal(server.requests[1].headers.authorization, 'Bearer unit-test-key');
  assert.equal(server.requests[1].body.system, 'Rule');
  assert.equal(server.requests[1].body.messages[0].role, 'user');
});

test('unsupported list endpoint does not claim verified connection; errors redact echoed credentials', async t => {
  const server = await stub(t, (request, res) => {
    if (request.path === '/v1/models') { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<html>Not provided</html>'); }
    else json(res, { error: { message: 'Rejected token unit-test-key in Bearer unit-test-key' } }, 401);
  });
  const api = client(server.baseUrl);
  assert.equal((await api.test()).verified, false);
  await assert.rejects(api.generate({ user: 'Question' }), error => {
    assert.match(error.message, /密钥/); assert.doesNotMatch(error.message, /unit-test-key/); return true;
  });
});

test('response bounds, request timeout and redirects fail without silently forwarding credentials', async t => {
  let otherHits = 0;
  const destination = await stub(t, (_request, res) => { otherHits++; json(res, { data: [] }); });
  const redirect = await stub(t, (_request, res) => { res.writeHead(302, { Location: destination.baseUrl + '/models' }); res.end(); });
  await assert.rejects(client(redirect.baseUrl).test(), /跳转|连接/);
  assert.equal(otherHits, 0);
  const huge = await stub(t, (_request, res) => json(res, { data: ['x'.repeat(500)] }));
  await assert.rejects(client(huge.baseUrl, 'chat-completions', { maxResponseBytes: 100 }).test(), /过大/);
  const slow = await stub(t, (_request, res) => { const timer = setTimeout(() => json(res, { data: [] }), 250); timer.unref(); });
  await assert.rejects(client(slow.baseUrl, 'chat-completions', { timeoutMs: 50 }).test(), /超时/);
});

test('truncated and tool-only responses cannot become a completed draft, missing model sends no request', async t => {
  let toolOnly = false;
  const server = await stub(t, (_request, res) => json(res, { choices: [{ message: { content: toolOnly ? null : [{ type: 'text', text: 'Partial draft' }] }, finish_reason: toolOnly ? 'tool_calls' : 'length' }] }));
  const api = client(server.baseUrl);
  const partial = await api.generate({ user: 'Question' });
  assert.equal(partial.complete, false); assert.equal(partial.truncated, true);
  toolOnly = true;
  await assert.rejects(api.generate({ user: 'Question' }), /没有返回可用正文/);
  const before = server.requests.length;
  const noModel = createModelClient({ getSettings: () => ({ baseUrl: server.baseUrl, model: '' }) });
  await assert.rejects(noModel.generate({ user: 'Question' }), /模型 ID/);
  assert.equal(server.requests.length, before);
});
