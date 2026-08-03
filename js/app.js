/* नाम जप — application logic.
   Reads config.js. Never writes to it. */
'use strict';

const $ = id => document.getElementById(id);

/* ================= state ================= */
const KEY = 'nj.v1';
const DEF = {
  v:1, naam:'जय श्री राम', font:'Tiro Devanagari Hindi', size:0, theme:'dark', lang:'hi',
  wake:false, bell:true, haptic:true, move:true, ripple:true,
  music:'', vol:1, loop:false, speed:1000, auto:false,
  timer:'', total:0, target:0, log:{}, sec:{}
};
let S = Object.assign({}, DEF);

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw) S = Object.assign({}, DEF, JSON.parse(raw));
    else migrate();
  }catch(e){}
  if(!S.log || typeof S.log !== 'object') S.log = {};
  if(!S.sec || typeof S.sec !== 'object') S.sec = {};
  if(S.theme === 'light') S.theme = 'day';           // renamed in 5.1
  if(!['dark','day','night'].includes(S.theme)) S.theme = 'dark';
  S.speed = Math.min(CFG.AUTO.max, Math.max(CFG.AUTO.min, +S.speed || 1000));
  // Someone who has asked the OS for less motion should not be handed a
  // jumping, rippling screen on first run.
  if(!localStorage.getItem(KEY) && matchMedia('(prefers-reduced-motion: reduce)').matches){
    S.move = false; S.ripple = false;
  }
}
function migrate(){
  try{
    const g = k => localStorage.getItem(k);
    if(g('naamText'))    S.naam  = g('naamText');
    if(g('fontFamily'))  S.font  = g('fontFamily');
    if(g('fontSize'))    S.size  = +g('fontSize');
    if(g('theme'))       S.theme = g('theme') === 'light' ? 'day' : g('theme');
    if(g('lang'))        S.lang  = g('lang');
    if(g('wakeLock') === '1') S.wake = true;
  }catch(e){}
}
let saveT = null;
function flush(){ clearTimeout(saveT); try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function save(){ clearTimeout(saveT); saveT = setTimeout(flush, 250); }
addEventListener('pagehide', flush);
addEventListener('beforeunload', flush);

/* ================= jap day, counts, streak ================= */
function fmt(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function japDay(){
  const d = new Date();
  if(d.getHours() < CFG.DAY_START) d.setDate(d.getDate()-1);
  d.setHours(12,0,0,0);                       // noon-anchored, so DST cannot shift the key
  return d;
}
const dkey     = () => fmt(japDay());
const today    = () => S.log[dkey()] || 0;
const todaySec = () => S.sec[dkey()] || 0;

function setToday(n){
  n = Math.max(0, Math.round(n) || 0);
  const d = n - today();
  S.log[dkey()] = n;
  S.total = Math.max(0, S.total + d);
  prune(); save(); render();
}
function prune(){
  const a = Object.keys(S.log).sort();
  while(a.length > CFG.LOG_CAP) delete S.log[a.shift()];
  const b = Object.keys(S.sec).sort();
  while(b.length > CFG.LOG_CAP) delete S.sec[b.shift()];
}
function streak(){
  let s = 0, d = japDay();
  if(!(S.log[fmt(d)] > 0)) d.setDate(d.getDate()-1);
  while(S.log[fmt(d)] > 0){ s++; d.setDate(d.getDate()-1); }
  return s;
}
function hms(sec){
  const h = Math.floor(sec/3600), m = Math.round(sec%3600/60);
  return h ? h+'h '+m+'m' : m+'m';
}

/* ================= refs ================= */
const nt=$('naamText'), aud=$('aud'), mc=$('mc'), cw=$('cw'), mus=$('mus'), tabs=$('tabs'),
      ns=$('ns'), aub=$('aub'), ppb=$('ppb'), lpb=$('lpb'), thb=$('thb'), wlb=$('wlb'),
      blb=$('blb'), hpb=$('hpb'), spd=$('spd'), spv=$('spv'), td=$('td'), wli=$('wli'),
      hist=$('hist'), malaFill=$('malaFill'), readout=$('readout'), live=$('live'),
      toastEl=$('toast');

let autoInt=null, timerInt=null, timerEnd=0, menuOpen=false, panel='jap',
    wakeLock=null, lang='hi', trackIdx=-1, lastJapTs=0, lastTap=0, deferredPrompt=null;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const L = () => LABELS[lang];

/* ================= toast ================= */
let toastT=null;
function toast(msg){
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(()=>toastEl.classList.remove('show'), 3000);
}

/* ================= bell — synthesised, no file, no network ================= */
let actx = null;
function bell(kind){                                   // 'mala' | 'target' | 'open'
  if(!S.bell) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state === 'suspended') actx.resume();
    const t    = actx.currentTime;
    const base = kind==='target' ? 528 : kind==='open' ? 396 : 660;
    const len  = kind==='mala'   ? 2.4 : 3.4;
    const amp  = kind==='open'   ? 0.34 : 0.5;
    [[base,amp],[base*2.02,amp*0.55],[base*2.98,amp*0.28]].forEach(([f,g])=>{
      const o = actx.createOscillator(), a = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(g*0.5, t+0.008);
      a.gain.exponentialRampToValueAtTime(0.0001, t+len);
      o.connect(a); a.connect(actx.destination);
      o.start(t); o.stop(t+len+0.2);
    });
  }catch(e){}
}
function buzz(p){ if(S.haptic && navigator.vibrate) try{ navigator.vibrate(p); }catch(e){} }
function toggleBell(){   S.bell   = !S.bell;   blb.classList.toggle('on', S.bell);   save(); if(S.bell) bell('mala'); }
function toggleHaptic(){ S.haptic = !S.haptic; hpb.classList.toggle('on', S.haptic); save(); if(S.haptic) buzz(25); }

/* ================= tap ripple ================= */
const ripples = [];
const rlayer = document.createElement('div');
rlayer.id = 'rlayer'; rlayer.setAttribute('aria-hidden','true');
document.body.appendChild(rlayer);

function ripple(x, y){
  if(!S.ripple || reduceMotion) return;
  const el = document.createElement('div');
  el.className = 'ripple';
  el.style.left = x+'px'; el.style.top = y+'px';
  rlayer.appendChild(el);
  ripples.push(el);
  while(ripples.length > CFG.RIPPLE_MAX) ripples.shift().remove();

  const drop = () => { const i = ripples.indexOf(el); if(i > -1) ripples.splice(i,1); el.remove(); };
  const peak = S.theme === 'night' ? 0.20 : 0.45;
  // Driven from script rather than a CSS keyframe: no dependency on stylesheet
  // resolution, and a promise that guarantees the node is cleaned up.
  if(el.animate){
    const a = el.animate(
      [{ transform:'translate(-50%,-50%) scale(0.25)', opacity: peak },
       { transform:'translate(-50%,-50%) scale(11)',   opacity: 0 }],
      { duration: 750, easing:'cubic-bezier(.2,.7,.4,1)', fill:'forwards' });
    if(a.finished) a.finished.then(drop, drop); else setTimeout(drop, 800);
  }else{
    setTimeout(drop, 60);
  }
}

/* ================= render ================= */
function render(){
  const n = today(), malas = Math.floor(n/CFG.MALA), beads = n % CFG.MALA, l = L();
  malaFill.style.width = (beads/CFG.MALA*100)+'%';
  let txt = l.mala+' <b>'+malas+'</b> · <b>'+beads+'</b>';
  if(S.target > 0)
    txt += ' <span class="'+(malas>=S.target?'done':'')+'">/ '+S.target+(malas>=S.target?' ✓':'')+'</span>';
  readout.innerHTML = txt;

  $('fToday').innerHTML   = malas+' <s>'+l.malaShort+'</s> '+beads;
  $('fTime').textContent  = hms(todaySec());
  $('fStreak').textContent = streak();
  $('fTotal').textContent = S.total.toLocaleString(lang==='hi' ? 'hi-IN' : 'en-IN');

  const a = document.activeElement;
  if(a !== $('cToday'))  $('cToday').value  = n;
  if(a !== $('cTotal'))  $('cTotal').value  = S.total;
  if(a !== $('cTarget')) $('cTarget').value = S.target || '';
  // Rebuilding 30 bars on every tap is pure waste when nobody is looking at them.
  if(menuOpen && panel === 'rec') drawHist();
}
function drawHist(){
  const d0 = japDay(), days = [];
  for(let i = CFG.HIST_DAYS-1; i >= 0; i--){
    const d = new Date(d0); d.setDate(d.getDate()-i);
    days.push({ k: fmt(d), n: S.log[fmt(d)] || 0 });
  }
  const max = Math.max(CFG.MALA, ...days.map(x => x.n));
  hist.innerHTML = days.map((x,i) => {
    const h = x.n ? Math.max(3, Math.round(x.n/max*100)) : 0;
    return '<div class="'+(x.n?'':'zero')+(i===days.length-1?' today':'')+
           '" style="height:'+h+'%" data-k="'+x.k+'" data-n="'+x.n+'"></div>';
  }).join('');
}
// title tooltips never appear on touch, so a bar answers when tapped
hist.addEventListener('click', e => {
  const b = e.target.closest('div[data-k]'); if(!b) return;
  const n = +b.dataset.n, m = Math.floor(n/CFG.MALA);
  toast(b.dataset.k+' — '+m+' '+L().malaShort+' · '+(n%CFG.MALA));
});

/* ================= one tap = one jap ================= */
function jap(x, y){
  const now = performance.now(), gap = now - lastTap; lastTap = now;
  // Glide follows the japper's own rhythm; otherwise the naam is never done arriving.
  const g = Math.max(CFG.GLIDE.min, Math.min(CFG.GLIDE.max, gap/CFG.GLIDE.divisor));
  nt.style.transitionDuration = g+'s,'+g+'s,.45s,.45s';

  // Session clock: time is the sum of gaps between taps, ignoring gaps over the
  // idle threshold. No button, no interval, no drift, no way to inflate it.
  const ts = Date.now(), dgap = ts - lastJapTs, dk = dkey();
  if(lastJapTs && dgap < CFG.IDLE_MS) S.sec[dk] = (S.sec[dk]||0) + Math.round(dgap/1000);
  else bell('open');                                   // a new sitting begins
  lastJapTs = ts;

  const n = today()+1, malas = Math.floor(n/CFG.MALA);
  S.log[dk] = n; S.total++;

  if(n % CFG.MALA === 0){
    const hit = S.target > 0 && malas === S.target;
    bell(hit ? 'target' : 'mala');
    buzz(hit ? [40,60,40] : 30);
    live.textContent = hit ? L().targetDone : L().malaDone.replace('{n}', malas);
  }
  if(!reduceMotion && nt.animate)
    nt.animate([{transform:'scale(1.055)'},{transform:'scale(1)'}], {duration:170, easing:'ease-out'});

  if(x === undefined){                                 // keyboard jap: ripple from the naam
    const r = nt.getBoundingClientRect(); x = r.left + r.width/2; y = r.top + r.height/2;
  }
  ripple(x, y);
  if(S.move){ moveRnd(); colorRnd(); }                 // steady mode leaves the naam alone
  prune(); save(); render();
}

/* ================= movement ================= */
function bounds(){
  const below = (menuOpen ? mc.offsetHeight : 0) + tabs.offsetHeight + 6;
  return {
    mx:  Math.max(0, innerWidth  - nt.offsetWidth),
    my:  Math.max(0, innerHeight - nt.offsetHeight - below - CFG.TOP_PAD),
    top: CFG.TOP_PAD
  };
}
function moveRnd(){
  const b = bounds();
  nt.style.left = Math.round(Math.random()*b.mx)+'px';
  nt.style.top  = (b.top + Math.round(Math.random()*b.my))+'px';
}
function center(){
  const b = bounds();
  nt.style.left = Math.round(b.mx/2)+'px';
  nt.style.top  = (b.top + Math.round(b.my/2))+'px';
}
const h2r = (h,a) => `rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`;
function colorRnd(){
  const t = S.theme, p = PALETTE[t] || PALETTE.dark;
  const c = p[Math.floor(Math.random()*p.length)], a = GLOW[t];
  nt.style.color = c;
  nt.style.textShadow = `0 0 20px ${h2r(c,a)},0 0 50px ${h2r(c, a*0.36)}`;
}

/* ================= pointer + keyboard ================= */
let dragging=false, moved=false, sx=0, sy=0, ox=0, oy=0;
document.addEventListener('pointerdown', e => {
  if(cw.contains(e.target)) return;                    // drawer + tab strip only
  if(e.target === nt){
    e.preventDefault();
    dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
    const r = nt.getBoundingClientRect(); ox = e.clientX-r.left; oy = e.clientY-r.top;
    nt.classList.add('dragging');
    try{ nt.setPointerCapture(e.pointerId); }catch(err){}
    return;
  }
  jap(e.clientX, e.clientY);
});
document.addEventListener('pointermove', e => {
  if(!dragging) return;
  if(Math.abs(e.clientX-sx) > CFG.DRAG_PX || Math.abs(e.clientY-sy) > CFG.DRAG_PX) moved = true;
  if(!moved) return;
  const b = bounds();
  nt.style.left = Math.max(0,     Math.min(e.clientX-ox, b.mx))+'px';
  nt.style.top  = Math.max(b.top, Math.min(e.clientY-oy, b.top+b.my))+'px';
});
let lastUp = {x:undefined, y:undefined};
document.addEventListener('pointerup', e => { lastUp = {x:e.clientX, y:e.clientY}; }, true);
function endDrag(){
  if(!dragging) return;
  dragging = false; nt.classList.remove('dragging');
  if(!moved) jap(lastUp.x, lastUp.y);
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', () => { dragging=false; nt.classList.remove('dragging'); });
document.addEventListener('keydown', e => {
  if(e.key !== ' ' && e.key !== 'Enter') return;
  if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(document.activeElement.tagName)) return;
  e.preventDefault(); jap();
});

/* ================= naam, fonts, size, theme ================= */
function setText(v){ if(!v) return; nt.innerText = v; S.naam = v; save(); }
const fontLoaded = {'Tiro Devanagari Hindi':true,'Noto Sans Devanagari':false,'Noto Serif Devanagari':false};
function ensureFont(f){
  if(fontLoaded[f]) return;
  fontLoaded[f] = true;
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family='+encodeURIComponent(f).replace(/%20/g,'+')+':wght@400;700&display=swap';
  document.head.appendChild(l);
}
function applyFont(f){
  ensureFont(f);
  nt.style.fontFamily = "'"+f+"','Tiro Devanagari Hindi','Noto Sans Devanagari',serif";
  S.font = f; save();
}
const defaultSize = () => Math.round(Math.min(72, Math.max(30, innerWidth*0.10)));
function applySize(px){ nt.style.fontSize = px+'px'; S.size = px; save(); }
function changeSize(d){ applySize(Math.max(16, (S.size||defaultSize()) + d*3)); }

const THEMES = ['dark','day','night'];
const THEME_META = { dark:'#07071c', day:'#fef6e4', night:'#000000' };
const THEME_GLYPH = { dark:'#i-moon', day:'#i-sun', night:'#i-star' };
function applyTheme(t){
  THEMES.forEach(k => document.body.classList.toggle('t-'+k, k===t));
  S.theme = t;
  $('thIc').setAttribute('href', THEME_GLYPH[t]);
  $('lbl-theme').textContent = L()['theme'+t[0].toUpperCase()+t.slice(1)];
  document.querySelector('meta[name=theme-color]').content = THEME_META[t];
  colorRnd(); save();
}
function cycleTheme(){ applyTheme(THEMES[(THEMES.indexOf(S.theme)+1) % THEMES.length]); }

/* Steady mode: the tap still counts and still gives feedback, the naam just
   stays where it is. For anyone who finds the chase distracting. */
function applyMove(){
  $('mvIc').setAttribute('href', S.move ? '#i-move' : '#i-steady');
  $('lbl-move').textContent = S.move ? L().move : L().steady;
  $('mvb').classList.toggle('on', S.move);
}
function toggleMove(){
  S.move = !S.move; applyMove(); save();
  toast(S.move ? L().moveOn : L().moveOff);
  if(!S.move) center();
}
function applyRipple(){ $('rpb').classList.toggle('on', S.ripple); }
function toggleRipple(){
  S.ripple = !S.ripple; applyRipple(); save();
  if(S.ripple) ripple(innerWidth/2, innerHeight/2);
}

/* ================= music ================= */
const setPP = playing => $('ppIc').setAttribute('href', playing ? '#i-pause' : '#i-play');
const mList = () => Array.from(mus.options).map(o => o.value).filter(Boolean);
function setMusic(src){
  S.music = src; save();
  trackIdx = mList().indexOf(src);
  if(src){ aud.src = src; aud.play().then(()=>setPP(true)).catch(()=>{ setPP(false); }); }
  else{ aud.pause(); aud.removeAttribute('src'); setPP(false); }
}
function nextTrack(){
  const l = mList(); if(!l.length) return;
  trackIdx = (trackIdx+1) % l.length;
  mus.value = l[trackIdx]; setMusic(l[trackIdx]);
}
function togglePlayPause(){
  if(!aud.getAttribute('src')){ toast(L().pickMusic); return; }
  if(aud.paused) aud.play().then(()=>setPP(true)).catch(()=>toast(L().musicFail));
  else { aud.pause(); setPP(false); }
}
function toggleLoop(){ aud.loop = !aud.loop; S.loop = aud.loop; lpb.classList.toggle('on', aud.loop); save(); }
aud.addEventListener('ended', () => { if(!aud.loop) nextTrack(); });
aud.addEventListener('error', () => { if(aud.getAttribute('src')){ setPP(false); toast(L().musicFail); } });

/* ================= auto drift ================= */
function armAuto(){ clearInterval(autoInt); if(S.auto) autoInt = setInterval(()=>{ moveRnd(); colorRnd(); }, S.speed); }
function toggleAuto(){ S.auto = !S.auto; aub.classList.toggle('on', S.auto); armAuto(); save(); }
function updateSpeed(v){
  S.speed = Math.min(CFG.AUTO.max, Math.max(CFG.AUTO.min, +v));
  spv.textContent = (S.speed/1000).toFixed(1)+'s';
  armAuto(); save();
}

/* ================= countdown (wall-clock) ================= */
function setTimer(m){
  clearInterval(timerInt); td.textContent = ''; S.timer = m || ''; save();
  m = +m; if(!(m > 0)) return;
  timerEnd = Date.now() + m*60000;
  tickTimer(); timerInt = setInterval(tickTimer, 250);
}
function tickTimer(){
  const s = Math.max(0, Math.round((timerEnd - Date.now())/1000));
  td.textContent = Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  if(s <= 0){
    clearInterval(timerInt); td.textContent = '✓';
    aud.pause(); setPP(false);
    S.auto = false; aub.classList.remove('on'); armAuto();
    bell('target'); buzz([40,80,40]); releaseWake(); flush();
    toast(L().timeUp);
  }
}

/* ================= screen wake lock =================
   The Screen Wake Lock API only exists in a secure context. Served over https
   (GitHub Pages counts) it works in Chrome for Android and in Safari 16.4+.
   Opened as a local file it cannot work, and we say so rather than failing mute. */
function wakeSupported(){ return isSecureContext && ('wakeLock' in navigator); }
async function requestWake(quiet){
  try{
    wakeLock = await navigator.wakeLock.request('screen');
    wli.classList.add('on'); wlb.classList.add('on');
    wakeLock.addEventListener('release', () => wli.classList.remove('on'));
    if(!quiet) toast(L().wakeOn);
  }catch(e){
    S.wake = false; wlb.classList.remove('on'); wli.classList.remove('on');
    if(!quiet) toast(L().noWake);
    save();
  }
}
async function releaseWake(quiet){
  S.wake = false; wlb.classList.remove('on'); wli.classList.remove('on');
  if(wakeLock){ try{ await wakeLock.release(); }catch(e){} wakeLock = null; }
  if(!quiet) toast(L().wakeOff);
  save();
}
async function toggleWakeLock(){
  if(!isSecureContext){ toast(L().insecure); return; }
  if(!('wakeLock' in navigator)){ toast(L().noWake); return; }
  if(S.wake) return releaseWake();
  S.wake = true; wlb.classList.add('on'); save(); await requestWake();
}
// The lock is dropped whenever the tab is hidden, so it must be taken again on return.
async function reacquireWake(){
  if(S.wake && wakeSupported() && (!wakeLock || wakeLock.released)) await requestWake(true);
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', async () => {
  if(document.visibilityState === 'hidden'){ hiddenAt = Date.now(); flush(); return; }
  await reacquireWake();
  // Glancing at a notification should not ring the opening bell again — only a
  // genuine break starts a new sitting.
  if(hiddenAt && Date.now() - hiddenAt > CFG.IDLE_MS) lastJapTs = 0;
  render();
});
addEventListener('focus', reacquireWake);
addEventListener('orientationchange', () => setTimeout(reacquireWake, 300));

/* ================= drawer tabs ================= */
function showPanel(p){
  panel = p;
  ['jap','rec','set'].forEach(k => {
    $('p-'+k).classList.toggle('on', k===p);
    $('tab-'+k).classList.toggle('sel', k===p);
    $('tab-'+k).setAttribute('aria-selected', k===p);
  });
}
tabs.addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  const p = b.dataset.p;
  if(menuOpen && p === panel){ menuOpen = false; mc.classList.add('closed'); return; }
  showPanel(p);
  if(!menuOpen){ menuOpen = true; mc.classList.remove('closed'); }
  if(p === 'rec') render();
});

/* ================= sheet: swipe down to close ================= */
(function(){
  const grip = $('grip');
  let gy = 0, gdy = 0, gdrag = false;
  grip.addEventListener('pointerdown', e => {
    gdrag = true; gy = e.clientY; gdy = 0;
    mc.classList.add('grabbing');
    try{ grip.setPointerCapture(e.pointerId); }catch(err){}
  });
  grip.addEventListener('pointermove', e => {
    if(!gdrag) return;
    gdy = Math.max(0, e.clientY - gy);
    mc.style.transform = 'translateY('+gdy+'px)';
  });
  function gEnd(){
    if(!gdrag) return;
    gdrag = false; mc.classList.remove('grabbing'); mc.style.transform = '';
    if(gdy > 60){ menuOpen = false; mc.classList.add('closed'); }
  }
  grip.addEventListener('pointerup', gEnd);
  grip.addEventListener('pointercancel', gEnd);
})();

/* ================= two-step confirm ================= */
function ask(btn, fn){
  if(btn.dataset.armed){
    clearTimeout(+btn.dataset.t); delete btn.dataset.armed;
    btn.textContent = btn.dataset.lbl; btn.classList.remove('on'); fn(); return;
  }
  btn.dataset.lbl = btn.textContent;
  btn.textContent = L().sure;
  btn.classList.add('on'); btn.dataset.armed = '1';
  btn.dataset.t = setTimeout(() => {
    delete btn.dataset.armed; btn.textContent = btn.dataset.lbl; btn.classList.remove('on');
  }, 3200);
}
function resetToday(){ ask($('rsToday'), () => { setToday(0); S.sec[dkey()] = 0; flush(); render(); toast(L().doneReset); }); }
function resetAll(){   ask($('rsAll'),   () => { S.log={}; S.sec={}; S.total=0; flush(); render(); toast(L().doneReset); }); }

/* ================= build selects from config ================= */
function buildSelects(){
  ns.innerHTML = '<option value="" id="op-naam"></option>' +
    NAAMS.map(n => `<option value="${n}">${n}</option>`).join('');
  const grp = (key, id) => `<optgroup id="${id}">` +
    TRACKS[key].map(t => `<option value="${t.u}">${t.t}</option>`).join('') + '</optgroup>';
  mus.innerHTML = '<option value="" id="op-music"></option>' + grp('indian','og-in') + grp('chinese','og-cn');
}

/* ================= language ================= */
function applyLang(l){
  const t = LABELS[l], set = (id,v) => { const e = $(id); if(e) e.textContent = v; };
  set('lbl-naam',t.naam); set('lbl-sankalp',t.sankalp); set('lbl-target',t.target);
  set('lbl-roop',t.roop); set('lbl-sound',t.sound);     set('lbl-music',t.music);
  set('lbl-speed',t.speed); set('lbl-edit',t.edit);     set('lbl-install',t.install);
  set('lbl-today',t.today); set('lbl-total',t.total);
  set('lbl-bell',t.bell);  set('lbl-haptic',t.haptic);  set('lbl-wake',t.wake);
  set('lbl-touch',t.touch); set('lbl-ripple',t.ripple);
  set('hint-auto',t.autoNote);
  set('f1',t.today); set('f2',t.time); set('f3',t.days); set('f4',t.totalJap);
  set('ax1',t.ax1);  set('ax2',t.ax2);
  set('tab-jap',t.tabJap); set('tab-rec',t.tabRec); set('tab-set',t.tabSet);
  set('op-naam',t.naamPh); set('op-music',t.musicPh);
  set('rsToday',t.rsToday); set('rsAll',t.rsAll);
  set('hint-edit',t.hintEdit);
  set('foot','v'+CFG.VERSION+' · '+t.foot);
  set('instb',t.installBtn); set('lgb',t.langBtn);
  $('it').placeholder = t.textPh; $('ti').placeholder = t.timerPh;
  $('og-in').label = t.indian; $('og-cn').label = t.chinese;
  aub.textContent = t.auto;
  document.documentElement.lang = l;
  applyTheme(S.theme);                                  // theme button carries a word
  applyMove();
  render();
}
function toggleLang(){ lang = (lang==='hi' ? 'en' : 'hi'); S.lang = lang; save(); applyLang(lang); }

/* ================= install prompt ================= */
addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e; $('installRow').style.display = 'flex';
});
function installApp(){
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.finally(() => { deferredPrompt = null; $('installRow').style.display = 'none'; });
}
if(location.protocol.startsWith('http') && 'serviceWorker' in navigator)
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));

/* ================= wiring ================= */
ns.addEventListener('change', e => { if(e.target.value){ setText(e.target.value); $('it').value=''; } });
$('it').addEventListener('input', e => setText(e.target.value));
$('fs').addEventListener('change', e => applyFont(e.target.value));
mus.addEventListener('change', e => setMusic(e.target.value));
$('vol').addEventListener('input', e => { aud.volume = S.vol = parseFloat(e.target.value); save(); });
spd.addEventListener('input', e => updateSpeed(e.target.value));
$('ti').addEventListener('change', e => setTimer(e.target.value));
$('cToday').addEventListener('change',  e => setToday(+e.target.value));
$('cTotal').addEventListener('change',  e => { S.total  = Math.max(0, Math.round(+e.target.value)||0); save(); render(); });
$('cTarget').addEventListener('change', e => { S.target = Math.max(0, Math.round(+e.target.value)||0); save(); render(); });
addEventListener('resize', () => {
  const b = bounds();
  nt.style.left = Math.min(parseFloat(nt.style.left) || 0,     b.mx)+'px';
  nt.style.top  = Math.min(parseFloat(nt.style.top)  || b.top, b.top+b.my)+'px';
});

/* ================= boot ================= */
load();
lang = S.lang || 'hi';
buildSelects();
nt.innerText = S.naam;
if(NAAMS.includes(S.naam)) ns.value = S.naam; else $('it').value = S.naam;
applyFont(S.font);
applySize(S.size || defaultSize());
$('fs').value = S.font;
blb.classList.toggle('on', S.bell   !== false);
hpb.classList.toggle('on', S.haptic !== false);
applyRipple();
spd.min = CFG.AUTO.min; spd.max = CFG.AUTO.max; spd.step = CFG.AUTO.step;
aud.volume = S.vol; $('vol').value = S.vol;
aud.loop = !!S.loop; lpb.classList.toggle('on', aud.loop);
if(S.music){ mus.value = S.music; aud.src = S.music; }   // loaded, never auto-played
setPP(false);
spd.value = S.speed; spv.textContent = (S.speed/1000).toFixed(1)+'s';
if(S.auto){ aub.classList.add('on'); armAuto(); }
if(S.timer) $('ti').value = S.timer;
showPanel('jap');
applyLang(lang);
if(S.wake && wakeSupported()) requestWake(true);
render();
setTimeout(center, 80);

addEventListener('error', e => { if(e.message) toast(e.message.slice(0,90)); });

let curDay = dkey();
setInterval(() => { if(dkey() !== curDay){ curDay = dkey(); lastJapTs = 0; render(); } }, 30000);

if(S.total === 0 && !Object.keys(S.log).length) setTimeout(() => toast(L().firstRun), 700);

/* ---- self-check: open with ?test=1 ---- */
if(location.search.indexOf('test=1') > -1){
  const out = [], ok = (n,c) => out.push((c ? 'PASS  ' : 'FAIL  ')+n);
  const backup = JSON.stringify(S);
  ok('dkey format',              /^\d{4}-\d{2}-\d{2}$/.test(dkey()));
  ok('japDay noon-anchored',     japDay().getHours() === 12);
  S.log={}; S.sec={}; S.total=0;
  setToday(5); ok('setToday writes day',        today() === 5);
  ok('setToday raises total',                   S.total === 5);
  setToday(2); ok('setToday lowers total by delta', S.total === 2);
  ok('streak counts active day',                streak() === 1);
  S.log={}; S.total=0; ok('streak 0 when empty', streak() === 0);
  const d = japDay(); d.setDate(d.getDate()-1); S.log[fmt(d)] = 108;
  ok('streak reaches back a day',               streak() === 1);
  S.log[dkey()] = 10; ok('streak counts two in a row', streak() === 2);
  ok('hms under an hour',  hms(600)  === '10m');
  ok('hms over an hour',   hms(3900) === '1h 5m');
  drawHist();
  ok('history renders all bars', hist.children.length === CFG.HIST_DAYS);
  ok('history marks today',      hist.lastElementChild.classList.contains('today'));
  ok('naam select built',        ns.options.length === NAAMS.length + 1);
  ok('music select built',       mus.querySelectorAll('option').length === 1 + TRACKS.indian.length + TRACKS.chinese.length);
  ok('closed drawer ignores pointer', getComputedStyle(cw).pointerEvents === 'none');
  ok('every theme has a palette', THEMES.every(t => Array.isArray(PALETTE[t]) && PALETTE[t].length));
  ok('every theme has an icon',   THEMES.every(t => THEME_GLYPH[t] && document.querySelector(THEME_GLYPH[t])));
  ok('auto floor avoids flicker', CFG.AUTO.min >= 300);
  ok('auto reaches ten seconds',  CFG.AUTO.max >= 10000);
  ok('speed slider matches config', +spd.min === CFG.AUTO.min && +spd.max === CFG.AUTO.max);
  const before = S.total; armAuto(); moveRnd(); colorRnd();
  ok('auto movement counts nothing', S.total === before);
  ok('ripples stay capped', ripples.length <= CFG.RIPPLE_MAX);
  const rWas = S.ripple; S.ripple = true;
  const rBefore = rlayer.children.length; ripple(50, 50);
  ok('a ripple actually mounts', rlayer.children.length === rBefore + 1);
  S.ripple = rWas;
  ok('icons carry a viewBox', [...document.querySelectorAll('svg.ic')].every(e => e.getAttribute('viewBox')));
  ok('selects are not flexed', !getComputedStyle($('ns')).display.includes('flex'));
  S = JSON.parse(backup); flush(); render();
  console.log('%c'+out.join('\n'), 'font-family:monospace');
  toast(out.some(r => r[0]==='F') ? 'Self-check FAILED — see console'
                                  : 'Self-check passed ('+out.length+')');
}
