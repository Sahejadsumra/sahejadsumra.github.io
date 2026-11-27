const $=selector=>document.querySelector(selector);
const offset=19800000,hourMs=3600000,dayMs=24*hourMs;
const localInput=ms=>new Date(ms+offset).toISOString().slice(0,16);
const rupees=p=>'₹'+(p/100).toLocaleString('en-IN',{maximumFractionDigits:2});
const playTime=ms=>{const m=Math.floor(ms/60000);return Math.floor(m/60)+'h '+m%60+'m'};
const localTime=ms=>new Date(ms).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
const entry=$('#entry'),fields=entry.elements;
const passEntry=$('#passEntry'),pass=passEntry.elements;
for(const [select,max] of [[fields.hour,12],[fields.minute,59],[pass.fromHour,12],[pass.fromMinute,59],[pass.untilHour,12],[pass.untilMinute,59]]){
 for(let n=0;n<=max;n++)select.add(new Option(String(n).padStart(2,'0'),String(n)));
}
for(const control of document.querySelectorAll('.flipTime'))control.onchange=event=>{
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  event.target.animate([{transform:'perspective(360px) rotateX(-40deg)'},{transform:'perspective(360px) rotateX(0deg)'}],{duration:200,easing:'ease-out'});
};
function resetStart(){
 const [date,time]=localInput(Date.now()).split('T');
 const [h,m]=time.split(':').map(Number);
 fields.sessionDate.value=date;fields.hour.value=String(h%12||12);
 fields.minute.value=String(m);fields.period.value=h<12?'AM':'PM';
}
function sessionStart(){
 const hour=Number(fields.hour.value)%12+(fields.period.value==='PM'?12:0);
 return Date.parse(fields.sessionDate.value+'T'+String(hour).padStart(2,'0')+':'+fields.minute.value.padStart(2,'0')+':00+05:30');
}
let records=[],stations=[],requestId=crypto.randomUUID(),generation=0;
function message(text){$('#notice').textContent=text}
const ledgerService=document.documentElement.dataset.service||'';
let ledgerToken='';
function locked(){
 ledgerToken='';
 generation++;records=[];$('#passList').replaceChildren();$('#sessions').replaceChildren();$('#report').replaceChildren();$('#workspace').hidden=true;$('#lock').hidden=true;$('#unlockAccount').hidden=false;
}
async function api(path,payload){
 const headers=payload?{'Content-Type':'application/json'}:{};
 if(ledgerService&&ledgerToken)headers.Authorization='Bearer '+ledgerToken;
 const endpoint=ledgerService?ledgerService+'/api/pages-accounting/':'/api/accounts/';
 const res=await fetch(endpoint+path,{method:payload?'POST':'GET',cache:'no-store',credentials:ledgerService?'omit':'same-origin',headers,body:payload?JSON.stringify(payload):undefined});
 const data=await res.json();
 if(!res.ok){if(res.status===401)locked();throw Error(data.error||'Could not complete the request.')}
 if(path==='login'&&ledgerService)ledgerToken=data.token;
 return data;
}
function logTable(){
 const host=$('#sessions');host.replaceChildren();
 if(!records.length){host.textContent='No paid sessions recorded yet.';return}
 const table=document.createElement('table'),header=table.createTHead().insertRow(),body=table.createTBody();
 for(const text of ['Station','Start (IST)','Play time','Game','Paid','Method','Timer','Action']){
  const th=document.createElement('th');th.textContent=text;header.append(th);
 }
 for(const r of records){
  const row=body.insertRow();
  for(const val of [r.label,localTime(r.start),playTime(r.minutes*60000),r.game||'—',rupees(r.paise),r.method])row.insertCell().textContent=val;
  const timer=row.insertCell(),action=row.insertCell();
  if(r.cancelledAt){timer.textContent='Cancelled';continue}
  const button=document.createElement('button');button.textContent='Cancel session';
  button.onclick=async()=>{
   if(!confirm('Cancel this session on '+r.label+' and move '+rupees(r.paise)+' to cancelled payments?'))return;
   button.disabled=true;
   try{await api('cancel',{id:r.id});await refresh();message('Session cancelled.')}catch(err){message(err.message);button.disabled=false}
  };
  action.append(button);timer.dataset.start=r.start;timer.dataset.end=r.start+r.minutes*60000;
 }
 host.append(table);tick();
}
function tick(){
 const now=Date.now();
 for(const cell of document.querySelectorAll('[data-end]')){
  const seconds=Math.ceil((Number(cell.dataset.end)-now)/1000);
  cell.textContent=now<Number(cell.dataset.start)?'Scheduled':seconds<=0?'Finished':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' remaining';
 }
}
function report(){
 const host=$('#report');host.replaceChildren();const date=$('#reportDate').value;
 if(!date)return;
 const d=new Date(date+'T00:00:00Z');let from,to;
 if($('#period').value==='week'){
  from=+d-((d.getUTCDay()+6)%7)*dayMs-offset;to=from+7*dayMs;
 }else{
  from=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)-offset;to=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)-offset;
 }
 const totals={Cash:0,Online:0},games=new Map(),hours=Array(24).fill(0);
 let played=0,cancelledMoney=0;const cancelled=[];
 for(const r of records){
  if(r.start>=from&&r.start<to){
   if(r.cancelledAt){cancelledMoney+=r.paise;cancelled.push(r)}else totals[r.method]+=r.paise;
  }
  let t=Math.max(from,r.start);
  const end=Math.min(to,r.cancelledAt??Date.now(),Date.now(),r.start+r.minutes*60000);
  if(end<=t)continue;
  played+=end-t;
  if(r.gameId){const g=games.get(r.gameId)||{name:r.game,time:0};g.time+=end-t;games.set(r.gameId,g)}
  while(t<end){
   const bucket=Math.floor((t+offset)/hourMs),next=Math.min(end,(bucket+1)*hourMs-offset);
   hours[bucket%24]+=next-t;t=next;
  }
 }
 const caption=document.createElement('p');caption.textContent=localInput(from).slice(0,10)+' – '+localInput(to-1).slice(0,10)+' · Earnings by session start date. Play time counts elapsed station time.';host.append(caption);
 const grid=document.createElement('div');grid.className='moneyGrid';
 for(const [label,value] of [['Earned',rupees(totals.Cash+totals.Online)],['Cash',rupees(totals.Cash)],['Online',rupees(totals.Online)],['Hours played',playTime(played)],['Cancelled payments',rupees(cancelledMoney)]]){
  const card=document.createElement('article'),strong=document.createElement('strong');card.textContent=label;strong.textContent=value;card.append(strong);grid.append(card);
 }
 host.append(grid);
 const heading=document.createElement('h3');heading.textContent='Cancelled sessions ('+cancelled.length+')';host.append(heading);
 if(cancelled.length){
  const list=document.createElement('ul');
  for(const r of cancelled){const li=document.createElement('li');li.textContent=r.label+' · '+localTime(r.start)+' · '+rupees(r.paise)+' · '+r.method+' · Cancelled';list.append(li)}
  host.append(list);
 }
 function leaders(title,items,empty){
  const h=document.createElement('h3');h.textContent=title;host.append(h);
  if(!items.length){host.append(empty);return}
  const list=document.createElement('ol');
  for(const item of items.sort((a,b)=>b.time-a.time).slice(0,5)){const li=document.createElement('li');li.textContent=item.name+' · '+playTime(item.time);list.append(li)}
  host.append(list);
 }
 leaders('Most played games',[...games.values()],'No game-specific play recorded for this period.');
 const hh=h=>String(h%24).padStart(2,'0')+':00';
 leaders('Busiest hours (IST)',hours.map((time,h)=>({name:hh(h)+'–'+hh(h+1),time})).filter(h=>h.time),'No play recorded for this period.');
}
function tab(name){
 for(const id of ['log','passes','analysis']){
  $('#'+id).hidden=id!==name;$('#'+id+'Tab').setAttribute('aria-pressed',String(id===name));
 }
 if(name==='analysis')report();
}
function displayMinute(m){
 const h=Math.floor(m/60);return (h%12||12)+':'+String(m%60).padStart(2,'0')+(h<12?' AM':' PM');
}
function passMinutes(prefix){
 return (Number(pass[prefix+'Hour'].value)%12+(pass[prefix+'Period'].value==='PM'?12:0))*60+Number(pass[prefix+'Minute'].value);
}
pass.firstDay.onchange=()=>{pass.lastDay.min=pass.firstDay.value;if(pass.lastDay.value<pass.firstDay.value)pass.lastDay.value=pass.firstDay.value};
passEntry.onsubmit=async event=>{
 event.preventDefault();
 const station=stations[Number(pass.station.value)],button=passEntry.querySelector('button');
 button.disabled=true;
 try{
  await api('passes',{device:station.device,station:station.station,firstDay:pass.firstDay.value,lastDay:pass.lastDay.value,startMinute:passMinutes('from'),endMinute:passMinutes('until')});
  await refresh();message('Pass booked. The daily time is marked orange on the booking clock.');
 }catch(err){message(err.message)}finally{button.disabled=false}
};
async function refresh(){
 const version=generation,data=await api('sessions');
 if(generation!==version)return;
 const list=$('#passList');list.replaceChildren();
 for(const p of data.passes){const li=document.createElement('li');li.textContent=p.label+' · '+p.firstDay+' – '+p.lastDay+' · '+displayMinute(p.startMinute)+' – '+displayMinute(p.endMinute)+' IST';list.append(li)}
 if(!data.passes.length)list.textContent='No station passes booked.';
 records=data.sessions;logTable();if(!$('#analysis').hidden)report();
}
async function openLedger(){
 await refresh();
 const catalog=ledgerService?await api('catalog'):await fetch('/api/prices',{cache:'no-store'}).then(res=>{if(!res.ok)throw Error('Could not load the station list.');return res.json()});
 stations=catalog.devices.flatMap(d=>Array.from({length:d.stations},(_,i)=>({device:d.id,station:i+1,label:d.name+' · Station '+(i+1)})));
 fields.station.replaceChildren(new Option('Choose station',''));stations.forEach((s,i)=>fields.station.add(new Option(s.label,String(i))));
 pass.station.replaceChildren(...Array.from(fields.station.options,o=>o.cloneNode(true)));
 pass.firstDay.value=pass.lastDay.value=pass.lastDay.min=localInput(Date.now()).slice(0,10);
 pass.fromHour.value='10';pass.untilHour.value='11';
 fields.game.replaceChildren(new Option('No game selected',''));for(const g of catalog.games)fields.game.add(new Option(g.name,g.slug));
 resetStart();$('#reportDate').value=localInput(Date.now()).slice(0,10);
 $('#workspace').hidden=false;$('#unlockAccount').hidden=true;$('#lock').hidden=false;tab('log');
}
$('#unlockAccount').onsubmit=async e=>{
 e.preventDefault();const pw=e.target.elements.password;
 try{await api('login',{password:pw.value});pw.value='';message('');await openLedger()}catch(err){message(err.message)}
};
$('#lock').onclick=async()=>{try{await api('logout',{});locked();message('Accounting locked.')}catch(err){message(err.message)}};
entry.oninput=()=>{requestId=crypto.randomUUID()};
entry.onsubmit=async e=>{
 e.preventDefault();const button=entry.querySelector('button');button.disabled=true;
 try{
  const s=stations[Number(fields.station.value)];
  await api('sessions',{id:requestId,device:s.device,station:s.station,start:sessionStart(),minutes:Number(fields.duration.value),gameId:fields.game.value,amount:fields.amount.value,method:fields.payment.value});
  await refresh();entry.reset();requestId=crypto.randomUUID();resetStart();message('Session saved.');
 }catch(err){message(err.message)}finally{button.disabled=false}
};
$('#passesTab').onclick=()=>tab('passes');$('#analysisTab').onclick=()=>tab('analysis');$('#logTab').onclick=()=>tab('log');
$('#period').onchange=$('#reportDate').onchange=report;
setInterval(tick,1000);
setInterval(()=>{if(!$('#workspace').hidden)refresh().catch(err=>message(err.message))},30000);
openLedger().catch(err=>{locked();if(err.message!=='Enter the accounting password.')message(err.message)});
