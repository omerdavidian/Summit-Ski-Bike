import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEmail} from '../lib/email.mjs';
import {validateContact,verifyCaptcha} from '../lib/security.mjs';
import {processContact} from '../lib/contact.mjs';
import {requireOrigin} from '../lib/http.mjs';
const body={firstName:'Alex',lastName:'Morgan',email:'alex@example.com',phone:'555-0100',message:'A question about the archive.',season:'winter',interests:['General question'],submissionId:'11111111-2222-4333-8444-555555555555','cf-turnstile-response':'fresh-token'};
const env={RESEND_API_KEY:'test-only',EMAIL_FROM:'Summit <contact@messages.summitskibike.com>',OWNER_EMAIL:'summitskibike@gmail.com',RATE_LIMIT_SALT:'local-test-only',TURNSTILE_SECRET:'test-secret',TURNSTILE_HOSTNAMES:'summitskibike.com'};
const req={headers:{'x-forwarded-for':'192.0.2.10'}};
test('email templates escape visitor HTML and include text and functional reply destinations',()=>{
 const inquiry={...validateContact({...body,firstName:'<img src=x onerror=alert(1)>',message:'<script>alert(1)</script>'})};
 const owner=renderEmail('owner',inquiry),client=renderEmail('client',inquiry);
 assert.ok(!owner.html.includes('<script>'));assert.ok(owner.html.includes('&lt;script&gt;'));assert.ok(client.html.includes('no longer operating rentals'));assert.ok(owner.html.includes('mailto:alex%40example.com'));assert.ok(client.text.includes('not a reservation'));
});
for(const invalid of [{email:'someone@example.com\r\nBcc:other@example.com'},{message:'a'},{message:'a'.repeat(5001)},{firstName:''},{interests:'not-an-array'},{submissionId:'bad'}])test('invalid input rejected '+Object.keys(invalid)[0],()=>assert.throws(()=>validateContact({...body,...invalid}),{status:400}));
test('untrusted origins rejected',()=>assert.throws(()=>requireOrigin({headers:{origin:'https://other.example'}}),{status:403}));
for(const result of [{success:false},{success:true,action:'signup',hostname:'summitskibike.com'},{success:true,action:'contact',hostname:'evil.example'}])test('invalid CAPTCHA response rejected '+JSON.stringify(result),async()=>assert.rejects(verifyCaptcha('token','contact',env,async()=>({ok:true,json:async()=>result})),{status:403}));
test('valid CAPTCHA requires expected action and hostname',async()=>{await verifyCaptcha('token','contact',env,async()=>({ok:true,json:async()=>({success:true,action:'contact',hostname:'summitskibike.com'})}));});
test('network CAPTCHA failure fails closed',async()=>assert.rejects(verifyCaptcha('token','contact',env,async()=>{throw new Error('offline');}),{status:403}));
test('production CAPTCHA may not trust localhost',async()=>assert.rejects(verifyCaptcha('token','contact',{...env,VERCEL_ENV:'production',TURNSTILE_HOSTNAMES:'localhost'},async()=>{throw new Error('should not fetch');}),{status:503}));
function fakeStore(){const row={created_at:new Date().toISOString()};const log=[];return {row,log,accept:async()=>{log.push('saved');return {...row};},claim:async()=>({...row}),sent:async(id,kind,messageId)=>{row[kind+'_email_id']=messageId;},release:async()=>{log.push('released');}};}
test('inquiry is saved before email; owner and client have correct Reply-To',async()=>{
 const store=fakeStore(),sent=[];
 await processContact(body,req,{env,store,verify:async()=>{},send:async(payload,key)=>{assert.equal(store.log[0],'saved');sent.push({payload,key});return key;}});
 assert.equal(sent.length,2);assert.equal(sent[0].payload.reply_to,body.email);assert.equal(sent[1].payload.reply_to,env.OWNER_EMAIL);assert.deepEqual(sent[0].payload.to,[env.OWNER_EMAIL]);assert.deepEqual(sent[1].payload.to,[body.email]);assert.ok(sent.every(x=>x.payload.html&&x.payload.text));
});
test('partial email failure retains inquiry and retry sends only the missing email',async()=>{
 const store=fakeStore();let sends=0;
 await assert.rejects(processContact(body,req,{env,store,verify:async()=>{},send:async()=>{sends++;if(sends===2)throw new Error('provider unavailable');return 'owner-id';}}));
 assert.equal(store.row.owner_email_id,'owner-id');assert.equal(store.row.client_email_id,undefined);
 const retried=[];await processContact(body,req,{env,store,verify:async()=>{},send:async(payload,key)=>{retried.push(key);return 'client-id';}});
 assert.equal(retried.length,1);assert.ok(retried[0].endsWith('-client'));
});
test('completed duplicate submission does not send email again',async()=>{
 const store=fakeStore();store.row.owner_email_id='sent';store.row.client_email_id='sent';
 await processContact(body,req,{env,store,verify:async()=>{},send:async()=>{throw new Error('duplicate send');}});
});
test('missing provider setup fails before saving or sending',async()=>{
 let accessed=false;await assert.rejects(processContact(body,req,{env:{},store:{accept:()=>{accessed=true;}}}),{status:503});assert.equal(accessed,false);
});
test('CAPTCHA rejection never reaches storage or email',async()=>{
 let accessed=false;await assert.rejects(processContact(body,req,{env,store:{accept:()=>{accessed=true;}},verify:async()=>{throw new Error('captcha');}}));assert.equal(accessed,false);
});
