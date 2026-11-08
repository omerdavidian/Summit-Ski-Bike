import base64,hashlib,re,pathlib,urllib.parse
from bs4 import BeautifulSoup

root=pathlib.Path('dist');issues=[];files=list(root.rglob('*.html'))
for file in files:
 raw=file.read_text(encoding='utf-8');s=BeautifulSoup(raw,'html.parser');where=str(file)
 def check(ok,message):
  if not ok:issues.append(where+': '+message)
 policy=s.select_one('meta[http-equiv="Content-Security-Policy"]')
 check(bool(policy),'Missing CSP')
 if policy:
  content=policy['content'];script_policy=next(d for d in content.split(';') if d.strip().startswith('script-src'))
  check('unsafe-inline' not in script_policy and 'unsafe-eval' not in script_policy,'Unsafe script policy')
  for attributes,body in re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>',raw,re.I):
   if not re.search(r'\bsrc\s*=',attributes,re.I) and body.strip():check('sha256-'+base64.b64encode(hashlib.sha256(body.encode()).digest()).decode() in content,'Inline script hash mismatch')
 check(bool(s.select_one('main')),'Missing main landmark')
 ids=[e['id'] for e in s.select('[id]')];check(len(ids)==len(set(ids)),'Duplicate IDs')
 check(not any(any(k.startswith('on') for k in e.attrs) for e in s.find_all()),'Inline event handler')
 for a in s.select('a[href]'):
  href=a['href'];check(bool(href),'Empty link')
  check(not href.startswith(('javascript:','http:')),'Unsafe link scheme')
  if a.get('target')=='_blank':check('noopener' in a.get('rel',[]),'External window missing noopener')
  u=urllib.parse.urlsplit(href)
  if u.scheme or u.netloc or href.startswith('mailto:'):continue
  path=urllib.parse.unquote(u.path)
  target=(root/path.lstrip('/')) if path.startswith('/') else file.parent/path
  if not path:target=file
  if target.is_dir():target=target/'index.html'
  check(target.exists(),'Missing link target '+href)
  if target.exists() and u.fragment and target.suffix=='.html':
   other=s if target==file else BeautifulSoup(target.read_text(encoding='utf-8'),'html.parser')
   check(other.find(id=u.fragment) is not None,'Broken anchor '+href)
 print(where+': checked')
if issues:raise SystemExit('\n'.join(issues))
print(f'{len(files)} pages passed link, landmark, ID, and CSP checks.')
