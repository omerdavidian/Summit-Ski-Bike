import {createHash} from 'node:crypto';
import {readBody,requireOrigin,json,handleError,HttpError} from '../lib/http.mjs';
import {verifyCaptcha} from '../lib/security.mjs';
export default async function handler(req,res){
  try{
    requireOrigin(req);const body=await readBody(req);
    if(body.website||typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email))throw new HttpError(400,'Please enter a valid email address.');
    const {MAILCHIMP_API_KEY:key,MAILCHIMP_LIST_ID:list}=process.env;
    if(!key||!list)throw new HttpError(503,'Newsletter signup is currently unavailable.');
    await verifyCaptcha(body['cf-turnstile-response'],'newsletter');
    const dc=key.split('-').at(-1);if(!/^us\d+$/.test(dc))throw new Error('Invalid Mailchimp configuration');
    const email=body.email.trim().toLowerCase(),hash=createHash('md5').update(email).digest('hex');
    // status_if_new preserves existing unsubscribe/suppression state. New contacts
    // must confirm through Mailchimp's double-opt-in email.
    const response=await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(list)}/members/${hash}`,{method:'PUT',headers:{Authorization:`Basic ${Buffer.from('summit:'+key).toString('base64')}`,'Content-Type':'application/json'},body:JSON.stringify({email_address:email,status_if_new:'pending'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new HttpError(503,'Newsletter signup could not be completed. Please try later.');
    json(res,200,{message:'If eligible, you will receive an email to confirm your subscription.'});
  }catch(error){handleError(res,error);}
}
