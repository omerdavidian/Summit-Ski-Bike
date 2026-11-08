import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {renderEmail} from '../lib/email.mjs';
const root=path.resolve('dist');const host='127.0.0.1';const port=4321;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.json':'application/json','.xml':'application/xml','.txt':'text/plain'};
const sample={id:'11111111-2222-4333-8444-555555555555',reference:'SSB-DEMO2026',firstName:'Alex',lastName:'Morgan',email:'alex@example.com',phone:'(555) 010-2026',season:'winter',interests:['General question'],message:'Hi Omer,\n\nI came across the photos from Summit and wanted to say how much I enjoyed our time on the mountain. Thanks for keeping these memories online!\n\nAlex'};
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${host}:${port}`);
    if(url.pathname==='/'&&url.searchParams.has('s')){res.statusCode=302;res.setHeader('Location','/search/?q='+encodeURIComponent(url.searchParams.get('s')));res.end();return;}
    if(url.pathname.startsWith('/__preview/email/')){
      const kind=url.pathname.includes('owner')?'owner':'client';
      const email=renderEmail(kind,{...sample,season:url.searchParams.get('season')==='summer'?'summer':'winter'},{siteUrl:`http://${host}:${port}`});
      res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Robots-Tag','noindex, nofollow');res.end(email.html);return;
    }
    if(/^\/api\/(contact|newsletter|config)$/.test(url.pathname)){
      const {default:handler}=await import(`../api/${url.pathname.split('/').at(-1)}.mjs`);await handler(req,res);return;
    }
    const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(target!==root&&!target.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
    let file=target;try{if((await stat(file)).isDirectory())file=path.join(file,'index.html');}catch{}
    try{const data=await readFile(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);}catch{res.statusCode=404;res.setHeader('Content-Type','text/html');res.end(await readFile(path.join(root,'404.html')));}
  }catch{res.statusCode=500;res.end('Preview error');}
}).listen(port,host,()=>console.log(`Local: http://${host}:${port}`));
