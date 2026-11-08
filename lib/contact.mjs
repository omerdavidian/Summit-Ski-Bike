import {HttpError} from './http.mjs';
import {validateContact,verifyCaptcha,requestFingerprint,clientHash} from './security.mjs';
import {createStore} from './store.mjs';
import {renderEmail} from './email.mjs';
export async function sendEmail(payload,key,env=process.env,fetcher=fetch){
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new HttpError(503,'Your message has been saved, but email delivery is delayed. Please retry this form or email summitskibike@gmail.com.');
  const result=await response.json();if(!result.id)throw new Error('Invalid email response');return result.id;
}
export async function processContact(body,req,{env=process.env,store,verify=verifyCaptcha,send=sendEmail}={}){
  if(body.website)throw new HttpError(400,'Unable to accept this submission.');
  const inquiry=validateContact(body);
  if(!env.RESEND_API_KEY||!env.EMAIL_FROM||!env.OWNER_EMAIL)throw new HttpError(503,'The form is being configured. Please email summitskibike@gmail.com.');
  await verify(body['cf-turnstile-response'],'contact',env);
  store ||= createStore(env);
  const row=await store.accept(inquiry,requestFingerprint(inquiry),clientHash(req,env));
  if(row.owner_email_id&&row.client_email_id)return {message:`Your message has been received. Reference: ${inquiry.reference}`,reference:inquiry.reference};
  const locked=await store.claim(inquiry.id);
  if(!locked)throw new HttpError(409,'This message is still processing. Please wait a moment and try again.');
  try{
    for(const kind of ['owner','client']){
      if(locked[`${kind}_email_id`])continue;
      const template=renderEmail(kind,inquiry,{siteUrl:env.SITE_URL||'https://summitskibike.com',replyTo:env.REPLY_TO_EMAIL||env.OWNER_EMAIL});
      const payload={from:env.EMAIL_FROM,to:[kind==='owner'?env.OWNER_EMAIL:inquiry.email],reply_to:kind==='owner'?inquiry.email:(env.REPLY_TO_EMAIL||env.OWNER_EMAIL),...template};
      const age=Date.now()-new Date(locked.created_at).getTime();
      // Resend idempotency keys expire after 24 hours. Uncertain deliveries older
      // than that require owner review, rather than risking duplicate messages.
      if(age>23*60*60*1000)throw new HttpError(503,'Your message was saved. Please email summitskibike@gmail.com for follow-up.');
      const id=await send(payload,`summit-${inquiry.id}-${kind}`,env);
      await store.sent(inquiry.id,kind,id);
    }
  }finally{await store.release(inquiry.id);}
  return {message:`Thanks! Your message has been received. Check your email for a copy. Reference: ${inquiry.reference}`,reference:inquiry.reference};
}
