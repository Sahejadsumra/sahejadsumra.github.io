const $ = selector => document.querySelector(selector);
const view = $('#view');
let settings, platform = 'All';
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const categories=()=>settings?.categories??[{name:'Console',open:true},{name:'PC',open:false},{name:'VR',open:false}];
const playable=g=>g&&categories().some(c=>c.open&&c.name===g.platform);
const service=document.documentElement.dataset.service||'';
const assetUrl=path=>service+'/'+path.replace(/^\//,'');
const cover=g=>assetUrl(g.image);
function applyState(next){games.splice(0,games.length,...next.games);settings=next}
function library(){
 const filters=$('.filters'), cards=$('.cards');
 filters.replaceChildren();cards.replaceChildren();
 if(!categories().some(c=>c.open&&c.name===platform))platform='All';
 const available=categories().filter(c=>c.open);
 $('.hero-copy .kicker').textContent=available.length?available.map(c=>c.name).join(' / ')+' gaming lounge':'Gaming lounge';
 for(const {name,open} of [{name:'All',open:true},...categories()]){
  const button=document.createElement('button');button.textContent=open?name:name+' · Locked';button.disabled=!open;
  button.setAttribute('aria-pressed',String(name===platform));
  button.onclick=()=>{platform=name;library()};filters.append(button);
 }
 games.forEach((game,i)=>{
  if(!playable(game)||(platform!=='All' && platform!==game.platform))return;
  const link=document.createElement('a');link.className='card';link.href='#game/'+game.slug;
  link.innerHTML='<img src="'+esc(cover(game))+'" alt=""><div class="cardinfo"><span class="meta">'+esc(game.platform)+' / '+esc(game.genre)+'</span><strong>'+esc(game.name)+'</strong><span class="rate">'+esc(playerLabel(game))+'</span></div>';
  cards.append(link);
 });
 renderLounge();
 if(!cards.childElementCount)cards.textContent='No games available in this category yet.';
}
function details(i){
 const g=games[i];if(!playable(g)){view.innerHTML='<a class="back" href="#library">Back to game library</a><h1>Game unavailable</h1><p>This category is currently closed.</p>';return}document.title=g.name+' | Prime Game Zone';
 const preview=g.video&&g.video===g.gameplayPreview;
 const videoLabel=preview?'Gameplay preview':'Game trailer';
 view.innerHTML='<a class="back" href="#library">Back to game library</a><article class="detail"><img src="'+esc(g.screens[0]?assetUrl(g.screens[0]):cover(g))+'" alt="'+esc(g.name)+' gameplay"><div><span class="kicker">'+esc(g.platform||'Unassigned')+' / '+esc(g.genre)+'</span><h1>'+esc(g.name)+'</h1><h2>About the game</h2><p>'+esc(g.about)+'</p><p>'+esc([g.players===null?'':playerLabel(g),deviceNames(g)].filter(Boolean).join(' · '))+'</p><a class="button primary" href="#rates">View station rates</a></div></article><section class="media"><h2>'+videoLabel+'</h2><button class="poster"><img src="'+esc(assetUrl(g.screens[1]||g.screens[0]||g.image))+'" alt=""><span>▶ '+(preview?'Play preview':'Play trailer')+'</span></button><a class="back" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v='+g.video+'">Watch on YouTube</a></section><section class="gallery-section"><h2>Game screenshots</h2><div class="gallery"></div></section>';
 if(!g.screens.length)$('.gallery-section').hidden=true;
 if(!g.video)$('.media').hidden=true;
 $('.poster').onclick=()=>{const frame=document.createElement('iframe');frame.title=g.name+' · '+videoLabel;frame.src='https://www.youtube-nocookie.com/embed/'+g.video+'?autoplay=1';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;$('.poster').replaceWith(frame)};
 g.screens.forEach((src,n)=>{const link=document.createElement('a');link.href=assetUrl(src);link.target='_blank';link.rel='noopener';link.innerHTML='<img loading="lazy" src="'+esc(assetUrl(src))+'" alt="Open '+esc(g.name)+' screenshot '+(n+1)+'">';$('.gallery').append(link)});
}
function route(){
 if(document.documentElement.dataset.admin){$('#home').hidden=true;view.hidden=false;admin();return}
 const path=location.hash.slice(1), i=games.findIndex(g=>'game/'+g.slug===path);
 const social=path==='social-hub';
 const socialLink=$('nav a[href="#social-hub"]');
 if(social) socialLink.setAttribute('aria-current','page'); else socialLink.removeAttribute('aria-current');
 const home=path!=='booking'&&!social&&i<0&&(path!=='admin'||!!service);$('#home').hidden=!home;view.hidden=home;
 document.title='Prime Game Zone';if(path==='booking'){document.title='Booking | Prime Game Zone';renderBooking(view,false)}else if(social)renderSocialHub();else if(i>=0)details(i);else if(path==='admin'&&!service)admin();else{view.replaceChildren();library()}
 if(['library','rates','passes','offers','social'].includes(path))$('#'+path).scrollIntoView();else window.scrollTo(0,0);
}
async function loadSettings(){if(typeof pagesFetch==='function'){await pagesLoad();return}const res=await fetch(service?service+'/api/player-library':'/api/prices',{cache:'no-store',credentials:service?'omit':'same-origin'});if(!res.ok)throw Error();applyState(await res.json())}

window.addEventListener('hashchange',route);
loadSettings().then(route).catch(()=>{route();document.querySelector('footer').textContent='Live prices are unavailable. Please check rates at the lounge.'});
