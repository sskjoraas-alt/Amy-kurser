/* ---------- aksjemotor: ny aksjefane. Leser dokumentet «motor» som den planlagte oppgaven «Aksjemotor til Amy» skriver. ---------- */
const MOTOR_ID='trig_0117boDTiQZwhcHG7eS8mb3J';
/* Nordnet Mini og skatt på vanlig aksjekonto */
const FEES={nordPct:.15,nordMin:29,utlPct:.20,utlMin:49,fxPct:.25,skattPct:37.84};
const MNORD=['Oslo Børs','Stockholm','København','Helsingfors'];
let MREF=null,MOTOR=null,mOpen='';
const mOk=j=>!!(j&&typeof j==='object'&&Array.isArray(j.analyser)&&Array.isArray(j.handlinger));
try{const m=JSON.parse(localStorage.getItem('minuke_motor')||'null');if(mOk(m))MOTOR=m}catch(e){}
const mKey=tk=>tkN(tk).replace(/[^A-Z0-9ÆØÅ ]/g,'');
const mAna=tk=>MOTOR?MOTOR.analyser.find(a=>a&&tkN(a.ticker)===tkN(tk))||null:null;
/* motorens stopp og mål legges på aksjen når brukeren ikke har overstyrt */
function mApply(){let n=0;if(!MOTOR)return 0;(S.pf.pos||[]).forEach(p=>{const a=mAna(p.tk);if(!a||(a.valuta&&p.cur&&a.valuta!==p.cur))return;
 if(!p.stopU&&+a.stopp>0&&+p.stop!==+a.stopp){p.stop=+a.stopp;n++}if(!p.tgtU&&+a.mal>0&&+p.tgt!==+a.mal){p.tgt=+a.mal;n++}});return n}
function mRead(sn){try{if(!sn.exists)return;const d=sn.data()||{};let j;try{j=JSON.parse(d.j||'')}catch(e){return}if(!mOk(j))return;MOTOR=j;
 try{localStorage.setItem('minuke_motor',JSON.stringify(j))}catch(e){}if(mApply())save();if(S.tab==='p'&&!typing()&&!qa&&!OV)render()}catch(e){}}
/* tall brukeren hadde før motoren regnes som overstyrt, én gang */
try{if(S.cfg&&!S.cfg.mfix1){(S.pf.pos||[]).forEach(p=>{if(+p.stop>0&&p.stopU==null)p.stopU=true;if(+p.tgt>0&&p.tgtU==null)p.tgtU=true});S.cfg.mfix1=1;save(1)}}catch(e){}
try{if(mApply())save(1)}catch(e){}
function mUser(id,k,v){const p=S.pf.pos.find(x=>x.id===id);if(!p)return;const n=Math.max(0,+String(v).replace(',','.')||0),f=k==='stop'?'stopU':'tgtU';p[k==='stop'?'stop':'tgt']=n;p[f]=n>0;if(!n)mApply();save();render()}
function mAuto(id,k){const p=S.pf.pos.find(x=>x.id===id);if(!p)return;p[k==='stop'?'stopU':'tgtU']=false;mApply();save();render()}
function mAutoAll(){const snap=JSON.stringify(S.pf.pos);S.pf.pos.forEach(p=>{if(mAna(p.tk)){p.stopU=false;p.tgtU=false}});mApply();save();render();toast('Motorens stopp og mål er tatt i bruk.',()=>{S.pf.pos=JSON.parse(snap);save();render()})}
/* endring i skjemaet «Endre» teller som overstyring */
{const s0=pfSave;pfSave=function(){const id=pfF&&pfF.id,n0=S.pf.pos.length,p=id&&S.pf.pos.find(x=>x.id===id),o=p?{s:+p.stop||0,t:+p.tgt||0}:null;s0();
 if(p&&o){if((+p.stop||0)!==o.s)p.stopU=+p.stop>0;if((+p.tgt||0)!==o.t)p.tgtU=+p.tgt>0}
 else if(!id&&S.pf.pos.length>n0){const n=S.pf.pos[S.pf.pos.length-1],a=mAna(n.tk);n.stopU=+n.stop>0&&!(a&&+a.stopp===+n.stop);n.tgtU=+n.tgt>0&&!(a&&+a.mal===+n.tgt)}
 if(pfF===null){mApply();save(1);render()}}}
/* pf-dokumentet til de planlagte oppgavene, nå med overstyringsflagg */
function wPf(){if(!PFREF)return;const j=JSON.stringify({oppdatert:TD,konto:S.pf.acct,regler:{stopp_pct:S.pf.rules.stop,gevinstmal_pct:S.pf.rules.margin,trailing_pct:S.pf.rules.trail,naer_mal_pct:S.pf.rules.near,breakeven_pct:+S.pf.rules.be||0,stor_bevegelse_pct:S.pf.rules.move},krav:{belop:S.pf.ap.belop,risiko:S.pf.ap.risiko,horisont_mnd:S.pf.ap.horisont_mnd,konto:axKonto(S.pf.ap),markeder:S.pf.ap.markeder,stil:S.pf.ap.stil,unnga:S.pf.ap.unnga,notat:S.pf.ap.notat},
 beholdning:S.pf.pos.map(p=>({id:p.id,ticker:p.tk,navn:p.nm||'',bors:p.ex,valuta:p.cur,antall:p.q,kjopskurs:p.px,kjopsdato:p.d,fx_kjop:+p.fx||1,malkurs:+p.tgt||null,stopp:+p.stop||null,stopp_overstyrt:!!p.stopU,mal_overstyrt:!!p.tgtU,stopp_aktiv:Math.round(stopOf(p)*100)/100,breakeven_aktiv:beOn(p),malsdato:p.tgtD||null,gevinstmal_pct:+p.mg||null,trailing_pct:+p.tr||null,tese:p.th||''})),
 folger:S.pf.fol.map(f=>({id:f.id,ticker:f.tk,navn:f.nm||'',bors:f.ex,valuta:f.cur,kjop_under:+f.buyU||null,malkurs:+f.tgt||null,grunn:f.why||''})),ignorert:S.pf.ign.slice(-200)});
 if(j===lastPJ)return;lastPJ=j;try{PFREF.set({j,u:new Date().toISOString()}).catch(()=>{lastPJ=''})}catch(e){lastPJ=''}}

/* netto fordel ved bytte: forventet avkastning på ny aksje minus det som gjenstår på den gamle, minus skatt, kurtasje og valutapåslag */
const mFee=(b,bors,F)=>{const n=MNORD.includes(bors);return Math.max(b*(n?F.nordPct:F.utlPct)/100,n?F.nordMin:F.utlMin)};
function swapNet(h,pos,pfVerdi,F){F=F||FEES;const b=+pos.verdi||0,k=h.kjop||{};if(!(b>0))return{kost_pct:0,netto_pct:0,ok:false};
 const kr=Math.max(0,+pos.gevinst||0)*F.skattPct/100+mFee(b,pos.bors,F)+mFee(b,k.bors,F)+(pos.cur&&pos.cur!=='NOK'?b*F.fxPct/100:0)+(k.valuta&&k.valuta!=='NOK'?b*F.fxPct/100:0);
 const kost=Math.round(kr/b*1e4)/100,netto=Math.round(((+k.forventet_pct||0)-(+pos.gjen||0)-kost)*100)/100;return{kost_pct:kost,netto_pct:netto,ok:netto>=3}}
function mNet(h){if(!h||h.type!=='bytt'||!h.selg||!h.kjop)return null;const p=S.pf.pos.find(x=>tkN(x.tk)===tkN(h.selg.ticker));if(!p)return null;const r=pv(p);
 return swapNet(h,{verdi:r.val,gevinst:r.gain,gjen:+p.tgt>0&&r.px>0?(p.tgt/r.px-1)*100:0,cur:p.cur,bors:p.ex},pfTot().v,FEES)}
function mActs(){const done=new Set(S.pf.mdone||[]),go=[],no=[];if(!MOTOR)return{go,no};
 MOTOR.handlinger.forEach(h=>{if(!h||!h.type||done.has(h.id))return;const n=mNet(h);(h.type==='bytt'&&n&&!n.ok?no:go).push({h,n})});return{go,no}}
function mDone(i){const h=MOTOR&&MOTOR.handlinger[i],id=h&&h.id;if(!id)return;S.pf.mdone=(S.pf.mdone||[]).concat(id).slice(-60);save();render();toast('Markert som gjort.',()=>{S.pf.mdone=S.pf.mdone.filter(x=>x!==id);save();render()})}
async function motorRun(){const t=+((S.cfg||{}).mRunT)||0;if(Date.now()-t<600e3){toast('Analysen kjører allerede. Du får varsel når den er ferdig.');return}
 if(!MCP){toast('Appen trenger tilgang til «Claude Code Remote». Se Tilganger under Innstillinger.');return}S.cfg.mRunT=Date.now();save(1);render();
 try{await MCP.callTool(CCR,'fire_trigger',{trigger_id:MOTOR_ID});S.cfg.mcpOk=1;save(1);toast('Analysen er startet. Du får varsel om 10–20 minutter.')}
 catch(e){S.cfg.mRunT=0;save(1);toast(e&&e.code==='not_granted'?'Tilgang til «Claude Code Remote» mangler. Se Tilganger under Innstillinger.':'Kunne ikke starte analysen. Prøv igjen.')}render()}
const mBusy=()=>Date.now()-(+((S.cfg||{}).mRunT)||0)<600e3;
const mBtns=()=>`<div class="mrow"><button class="mrun" ${mBusy()?'disabled':''} onclick="motorRun()">${ic('r',18)} ${mBusy()?'Analysen kjører':'Kjør analyse nå'}</button><label class="btnl mimg">${ic('cam',18)} Bilde fra Nordnet<input type="file" accept="image/*" multiple onchange="nnImport(this.files)"></label></div>${typeof NNI!=='undefined'&&NNI?nnH():''}`;
const mWhen=s=>{s=String(s||'');return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)?fmtAt(s):''};
const mDom={kjop_na:['Kjøp nå','ok'],vent:['Vent på kurs','h'],folg:['Følg',''],behold:['Behold',''],selg:['Selg','bad']};
const mPill=d=>{const x=mDom[d]||[String(d||''),''];return `<span class="pill ${x[1]}">${esc(x[0])}</span>`};
const mNum=(l,v,c,cl)=>`<div class="mnum"><span>${l}</span><b class="${cl||''}">${+v>0?fmtN(v):'–'}</b>${+v>0&&c&&c!=='NOK'?`<small>${esc(c)}</small>`:''}</div>`;

function mvAct(x){const h=x.h,n=x.n,k=h.kjop,s=h.selg,T={bytt:'BYTT',kjop:'KJØP',selg:'SELG'}[h.type]||String(h.type).toUpperCase(),sp=s&&S.pf.pos.find(p=>tkN(p.tk)===tkN(s.ticker)),sr=sp?pv(sp):null;
 return `<div class="card mact m-${esc(h.type)}"><div class="mtop"><span class="mtag">${T}</span><span class="ms">${n?`Netto etter skatt og kurtasje: ${pct(n.netto_pct)}`:h.type==='selg'?'Sikrer kapitalen':k&&+k.forventet_pct?`Forventet ${pct(+k.forventet_pct)}`:''}</span></div>
 <div class="mpair">${s?`<div class="mleg"><span class="ml neg">SELG</span><b>${esc(s.ticker)}</b><small>${esc(s.navn||'')}${sr?` · ${pct(sr.gp)}`:''}</small>${s.grunn?`<small>${esc(s.grunn)}</small>`:''}</div>`:''}${k?`<div class="mleg"><span class="ml pos">KJØP</span><b>${esc(k.ticker)}</b><small>${esc(k.navn||'')}</small>${+k.belop_nok>0?`<small>${nok(+k.belop_nok)}${+k.antall>0?` · ${fmtN(+k.antall,0)} stk`:''}</small>`:''}</div>`:''}</div>
 ${h.okse||h.bjorn?`<p class="mwhy">${h.okse?`<b>Okse:</b> ${esc(h.okse)} `:''}${h.bjorn?`<b>Bjørn:</b> ${esc(h.bjorn)} `:''}${h.risiko?`<b>Risiko:</b> ${esc(h.risiko==='hoy'?'høy':h.risiko)}.`:''}</p>`:''}
 ${k?`<div class="mnums">${mNum('Kjøp under',k.kjop_under,k.valuta)}${mNum('Stopp',k.stopp,k.valuta,'neg')}${mNum('Mål',k.mal,k.valuta,'pos')}</div>`:''}
 ${h.begrunnelse?`<p class="ms" style="margin:0 0 12px">${esc(h.begrunnelse)}</p>`:''}
 <div class="mrow"><a class="btnl mgo" href="${esc(nnUrl(k&&k.nordnet_url)||'https://www.nordnet.no/')}" target="_blank" rel="noopener">Åpne Nordnet</a><button class="sec" onclick="mOpen='${mKey((k||s).ticker)}';S.sub.p='ana';save(1);render();window.scrollTo(0,0)">Se hele analysen</button></div>
 <div class="mrow" style="margin-top:8px">${k?`<button class="sec sm" onclick="mBuy(${MOTOR.handlinger.indexOf(h)})">Registrer kjøp</button>`:''}${sp?`<button class="sec sm" onclick="pfNew('sell',{id:${sp.id}})">Registrer salg</button>`:''}<button class="sec sm" onclick="mDone(${MOTOR.handlinger.indexOf(h)})">${ic('ok',16)} Gjort</button></div></div>`}
function mBuy(i){const h=MOTOR&&MOTOR.handlinger[i],k=h&&h.kjop;if(!k)return;pfNew('buy',{tk:k.ticker,nm:k.navn,ex:BORS.includes(k.bors)?k.bors:'Annet',cur:k.valuta,px:+k.kurs||'',q:+k.antall||'',tgt:+k.mal||'',stop:+k.stopp||'',th:h.begrunnelse||'',url:nnUrl(k.nordnet_url)})}

function mvNow(){const M=MOTOR,T=pfTot(),A=mActs();
 const beh=S.pf.pos.length?`<div class="card"><p class="eb mute">Endringer siden sist</p><div class="mval"><span class="mbig">${nok(T.v)}</span><span class="${pcl(T.d)}">${KURS&&KURS.handelsdag?pct(T.dp)+' i dag':''}</span></div>
  <div class="lst">${S.pf.pos.slice().sort((a,b)=>pv(b).val-pv(a).val).map(p=>{const r=pv(p),a=mAna(p.tk),sell=A.go.some(x=>x.h.selg&&tkN(x.h.selg.ticker)===tkN(p.tk));
   return `<div class="li"><span class="n"><b>${esc(p.tk)}</b> ${sell?'<span class="pill bad">Selg</span>':a&&a.dom==='selg'?'<span class="pill warn">Vurder salg</span>':''}<br><span class="ms sm">${pct(r.gp)} siden kjøp${+p.stop>0?` · stopp ${fmtN(p.stop)}`:''}${+p.tgt>0?` · mål ${fmtN(p.tgt)}`:''}</span></span><span class="amt ${pcl(r.dp)}">${r.dp!=null?pct(r.dp):'–'}</span></div>`}).join('')}</div>
  <button class="link" onclick="S.sub.p='port';save(1);render();window.scrollTo(0,0)">Se beholdningen</button></div>`:`<div class="card"><p class="eb mute">Beholdning</p><p class="ms" style="margin:0 0 10px">Ingen aksjer lagt inn. Ta bilde av beholdningen i Nordnet, eller registrer et kjøp.</p><button class="sec" onclick="pfNew('buy')">${ic('plus',18)} Registrer kjøp</button></div>`;
 if(!M)return `<div class="card tint"><h2>Ingen analyse ennå</h2><p class="ms" style="margin:0">Motoren kjører mandag, onsdag og fredag kl. 07:22. Du kan også starte den nå. Resultatet kommer her og som varsel.</p></div>${beh}${mBtns()}`;
 const R=Array.isArray(M.radar)?M.radar:[],mk=M.marked||{},reg={sterkt:'Sterkt marked',noytralt:'Nøytralt marked',svakt:'Svakt marked'}[mk.regime]||'';
 return `<p class="mmeta">${mWhen(M.kjort)?`Analysert ${esc(mWhen(M.kjort))}`:''}${mWhen(M.neste)?` · neste ${esc(mWhen(M.neste))}`:''}</p>
 ${M.silt&&M.silt.foreldet?'<p class="warnl">Grovsilen er gammel. Bare beholdningen er analysert.</p>':''}
 ${A.go.length?A.go.map(mvAct).join(''):`<div class="card mnone"><b>Ingenting å gjøre nå</b><p class="ms" style="margin:4px 0 0">${M.analyser.length} aksjer analysert. Ingen kjøp, salg eller bytter anbefales.</p></div>`}
 ${reg||mk.tekst?`<div class="card"><p class="eb mute">Markedet</p><p style="margin:0 0 6px"><b>${esc(reg)}</b>${mk.tekst?' · '+esc(mk.tekst):''}</p><p class="ms" style="margin:0">Anbefalt antall: ${+mk.anbefalt_antall||'–'} aksjer${mk.kontantandel_pct!=null?` · kontanter ${fmtN(+mk.kontantandel_pct,0)} %`:''}. Du har ${S.pf.pos.length}.</p></div>`:''}
 ${beh}
 <div class="card"><div class="ch"><p class="eb mute" style="margin:0">På radaren</p>${M.silt&&+M.silt.univers?`<span class="ms sm">${fmtN(+M.silt.univers,0)} aksjer silt</span>`:''}</div>${R.length?`<div class="lst">${R.map(r=>`<button class="li mrad" onclick="mOpen='${mKey(r.ticker)}';S.sub.p='ana';save(1);render();window.scrollTo(0,0)"><b class="mscore2">${+r.score||'–'}</b><span class="n"><b>${esc(r.ticker)}</b> <span class="ms">${esc(r.navn||'')}</span><br><span class="ms sm">${esc(r.venter_pa||(+r.kjop_under>0?'kjøp under '+fpx(r.kjop_under,r.valuta):''))}</span></span></button>`).join('')}</div>`:'<p class="ms" style="margin:0">Ingen kandidater på vent.</p>'}</div>
 ${mBtns()}`}

function mBox(p){const a=mAna(p.tk);
 return `<div class="mbox"><p class="eb mute">Stopp og mål</p><div class="grid2" style="margin:0 0 8px"><div><label for="ms${p.id}">Stopp${p.stopU?' (din)':a?' (motoren)':''}</label><input id="ms${p.id}" type="number" inputmode="decimal" step="any" value="${+p.stop||''}" onchange="mUser(${p.id},'stop',this.value)"></div><div><label for="mt${p.id}">Mål${p.tgtU?' (ditt)':a?' (motoren)':''}</label><input id="mt${p.id}" type="number" inputmode="decimal" step="any" value="${+p.tgt||''}" onchange="mUser(${p.id},'tgt',this.value)"></div></div>
 ${a?`<p class="ms sm" style="margin:0 0 8px">Motorens forslag: stopp ${fpx(a.stopp,a.valuta)}, mål ${fpx(a.mal,a.valuta)}. ${mPill(a.dom)}</p>${p.stopU||p.tgtU?`<div class="cats" style="margin:0">${p.stopU?`<button onclick="mAuto(${p.id},'stop')">Bruk motorens stopp</button>`:''}${p.tgtU?`<button onclick="mAuto(${p.id},'tgt')">Bruk motorens mål</button>`:''}</div>`:''}`:'<p class="ms sm" style="margin:0">Motoren har ikke analysert denne aksjen ennå.</p>'}</div>`}
{const d0=posDet;posDet=function(p,r,st){const h=d0(p,r,st),i=h.lastIndexOf('</div>');return i<0?h+mBox(p):h.slice(0,i)+mBox(p)+h.slice(i)}}
function mvPort(){const ov=S.pf.pos.filter(p=>(p.stopU||p.tgtU)&&mAna(p.tk)).length;
 return `${pfForm()}${S.pf.pos.length?`<div class="card"><div class="ch"><h2>Beholdning</h2><button class="link" onclick="pfNew('buy')">${ic('plus',16)} Kjøp</button></div><div class="lst">${S.pf.pos.slice().sort((a,b)=>pv(b).val-pv(a).val).map(p=>posRow(p,S.pf.pos.indexOf(p))).join('')}</div>
 ${ov?`<p class="ms sm" style="margin:12px 0 8px">${ov} ${ov===1?'aksje har':'aksjer har'} egne tall for stopp eller mål. Motoren viser sitt forslag ved siden av.</p><button class="sec sm" onclick="mAutoAll()">Bruk motorens tall på alle</button>`:''}</div>`:`<div class="card tint"><h2>Ingen aksjer ennå</h2><p class="ms" style="margin:0 0 12px">Ta bilde av beholdningen i Nordnet, eller registrer et kjøp.</p><button onclick="pfNew('buy')">${ic('plus',18)} Registrer kjøp</button></div>`}
 ${(()=>{try{return kursH()}catch(e){return''}})()}${pfRisk()}${pfDonut()}${mBtns()}`}

function mvAnaCard(a){const op=mOpen===mKey(a.ticker),src=(Array.isArray(a.kilder)?a.kilder:[]).map(okUrl).filter(Boolean).slice(0,6);
 return `<div class="card mana" id="ma-${mKey(a.ticker).replace(/\s/g,'_')}"><div class="mhead"><b class="mscore">${+a.score||0}</b><span class="n"><b>${esc(a.ticker)}</b> <span class="ms">${esc(a.navn||'')}</span><br><span class="ms sm">${esc(a.bors||'')} · ${fpx(a.kurs,a.valuta)}${a.i_beholdning?' · i beholdningen':''}</span></span>${mPill(a.dom)}</div>
 <div class="mnums">${mNum('Kjøp under',a.kjop_under,a.valuta)}${mNum('Stopp',a.stopp,a.valuta,'neg')}${mNum('Mål',a.mal,a.valuta,'pos')}</div>
 <p class="mwhy"><b>Okse:</b> ${esc(a.okse||'–')}</p><p class="mwhy"><b>Bjørn:</b> ${esc(a.bjorn||'–')}</p><p class="mwhy"><b>Risiko:</b> ${esc(a.risiko==='hoy'?'høy':a.risiko||'–')}${a.risiko_tekst?'. '+esc(a.risiko_tekst):''}</p>
 <details ${op?'open':''}><summary><span class="ms" style="font-weight:600">Analysene bak</span>${CH()}</summary><div class="mdeep">${[['Fundamentalt',a.fundamentalt],['Nyheter',a.nyheter],['Sentiment',a.sentiment],['Teknisk',a.teknisk]].filter(x=>x[1]).map(x=>`<p><b>${x[0]}:</b> ${esc(x[1])}</p>`).join('')}
 ${src.length?`<p class="src"><b>Kilder:</b> ${src.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])}</a>`).join(' · ')}</p>`:''}</div></details></div>`}
function mvAna(){const M=MOTOR;if(!M)return `<div class="card tint"><h2>Ingen analyse ennå</h2><p class="ms" style="margin:0">Analysene kommer her etter første kjøring.</p></div>${mBtns()}`;
 const no=mActs().no,L=M.analyser.slice().sort((a,b)=>(+b.score||0)-(+a.score||0));
 return `${no.length?`<div class="card"><p class="eb mute">Ikke lønnsomt nok å bytte</p>${no.map(x=>`<p style="margin:0 0 6px">Selg ${esc(x.h.selg.ticker)}, kjøp ${esc(x.h.kjop.ticker)}: netto ${pct(x.n.netto_pct)} etter ${fmtN(x.n.kost_pct,1)} % i skatt og kostnader. Kravet er minst 3 %.</p>`).join('')}</div>`:''}
 <p class="mmeta">${L.length} aksjer analysert${mWhen(M.kjort)?' '+esc(mWhen(M.kjort)):''}. Høyest poengsum først.</p>${L.map(mvAnaCard).join('')}
 <p class="ms sm" style="margin:0 4px 12px">${esc(M.forbehold||'Research, ikke personlig rådgivning.')}</p>`}

function mvHit(){const L=(MOTOR&&Array.isArray(MOTOR.logg)?MOTOR.logg:[]).filter(x=>x&&+x.kurs>0&&x.d&&x.d<TD),I=(KURS&&KURS.indeks)||{};
 const rows=L.map(x=>{const q=kq(x.ticker),a=mAna(x.ticker),now=q&&+q.kurs>0?+q.kurs:a&&+a.kurs>0?+a.kurs:0;if(!now)return null;const us=x.valuta==='USD',ix=us?I.SP500:I.OSEBX,ir=ix&&+ix.kurs>0&&+x.indeks>0?(ix.kurs/x.indeks-1)*100:null,r=(now/x.kurs-1)*100*(x.dom==='selg'?-1:1);return{x,r,ir}}).filter(Boolean).slice(-40).reverse();
 const n=rows.length,avg=n?rows.reduce((s,y)=>s+y.r,0)/n:0,wi=rows.filter(y=>y.ir!=null),ai=wi.length?wi.reduce((s,y)=>s+y.ir,0)/wi.length:null,hit=rows.filter(y=>y.r>0).length;
 return `<div class="card"><h2>Treffsikkerhet</h2>${n?`<div class="stats s2">${stat('Anbefalinger',String(n),`${hit} av ${n} riktig vei`)}${stat('Snitt siden anbefaling',pct(avg),ai!=null?`indeks ${pct(ai)}`:'',pcl(avg))}</div>
 <div class="lst" style="margin-top:12px">${rows.slice(0,15).map(y=>`<div class="li"><span class="n"><b>${esc(y.x.ticker)}</b> ${mPill(y.x.dom)}<br><span class="ms sm">${fd(P(y.x.d))} · ${fpx(y.x.kurs,y.x.valuta)}</span></span><span class="amt ${pcl(y.r)}" style="text-align:right">${pct(y.r)}${y.ir!=null?`<br><span class="ms" style="font-size:13px;font-weight:500">indeks ${pct(y.ir)}</span>`:''}</span></div>`).join('')}</div>
 <p class="ms sm" style="margin:10px 0 0">Kursendring siden motoren anbefalte aksjen, mot indeks i samme periode. Få anbefalinger over kort tid sier lite. Flaks og ferdighet ser like ut de første månedene.</p>`:'<p class="ms" style="margin:0">Fylles på etter hvert som motoren kjører. Her ser du om anbefalingene slår indeks.</p>'}</div>`}
function mvHist(){const H=KURS&&Array.isArray(KURS.historikk)?KURS.historikk:[],sold=S.pf.sold.slice().sort((a,b)=>a.sd<b.sd?1:-1),re=sold.reduce((s,x)=>s+(x.gain||0),0),win=sold.filter(x=>x.gain>0).length;
 return `${mvHit()}<div class="card"><h2>Utvikling</h2>${H.length>=2?pfChart(H):'<p class="ms" style="margin:0">Grafen fylles på etter to dager med kurser.</p>'}</div>
 <div class="card"><div class="ch"><h2>Realiserte salg</h2><span class="amt ${pcl(re)}">${sold.length?krs(re):''}</span></div>${sold.length?`<p class="ms" style="margin-top:-6px">${win} av ${sold.length} med gevinst. Gevinst skattes med 37,84 % på vanlig aksjekonto.</p><div class="lst">${sold.map(s=>`<div class="li"><span class="n"><b>${esc(s.tk)}</b> <span class="ms">${fmtN(s.q,s.q%1?2:0)} stk · ${fpx(s.px,s.cur)} → ${fpx(s.spx,s.cur)}</span><br><span class="ms sm">${fd(P(s.bd||s.sd))} – ${fd(P(s.sd))}${s.why?' · '+esc(s.why):''}</span></span><span class="amt ${pcl(s.gain)}" style="text-align:right">${krs(s.gain)}<br><span style="font-size:13px">${pct(s.gp)}</span></span><button class="ghost" aria-label="Slett salget" onclick="rm2('sold',${s.id},'Salget')">${ic('tr',16)}</button></div>`).join('')}</div>`:'<p class="ms" style="margin:0">Ingen salg ennå.</p>'}</div>`}
function mvChat(){let c='';try{c=sxCard()}catch(e){}return c||'<div class="card"><h2>Chat</h2><p class="ms" style="margin:0">Chatten er ikke tilgjengelig akkurat nå. Åpne appen på nytt og prøv igjen.</p></div>'}

/* chatten får motorens siste resultat som grunnlag */
{const c0=pfCtx;pfCtx=function(){let s=c0();try{if(MOTOR)s+='\nAksjemotorens siste analyse (JSON): '+JSON.stringify({kjort:MOTOR.kjort,marked:MOTOR.marked,handlinger:MOTOR.handlinger,analyser:MOTOR.analyser.slice(0,6).map(a=>({ticker:a.ticker,navn:a.navn,kurs:a.kurs,valuta:a.valuta,score:a.score,dom:a.dom,kjop_under:a.kjop_under,stopp:a.stopp,mal:a.mal,okse:a.okse,bjorn:a.bjorn,risiko:a.risiko})),radar:MOTOR.radar}).slice(0,6000)}catch(e){}return s}}

SUBS.p=[['na','Nå'],['port','Beholdning'],['ana','Analyser'],['hist','Historikk'],['chat','Chat']];
VIEWS.p=()=>{const sb=subOf('p'),n=mActs().go.length;let b='';try{b=bCard(AXK())}catch(e){}
 const t=sb==='na'?(!MOTOR?'Aksjer':n?`${n} ting å gjøre`:'Alt i orden'):sb==='port'?'Beholdning':sb==='ana'?'Analyser':sb==='hist'?'Historikk':'Chat';
 return `${head('Aksjer · Nordnet',t,'')}${subNav('p')}${sb==='port'?mvPort():sb==='ana'?mvAna():sb==='hist'?mvHist():sb==='chat'?mvChat():mvNow()}
 <p class="ms sm" style="text-align:center;margin:8px 0 14px">Regelbaserte varsler og research, ikke personlig finansiell rådgivning. Du handler selv i Nordnet.</p>${sb==='na'||sb==='chat'?b:''}`};
{const R0=render;render=function(){try{document.body.classList.toggle('axm',S.tab==='p')}catch(e){}R0();
 try{if(S.tab==='p'&&mOpen&&subOf('p')==='ana'){const e=document.getElementById('ma-'+mOpen.replace(/\s/g,'_'));mOpen='';if(e)setTimeout(()=>{try{e.scrollIntoView({block:'start'})}catch(x){}},30)}}catch(e){}}}

/* stil: mørk, rolig og tallene først. Gjelder bare mens aksjefanen er åpen. */
try{const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap';document.head.appendChild(l);
const st=document.createElement('style');st.id='axmotor';st.textContent=`
body.axm{--bg:#070B0E;--card:#0F171B;--sunk:#0A1114;--raise:#152027;--ink:#E8F0F2;--mute:#8799A1;--line:#1C2930;--acc:#4CC6DC;--on:#03151A;--ok:#52D9AB;--bad:#FF8B74;--warn:#F2B354;--inv:#52D9AB;--glow:14%;--shadow:none;--navsh:0 16px 44px -10px rgba(0,0,0,.7);--f:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;--fd:"Space Grotesk",Inter,system-ui,sans-serif;color-scheme:dark;background:var(--bg);color:var(--ink)}
body.axm{--c-paper:#070B0E;--c-card:#0F171B;--c-ink:#E8F0F2;--c-edge:#1C2930;--c-mute:#8799A1;--c-acc:#4CC6DC;--c-sh:none;--r:20px}
body.axm main{--h:var(--inv)}
body.axm #app .card{border:1px solid var(--line);box-shadow:none;border-radius:20px}
body.axm #app .card.mact{border-color:var(--inv)}body.axm #app .card.mact.m-selg{border-color:var(--bad)}body.axm #app .card.mnone{border-style:dashed}
body.axm #app button:not(.link):not(.sec):not(.ghost):not(.pill):not([class*="ch"]){border:1px solid transparent}
body.axm #app button.mrun:not(.link):not(.sec):not(.ghost):not(.pill):not([class*="ch"]){border:1px solid var(--acc)}
body.axm #app button.mrad:not(.link):not(.sec):not(.ghost):not(.pill):not([class*="ch"]){border:0;border-top:1px solid var(--line)}body.axm #app .lst>button.mrad:first-child{border-top:0}
body.axm #app h1,body.axm #app h2{letter-spacing:-.015em}
body.axm .cats button{border:1px solid var(--line)!important}
body.axm nav{border-width:1px!important}
body.axm #app a.mgo{background:var(--inv);color:var(--on)}body.axm #app .mimg{background:var(--sunk);color:var(--ink)}
body.axm h1{font-stretch:100%;font-weight:700;letter-spacing:-.02em;font-size:32px}
body.axm .card{border-radius:20px}
body.axm .eb.mute,.eb.mute{color:var(--mute)}
.mmeta{font-size:13px;color:var(--mute);margin:-8px 2px 14px}
.mact{border-color:var(--inv)}.mact.m-selg{border-color:var(--bad)}
.mtop{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.mtag{flex:none;font-size:11px;font-weight:700;letter-spacing:.1em;padding:4px 9px;border-radius:8px;background:var(--inv);color:var(--on)}.m-selg .mtag{background:var(--bad)}
.mpair{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:12px}
.mleg{background:var(--sunk);border-radius:14px;padding:12px;min-width:0}.mleg b{display:block;font-family:var(--fd);font-size:21px;font-weight:700;overflow-wrap:anywhere}.mleg small{display:block;font-size:13px;color:var(--mute);overflow-wrap:anywhere}
.ml{font-size:11px;font-weight:700;letter-spacing:.1em}
.mwhy{margin:0 0 8px;font-size:14.5px;line-height:1.45}
.mnums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 12px}
.mnum{min-width:0}.mnum span{display:block;font-size:12px;color:var(--mute)}.mnum b{font-family:var(--fd);font-size:19px;font-weight:700;font-variant-numeric:tabular-nums}.mnum small{font-size:11px;color:var(--mute);margin-left:4px}
.mrow{display:flex;gap:8px;flex-wrap:wrap}.mrow>*{flex:1;min-height:46px;margin:0}
.mrow .sm{min-height:44px;flex:1 1 auto}
.mgo{background:var(--inv);color:var(--on);text-decoration:none}
.mrun{background:none;border:1px solid var(--acc);color:var(--acc)}
.mimg{background:var(--sunk);border:1px solid var(--line);color:var(--ink)}
.mnone{text-align:left;border-style:dashed}
.mval{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:2px 0 8px}.mbig{font-family:var(--fd);font-size:34px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.mrad{width:100%;background:none;color:var(--ink);text-align:left;justify-content:flex-start;border-radius:0;padding:11px 0;font-weight:500;min-height:44px}.mrad:hover{filter:none}
.mscore2{flex:none;width:34px;font-family:var(--fd);font-size:18px;color:var(--acc)}
.mhead{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.mscore{flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-family:var(--fd);font-size:20px;font-weight:700;background:color-mix(in srgb,var(--inv) 16%,var(--card));color:var(--inv)}
.mdeep{margin-top:10px}.mdeep p{margin:0 0 8px;font-size:14.5px}
.mbox{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
`;document.head.appendChild(st)}catch(e){}
