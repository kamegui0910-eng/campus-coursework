import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBrowserPackage,browserFiles} from './browser-package.mjs';
const pkg=()=>({format:'campus-browser-import',version:1,schoolUrl:'https://school.example.com/courses/101',capturedAt:'2026-11-08T01:00:00Z',courses:[{id:'101',name:'Fixture course',assignments:[{id:'9',name:'Final',points_possible:100}],groups:[],files:[]}]});
test('normalizes browser data without copying credentials, session storage or arbitrary fields',()=>{
 const value=pkg();value.cookies='do-not-send';value.courses[0].password='do-not-send';value.courses[0].assignments[0].authorization='do-not-send';
 const safe=validateBrowserPackage(value);assert.equal(safe.schoolUrl,'https://school.example.com');assert(!JSON.stringify(safe).includes('do-not-send'));assert.equal(safe.courses[0].assignmentsComplete,false);
 value.courses[0].assignments[0].submission={score:null,excused:true};assert.equal(validateBrowserPackage(value).courses[0].assignments[0].submission.excused,true);
});
test('rejects private destinations, duplicate tasks, invalid grades and unbounded attachments',()=>{
 const value=pkg();value.schoolUrl='https://127.0.0.1';assert.throws(()=>validateBrowserPackage(value));
 const duplicate=pkg();duplicate.courses[0].assignments.push(duplicate.courses[0].assignments[0]);assert.throws(()=>validateBrowserPackage(duplicate));
 const bad=pkg();bad.courses[0].assignments[0].points_possible=-1;assert.throws(()=>validateBrowserPackage(bad));
 const files=pkg();files.courses[0].files=[{name:'../private.txt',base64:'eA=='}];assert.throws(()=>browserFiles(files,'101'));
 files.courses[0].files=[{name:'syllabus.txt',base64:'eA==',kind:'syllabus'}];assert.equal(browserFiles(files,'101')[0].base64,'eA==');
});
