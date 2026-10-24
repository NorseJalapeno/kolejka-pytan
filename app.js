const DEFAULT_PEOPLE = `Łukasz Krawczyk
Bartosz Majczyna
Kacper Pieńkowski
Ernest Łukaszek
Magdalena Ciąpała
Jakub Lepiarz
Hubert Koprowski
Mikołaj Zoń
Sami Bouzidi
Zofia Tofil
Hanna Solecka
Mikołaj Tyra
Gustaw Wielogórski
Krystyna Różycka
Alicja Adamów-Bielkowicz
Kacper Widz
Bartłomiej Kaczor
Wiktoria Kawa
Karol Wojda
Michał Ragus
Krzysztof Sawicki
Danuta Cupiał
Urszula Ulanowska
Michał Wasilewski
Jakub Kurek
Bartosz Gembalczyk
Wiktoria Borys
Sofiia Dzhelhen
Antoni Dzikliński
Amelia Duch
Kamil Konieczny`.split('\n');
const $ = id => document.getElementById(id);
const isViewer = new URLSearchParams(location.search).get('mode') === 'viewer';
const localKey = 'kolejka-pytan-v2';
const SPECIAL = {
  'break': {title:'Przerwa techniczna', icon:'🛠️', text:'Trwa krótka przerwa techniczna. Zaraz wracamy!'},
  'no-session': {title:'Nie trwa teraz posiedzenie parlamentu', icon:'😭', text:'Niestety, w tej chwili nie odbywa się posiedzenie parlamentu. Do zobaczenia na kolejnym! 😢'},
  'waiting': {title:'Oczekiwanie na kolejkę pytań', icon:'⏳', text:'Jeszcze chwila cierpliwości! Niedługo rozpoczynamy kolejkę pytań.'},
  'ad-vocem': {title:'AD VOCEM !!!', icon:'🔥', text:'GORĄCO NA SALI! 🔥🔥🔥'}
};
function modeOf(s){return s && s.specialMode && SPECIAL[s.specialMode] ? s.specialMode : null;}
function modeText(s,key){return s.modeTexts && typeof s.modeTexts[key]==='string' ? s.modeTexts[key] : SPECIAL[key].text;}

function initial() { return {people: DEFAULT_PEOPLE, index: 0}; }
function valid(data) {return data && Array.isArray(data.people) && data.people.every(p=>typeof p==='string') && Number.isInteger(data.index) && data.index>=0 && data.index<=data.people.length;}
let state;try{const saved=JSON.parse(localStorage.getItem(localKey));state=valid(saved)?saved:initial();}catch{state=initial();}
let configured=Boolean(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.databaseURL);
let online=false, user=null, dbFns=null, authFns=null, auth=null, queueRef=null, hasRemote=false;
let messageTimeout;
let editingMode = null;
function msg(text){$('message').textContent=text;clearTimeout(messageTimeout);messageTimeout=setTimeout(()=>$('message').textContent='',5000);}
function render(){
  const {people,index}=state;
  $('current').textContent=index < people.length?people[index]:'Wszyscy zadali pytania!';
  $('next').textContent=people[index+1]??'—';
  $('remaining').textContent=people.length-index;
  $('completed').textContent=index;
  const percent=people.length?Math.round(index/people.length*100):100;
  $('percent').textContent=percent+'%';$('progress-fill').style.width=percent+'%';$('progress').setAttribute('aria-valuenow',percent);
  $('progress-detail').textContent=`${index} z ${people.length} osób`;
  $('status').textContent=index<people.length?'W trakcie zadawania':'Kolejka zakończona';
  $('advance').disabled=isViewer || (configured && (!user || !hasRemote)) || index>=people.length;
  $('undo').disabled=isViewer || (configured && (!user || !hasRemote)) || index===0;
  $('load-file').disabled=configured && !user;
  $('reset').disabled=configured && (!user || !hasRemote);
  $('publish').classList.toggle('hidden',isViewer || !configured || !user || hasRemote);
  $('list-total').textContent=`${people.length} osób`;
  const list=$('list');list.replaceChildren();
  people.forEach((p,i)=>{const row=document.createElement('div');row.className='list-row'+(i===index?' current':'');
    const nr=document.createElement('span');nr.className='number';nr.textContent=String(i+1).padStart(2,'0');
    const name=document.createElement('span');name.className='person';name.textContent=p;
    const chip=document.createElement('span');chip.className='chip'+(i<index?' done':i===index?' current':'');chip.textContent=i<index?'Zadane':i===index?'W trakcie':'Oczekuje';
    row.append(nr,name,chip);list.append(row);
  });
  const active=modeOf(state), spec=active?SPECIAL[active]:null;
  document.body.classList.toggle('viewer-special',Boolean(isViewer&&active));
  $('special-view').classList.toggle('hidden',!isViewer||!active);
  $('special-banner').classList.toggle('hidden',!active||isViewer);
  $('active-mode-tag').textContent=spec?'● '+spec.title:'● Kolejka aktywna';
  document.querySelectorAll('.mode-choice[data-mode]').forEach(button=>{
    button.classList.toggle('active',button.dataset.mode===active);
    button.disabled= isViewer || (configured && (!user || !hasRemote));
    button.setAttribute('aria-pressed',String(button.dataset.mode===active));
  });
  $('restore-queue').disabled=isViewer || !active || (configured && (!user || !hasRemote));
  $('save-mode-text').disabled=isViewer || !active || (configured && (!user || !hasRemote));
  $('mode-editor').classList.toggle('hidden',!active);
  if(active){
    const shown=modeText(state,active);
    $('special-icon').textContent=spec.icon;
    $('special-title').textContent=spec.title;
    $('special-text').textContent=shown;
    $('special-view').dataset.mode=active;
    $('special-banner-icon').textContent=spec.icon;
    $('special-banner-title').textContent=spec.title;
    $('special-banner-text').textContent=shown;
    if(editingMode!==active){$('mode-text').value=shown;editingMode=active;}
    else if(document.activeElement!==$('mode-text') && $('mode-text').value!==shown){$('mode-text').value=shown;}
  }else{editingMode=null;}
  $('mode').textContent=online?(user?'● Online · prowadzący':'● Online · podgląd'):(configured?'● Łączenie...':'● Tryb lokalny');
}
function saveLocal(){try{localStorage.setItem(localKey,JSON.stringify(state));}catch{}}
async function mutate(transform){
  if(isViewer || (configured && (!user || !hasRemote))) return msg('Zaloguj się i opublikuj kolejkę przed sterowaniem.');
  if(online && dbFns && queueRef){
    try{const result=await dbFns.runTransaction(queueRef, data=>{
      const current=valid(data)?data:initial();return transform({...current,people:[...current.people]});
    },{applyLocally:false});if(!result.committed)msg('Nie udało się zmienić kolejki.');}
    catch(e){msg('Błąd synchronizacji: '+e.message);}
  }else{state=transform({...state,people:[...state.people]});saveLocal();render();}
}
document.querySelectorAll('.mode-choice[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.mode;
  mutate(s=>({...s,specialMode:key}));
}));
$('restore-queue').addEventListener('click',()=>mutate(s=>({...s,specialMode:null})));
$('save-mode-text').addEventListener('click',async()=>{
  const key=modeOf(state);if(!key)return;
  const text=$('mode-text').value.trim();
  if(!text)return msg('Komunikat nie może być pusty.');
  await mutate(s=>({...s,modeTexts:{...(s.modeTexts||{}),[key]:text}}));
  $('mode-message').textContent='✓ Komunikat zapisany';
  setTimeout(()=>$('mode-message').textContent='',3500);
});
$('advance').addEventListener('click',()=>mutate(s=>({...s,index:Math.min(s.index+1,s.people.length)})));
$('undo').addEventListener('click',()=>mutate(s=>({...s,index:Math.max(0,s.index-1)})));
$('reset').addEventListener('click',()=>{if(confirm('Przywrócić całą kolejkę do początku?'))mutate(s=>({...s,index:0}));});
$('publish').addEventListener('click',async()=>{
  if(!user || !queueRef || hasRemote)return;
  try{await dbFns.runTransaction(queueRef,previous=>previous===null?{people:[...state.people],index:state.index}:undefined,{applyLocally:false});msg('Opublikowano kolejkę lub kolejka już istnieje.');}
  catch(e){msg('Nie udało się opublikować: '+e.message);}
});
$('toggle-list').addEventListener('click',()=>{const show=$('list-panel').classList.toggle('hidden');$('toggle-list').textContent=show?'☰ Pokaż pełną listę':'☰ Ukryj pełną listę';});
$('viewer-switch').addEventListener('click',()=>{const url=new URL(location.href);if(isViewer)url.searchParams.delete('mode');else url.searchParams.set('mode','viewer');location.href=url.href;});
$('viewer-switch').textContent=isViewer?'← Panel prowadzącego':'Widok publiczny ↗';
if(isViewer){document.querySelectorAll('.host-only').forEach(el=>el.classList.add('hidden'));$('online').textContent='ℹ Stan połączenia';}
$('load-file').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const text=await file.text();const people=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(!people.length)return msg('Plik nie zawiera nazwisk.');
    if(!confirm(`Wczytać ${people.length} osób i zresetować aktualną kolejkę?`))return;
    await mutate(s=>({...s,people,index:0}));msg(`Wczytano ${people.length} osób.`);
  }catch(err){msg('Nie udało się wczytać pliku: '+err.message);}finally{e.target.value='';}
});
$('download').addEventListener('click',()=>{const blob=new Blob([state.people.join('\n')+'\n'],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='osoby.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
window.addEventListener('keydown',e=>{
  if(isViewer || (configured && !user) || !$('modal').classList.contains('hidden'))return;
  const t=e.target;if(t instanceof HTMLElement && (['INPUT','TEXTAREA','SELECT'].includes(t.tagName)||t.isContentEditable))return;
  if(e.key==='ArrowRight'||e.code==='Space'&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();$('advance').click();}
  else if(e.key==='ArrowLeft'||(e.key.toLowerCase()==='z'&&e.ctrlKey)){e.preventDefault();$('undo').click();}
});
window.addEventListener('storage',e=>{if(!configured && e.key===localKey){try{const incoming=JSON.parse(e.newValue);if(valid(incoming)){state=incoming;render();}}catch{}}});
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('kolejka-pytan'):null;
if(channel){channel.onmessage=e=>{if(!configured&&valid(e.data)){state=e.data;render();}};const original=saveLocal;saveLocal=()=>{original();channel.postMessage(state);};}
$('online').addEventListener('click',()=>{$('modal').classList.remove('hidden');$('auth-message').textContent=configured?'':'Firebase nie jest skonfigurowane. Instrukcja jest w README.md.';});
$('close-modal').addEventListener('click',()=>$('modal').classList.add('hidden'));
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.add('hidden');});
$('login').addEventListener('click',async()=>{
  if(!authFns)return $('auth-message').textContent='Najpierw skonfiguruj Firebase w firebase-config.js.';
  try{await authFns.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';$('auth-message').textContent='Zalogowano.';$('modal').classList.add('hidden');}
  catch(e){$('auth-message').textContent='Błąd logowania: '+e.code;}
});
$('logout').addEventListener('click',async()=>{if(authFns){await authFns.signOut(auth);$('auth-message').textContent='Wylogowano.';}});
render();
async function initFirebase(){
  if(!configured) return;
  try{
    const [{initializeApp},{getDatabase,ref,onValue,runTransaction},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut}]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);
    const app=initializeApp(window.FIREBASE_CONFIG);const database=getDatabase(app);auth=getAuth(app);dbFns={runTransaction};authFns={signInWithEmailAndPassword,signOut};
    const id=String(window.QUEUE_ID||'kolejka').replace(/[^a-zA-Z0-9_-]/g,'-');queueRef=ref(database,'queues/'+id);
    onAuthStateChanged(auth,u=>{user=u;render();});
    onValue(queueRef,snapshot=>{const incoming=snapshot.val();if(valid(incoming)){state=incoming;saveLocal();online=true;hasRemote=true;render();}else if(!incoming){online=true;hasRemote=false;render();msg('Brak opublikowanej kolejki. Prowadzący powinien kliknąć „Opublikuj kolejkę”.');}else{msg('Niepoprawne dane kolejki.');}},e=>{online=false;render();msg('Błąd bazy Firebase: '+e.code);});
  }catch(e){online=false;msg('Nie udało się połączyć z Firebase: '+e.message);$('mode').textContent='● Błąd połączenia';}
}

initFirebase();
