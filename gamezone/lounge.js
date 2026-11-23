function playerLabel(game){
 if(game.players===null)return deviceNames(game);
 const count=game.players??1;
 return count===1?'1 local player':'1–'+count+' local players';
}
function deviceNames(game){
 const names=(settings?.devices||[]).filter(d=>game.devices?.includes(d.id)).map(d=>d.name);
 return names.join(', ')||'Ask at the lounge about devices';
}
function sessionCost(device,minutes,weekend){
 const prefix=weekend?'weekend':'weekday';
 const hours=Math.floor(minutes/60),half=minutes%60===30;
 const hourly=device[prefix+'Hour'],extra=device[prefix+'Half'];
 if((hours&&hourly==null)||(half&&extra==null))return 'Ask at the lounge';
 return '₹'+(hours*(hourly??0)+(half?extra:0)).toLocaleString('en-IN');
}
function durationLabel(minutes){
 const h=Math.floor(minutes/60);
 return [h?h+' hr':'',minutes%60?'30 min':''].filter(Boolean).join(' ');
}
const socialIcons=[
 {hosts:['instagram.com'],shape:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.6" r=".85" fill="currentColor"/>'},
 {hosts:['youtube.com','youtu.be'],shape:'<rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" stroke="none"/><path d="m10 9 5 3-5 3z" fill="var(--icon-cutout,white)" stroke="none"/>'},
 {hosts:['facebook.com','fb.me'],shape:'<path d="M14 22v-9h3l.6-4H14V7c0-1.2.5-2 2-2h2V2.3c-.8-.2-1.8-.3-3-.3-3.4 0-5 2-5 5v2H7v4h3v9z" fill="currentColor" stroke="none"/>'},
 {hosts:['x.com','twitter.com'],shape:'<path d="m3 3 14 18h4L7 3zM20 3l-7 8M4 21l7-8"/>'},
 {hosts:['whatsapp.com','wa.me'],shape:'<path d="m3 21 1.4-5A9 9 0 1 1 8 20z"/><path d="M8 7c-2 2 2 9 7 10l2-2-3-2-1 1c-2-1-3-2-3-3l1-1z" fill="currentColor" stroke="none"/>'},
 {hosts:['discord.com','discord.gg'],shape:'<path d="m7 5-3 1-2 11 4 2 2-2h8l2 2 4-2-2-11-3-1-1 2H8z"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>'},
 {hosts:['t.me','telegram.org'],shape:'<path d="m2 11 20-8-4 18-6-5-3 3v-5l9-8-11 7z" fill="currentColor" stroke="none"/>'},
 {hosts:['tiktok.com'],shape:'<path d="M14 3v12a4.5 4.5 0 1 1-5-4.5M14 3c.5 3 2.5 5 6 5" stroke-width="3.5"/>'},
 {hosts:['twitch.tv'],shape:'<path d="M3 3h18v12l-6 5h-4l-3 3v-3H4zM10 7v6m6-6v6"/>'}
];
function socialIcon(url){
 let host='';
 try{host=new URL(url).hostname}catch{}
 const brand=socialIcons.find(icon=>icon.hosts.some(domain=>host===domain||host.endsWith('.'+domain)));
 const shape=brand?.shape||'<path d="m10 14 4-4m-5 1-3 3a3.5 3.5 0 0 0 5 5l3-3m1-3 3-3a3.5 3.5 0 0 0-5-5l-3 3"/>';
 return '<svg class="socialIcon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+shape+'</svg>';
}
function renderLounge(){
 const devices=settings?.devices||[],offers=settings?.offers||[],social=settings?.social||[];
 const rates=$('#rates');
 rates.innerHTML='<div class="sectionhead"><h2>Station rates</h2></div><p>Prices are per station. Weekend rates apply all day Saturday and Sunday. Arrange your session at the lounge.</p>';
 for(const d of devices){
  const card=document.createElement('article');card.className='rateCard';
  card.innerHTML='<h3>'+esc(d.name)+' <small>'+d.stations+' station'+(d.stations===1?'':'s')+'</small></h3><label>Session length<select></select></label><div class="dayRates"><div>Monday–Friday<strong></strong></div><div>Saturday–Sunday<strong></strong></div></div>';
  const select=card.querySelector('select');
  for(let m=30;m<=720;m+=30)select.add(new Option(durationLabel(m),m));
  select.value='60';const draw=()=>card.querySelectorAll('strong').forEach((el,i)=>el.textContent=sessionCost(d,Number(select.value),i===1));
  select.onchange=draw;draw();rates.append(card);
 }
 if(!devices.length)rates.insertAdjacentHTML('beforeend','<p>Ask at the lounge for current device rates.</p>');
 const passes=settings?.passes||[];
 const passSection=$('#passes');
 passSection.innerHTML='<div class="sectionhead"><h2>Lounge passes</h2></div>';
 if(!passes.length){
  const message=document.createElement('p');
  message.textContent=settings?'No passes listed yet. Ask at the lounge for availability.':'Pass information is currently unavailable.';
  passSection.append(message);
 }else{
  const grid=document.createElement('div');grid.className='passGrid';
  for(const pass of passes){
   const card=document.createElement('article');card.className='passCard';
   card.innerHTML='<h3>'+esc(pass.name)+'</h3><strong class="passPrice">₹'+Number(pass.price).toLocaleString('en-IN')+'</strong><dl>'+
    '<div><dt>Play time</dt><dd>'+esc(pass.hours)+(pass.hours===1?' hour':' hours')+'</dd></div>'+
    '<div><dt>Validity</dt><dd>'+esc(pass.validDays)+(pass.validDays===1?' day':' days')+'</dd></div>'+
    '<div><dt>Station</dt><dd>'+esc(pass.station)+'</dd></div></dl>';
   grid.append(card);
  }
  passSection.insertAdjacentHTML('beforeend','<p>Buy your pass at the lounge.</p>');
  passSection.append(grid);
 }
 const section=$('#offers');section.replaceChildren();section.hidden=!offers.length;
 if(offers.length)section.innerHTML='<div class="sectionhead"><h2>Offers</h2></div><div class="offerGrid"></div>';
 for(const o of offers){
  const card=document.createElement('article');card.className='rateCard';
  card.innerHTML=(o.image?'<img class="offerArt" src="'+esc(assetUrl(o.image))+'" alt="">':'')+'<h3>'+esc(o.name)+'</h3><strong>₹'+o.price+'</strong>'+(o.hours?' · '+o.hours+' hours':'')+'<p>'+esc([o.days,o.from?'From '+o.from:'',o.until?'Through '+o.until:''].filter(Boolean).join(' · '))+'</p>'+(o.terms?'<p>'+esc(o.terms)+'</p>':'')+'<b>Buy at the lounge</b>';
  section.querySelector('.offerGrid').append(card);
 }
 const follow=$('#social');follow.replaceChildren();follow.hidden=!social.length;
 if(social.length)follow.innerHTML='<div class="sectionhead"><h2>Follow Prime Game Zone</h2></div><div class="socialLinks"></div>';
 for(const s of social){const a=document.createElement('a');a.href=s.url;a.innerHTML=socialIcon(s.url)+esc(s.name);a.target='_blank';a.rel='noopener noreferrer';follow.lastChild.append(a)}
}

function youtubeThumbnail(id){
 const img=document.createElement('img');
 img.alt='';img.referrerPolicy='no-referrer';
 const sources=[assetUrl('thumbnails/'+id+'.jpg'),'https://img.youtube.com/vi/'+id+'/hqdefault.jpg',assetUrl('prime-logo.jpg')];
 let next=1;
 img.onerror=()=>{if(next<sources.length)img.src=sources[next++]};
 img.src=sources[0];
 return img;
}

function renderSocialHub(){
 document.title='Social Media | Prime Game Zone';
 const channels=settings?.social||[];
 const youtube=channels.find(channel=>{
  try{return /(^|\.)(youtube\.com|youtu\.be)$/.test(new URL(channel.url).hostname)}catch{return false}
 });
 const trailer=games.find(game=>playable(game)&&game.video);
 const videos=settings?.videos||[];
 const watchUrl=youtube?.url||videos[0]?.url||(trailer?'https://www.youtube.com/watch?v='+encodeURIComponent(trailer.video):'https://www.youtube.com/');
 const action='<a class="button primary watchYoutube" target="_blank" rel="noopener noreferrer" href="'+esc(watchUrl)+'">'+socialIcon(watchUrl)+'Watch YouTube</a>';
 view.innerHTML='<section class="hubHero"><div><span class="kicker">Prime Game Zone</span><h1>Social <em>hub.</em></h1><p>Find the lounge on your favourite channels.</p>'+action+'</div><img alt="" src="'+esc(assetUrl('prime-logo.jpg'))+'"></section><section class="hubSection"><h2>Follow the lounge</h2><div class="hubChannels"></div></section>';
 const list=view.querySelector('.hubChannels');
 if(!channels.length)list.textContent=settings?'Social links are coming soon.':'Social links are temporarily unavailable.';
 for(const channel of channels){
  const link=document.createElement('a');
  link.href=channel.url;link.target='_blank';link.rel='noopener noreferrer';
  link.innerHTML=socialIcon(channel.url)+'<strong>'+esc(channel.name)+'</strong><span aria-hidden="true">↗</span>';
  list.append(link);
 }
 if(videos.length){
  const section=document.createElement('section');section.className='hubSection';
  section.innerHTML='<h2>YouTube videos</h2><div class="cards"></div>';
  for(const video of videos){
   const link=document.createElement('a');link.className='card';link.href=video.url;
   link.target='_blank';link.rel='noopener noreferrer';
   link.innerHTML='<div class="cardinfo"><span class="meta">YouTube ↗</span><strong>'+esc(video.name)+'</strong></div>';
   link.prepend(youtubeThumbnail(video.video));
   section.lastElementChild.append(link);
  }
  view.append(section);
 }
 const trailers=games.filter(game=>playable(game)&&game.video);
 if(trailers.length){
  const section=document.createElement('section');section.className='hubSection';
  section.innerHTML='<h2>Game trailers</h2><div class="cards"></div>';
  for(const game of trailers){
   const link=document.createElement('a');link.href='#game/'+game.slug;link.className='card';
   link.innerHTML='<img loading="lazy" src="'+esc(cover(game))+'" alt=""><div class="cardinfo"><span class="meta">'+esc(game.platform)+'</span><strong>'+esc(game.name)+'</strong><span>View game &amp; trailer →</span></div>';
   section.lastElementChild.append(link);
  }
  view.append(section);
 }
}
