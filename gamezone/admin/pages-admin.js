// This script is loaded only by the GitHub-hosted administration page.
const pagesService=document.documentElement.dataset.service;
const pendingKey='prime-admin-github-flow';
let authorization='',pendingCode='',pendingVerifier='';
const callbackArgs=new URLSearchParams(location.hash.slice(1));
if(callbackArgs.has('state')){
 history.replaceState(null,'',location.pathname);
 let pending;
 try{pending=JSON.parse(sessionStorage.getItem(pendingKey)||'null')}catch{}
 sessionStorage.removeItem(pendingKey);
 if(pending&&pending.state===callbackArgs.get('state')&&pending.until>Date.now()){
  pendingCode=callbackArgs.get('code')||'';pendingVerifier=pending.verifier;
 }
}
function pagesLock(){
 authorization='';pendingCode='';pendingVerifier='';settings=null;
 games.splice(0,games.length);admin();
}
async function pagesFetch(path,options={}){
 const endpoint=path==='/api/admin/images'?'images':'prices';
 const headers=new Headers(options.headers);
 headers.set('Authorization','Bearer '+authorization);
 const res=await fetch(pagesService+'/api/pages-admin/'+endpoint,{...options,headers,credentials:'omit',cache:'no-store'});
 if(res.status===403){authorization='';if(settings)settings.admin=false}
 return res;
}
async function pagesLoad(){
 if(!authorization){settings=null;return}
 const res=await pagesFetch('/api/prices');
 if(!res.ok)throw Error('Unable to load admin panel.');
 applyState(await res.json());
}
function pagesPanelAuth(){
 view.innerHTML='<h1>Manage library</h1>';
 if(!pendingCode){
  view.insertAdjacentHTML('beforeend','<p>Sign in with the Sahejadsumra GitHub account, then enter your admin password.</p><button class="primary" id="startGithub">Sign in with GitHub</button>');
  $('#startGithub').onclick=async()=>{
   const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
   const verifier=random(),state='pages-'+random();
   sessionStorage.setItem(pendingKey,JSON.stringify({verifier,state,until:Date.now()+600000}));
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
   const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
   const params=new URLSearchParams({client_id:'Ov23lirgQnls86JZDS9J',redirect_uri:pagesService+'/api/admin/github/callback',scope:'',state,code_challenge:challenge,code_challenge_method:'S256'});
   location.assign('https://github.com/login/oauth/authorize?'+params);
  };return;
 }
 view.insertAdjacentHTML('beforeend','<form id="unlock"><label>Admin password<input type="password" name="password" required autocomplete="current-password"></label><button class="primary">Unlock admin</button> <button type="button" id="restart">Restart sign-in</button><p role="status"></p></form>');
 $('#restart').onclick=pagesLock;
 $('#unlock').onsubmit=async event=>{
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),message=form.querySelector('[role=status]');button.disabled=true;
  try{
   const res=await fetch(pagesService+'/api/pages-admin/login',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:form.elements.password.value,code:pendingCode,verifier:pendingVerifier})});
   form.elements.password.value='';const result=await res.json();
   if(!res.ok){message.textContent=result.error||'Unable to unlock admin.';return}
   authorization=result.token;pendingCode='';pendingVerifier='';await pagesLoad();admin();
  }catch{message.textContent='Could not load the panel. Restart sign-in to retry.'}finally{button.disabled=false}
 };
}
