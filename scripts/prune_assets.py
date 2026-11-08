"""Keep only runtime assets; archive unused migration files outside deployment."""
from pathlib import Path
from urllib.parse import urlsplit,urljoin,unquote
import json,re,shutil
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];PUBLIC=(ROOT/'public').resolve();ARCHIVE=(ROOT/'private-backup/unused-public').resolve()
assert PUBLIC==Path('C:/Coding/Summit Ski Bike/public').resolve()
assert ARCHIVE.is_relative_to((ROOT/'private-backup').resolve())
used=set();queue=[]
def keep(url,context='/'):
    if not url or url.startswith(('data:','#','mailto:','tel:')):return
    full=urljoin('https://summitskibike.com'+context,url);p=urlsplit(full)
    if p.hostname not in ['summitskibike.com','www.summitskibike.com']:return
    path=(PUBLIC/unquote(p.path.lstrip('/'))).resolve()
    if not path.is_relative_to(PUBLIC) or not path.is_file() or path in used:return
    used.add(path)
    if path.suffix=='.css':queue.append(path)
for p in (ROOT/'src/content').glob('*.json'):
    data=json.loads(p.read_text(encoding='utf8'));soup=BeautifulSoup(data['head']+data['body'],'html.parser')
    for node in soup.select('[src],[href],[content]'):
        for attr in ['src','href','content']:keep(node.get(attr))
    for node in soup.select('[srcset]'):
        for candidate in node['srcset'].split(','):keep(candidate.strip().split()[0])
    for node in soup.select('[data-slides]'):
        for url in json.loads(node['data-slides']):keep(url)
    for style in soup.select('style'):
        for url in re.findall(r'url\([\"\']?([^\)\"\']+)',style.text):keep(url)
    for url in re.findall(r'(?:https?://summitskibike\.com)?/wp-content/[^\s"<>\\]+',data['head']+data['body']):keep(url)
for url in ['/site.css','/email/logo.png','/robots.txt','/sitemap.xml']:keep(url)
report=json.loads((ROOT/'migration-report.json').read_text(encoding='utf8'))
config=json.loads((ROOT/'vercel.json').read_text(encoding='utf8'))
existing={x['source'] for x in config['redirects']}
for item in report['optimization']:
    keep(item['optimized'])
    if item['original'] not in existing:
        config['redirects'].insert(0,{'source':item['original'],'destination':item['optimized'],'permanent':True})
(ROOT/'vercel.json').write_text(json.dumps(config,indent=2),encoding='utf8')
while queue:
    path=queue.pop();context='/'+path.relative_to(PUBLIC).as_posix()
    for url in re.findall(r'url\([\"\']?([^\)\"\']+)',path.read_text(encoding='utf8')):keep(url,context)
count=0;size=0
for path in list(PUBLIC.rglob('*')):
    if not path.is_file() or path in used:continue
    destination=ARCHIVE/path.relative_to(PUBLIC)
    assert path.resolve().is_relative_to(PUBLIC) and destination.resolve().is_relative_to(ARCHIVE)
    destination.parent.mkdir(parents=True,exist_ok=True)
    if destination.exists():
        if destination.read_bytes()==path.read_bytes():path.unlink()
        else:raise RuntimeError('Archive collision: '+str(destination))
    else:shutil.move(path,destination)
    count+=1;size+=destination.stat().st_size
print('Kept',len(used),'runtime assets; archived',count,'unused files,',size,'bytes')
