import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCourseLink,termIsCurrent,classifyAssignment,assignmentImpact,calculateGrades} from './lms.mjs';
test('course URL parser strips tracking and rejects private/non-course URLs',()=>{
 assert.deepEqual(parseCourseLink('https://school.example.com/courses/900?module_item_id=2#x'),{provider:'canvas',baseUrl:'https://school.example.com',externalId:'900',sourceUrl:'https://school.example.com/courses/900'});
 for(const url of ['https://127.0.0.1/courses/3','https://user:pass@school.example.com/courses/3','http://school.example.com/courses/3','https://school.example.com/other'])assert.throws(()=>parseCourseLink(url));
 assert.equal(termIsCurrent({workflow_state:'completed'}),false);
});
const snapshot={weighted:true,groups:[{id:'a',name:'Weekly',group_weight:40},{id:'b',name:'Final',group_weight:60}],assignments:[{id:'1',name:'Weekly 1',assignment_group_id:'a',points_possible:10,submission:{score:8}},{id:'2',name:'Weekly 2',assignment_group_id:'a',points_possible:10},{id:'3',name:'Final',assignment_group_id:'b',points_possible:100}]};
test('weighted current, zero-inclusive and target scenarios distinguish group and assignment weight',()=>{
 assert.equal(calculateGrades(snapshot).percent,80);
 assert.equal(calculateGrades(snapshot,{ungraded:'zero'}).percent,16);
 assert.equal(assignmentImpact(snapshot.assignments[0],snapshot).percent,20);
 assert.equal(assignmentImpact(snapshot.assignments[2],snapshot).percent,60);
 assert.equal(calculateGrades(snapshot,{scores:{'2':10,'3':90}}).percent,90);
 assert.equal(calculateGrades(snapshot,{target:80}).requiredRemainingPercent,80);
 assert.equal(classifyAssignment(snapshot.assignments[2]).kind,'final');
});
test('unsupported rules, missing groups, excused assignments and invalid hypothetical scores are explicit',()=>{
 const rules=structuredClone(snapshot);rules.groups[0].rules={drop_lowest:1};assert(calculateGrades(rules).unsupported);assert.equal(assignmentImpact(rules.assignments[0],rules).percent,null);
 const missing=structuredClone(snapshot);missing.groups.pop();assert(calculateGrades(missing).unsupported);assert.match(calculateGrades(missing).warnings.join(' '),/找不到评分组/);
 const excused=structuredClone(snapshot);excused.assignments[1].submission={excused:true};assert.equal(assignmentImpact(excused.assignments[0],excused).percent,40);
 assert.equal(assignmentImpact(excused.assignments[1],excused).percent,0);
 assert.equal(assignmentImpact(snapshot.assignments[0],{...snapshot,gradingIncomplete:true}).percent,null);
 assert.equal(calculateGrades({...snapshot,gradingIncomplete:true}).unsupported,true);
 assert.throws(()=>calculateGrades(snapshot,{scores:{'2':-1}}));assert.equal(calculateGrades({...snapshot,assignments:[]}).percent,null);
});
