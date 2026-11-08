import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Hash exact built inline scripts instead of permitting arbitrary inline JS.
async function secure(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()){await secure(file);continue;}
    if(!entry.name.endsWith('.html'))continue;
    let html=await readFile(file,'utf8');
    html=html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>/gi,'');
    const hashes=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(([,attributes,body])=>!(/\bsrc\s*=/i).test(attributes)&&body.trim())
      .map(([, ,body])=>`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
    const policy=["default-src 'self'",`script-src 'self' https://challenges.cloudflare.com ${[...new Set(hashes)].join(' ')}`,
      "style-src 'self' 'unsafe-inline'","img-src 'self' data:","font-src 'self' data:",
      "connect-src 'self' https://challenges.cloudflare.com","frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com",
      "object-src 'none'","base-uri 'self'","form-action 'self'"].join('; ');
    const meta=`<meta http-equiv="Content-Security-Policy" content="${policy}">`;
    html=html.replace(/<head([^>]*)>/i,`<head$1>${meta}`);
    await writeFile(file,html);
  }
}
await secure('dist');
console.log('Applied per-page CSP hashes to built HTML.');
