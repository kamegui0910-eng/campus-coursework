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
    constructor({ type, name, autocomplete = '', staticLabel = '' }) {
      super();
      Object.assign(this, { type, name, id: name, autocomplete, staticLabel, tagName: 'INPUT', disabled: false, writes: [], events: [], clicks: 0 });
    }
    get value() { throw new Error('The recorder must not read entered values'); }
    set value(next) { this.writes.push(next); }
    getClientRects() { return [1]; }
    getAttribute(name) { return name === 'autocomplete' ? this.autocomplete : name === 'value' ? this.staticLabel : ''; }
    dispatchEvent(event) { this.events.push(event.type); }
    closest(selector) { return selector.includes(`input[type="${this.type}"]`) ? this : null; }
    click() { this.clicks++; }
  }
  const inputs = inputSpecs.map(spec => new HTMLInputElement(spec));
  const body = Object.assign(new Element(), { tagName: 'BODY', innerText: bodyText, parentElement: null, children: inputs });
  inputs.forEach(input => { input.parentElement = body; });
  const selected = selector => inputs.find(input => selector === '#' + input.id) || inputs[Number(selector.match(/^body:nth-of-type\(1\) > input:nth-of-type\((\d+)\)$/)?.[1]) - 1] || null;
  const document = {
    body,
    querySelectorAll(selector) { return ['input', 'input,iframe'].includes(selector) ? inputs : selected(selector) ? [selected(selector)] : []; },
    querySelector: selected,
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

test('static input button labels replay and record without reading input value properties', () => {
  for (const [type, staticLabel, label] of [['submit', 'Next', 'next'], ['submit', 'Sign in', 'login'], ['button', 'Next', 'next']]) {
    const fixture = page([{ type: 'email', name: 'email' }, { type, name: 'action', staticLabel }], 'Sign in');
    assert.equal(fixture.api.click('#action', label, '', origin, '/login').clicked, true);
    assert.equal(fixture.inputs[1].clicks, 1);
    fixture.listeners['campus:login-mode'](null, { recording: true });
    fixture.listeners.click({ isTrusted: true, target: fixture.inputs[1] });
    assert.equal(fixture.messages.length, 1);
    assert.equal(fixture.messages[0].payload.kind, 'click');
    assert.equal(fixture.messages[0].payload.label, label);
    assert.equal(Object.hasOwn(fixture.messages[0].payload, 'value'), false);
  }
});
