"""One-time migration: retain the established markup/CSS, remove the WP runtime."""
import concurrent.futures, json, re, shutil
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import requests
from bs4 import BeautifulSoup, Comment
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
CONTENT = ROOT / 'src/content'
CONTENT.mkdir(parents=True, exist_ok=True)
BASE = 'https://summitskibike.com'
HEADERS = {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36','Accept':'*/*','Accept-Language':'en-US,en;q=0.9'}
pending = set()

def asset(url, context=BASE):
    url = url.replace('\\/','/')
    absolute = urljoin(context, url)
    p = urlsplit(absolute)
    if p.hostname in ('summitskibike.com','www.summitskibike.com') and p.path.startswith(('/wp-content/','/wp-includes/')) and '${' not in p.path:
        pending.add((absolute,p.path))
        return p.path
    return url

def rewrite_json(value):
    if isinstance(value,dict): return {k:rewrite_json(v) for k,v in value.items()}
    if isinstance(value,list): return [rewrite_json(v) for v in value]
    if isinstance(value,str): return asset(value) if value.startswith(('https:','http:','/wp-')) else value
    return value

def form(season):
    return f'''<form class="summit-form" action="/api/contact" method="post" data-contact>
    <h3>Any Questions About {'Bike Touring' if season=='summer' else 'Ski-Biking'}?</h3>
    <p class="archive-form-note">Summit is no longer operating rentals. You can still get in touch below.</p>
    <div class="form-grid"><label>First Name <span>*</span><input name="firstName" autocomplete="given-name" placeholder="First name here" required maxlength="80"></label>
    <label>Last Name <span>*</span><input name="lastName" autocomplete="family-name" placeholder="Last name here" required maxlength="80"></label>
    <label>Email Address <span>*</span><input name="email" type="email" autocomplete="email" placeholder="Add email" required maxlength="254"></label>
    <label>Phone Number <span>*</span><input name="phone" type="tel" autocomplete="tel" placeholder="Phone number" required maxlength="40"></label></div>
    <fieldset class="intent"><legend class="sr-only">Reason for contacting</legend><label><input name="interests" type="checkbox" value="Past rentals"> About past rentals</label><label><input name="interests" type="checkbox" value="General question"> I just have a question</label></fieldset>
    <label>Comments / Questions <span>*</span><textarea name="message" placeholder="Type text here" rows="7" required minlength="3" maxlength="5000"></textarea></label>
    <label class="honey" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <input type="hidden" name="season" value="{season}"><div class="captcha-slot"></div>
    <p class="form-status" role="status" aria-live="polite"></p><button type="submit">Send Message</button>
    <p class="form-privacy">Your details are used to respond to this message. <a href="/privacy-policy/">Privacy policy</a></p>
    </form>'''

pages={}
for slug in ['home','touring-bike','disclaimer','privacy-policy','terms-and-conditions']:
    soup=BeautifulSoup((ROOT/'private-backup'/f'{slug}.html').read_text(encoding='utf8'),'html.parser')
    season='summer' if slug=='touring-bike' else 'winter'
    for x in soup.find_all(string=lambda x:isinstance(x,Comment)): x.extract()
    for node in soup.select('script:not([type="application/ld+json"]),noscript,#wpadminbar,link[rel="profile"],link[rel="pingback"],link[rel="alternate"]'):
        node.decompose()
    for x in soup.select('meta[name="generator"],meta[name="viewport"],meta[charset]'): x.decompose()
    for link in soup.select('link[as="style"]'):
        link['rel']='stylesheet'
        for k in ['as','onload']: link.attrs.pop(k,None)
    for img in soup.find_all('img'):
        for target,source in [('src','data-src'),('srcset','data-srcset'),('sizes','data-sizes')]:
            if img.get(source): img[target]=img[source]
        img['loading']='lazy'
        if img.find_parent(['header']) or img.find_parent(class_='navbar'): img['loading']='eager'
    for encoded in soup.select('[data-cfemail]'):
        raw=bytes.fromhex(encoded['data-cfemail']); email=''.join(chr(b^raw[0]) for b in raw[1:]); encoded.clear(); encoded.string=email
        encoded.attrs.pop('data-cfemail',None)
        if encoded.name=='a': encoded['href']='mailto:'+email
    for wrapper in soup.select('.elementor-widget-metform'):
        wrapper.clear(); wrapper.append(BeautifulSoup(form(season),'html.parser'))
    for node in soup.find_all(True):
        for attr in list(node.attrs):
            if attr.startswith('on') or attr in ['data-form-nonce','data-wp-nonce']: node.attrs.pop(attr,None)
        if 'class' in node.attrs:
            node['class']=[x for x in node['class'] if x not in ['elementor-invisible','e-lazyload']]
        if node.get('data-settings'):
            settings=rewrite_json(json.loads(node['data-settings']))
            if settings.get('background_slideshow_gallery'):
                node['data-slides']=json.dumps([x['url'] for x in settings['background_slideshow_gallery']])
                node['class']=node.get('class',[])+['summit-slideshow']
            node.attrs.pop('data-settings',None)
        for attr in ['data-items','data-item-indicator','data-id','data-widget_type','data-e-type','data-element_type','data-elementor-open-lightbox','data-elementor-lightbox-slideshow']:
            node.attrs.pop(attr,None)
        for attr in ['src','href','poster']:
            if node.get(attr): node[attr]=asset(node[attr])
        if node.get('srcset'):
            node['srcset']=', '.join(' '.join([asset(p.split()[0])]+p.split()[1:]) for p in node['srcset'].split(',') if p.strip())
        for attr in ['data-src','data-srcset','data-sizes','data-lazyloaded']: node.attrs.pop(attr,None)
        if node.get('href','').startswith(BASE) and node.name=='a':
            node['href']=node['href'][len(BASE):] or '/'
        if node.get('href','').startswith('https://www.summitskibike.com'): node['href']=node['href'].replace('https://www.summitskibike.com','') or '/'
        if node.get('href')=='/bike-touring/': node['href']='/touring-bike/'
    # Unique accordion and section IDs allow reliable deep links and accessibility.
    seen=set()
    for node in soup.select('[id]'):
        ident=node['id']
        if ident in seen: node['id']=ident+'-additional'
        seen.add(node['id'])
    for idx,card in enumerate(soup.select('.jkit-accordion .card-wrapper')):
        trigger=card.select_one('.card-header-button'); panel=card.select_one('.card-expand')
        if trigger and panel:
            panel['id']=f'faq-answer-{idx+1}'; trigger['href']='#'+panel['id']; trigger['aria-controls']=panel['id'];trigger['aria-expanded']='true' if 'expand' in card.get('class',[]) else 'false'
    for link in soup.select('.gallery-link'): link['aria-label']='View gallery photograph'
    gallery=soup.select_one('.jkit-gallery')
    if gallery:
        for node in gallery.select('.load-more-items'): node.decompose() # Eight images are already displayed; no hidden items exist.
    for newsletter in soup.select('form.jkit-mailchimp-form'):
        newsletter['action']='/api/newsletter'; newsletter['data-newsletter']=''
        for k in ['data-listed','data-error-message','data-success-message']: newsletter.attrs.pop(k,None)
        status=soup.new_tag('p',attrs={'class':'form-status','role':'status','aria-live':'polite'});newsletter.append(status)
        honey=soup.new_tag('input',attrs={'name':'website','tabindex':'-1','autocomplete':'off','class':'honey','aria-hidden':'true'});newsletter.append(honey)
        slot=soup.new_tag('div',attrs={'class':'captcha-slot'});newsletter.append(slot)
    for script in soup.select('script[type="application/ld+json"]'):
        data=rewrite_json(json.loads(script.string))
        for entry in data.get('@graph',[]):
            if entry.get('@type')=='Organization':
                for contact in entry.get('contactPoint',[]): contact['telephone']='+17208932060'
            if entry.get('@type')=='WebSite': entry.pop('potentialAction',None)
            if season=='summer' and entry.get('@type')=='VideoObject': entry['embedUrl']='https://www.youtube.com/embed/QmFsDz4r2OI'
        script.string=json.dumps(data,ensure_ascii=False)
    if slug not in ['home','touring-bike']:
        soup.title.string=f'{slug.replace("-"," ").title()} | Summit Ski Bike'
    if season=='summer':
        for x in soup.select('meta[property="og:video"]'): x['content']='https://www.youtube.com/embed/QmFsDz4r2OI'
    body=soup.body
    main=body.select_one('#page') or body
    main['id']='main-content'
    notice=BeautifulSoup('<aside class="archive-notice">Summit Ski &amp; Bike is no longer operating rentals. This website is preserved as an archive. <a href="/#form">Contact us</a></aside>','html.parser')
    main.insert(0,notice)
    for link in soup.select('a[href="#contact"],a[href$="/#contact"]'):
        if link.get_text(strip=True) in ['Booking Now','Rent a SkiBike','Rent a Bike']: link.string='Contact Us'
    for text in soup.find_all(string=True):
        if text.parent.name not in ['script','style'] and 'Ready to book or have some questions?' in text:
            text.replace_with('Summit is no longer offering rentals. If you have a question about a past visit or this archive, you can still contact us below.')
    for style in soup.find_all('style'):
        style.string=re.sub(r'url\([\"\']?([^\)\"\']+)[\"\']?\)',lambda m:'url("'+asset(m[1])+'")',style.text)
    pages[slug]={'head':str(soup.head)[6:-7],'bodyClass':' '.join(body.get('class',[])),'season':season,'body':body.decode_contents()}

done=set()
failures=[]
while tasks := [(u,p) for u,p in pending if (u,p) not in done]:
    def fetch(task):
        url,path=task;dest=PUBLIC/path.lstrip('/');dest.parent.mkdir(parents=True,exist_ok=True)
        if not dest.exists():
            r=requests.get(url,headers=HEADERS,timeout=45);r.raise_for_status();dest.write_bytes(r.content)
        if dest.suffix=='.css':
            content=dest.read_text(encoding='utf8')
            content=re.sub(r'url\([\"\']?([^\)\"\']+)[\"\']?\)',lambda m:'url("'+asset(m[1],url)+'")',content)
            dest.write_text(content,encoding='utf8')
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(fetch,t):t for t in tasks}
        for future in concurrent.futures.as_completed(futures):
            task=futures[future];done.add(task)
            try: future.result()
            except Exception as e: failures.append({'url':task[0],'error':str(e)})
    print('Localized',len(done),'assets',flush=True)

report=[];replacements={}
for path in list(PUBLIC.rglob('*')):
    if path.suffix.lower() not in ['.jpg','.jpeg','.png','.webp'] or '.optimized.' in path.name: continue
    original=ROOT/'private-backup/media'/path.relative_to(PUBLIC)
    original.parent.mkdir(parents=True,exist_ok=True)
    if not original.exists(): shutil.copy2(path,original)
    try:
        with Image.open(original) as image:
            if getattr(image,'is_animated',False): continue
            before=original.stat().st_size;dimensions=image.size
            image.thumbnail((1920,1920),Image.Resampling.LANCZOS)
            candidate=path.with_name(path.stem+'.optimized.webp');image.save(candidate,'WEBP',quality=84,method=6)
            if candidate.stat().st_size<before:
                old='/'+path.relative_to(PUBLIC).as_posix();new='/'+candidate.relative_to(PUBLIC).as_posix();replacements[old]=new
                report.append({'original':old,'optimized':new,'before':before,'after':candidate.stat().st_size,'originalDimensions':dimensions,'dimensions':image.size})
            else: candidate.unlink(missing_ok=True)
    except Exception as e: failures.append({'file':str(path),'error':str(e)})
for slug,data in pages.items():
    content=json.dumps(data,ensure_ascii=False)
    for old,new in sorted(replacements.items(),key=lambda x:len(x[0]),reverse=True): content=re.sub(re.escape(old)+r'(?![\w.\-])',lambda m:new,content)
    (CONTENT/f'{slug}.json').write_text(content,encoding='utf8')
for path in PUBLIC.rglob('*.css'):
    content=path.read_text(encoding='utf8')
    for old,new in replacements.items(): content=content.replace(old,new)
    path.write_text(content,encoding='utf8')
# The public root must contain assets only; Astro owns page generation.
for slug in ['','touring-bike','disclaimer','privacy-policy','terms-and-conditions']:
    (PUBLIC/slug/'index.html').unlink(missing_ok=True)
(ROOT/'migration-report.json').write_text(json.dumps({'assets':len(done),'optimization':report,'failures':failures},indent=2),encoding='utf8')
print('Optimized',len(report),'images; bytes saved:',sum(x['before']-x['after'] for x in report),'failures:',len(failures))
