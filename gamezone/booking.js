let clockSerial=0;
function stationClock(label,rows,date){
 const uid='bookingDial'+(++clockSerial);
 const frame=document.createElement('div');
 frame.className='stationClock';
 frame.innerHTML=`<svg class="stationFace" viewBox="0 0 300 300" role="img">
<defs><clipPath id="${uid}-dialClip"><circle cx="150" cy="150" r="150"/></clipPath><radialGradient id="${uid}-shade"><stop offset="86%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".13"/></radialGradient><filter id="${uid}-handShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity=".25"/></filter></defs>
<g clip-path="url(#${uid}-dialClip)"><circle cx="150" cy="150" r="150" fill="#fff"/><g id="${uid}-booked"></g><g id="${uid}-past"></g><circle cx="150" cy="150" r="150" fill="url(#${uid}-shade)" pointer-events="none"/></g>
<g id="${uid}-ticks"></g><g id="${uid}-numbers"></g><g id="${uid}-boundary"></g>
<g id="${uid}-hands" class="hands" filter="url(#${uid}-handShadow)"><g id="${uid}-hour"><path d="M146 161 L145 93 L150 85 L155 93 L154 161 Z" fill="#111"/><path d="M150 96 L150 139" stroke="white" stroke-width="2.2" stroke-linecap="round"/></g><g id="${uid}-minute"><path d="M147 164 L146 37 L150 28 L154 37 L153 164 Z" fill="#111"/><path d="M150 42 L150 138" stroke="white" stroke-width="1.8" stroke-linecap="round"/></g><g id="${uid}-second"><path d="M150 168 L150 39" stroke="#292929" stroke-width="1.4" stroke-linecap="round"/><circle cx="150" cy="169" r="2.5" fill="#292929"/></g><circle cx="150" cy="150" r="5" fill="#171717"/><circle cx="150" cy="150" r="2.7" fill="#bfc3c5"/></g>
</svg>`;
 const face=frame.querySelector('svg');
 face.setAttribute('aria-label',label+' availability clock, 10 AM to 10 PM IST');
 const part=id=>frame.querySelector('#'+uid+'-'+id);
function el(tag,attrs){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));return node;}
function point(min,r=150){const a=min/720*2*Math.PI;return [150+r*Math.sin(a),150-r*Math.cos(a)];}
function wedge(start,end,cls){const len=end-start;if(len>=720)return el('circle',{cx:150,cy:150,r:150,class:cls});const a=point(start),b=point(end);return el('path',{d:`M150 150 L${a.join(' ')} A150 150 0 ${len>360?1:0} 1 ${b.join(' ')} Z`,class:cls});}
function clipRange(start,end,cls,group){const s=Math.max(start,600),e=Math.min(end,1320);if(e>s)group.appendChild(wedge(s,e,cls));}
for(let i=0;i<60;i++){const a=point(i*12,i%5===0?140:144),b=point(i*12,147);part('ticks').appendChild(el('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'tick','stroke-width':i%5===0?1.4:.6}));}
for(let n=1;n<=12;n++){const p=point(n*60,114),t=el('text',{x:p[0],y:p[1],class:'number','text-anchor':'middle','dominant-baseline':'central'});t.textContent=n;part('numbers').appendChild(t);}
const edge=point(600,150);part('boundary').appendChild(el('line',{x1:150,y1:150,x2:edge[0],y2:edge[1],class:'boundary'}));

 function tick(){
  const now=new Date(Date.now()+19800000),today=now.toISOString().slice(0,10);
  const h=now.getUTCHours(),m=now.getUTCMinutes(),s=now.getUTCSeconds();
  const minute=h*60+m;
  const cutoff=date<today?1320:date>today?600:Math.min(1320,Math.max(600,minute));
  part('hands').style.display=date===today&&minute>=600&&minute<1320?'':'none';
  part('hour').setAttribute('transform',`rotate(${h%12*30+m/2+s/120} 150 150)`);
  part('minute').setAttribute('transform',`rotate(${m*6+s/10} 150 150)`);
  part('second').setAttribute('transform',`rotate(${s*6} 150 150)`);
  if(frame.dataset.cutoff===String(cutoff))return;
  frame.dataset.cutoff=cutoff;
  for(const key of ['booked','past'])part(key).replaceChildren();
  for(const b of rows)clipRange(Math.max(cutoff,b.start),b.start+b.minutes,b.status==='maybe'?'maybe':'booked',part('booked'));
  clipRange(600,cutoff,'past',part('past'));
 }
 tick();frame.updateHands=tick;
 return frame;
}
function bookingTime(minutes){
 if(minutes===1440)return 'Midnight';
 const hour=Math.floor(minutes/60);
 return (hour%12||12)+':'+String(minutes%60).padStart(2,'0')+(hour<12?' AM':' PM');
}
function renderBooking(root,staff){
 const stations=(settings?.devices||[]).flatMap(device=>Array.from({length:device.stations},(_,n)=>({device,station:n+1,label:device.name+' · Station '+(n+1)})));
 root.innerHTML=`<section class="bookingPage">
 <div class="bookingIntro"><h1>${staff?'Station bookings':'Book a station'}</h1><p>${staff?'Manage confirmed sessions and uncertain times.':'Check a session and request confirmation from the lounge on WhatsApp.'}</p></div>
 <div class="bookingLayout"><section class="bookingForm"><h2>Session details</h2>
 <div class="bookingFields"><label>Station<select class="stationChoice"><option value="">Choose a station</option></select></label>
 <label class="bookingDate" hidden>Date<input type="date" required></label><fieldset class="flipTime" hidden><legend>Start time (IST)</legend><div class="flipRow"><label>Hour<select class="flipHour"></select></label><label>Minute<select class="flipMinute"></select></label><label>AM / PM<select class="flipPeriod"><option>AM</option><option>PM</option></select></label></div><button type="button" class="useTime">Use this start time</button></fieldset></div>
 <p class="availabilityMsg" role="status"></p>
 <div class="sessionChoice" hidden><label class="partyField">Players<input type="number" min="1" step="1" placeholder="Number of players" required></label><fieldset class="playTimes" hidden><legend>Play time</legend><div class="bookingLength"></div></fieldset><p class="quote"></p><div class="bookingActions"></div></div></section>
 <section class="clockBoard"><div class="boardHeading"><h2>Station availability</h2><p class="boardDate"></p></div>
 <div class="bookingResults"></div><div class="clockKey"><span>Available</span><span>Booked</span><span>Maybe available · ask at lounge</span><span>Time passed</span></div></section></div>
 <div class="daySchedule"></div></section>`;
 const el=s=>root.querySelector(s);
 const station=el('.stationChoice'),date=el('[type=date]'),start=el('.flipTime'),length=el('.bookingLength'),message=el('.availabilityMsg'),session=el('.sessionChoice'),actions=el('.bookingActions'),results=el('.bookingResults');
 stations.forEach((item,i)=>station.add(new Option(item.label,i)));
 let chosenMinutes=0;
 const players=el('.partyField input');
 const nowIST=()=>new Date(Date.now()+19800000);
 const initial=nowIST(),minute=initial.getUTCHours()*60+initial.getUTCMinutes();
 const hour=el('.flipHour'),mins=el('.flipMinute'),period=el('.flipPeriod');
 for(const [select,max] of [[hour,12],[mins,59]]){
  for(let n=0;n<=max;n++)select.add(new Option(String(n).padStart(2,'0'),String(n)));
 }
 function flip(select){
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
   select.animate([{transform:'perspective(360px) rotateX(-40deg)'},{transform:'perspective(360px) rotateX(0deg)'}],{duration:200,easing:'ease-out'});
 }
 function showTime(m){
  const h=Math.floor(m/60);
  for(const [select,value] of [[hour,String(h%12||12)],[mins,String(m%60)],[period,h<12?'AM':'PM']]){
   if(select.value!==value){select.value=value;flip(select)}
  }
 }
 date.min=initial.toISOString().slice(0,10);
 let timeConfirmed=false,previousMinute=Math.floor(Date.now()/60000);
 function suggestTime(){
  const now=nowIST(),m=now.getUTCHours()*60+now.getUTCMinutes();
  showTime(date.value===now.toISOString().slice(0,10)?Math.max(600,Math.min(1290,m)):600);
 }
 suggestTime();
 const boardDay=()=>date.value||nowIST().toISOString().slice(0,10);
 const selected=()=>station.value===''?null:stations[Number(station.value)];
 const begin=()=>(Number(hour.value)%12+(period.value==='PM'?12:0))*60+Number(mins.value);
 const validStart=()=>begin()>=600&&begin()<=1290;
 let ledgerSlots=[],ledgerDate='';
 async function readClock(day){
  const res=await fetch((service||'')+'/api/accounts/availability?date='+encodeURIComponent(day),{cache:'no-store'});
  if(!res.ok)throw Error('Availability unavailable');
  return (await res.json()).slots;
 }
 const rows=item=>[...(settings?.bookings||[]),...(ledgerDate===boardDay()?ledgerSlots:[])].filter(b=>b.date===boardDay()&&b.deviceId===item.device.id&&b.station===item.station).sort((a,b)=>Number(a.status==='booked')-Number(b.status==='booked'));
 function availableDurations(item){
  const at=begin();
  if(!item||!date.validity.valid||!validStart()||!Number.isInteger(at)||Date.parse(date.value+'T00:00:00+05:30')+at*60000<Math.floor(Date.now()/60000)*60000)return [];
  const options=[],occupied=rows(item);
  for(let m=30;m<=120&&at+m<=1320;m+=30){
   if(occupied.some(b=>at<b.start+b.minutes&&b.start<at+m))break;
   options.push(m);
  }
  return options;
 }
 function reset(){session.hidden=true;actions.replaceChildren();message.textContent='';draw()}
 function draw(){
  const item=selected();el('.bookingDate').hidden=!item;start.hidden=!item||!date.value||!date.validity.valid;results.replaceChildren();
  el('.boardDate').textContent=(boardDay()?new Date(boardDay()+'T12:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})+' · ':'')+'10 AM – 10 PM IST';
  for(const s of stations){
   const card=document.createElement('article');card.className='bookingStation';
   const title=document.createElement('h3');title.textContent=s.label;
   card.append(stationClock(s.label,rows(s),boardDay()),title);results.append(card);
  }
  const schedule=el('.daySchedule');schedule.replaceChildren();
  if(staff){
   const bookings=(settings.bookings||[]).filter(b=>b.date===date.value).sort((a,b)=>a.start-b.start);
   const h=document.createElement('h2');h.textContent='Station schedule';schedule.append(h);
   if(!bookings.length)schedule.append('No sessions recorded for this date.');
   for(const b of bookings){
    const row=document.createElement('div');row.className='manageRow';
    const dev=settings.devices.find(d=>d.id===b.deviceId);
    row.append((dev?.name||'Removed device')+' · Station '+b.station+' · '+bookingTime(b.start)+' – '+bookingTime(b.start+b.minutes)+' · '+(b.status==='maybe'?'Maybe available':'Booked')+(b.players?' · '+b.players+' player'+(b.players===1?'':'s'):''));
    const cancel=document.createElement('button');cancel.textContent='Remove';cancel.onclick=async()=>{if(confirm('Remove this time from the schedule?'))await change({action:'cancelBooking',id:b.id},'Time removed.')};row.append(cancel);schedule.append(row);
   }
  }else schedule.hidden=true;
 }
 async function change(payload,notice){
  try{await writeLibrary(payload);await refreshOptions();message.textContent=notice}catch(err){await refreshOptions();message.textContent=err.message}
 }
 function action(label,fn){const button=document.createElement('button');button.className='primary';button.textContent=label;button.onclick=fn;actions.append(button)}
 function quote(){
  actions.replaceChildren();el('.quote').textContent='';
  const m=chosenMinutes,item=selected();
  const validPlayers=players.validity.valid&&Number.isSafeInteger(players.valueAsNumber);
  el('.playTimes').hidden=!validPlayers;
  if(!validPlayers||!m)return;
  const weekend=[0,6].includes(new Date(date.value+'T12:00:00Z').getUTCDay());
  const device=settings.devices.find(d=>d.id===item.device.id);
  const each=sessionCost(device,m,weekend);
  const total=sessionCost(device,m,weekend,players.valueAsNumber);
  const price=each==='Ask at the lounge'?each:each+' per player · '+total+' total';
  el('.quote').textContent=bookingTime(begin())+' – '+bookingTime(begin()+m)+' · '+price;
  if(staff){
   for(const [label,status] of [['Confirm booking','booked'],['Mark maybe available','maybe']])action(label,()=>change({action:'addBooking',date:date.value,start:begin(),minutes:m,deviceId:device.id,station:item.station,status,players:players.valueAsNumber},'Schedule updated.'));
  }else if(settings.bookingPhone){
   const link=document.createElement('a');link.className='primary button';link.textContent='Book now';
   const text=['Hi Prime Game Zone, I’d like to book:', 'Station: '+item.label,'Date: '+date.value,'Starting time: '+bookingTime(begin())+' IST','Play time: '+durationLabel(m),'Players: '+players.value,'Price: '+price,'Please confirm availability.'].join('\n');
   link.href='https://wa.me/'+settings.bookingPhone+'?text='+encodeURIComponent(text);
   link.target='_blank';link.rel='noopener noreferrer';actions.append(link);
  }else{
   const button=document.createElement('button');button.textContent='Book now';button.disabled=true;
   actions.append(button,'Please ask at the lounge. The WhatsApp booking number has not been set yet.');
  }
  draw();
 }
 let requestId=0;
 async function refreshOptions(poll=false){
  const request=++requestId,item=selected();
  const day=boardDay();
  if(!poll){reset();if(ledgerDate!==day)results.textContent='Loading station clocks…'}
  try{
   const [slots]=await Promise.all([readClock(day),timeConfirmed&&!poll?loadSettings():null]);
   if(request!==requestId||!results.isConnected||day!==boardDay())return;
   const next=slots.map(b=>({...b,date:day}));
   if(poll&&day===ledgerDate&&JSON.stringify(next)===JSON.stringify(ledgerSlots))return;
   ledgerDate=day;ledgerSlots=next;reset();
   if(!item||!timeConfirmed)return;
   if(request!==requestId||!root.isConnected)return;
   const device=settings.devices.find(d=>d.id===item.device.id);
   if(!device||device.stations<item.station){message.textContent='Station unavailable. Reopen the page to update the station list.';return}
   const options=availableDurations(item);
   if(!options.length){
    const at=begin(),conflict=rows(item).reverse().find(b=>b.start<at+30&&at<b.start+b.minutes);
    message.textContent=!validStart()||!date.validity.valid?'Choose a valid date and start between 10 AM and 9:30 PM.':Date.parse(date.value+'T00:00:00+05:30')+at*60000<Math.floor(Date.now()/60000)*60000?'This time has passed.':conflict?.status==='maybe'?'Maybe available — ask at the lounge.':'Booked. Choose another start time.';
    draw();return;
   }
   message.textContent='This start time is available.';
   if(!options.includes(chosenMinutes))chosenMinutes=0;
   length.replaceChildren();
   for(const minutes of [30,60,90,120]){
    const button=document.createElement('button');
    button.type='button';button.textContent=durationLabel(minutes);button.disabled=!options.includes(minutes);
    button.setAttribute('aria-pressed',String(minutes===chosenMinutes));
    if(button.disabled)button.title='This session would overlap a booking or finish after closing.';
    button.onclick=()=>{
     chosenMinutes=minutes;
     for(const choice of length.children)choice.setAttribute('aria-pressed',String(choice===button));
     quote();
    };
    length.append(button);
   }
   session.hidden=false;quote();
  }catch{
   if(request===requestId){ledgerDate='';session.hidden=true;actions.replaceChildren();results.textContent='Station clocks unavailable.';message.textContent='Could not load availability. Retrying shortly.'}
  }
 }
 function clearDetails(){
  timeConfirmed=false;players.value='';chosenMinutes=0;
  suggestTime();refreshOptions();
 }
 function confirmTime(){
  players.value='';chosenMinutes=0;timeConfirmed=true;refreshOptions();
 }
 players.oninput=()=>{
  chosenMinutes=0;
  for(const choice of length.children)choice.setAttribute('aria-pressed','false');
  quote();
 };
 station.onchange=()=>{date.value='';clearDetails()};
 date.onchange=clearDetails;
 start.onchange=event=>{flip(event.target);confirmTime()};
 el('.useTime').onclick=confirmTime;
 if(staff){
  const form=document.createElement('form');form.className='manageForm';
  form.innerHTML='<label>WhatsApp booking number (with country code)<input type="tel" autocomplete="off" placeholder="+91…"></label><button>Save number</button><p role="status"></p>';
  const phone=form.querySelector('input');phone.value=settings.bookingPhone||'';
  form.onsubmit=async e=>{e.preventDefault();try{await writeLibrary({action:'saveBookingPhone',phone:phone.value});phone.value=settings.bookingPhone||'';form.lastChild.textContent='Number saved.'}catch(err){form.lastChild.textContent=err.message}};
  root.append(form);
 }
 results.textContent='Loading station clocks…';
 refreshOptions();let lastPoll=Date.now();
 const timer=setInterval(()=>{
  if(!results.isConnected){clearInterval(timer);return}
  const now=nowIST(),clockMinute=Math.floor(Date.now()/60000);
  if(clockMinute!==previousMinute){
   previousMinute=clockMinute;date.min=now.toISOString().slice(0,10);
   if(!timeConfirmed)suggestTime();refreshOptions();lastPoll=Date.now()
  }
  if(Date.now()-lastPoll>=5000){lastPoll=Date.now();refreshOptions(true)}
  for(const dial of results.querySelectorAll('.stationClock'))dial.updateHands();
 },1000);
}
