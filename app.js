// ═══════════════════════════════════════════════
//  MEM by NON — Middle Eastern Monitor
//  Dense war room · Live GPD data · 12 sources
// ═══════════════════════════════════════════════

const API = 'https://dngws-monitor.vercel.app/api';
const WAR = new Date('2026-02-28T00:00:00Z');

// ── CLOCK ──────────────────────────────────────
function tick() {
  const n = new Date();
  document.getElementById('clk').textContent = n.getUTCHours().toString().padStart(2,'0') + ':' + n.getUTCMinutes().toString().padStart(2,'0');
  document.getElementById('dayN').textContent = Math.floor((n - WAR) / 864e5);
}
setInterval(tick, 1000); tick();

// ── MAP ────────────────────────────────────────
const map = L.map('map', { center:[29,48], zoom:5, zoomControl:false, attributionControl:false });
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:18 }).addTo(map);

// Zones
[
  {n:'Gaza',c:[[31.2,34.2],[31.6,34.2],[31.6,34.6],[31.2,34.6]],col:'#ef4444'},
  {n:'West Bank',c:[[31.3,34.9],[32.6,34.9],[32.6,35.6],[31.3,35.6]],col:'#f97316'},
  {n:'South Lebanon',c:[[33.0,35.1],[33.6,35.1],[33.6,36.0],[33.0,36.0]],col:'#f97316'},
  {n:'NW Syria',c:[[35.5,36.0],[37.0,36.0],[37.0,37.5],[35.5,37.5]],col:'#f59e0b'},
  {n:'Yemen (Houthi)',c:[[13.0,42.0],[16.0,42.0],[16.0,47.0],[13.0,47.0]],col:'#f59e0b'},
  {n:'NE Iraq / PMU',c:[[33.5,42.0],[35.5,42.0],[35.5,45.0],[33.5,45.0]],col:'#f59e0b'},
  {n:'Hormuz Strait',c:[[26.0,55.5],[27.0,55.5],[27.0,57.0],[26.0,57.0]],col:'#3b82f6'},
].forEach(z => L.polygon(z.c,{color:z.col,fillColor:z.col,fillOpacity:.05,weight:1.5,opacity:.35,dashArray:'8,6'}).addTo(map).bindTooltip(z.n,{className:'zone-tooltip',sticky:true}));

// Nuclear
const NUC=[
  {n:'Natanz',lat:33.72,lon:51.73,s:'x',t:'Enrichment — DESTROYED'},
  {n:'Fordow',lat:34.88,lon:51.59,s:'d',t:'Enrichment — DAMAGED'},
  {n:'Isfahan',lat:32.65,lon:51.68,s:'d',t:'Conversion — DAMAGED'},
  {n:'Arak',lat:34.38,lon:49.24,s:'i',t:'Heavy Water — INTACT'},
  {n:'Bushehr',lat:28.83,lon:50.89,s:'i',t:'Power Reactor — INTACT'},
];
const SC={x:'#ef4444',d:'#f59e0b',i:'#22c55e'};
NUC.forEach(s=>{
  const ic=L.divIcon({className:'',html:`<div class="mk-n" style="border-color:${SC[s.s]}50;background:${SC[s.s]}"></div>`,iconSize:[11,11],iconAnchor:[5,5]});
  L.marker([s.lat,s.lon],{icon:ic}).addTo(map).bindPopup(`<div class="pp-t" style="color:${SC[s.s]}">NUCLEAR</div><div class="pp-h">${s.n}</div><div class="pp-d">${s.t}</div>`);
});

// Supply routes
[
  [[32.4,53.7],[33.9,35.5],'#ef444450','Iran → Hezbollah'],
  [[32.4,53.7],[15.5,48.5],'#f9731650','Iran → Houthis'],
  [[32.4,53.7],[33.3,44.4],'#f59e0b50','Iran → PMU'],
].forEach(([f,t,c,l])=>{ try{L.polyline([f,t],{color:c,weight:1.5,dashArray:'10,8'}).addTo(map).bindTooltip(l);}catch{} });

// Zooms
document.getElementById('zME').onclick=()=>map.flyTo([29,48],5,{duration:1});
document.getElementById('zIR').onclick=()=>map.flyTo([33,52],6,{duration:1});
document.getElementById('zGZ').onclick=()=>map.flyTo([31.4,34.4],10,{duration:1});
document.getElementById('zYE').onclick=()=>map.flyTo([15,45],6,{duration:1});
document.getElementById('zHZ').onclick=()=>map.flyTo([26.5,56.3],8,{duration:1});

// ── API ────────────────────────────────────────
async function f(p){try{const r=await fetch(API+p);if(!r.ok)throw 0;return r.json();}catch{return null;}}

// ── ESCALATION ─────────────────────────────────
async function loadEsc(){
  const d=await f('/escalation'); if(!d)return;
  const pct=Math.min(d.score,100), circ=125.6;
  document.getElementById('escArc').style.strokeDashoffset=circ-(pct/100)*circ;
  document.getElementById('escN').textContent=Math.round(d.score);
  const c=d.level==='red'?'#ef4444':d.level==='amber'?'#f59e0b':'#22c55e';
  document.getElementById('escArc').style.stroke=c;
  document.getElementById('escN').style.color=c;
  document.getElementById('escLbl').textContent=d.label||'ESCALATION';
}

// ── ACLED ──────────────────────────────────────
let amk=[];
async function loadAcled(){
  const d=await f('/acled'); if(!d?.features?.length)return;
  amk.forEach(m=>map.removeLayer(m)); amk=[];
  let fat=0;
  const pane=document.getElementById('p-acled'); pane.innerHTML='';
  d.features.forEach(e=>{
    const p=e.properties, co=e.geometry?.coordinates; fat+=p.fatalities||0;
    const isS=(p.eventType||'').includes('Explosion'), isB=(p.eventType||'').includes('Battle'), isV=(p.eventType||'').includes('Violence');
    const cls=isS?'mk-s':isB?'mk-b':'mk-s', ccls=isS?'str':isB?'bat':isV?'vio':'';
    if(co){
      const ic=L.divIcon({className:'',html:`<div class="${cls}"></div>`,iconSize:[9,9],iconAnchor:[4,4]});
      amk.push(L.marker([co[1],co[0]],{icon:ic}).addTo(map)
        .bindPopup(`<div class="pp-t" style="color:${isS?'#ef4444':isB?'#f97316':'#3b82f6'}">${(p.eventType||'EVENT').toUpperCase()}</div>
          <div class="pp-h">${p.country||''} · ${p.admin1||''}</div>
          <div class="pp-d">${(p.notes||p.actor1||'').substring(0,100)}</div>
          <div class="pp-m">${p.fatalities?p.fatalities+' KIA · ':''}${p.eventDate||p.event_date||''}</div>`));
    }
    const c=document.createElement('div'); c.className='cd '+ccls;
    c.innerHTML=`<div class="cd-src"><span>${(p.eventType||'EVENT').replace('Explosions/Remote violence','Explosion').toUpperCase()}</span><span>${p.eventDate||p.event_date||''}</span></div>
      <div class="cd-hl">${p.country||''}${p.admin1?' · '+p.admin1:''}</div>
      <div class="cd-sub">${(p.notes||p.actor1||'').substring(0,80)}</div>
      <div class="cd-ft">${p.fatalities?`<span class="cd-kia">${p.fatalities} KIA</span>`:'<span></span>'}<span>${(p.actor1||'').substring(0,25)}</span></div>`;
    if(co) c.onclick=()=>map.flyTo([co[1],co[0]],9,{duration:.7});
    pane.appendChild(c);
  });
  document.getElementById('sEv').textContent=d.features.length;
  document.getElementById('sKia').textContent=fat.toLocaleString();
}

// ── FIRMS ──────────────────────────────────────
let fmk=[];
async function loadFirms(){
  const d=await f('/firms'); if(!d?.features?.length)return;
  fmk.forEach(m=>map.removeLayer(m)); fmk=[];
  d.features.forEach(e=>{
    const co=e.geometry?.coordinates; if(!co)return;
    fmk.push(L.marker([co[1],co[0]],{icon:L.divIcon({className:'',html:'<div class="mk-f"></div>',iconSize:[4,4],iconAnchor:[2,2]})}).addTo(map));
  });
  document.getElementById('sFi').textContent=d.features.length;
}

// ── MARKETS ────────────────────────────────────
async function loadMkt(){
  const d=await f('/markets'); if(!Array.isArray(d))return;
  // Ticker
  const tk=document.getElementById('tkTrack');
  const h=d.map(m=>{const c=parseFloat(m.change)||0;return`<span class="ti"><span class="ti-s">${m.symbol||m.name}</span><span class="ti-p">${m.price}</span><span class="${c>=0?'ti-u':'ti-d'}">${c>=0?'+':''}${c.toFixed(2)}%</span></span>`;}).join('');
  tk.innerHTML=h+h;
  // Panel
  const el=document.getElementById('rMkt');
  const show=d.filter(m=>{const n=(m.symbol||m.name||'').toLowerCase();return['wti','brent','gold','btc','s&p','eur','eth'].some(k=>n.includes(k));}).slice(0,8);
  if(!show.length)show.push(...d.slice(0,8));
  el.innerHTML=show.map(m=>{const c=parseFloat(m.change)||0;return`<div class="mr"><span class="mr-s">${m.symbol||m.name}</span><span class="mr-p">${m.price}</span><span class="mr-c ${c>=0?'mr-u':'mr-d'}">${c>=0?'+':''}${c.toFixed(2)}%</span></div>`;}).join('');
}

// ── NEWS ───────────────────────────────────────
const LOC={'gaza':[31.4,34.3],'west bank':[31.9,35.2],'israel':[31.5,34.9],'iran':[32.4,53.7],'tehran':[35.7,51.4],
  'iraq':[33.3,44.4],'syria':[34.8,38.9],'damascus':[33.5,36.3],'lebanon':[33.9,35.5],'beirut':[33.9,35.5],
  'yemen':[15.5,48.5],'hamas':[31.4,34.3],'hezbollah':[33.9,35.5],'houthi':[15.5,48.5],'hormuz':[26.5,56.3],'saudi':[23.9,45.1]};
function geo(t){const l=(t||'').toLowerCase();for(const[k,v]of Object.entries(LOC))if(l.includes(k))return v;return null;}
function ago(d){if(!d)return'';try{const m=Math.floor((Date.now()-new Date(d))/6e4);if(m<1)return'NOW';if(m<60)return m+'m';if(m<1440)return Math.floor(m/60)+'h';return new Date(d).toLocaleDateString();}catch{return'';}}

async function loadNews(){
  const d=await f('/ticker');
  const pane=document.getElementById('p-news');
  if(d&&Array.isArray(d)&&d.length){
    pane.innerHTML='';
    const brk=d.find(a=>(a.title||'').toLowerCase().match(/breaking|alert|urgent|just in/));
    if(brk)showBrk(brk.title);
    d.slice(0,35).forEach(a=>{
      const co=geo(a.title);
      const tags=(a.tags||[]).map(t=>`<span class="cd-tag">#${t}</span>`).join(' ');
      const c=document.createElement('div');c.className='cd';
      c.innerHTML=`<div class="cd-src"><span>${a.source||'OSINT'}</span><span>${ago(a.pubDate)}</span></div><div class="cd-hl">${a.title}</div><div class="cd-ft">${tags}</div>`;
      if(co)c.onclick=()=>map.flyTo(co,8,{duration:.7}); else if(a.link)c.onclick=()=>window.open(a.link,'_blank');
      pane.appendChild(c);
    });
    return;
  }
  // RSS fallback
  const PX='https://api.allorigins.win/get?url=';
  const r=await Promise.all([
    {url:'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',name:'BBC'},
    {url:'https://rss.aljazeera.com/rss/all.rss',name:'AL JAZEERA'}
  ].map(async fd=>{try{const r=await fetch(PX+encodeURIComponent(fd.url));const j=await r.json();const x=new DOMParser().parseFromString(j.contents,'text/xml');return Array.from(x.querySelectorAll('item')).map(i=>({title:i.querySelector('title')?.textContent||'',source:fd.name,pubDate:i.querySelector('pubDate')?.textContent||''}));}catch{return[];}}));
  pane.innerHTML='';
  r.flat().slice(0,25).forEach(a=>{const c=document.createElement('div');c.className='cd';c.innerHTML=`<div class="cd-src"><span>${a.source}</span><span>${ago(a.pubDate)}</span></div><div class="cd-hl">${a.title}</div>`;const co=geo(a.title);if(co)c.onclick=()=>map.flyTo(co,8,{duration:.7});pane.appendChild(c);});
}

// ── BREAKING ───────────────────────────────────
function showBrk(t){document.getElementById('brkTxt').textContent=t;document.getElementById('brk').style.display='flex';setTimeout(()=>{document.getElementById('brk').style.display='none';},25000);}
document.getElementById('brkX').onclick=()=>{document.getElementById('brk').style.display='none';};

// ── FRONTS ─────────────────────────────────────
async function loadFr(){
  const d=await f('/fronts');
  const el=document.getElementById('rFr');
  const fronts=d?.fronts?.length?d.fronts:[
    {name:'Iran Theater',status:'CRITICAL'},{name:'Lebanon / Hezbollah',status:'ACTIVE'},
    {name:'Red Sea / Houthi',status:'ACTIVE'},{name:'Strait of Hormuz',status:'CRITICAL'},
    {name:'Iraq / PMU',status:'ACTIVE'},{name:'Syria',status:'STABLE'},{name:'Gaza',status:'ACTIVE'}
  ];
  el.innerHTML=fronts.map(fr=>{const s=(fr.status||'').toLowerCase();const c=s==='critical'?'c':s==='active'?'a':'s';
    return`<div class="fr"><div class="fd ${c}"></div><span class="fn">${fr.name}</span><span class="fs ${c}">${s}</span></div>`;}).join('');
}

// ── NUCLEAR PANEL ──────────────────────────────
document.getElementById('rNuc').innerHTML=NUC.map(s=>`<div class="nr"><div class="nd ${s.s}"></div><span class="nn">${s.n}</span><span class="ns ${s.s}">${s.s==='x'?'DESTROYED':s.s==='d'?'DAMAGED':'INTACT'}</span></div>`).join('');

// ── KEY FIGURES ────────────────────────────────
const FIGS=[
  {n:'Ayatollah Khamenei',f:'iran',s:'act',c:'#ef4444'},
  {n:'Esmail Qaani',f:'iran',s:'unk',c:'#ef4444'},
  {n:'Benjamin Netanyahu',f:'israel',s:'act',c:'#3b82f6'},
  {n:'Lloyd Austin',f:'usa',s:'act',c:'#3b82f6'},
  {n:'Naim Qassem',f:'hezbollah',s:'act',c:'#ef4444'},
  {n:'Abdul-Malik al-Houthi',f:'houthis',s:'act',c:'#ef4444'},
  {n:'Mohammed bin Salman',f:'saudi',s:'act',c:'#22c55e'},
  {n:'Rafael Grossi',f:'iaea',s:'act',c:'#06b6d4'},
];
document.getElementById('rFig').innerHTML=FIGS.map(fg=>{
  const init=fg.n.split(' ').pop().substring(0,2).toUpperCase();
  return`<div class="fg"><div class="fg-av" style="background:${fg.c}15;color:${fg.c};border:1px solid ${fg.c}30">${init}</div><span class="fg-n">${fg.n}</span><span class="fg-s ${fg.s}">${fg.s==='act'?'ACTIVE':'UNKNOWN'}</span></div>`;
}).join('');

// ── SANCTIONS ──────────────────────────────────
const SANC=[
  {t:'Iran Central Bank',w:'US',i:'sv'},{t:'IRGC Leadership (47)',w:'US',i:'sv'},
  {t:'Iranian Oil Exports',w:'US',i:'sv'},{t:'Iranian Shipping',w:'EU',i:'hi'},
  {t:'Hezbollah Networks',w:'US',i:'hi'},{t:'Arms Embargo',w:'UN',i:'mo'},
  {t:'Chinese Oil Importers',w:'US',i:'sv'},{t:'Iranian Metals',w:'US',i:'mo'},
];
document.getElementById('rSanc').innerHTML=SANC.map(s=>`<div class="sc"><div class="sc-d ${s.i}"></div><span class="sc-i">${s.t}</span><span class="sc-w">${s.w}</span></div>`).join('');

// ── PREDICTIONS ────────────────────────────────
const PRED=[
  {q:'Iran-US ceasefire holds through April?',y:35},
  {q:'Hormuz reopens to commercial traffic?',y:22},
  {q:'UNSC passes new sanctions resolution?',y:68},
  {q:'Hezbollah escalates northern front?',y:45},
  {q:'Oil exceeds $120/bbl this month?',y:71},
  {q:'Iran withdraws from NPT?',y:18},
  {q:'China brokers mediation framework?',y:32},
  {q:'US deploys additional carrier group?',y:55},
];
document.getElementById('p-pred').innerHTML=PRED.map(p=>{const n=100-p.y;return`<div class="pr"><div class="pr-q">${p.q}</div><div class="pr-bar"><span class="pr-pct y">${p.y}%</span><div class="pr-track"><div class="pr-y" style="width:${p.y}%"></div><div class="pr-n" style="width:${n}%"></div></div><span class="pr-pct n">${n}%</span></div></div>`;}).join('');

// ── TABS ───────────────────────────────────────
document.querySelectorAll('.tab').forEach(t=>{t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.pane').forEach(x=>x.classList.remove('on'));
  t.classList.add('on');document.getElementById('p-'+t.dataset.t).classList.add('on');
};});

// ── INIT ───────────────────────────────────────
Promise.allSettled([loadEsc(),loadAcled(),loadFirms(),loadMkt(),loadNews(),loadFr()]);
setInterval(loadEsc,5*6e4);setInterval(loadAcled,10*6e4);setInterval(loadFirms,10*6e4);
setInterval(loadMkt,2*6e4);setInterval(loadNews,3*6e4);setInterval(loadFr,5*6e4);
