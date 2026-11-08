import {json} from '../lib/http.mjs';
export default function handler(req,res){json(res,200,{turnstileSiteKey:process.env.TURNSTILE_SITE_KEY||null,contactEnabled:['RESEND_API_KEY','DATABASE_URL','TURNSTILE_SECRET','TURNSTILE_SITE_KEY','TURNSTILE_HOSTNAMES','RATE_LIMIT_SALT','EMAIL_FROM','OWNER_EMAIL'].every(key=>Boolean(process.env[key])),newsletterEnabled:false});}
