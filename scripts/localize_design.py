"""Localize references from the current per-page style sheets."""
from pathlib import Path
from urllib.parse import urljoin,urlsplit
import json,re,requests
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'public'
report=json.loads((ROOT/'migration-report.json').read_text(encoding='utf8'))
mapping={x['original']:x['optimized'] for x in report['optimization']}
headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36','Accept':'*/*'}
def local(match):
    url=match[1]
    if url.startswith('data:'):return match[0]
    absolute=urljoin('https://summitskibike.com/',url);p=urlsplit(absolute)
    if p.hostname not in ['summitskibike.com','www.summitskibike.com']:return match[0]
    path=PUBLIC/p.path.lstrip('/')
    if not path.exists():
        response=requests.get(absolute,headers=headers,timeout=45);response.raise_for_status();path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(response.content)
    if p.path not in mapping and path.suffix.lower() in ['.png','.jpg','.jpeg','.webp']:
        original=ROOT/'private-backup/media'/path.relative_to(PUBLIC);original.parent.mkdir(parents=True,exist_ok=True)
        if not original.exists():original.write_bytes(path.read_bytes())
        with Image.open(original) as image:
            before=original.stat().st_size;dimensions=image.size;image.thumbnail((1920,1920),Image.Resampling.LANCZOS)
            candidate=path.with_name(path.stem+'.optimized.webp');image.save(candidate,'WEBP',quality=84,method=6)
            if candidate.stat().st_size<before:
                new='/'+candidate.relative_to(PUBLIC).as_posix();mapping[p.path]=new
                report['optimization'].append({'original':p.path,'optimized':new,'before':before,'after':candidate.stat().st_size,'originalDimensions':dimensions,'dimensions':image.size})
            else:candidate.unlink(missing_ok=True)
    return 'url("'+mapping.get(p.path,p.path)+'")'
for path in (PUBLIC/'design').glob('*.css'):
    css=path.read_text(encoding='utf8');css=re.sub(r'url\([\"\']?([^\)\"\']+)[\"\']?\)',local,css);path.write_text(css,encoding='utf8')
(ROOT/'migration-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('Current layout CSS localized. Optimized images:',len(report['optimization']))
