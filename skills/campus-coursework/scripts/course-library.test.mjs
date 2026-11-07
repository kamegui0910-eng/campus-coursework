import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runRequest, courseDirectory } from './course-library.mjs';

const course = { school_origin: 'https://school.example', course_id: '42', term: '2026-Fall', section: 'A' };
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'course-library-'));
  const call = body => runRequest(root, { course, ...body });
  call({ action: 'init' });
  let count = 0;
  const material = (id, kind, coverage = ['all'], extra = {}) => {
    const file = path.join(root, `${++count}.txt`);
    fs.writeFileSync(file, `Fixture ${id} ${count}`);
    return call({ action: 'material', material: { id, kind, title: id,
      source_url: `https://school.example/files/${id}`, source_revision: '1', file, storage: 'downloaded',
      coverage, verified_course: course, verification: { content_verified: true, evidence: 'isolated test fixture' },
      reading: { state: 'read', covered: coverage, missing: [], evidence: 'fixture read', read_at: '2026-11-06' }, ...extra } });
  };
  const dep = (m, locators = ['all']) => ({ material_id: m.material_id, version: m.version,
    locators, purpose: 'verified assignment requirement', requires_read: true });
  const base = [dep(material('syllabus', 'syllabus')), dep(material('requirements', 'assignment'))];
  const assignment = (id, dependencies = base, extra = {}) => ({ platform: 'lms', item_id: id,
    component: 'main', title: 'Weekly Summary', week: 1, module: 'M1', requirements_revision: '1',
    requirements_checked_at: '2026-11-06', requirements_evidence: 'isolated fixture',
    requirements_status: 'live_verified',
    rubric_status: 'not_provided', dependencies, ...extra });
  const bundle = id => call({ action: 'bundle', task: { platform: 'lms', item_id: id, component: 'main' } });
  return { root, call, material, dep, base, assignment, bundle };
}

test('school, course, term and section isolate catalogs; title is not identity', () => {
  const f = fixture();
  for (const change of [{ school_origin: 'https://other.example' }, { course_id: '43' }, { term: '2027-Spring' }, { section: 'B' }]) {
    const other = { ...course, ...change };
    assert.notEqual(courseDirectory(f.root, other), courseDirectory(f.root, course));
    assert.equal(runRequest(f.root, { course: other, action: 'init' }).collection_mode, 'incremental');
  }
});

test('same-title assignments select only their explicit chapter and preserve stable ID across week corrections', () => {
  const f = fixture();
  const ch4 = f.material('ch4-notes', 'textbook_notes', ['ch4:4-2a']);
  const ch5 = f.material('ch5-notes', 'textbook_notes', ['ch5:5-1']);
  const first = f.call({ action: 'assignment', task: f.assignment('100', [...f.base, f.dep(ch4, ['ch4:4-2a'])]) });
  const second = f.call({ action: 'assignment', task: f.assignment('200', [...f.base, f.dep(ch5, ['ch5:5-1'])], { week: 2 }) });
  assert.notEqual(first.task_key, second.task_key);
  assert.equal(f.bundle('100').status, 'ReadyForWork');
  assert.deepEqual(f.bundle('100').sources.map(s => s.material_id), ['syllabus', 'requirements', 'ch4-notes']);
  assert.deepEqual(f.bundle('200').sources.at(-1).locators, ['ch5:5-1']);
  const corrected = f.call({ action: 'assignment', task: f.assignment('100', [...f.base, f.dep(ch4, ['ch4:4-2a'])], { week: 3 }) });
  assert.equal(corrected.task_key, first.task_key);
});

test('same-name rubric revision retains old file and invalidates only dependent assignments', () => {
  const f = fixture();
  const old = f.material('rubric', 'rubric');
  f.call({ action: 'assignment', task: f.assignment('100', [...f.base, f.dep(old)], { rubric_status: 'separate' }) });
  f.call({ action: 'assignment', task: f.assignment('200') });
  const changed = f.material('rubric', 'rubric', ['all'], { source_revision: '2' });
  assert.equal(changed.affected_task_keys.length, 1);
  assert.equal(f.bundle('100').status, 'Blocked');
  assert.equal(f.bundle('200').status, 'ReadyForWork');
  const catalog = JSON.parse(fs.readFileSync(path.join(courseDirectory(f.root, course), 'library.json')));
  assert.equal(catalog.materials.rubric.versions.length, 2);
  assert.ok(fs.existsSync(path.join(courseDirectory(f.root, course), old.file)));
  f.call({ action: 'assignment', task: f.assignment('100', [...f.base, f.dep(changed)], { rubric_status: 'separate', requirements_revision: '2' }) });
  assert.equal(f.bundle('100').status, 'ReadyForWork');
});

test('unread, missing chapter and online-only metadata do not count as source readiness', () => {
  const f = fixture();
  const partial = f.material('book-notes', 'textbook_notes', ['ch4:core', 'ch4:figure'], {
    storage: 'notes', reading: { state: 'partial', covered: ['ch4:core'], missing: ['ch4:figure'], evidence: 'fixture', read_at: '2026-11-06' }
  });
  f.call({ action: 'assignment', task: f.assignment('100', [...f.base, f.dep(partial, ['ch4:figure'])]) });
  assert.match(f.bundle('100').gaps.join(' '), /尚未实际读取/);
  f.call({ action: 'assignment', task: f.assignment('200', [...f.base, f.dep(partial, ['ch5:core'])]) });
  assert.match(f.bundle('200').gaps.join(' '), /未取得所需范围/);
  const online = f.material('book', 'textbook', ['ch5'], { file: undefined, storage: 'online_only', reading: { state: 'not_read', covered: [], missing: ['ch5'] } });
  f.call({ action: 'assignment', task: f.assignment('300', [...f.base, f.dep(online, ['ch5'])]) });
  assert.equal(f.bundle('300').status, 'Blocked');
});

test('wrong course, login wrapper, fake PDF, empty file and unverified body cannot import', () => {
  const f = fixture();
  assert.throws(() => f.material('wrong', 'assignment', ['all'], { verified_course: { ...course, course_id: '99' } }), /课程不同/);
  assert.throws(() => f.material('unchecked', 'assignment', ['all'], { verification: { content_verified: false } }), /尚未实际打开/);
  for (const [name, content, pattern] of [
    ['login.html', '<html><title>Sign in</title><input type="password"></html>', /登录页/],
    ['fake.pdf', '<html>not a pdf</html>', /PDF/], ['empty.txt', '', /文件为空/]
  ]) {
    const file = path.join(f.root, name); fs.writeFileSync(file, content);
    assert.throws(() => f.material(name, 'assignment', ['all'], { file }), pattern);
  }
});

test('human recovery preserves observed cause and resolves only with matching verified material', () => {
  const f = fixture();
  const incident = f.call({ action: 'incident', incident: { id: 'retry-book', material_id: 'book', locators: ['ch4'], code: 'mfa_required',
    evidence: 'test page explicitly asks phone confirmation', entry_url: 'https://school.example/library',
    navigation: 'Course → Materials → Book', expected_file: 'Chapter 4 permitted notes' } });
  assert.match(incident.explanation, /本人用手机/);
  assert.match(incident.manual_recovery.import_into, /book/);
  assert.throws(() => f.material('other-book', 'textbook_notes', ['ch4'], { resolves_incident_id: 'retry-book' }), /不能解除/);
  const book = f.material('book', 'textbook_notes', ['ch4'], { storage: 'notes', resolves_incident_id: 'retry-book' });
  f.call({ action: 'assignment', task: f.assignment('100', [...f.base, f.dep(book, ['ch4'])]) });
  assert.equal(f.bundle('100').status, 'ReadyForWork');
  const unknown = f.call({ action: 'incident', incident: { id: 'timeout', material_id: 'future', code: 'download_timeout',
    evidence: 'timeout only', entry_url: 'https://school.example/material', navigation: 'Materials', expected_file: 'published file' } });
  assert.doesNotMatch(unknown.explanation, /手机验证|没有权限/);
});

test('tampered stored file and missing syllabus/unknown rubric block bundle', () => {
  const f = fixture();
  f.call({ action: 'assignment', task: f.assignment('100') });
  const ready = f.bundle('100');
  fs.appendFileSync(ready.sources[0].absolute_file, ' altered');
  assert.match(f.bundle('100').gaps.join(' '), /哈希已变/);
  f.call({ action: 'assignment', task: f.assignment('200', [], { rubric_status: 'unknown' }) });
  const gaps = f.bundle('200').gaps.join(' ');
  assert.match(gaps, /syllabus/); assert.match(gaps, /完整要求/); assert.match(gaps, /rubric/);
});

test('source URL cannot persist session tokens; repeat sync retains the same version', () => {
  const f = fixture();
  assert.throws(() => f.material('secret', 'assignment', ['all'], { source_url: 'https://school.example/file?access_token=private' }), /令牌/);
  const one = f.material('repeat', 'textbook_notes');
  const catalog = JSON.parse(fs.readFileSync(path.join(courseDirectory(f.root, course), 'library.json')));
  const original = catalog.materials.repeat.versions[0];
  const again = f.material('repeat', 'textbook_notes', ['all'], { file: path.join(courseDirectory(f.root, course), original.file), reading: undefined });
  assert.equal(again.version, one.version);
  assert.equal(JSON.parse(fs.readFileSync(path.join(courseDirectory(f.root, course), 'library.json'))).materials.repeat.versions.length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(courseDirectory(f.root, course), 'library.json'))).materials.repeat.versions[0].reading.covered, ['all']);
});

test('failed next chapter does not block an already available chapter from the same source', () => {
  const f = fixture();
  const book = f.material('book', 'textbook_notes', ['ch4:core', 'ch5:core']);
  f.call({ action: 'assignment', task: f.assignment('100', [...f.base, f.dep(book, ['ch4:core'])]) });
  f.call({ action: 'assignment', task: f.assignment('200', [...f.base, f.dep(book, ['ch5:core'])]) });
  f.call({ action: 'incident', incident: { id: 'ch5-failed', material_id: 'book', locators: ['ch5:core'],
    stage: 'download', code: 'download_timeout', evidence: 'only ch5 download timed out',
    entry_url: 'https://school.example/book', navigation: 'Book → Ch5', expected_file: 'Ch5' } });
  assert.equal(f.bundle('100').status, 'ReadyForWork');
  assert.equal(f.bundle('200').status, 'Blocked');
  assert.throws(() => f.material('book', 'textbook_notes', ['ch4:core'], { resolves_incident_id: 'ch5-failed' }), /没有覆盖/);
  assert.equal(f.bundle('200').status, 'Blocked');
});

test('historical requirements and local-only reimport cannot masquerade as live verification or cloud upload', () => {
  const f = fixture();
  f.call({ action: 'assignment', task: f.assignment('100', f.base, { requirements_status: 'historical' }) });
  assert.match(f.bundle('100').gaps.join(' '), /实时复核/);
  f.call({ action: 'incident', incident: { id: 'cloud', material_id: 'book', locators: ['ch4'], stage: 'cloud_upload',
    code: 'cloud_upload_failed', evidence: 'actual upload error', entry_url: 'https://school.example/book',
    navigation: 'Current task → Attach file', expected_file: 'Ch4 permitted notes' } });
  assert.throws(() => f.material('book', 'textbook_notes', ['ch4'], { resolves_incident_id: 'cloud' }), /云端上传成功/);
  f.material('book', 'textbook_notes', ['ch4'], { resolves_incident_id: 'cloud', recovery_evidence: { destination_verified: true, reference: 'synthetic test attachment receipt' } });
  const catalog = JSON.parse(fs.readFileSync(path.join(courseDirectory(f.root, course), 'library.json')));
  assert.equal(catalog.incidents.cloud.status, 'resolved');
});

test('whole-material dependencies intersect chapter incidents; partial import cannot resolve whole-material fault', () => {
  const f = fixture();
  const book = f.material('book', 'textbook_notes');
  f.call({ action: 'assignment', task: f.assignment('100', [...f.base, f.dep(book)]) });
  f.call({ action: 'incident', incident: { id: 'chapter', material_id: 'book', locators: ['ch5'],
    code: 'download_timeout', evidence: 'chapter failure', entry_url: 'https://school.example/book', navigation: 'Book', expected_file: 'Ch5' } });
  assert.equal(f.bundle('100').status, 'Blocked');
  f.call({ action: 'incident', incident: { id: 'whole', material_id: 'book',
    code: 'login_required', evidence: 'login required for whole material', entry_url: 'https://school.example/book', navigation: 'Book', expected_file: 'Entire defined material' } });
  assert.throws(() => f.material('book', 'textbook_notes', ['ch4'], { resolves_incident_id: 'whole' }), /没有覆盖/);
});
