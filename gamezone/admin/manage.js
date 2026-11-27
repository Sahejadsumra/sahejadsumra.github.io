let managementTab='games';

async function writeLibrary(change){
 const response=await managementFetch('/api/prices',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...change,version:settings.version})});
 const result=await response.json();
 if(response.status===403){settings.admin=false;admin();throw Error('Unlock the panel again.')}
 if(response.status===409){await loadSettings();admin();$('#manageStatus').textContent='Another edit was saved. Review the latest library and retry.';throw Error(result.error)}
 if(!response.ok)throw Error(result.error||'Save failed. Try again.');
 applyState(result);library();
}
function addManagement(){
 view.insertAdjacentHTML('beforeend','<div class="managerNav"><div class="manageTabs"></div><button id="lock">Lock panel</button></div><p id="manageStatus" role="status"></p><section id="manager"></section>');
 for(const [id,label] of [['games','Games'],['bookings','Bookings'],['accounting','Accounting'],['categories','Categories'],['devices','Devices & Rates'],['passes','Passes'],['offers','Offers'],['social','Social media']]){
  const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(managementTab===id));b.onclick=()=>{managementTab=id;admin()};$('.manageTabs').append(b);
 }
 if(['devices','passes','offers','social'].includes(managementTab))manageLounge(managementTab);
 if(managementTab==='accounting'){
  const root=$('#manager');
  root.innerHTML='<h2>Accounting access</h2><form class="manageForm"><label>New accounting password<input name="password" type="password" autocomplete="new-password" required maxlength="1024"></label><button class="primary">Save password</button></form><a class="back" href="/accounting/">Open accounting</a>';
  if(typeof pagesFetch==='function')root.querySelector('a').href='../accounting/';
  root.querySelector('form').onsubmit=async e=>{
   e.preventDefault();const field=e.target.elements.password;
   try{
    const res=await managementFetch('/api/accounts/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:field.value})});
    const data=await res.json();if(!res.ok)throw Error(data.error||'Could not save password.');
    field.value='';$('#manageStatus').textContent='Accounting password saved.';
   }catch(err){$('#manageStatus').textContent=err.message}
  };
 }
 if(managementTab==='bookings')renderBooking($('#manager'),true);
 if(managementTab==='games')manageGames();
 if(managementTab==='categories')manageCategories();
}
async function saveChange(button,action,success){
 button.disabled=true;
 try{await writeLibrary(action);admin();$('#manageStatus').textContent=success}
 catch(err){if(button.isConnected)$('#manageStatus').textContent=err.message}
 finally{button.disabled=false}
}
function manageCategories(){
 const root=$('#manager');
 root.innerHTML='<h2>Categories</h2><div id="categoryRows"></div><form id="newCategory" class="manageForm"><h3>Add category</h3><label>Category name<input name="category" maxlength="50" required></label><label class="check"><input type="checkbox" name="open"> Open for players now</label><button class="primary">Add category</button></form>';
 for(const c of categories()){
  const row=document.createElement('div');row.className='manageRow';
  const count=games.filter(g=>g.platform===c.name).length;
  row.innerHTML='<div><strong>'+esc(c.name)+'</strong><small>'+(c.open?'Open':'Locked')+' · '+count+' game'+(count===1?'':'s')+'</small></div><button class="toggle">'+(c.open?'Lock':'Unlock')+'</button><button class="remove">Remove</button>';
  row.querySelector('.toggle').onclick=e=>saveChange(e.target,{action:'toggleCategory',category:c.name},c.name+' updated.');
  row.querySelector('.remove').onclick=()=>{
   row.innerHTML='<span>Remove '+esc(c.name)+'? Its '+count+' game'+(count===1?' stays':'s stay')+' in the admin library for reassignment.</span><button class="confirmRemove">Remove category</button><button class="keep">Keep</button>';
   row.querySelector('.keep').onclick=manageCategories;
   row.querySelector('.confirmRemove').onclick=e=>saveChange(e.target,{action:'removeCategory',category:c.name},'Category removed.');
  };
  $('#categoryRows').append(row);
 }
 $('#newCategory').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;saveChange(f.querySelector('button'),{action:'addCategory',name:f.elements.category.value,open:f.elements.open.checked},'Category added.')};
}
function manageGames(){
 const root=$('#manager');root.innerHTML='<div class="manageHeading"><h2>Games</h2><button id="newGame" class="primary">Add game</button></div><div id="gameRows"></div>';
 $('#newGame').onclick=()=>gameEditor(null);
 for(const [index,g] of games.entries()){
  const row=document.createElement('div');row.className='manageRow';
  row.innerHTML='<img class="miniCover" src="'+esc(cover(g))+'" alt=""><div><strong>'+esc(g.name)+'</strong><small>'+esc(g.platform||'Unassigned')+' · '+esc(playerLabel(g))+(playable(g)?'':' · Hidden from players')+'</small></div><button>Edit game</button>';
  row.querySelector('button').onclick=()=>gameEditor(g);
  for(const step of [-1,1]){
   const button=document.createElement('button');
   button.textContent=step<0?'Move up':'Move down';
   button.setAttribute('aria-label',button.textContent+': '+g.name);
   button.disabled=index+step<0||index+step>=games.length;
   button.onclick=()=>saveChange(button,{action:'moveGame',slug:g.slug,step},'Library order saved.');
   row.append(button);
  }
  removeButton(row,'removeGame',g.slug,g.name);$('#gameRows').append(row);
 }
}
async function readImage(file){
 const bitmap=await createImageBitmap(file).catch(()=>{throw Error('Choose a supported image such as JPG, PNG or WebP.')});
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.85));
 if(!blob||blob.type!=='image/webp')throw Error('This browser cannot prepare that image. Try a current browser.');
 const response=await managementFetch('/api/admin/images',{method:'POST',headers:{'Content-Type':'image/webp'},body:blob});
 if(!response.ok)throw Error(response.status===403?'Unlock the admin panel again.':'Image upload failed. Try a smaller image.');
 return (await response.json()).path;
}
function gameEditor(g){
 const root=$('#manager');
 if(!categories().length){$('#manageStatus').textContent='Add a category before adding a game.';return}
 $('#manageStatus').textContent='';
 const seed=g||{name:'',genre:'',about:'',players:1,devices:[],video:'',platform:categories().find(c=>c.open)?.name??categories()[0].name,screens:[]};
 root.innerHTML='<form class="manageForm" id="editGame"><h2>'+(g?'Edit game':'Add game')+'</h2>'+
 '<label>Game title<input required name="name" maxlength="100"></label><div class="formPair"><label>Category<select name="category" required></select></label><label>Maximum local players per station<input required name="players" type="number" min="1" max="100000"></label></div><fieldset id="supportedDevices"><legend>Supported devices</legend></fieldset>'+
 '<label>Genre<input required name="genre" maxlength="60" placeholder="Racing, sports, puzzle…"></label><label>About the game<textarea required name="about" rows="4" maxlength="3000"></textarea></label>'+
 '<label>YouTube trailer link<input name="video" type="url" placeholder="https://www.youtube.com/watch?v=…"></label>'+
 '<label>Cover image<input name="cover" type="file" accept="image/*"></label><div id="coverPreview"></div>'+
 '<label>Add screenshots (up to 8)<input name="shots" type="file" accept="image/*" multiple></label><div id="screenList" class="screenList"></div>'+
 '<div class="editorActions"><button class="primary">Save game</button><button type="button" id="cancelEdit">Cancel</button></div><p role="status" id="editorStatus"></p></form>';
 const form=$('#editGame'),fields=form.elements;
 for(const key of ['name','genre','about','players'])fields[key].value=seed[key];
 for(const d of settings.devices){const label=document.createElement('label');label.className='check';label.innerHTML='<input name="devices" type="checkbox" value="'+esc(d.id)+'"> '+esc(d.name);label.firstChild.checked=seed.devices.includes(d.id);$('#supportedDevices').append(label)}
 for(const c of categories())fields.category.add(new Option(c.name+(c.open?'':' · Locked'),c.name));
 fields.category.value=seed.platform;fields.video.value=seed.video?'https://www.youtube.com/watch?v='+seed.video:'';
 const kept=seed.screens.slice();
 function thumbnails(){const list=$('#screenList');list.replaceChildren();kept.forEach((url,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML='<img src="'+esc(assetUrl(url))+'" alt=""><span>Remove image '+(i+1)+'</span>';b.onclick=()=>{kept.splice(i,1);thumbnails()};list.append(b)})}
 thumbnails();
 if(g)$('#coverPreview').innerHTML='<img class="miniCover" src="'+esc(cover(g))+'" alt="Current cover">';
 $('#cancelEdit').onclick=manageGames;
 form.onsubmit=async e=>{
  e.preventDefault();const save=form.querySelector('button.primary'),msg=$('#editorStatus');
  if(kept.length+fields.shots.files.length>8){msg.textContent='Choose up to eight screenshots in total.';return}
  save.disabled=true;msg.textContent='Saving game…';
  try{
   const screens=kept.slice();for(const file of fields.shots.files)screens.push(await readImage(file));
   const image=fields.cover.files[0]?await readImage(fields.cover.files[0]):(g?.image||screens[0]||'/prime-logo.jpg');
   await writeLibrary({action:'saveGame',slug:g?.slug,name:fields.name.value,category:fields.category.value,players:Number(fields.players.value),devices:[...form.querySelectorAll('input[name=devices]:checked')].map(el=>el.value),genre:fields.genre.value,about:fields.about.value,video:fields.video.value.trim(),image,screens});
   admin();$('#manageStatus').textContent='Game saved.';
  }catch(err){msg.textContent=err.message}finally{save.disabled=false}
 };
}

function managementFetch(path,options){return typeof pagesFetch==='function'?pagesFetch(path,options):fetch(path,options)}
function admin(){
 if(typeof pagesPanelAuth==='function'&&!settings?.admin){pagesPanelAuth();return}
 view.innerHTML='<a class="back" href="#library">Back to game library</a><h1>Manage library</h1>';
 if(!settings?.admin){
  if(!['localhost','127.0.0.1'].includes(location.hostname)&&!settings?.githubVerified){
   const link=document.createElement('a');link.className='primary button';link.href='/api/admin/github/start';link.textContent='Sign in with GitHub';view.append(link);return;
  }
  view.insertAdjacentHTML('beforeend','<form id="unlock"><label>Admin password<input name="password" type="password" autocomplete="current-password" required autofocus></label><button class="primary">Unlock admin</button><p class="feedback" role="status"></p></form>');
  $('#unlock').onsubmit=async event=>{
   event.preventDefault();
   const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
   try{
    const result=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:form.elements.password.value})});
    form.elements.password.value='';
    if(!result.ok){form.querySelector('.feedback').textContent=result.status===403?'Check the admin password.':'Password verification is unavailable. Try again shortly.';return}
    await loadSettings();admin();
   }catch{form.querySelector('.feedback').textContent='Could not unlock pricing. Try again.'}finally{button.disabled=false}
  };return;
 }
 addManagement();
 $('#lock').onclick=async()=>{if(typeof pagesLock==='function'){pagesLock();return}const r=await fetch('/api/admin/logout',{method:'POST'});if(r.ok){await loadSettings();admin()}};
}

function removeButton(row,action,id,name){
 const button=document.createElement('button');button.type='button';button.textContent='Remove';button.setAttribute('aria-label','Remove '+name);
 button.onclick=()=>{
  if(window.confirm('Remove '+name+' from the lounge website?'))saveChange(button,{action,id},name+' removed.');
 };row.append(button);
}
const sections={
 devices:{title:'Devices & Rates',item:'device',save:'saveDevice',remove:'removeDevice'},
 passes:{title:'Passes',item:'pass',save:'savePass',remove:'removePass'},
 offers:{title:'Offers',item:'offer',save:'saveOffer',remove:'removeOffer'},
 videos:{title:'YouTube videos',item:'YouTube video',save:'saveVideo',remove:'removeVideo'},
 social:{title:'Social links',item:'social link',save:'saveSocial',remove:'removeSocial'}
};
function manageLounge(key,root=$('#manager')){
 const config=sections[key],items=settings[key]||[];
 root.innerHTML='<div class="manageHeading"><h2>'+config.title+'</h2><button class="primary">Add '+config.item+'</button></div>';
 root.querySelector('button').onclick=()=>loungeEditor(key);
 items.forEach((item,index)=>{
  const row=document.createElement('div');row.className='manageRow';
  const info=key==='passes'?'₹'+item.price+' · '+item.hours+' hr · '+item.validDays+' days · '+item.station:key==='devices'?item.stations+' stations':key==='offers'?'₹'+item.price+' · '+item.days:item.url;
  row.innerHTML='<div><strong>'+esc(item.name)+'</strong><small>'+esc(info)+'</small></div><button>Edit</button>';
  if(key==='videos'){const preview=youtubeThumbnail(item.video);preview.className='miniCover';row.prepend(preview)}
  row.querySelector('button').onclick=()=>loungeEditor(key,item);
  if(key==='social')for(const step of [-1,1]){
   const b=document.createElement('button');b.textContent=step<0?'Move up':'Move down';b.disabled=index+step<0||index+step>=items.length;
   b.onclick=()=>saveChange(b,{action:'moveSocial',id:item.id,step},'Link order saved.');row.append(b);
  }
  removeButton(row,config.remove,item.id,item.name);root.append(row);
 });
 if(key==='social'){
  const videos=document.createElement('section');root.append(videos);manageLounge('videos',videos);
 }
}
function loungeEditor(key,item={}){
 const config=sections[key],root=$('#manager');
 const field=(label,name,type='text',attrs='required')=>'<label>'+label+'<input type="'+type+'" name="'+name+'" '+attrs+' value="'+esc(item[name])+'"></label>';
 let body=field(key==='social'?'Platform name':'Name','name');
 if(key==='videos'){
  body=field('YouTube video link','url','url','required placeholder="https://youtu.be/…"')+
   field('Video title (optional)','name','text','maxlength="100"');
 }else if(key==='devices'){
  body+=field('Number of stations','stations','number','required min="1" step="1"')+'<div class="formPair">';
  for(const [name,label] of [['weekdayHour','Weekday · 1 hour'],['weekdayHalf','Weekday · 30 minutes'],['weekendHour','Weekend · 1 hour'],['weekendHalf','Weekend · 30 minutes']])
   body+=field(label+' (₹)',name,'number',(name.startsWith('weekday')?'required ':'')+'min="1" step="1"');
  body+='</div><fieldset><legend>Games available on this device</legend>'+games.map(g=>'<label class="check"><input type="checkbox" name="gameSlug" value="'+esc(g.slug)+'" '+(g.devices.includes(item.id)?'checked':'')+'> '+esc(g.name)+'</label>').join('')+'</fieldset>';
 }else if(key==='passes'){
  body+=field('Price (₹)','price','number','required min="0" step="0.01"')+
   field('Included play hours','hours','number','required min="0.01" step="0.01"')+
   field('Validity in days','validDays','number','required min="1" max="100000" step="1"')+
   field('Station','station','text','required maxlength="100" list="passStations" placeholder="e.g. All PS5 stations"')+
   '<datalist id="passStations">'+settings.devices.map(d=>'<option value="'+esc(d.name)+'"></option>').join('')+'</datalist>';
 }else if(key==='social')body+=field('Profile URL','url','url','required placeholder="https://…"');
 else{
  body+=field('Price (₹)','price','number','required min="0" step="0.01"')+field('Included hours (optional)','hours','number','min="0" step="0.5"')+
  '<div class="formPair">'+field('Valid from','from','date','')+field('Valid until','until','date','')+'</div><label>Available on<select name="days">'+['Any day','Weekdays','Weekends'].map(d=>'<option '+(item.days===d?'selected':'')+'>'+d+'</option>').join('')+'</select></label>'+
  '<label>Restrictions or details<textarea name="terms" rows="3" maxlength="2000">'+esc(item.terms)+'</textarea></label><label>Offer image<input name="art" type="file" accept="image/*"></label>'+(item.image?'<img class="miniCover" src="'+esc(assetUrl(item.image))+'" alt="Current offer image">':'');
 }
 root.innerHTML='<form class="manageForm"><h2>'+(item.id?'Edit ':'Add ')+config.item+'</h2>'+body+'<div class="editorActions"><button class="primary">Save</button><button type="button">Cancel</button></div><p role="status"></p></form>';
 const form=root.querySelector('form');form.querySelector('[type=button]').onclick=()=>manageLounge(key==='videos'?'social':key);
 form.onsubmit=async e=>{
  e.preventDefault();const button=form.querySelector('.primary');button.disabled=true;
  const fields=new FormData(form),change={action:config.save,id:item.id,name:fields.get('name')};
  try{
   if(key==='devices'){
    for(const n of ['stations','weekdayHour','weekdayHalf','weekendHour','weekendHalf'])change[n]=fields.get(n)===''?null:Number(fields.get(n));
    change.gameSlugs=fields.getAll('gameSlug');
   }else if(key==='passes'){
    for(const name of ['price','hours','validDays'])change[name]=Number(fields.get(name));
    change.station=fields.get('station');
   }else if(key==='social'||key==='videos')change.url=fields.get('url');
   else{
    for(const n of ['from','until','days','terms'])change[n]=fields.get(n);
    change.price=Number(fields.get('price'));change.hours=Number(fields.get('hours'));
    const art=form.elements.art.files[0];change.image=art?await readImage(art):item.image||'';
   }
   await writeLibrary(change);admin();$('#manageStatus').textContent='Saved.';
  }catch(err){form.querySelector('[role=status]').textContent=err.message}finally{button.disabled=false}
 };
}
