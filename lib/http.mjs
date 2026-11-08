export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export function json(res,status,payload){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.statusCode=status;res.end(JSON.stringify(payload));}
export async function readBody(req) {
  if(req.method!=='POST')throw new HttpError(405,'Use POST to submit this form.');
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'Send JSON form data.');
  if(Number(req.headers['content-length']||0)>16000)throw new HttpError(413,'Your message is too long.');
  if(req.body && typeof req.body==='object') {if(Buffer.byteLength(JSON.stringify(req.body))>16000)throw new HttpError(413,'Your message is too long.');return req.body;}
  let raw=typeof req.body==='string'?req.body:'';
  if(!raw)for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)throw new HttpError(413,'Your message is too long.');}
  try{const data=JSON.parse(raw);if(!data||Array.isArray(data)||typeof data!=='object')throw new Error();return data;}catch{throw new HttpError(400,'Invalid form submission.');}
}
export function requireOrigin(req,env=process.env){
  const origin=req.headers.origin;
  const allowed=(env.ALLOWED_ORIGINS||'https://summitskibike.com,https://www.summitskibike.com').split(',').map(x=>x.trim());
  if(!origin||!allowed.includes(origin))throw new HttpError(403,'This form must be submitted from the Summit website.');
}
export const handleError=(res,error)=>{if(!error.status)console.error('Form processing failed:',error.name);json(res,error.status||503,{error:error.status?error.message:'The form is temporarily unavailable. Please email summitskibike@gmail.com.'});};
