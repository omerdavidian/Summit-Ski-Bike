import {json} from '../lib/http.mjs';
export default function handler(req,res){json(res,200,{turnstileSiteKey:process.env.TURNSTILE_SITE_KEY||null,contactEnabled:Boolean(process.env.RESEND_API_KEY&&process.env.DATABASE_URL&&process.env.TURNSTILE_SECRET),newsletterEnabled:Boolean(process.env.MAILCHIMP_API_KEY&&process.env.MAILCHIMP_LIST_ID)});}
