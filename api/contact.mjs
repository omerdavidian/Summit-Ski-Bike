import {readBody,requireOrigin,json,handleError} from '../lib/http.mjs';
import {processContact} from '../lib/contact.mjs';
export default async function handler(req,res){try{requireOrigin(req);const body=await readBody(req);json(res,200,await processContact(body,req));}catch(error){if(error.status===405)res.setHeader('Allow','POST');handleError(res,error);}}
