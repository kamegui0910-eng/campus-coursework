'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { schoolLoginAutomation, officialAutoSubmit } = require('../scope.cjs');
const { guardSchoolLoginAction } = require('../login-browser.cjs');

test('login automation and official auto-submit stay off by default', () => {
  assert.equal(schoolLoginAutomation, false);
  assert.equal(officialAutoSubmit, false);
  assert.throws(() => guardSchoolLoginAction('login.open'), /学校登录自动化已暂停/);
  assert.throws(() => guardSchoolLoginAction('login.fill'), /学校登录自动化已暂停/);
  assert.doesNotThrow(() => guardSchoolLoginAction('login.clearSession'));
  assert.doesNotThrow(() => guardSchoolLoginAction('login.delete'));
  assert.doesNotThrow(() => guardSchoolLoginAction('generate'));
});
