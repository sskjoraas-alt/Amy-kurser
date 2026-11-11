const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const FILE='file://'+path.resolve(process.argv[2]||'index.html');
const SAMPLE=JSON.parse(fs.readFileSync(path.join(__dirname,'sample.json'),'utf8'));
const MOTOR_ID='trig_0117boDTiQZwhcHG7eS8mb3J';
const POS=SAMPLE.pf.beholdning.map((p,i)=>({id:1000+i,tk:p.ticker,nm:p.navn,ex:p.bors,cur:p.valuta,q:p.antall,px:p.kjopskurs,fee:0,d:'2026-10-01',fx:p.fx_kjop||1,tgt:0,stop:0,tgtD:'',mg:0,tr:0,th:'',url:''}));
const KURS={handelsdag:'2026-11-11',fx:{SEK:0.94,USD:10.1,EUR:11.6,DKK:1.55},kurser:Object.fromEntries(POS.map(p=>[p.tk,{kurs:p.px*1.05,forrige:p.px*1.04,endring_pct:1.0,valuta:p.cur,tid:'2026-11-11 14:00',foreldet:false}]))};
let bad=0,browser,page,errs=[];
const ok=(n,c,x)=>{if(c)console.log('OK',n);else{bad++;console.log('FAIL',n,x===undefined?'':String(x).slice(0,300))}};
async function open(docs,st){if(page)await page.close();const ctx=await browser.newContext({viewport:{width:390,height:844}});page=await ctx.newPage();errs=[];
 page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR|fonts\./.test(m.text()))errs.push(m.text())});page.on('pageerror',e=>errs.push(String(e)));
 await page.addInitScript(({docs,st})=>{window.__DOCS=docs;try{localStorage.setItem('minuke',JSON.stringify(st))}catch(e){}},{docs,st:st||{tab:'p',sub:{p:'na'},pf:{pos:POS}}});
 await page.addInitScript({path:path.join(__dirname,'stub.js')});
 await page.goto(FILE);await page.waitForTimeout(700);await page.evaluate(()=>{S.tab='p';render()});await page.waitForTimeout(100)}
const text=()=>page.evaluate(()=>document.querySelector('#app').innerText);
const has=async(n,s)=>{const t=await text();ok(n,t.toLowerCase().includes(s.toLowerCase()),'mangler «'+s+'» i: '+t.slice(0,200).replace(/\n/g,' | '))};
const hasNot=async(n,s)=>{const t=await text();ok(n,!t.includes(s),'fant «'+s+'»')};
const sub=async k=>{await page.evaluate(k=>{S.sub.p=k;render()},k);await page.waitForTimeout(100)};
const D=m=>({kurs:{j:JSON.stringify(KURS),u:'2026-11-11T14:00'},...(m===undefined?{}:{motor:m})});
(async()=>{browser=await chromium.launch();const only=process.argv[3]||'';
 const M=SAMPLE.motor,MJ=x=>({j:JSON.stringify(x),u:'2026-11-11T14:13'});
 const BYTT={...M,handlinger:[{id:'t-1',type:'bytt',selg:{ticker:POS[0].tk,navn:POS[0].nm,grunn:'Trend brutt'},kjop:{ticker:'BBB',navn:'Beta AS',bors:'Oslo Børs',valuta:'NOK',kurs:140,kjop_under:142,stopp:129,mal:168,belop_nok:30000,antall:214,forventet_pct:20,nordnet_url:null},netto_fordel_pct:6.1,okse:'Sterk rapport',bjorn:'Høy prising',risiko:'middels',begrunnelse:'Bedre fart'}]};
 // C1 grunnlinje
 await open(D());ok('grunnlinje: fanen åpner uten konsollfeil',errs.length===0,errs.join(' || '));
 if(only==='base'){await browser.close();process.exit(bad?1:0)}
 // C2
 await open(D());await has('motor mangler → Ingen analyse ennå','Ingen analyse ennå');ok('motor mangler: ingen konsollfeil',errs.length===0,errs.join(' || '));
 await has('motor mangler: beholdning vises likevel',POS[0].tk);
 await open(D({j:'{nei',u:'x'}));await has('ødelagt JSON → Ingen analyse ennå','Ingen analyse ennå');ok('ødelagt JSON: ingen konsollfeil',errs.length===0,errs.join(' || '));
 await open(D({j:JSON.stringify({dato:'x'}),u:'x'}));await has('feil form → Ingen analyse ennå','Ingen analyse ennå');
 await open(D(MJ(BYTT)));await has('bytt: 1 ting å gjøre','1 ting å gjøre');await has('bytt: merkelapp','BYTT');await has('bytt: kjøp under','Kjøp under');await has('bytt: tall','142,00');await has('bytt: stopp','129,00');await has('bytt: mål','168,00');
 await has('nå: endringer siden sist','Endringer siden sist');await has('nå: radar','På radaren');await has('nå: markedslinje','Anbefalt antall');
 await open(D(MJ({...M,handlinger:[]})));await has('ingen handlinger','Ingenting å gjøre nå');
 await open(D(MJ({...M,handlinger:[],silt:{...M.silt,foreldet:true}})));await has('foreldet grovsil','Grovsilen er gammel');
 await page.getByRole('button',{name:'Kjør analyse nå'}).first().click();await page.waitForTimeout(200);
 const calls=await page.evaluate(()=>window.__CALLS.filter(c=>c.tool==='fire_trigger'));
 ok('knapp: fire_trigger med MOTOR_ID',calls.length===1&&calls[0].args.trigger_id===MOTOR_ID,JSON.stringify(calls));
 await page.getByRole('button',{name:/Kjør analyse nå|Analysen kjører/}).first().click({force:true}).catch(()=>{});await page.waitForTimeout(150);
 ok('knapp: høyst én start per 10 minutter',(await page.evaluate(()=>window.__CALLS.filter(c=>c.tool==='fire_trigger').length))===1);
 // C3
 const sw=(h,p)=>page.evaluate(([h,p,F])=>swapNet(h,p,200000,F||FEES),[h,p]);
 const H=o=>({type:'bytt',kjop:{forventet_pct:o.forventet,valuta:o.cur||'NOK',bors:o.bors||'Oslo Børs'}}),PP=o=>({verdi:o.verdi,gevinst:o.gevinst,gjen:o.gjen,cur:o.cur||'NOK',bors:o.bors||'Oslo Børs'});
 let r=await sw(H({forventet:20}),PP({verdi:40000,gevinst:10000,gjen:5}));ok('swapNet: skatt + kurtasje = 9,76 %',r.kost_pct===9.76,JSON.stringify(r));ok('swapNet: 5,24 netto er ok',r.ok===true&&r.netto_pct===5.24,JSON.stringify(r));
 r=await sw(H({forventet:15}),PP({verdi:40000,gevinst:10000,gjen:5}));ok('swapNet: 0,24 netto er ikke ok',r.ok===false,JSON.stringify(r));
 r=await sw(H({forventet:10}),PP({verdi:40000,gevinst:-5000,gjen:2}));ok('swapNet: tap gir ingen skatt',r.kost_pct===0.3,JSON.stringify(r));
 r=await sw(H({forventet:10,cur:'USD',bors:'USA'}),PP({verdi:40000,gevinst:0,gjen:0}));ok('swapNet: utland og valuta på kjøpsbenet',r.kost_pct===0.6,JSON.stringify(r)); // 60 + 80 + 100 = 240
 r=await sw(H({forventet:10}),PP({verdi:5000,gevinst:0,gjen:0}));ok('swapNet: minstekurtasje 29 kr',r.kost_pct===1.16,JSON.stringify(r)); // 58/5000
 const TAPER={...BYTT,handlinger:[{...BYTT.handlinger[0],kjop:{...BYTT.handlinger[0].kjop,forventet_pct:1}}]};
 await open(D(MJ(TAPER)));await has('ulønnsomt bytte teller ikke','Ingenting å gjøre nå');await hasNot('ulønnsomt bytte vises ikke som kort','BYTT');
 await sub('ana');await has('ulønnsomt bytte forklares under Analyser','Ikke lønnsomt nok å bytte');
 // C4
 await open(D(MJ(M)));await sub('port');const tk=POS[0].tk,A=M.analyser.find(a=>a.ticker===tk);
 const pos=()=>page.evaluate(tk=>{const p=S.pf.pos.find(x=>x.tk===tk);return{stop:+p.stop,tgt:+p.tgt,stopU:!!p.stopU,tgtU:!!p.tgtU}},tk);
 let p0=await pos();ok('uten overstyring: motorens stopp og mål brukes',p0.stop===A.stopp&&p0.tgt===A.mal&&!p0.stopU&&!p0.tgtU,JSON.stringify([p0,A.stopp,A.mal]));
 await page.evaluate(tk=>{const p=S.pf.pos.find(x=>x.tk===tk);mUser(p.id,'stop',String(Math.round(p.px*0.5)))},tk);let p1=await pos();
 ok('bruker setter stopp → flagg',p1.stopU===true&&p1.stop!==A.stopp,JSON.stringify(p1));
 await page.evaluate(tk=>{pfSel=S.pf.pos.find(x=>x.tk===tk).id;render()},tk);await has('motorens forslag vises','Motorens forslag');await has('knapp Bruk motorens','Bruk motorens');
 await page.evaluate(m=>{mRead({exists:true,data:()=>({j:JSON.stringify(m),u:'y'})})},{...M,analyser:M.analyser.map(a=>a.ticker===tk?{...a,stopp:a.stopp*0.9,mal:a.mal*1.1}:a)});
 let p2=await pos();ok('ny motorkjøring rører ikke overstyrt stopp',p2.stop===p1.stop&&p2.stopU,JSON.stringify(p2));ok('ny motorkjøring oppdaterer mål som ikke er overstyrt',Math.abs(p2.tgt-A.mal*1.1)<1e-6,JSON.stringify(p2));
 await page.evaluate(tk=>{const p=S.pf.pos.find(x=>x.tk===tk);NNI={busy:0,rows:[{tk:p.tk,nm:p.nm,ex:p.ex,cur:p.cur,q:p.q+1,px:p.px,kurs:0,on:true}]};nnApply()},tk);
 let p3=await pos();ok('Nordnet-bilde beholder overstyring',p3.stop===p1.stop&&p3.stopU,JSON.stringify(p3));
 const pfDoc=await page.evaluate(()=>{wPf();const s=window.__SETS.filter(x=>/\/pf$/.test(x[0])).pop();return s?JSON.parse(s[1].j):null});
 const row=pfDoc&&pfDoc.beholdning.find(b=>b.ticker===tk);ok('pf-dokumentet har stopp_overstyrt og mal_overstyrt',!!row&&row.stopp_overstyrt===true&&row.mal_overstyrt===false,JSON.stringify(row));
 await page.evaluate(tk=>{mAuto(S.pf.pos.find(x=>x.tk===tk).id,'stop')},tk);let p4=await pos();ok('Bruk motorens fjerner flagget',!p4.stopU&&Math.abs(p4.stop-A.stopp*0.9)<1e-6,JSON.stringify(p4));
 // eksisterende egne tall før motoren regnes som overstyrt
 await open(D(MJ(M)),{tab:'p',sub:{p:'port'},pf:{pos:POS.map((p,i)=>i?p:{...p,stop:50,tgt:999})}});p0=await pos();
 ok('gamle egne tall beholdes som overstyrt',p0.stop===50&&p0.tgt===999&&p0.stopU&&p0.tgtU,JSON.stringify(p0));
 // C5
 await open(D(MJ(M)));await sub('ana');
 const sc=await page.evaluate(()=>[...document.querySelectorAll('.mscore')].map(e=>+e.textContent));
 ok('analyser: ett kort per analyse, høyest score først',sc.length===M.analyser.length&&sc.every((v,i)=>!i||sc[i-1]>=v),JSON.stringify(sc));
 await has('analyser: okse og bjørn','Okse');await page.locator('.mana summary').first().click();await page.waitForTimeout(100);await has('analyser: kilder','Kilder');await has('analyser: analysene bak','Fundamentalt');
 await sub('hist');await has('historikk: treffsikkerhet','Treffsikkerhet');await has('historikk: utvikling','Utvikling');
 await sub('chat');await has('chat-fanen finnes','Chat');
 for(const k of['na','port','ana','hist','chat']){await sub(k);for(const w of['Deep dive','deep dive','Mandagssjekk','Signaler'])await hasNot(k+': ingen «'+w+'»',w)}
 ok('ingen konsollfeil gjennom hele løpet',errs.length===0,errs.join(' || '));
 const cls=await page.evaluate(()=>{S.tab='p';render();const a=document.body.classList.contains('axm');S.tab='b';render();const b=document.body.classList.contains('axm');return[a,b]});
 ok('mørk stil bare i aksjefanen',cls[0]===true&&cls[1]===false,JSON.stringify(cls));
 if(process.argv[4]){await open(D(MJ(BYTT)));await page.screenshot({path:process.argv[4],fullPage:true})}
 await browser.close();console.log(bad?bad+' FEIL':'ALT OK');process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(1)});
