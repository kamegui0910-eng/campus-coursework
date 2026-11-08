import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCanvas} from './collector.mjs';
test('browser collector follows same-origin pagination, exports only data and detects expiry/account switches',async()=>{
 const original={fetch:globalThis.fetch,location:globalThis.location};
 try{
  globalThis.location={origin:'https://school.example.com',protocol:'https:'};
  let mode='ok',identity=0;const calls=[];
  globalThis.fetch=async(input,options)=>{
   const url=new URL(input);calls.push(url.href);assert.equal(url.origin,location.origin);assert.equal(options.credentials,'include');assert.equal(options.method,undefined);assert.equal(options.headers.Authorization,undefined);
   if(mode==='expired')return new Response('<html>login</html>',{status:200});
   if(url.pathname.endsWith('/profile'))return Response.json({id:mode==='switched'&&identity++>0?'999':'42',name:'Synthetic student',login_id:'private@example.invalid'});
   if(url.searchParams.has('enrollment_type'))return Response.json([{id:'101',name:'Course',workflow_state:'available'}],{headers:{link:`<${mode==='hostile'?'https://evil.example.com':location.origin}/api/v1/courses?page=2>; rel="next"`}});
   if(url.searchParams.get('page')==='2')return Response.json([{id:'102',name:'Another'}]);
   if(url.pathname.endsWith('/assignments'))return Response.json([{id:'9',name:'Final',points_possible:100,description:'Read the text',submission:{score:80},api_token:'never-export'}]);
   if(url.pathname.endsWith('/assignment_groups'))return mode==='denied'?new Response('',{status:403}):Response.json([{id:1,name:'Final',group_weight:100}]);
   return Response.json({id:'101',name:'Course',syllabus_body:'<h1>Syllabus</h1>',apply_assignment_group_weights:true});
  };
  const discovered=await collectCanvas({mode:'discover'});assert.equal(discovered.data.courses.length,2);
  const result=await collectCanvas({mode:'collect',ids:['101'],attachments:false});assert.equal(result.ok,true);assert.equal(result.data.courses[0].assignments.length,1);assert(!JSON.stringify(result).includes('never-export'));assert(!JSON.stringify(result).includes('private@example.invalid'));
  mode='denied';const partial=await collectCanvas({mode:'collect',ids:['101'],attachments:false});assert.equal(partial.data.courses[0].groupsComplete,false);assert(partial.data.courses[0].gaps.length);
  mode='expired';assert.equal((await collectCanvas({mode:'discover'})).ok,false);
  mode='hostile';const before=calls.length;assert.equal((await collectCanvas({mode:'discover'})).ok,false);assert(calls.slice(before).every(url=>new URL(url).origin===location.origin));
  mode='switched';identity=0;const switched=await collectCanvas({mode:'collect',ids:['101'],attachments:false});assert.equal(switched.ok,false);assert.match(switched.error,/账号发生变化/);
 }finally{globalThis.fetch=original.fetch;globalThis.location=original.location;}
});
test('browser collector preserves actual attachment bytes and records unavailable downloads',async()=>{
 const previous={fetch:globalThis.fetch,location:globalThis.location,DOMParser:globalThis.DOMParser};
 try{
  globalThis.location={origin:'https://school.example.com',protocol:'https:'};
  globalThis.DOMParser=class{parseFromString(){return {querySelectorAll(){return [{getAttribute(){return '/courses/101/files/501/download';}}];}};}};
  globalThis.fetch=async(input,options)=>{
   const url=new URL(input);
   if(url.pathname==='/download/501'){assert.equal(options.credentials,'include');return new Response('Syllabus fixture',{headers:{'content-type':'text/plain'}});}
   if(url.pathname.endsWith('/profile'))return Response.json({id:'42',name:'Synthetic'});
   if(url.searchParams.has('enrollment_type'))return Response.json([{id:'101',name:'Fixture'}]);
   if(url.pathname.endsWith('/assignments'))return Response.json([]);
   if(url.pathname.endsWith('/assignment_groups'))return Response.json([]);
   if(url.pathname==='/api/v1/courses/101/files')return Response.json([{id:'501',filename:'syllabus.txt'},{id:'502',filename:'lecture.pdf'}]);
   if(url.pathname==='/api/v1/files/501')return Response.json({id:'501',filename:'syllabus.txt',size:16,url:location.origin+'/download/501','content-type':'text/plain'});
   if(url.pathname==='/api/v1/files/502')return new Response('',{status:403});
   return Response.json({id:'101',name:'Fixture',syllabus_body:'<a href="/courses/101/files/501/download">Syllabus</a>'});
  };
  const result=await collectCanvas({mode:'collect',ids:['101'],attachments:true});assert.equal(result.ok,true);
  assert.equal(atob(result.data.courses[0].files[0].base64),'Syllabus fixture');assert.equal(result.data.courses[0].files[0].kind,'syllabus');assert(result.data.courses[0].gaps.some(g=>g.includes('502')));
 }finally{Object.assign(globalThis,previous);}
});
