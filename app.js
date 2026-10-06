'use strict';
const rides=window.RIDES||[], $=id=>document.getElementById(id);
const months=['Januar','Februar','Marec','April','Maj','Junij','Julij','Avgust','September','Oktober','November','December'];
const fmt=(n,d=0)=>n.toLocaleString('sl-SI',{maximumFractionDigits:d,minimumFractionDigits:d});
const time=s=>s==null?'—':`${Math.floor(s/3600)} h ${String(Math.floor(s%3600/60)).padStart(2,'0')} min`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=s=>s.split('-').reverse().join('. ');
const sum=(rs,k)=>rs.reduce((n,r)=>n+(r[k]||0),0);
const sumTime=(rs,k)=>time(sum(rs,k))+(rs.some(r=>r[k]==null)?' *':'');
let filtered=[], selected=null, layers=new Map(), map=null, group=null;
if(window.L){
  map=L.map('map',{preferCanvas:true}).setView([46.1,14.1],8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  group=L.featureGroup().addTo(map);
}else $('mapError').hidden=false;
$('year').innerHTML='<option value="all">Vsa leta</option>'+[...new Set(rides.map(r=>r.date.slice(0,4)))].sort().reverse().map(y=>`<option>${y}</option>`).join('');
if(rides.length) $('year').value=rides[0].date.slice(0,4);
$('month').innerHTML='<option value="all">Vsi meseci</option>'+months.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
function fit(){if(group&&group.getLayers().length)map.fitBounds(group.getBounds(),{padding:[22,22],maxZoom:13});}
function stats(){
  $('totals').innerHTML=[['Ture',filtered.length],['Kilometri',fmt(sum(filtered,'km'),1)],['Vzpon',fmt(sum(filtered,'ascent'))+' m'],['Skupni čas',sumTime(filtered,'seconds')],['V gibanju',sumTime(filtered,'movingSeconds')]].map(([l,v])=>`<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  const monthly=months.map((name,i)=>{const rs=filtered.filter(r=>Number(r.date.slice(5,7))===i+1);return {name,count:rs.length,km:sum(rs,'km'),ascent:sum(rs,'ascent'),seconds:sum(rs,'seconds'),moving:sum(rs,'movingSeconds')};});
  $('monthly').innerHTML=monthly.map((m,i)=>`<tr><td>${m.name}</td><td>${m.count}</td><td>${fmt(m.km,1)}</td><td>${fmt(m.ascent)} m</td><td>${time(m.seconds)}</td><td>${sumTime(filtered.filter(r=>Number(r.date.slice(5,7))===i+1),'movingSeconds')}</td></tr>`).join('');
  const metric=$('metric').value,max=Math.max(1,...monthly.map(m=>m[metric]));
  $('bars').innerHTML=monthly.map(m=>`<div class="bar-slot" title="${m.name}: ${fmt(m[metric],metric==='km'?1:0)}"><span>${fmt(m[metric])}</span><div class="bar" style="height:${m[metric]/max*160}px"></div><small>${m.name.slice(0,3)}</small></div>`).join('');
  const years=[...new Set(filtered.map(r=>r.date.slice(0,4)))].sort(),series=years.map(year=>{let total=0;return {year,values:months.map((_,i)=>total+=sum(filtered.filter(r=>r.date.slice(0,4)===year&&Number(r.date.slice(5,7))===i+1),'km'))};});
  const ymax=Math.max(1,...series.flatMap(s=>s.values)),colors=['#197758','#b97735','#537ba5','#9865a7'];
  $('cumulative').innerHTML=`<svg viewBox="0 0 900 235" role="img" aria-label="Kumulativni kilometri ob koncu meseca po letih"><line x1="55" y1="190" x2="870" y2="190" stroke="#dbe3dc"/>${[0,.5,1].map(x=>`<text x="0" y="${190-x*155}">${fmt(ymax*x)}</text>`).join('')}${months.map((m,i)=>`<text x="${55+i*73}" y="215">${m.slice(0,3)}</text>`).join('')}${series.map((s,i)=>`<polyline fill="none" stroke="${colors[i%4]}" stroke-width="3" points="${s.values.map((v,j)=>`${55+j*73},${190-v/ymax*155}`).join(' ')}"/><text x="${65+i*110}" y="20">${s.year}</text>`).join('')}</svg>`;
  $('records').replaceChildren();
  for(const [label,key] of [['Najdaljša tura','km'],['Največ vzpona','ascent'],['Najdaljši skupni čas','seconds']]){
    const r=[...filtered].sort((a,b)=>(b[key]||0)-(a[key]||0))[0];if(!r)continue;
    const b=document.createElement('button');b.innerHTML=`${label}<strong>${esc(r.name)}</strong><small>${key==='km'?fmt(r.km,1)+' km':key==='ascent'?fmt(r.ascent)+' m':time(r.seconds)} · ${day(r.date)}</small>`;b.onclick=()=>{showView(false);choose(r.id);};$('records').append(b);
  }
}
function render(){
  filtered=rides.filter(r=>($('year').value==='all'||r.date.startsWith($('year').value))&&($('month').value==='all'||Number(r.date.slice(5,7))===Number($('month').value))&&($('activity').value==='all'||($('activity').value==='cycling'?r.activity.startsWith('cycling'):r.activity==='walking'))&&r.name.toLocaleLowerCase('sl').includes($('search').value.toLocaleLowerCase('sl')));
  const sort=$('sort').value;filtered.sort((a,b)=>sort==='date'?b.date.localeCompare(a.date):(b[sort]||0)-(a[sort]||0));
  $('count').textContent=`${filtered.length} tur`;
  $('rideList').replaceChildren();
  if(!filtered.length)$('rideList').textContent='Ni tur za izbrane filtre.';
  group?.clearLayers();layers.clear();
  for(const r of filtered){
    const b=document.createElement('button');b.className='ride';b.dataset.id=r.id;b.innerHTML=`<time>${day(r.date)}${r.activity==='walking'?' · Hoja':''}</time><strong>${esc(r.name)}</strong><small>${fmt(r.km,1)} km &nbsp; ↗ ${fmt(r.ascent)} m &nbsp; ${time(r.seconds)}</small>`;b.onclick=()=>choose(r.id);$('rideList').append(b);
    if(map){const line=L.polyline(r.segments,{color:r.activity==='walking'?'#b97735':'#197758',weight:2.5,opacity:.5}).addTo(group);line.bindTooltip(esc(r.name));line.on('click',()=>choose(r.id));layers.set(r.id,line);}
  }
  selected=null;$('detail').innerHTML='<p>Klikni turo na karti ali v seznamu za njen profil in podrobnosti.</p>';stats();fit();
}
function choose(id){
  selected=id;const r=filtered.find(r=>r.id===id);if(!r)return;
  for(const [key,line] of layers)line.setStyle({weight:key===id?5:2,opacity:key===id?1:.12,color:key===id?'#df722f':'#197758'});
  const line=layers.get(id);if(line){line.bringToFront();map.fitBounds(line.getBounds(),{padding:[30,30],maxZoom:14});}
  document.querySelectorAll('.ride').forEach(b=>b.classList.toggle('selected',b.dataset.id===id));
  $('detail').innerHTML=`<div class="detail-head"><div><span class="eyebrow">${day(r.date)} · ${esc(r.source)}</span><h2>${esc(r.name)}</h2></div><a class="download" href="${esc(r.gpx)}" download>GPX ↓</a></div><div class="detail-metrics"><span><b>${fmt(r.km,1)} km</b></span><span>↗ <b>${fmt(r.ascent)} m</b></span><span>Skupaj ${time(r.seconds)}</span><span>V gibanju ${time(r.movingSeconds)}</span></div>`;
  if(r.profile.length>1){const p=r.profile,min=Math.min(...p.map(x=>x[1])),max=Math.max(...p.map(x=>x[1])),last=p[p.length-1][0]||1;const pts=p.map(x=>`${40+x[0]/last*830},${88-(x[1]-min)/(max-min||1)*65}`).join(' ');$('detail').insertAdjacentHTML('beforeend',`<svg class="profile" viewBox="0 0 900 115" role="img" aria-label="Višinski profil"><polygon points="40,90 ${pts} 870,90" fill="#e5f1e8"/><polyline points="${pts}" fill="none" stroke="#197758" stroke-width="2"/><text x="0" y="20">${fmt(max)} m</text><text x="0" y="88">${fmt(min)} m</text><text x="40" y="110">0 km</text><text x="810" y="110">${fmt(last,1)} km</text></svg>`);}
  if(r.photos?.length){const div=document.createElement('div');div.className='photos';for(const photo of r.photos){if(!photo.src||/^(?:[a-z]+:|\/\/)/i.test(photo.src))continue;const a=document.createElement('a');a.href=photo.src;a.target='_blank';a.rel='noopener';const img=document.createElement('img');img.src=photo.src;img.alt=photo.caption||r.name;img.loading='lazy';a.append(img);div.append(a);}$('detail').append(div);}
}
function showView(stat){$('mapView').hidden=stat;$('statsView').hidden=!stat;$('mapTab').classList.toggle('active',!stat);$('statsTab').classList.toggle('active',stat);if(!stat&&map)requestAnimationFrame(()=>map.invalidateSize());}
for(const id of ['year','month','activity','sort'])$(id).onchange=render;
$('search').oninput=render;$('metric').onchange=stats;$('fit').onclick=fit;
$('mapTab').onclick=()=>showView(false);$('statsTab').onclick=()=>showView(true);
if(rides.length){const dates=rides.map(r=>r.date).sort();$('coverage').textContent=`Zbirka: ${day(dates[0])}–${day(dates.at(-1))}.`;}render();
