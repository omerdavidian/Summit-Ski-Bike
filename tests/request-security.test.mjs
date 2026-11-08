import test from 'node:test';
import assert from 'node:assert/strict';
import {readBody} from '../lib/http.mjs';
import {validateContact} from '../lib/security.mjs';
import newsletter from '../api/newsletter.mjs';

test('preparsed request bodies still enforce size and object shape',async()=>{
 const req=body=>({method:'POST',headers:{'content-type':'application/json'},body});
 await assert.rejects(readBody(req('"'+'x'.repeat(16001)+'"')),{status:413});
 await assert.rejects(readBody(req([])),{status:400});
 await assert.rejects(readBody(req('[1,2,3]')),{status:400});
 await assert.rejects(readBody(req('null')),{status:400});
 assert.deepEqual(await readBody(req('{"message":"hello"}')),{message:'hello'});
});
const input={firstName:'Alex',lastName:'Morgan',email:'alex@example.com',phone:'555-0100',message:'A question.',submissionId:'11111111-2222-4333-8444-555555555555'};
test('malformed UUIDs and unsupported message topics fail before database access',()=>{
 for(const submissionId of ['-'.repeat(36),'a'.repeat(36),'11111111-2222-4333-0444-555555555555'])assert.throws(()=>validateContact({...input,submissionId}),{status:400});
 assert.throws(()=>validateContact({...input,interests:['unexpected topic']}),{status:400});
 assert.throws(()=>validateContact({...input,email:'alex\u0000@example.com'}),{status:400});
});
test('retired newsletter cannot trigger subscriptions even if provider settings exist',()=>{
 let response;const headers={};const res={setHeader:(k,v)=>headers[k]=v,end:body=>response=JSON.parse(body)};
 newsletter({method:'POST',body:{email:'alex@example.com'}},res);
 assert.equal(res.statusCode,410);assert.equal(headers['Cache-Control'],'no-store');assert.match(response.error,/closed/);
});
