function playerLabel(game){
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
 const section=$('#offers');section.replaceChildren();section.hidden=!offers.length;
 if(offers.length)section.innerHTML='<div class="sectionhead"><h2>Offers &amp; passes</h2></div><div class="offerGrid"></div>';
 for(const o of offers){
  const card=document.createElement('article');card.className='rateCard';
  card.innerHTML=(o.image?'<img class="offerArt" src="'+esc(assetUrl(o.image))+'" alt="">':'')+'<h3>'+esc(o.name)+'</h3><strong>₹'+o.price+'</strong>'+(o.hours?' · '+o.hours+' hours':'')+'<p>'+esc([o.days,o.from?'From '+o.from:'',o.until?'Through '+o.until:''].filter(Boolean).join(' · '))+'</p>'+(o.terms?'<p>'+esc(o.terms)+'</p>':'')+'<b>Buy at the lounge</b>';
  section.querySelector('.offerGrid').append(card);
 }
 const follow=$('#social');follow.replaceChildren();follow.hidden=!social.length;
 if(social.length)follow.innerHTML='<div class="sectionhead"><h2>Follow Prime Game Zone</h2></div><div class="socialLinks"></div>';
 for(const s of social){const a=document.createElement('a');a.href=s.url;a.textContent=s.name;a.target='_blank';a.rel='noopener noreferrer';follow.lastChild.append(a)}
}
