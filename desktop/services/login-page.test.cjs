'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const preload = fs.readFileSync(path.join(__dirname, '../login-page-preload.cjs'), 'utf8');
const origin = 'https://school.example';

function page(inputSpecs, bodyText) {
  const listeners = {}, messages = [];
  class Element {}
  class HTMLInputElement extends Element {
    constructor({ type, name, autocomplete = '' }) {
      super();
      Object.assign(this, { type, name, id: name, autocomplete, tagName: 'INPUT', disabled: false, writes: [], events: [] });
    }
    get value() { throw new Error('The recorder must not read entered values'); }
    set value(next) { this.writes.push(next); }
    getClientRects() { return [1]; }
    getAttribute(name) { return name === 'autocomplete' ? this.autocomplete : ''; }
    dispatchEvent(event) { this.events.push(event.type); }
  }
  const inputs = inputSpecs.map(spec => new HTMLInputElement(spec));
  const document = {
    body: { innerText: bodyText },
    querySelectorAll(selector) { return ['input', 'input,iframe'].includes(selector) ? inputs : []; },
    querySelector(selector) { return inputs.find(input => selector === '#' + input.id) || null; },
    addEventListener(name, callback) { listeners[name] = callback; }
  };
  const window = { addEventListener(name, callback) { listeners[name] = callback; } };
  window.top = window;
  const context = vm.createContext({
    window, document, HTMLInputElement, Element,
    location: { origin, pathname: '/login' },
    getComputedStyle: () => ({ visibility: 'visible' }),
    Event: class { constructor(type) { this.type = type; } },
    require(name) {
      assert.equal(name, 'electron');
      return { ipcRenderer: {
        on(name, callback) { listeners[name] = callback; },
        send(name, payload) { messages.push({ name, payload }); }
      } };
    }
  });
  vm.runInContext(preload, context);
  return { api: context.__campusSchoolLogin, inputs, listeners, messages };
}

test('normal credentials can be filled without reading values; changed origin is refused', () => {
  const fixture = page([{ type: 'email', name: 'email' }, { type: 'password', name: 'password' }], 'Sign in');
  const inspection = fixture.api.inspect('student@school.example');
  assert.equal(inspection.blocked, null);
  assert.equal(inspection.loginFields, true);
  assert.equal(inspection.passwordField, true);
  assert.equal(fixture.api.fill('#email', 'email', 'student@school.example', origin, '/login').filled, true);
  assert.equal(fixture.api.fill('#password', 'password', 'synthetic-test-value', origin, '/login').filled, true);
  assert.deepEqual(fixture.inputs[1].writes, ['synthetic-test-value']);
  assert.deepEqual(fixture.inputs[1].events, ['input', 'change']);
  assert.equal(fixture.api.fill('#password', 'password', 'unused-fixture', 'https://other.example', '/login').filled, false);
  assert.equal(fixture.inputs[1].writes.length, 1);
});

test('masked OTP named code is not treated as the school password or recorded', () => {
  const fixture = page([{ type: 'password', name: 'code' }], 'Enter security code');
  const inspection = fixture.api.inspect();
  assert.equal(inspection.blocked, 'verification');
  assert.equal(inspection.passwordField, false);
  assert.equal(fixture.api.fill('#code', 'password', 'unused-fixture', origin, '/login').filled, false);
  assert.deepEqual(fixture.inputs[0].writes, []);
  fixture.listeners['campus:login-mode'](null, { recording: true });
  fixture.listeners.focusin({ isTrusted: true, target: fixture.inputs[0] });
  fixture.listeners.click({ isTrusted: true, target: fixture.inputs[0] });
  assert.deepEqual(fixture.messages, []);
});

test('plain OTP and MFA inputs block automation and refuse credential filling', () => {
  for (const spec of [
    { type: 'text', name: 'code' },
    { type: 'text', name: 'mfa' },
    { type: 'password', name: 'challenge', autocomplete: 'one-time-code' }
  ]) {
    const fixture = page([spec], 'Enter the code we sent');
    assert.equal(fixture.api.inspect().blocked, 'verification');
    assert.equal(fixture.api.inspect().passwordField, false);
    assert.equal(fixture.api.fill('#' + spec.name, 'email', 'unused-fixture', origin, '/login').filled, false);
    assert.equal(fixture.api.fill('#' + spec.name, 'password', 'unused-fixture', origin, '/login').filled, false);
    assert.equal(fixture.inputs[0].writes.length, 0);
  }
});

test('phone approval pauses automation even without an OTP input', () => {
  const fixture = page([], 'Approve the sign-in request on your phone');
  assert.equal(fixture.api.inspect().blocked, 'verification');
  assert.equal(fixture.api.inspect().loginFields, false);
  assert.equal(fixture.api.fill('#absent', 'password', 'unused-fixture', origin, '/login').filled, false);
});
