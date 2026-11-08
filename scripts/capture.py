"""Preserve public WordPress pages and localize their assets for migration."""
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import concurrent.futures, hashlib, json, re
import requests
from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
BACKUP = ROOT / 'private-backup'
PUBLIC.mkdir(exist_ok=True)
BACKUP.mkdir(exist_ok=True)
BASE = 'https://summitskibike.com/'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 'Accept-Language':'en-US,en;q=0.9'}
pages = ['', 'touring-bike/', 'disclaimer/', 'privacy-policy/', 'terms-and-conditions/']
assets = {}

def localize(url):
    absolute = urljoin(BASE, url)
    part = urlsplit(absolute)
    if part.hostname not in ('summitskibike.com', 'www.summitskibike.com') or not part.path.startswith('/wp-content/'):
        return url
    path = part.path
    if '..' in Path(path).parts:
        raise ValueError('Invalid asset path')
    assets[absolute] = path
    return path

def download(item):
    url, path = item
    dest = PUBLIC / path.lstrip('/')
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        response = requests.get(url, headers=HEADERS, timeout=60)
        response.raise_for_status()
        dest.write_bytes(response.content)
    return url, dest

for page in pages:
    response = requests.get(BASE + page, headers=HEADERS, timeout=60)
    response.raise_for_status()
    original = response.text
    (BACKUP / (page.strip('/') or 'home')).with_suffix('.html').write_text(original, encoding='utf-8')
    soup = BeautifulSoup(original, 'html.parser')
    for node in soup.select('#wpadminbar, link[rel="https://api.w.org/"], link[rel="EditURI"]'):
        node.decompose()
    for node in soup.find_all(True):
        for attr in ('src','href','data-src','data-lazy-src','poster'):
            if node.get(attr):
                node[attr] = localize(node[attr])
        for attr in ('srcset','data-srcset','data-lazy-srcset'):
            if node.get(attr):
                node[attr] = ', '.join(' '.join([localize(p.split()[0])] + p.split()[1:]) for p in node[attr].split(',') if p.strip())
    html = str(soup)
    html = re.sub(r'https?://(?:www\.)?summitskibike\.com/wp-content/[^\s\"\'<>\\)]+', lambda m: localize(m[0]), html)
    target = PUBLIC / page / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding='utf-8')
    print('Captured', page or '/', flush=True)

done = set()
failures = []
while pending := [(u,p) for u,p in assets.items() if u not in done]:
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(download, item): item for item in pending}
        for future in concurrent.futures.as_completed(futures):
            url, path = futures[future]
            done.add(url)
            try:
                _, dest = future.result()
                if dest.suffix in ('.css','.js'):
                    content = dest.read_text(encoding='utf-8')
                    for match in re.findall(r'url\([\"\']?([^\)\"\']+)', content):
                        absolute = urljoin(url, match)
                        replacement = localize(absolute)
                        if replacement != absolute:
                            content = content.replace(match, replacement)
                    content = re.sub(r'https?://summitskibike\.com/wp-content/[^\s\"\'<>\\)]+', lambda m: localize(m[0]), content)
                    dest.write_text(content, encoding='utf-8')
            except Exception as error:
                failures.append({'url':url,'error':str(error)})
    print('Assets processed', len(done), flush=True)

report = []
replacements = {}
for path in PUBLIC.rglob('*'):
    if path.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'):
        continue
    try:
        with Image.open(path) as image:
            if getattr(image,'is_animated',False):
                continue
            size = path.stat().st_size
            dimensions = image.size
            image.thumbnail((1920,1920), Image.Resampling.LANCZOS)
            candidate = path.with_name(path.stem + '.optimized.webp')
            image.save(candidate, 'WEBP', quality=84, method=6)
            if candidate.stat().st_size < size:
                old = '/' + path.relative_to(PUBLIC).as_posix()
                new = '/' + candidate.relative_to(PUBLIC).as_posix()
                replacements[old] = new
                report.append({'original':old,'optimized':new,'before':size,'after':candidate.stat().st_size,'dimensions':dimensions,'outputDimensions':image.size})
            else:
                candidate.unlink()
    except Exception as error:
        failures.append({'file':str(path),'error':str(error)})
for path in PUBLIC.rglob('*'):
    if path.suffix not in ('.html','.css','.js'):
        continue
    content = path.read_text(encoding='utf-8')
    for old,new in sorted(replacements.items(),key=lambda pair:len(pair[0]),reverse=True):
        content = content.replace(old,new)
    path.write_text(content,encoding='utf-8')
(ROOT / 'migration-report.json').write_text(json.dumps({'assets':len(done),'optimization':report,'failures':failures},indent=2),encoding='utf-8')
print('Saved bytes',sum(x['before']-x['after'] for x in report),'Failures',len(failures))
