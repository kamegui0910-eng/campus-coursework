'use strict';
const { ipcRenderer } = require('electron');

// This isolated preload exposes no bridge to school pages and never reads input values.
if (window.top === window) {
  let recording = false;
  const visible = element => Boolean(element && !element.disabled && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  const isChallenge = hint => /otp|totp|mfa|one.?time|verification|passcode|captcha|auth.?code|security.?code|(?:^|[-_\s])code(?:$|[-_\s])/i.test(hint);
  function fieldKind(element) {
    if (!(element instanceof HTMLInputElement) || !visible(element)) return null;
    const hint = [element.type, element.name, element.id, element.autocomplete].join(' ').toLowerCase();
    if (isChallenge(hint)) return null;
    if (element.type === 'password') return 'password';
    if (!['email', 'text'].includes(element.type)) return null;
    return element.type === 'email' || /email|user|login|account|identifier/.test(hint) ? 'email' : null;
  }
  function selectorFor(element) {
    const parts = [];
    for (let node = element; node instanceof Element && parts.length < 9; node = node.parentElement) {
      const tag = node.tagName.toLowerCase();
      const peers = node.parentElement ? [...node.parentElement.children].filter(peer => peer.tagName === node.tagName) : [node];
      parts.unshift(`${tag}:nth-of-type(${peers.indexOf(node) + 1})`);
      if (tag === 'body') break;
    }
    const selector = parts.join(' > ');
    return selector.length <= 240 && document.querySelectorAll(selector).length === 1 ? selector : null;
  }
  const fields = () => [...document.querySelectorAll('input')].filter(element => fieldKind(element));
  function labelFor(element) {
    const staticButtonLabel = element instanceof HTMLInputElement && ['submit', 'button'].includes(element.type) ? element.getAttribute('value') : '';
    const text = (element.innerText || element.getAttribute('aria-label') || staticButtonLabel || '').trim().toLowerCase();
    if (/student.{0,12}(?:login|sign in)|学生登录|学生入口/.test(text)) return 'student-login';
    if (text.includes('@')) return 'account';
    if (/^(?:next|下一步|下一页)$/.test(text)) return fields().length ? 'next' : 'other';
    if (/^(?:continue|继续)$/.test(text)) return fields().length ? 'continue' : 'other';
    if (/^(?:submit|提交)$/.test(text)) return fields().length ? 'submit' : 'other';
    if (/^(?:log\s?in|sign\s?in|登录|登陆)(?:\s.*)?$/.test(text)) return 'login';
    return 'other';
  }
  function inspect(email = '') {
    const body = (document.body?.innerText || '').slice(0, 200000);
    const challenge = [...document.querySelectorAll('input,iframe')].some(element => visible(element) && isChallenge([element.name, element.id, element.getAttribute('autocomplete'), element.getAttribute('title')].join(' ')));
    const alerts = [...document.querySelectorAll('[role="alert"],[aria-live="assertive"],.error,.alert')].filter(visible).map(element => element.innerText || '').join(' ').slice(0, 12000);
    const credentialError = /(?:incorrect|invalid|wrong).{0,30}(?:password|credentials|username)|(?:password|credentials).{0,30}(?:incorrect|invalid|wrong)|密码.{0,10}(?:错误|不正确)|账号.{0,10}(?:错误|不存在)/i.test(alerts);
    const verification = /(?:approve|confirm).{0,35}(?:phone|mobile|authenticator)|two.factor authentication|multi.factor authentication|(?:enter|provide|type).{0,40}(?:security|verification|authentication|one.time).{0,12}code|(?:enter|provide|type).{0,20}(?:the )?code (?:we|sent)|手机.{0,12}(?:验证|确认)|请.{0,8}(?:验证码|验证身份)/i.test(body);
    const logout = [...document.querySelectorAll('a,button,[role="button"]')].some(element => visible(element) && /log\s?out|sign\s?out|退出登录|注销/.test([(element.innerText || '').toLowerCase(), element.getAttribute('href') || ''].join(' ')));
    const currentFields = fields();
    return {
      origin: location.origin, path: location.pathname,
      blocked: credentialError ? 'credential-error' : challenge ? 'verification' : verification ? 'verification' : null,
      loginFields: currentFields.length > 0,
      passwordField: currentFields.some(element => fieldKind(element) === 'password'),
      emailVisible: Boolean(email && body.toLowerCase().includes(String(email).toLowerCase())), logout
    };
  }
  function fill(selector, kind, value, expectedOrigin, expectedPath) {
    if (location.origin !== expectedOrigin || location.pathname !== expectedPath) return { filled: false, reason: 'page-changed' };
    const element = document.querySelector(selector);
    if (!visible(element) || fieldKind(element) !== kind || typeof value !== 'string' || !value) return { filled: false, reason: 'field-mismatch' };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { filled: true };
  }
  function click(selector, label, email, expectedOrigin, expectedPath) {
    if (location.origin !== expectedOrigin || location.pathname !== expectedPath) return { clicked: false };
    const element = document.querySelector(selector);
    if (!visible(element) || labelFor(element) !== label || label === 'other') return { clicked: false };
    if (label === 'account' && (!email || !(element.innerText || '').toLowerCase().includes(String(email).toLowerCase()))) return { clicked: false };
    if (['next', 'continue', 'submit'].includes(label) && !fields().length) return { clicked: false };
    element.click();
    return { clicked: true };
  }
  Object.defineProperty(globalThis, '__campusSchoolLogin', { value: Object.freeze({ inspect, fill, click }), configurable: false, writable: false });
  ipcRenderer.on('campus:login-mode', (_event, value) => { recording = value?.recording === true; });
  const send = step => {
    if (!recording) return;
    ipcRenderer.send('campus:login-record', { ...step, origin: location.origin, path: location.pathname });
  };
  document.addEventListener('focusin', event => {
    if (!event.isTrusted || inspect().blocked) return;
    const field = fieldKind(event.target), selector = field && selectorFor(event.target);
    if (selector) send({ kind: 'field', selector, field, label: field });
  }, true);
  document.addEventListener('click', event => {
    if (!event.isTrusted || !(event.target instanceof Element) || inspect().blocked) return;
    const element = event.target.closest('a,button,input[type="submit"],input[type="button"],[role="button"]');
    if (!visible(element)) return;
    const label = labelFor(element), selector = label !== 'other' && selectorFor(element);
    if (selector) send({ kind: 'click', selector, label });
  }, true);
  window.addEventListener('DOMContentLoaded', () => ipcRenderer.send('campus:login-ready'));
}
