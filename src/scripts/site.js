const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const navs = [...document.querySelectorAll('.navbar,.navbar-summer,.navbarSummer')];
const updateNav = () => navs.forEach(nav => nav.classList.toggle('scrolled', scrollY > 50));
addEventListener('scroll', updateNav, {passive:true}); updateNav();

document.querySelectorAll('.jkit-nav-menu').forEach(menu => {
  const open = menu.querySelector('.jkit-hamburger-menu');
  const close = menu.querySelector('.jkit-close-menu');
  const panel = menu.querySelector('.jkit-menu-wrapper');
  const overlay = menu.querySelector('.jkit-overlay');
  if (!open || !close || !panel) return;
  open.setAttribute('aria-expanded','false');open.setAttribute('aria-label','Open navigation');close.setAttribute('aria-label','Close navigation');
  panel.id ||= 'navigation-'+[...document.querySelectorAll('.jkit-nav-menu')].indexOf(menu);open.setAttribute('aria-controls',panel.id);
  const syncPanel = () => {const mobile=matchMedia('(max-width:1024px)').matches;const active=panel.classList.contains('is-open');panel.inert=mobile&&!active;if(mobile){panel.setAttribute('aria-hidden',String(!active));}else{panel.removeAttribute('aria-hidden');}};
  const setOpen = (active,returnFocus=true) => {
    panel.classList.toggle('is-open',active);panel.classList.toggle('active',active);overlay?.classList.toggle('is-open',active);
    document.body.classList.toggle('summit-menu-open',active);open.setAttribute('aria-expanded',String(active));
    syncPanel();if(active) close.focus(); else if(returnFocus) open.focus({preventScroll:true});
  };
  open.addEventListener('click',()=>setOpen(true)); close.addEventListener('click',()=>setOpen(false));
  overlay?.addEventListener('click',()=>setOpen(false));
  panel.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{if(panel.classList.contains('is-open'))setOpen(false,false);}));
  addEventListener('resize',()=>{if(innerWidth>1024&&panel.classList.contains('is-open'))setOpen(false,false);syncPanel();});syncPanel();
  addEventListener('keydown',event=>{
    if(!panel.classList.contains('is-open')) return;
    if(event.key==='Escape') setOpen(false);
    if(event.key==='Tab') {
      const focusables=[...panel.querySelectorAll('a[href],button')].filter(el=>el.getClientRects().length);
      const first=focusables[0], last=focusables.at(-1);
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
});

document.querySelectorAll('[data-slides]').forEach(section=>{
  const urls=JSON.parse(section.dataset.slides || '[]'); if(!urls.length) return;
  const slides=section.querySelector(':scope > .summit-slides')||document.createElement('div'); slides.className='summit-slides';slides.setAttribute('aria-hidden','true');
  const images=urls.map((url,index)=>{
    const img=index===0?(slides.querySelector('img')||new Image()):new Image();img.alt='';img.decoding='async';img.src=url;img.classList.toggle('is-active',index===0);
    if(index===0) img.fetchPriority='high'; else img.loading='lazy';
    slides.append(img);return img;
  });section.prepend(slides);
  let index=0,paused=reducedMotion,zoomIn=true,timer;
  const zooms=new Map();
  const startZoom=image=>{
    if(reducedMotion)return;
    zooms.get(image)?.cancel();
    const scales=zoomIn?[1.03,1.1]:[1.1,1.03];zoomIn=!zoomIn;
    image.dataset.zoom=scales[0]<scales[1]?'in':'out';
    const animation=image.animate(scales.map(scale=>({transform:`scale(${scale})`})),{duration:5600,easing:'linear',fill:'forwards'});
    if(paused)animation.pause();zooms.set(image,animation);
  };
  if(images.length>1){
    startZoom(images[0]);images[0].style.zIndex='2';
    const controls=document.createElement('div');controls.className='slideshow-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Hero slideshow controls');
    const dots=images.map((image,i)=>{
      const dot=document.createElement('button');dot.type='button';dot.className='slideshow-dot';dot.setAttribute('aria-label',`Show slide ${i+1} of ${images.length}`);dot.addEventListener('click',()=>{showSlide(i);schedule();});controls.append(dot);return dot;
    });
    const toggle=document.createElement('button');toggle.type='button';toggle.className='slideshow-toggle';
    const icon=document.createElement('span');icon.className='slideshow-toggle-icon';icon.setAttribute('aria-hidden','true');toggle.append(icon);controls.append(toggle);section.append(controls);
    const syncControls=()=>{
      dots.forEach((dot,i)=>{if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
      toggle.setAttribute('aria-label',paused?'Play slideshow':'Pause slideshow');toggle.setAttribute('aria-pressed',String(paused));
    };
    const showSlide=next=>{
      if(next===index)return;
      const outgoing=images[index];outgoing.style.zIndex='1';
      index=next;const incoming=images[index];
      startZoom(incoming);incoming.style.zIndex='2';incoming.classList.add('is-active');syncControls();
      // Keep the old image at its current zoom until the new image fully covers it.
      setTimeout(()=>{if(outgoing!==images[index]){outgoing.classList.remove('is-active');outgoing.style.zIndex='0';}},550);
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!document.hidden&&!paused)showSlide((index+1)%images.length);schedule();},5000);};
    toggle.addEventListener('click',()=>{paused=!paused;zooms.forEach(animation=>paused?animation.pause():animation.play());syncControls();schedule();});
    syncControls();schedule();
  }

});

document.querySelectorAll('.jkit-accordion').forEach(accordion=>{
  const cards=[...accordion.querySelectorAll('.card-wrapper')];
  cards.forEach(card=>{
    const trigger=card.querySelector('.card-header-button'),panel=card.querySelector('.card-expand'); if(!trigger||!panel)return;
    panel.hidden=!card.classList.contains('expand');trigger.setAttribute('aria-expanded',String(!panel.hidden));
    const setExpanded=(target,expanded)=>{
      const answer=target.querySelector('.card-expand'),button=target.querySelector('.card-header-button');if(!answer)return;
      const from=answer.hidden?0:answer.getBoundingClientRect().height;
      answer.getAnimations().forEach(animation=>animation.cancel());
      target.classList.toggle('expand',expanded);button?.setAttribute('aria-expanded',String(expanded));
      answer.hidden=false;answer.inert=!expanded;
      const to=expanded?answer.scrollHeight:0;
      if(reducedMotion){answer.hidden=!expanded;return;}
      const animation=answer.animate([{height:from+'px',opacity:from?1:0,overflow:'hidden'},{height:to+'px',opacity:expanded?1:0,overflow:'hidden'}],{duration:110,easing:'ease-out'});
      animation.onfinish=()=>{answer.hidden=!expanded;};
    };
    trigger.addEventListener('click',event=>{
      event.preventDefault();const expanded=trigger.getAttribute('aria-expanded')!=='true';
      cards.forEach(other=>{if(other!==card&&other.classList.contains('expand'))setExpanded(other,false);});
      setExpanded(card,expanded);
    });
    trigger.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();trigger.click();}});
  });
});

const dialog=document.createElement('dialog');dialog.className='summit-lightbox';dialog.setAttribute('aria-label','Media viewer');
dialog.innerHTML='<div class="lightbox-toolbar"><button type="button" data-prev aria-label="Previous photo">←</button><button type="button" data-next aria-label="Next photo">→</button><button type="button" data-close aria-label="Close media viewer">Close ×</button></div><div class="lightbox-content"></div><div class="lightbox-caption"></div>';
document.body.append(dialog);
const viewer=dialog.querySelector('.lightbox-content');let photos=[],photoIndex=0;
function showPhoto(index){photoIndex=(index+photos.length)%photos.length;const image=new Image();image.src=photos[photoIndex].href;image.alt=photos[photoIndex].closest('.grid-item')?.querySelector('img')?.alt||'Summit gallery photograph';viewer.replaceChildren(image);dialog.querySelector('.lightbox-caption').textContent=`${photoIndex+1} / ${photos.length}`;}
dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
let viewerOpener;
const openViewer=opener=>{viewerOpener=opener;document.body.classList.add('summit-menu-open');dialog.showModal();};
dialog.addEventListener('close',()=>{viewer.replaceChildren();document.body.classList.remove('summit-menu-open');viewerOpener?.focus({preventScroll:true});});
dialog.querySelector('[data-prev]').addEventListener('click',()=>showPhoto(photoIndex-1));
dialog.querySelector('[data-next]').addEventListener('click',()=>showPhoto(photoIndex+1));
dialog.addEventListener('keydown',event=>{if(!photos.length)return;if(event.key==='ArrowLeft')showPhoto(photoIndex-1);if(event.key==='ArrowRight')showPhoto(photoIndex+1);});
document.querySelectorAll('.jkit-gallery').forEach(gallery=>{
  const grid=gallery.querySelector('.gallery-items'); if(!grid)return; grid.classList.add('summit-gallery');
  const items=[...grid.children];
  const layout=()=>{
    const columns=innerWidth<=767?2:innerWidth<=1024?3:4;
    const width=grid.clientWidth/columns;const heights=Array(columns).fill(0);
    items.forEach(item=>{const column=heights.indexOf(Math.min(...heights));item.style.width=`${width}px`;item.style.transform=`translate(${column*width}px,${heights[column]}px)`;heights[column]+=item.getBoundingClientRect().height;});
    grid.style.height=`${Math.max(...heights)}px`;
  };
  grid.querySelectorAll('img').forEach(image=>{image.addEventListener('load',layout);image.addEventListener('error',layout);});
  new ResizeObserver(layout).observe(grid);layout();
  const links=[...grid.querySelectorAll('.gallery-link')];
  links.forEach((link,index)=>link.addEventListener('click',event=>{event.preventDefault();photos=links;dialog.querySelectorAll('[data-prev],[data-next]').forEach(button=>button.hidden=false);showPhoto(index);openViewer(link);}));
});
document.querySelectorAll('.jkit-video-popup-btn').forEach(link=>link.addEventListener('click',event=>{
  const url=new URL(link.href);const id=url.searchParams.get('v')||url.pathname.split('/').filter(Boolean).at(-1);
  if(!/^[\w-]{11}$/.test(id||'')) return;
  event.preventDefault();photos=[];dialog.querySelectorAll('[data-prev],[data-next]').forEach(button=>button.hidden=true);
  const frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;frame.title='Summit video';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;viewer.replaceChildren(frame);dialog.querySelector('.lightbox-caption').textContent='';openViewer(link);
}));

// Both forms use the same checked server configuration. No browser-side secrets.
const forms=[...document.querySelectorAll('[data-contact],[data-newsletter]')];
let config;
const widgetIds=new WeakMap();
try{const response=await fetch('/api/config/',{cache:'no-store'});if(response.ok)config=await response.json();}catch{}
if(config?.turnstileSiteKey){
  window.summitCaptchaReady=()=>forms.forEach(form=>{
    const slot=form.querySelector('.captcha-slot');if(!slot)return;let currentSize;
    const render=()=>{const size=slot.clientWidth<300?'compact':'normal';if(currentSize===size)return;const previous=widgetIds.get(form);if(previous!==undefined)window.turnstile.remove(previous);currentSize=size;widgetIds.set(form,window.turnstile.render(slot,{sitekey:config.turnstileSiteKey,action:form.hasAttribute('data-contact')?'contact':'newsletter',theme:'light',size}));};
    render();new ResizeObserver(render).observe(slot);
  });
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=summitCaptchaReady&render=explicit';script.async=true;document.head.append(script);
}
forms.forEach(form=>{
  let submissionId=crypto.randomUUID();let busy=false;
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const button=form.querySelector('button[type=submit]');const status=form.querySelector('.form-status');
    const body=Object.fromEntries(new FormData(form));body.interests=new FormData(form).getAll('interests');body.submissionId=submissionId;
    if(config?.turnstileSiteKey&&!body['cf-turnstile-response']){status.dataset.state='error';status.textContent='Please wait for the spam check to finish, then send your message.';return;}
    busy=true;button.disabled=true;status.dataset.state='';status.textContent='Sending your message…';
    try{
      const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(55000)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to send. Please try again.');
      status.dataset.state='success';status.textContent=result.message;form.reset();submissionId=crypto.randomUUID();
    }catch(error){const message=error.name==='TimeoutError'?'The connection timed out. Please retry; your saved message will not be sent twice.':error.name==='TypeError'?'Could not connect. Check your connection and try again.':error.message;status.dataset.state='error';status.textContent=message+(message.includes('summitskibike@gmail.com')?'':' You can also email summitskibike@gmail.com.');}
    finally{busy=false;button.disabled=false;const widgetId=widgetIds.get(form);if(window.turnstile&&widgetId!==undefined)window.turnstile.reset(widgetId);}
  });
});
