const cfg=window.TELCO_CONFIG||{};
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
let players=[],matches=[],lastSeen=null;
const $=s=>document.querySelector(s);
function initials(n){return n.trim().split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function pName(id){return players.find(p=>p.id===id)?.name||"Onbekend"}
function compute(){
 const s={};players.forEach(p=>s[p.id]={...p,rating:1000,matches:0,wins:0,losses:0,streak:0});
 [...matches].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).forEach(m=>{
   const A=[m.team_a1,m.team_a2],B=[m.team_b1,m.team_b2];if(![...A,...B].every(id=>s[id]))return;
   const ar=(s[A[0]].rating+s[A[1]].rating)/2,br=(s[B[0]].rating+s[B[1]].rating)/2,ea=1/(1+Math.pow(10,(br-ar)/400)),aw=m.score_a>m.score_b,d=32*((aw?1:0)-ea);
   A.forEach(id=>{const x=s[id];x.rating+=d;x.matches++;if(aw){x.wins++;x.streak=x.streak>=0?x.streak+1:1}else{x.losses++;x.streak=x.streak<=0?x.streak-1:-1}});
   B.forEach(id=>{const x=s[id];x.rating-=d;x.matches++;if(!aw){x.wins++;x.streak=x.streak>=0?x.streak+1:1}else{x.losses++;x.streak=x.streak<=0?x.streak-1:-1}});
 });
 return Object.values(s).map(x=>({...x,rating:Math.round(x.rating),winpct:x.matches?Math.round(x.wins/x.matches*100):0})).sort((a,b)=>b.rating-a.rating||b.winpct-a.winpct);
}
function pod(s,pos){if(!s)return `<div class="pod"><h2>—</h2></div>`;return `<article class="pod ${pos===1?"first":""}"><div class="pos">NUMMER ${pos}</div><div class="medal">${pos===1?"🥇":pos===2?"🥈":"🥉"}</div><div class="avatar">${initials(s.name)}</div><h2>${s.name}</h2><div class="elo">${s.rating}</div><small>${s.wins}W · ${s.losses}L · ${s.winpct}%</small></article>`}
function render(){
 const r=compute();$("#podium").innerHTML=[pod(r[1],2),pod(r[0],1),pod(r[2],3)].join("");
 const hot=[...r].filter(x=>x.streak>0).sort((a,b)=>b.streak-a.streak)[0];$("#hot").textContent=hot?.name||"—";$("#hotMeta").textContent=hot?`${hot.streak} wins op rij`:"—";
 const active=[...r].sort((a,b)=>b.matches-a.matches)[0];$("#active").textContent=active?.name||"—";$("#activeMeta").textContent=active?`${active.matches} matchen`:"—";
 const q=r.filter(x=>x.matches>=3).sort((a,b)=>b.winpct-a.winpct)[0];$("#win").textContent=q?.name||"—";$("#winMeta").textContent=q?`${q.winpct}% winrate`:"min. 3 matchen";
 const m=matches[matches.length-1];$("#last").textContent=m?`${m.score_a} – ${m.score_b}`:"—";$("#lastMeta").textContent=m?`${pName(m.team_a1)} & ${pName(m.team_a2)} vs ${pName(m.team_b1)} & ${pName(m.team_b2)}`:"—";
}
async function load(showNew=false){
 try{
  const [p,m]=await Promise.all([db.from("players").select("id,name,created_at").order("name"),db.from("matches").select("id,team_a1,team_a2,team_b1,team_b2,score_a,score_b,created_at").order("created_at",{ascending:true})]);
  if(p.error)throw p.error;if(m.error)throw m.error;players=p.data||[];matches=m.data||[];render();
  const latest=matches[matches.length-1];if(showNew&&latest&&lastSeen&&latest.id!==lastSeen){showFlash(latest)}lastSeen=latest?.id||lastSeen;
 }catch(e){console.error(e);$("#error").textContent="Database kon niet geladen worden: "+(e.message||e)}
}
function showFlash(m){$("#flashTeams").textContent=`${pName(m.team_a1)} & ${pName(m.team_a2)}  vs  ${pName(m.team_b1)} & ${pName(m.team_b2)}`;$("#flashScore").textContent=`${m.score_a} – ${m.score_b}`;$("#flash").classList.add("show");setTimeout(()=>$("#flash").classList.remove("show"),6500)}
function clock(){$("#clock").textContent=new Date().toLocaleTimeString("nl-BE",{hour:"2-digit",minute:"2-digit"})}clock();setInterval(clock,1000);
try{db.channel("kicker-tv-live").on("postgres_changes",{event:"INSERT",schema:"public",table:"matches"},()=>load(true)).subscribe()}catch(e){}
load(false);setInterval(()=>load(true),15000);
