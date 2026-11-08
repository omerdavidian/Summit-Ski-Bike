import {createHash} from 'node:crypto';
import {HttpError} from './http.mjs';
export function validateContact(body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'Invalid form submission.');
  const limits={firstName:80,lastName:80,email:254,phone:40,message:5000};const result={};
  for(const [key,max] of Object.entries(limits)){
    const value=body[key];if(typeof value!=='string'||!value.trim()||value.length>max)throw new HttpError(400,`Please check your ${key==='firstName'?'first name':key==='lastName'?'last name':key}.`);
    result[key]=value.trim();
  }
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email)||/[\x00-\x1f\x7f]/.test(result.email))throw new HttpError(400,'Please enter a valid email address.');
  if(result.message.length<3)throw new HttpError(400,'Please add a longer message.');
  result.email=result.email.toLowerCase();result.season=body.season==='summer'?'summer':'winter';
  if(body.interests!==undefined && (!Array.isArray(body.interests)||body.interests.length>2))throw new HttpError(400,'Please check the message topic.');
  if((body.interests||[]).some(x=>!['Past rentals','General question'].includes(x)))throw new HttpError(400,'Please check the message topic.');
  result.interests=[...new Set(body.interests||[])];
  if(typeof body.submissionId!=='string'||!(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i).test(body.submissionId))throw new HttpError(400,'Please refresh the form and try again.');
  result.id=body.submissionId;result.reference='SSB-'+body.submissionId.slice(0,8).toUpperCase();return result;
}
export async function verifyCaptcha(token,action,env=process.env,fetcher=fetch){
  const hosts=new Set((env.TURNSTILE_HOSTNAMES||'').split(',').map(x=>x.trim()).filter(Boolean));
  if(!env.TURNSTILE_SECRET||!hosts.size)throw new HttpError(503,'The contact form is being configured. Please email summitskibike@gmail.com.');
  if(env.VERCEL_ENV==='production' && [...hosts].some(x=>['localhost','127.0.0.1'].includes(x)))throw new HttpError(503,'The form is temporarily unavailable.');
  if(typeof token!=='string'||!token||token.length>2048)throw new HttpError(403,'Please complete the spam check.');
  let result;
  try{const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();result=await response.json();}catch{throw new HttpError(403,'The spam check could not be verified. Please try again.');}
  if(result.success!==true||result.action!==action||!hosts.has(result.hostname))throw new HttpError(403,'The spam check expired or failed. Please try again.');
}
export function requestFingerprint(inquiry){return createHash('sha256').update(JSON.stringify([inquiry.firstName,inquiry.lastName,inquiry.email,inquiry.phone,inquiry.message,inquiry.season,inquiry.interests])).digest('hex');}
export function clientHash(req,env=process.env){if(!env.RATE_LIMIT_SALT)throw new HttpError(503,'The form is temporarily unavailable.');return createHash('sha256').update(env.RATE_LIMIT_SALT+String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim()).digest('hex');}
