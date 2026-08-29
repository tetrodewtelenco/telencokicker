
const cfg = window.KICKER_CONFIG;
const supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const $ = s => document.querySelector(s);
let players = [], matches = [], matchType = "2v2";

function ts(m){ return m.played_at || m.created_at || m.inserted_at || m.updated_at || ""; }

async function fetchPlayers(){
  let {data,error}=await supabase.from("players").select("*").order("name");
  if(error) throw error;
  players=(data||[]).filter(p=>p.active!==false);
}

async function fetchMatches(){
  const fallbacks=["played_at","created_at","inserted_at","updated_at",null];
  let lastErr;
  for(const col of fallbacks){
    let q=supabase.from("matches").select("*");
    if(col) q=q.order(col,{ascending:false});
    else q=q.order("id",{ascending:false});
    const {data,error}=await q.limit(500);
    if(!error){matches=data||[];return}
    lastErr=error;
  }
  throw lastErr;
}

function getPlayer(id){return players.find(p=>String(p.id)===String(id))}
function pName(id){return getPlayer(id)?.name||"Onbekend"}

function compute(){
  const stats={};
  players.forEach(p=>stats[p.id]={rating:1000,w:0,l:0,m:0,streak:0,bestStreak:0,others:new Set()});
  const chronological=[...matches].sort((a,b)=>new Date(ts(a)||0)-new Date(ts(b)||0));
  for(const m of chronological){
    const a=[m.team_a_player1,m.team_a_player2].filter(Boolean);
    const b=[m.team_b_player1,m.team_b_player2].filter(Boolean);
    if(!a.length||!b.length||m.score_a==null||m.score_b==null||m.score_a===m.score_b) continue;
    const ar=a.reduce((s,id)=>s+(stats[id]?.rating||1000),0)/a.length;
    const br=b.reduce((s,id)=>s+(stats[id]?.rating||1000),0)/b.length;
    const ea=1/(1+10**((br-ar)/400));
    const sa=m.score_a>m.score_b?1:0;
    const d=32*(sa-ea);
    for(const id of a){ if(!stats[id]) continue; stats[id].rating+=d;stats[id].m++; sa?stats[id].w++:stats[id].l++;stats[id].streak=sa?Math.max(1,stats[id].streak+1):Math.min(-1,stats[id].streak-1);stats[id].bestStreak=Math.max(stats[id].bestStreak,stats[id].streak); [...a,...b].filter(x=>x!==id).forEach(x=>stats[id].others.add(x));}
    for(const id of b){ if(!stats[id]) continue; stats[id].rating-=d;stats[id].m++; !sa?stats[id].w++:stats[id].l++;stats[id].streak=!sa?Math.max(1,stats[id].streak+1):Math.min(-1,stats[id].streak-1);stats[id].bestStreak=Math.max(stats[id].bestStreak,stats[id].streak); [...a,...b].filter(x=>x!==id).forEach(x=>stats[id].others.add(x));}
  }
  return stats;
}

function render(){
  const st=compute();
  const ranked=players.map(p=>({p,s:st[p.id]})).sort((a,b)=>b.s.rating-a.s.rating);
  $("#ranking").innerHTML = ranked.length ? ranked.map((x,i)=>{
    const denom=Math.max(players.length-1,1); const variation=Math.round(x.s.others.size/denom*100);
    return `<div class="rank-row"><div class="pos">${i+1}</div><div><div class="name">${x.p.name}</div><div class="meta">${x.s.m} matchen · ${x.s.w}W ${x.s.l}L · ${variation}% variatie</div></div><div class="rating">${Math.round(x.s.rating)}</div><div class="delta">${x.s.m<10?"voorlopig":""}</div></div>`
  }).join("") : `<div class="empty">Nog geen spelers.</div>`;

  $("#matches").innerHTML = matches.length ? matches.slice(0,12).map(m=>{
    const a=[m.team_a_player1,m.team_a_player2].filter(Boolean).map(pName).join(" & ");
    const b=[m.team_b_player1,m.team_b_player2].filter(Boolean).map(pName).join(" & ");
    return `<div class="match-row"><div class="left">${a}</div><div class="score">${m.score_a} - ${m.score_b}</div><div>${b}</div></div>`
  }).join("") : `<div class="empty">Nog geen matchen.</div>`;

  const hot=ranked.filter(x=>x.s.streak>0).sort((a,b)=>b.s.streak-a.s.streak)[0];
  $("#hotStreak").textContent=hot?`${hot.p.name} · ${hot.s.streak}W`:"—";
  const vk=ranked.sort((a,b)=>b.s.others.size-a.s.others.size)[0];
  $("#variationKing").textContent=vk?vk.p.name:"—";
  if(matches[0]){
    const m=matches[0]; $("#lastMatchMini").textContent=`${m.score_a}-${m.score_b}`;
  } else $("#lastMatchMini").textContent="—";
  fillSelects();
}

function fillSelects(){
  ["a1","a2","b1","b2"].forEach(id=>{
    const el=$("#"+id); const prev=el.value;
    el.innerHTML=`<option value="">Kies speler</option>`+players.map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
    if([...el.options].some(o=>o.value===prev)) el.value=prev;
  })
}

async function reload(){
  $("#status").textContent="";
  try{ await fetchPlayers(); await fetchMatches(); render(); }
  catch(e){ $("#status").textContent="Database kon niet geladen worden: "+(e.message||e); }
}

$("#openMatch").onclick=()=>$("#matchDialog").showModal();
$("#openPlayer").onclick=()=>$("#playerDialog").showModal();

document.querySelectorAll(".toggle-btn").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".toggle-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active"); matchType=btn.dataset.type; $("#matchType").value=matchType;
  const one=matchType==="1v1";
  $("#a2").style.display=one?"none":"block"; $("#b2").style.display=one?"none":"block";
  $("#a2").required=!one; $("#b2").required=!one;
});

$("#matchForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const ids=[$("#a1").value,$("#b1").value];
  if(matchType==="2v2") ids.push($("#a2").value,$("#b2").value);
  if(new Set(ids).size!==ids.length){alert("Elke speler mag maar één keer in dezelfde match staan.");return}
  const scoreA=Number($("#scoreA").value), scoreB=Number($("#scoreB").value);
  if(scoreA===scoreB){alert("Een match kan niet gelijk eindigen.");return}
  const payload={
    team_a_player1:$("#a1").value,
    team_a_player2:matchType==="1v1"?null:$("#a2").value,
    team_b_player1:$("#b1").value,
    team_b_player2:matchType==="1v1"?null:$("#b2").value,
    score_a:scoreA, score_b:scoreB
  };
  // Add match_type only if database supports it
  let res=await supabase.from("matches").insert({...payload,match_type:matchType});
  if(res.error && /match_type/.test(res.error.message||"")){
    res=await supabase.from("matches").insert(payload);
  }
  if(res.error){alert(res.error.message);return}
  $("#matchDialog").close(); e.target.reset(); await reload();
});

$("#playerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const name=$("#playerName").value.trim(); if(!name)return;
  const {error}=await supabase.from("players").insert({name});
  if(error){alert(error.message);return}
  $("#playerDialog").close(); e.target.reset(); await reload();
});

supabase.channel("kicker-live")
.on("postgres_changes",{event:"*",schema:"public",table:"players"},reload)
.on("postgres_changes",{event:"*",schema:"public",table:"matches"},reload)
.subscribe();

reload();
