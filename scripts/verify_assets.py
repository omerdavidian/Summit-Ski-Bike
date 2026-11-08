from pathlib import Path
from urllib.parse import urlsplit,unquote
from bs4 import BeautifulSoup
import json,re,sys
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
missing=[];remote=[];checked=set()
def check(url,base):
    if not url or url.startswith(('data:','#','mailto:','tel:')):return
    p=urlsplit(url)
    if p.netloc:
        if p.hostname in ['summitskibike.com','www.summitskibike.com']:remote.append(url)
        return
    target=(DIST/unquote(p.path.lstrip('/'))) if p.path.startswith('/') else base.parent/unquote(p.path)
    if p.path and not target.exists():missing.append({'source':str(base.relative_to(DIST)),'asset':url})
    checked.add(str(target))
for path in DIST.rglob('*.html'):
    soup=BeautifulSoup(path.read_text(encoding='utf8'),'html.parser')
    for node in soup.select('img[src],script[src],link[rel=stylesheet],link[rel=icon]'):
        check(node.get('src') or node.get('href'),path)
    for node in soup.select('img[srcset]'):
        for candidate in node['srcset'].split(','):check(candidate.strip().split()[0],path)
    for node in soup.select('[data-slides]'):
        for url in json.loads(node['data-slides']):check(url,path)
    for style in soup.select('style'):
        for url in re.findall(r'url\([\"\']?([^\)\"\']+)',style.text):check(url,path)
for path in DIST.rglob('*.css'):
    for url in re.findall(r'url\([\"\']?([^\)\"\']+)',path.read_text(encoding='utf8')):check(url,path)
print(json.dumps({'checked':len(checked),'missing':missing,'remoteWordPressAssets':remote},indent=2))
sys.exit(1 if missing or remote else 0)
