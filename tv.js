
const cfg=window.KICKER_CONFIG;
const supabase=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
let players=[],matches=[];
const $=s=>document.querySelector(s);
const ts=m=>m.played_at||m.created_at||m.inserted_at||m.updated_at||"";
const pName=id=>players.find(p=>String(p.id)===String(id))?.name||"Onbekend";

async function fetchPlayers(){const {data,error}=await supabase.from("players").select("*").order("name");if(error)throw error;players=(data||[]).filter(p=>p.active!==false)}
async function fetchMatches(){
  let lastErr;
  for(const col of ["played_at","created_at","inserted_at","updated_at",null]){
    let q=supabase.from("matches").select("*");
    q=col?q.order(col,{ascending:false}):q.order("id",{ascending:false});
    const {data,error}=await q.limit(500);
    if(!error){matches=data||[];return}
    lastErr=error;
  } throw lastErr;
}
function stats(){
 const s={};players.forEach(p=>s[p.id]={rating:1000,m:0,w:0,streak:0,others:new Set()});
 for(const m of [...matches].sort((a,b)=>new Date(ts(a)||0)-new Date(ts(b)||0))){
   const a=[m.team_a_player1,m.team_a_player2].filter(Boolean),b=[m.team_b_player1,m.team_b_player2].filter(Boolean);
   if(!a.length||!b.length||m.score_a==null||m.score_b==null||m.score_a===m.score_b)continue;
   const ar=a.reduce((x,id)=>x+(s[id]?.rating||1000),0)/a.length, br=b.reduce((x,id)=>x+(s[id]?.rating||1000),0)/b.length;
   const ea=1/(1+10**((br-ar)/400)),sa=m.score_a>m.score_b?1:0,d=32*(sa-ea);
   for(const id of a){if(!s[id])continue;s[id].rating+=d;s[id].m++;s[id].w+=sa;s[id].streak=sa?Math.max(1,s[id].streak+1):Math.min(-1,s[id].streak-1);[...a,...b].filter(x=>x!==id).forEach(x=>s[id].others.add(x))}
   for(const id of b){if(!s[id])continue;s[id].rating-=d;s[id].m++;s[id].w+=1-sa;s[id].streak=!sa?Math.max(1,s[id].streak+1):Math.min(-1,s[id].streak-1);[...a,...b].filter(x=>x!==id).forEach(x=>s[id].others.add(x))}
 }
 return s;
}
function render(){
 const s=stats();const r=players.map(p=>({p,s:s[p.id]})).sort((a,b)=>b.s.rating-a.s.rating);
 $("#podium").innerHTML=r.slice(0,3).map((x,i)=>`<div class="pod"><div class="pos">${i+1}</div><div class="name">${x.p.name}</div><div class="rating">${Math.round(x.s.rating)} ELO · ${x.s.m} matchen</div></div>`).join("")||"<div class='pod'>Nog geen spelers</div>";
 const hot=[...r].filter(x=>x.s.streak>0).sort((a,b)=>b.s.streak-a.s.streak)[0];$("#streak").textContent=hot?`${hot.p.name} · ${hot.s.streak}W`:"—";
 const pr=[...r].sort((a,b)=>a.s.m-b.s.m).slice(0,3);$("#priority").textContent=pr.map(x=>x.p.name).join(" · ")||"—";
 const vk=[...r].sort((a,b)=>b.s.others.size-a.s.others.size)[0];$("#variation").textContent=vk?vk.p.name:"—";
 if(matches[0]){const m=matches[0];$("#last").textContent=`${pName(m.team_a_player1)} ${m.score_a}-${m.score_b} ${pName(m.team_b_player1)}`}else $("#last").textContent="—";
}
async function reload(){try{$("#status").textContent="";await fetchPlayers();await fetchMatches();render()}catch(e){$("#status").textContent="Database kon niet geladen worden: "+(e.message||e)}}
supabase.channel("tv-live").on("postgres_changes",{event:"*",schema:"public",table:"players"},reload).on("postgres_changes",{event:"*",schema:"public",table:"matches"},reload).subscribe();
reload();
