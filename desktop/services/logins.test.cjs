'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLoginStore } = require('./logins.cjs');

async function fixture(t, options = {}) {
  const temporaryRoot = path.resolve(os.tmpdir());
  const dataDir = fs.mkdtempSync(path.join(temporaryRoot, 'campus-login-test-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dataDir)), temporaryRoot);
    assert(path.basename(dataDir).startsWith('campus-login-test-'));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const values = new Map();
  const secretStore = { get: name => values.get(name) || '', set: async (name, value) => { if (value) values.set(name, value); else values.delete(name); } };
  const store = await createLoginStore({ dataDir, secretStore, ...options });
  const base = { name: 'Example University', lmsType: 'canvas', schoolUrl: 'https://school.example', loginUrl: 'https://accounts.example/login', email: 'student@school.example', allowedOrigins: ['https://accounts.example'] };
  return { store, dataDir, secretStore, values, base, file: path.join(dataDir, 'school-logins.json') };
}

test('password stays in vault and never appears in profile, JSON, or reopened list', async t => {
  const f = await fixture(t);
  const profile = await f.store.save({ ...f.base, password: 'synthetic-private-password', rememberPassword: true });
  assert.equal(profile.hasPassword, true);
  assert(!('password' in profile));
  assert.equal(f.values.get(`loginPassword:${profile.id}`), 'synthetic-private-password');
  assert.doesNotMatch(fs.readFileSync(f.file, 'utf8'), /synthetic-private-password/);
  assert.doesNotMatch(JSON.stringify(await f.store.list()), /synthetic-private-password/);
  const reopened = await createLoginStore({ dataDir: f.dataDir, secretStore: f.secretStore });
  assert.equal((await reopened.get(profile.id)).hasPassword, true);
  assert.deepEqual(await reopened.credentials(profile.id), { email: f.base.email, password: 'synthetic-private-password' });
  await reopened.save({ id: profile.id, password: '', rememberPassword: true });
  assert.equal((await reopened.credentials(profile.id)).password, 'synthetic-private-password');
});

test('password is optional, remembered only when selected, and forgotten on disabling', async t => {
  const f = await fixture(t);
  const profile = await f.store.save({ ...f.base, password: 'discarded-value', rememberPassword: false });
  assert.equal(profile.hasPassword, false);
  assert.equal(f.values.size, 0);
  await f.store.save({ id: profile.id, password: 'kept-value', rememberPassword: true });
  await f.store.save({ id: profile.id, rememberPassword: false });
  assert.equal((await f.store.credentials(profile.id)).password, '');
  assert.equal(f.values.size, 0);
});

test('invalid profile edits do not change the existing vault credential or saved profile', async t => {
  const f = await fixture(t);
  const profile = await f.store.save({ ...f.base, password: 'original-password', rememberPassword: true });
  const before = fs.readFileSync(f.file, 'utf8');
  await assert.rejects(() => f.store.save({ id: profile.id, name: '', password: 'replacement-password' }), /学校名称/);
  assert.equal((await f.store.credentials(profile.id)).password, 'original-password');
  assert.equal((await f.store.get(profile.id)).name, f.base.name);
  assert.equal(fs.readFileSync(f.file, 'utf8'), before);
});

test('account or login origin changes invalidate password, demonstration, and verification', async t => {
  const f = await fixture(t);
  const profile = await f.store.save({ ...f.base, password: 'old-password', rememberPassword: true });
  await f.store.record(profile.id, { kind: 'field', origin: 'https://accounts.example', field: 'email', selector: 'input:nth-of-type(1)' });
  await f.store.updateStatus(profile.id, { status: 'verified', verified: true });
  const next = await f.store.save({ id: profile.id, email: 'other@school.example' });
  assert.equal(next.sessionResetRequired, true);
  assert.equal(next.hasPassword, false);
  assert.equal(next.lastVerifiedAt, null);
  assert.deepEqual(next.steps, []);
  const moved = await f.store.save({ id: profile.id, loginUrl: 'https://new-accounts.example/login', password: 'new-password' });
  assert.equal(moved.sessionResetRequired, true);
  assert.equal((await f.store.credentials(profile.id)).password, 'new-password');
});

test('entry URLs reject embedded credentials, insecure hosts, and temporary query/fragment links', async t => {
  const f = await fixture(t);
  for (const schoolUrl of ['http://school.example', 'file:///local', 'https://user:pass@school.example', 'https://school.example/login?code=secret', 'https://school.example/#token', 'http://localhost.attacker.example']) {
    await assert.rejects(() => f.store.save({ ...f.base, schoolUrl }));
  }
  const local = await f.store.save({ ...f.base, schoolUrl: 'http://127.0.0.1:1234', loginUrl: 'http://127.0.0.1:1234/login' });
  assert(local.allowedOrigins.includes('http://127.0.0.1:1234'));
  assert.equal((await f.store.list()).length, 1);
});

test('demonstration strips values, query parameters, arbitrary labels, and refuses unapproved origins', async t => {
  const f = await fixture(t);
  const profile = await f.store.save(f.base);
  const result = await f.store.record(profile.id, { kind: 'field', origin: 'https://accounts.example', path: '/login?password=private#token', selector: 'form:nth-of-type(1) > input:nth-of-type(2)', field: 'password', label: 'synthetic-password', value: 'private-value', text: 'private-text', password: 'private-password' });
  assert.deepEqual(result.steps[0], { kind: 'field', origin: 'https://accounts.example', path: '/login', selector: 'form:nth-of-type(1) > input:nth-of-type(2)', field: 'password' });
  assert.doesNotMatch(fs.readFileSync(f.file, 'utf8'), /private-value|private-text|private-password|synthetic-password/);
  await assert.rejects(() => f.store.record(profile.id, { kind: 'navigate', origin: 'https://attacker.example' }), /还没有获得允许/);
  await assert.rejects(() => f.store.record(profile.id, { kind: 'field', origin: 'https://accounts.example', selector: 'input[value="secret"]', field: 'email' }));
  await assert.rejects(() => f.store.record(profile.id, { kind: 'click', origin: 'https://accounts.example', selector: '[data-token="secret"]' }));
  await assert.rejects(() => f.store.record(profile.id, { kind: 'field', origin: 'https://accounts.example', selector: 'input', field: 'otp' }));
});

test('steps are deduplicated, bounded, and cleared independently', async t => {
  const f = await fixture(t);
  const profile = await f.store.save(f.base);
  const step = { kind: 'navigate', origin: 'https://accounts.example', path: '/login' };
  await f.store.record(profile.id, step);
  await f.store.record(profile.id, step);
  assert.equal((await f.store.get(profile.id)).steps.length, 1);
  for (let i = 0; i < 90; i++) await f.store.record(profile.id, { ...step, path: '/step/' + i });
  assert.equal((await f.store.get(profile.id)).steps.length, 80);
  assert.deepEqual((await f.store.forgetRecording(profile.id)).steps, []);
});

test('verification requires explicit verified evidence flag; messages do not echo stored password', async t => {
  const f = await fixture(t);
  const profile = await f.store.save({ ...f.base, password: 'private-password', rememberPassword: true });
  await assert.rejects(() => f.store.updateStatus(profile.id, { status: 'verified' }), /确认学校页面/);
  assert.equal((await f.store.get(profile.id)).lastVerifiedAt, null);
  const verified = await f.store.updateStatus(profile.id, { status: 'verified', verified: true, message: 'private-password https://accounts.example/login?code=private' });
  assert(verified.lastVerifiedAt);
  assert.doesNotMatch(verified.lastMessage, /private-password|code=/);
  assert.equal((await f.store.updateStatus(profile.id, { status: 'expired' })).lastVerifiedAt, null);
});

test('delete removes profile and its vault password; invalid IDs never select filesystem paths', async t => {
  const f = await fixture(t);
  const profile = await f.store.save({ ...f.base, password: 'private-password', rememberPassword: true });
  await assert.rejects(() => f.store.get('../escape'));
  await f.store.remove(profile.id);
  assert.deepEqual(await f.store.list(), []);
  assert.equal(f.values.size, 0);
  await assert.rejects(() => f.store.credentials(profile.id));
});
