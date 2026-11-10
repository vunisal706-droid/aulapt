'use strict';
/* ===================== Regletas Mágicas v2 · CEIP Capitulaciones ===================== */
const AVISO_KEY = 'regletas_aviso_v4';
const AVISO_TXT = 'Ahora hay un mapa con trece paradas, Regli te lee los retos en voz alta y el profe puede preparar retos a medida.';

const REG = {
  1:{c:'#FFFFFF',n:'blanca',t:'#333'},       2:{c:'#E31F26',n:'roja',t:'#fff'},
  3:{c:'#8DC63F',n:'verde clara',t:'#1f3a00'},4:{c:'#F8A6C6',n:'rosa',t:'#5a1030'},
  5:{c:'#FEDD00',n:'amarilla',t:'#4a3b00'},  6:{c:'#00733A',n:'verde oscura',t:'#fff'},
  7:{c:'#231F20',n:'negra',t:'#fff'},        8:{c:'#8B5A2B',n:'marrón',t:'#fff'},
  9:{c:'#007DC5',n:'azul',t:'#fff'},         10:{c:'#F58220',n:'naranja',t:'#3d1d00'}
};
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const color = v => REG[v].n;
const chip = v => `<span class="chip" style="--n:${Math.min(v,10)};--col:${REG[v].c}"></span>`;
const nm = v => `<b>${color(v)}</b> ${chip(v)}`;

const S = {
  puntos:0, racha:0, modo:'libre', sonido:true, voz:true, todo:false, estrellas:{}, nueva:0,
  ver:{num:true, marcas:true, sumas:true},
  piezas:[], nextId:1, sel:null, lastTap:0,
  U:40, COLS:20, ROWS:8,
  ronda:null, reto:null, retoSpec:null, resuelto:false
};

/* ---------- Persistencia ---------- */
function cargar(){
  try{ const d = JSON.parse(localStorage.getItem('regletas_v2')||'{}');
    if(d.puntos) S.puntos=d.puntos;
    if(d.ver) Object.assign(S.ver,d.ver); if(d.sonido===false) S.sonido=false;
    if(d.voz===false) S.voz=false; if(d.todo) S.todo=true;
    if(d.estrellas) S.estrellas=d.estrellas;
  }catch(e){}
}
function guardar(){
  try{ localStorage.setItem('regletas_v2', JSON.stringify({puntos:S.puntos,ver:S.ver,sonido:S.sonido,voz:S.voz,todo:S.todo,estrellas:S.estrellas})); }catch(e){}
}

/* ---------- Sonido (un solo AudioContext) ---------- */
let AC=null;
function ac(){
  if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
  if(AC.state==='suspended') AC.resume();
  return AC;
}
function tono(f,t,dur,vol=.18,tipo='sine'){
  const c=ac(); if(!c) return;
  const o=c.createOscillator(), g=c.createGain();
  o.type=tipo; o.frequency.value=f; o.connect(g); g.connect(c.destination);
  const t0=c.currentTime+t;
  g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(.001,t0+dur);
  o.start(t0); o.stop(t0+dur+.02);
}
function sonido(tipo){
  if(!S.sonido) return;
  if(tipo==='clic'){ tono(660,0,.08,.15,'triangle'); tono(880,.05,.08,.12,'triangle'); }
  else if(tipo==='coger') tono(520,0,.06,.1,'triangle');
  else if(tipo==='quitar') tono(300,0,.12,.15,'triangle');
  else if(tipo==='error'){ tono(220,0,.15,.15,'square'); tono(180,.12,.18,.12,'square'); }
  else if(tipo==='exito') [523,659,784,1047].forEach((f,i)=>tono(f,i*.09,.28,.16));
  else if(tipo==='victoria') [523,659,784,1047,784,1047].forEach((f,i)=>tono(f,i*.14,.38,.18));
}

/* ---------- Utilidades UI ---------- */
let toastT;
function toast(txt, bien=false, ms=2000){
  const t=$('#toast'); t.innerHTML=txt; t.className='toast ver'+(bien?' bien':'');
  clearTimeout(toastT); toastT=setTimeout(()=>t.className='toast',ms);
}
function modal(html,fijo){ $('#modalCaja').innerHTML=html; $('#modal').hidden=false; if(fijo) $('#modal').dataset.fijo='1'; else delete $('#modal').dataset.fijo; }
function cerrarModal(){ $('#modal').hidden=true; }
$('#modal').addEventListener('pointerdown',e=>{ if(e.target.id==='modal' && !$('#modal').dataset.fijo) cerrarModal(); });

function confeti(){
  const cols=Object.values(REG).map(r=>r.c);
  for(let i=0;i<60;i++){
    const d=document.createElement('div'); d.className='confeti';
    const s=6+Math.random()*10;
    d.style.cssText=`left:${Math.random()*100}vw;width:${s}px;height:${s*(Math.random()>.5?1:2.5)}px;background:${cols[i%10]};border-radius:${Math.random()>.5?'50%':'2px'};--d:${1.8+Math.random()*1.8}s;--r:${Math.random()*900-450}deg;animation-delay:${Math.random()*.4}s`;
    document.body.appendChild(d); setTimeout(()=>d.remove(),4200);
  }
}
function actualizarStats(){ $('#puntos').textContent=S.puntos; $('#racha').textContent=S.racha; }

/* ---------- Regli, la regleta que acompaña ---------- */
function regliSVG(animo){
  const boca = animo==='feliz' ? '<path d="M21 43q9 11 18 0z" fill="#7a2a00"/><path d="M25 47q5 4 10 0" fill="#ff8fa3"/>'
    : animo==='piensa' ? '<path d="M24 46q6-3 12 1" fill="none" stroke="#7a2a00" stroke-width="2.6" stroke-linecap="round"/>'
    : animo==='ups' ? '<ellipse cx="30" cy="46" rx="4" ry="5" fill="#7a2a00"/>'
    : '<path d="M22 43q8 8 16 0" fill="none" stroke="#7a2a00" stroke-width="2.6" stroke-linecap="round"/>';
  const ojos = animo==='feliz'
    ? '<path d="M16 30q5-7 10 0M34 30q5-7 10 0" fill="none" stroke="#3d1d00" stroke-width="3" stroke-linecap="round"/>'
    : `<ellipse cx="21" cy="29" rx="6.5" ry="7.5" fill="#fff" stroke="#3d1d00" stroke-width="1.5"/><ellipse cx="39" cy="29" rx="6.5" ry="7.5" fill="#fff" stroke="#3d1d00" stroke-width="1.5"/>
       <circle cx="${animo==='piensa'?23:22}" cy="${animo==='piensa'?26:30}" r="3.2" fill="#3d1d00"/><circle cx="${animo==='piensa'?41:40}" cy="${animo==='piensa'?26:30}" r="3.2" fill="#3d1d00"/>
       <circle cx="23" cy="28" r="1.1" fill="#fff"/><circle cx="41" cy="28" r="1.1" fill="#fff"/>`;
  const brazos = animo==='feliz'
    ? '<path d="M8 52q-9-8-6-18M52 52q9-8 6-18" fill="none" stroke="#c9620e" stroke-width="5" stroke-linecap="round"/>'
    : animo==='piensa' ? '<path d="M8 58q-8 6-5 15M52 56q9-3 4-14" fill="none" stroke="#c9620e" stroke-width="5" stroke-linecap="round"/>'
    : '<path d="M8 58q-8 6-5 15M52 58q8 6 5 15" fill="none" stroke="#c9620e" stroke-width="5" stroke-linecap="round"/>';
  return `<svg viewBox="-4 0 68 112" aria-hidden="true">${brazos}
    <path d="M20 98v8M40 98v8" stroke="#c9620e" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="18" cy="107" rx="7" ry="3.5" fill="#7a2a00"/><ellipse cx="42" cy="107" rx="7" ry="3.5" fill="#7a2a00"/>
    <rect x="8" y="6" width="44" height="94" rx="12" fill="#F58220" stroke="#3d1d00" stroke-width="2.5"/>
    <rect x="12" y="10" width="12" height="86" rx="6" fill="rgba(255,255,255,.3)"/>
    <path d="M9 62h42M9 74h42M9 86h42" stroke="rgba(61,29,0,.35)" stroke-width="2"/>
    <circle cx="14" cy="38" r="4" fill="#ff9d7a" opacity=".8"/><circle cx="46" cy="38" r="4" fill="#ff9d7a" opacity=".8"/>
    ${ojos}${boca}</svg>`;
}
let regliT;
function regli(animo, ms){
  const el=$('#regli'); if(!el) return;
  el.innerHTML=regliSVG(animo); el.className='regli '+(animo||'');
  clearTimeout(regliT); if(ms) regliT=setTimeout(()=>regli(''),ms);
}

/* ---------- Voz: Regli lee los retos (para quien todavía no lee) ---------- */
function textoPlano(html){
  const d=document.createElement('div'); d.innerHTML=html;
  return d.textContent.replace(/¿\?/g,'cuánto').replace(/\s+/g,' ').replace(/[🎈🎨🔒💡👀😅🔥]/gu,'').trim();
}
function decir(html){
  if(!('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(textoPlano(html));
    u.lang='es-ES'; u.rate=.92; u.pitch=1.15;
    const v=speechSynthesis.getVoices().find(v=>/^es(-|_)ES/i.test(v.lang))||speechSynthesis.getVoices().find(v=>/^es/i.test(v.lang));
    if(v) u.voice=v;
    speechSynthesis.speak(u);
  }catch(e){}
}
function callar(){ try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){} }
function hablar(html){ if(S.voz) decir(html); }

/* ===================== TABLERO ===================== */
const board = $('#tablero'), preview = $('#preview');

function medir(){
  const wrap=$('#tableroWrap');
  const W=wrap.clientWidth-26, H=wrap.clientHeight-12-26;
  // Móvil en vertical: 10 cuadraditos de ancho (la recta del 1 al 10). Resto: unas 20 columnas.
  let U=Math.min(52, Math.floor(W/(W<600?10:20)));
  const minF=W<600?4:5;
  if(H/U<minF) U=Math.floor(H/minF);
  U=Math.max(14,U);
  return {U,COLS:Math.max(Math.min(10,Math.floor(W/U)),Math.min(40,Math.floor(W/U))),ROWS:Math.max(2,Math.floor(H/U))};
}
function layout(){
  board.style.width=board.style.height='0px';
  if(!$('#paleta').children.length) construirPaleta();
  let m=medir();
  const P0=S.U; S.U=m.U; construirPaleta(); S.U=P0;
  m=medir();
  const {U,COLS,ROWS}=m;
  const cambia = U!==S.U || COLS!==S.COLS || ROWS!==S.ROWS;
  S.U=U; S.COLS=COLS; S.ROWS=ROWS;
  document.documentElement.style.setProperty('--u',U+'px');
  board.style.width=COLS*U+6+'px'; board.style.height=ROWS*U+6+'px';
  // regla numérica: cada número es un cuadradito
  $('#regla').innerHTML=Array.from({length:COLS},(_,i)=>{const n=i+1;return `<span class="${n%10===0?'diez':n%5===0?'cinco':''}">${n}</span>`;}).join('');
  construirPaleta();
  if(cambia){
    if(S.reto) prepararReto(S.retoSpec, false);
    else S.piezas=S.piezas.filter(p=>celdas(p).every(([c,r])=>c<COLS&&r<ROWS));
  }
  render();
}

function construirPaleta(){
  const pal=$('#paleta');
  // La paleta siempre cabe: en móvil vertical, escalera de regletas de pie; si no, todas en una fila
  const ancho=Math.max(280,window.innerWidth-24), esc=window.innerWidth<600&&window.innerHeight>window.innerWidth;
  pal.classList.toggle('escalera',esc);
  let P=esc?Math.max(12,Math.min(20,Math.floor((ancho-9*8)/10),Math.floor(window.innerHeight*.022))):26;
  if(!esc){ const cabe=q=>{let t=9*12+20;for(let v=1;v<=10;v++)t+=Math.max(v*q,28);return t<=ancho;}; while(P>9&&!cabe(P))P--; }
  pal.innerHTML='';
  for(let v=1;v<=10;v++){
    const it=document.createElement('div'); it.className='pal-item';
    const r=document.createElement('div'); r.className='pieza'+(esc?' vert':'');
    r.style.cssText=esc?`--u:${P}px;width:${P}px;height:${v*P}px;`:`--u:${P}px;width:${v*P}px;height:${P}px;`; r.style.cssText+=`--col:${REG[v].c};--txt:${REG[v].t}`;
    r.title=`Regleta ${color(v)} (${v})`;
    r.addEventListener('pointerdown',e=>empezarDrag(e,{v,vert:esc}));
    const n=document.createElement('span'); n.className='pal-num'; n.textContent=v;
    it.append(r,n); pal.appendChild(it);
  }
}

function celdas(p){ const o=[]; for(let i=0;i<p.v;i++) o.push(p.vert?[p.c,p.r+i]:[p.c+i,p.r]); return o; }
function ocupadas(ignorar){
  const s=new Set();
  S.piezas.forEach(p=>{ if(p.id!==ignorar) celdas(p).forEach(([c,r])=>s.add(c+','+r)); });
  return s;
}
function cabe(p,ignorar){
  const cs=celdas(p);
  if(cs.some(([c,r])=>c<0||r<0||c>=S.COLS||r>=S.ROWS)) return false;
  const occ=ocupadas(ignorar);
  return cs.every(([c,r])=>!occ.has(c+','+r));
}
const libres = () => S.piezas.filter(p=>!p.locked);
const pieza = id => S.piezas.find(p=>p.id===id);
function fija(v,c,r){ S.piezas.push({id:S.nextId++,v,c,r,vert:false,locked:true}); }
function quitar(id){ S.piezas=S.piezas.filter(p=>p.id!==id); if(S.sel===id) S.sel=null; }

/* Trenes: regletas pegadas en la misma fila (o columna si están giradas) */
function trenes(soloLibres){
  const res=[], ps=S.piezas.filter(p=>!soloLibres||!p.locked);
  for(const vert of [false,true]){
    const g={};
    ps.filter(p=>!!p.vert===vert).forEach(p=>{ const k=vert?p.c:p.r; (g[k]=g[k]||[]).push(p); });
    for(const k in g){
      const arr=g[k].sort((a,b)=>vert?a.r-b.r:a.c-b.c);
      let cur=[arr[0]];
      for(let i=1;i<arr.length;i++){
        const pr=cur[cur.length-1];
        const fin=vert?pr.r+pr.v:pr.c+pr.v, ini=vert?arr[i].r:arr[i].c;
        if(ini===fin) cur.push(arr[i]); else { res.push(mkTren(cur,vert)); cur=[arr[i]]; }
      }
      res.push(mkTren(cur,vert));
    }
  }
  return res;
}
function mkTren(ps,vert){ return {ps,vert,len:ps.reduce((s,p)=>s+p.v,0),c:ps[0].c,r:ps[0].r}; }

/* Regletas libres que tapan exactamente el tramo [c0, c0+len) de la fila r */
function cubre(r,c0,len){
  const ps=libres().filter(p=>!p.vert&&p.r===r&&p.c<c0+len&&p.c+p.v>c0);
  if(!ps.length || ps.some(p=>p.c<c0||p.c+p.v>c0+len)) return null;
  return ps.reduce((s,p)=>s+p.v,0)===len ? ps : null;
}

function numerosOcultos(){ return !S.ver.num || !!(S.reto && S.reto.ocultarNumeros); }

function render(){
  const U=S.U, ocultar=numerosOcultos();
  board.querySelectorAll('.pieza,.badge').forEach(e=>e.remove());
  board.classList.toggle('sinmarcas',!S.ver.marcas);
  $('#paleta').classList.toggle('sinmarcas',!S.ver.marcas);
  $('#paleta').classList.toggle('ocultar-num',ocultar);
  for(const p of S.piezas){
    const el=document.createElement('div');
    el.className='pieza'+(p.vert?' vert':'')+(p.locked?' fija':'')+(S.sel===p.id?' sel':'')+(S.nueva===p.id?' nueva':'');
    el.dataset.id=p.id;
    el.style.cssText=`left:${p.c*U}px;top:${p.r*U}px;width:${(p.vert?1:p.v)*U}px;height:${(p.vert?p.v:1)*U}px;--col:${REG[p.v].c};--txt:${REG[p.v].t}`;
    if(!ocultar) el.innerHTML=`<span>${p.v}</span>`;
    board.appendChild(el);
  }
  S.nueva=0;
  if(S.ver.sumas && !ocultar) dibujarSumas();
  $('#btnGirar').disabled = $('#btnQuitar').disabled = !S.sel;
}

function dibujarSumas(){
  const U=S.U;
  for(const t of trenes(false)){
    if(t.ps.length<2) continue;
    // ¿mide igual que una regleta pegada arriba o abajo?
    const comp=S.piezas.find(q=>!!q.vert===t.vert && q.v===t.len && !t.ps.includes(q) &&
      (t.vert ? (q.r===t.r && Math.abs(q.c-t.c)===1) : (q.c===t.c && Math.abs(q.r-t.r)===1)));
    const b=document.createElement('div');
    b.className='badge'+(comp?' igual':'');
    b.textContent=t.ps.map(p=>p.v).join(' + ')+' = '+t.len+(comp?' ✓':'');
    if(!t.vert){
      const fin=t.c+t.len;
      if(fin<=S.COLS-3){ b.style.left=fin*U+6+'px'; b.style.top=t.r*U+U/2+'px'; b.style.transform='translateY(-50%)'; }
      else { b.style.left=fin*U+'px'; b.style.top=(t.r>0?t.r*U-2:(t.r+1)*U+2)+'px'; b.style.transform=t.r>0?'translate(-100%,-100%)':'translate(-100%,0)'; }
    } else {
      b.style.left=t.c*U+U/2+'px';
      if(t.r>0){ b.style.top=t.r*U-4+'px'; b.style.transform='translate(-50%,-100%)'; }
      else { b.style.top=(t.r+t.len)*U+4+'px'; b.style.transform='translate(-50%,0)'; }
    }
    board.appendChild(b);
    if(comp) [...t.ps,comp].forEach(p=>{ const e=board.querySelector(`[data-id="${p.id}"]`); if(e) e.classList.add('igual'); });
  }
}

/* ===================== ARRASTRAR ===================== */
let D=null;
function empezarDrag(e,o){
  if(e.button>0) return;
  e.preventDefault(); ac();
  const U=S.U, w=(o.vert?1:o.v)*U, h=(o.vert?o.v:1)*U;
  const g=document.createElement('div');
  g.className='pieza fantasma'+(o.vert?' vert':'');
  g.style.cssText=`--u:${U}px;width:${w}px;height:${h}px;--col:${REG[o.v].c};--txt:${REG[o.v].t}`;
  if(!numerosOcultos()) g.innerHTML=`<span>${o.v}</span>`;
  if(!S.ver.marcas) g.style.setProperty('--marca','none');
  let offX=U/2, offY=U/2;
  if(o.pieza){
    const el=board.querySelector(`[data-id="${o.pieza.id}"]`);
    const r=el.getBoundingClientRect(); offX=e.clientX-r.left; offY=e.clientY-r.top;
    el.classList.add('origen');
  }
  document.body.appendChild(g);
  D={g,v:o.v,vert:o.vert,pieza:o.pieza||null,offX,offY,x0:e.clientX,y0:e.clientY,movido:false,pid:e.pointerId};
  moverFantasma(e.clientX,e.clientY);
  if(!o.pieza) sonido('coger');
}
function moverFantasma(x,y){
  const l=x-D.offX, t=y-D.offY;
  D.g.style.left=l+'px'; D.g.style.top=t+'px';
  const br=board.getBoundingClientRect(), bx=br.left+3, by=br.top+3;
  D.dentro = x>=br.left && x<=br.right && y>=br.top && y<=br.bottom;
  D.c=Math.round((l-bx)/S.U); D.r=Math.round((t-by)/S.U);
  D.ok = D.dentro && cabe({v:D.v,vert:D.vert,c:D.c,r:D.r}, D.pieza&&D.pieza.id);
  if(D.dentro && D.movido){
    const U=S.U;
    preview.hidden=false; preview.className='preview '+(D.ok?'ok':'mal');
    preview.style.cssText=`left:${D.c*U}px;top:${D.r*U}px;width:${(D.vert?1:D.v)*U}px;height:${(D.vert?D.v:1)*U}px`;
  } else preview.hidden=true;
  $('#paleta').classList.toggle('papelera', !!D.pieza && D.movido && !D.dentro);
}
window.addEventListener('pointermove',e=>{
  if(!D||e.pointerId!==D.pid) return;
  e.preventDefault();
  if(Math.hypot(e.clientX-D.x0,e.clientY-D.y0)>6) D.movido=true;
  moverFantasma(e.clientX,e.clientY);
},{passive:false});
window.addEventListener('pointerup',soltar);
window.addEventListener('pointercancel',()=>{ if(!D) return; D.g.remove(); D=null; preview.hidden=true; $('#paleta').classList.remove('papelera'); render(); });

function soltar(e){
  if(!D||e.pointerId!==D.pid) return;
  const d=D; D=null; d.g.remove(); preview.hidden=true; $('#paleta').classList.remove('papelera');
  if(!d.movido){
    if(d.pieza) tocarPieza(d.pieza); else colocarAuto(d.v);
    return;
  }
  if(!d.dentro){
    if(d.pieza){ quitar(d.pieza.id); sonido('quitar'); cambio(); } else render();
    return;
  }
  if(d.ok){
    let p=d.pieza;
    if(p){ p.c=d.c; p.r=d.r; }
    else { p={id:S.nextId++,v:d.v,vert:d.vert,c:d.c,r:d.r}; S.piezas.push(p); }
    S.sel=null; sonido('clic'); cambio(p);
  } else { toast('Ahí no cabe 😅'); sonido('error'); regli('ups',900); render(); }
}

/* Tocar una regleta de la paleta la coloca en el primer hueco libre */
function colocarAuto(v){
  for(let r=0;r<S.ROWS;r++) for(let c=0;c+v<=S.COLS;c++){
    const p={id:0,v,c,r,vert:false};
    if(cabe(p)){ p.id=S.nextId++; S.piezas.push(p); sonido('clic'); cambio(p); return; }
  }
  toast('No queda sitio en la mesa'); sonido('error');
}

function tocarPieza(p){
  const ahora=Date.now();
  if(S.sel===p.id && ahora-S.lastTap<450) girar(p);
  else S.sel=p.id;
  S.lastTap=ahora; render();
}
function girar(p){
  if(!p) return;
  const cand={...p,vert:!p.vert};
  if(cabe(cand,p.id)){ p.vert=!p.vert; sonido('clic'); cambio(p); }
  else { toast('No hay sitio para girarla'); sonido('error'); }
}

board.addEventListener('pointerdown',e=>{
  const el=e.target.closest('.pieza');
  if(!el){ if(S.sel){ S.sel=null; render(); } return; }
  const p=pieza(+el.dataset.id);
  if(!p) return;
  if(p.locked){ toast('Esta regleta está fija 🔒'); return; }
  empezarDrag(e,{v:p.v,vert:p.vert,pieza:p});
});

function cambio(ultima){
  if(ultima) S.nueva=ultima.id;
  render();
  const R=S.reto;
  if(!R || S.resuelto) return;
  if(ultima && R.alColocar && !ultima.locked && R.alColocar(ultima)) return;
  if(R.progreso) pintarInstruccion();
  if(R.check()){
    S.resuelto=true;
    if(R.pregunta) setTimeout(mostrarPregunta,450);
    else exito();
  }
}

/* ===================== GENERADORES DE RETOS ===================== */
const GEN = {
  colores(){
    const v=rnd(1,10);
    return { texto:`Pon en la mesa la regleta ${nm(v)}`, ocultarNumeros:true,
      pista:`Busca abajo la regleta de color ${color(v)}.`,
      alColocar(p){ if(p.v!==v){ toast(`Esa es la ${color(p.v)}. ¡Busca la ${color(v)}!`); sonido('error'); setTimeout(()=>{quitar(p.id);render();},900); return true; } return false; },
      check:()=>libres().some(p=>p.v===v) };
  },
  descompone(cfg){
    const N = cfg.N || (cfg.nivel===1 ? rnd(3,10) : rnd(5,10)), min = cfg.nivel>=2 ? 3 : 2, r0=S.ROWS-1;
    return { texto:`Tapa la regleta ${nm(N)} con <b>${min} o más</b> regletas más pequeñas. Ponlas justo encima.`,
      setup(){ fija(N,0,r0); },
      pista:`El tren de arriba tiene que acabar justo donde acaba la ${color(N)}. Fíjate en la cuadrícula.`,
      check(){ const c=cubre(r0-1,0,N); return !!c && c.length>=min; } };
  },
  completa(cfg){
    const A = cfg.amigos ? 10 : (cfg.N || (cfg.nivel===1 ? rnd(4,10) : rnd(6,10))), B=rnd(1,A-1), r0=S.ROWS-1;
    const texto = cfg.amigos
      ? `Amigos del 10: ¿qué regleta, junto a la ${nm(B)}, mide igual que la ${nm(10)}?`
      : `El tren de arriba no llega. Pon la regleta que falta para que mida igual que la ${nm(A)}.`;
    return { texto, setup(){ fija(A,0,r0); fija(B,0,r0-1); },
      pista:`Cuenta los cuadraditos vacíos que hay encima de la ${color(A)}.`,
      check:()=>!!cubre(r0-1,B,A-B),
      pregunta: (cfg.nivel>=2||cfg.amigos) ? {texto:`${B} + ¿? = ${A}`, ok:A-B} : null };
  },
  dobles(cfg){
    const max=Math.min(cfg.nivel===1?10:20, S.COLS);
    const N=2*rnd(2,Math.floor(max/2));
    return { texto:`Haz el <b>${N}</b> con <b>dos regletas iguales</b>, una detrás de otra.`,
      pista:`Dos regletas del mismo color. El tren tiene que llegar al ${N} de la regla.`,
      check:()=>trenes(true).some(t=>t.ps.length===2&&t.len===N&&t.ps[0].v===t.ps[1].v),
      pregunta: cfg.nivel>=2 ? {texto:`¿Cuál es la mitad de ${N}?`, ok:N/2} : null };
  },
  tren(cfg){
    let N,k;
    if(cfg.N){ N=Math.min(cfg.N,S.COLS); k=N>10?rnd(2,3):2; }
    else if(cfg.nivel===1){ N=rnd(4,10); k=2; }
    else { k=rnd(2,3); N=rnd(11,Math.min(20,S.COLS)); }
    return { texto:`Haz un tren que mida <b>${N}</b> con <b>${k} regletas</b>.`,
      pista: N>10 ? `Empieza con la naranja (10) en la primera casilla. ¿Cuánto falta hasta el ${N}?` : `Empieza en la primera casilla: el tren tiene que acabar en el ${N} de la regla.`,
      check:()=>trenes(true).some(t=>t.ps.length===k&&t.len===N) };
  },
  veces(cfg){
    const a=(cfg&&cfg.N)||rnd(2,5); let k=rnd(2,4); while(a*k>S.COLS) k--;
    return { texto:`Haz un tren con <b>${k}</b> regletas ${nm(a)}.`,
      pista:'Ponlas una detrás de otra, sin dejar huecos.',
      check:()=>trenes(true).some(t=>t.ps.length===k&&t.ps.every(p=>p.v===a)),
      pregunta:{texto:`${k} veces ${a} son…`, ok:a*k} };
  },
  rectangulo(){
    const a=rnd(2,6), k=rnd(2,Math.min(4,S.ROWS-1));
    return { texto:`Construye un rectángulo: <b>${k}</b> regletas ${nm(a)} una debajo de otra.`,
      pista:'Todas empezando en la misma columna, en filas seguidas.',
      check(){ const ps=libres().filter(p=>!p.vert&&p.v===a);
        return ps.some(p=>{ for(let i=1;i<k;i++) if(!ps.some(q=>q.c===p.c&&q.r===p.r+i)) return false; return true; }); },
      pregunta:{texto:`¿Cuántos cuadraditos tiene el rectángulo? (${k} × ${a})`, ok:a*k} };
  },
  caben(){
    const [N,d]=[[4,2],[6,2],[6,3],[8,2],[8,4],[9,3],[10,2],[10,5]][rnd(0,7)], r0=S.ROWS-1;
    return { texto:`¿Cuántas regletas ${nm(d)} caben en la ${nm(N)}? Ponlas encima para averiguarlo.`,
      setup(){ fija(N,0,r0); },
      pista:`Pon ${color(d)}s encima de la ${color(N)} hasta llegar justo al final.`,
      check(){ const c=cubre(r0-1,0,N); return !!c && c.every(p=>p.v===d); },
      pregunta:{texto:`${N} : ${d} = ¿? (¿cuántas caben?)`, ok:N/d} };
  },
  escalera(cfg){
    const k=Math.min(cfg.nivel===1?5:10, S.ROWS);
    return { texto:`Haz una escalera: regletas del <b>1 al ${k}</b>, una debajo de otra y empezando en la misma columna.`,
      pista:'Empieza por la blanca (1); debajo la roja (2), luego la verde clara (3)…',
      check(){ const ps=libres().filter(p=>!p.vert);
        return ps.filter(p=>p.v===1).some(p=>[1,-1].some(d=>{
          for(let i=2;i<=k;i++) if(!ps.some(q=>q.v===i&&q.c===p.c&&q.r===p.r+d*(i-1))) return false; return true; })); } };
  },
  escondida(){
    const k=Math.min(10,S.ROWS), m=rnd(1,k), r0=S.ROWS-k;
    return { texto:'¡Se ha escondido una regleta de la escalera! Ponla en su hueco.',
      setup(){ for(let i=1;i<=k;i++) if(i!==m) fija(i,0,r0+i-1); },
      pista:'Mira la regleta de arriba y la de abajo del hueco: es una más que la de arriba.',
      check:()=>libres().some(p=>!p.vert&&p.v===m&&p.c===0&&p.r===r0+m-1) };
  },
  alfombra(cfg){
    const N=(cfg&&cfg.N&&cfg.N<=2*(S.ROWS-1)+1)?cfg.N:rnd(5,Math.min(10,2*(S.ROWS-1)+1)), total=Math.floor(N/2), r0=S.ROWS-1;
    const cuenta=()=>new Set(trenes(true).filter(t=>!t.vert&&t.ps.length===2&&t.len===N)
      .map(t=>Math.min(t.ps[0].v,t.ps[1].v)+'-'+Math.max(t.ps[0].v,t.ps[1].v))).size;
    return { texto:`La alfombra del <b>${N}</b>: encima de la ${nm(N)} haz <b>todos</b> los trenes de 2 regletas que midan lo mismo.`,
      setup(){ fija(N,0,r0); },
      progreso:()=>` <b>(${cuenta()} de ${total})</b>`,
      pista:`Prueba 1 + ${N-1}, luego 2 + ${N-2}… (2 + 3 y 3 + 2 cuentan como la misma pareja)`,
      check:()=>cuenta()>=total };
  }
};

const NIVELES = {
  1:{titulo:'Nivel 1', gens:[{g:'colores'},{g:'descompone'},{g:'completa'},{g:'dobles'},{g:'tren'},{g:'completa',amigos:true}]},
  2:{titulo:'Nivel 2', gens:[{g:'tren'},{g:'descompone'},{g:'completa'},{g:'dobles'},{g:'completa',amigos:true}]},
  3:{titulo:'Nivel 3', gens:[{g:'veces'},{g:'rectangulo'},{g:'caben'},{g:'descompone'},{g:'tren'}]}
};

const OAOA = [
  {em:'🎨',t:'Conocemos las regletas',k:'Conocemos',c:'Inf. 5 años · 1.º',f:'Concreta',
   p:'Juego libre sin números: construir casas, trenes, ordenar de la más corta a la más larga. Preguntar: ¿cuál es la más larga? ¿cuántas blancas caben en la roja?',
   a:{libre:true}},
  {em:'🪜',t:'La escalera',k:'La escalera',c:'Inf. 5 años · 1.º',f:'Concreta → pictórica',
   p:'Ordenar las regletas del 1 al 10 formando una escalera. Después la dibujan en papel cuadriculado.',
   a:{gens:[{g:'escalera'}],total:2,nivel:1}},
  {em:'🙈',t:'¿Quién se ha escondido?',k:'¿Quién falta?',c:'Inf. 5 años · 1.º',f:'Concreta',
   p:'Con la escalera hecha, el alumnado cierra los ojos y se quita una regleta. ¿Cuál falta? Trabaja el orden y el «uno más».',
   a:{gens:[{g:'escondida'}],total:5,nivel:1}},
  {em:'🌈',t:'¿De qué color es?',k:'Colores',c:'Inf. 5 años · 1.º',f:'Concreta',
   p:'Asociar color y cantidad: «busca la amarilla», y luego al revés, «busca el 5». Sin números a la vista.',
   a:{gens:[{g:'colores'}],total:6,nivel:1}},
  {em:'🚂',t:'Los trenes del número',k:'Trenes',c:'1.º · 2.º',f:'Concreta → abstracta',
   p:'Descomponer: tapar una regleta con otras más pequeñas y escribirlo (5 = 2 + 3). Buscar varias formas.',
   a:{gens:[{g:'descompone'}],total:5,nivel:1}},
  {em:'🧶',t:'La alfombra del número',k:'La alfombra',c:'1.º · 2.º',f:'Pictórica',
   p:'Todas las parejas que forman un número, una encima de otra. Se ve la simetría: 2 + 3 y 3 + 2.',
   a:{gens:[{g:'alfombra'}],total:2,nivel:1}},
  {em:'🤝',t:'Los amigos del 10',k:'Amigos del 10',c:'1.º · 2.º',f:'Concreta → abstracta',
   p:'Parejas que forman la naranja (1+9, 2+8…). Base del cálculo mental y de pasar la decena.',
   a:{gens:[{g:'completa',amigos:true}],total:6,nivel:1}},
  {em:'👯',t:'Dobles y mitades',k:'Dobles',c:'1.º · 3.º',f:'Concreta → abstracta',
   p:'Dos regletas iguales forman el doble; partir una regleta en dos iguales es buscar la mitad.',
   a:{gens:[{g:'dobles'}],total:5,nivel:2}},
  {em:'📏',t:'¿Cuánto falta?',k:'¿Cuánto falta?',c:'1.º · 3.º',f:'Pictórica',
   p:'Comparar dos regletas y buscar la que completa: la resta como diferencia (8 − 3 = 5).',
   a:{gens:[{g:'completa'}],total:5,nivel:2}},
  {em:'🔟',t:'Pasar la decena',k:'Pasar del 10',c:'2.º',f:'Pictórica → abstracta',
   p:'Trenes mayores que 10 empezando por la naranja: 13 = 10 + 3. Se mide con la regla de arriba.',
   a:{gens:[{g:'tren'}],total:5,nivel:2}},
  {em:'✖️',t:'Trenes iguales (multiplicar)',k:'Multiplicar',c:'2.º · 3.º',f:'Concreta → abstracta',
   p:'Repetir la misma regleta: 3 veces la verde clara mide 9. La multiplicación como suma repetida.',
   a:{gens:[{g:'veces'}],total:5,nivel:3}},
  {em:'🟪',t:'Rectángulos',k:'Rectángulos',c:'2.º · 3.º',f:'Pictórica',
   p:'Regletas iguales una debajo de otra y contar cuadraditos: la multiplicación como área.',
   a:{gens:[{g:'rectangulo'}],total:5,nivel:3}},
  {em:'🍰',t:'¿Cuántas caben? (repartir)',k:'Repartir',c:'2.º · 3.º',f:'Concreta → abstracta',
   p:'¿Cuántas regletas pequeñas caben en una grande? La división como medida.',
   a:{gens:[{g:'caben'}],total:5,nivel:3}}
];

/* ===================== MOTOR DE RONDAS ===================== */
function nuevaRonda(titulo,gens,total,nivel,parada){
  entrar();
  S.ronda={titulo,gens,total,nivel,idx:0,saltados:0,ultimo:null,parada:parada==null?null:parada};
  S.modo=parada==null?'clase':'mapa'; marcarModo();
  siguienteReto();
}
function siguienteReto(){
  const R=S.ronda; if(!R) return;
  if(R.idx>=R.total) return finRonda();
  R.idx++;
  let spec=R.gens[rnd(0,R.gens.length-1)];
  if(R.gens.length>1) while(spec===R.ultimo) spec=R.gens[rnd(0,R.gens.length-1)];
  R.ultimo=spec;
  prepararReto(spec,true);
}
function prepararReto(spec){
  S.retoSpec=spec; S.piezas=[]; S.sel=null; S.resuelto=false;
  S.reto=GEN[spec.g]({nivel:S.ronda.nivel,...spec});
  if(S.reto.setup) S.reto.setup();
  pintarInstruccion(); render();
}
function pintarInstruccion(){
  const R=S.reto, ro=S.ronda;
  $('#opciones').innerHTML='';
  $('#instrTexto').innerHTML=R.texto+(R.progreso?R.progreso():'');
  $('#progreso').hidden=false; $('#accionesReto').hidden=false;
  $('#progresoTxt').textContent=`${ro.titulo} · Reto ${ro.idx} de ${ro.total}`;
  $('#progresoBar').style.width=((ro.idx-1)/ro.total*100)+'%';
  $('#btnDado').hidden=true; regli('');
  if(S.dicho!==R){ S.dicho=R; hablar(R.texto); }
}
function mostrarPregunta(){
  const q=S.reto.pregunta;
  $('#instrTexto').innerHTML=`¡Bien colocado! Ahora dime: <b>${q.texto}</b>`;
  regli('piensa'); hablar('¡Bien colocado! Ahora dime: '+q.texto);
  const s=new Set([q.ok]), deltas=[1,-1,2,-2,3,-3,10];
  while(s.size<4){ const v=q.ok+deltas[rnd(0,deltas.length-1)]; if(v>=0) s.add(v); }
  const ops=$('#opciones'); ops.innerHTML='';
  [...s].sort(()=>Math.random()-.5).forEach(v=>{
    const b=document.createElement('button'); b.className='opcion'; b.textContent=v;
    b.onclick=()=>{
      if(v===q.ok){ ops.innerHTML=''; exito(); }
      else { b.classList.add('mal'); S.racha=0; actualizarStats(); sonido('error'); regli('ups',900); toast('Cuenta los cuadraditos en la cuadrícula 👀'); }
    };
    ops.appendChild(b);
  });
  sonido('clic');
}
function exito(){
  S.racha++; S.puntos += 10 + Math.min(S.racha,5)*2;
  actualizarStats(); guardar(); sonido('exito'); confeti(); regli('feliz',1700);
  toast(['¡Muy bien!','¡Genial!','¡Eso es!','¡Fenomenal!','¡Bravo!'][rnd(0,4)]+(S.racha>=3?` 🔥 ${S.racha} seguidos`:''),true,1600);
  $('#progresoBar').style.width=(S.ronda.idx/S.ronda.total*100)+'%';
  setTimeout(siguienteReto,1800);
}
function finRonda(){
  const sal=S.ronda.saltados, est=sal===0?3:sal<=2?2:1;
  S.puntos+=est*10; actualizarStats(); sonido('victoria'); confeti(); regli('feliz');
  const ro=S.ronda, pa=ro.parada;
  if(pa!=null) S.estrellas[pa]=Math.max(S.estrellas[pa]||0,est);
  guardar();
  const hayMas=pa!=null && pa<OAOA.length-1;
  modal(`<div class="fin-regli">${regliSVG('feliz')}</div><h2 style="text-align:center">¡${pa!=null?'Parada superada':'Ronda terminada'}!</h2>
    <div class="estrellas">${'⭐'.repeat(est)}${'☆'.repeat(3-est)}</div>
    <p style="text-align:center">${sal?`Has saltado ${sal} reto${sal>1?'s':''}. ¡Repite para conseguir las tres estrellas!`:'¡Sin saltarte ninguno!'}</p>
    <div class="botones">${hayMas?'<button class="btn-modal" id="mSig">▶ Siguiente parada</button>':''}
      <button class="btn-modal sec" id="mOtra">🔁 Repetir</button><button class="btn-modal sec" id="mMapa">🗺️ Mapa</button></div>`, true);
  hablar(pa!=null?'¡Parada superada!':'¡Ronda terminada!');
  if(hayMas) $('#mSig').onclick=()=>{ cerrarModal(); jugarParada(pa+1); };
  $('#mOtra').onclick=()=>{ cerrarModal(); nuevaRonda(ro.titulo,ro.gens,ro.total,ro.nivel,pa); };
  $('#mMapa').onclick=()=>{ cerrarModal(); irMapa(); };
  S.reto=null;
}

/* ===================== MODOS ===================== */
function marcarModo(){ document.querySelectorAll('.btn-modo').forEach(b=>b.classList.toggle('activo',b.dataset.modo===S.modo)); }
function modoLibre(sinNumeros,parada){
  entrar();
  S.modo=parada!=null?'mapa':'libre'; S.ronda=null; S.reto=null; S.retoSpec=null; S.resuelto=false;
  S.piezas=S.piezas.filter(p=>!p.locked); S.sel=null;
  if(sinNumeros){ S.ver.num=false; pintarToggles(); }
  marcarModo();
  $('#progreso').hidden=true; $('#accionesReto').hidden=true; $('#opciones').innerHTML='';
  $('#instrTexto').innerHTML = sinNumeros
    ? '🎨 <b>Conocemos las regletas</b>: construye lo que quieras y ordénalas de la más corta a la más larga.'
    : `🎈 <b>Mesa libre</b>: arrastra regletas a la cuadrícula. Toca dos veces una regleta para girarla; arrástrala fuera para quitarla.`;
  $('#btnDado').hidden=false; regli('');
  if(parada!=null){
    // Parada sin retos: se da por visitada al entrar
    S.estrellas[parada]=3; guardar();
    $('#opciones').innerHTML='<button class="opcion" id="btnHecho">✔ Ya he jugado</button>';
    $('#btnHecho').onclick=()=>{ sonido('exito'); confeti(); irMapa(); };
  }
  hablar($('#instrTexto').innerHTML);
  render();
}
/* ---------- Entrar y salir de la mesa ---------- */
function entrar(){
  if(!$('#app').hidden) return;
  ac(); $('#inicio').hidden=true; $('#app').hidden=false;
  $('#btnSonido').textContent=S.sonido?'🔊':'🔇'; $('#btnVoz').classList.toggle('off',!S.voz);
  pintarToggles(); actualizarStats(); layout();
}
function irMapa(){
  callar(); S.ronda=null; S.reto=null; S.retoSpec=null; S.piezas=[]; S.sel=null;
  $('#app').hidden=true; $('#inicio').hidden=false; pintarMapa();
}
const abierta = i => S.todo || i===0 || (S.estrellas[i-1]||0)>0 || (S.estrellas[i]||0)>0;
function jugarParada(i){
  const j=OAOA[i];
  if(j.a.libre) modoLibre(true,i); else nuevaRonda(j.t,j.a.gens,j.a.total,j.a.nivel,i);
}

/* ---------- El mapa: trece paradas en un camino ---------- */
function pintarMapa(){
  const m=$('#mapa'), n=OAOA.length, vertical=window.innerWidth<700 && window.innerHeight>window.innerWidth;
  const pts=[];
  if(vertical){ // serpiente de tres en tres, de arriba abajo
    const filas=Math.ceil(n/3);
    for(let i=0;i<n;i++){ const f=Math.floor(i/3), k=i%3, x=[18,50,82][f%2?2-k:k]; pts.push([x, 8+f*(84/(filas-1))]); }
    m.style.aspectRatio='10 / 16';
  }else{ // tres filas en zigzag
    const filas=[5,4,4]; let i=0;
    filas.forEach((c,f)=>{ for(let k=0;k<c;k++){ const t=c===5?10+k*20:14+k*24; pts.push([f%2?100-t:t, 17+f*31]); i++; } });
    m.style.aspectRatio='16 / 8.4';
  }
  const W=1000, H=vertical?1600:525, P=pts.map(([x,y])=>[x/100*W,y/100*H]);
  let d='M'+P[0][0]+' '+P[0][1];
  for(let i=1;i<P.length;i++){ const a=P[i-1], b=P[i], mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
    d+= Math.abs(a[1]-b[1])<1 ? ` L${b[0]} ${b[1]}` : ` Q${a[0]+(vertical?0:(a[0]>W/2?90:-90))} ${my} ${b[0]} ${b[1]}`; }
  const total=Object.values(S.estrellas).reduce((s,v)=>s+v,0);
  const sig=OAOA.findIndex((_,i)=>abierta(i)&&!(S.estrellas[i]>0));
  m.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${d}" fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="#f3c98b" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="4 18" stroke-linecap="round"/></svg>`+
    OAOA.map((j,i)=>{ const e=S.estrellas[i]||0, ok=abierta(i), col=REG[(i%10)+1];
      return `<button class="parada${ok?'':' cerrada'}${i===sig?' siguiente':''}${e?' hecha':''}" data-i="${i}" style="left:${pts[i][0]}%;top:${pts[i][1]}%;--col:${col.c};--txt:${col.t}" aria-label="Parada ${i+1}: ${j.t}${ok?'':' (cerrada)'}">
        <span class="bola"><span class="num">${i+1}</span><span class="em">${ok?j.em:'🔒'}</span></span>
        <span class="nom">${j.k}</span><span class="est">${'★'.repeat(e)}<i>${'★'.repeat(3-e)}</i></span></button>`; }).join('');
  m.querySelectorAll('.parada').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i; ac();
    if(!abierta(i)){ sonido('error'); b.classList.add('no'); setTimeout(()=>b.classList.remove('no'),400);
      saludo('Esa parada todavía está cerrada. ¡Supera antes la anterior!','ups'); return; }
    sonido('clic'); jugarParada(i);
  });
  $('#mapaEstrellas').textContent=total+' / '+n*3;
  saludo(total===0 ? '¡Hola! Soy <b>Regli</b>. Toca la <b>parada 1</b> y empezamos el viaje.'
    : total>=n*3 ? '¡Tienes <b>todas</b> las estrellas! Eres un genio de las regletas.'
    : sig>=0 ? `¡Seguimos! Te espera la <b>parada ${sig+1}</b>: ${OAOA[sig].t}.` : 'Repite las paradas para conseguir las tres estrellas en todas.', total>=n*3?'feliz':'');
}
function saludo(html,animo){ $('#saludoMapa').innerHTML=html; $('#regliMapa').innerHTML=regliSVG(animo||''); $('#regliMapa').className='regli '+(animo||''); }

/* ---------- Para la clase: ideas, retos a medida y ajustes ---------- */
const MEDIDA = [
  {id:'descompone', t:'Descomponer un número', d:'Tapar la regleta con otras más pequeñas', min:3, max:10},
  {id:'alfombra',   t:'La alfombra de un número', d:'Todas las parejas que lo forman', min:5, max:10},
  {id:'completa',   t:'¿Cuánto falta hasta…?', d:'La resta como diferencia', min:4, max:10},
  {id:'tren',       t:'Trenes que miden…', d:'Sumas hasta el 20', min:4, max:20},
  {id:'veces',      t:'La tabla del…', d:'Repetir la misma regleta', min:2, max:5}
];
function panelClase(pest){
  pest=pest||'ideas';
  const cab=`<h2>👩‍🏫 Para la clase</h2><div class="pestanas-clase">
    <button data-p="ideas" class="${pest==='ideas'?'on':''}">Ideas para el aula</button>
    <button data-p="medida" class="${pest==='medida'?'on':''}">Reto a medida</button>
    <button data-p="ajustes" class="${pest==='ajustes'?'on':''}">Ajustes</button></div>`;
  let cuerpo='';
  if(pest==='ideas'){
    cuerpo=`<p class="oaoa-intro"><b>OAOA</b>: primero con <b>regletas de verdad</b> (fase concreta), después en la <b>pantalla o dibujado en cuadrícula</b> (pictórica) y al final con <b>números</b> (abstracta). Cada juego trae una idea para la clase y su versión para jugar aquí.</p>
    <div class="juegos">${OAOA.map((j,i)=>`<div class="juego"><h3>${j.em} ${j.t}</h3>
      <div class="meta"><span class="tag">${j.c}</span><span class="tag fase">${j.f}</span></div>
      <p>${j.p}</p><button data-i="${i}">▶ Jugar</button></div>`).join('')}</div>`;
  }else if(pest==='medida'){
    cuerpo=`<p>Elige qué quieres trabajar hoy y con qué número. Sirve para la pizarra digital o para un alumno concreto.</p>
    <div class="medida">
      <label>¿Qué trabajamos?<select id="mdTipo">${MEDIDA.map(m=>`<option value="${m.id}">${m.t} · ${m.d}</option>`).join('')}</select></label>
      <label>Número<div class="nums" id="mdNums"></div></label>
      <label>¿Cuántos retos?<div class="nums" id="mdTotal">${[3,5,8].map(n=>`<button data-n="${n}" class="${n===5?'on':''}">${n}</button>`).join('')}</div></label>
      <button class="btn-modal" id="mdIr">▶ Empezar</button>
    </div>
    <h3 class="sub">Rondas mezcladas</h3>
    <div class="niveles">
      <button class="nivel" data-n="1"><span class="em">🌱</span><span><b>Nivel 1 · hasta 10</b>Infantil 5 años y 1.º: colores, trenes, amigos del 10…</span></button>
      <button class="nivel" data-n="2"><span class="em">🌿</span><span><b>Nivel 2 · hasta 20</b>1.º y 2.º: pasar la decena, dobles y mitades, restas</span></button>
      <button class="nivel" data-n="3"><span class="em">🌳</span><span><b>Nivel 3 · multiplicar y repartir</b>2.º y 3.º: trenes iguales, rectángulos, ¿cuántas caben?</span></button>
    </div>`;
  }else{
    const total=Object.values(S.estrellas).reduce((s,v)=>s+v,0);
    cuerpo=`<div class="ajustes">
      <label class="interruptor"><input type="checkbox" id="ajTodo" ${S.todo?'checked':''}><span><b>Abrir todas las paradas</b>Para elegir cualquier juego sin seguir el orden del mapa.</span></label>
      <label class="interruptor"><input type="checkbox" id="ajVoz" ${S.voz?'checked':''}><span><b>Regli lee los retos en voz alta</b>Útil para quien todavía no lee. El altavoz 🔈 de cada reto funciona siempre.</span></label>
      <label class="interruptor"><input type="checkbox" id="ajSon" ${S.sonido?'checked':''}><span><b>Sonidos del juego</b>Clics, aciertos y fallos.</span></label>
      <p>Este dispositivo lleva <b>${total}</b> estrellas de ${OAOA.length*3} y <b>${S.puntos}</b> puntos.</p>
      <button class="btn-modal sec" id="ajBorrar">🧽 Empezar de cero (otro alumno)</button>
    </div>`;
  }
  modal(cab+cuerpo+`<div class="botones"><button class="btn-modal sec" id="mCerrar">Cerrar</button></div>`);
  $('#mCerrar').onclick=cerrarModal;
  document.querySelectorAll('.pestanas-clase button').forEach(b=>b.onclick=()=>panelClase(b.dataset.p));
  if(pest==='ideas'){
    document.querySelectorAll('.juego button').forEach(b=>b.onclick=()=>{ cerrarModal(); const i=+b.dataset.i, j=OAOA[i];
      if(j.a.libre) modoLibre(true); else nuevaRonda(j.t,j.a.gens,j.a.total,j.a.nivel); });
  }else if(pest==='medida'){
    let num=null, tot=5;
    const pintarNums=()=>{ const m=MEDIDA.find(x=>x.id===$('#mdTipo').value); if(num==null||num<m.min||num>m.max) num=Math.min(m.max,Math.max(m.min,m.id==='veces'?2:m.id==='tren'?12:8));
      $('#mdNums').innerHTML=Array.from({length:m.max-m.min+1},(_,k)=>m.min+k).map(n=>`<button data-n="${n}" class="${n===num?'on':''}">${n}</button>`).join('');
      $('#mdNums').querySelectorAll('button').forEach(b=>b.onclick=()=>{ num=+b.dataset.n; pintarNums(); }); };
    $('#mdTipo').onchange=pintarNums; pintarNums();
    $('#mdTotal').querySelectorAll('button').forEach(b=>b.onclick=()=>{ tot=+b.dataset.n; $('#mdTotal').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); });
    $('#mdIr').onclick=()=>{ const m=MEDIDA.find(x=>x.id===$('#mdTipo').value); cerrarModal();
      nuevaRonda({descompone:'Descomponer el ',alfombra:'La alfombra del ',completa:'¿Cuánto falta hasta el ',tren:'Trenes que miden ',veces:'La tabla del '}[m.id]+num+(m.id==='completa'?'?':''), [{g:m.id,N:num}], m.id==='alfombra'?Math.min(tot,2):tot, m.id==='veces'?3:num>10?2:1); };
    document.querySelectorAll('.nivel').forEach(b=>b.onclick=()=>{ cerrarModal(); const n=+b.dataset.n; nuevaRonda(NIVELES[n].titulo,NIVELES[n].gens,10,n); });
  }else{
    $('#ajTodo').onchange=e=>{ S.todo=e.target.checked; guardar(); if(!$('#inicio').hidden) pintarMapa(); };
    $('#ajVoz').onchange=e=>{ S.voz=e.target.checked; guardar(); $('#btnVoz').classList.toggle('off',!S.voz); if(!S.voz) callar(); };
    $('#ajSon').onchange=e=>{ S.sonido=e.target.checked; guardar(); $('#btnSonido').textContent=S.sonido?'🔊':'🔇'; };
    $('#ajBorrar').onclick=()=>{ if(!confirm('¿Borrar las estrellas y los puntos de este dispositivo?')) return;
      S.estrellas={}; S.puntos=0; S.racha=0; guardar(); actualizarStats(); cerrarModal(); if(!$('#inicio').hidden) pintarMapa(); };
  }
}

/* ===================== CONTROLES ===================== */
document.querySelectorAll('.btn-modo').forEach(b=>b.onclick=()=>{
  const m=b.dataset.modo;
  if(m==='libre') modoLibre(); else if(m==='mapa') irMapa(); else panelClase();
});
$('#btnMapaLibre').onclick=()=>modoLibre();
$('#btnMapaClase').onclick=()=>panelClase();
$('#btnVoz').onclick=()=>{ S.voz=!S.voz; guardar(); $('#btnVoz').classList.toggle('off',!S.voz); if(S.voz) decir($('#instrTexto').innerHTML); else callar(); toast(S.voz?'Regli lee los retos en voz alta':'Regli ya no lee en voz alta'); };
$('#btnLeer').onclick=()=>decir($('#instrTexto').innerHTML);
$('#btnDado').onclick=()=>{ const v=rnd(1,10); colocarAuto(v); regli('feliz',700); if(S.voz) decir('La regleta '+color(v)); };
$('#btnSonido').onclick=()=>{ S.sonido=!S.sonido; $('#btnSonido').textContent=S.sonido?'🔊':'🔇'; guardar(); if(S.sonido) sonido('clic'); };
$('#btnGirar').onclick=()=>girar(pieza(S.sel));
$('#btnQuitar').onclick=()=>{ if(S.sel){ quitar(S.sel); sonido('quitar'); cambio(); } };
$('#btnBorrar').onclick=()=>{ S.piezas=S.piezas.filter(p=>p.locked); S.sel=null; sonido('quitar'); cambio(); };
$('#btnPista').onclick=()=>{ if(S.reto){ toast('💡 '+S.reto.pista,false,4000); regli('piensa',4000); hablar(S.reto.pista); } };
$('#btnReiniciar').onclick=()=>{ if(S.retoSpec){ S.piezas=S.piezas.filter(p=>p.locked); S.sel=null; S.resuelto=false; pintarInstruccion(); render(); } };
$('#btnSaltar').onclick=()=>{ if(S.ronda){ S.ronda.saltados++; S.racha=0; actualizarStats(); siguienteReto(); } };
function pintarToggles(){ document.querySelectorAll('.btn-toggle').forEach(b=>b.classList.toggle('on',S.ver[b.dataset.ver])); }
document.querySelectorAll('.btn-toggle').forEach(b=>b.onclick=()=>{ const k=b.dataset.ver; S.ver[k]=!S.ver[k]; pintarToggles(); guardar(); render(); });
document.addEventListener('keydown',e=>{
  if(!S.sel || e.target.tagName==='INPUT') return;
  if(e.key==='r'||e.key==='R'||e.key===' ') { e.preventDefault(); girar(pieza(S.sel)); }
  if(e.key==='Delete'||e.key==='Backspace'){ quitar(S.sel); cambio(); }
});
let rzT; const relayout=()=>{ clearTimeout(rzT); rzT=setTimeout(()=>{ if(!$('#app').hidden) layout(); else pintarMapa(); },120); };
window.addEventListener('resize',relayout);
// Si cambia el hueco del tablero (texto de instrucciones más largo, paleta…), se recoloca
let tamWrap=''; if(window.ResizeObserver) new ResizeObserver(()=>{ const w=$('#tableroWrap'), t=w.clientWidth+'x'+w.clientHeight; if(t!==tamWrap){ tamWrap=t; relayout(); } }).observe($('#tableroWrap'));

/* ===================== INICIO ===================== */
cargar();
pintarMapa();
if('speechSynthesis' in window){ try{ speechSynthesis.getVoices(); }catch(e){} }

/* Aviso de novedades: una sola vez por dispositivo */
try{
  if(!localStorage.getItem(AVISO_KEY)){
    modal(`<h2>🆕 Novedad</h2><p>${AVISO_TXT}</p><div class="botones"><button class="btn-modal" id="mVale">¡Vale!</button></div>`, true);
    $('#mVale').onclick=()=>{ try{localStorage.setItem(AVISO_KEY,'1');}catch(e){} cerrarModal(); };
    localStorage.setItem(AVISO_KEY,'1');
  }
}catch(e){}

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
