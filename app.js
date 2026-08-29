const cfg = window.TELCO_CONFIG || {};
const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
let players = [], matches = [];
const $ = s => document.querySelector(s);

function esc(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function initials(n){return n.trim().split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove("show"),2200)}
function pName(id){return players.find(p=>p.id===id)?.name || "Onbekend"}

async function load(){
  $("#errorBox").hidden = true;
  try{
    const [p,m] = await Promise.all([
      db.from("players").select("id,name,created_at").order("name",{ascending:true}),
      db.from("matches").select("id,team_a1,team_a2,team_b1,team_b2,score_a,score_b,created_at").order("created_at",{ascending:true})
    ]);
    if(p.error) throw p.error;
    if(m.error) throw m.error;
    players = p.data || [];
    matches = m.data || [];
    render();
    fillSelects();
  }catch(err){
    console.error(err);
    $("#errorBox").textContent = "Database kon niet geladen worden: " + (err.message || err);
    $("#errorBox").hidden = false;
    $("#leaderboard").innerHTML = '<div class="empty-row">Geen data geladen.</div>';
    $("#history").innerHTML = '<div class="empty-row">Geen data geladen.</div>';
  }
}

function compute(){
  const s = {};
  players.forEach(p=>s[p.id]={...p,rating:1000,matches:0,wins:0,losses:0,streak:0,bestStreak:0});
  [...matches].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).forEach(m=>{
    const A=[m.team_a1,m.team_a2], B=[m.team_b1,m.team_b2];
    if(![...A,...B].every(id=>s[id])) return;
    const ar=(s[A[0]].rating+s[A[1]].rating)/2;
    const br=(s[B[0]].rating+s[B[1]].rating)/2;
    const expected=1/(1+Math.pow(10,(br-ar)/400));
    const aWin=m.score_a>m.score_b;
    const delta=32*((aWin?1:0)-expected);
    A.forEach(id=>{
      const x=s[id];x.rating+=delta;x.matches++;
      if(aWin){x.wins++;x.streak=x.streak>=0?x.streak+1:1;x.bestStreak=Math.max(x.bestStreak,x.streak)}
      else{x.losses++;x.streak=x.streak<=0?x.streak-1:-1}
    });
    B.forEach(id=>{
      const x=s[id];x.rating-=delta;x.matches++;
      if(!aWin){x.wins++;x.streak=x.streak>=0?x.streak+1:1;x.bestStreak=Math.max(x.bestStreak,x.streak)}
      else{x.losses++;x.streak=x.streak<=0?x.streak-1:-1}
    });
  });
  return Object.values(s).map(x=>({...x,rating:Math.round(x.rating),winpct:x.matches?Math.round(x.wins/x.matches*100):0}));
}

function render(){
  const stats=compute().sort((a,b)=>b.rating-a.rating||b.winpct-a.winpct||b.matches-a.matches);
  renderPodium(stats);
  renderStats(stats);
  renderRanking(stats);
  renderHistory();
}

function podiumCard(s,pos){
  if(!s) return `<article class="podium-card"><div class="empty-row">Vrije plek</div></article>`;
  const medal=pos===1?"🥇":pos===2?"🥈":"🥉";
  return `<article class="podium-card ${pos===1?"first":""}">
    <div class="rank-no">NUMMER ${pos}</div><div class="medal">${medal}</div>
    <div class="avatar">${initials(s.name)}</div>
    <h3>${esc(s.name)}</h3>
    <div class="elo">${s.rating} <small style="font-size:.45em;color:#899087">ELO</small></div>
    <div class="meta">${s.wins}W · ${s.losses}L · ${s.winpct}% winrate</div>
  </article>`
}
function renderPodium(stats){
  $("#podium").innerHTML = [stats[1] ? podiumCard(stats[1],2):podiumCard(null,2), podiumCard(stats[0],1), stats[2]?podiumCard(stats[2],3):podiumCard(null,3)].join("");
}
function renderStats(stats){
  const hot=[...stats].filter(s=>s.streak>0).sort((a,b)=>b.streak-a.streak)[0];
  const active=[...stats].sort((a,b)=>b.matches-a.matches)[0];
  const qualified=stats.filter(s=>s.matches>=3);
  const win=[...qualified].sort((a,b)=>b.winpct-a.winpct||b.matches-a.matches)[0];
  $("#statStrip").innerHTML=`
    <article><span>🔥 Hot streak</span><strong>${hot?esc(hot.name):"—"}</strong><small>${hot?hot.streak+" wins op rij":"nog geen streak"}</small></article>
    <article><span>⚡ Meest actief</span><strong>${active?esc(active.name):"—"}</strong><small>${active?active.matches+" matchen":"nog geen matchen"}</small></article>
    <article><span>🎯 Winrate king</span><strong>${win?esc(win.name):"—"}</strong><small>${win?win.winpct+"% winrate · min. 3":"min. 3 matchen"}</small></article>
    <article><span>⚔️ Matchen</span><strong>${matches.length}</strong><small>totaal geregistreerd</small></article>`;
}
function renderRanking(stats){
  $("#leaderboard").innerHTML = stats.length ? stats.map((s,i)=>`
    <div class="rank-row">
      <div class="rank-pos">${i+1}</div>
      <div class="player-cell"><div class="mini-avatar">${initials(s.name)}</div><div><strong>${esc(s.name)}</strong><small>${s.matches} matchen · ${s.wins}W ${s.losses}L · ${s.winpct}%${s.matches<10?" · voorlopig":""}</small></div></div>
      <div class="form ${s.streak>=2?"hot":""}">${s.streak>0?"W"+s.streak:s.streak<0?"L"+Math.abs(s.streak):"—"}</div>
      <div class="elo-cell">${s.rating}</div>
    </div>`).join("") : '<div class="empty-row">Nog geen spelers. Voeg er eentje toe.</div>';
}
function renderHistory(){
  const recent=[...matches].reverse().slice(0,10);
  $("#history").innerHTML = recent.length ? recent.map(m=>{
    const a=`${pName(m.team_a1)} & ${pName(m.team_a2)}`;
    const b=`${pName(m.team_b1)} & ${pName(m.team_b2)}`;
    const aWin=m.score_a>m.score_b;
    const date=new Date(m.created_at).toLocaleString("nl-BE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    return `<article class="match-card">
      <div class="match-date">${esc(date.toUpperCase())}</div>
      <div class="match-result">
        <div class="match-team ${aWin?"winner":""}">${esc(a)}</div>
        <div class="match-score">${m.score_a}–${m.score_b}</div>
        <div class="match-team right ${!aWin?"winner":""}">${esc(b)}</div>
      </div>
    </article>`
  }).join("") : '<div class="empty-row">Nog geen matchen. Tijd om de eerste te spelen.</div>';
}
function fillSelects(){
  ["a1","a2","b1","b2"].forEach(id=>{
    const el=$("#"+id),old=el.value;
    el.innerHTML='<option value="">Kies speler</option>'+players.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
    if([...el.options].some(o=>o.value===old))el.value=old;
  });
}
function openDialog(d){d.showModal()}
function closeDialog(d){d.close()}
document.querySelectorAll("[data-open-match]").forEach(b=>b.onclick=()=>openDialog($("#matchDialog")));
$("#addPlayerBtn").onclick=()=>openDialog($("#playerDialog"));
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeDialog(b.closest("dialog")));
$("#refreshBtn").onclick=async()=>{await load();toast("Ranking vernieuwd")};

$("#matchForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const ids=["a1","a2","b1","b2"].map(id=>$("#"+id).value);
  const scoreA=Number($("#scoreA").value),scoreB=Number($("#scoreB").value);
  $("#matchError").textContent="";
  if(ids.some(x=>!x)){ $("#matchError").textContent="Kies vier spelers."; return; }
  if(new Set(ids).size!==4){ $("#matchError").textContent="Elke speler mag maar één keer in dezelfde match staan."; return; }
  if(scoreA===scoreB){ $("#matchError").textContent="Een match kan niet gelijk eindigen."; return; }
  if(scoreA<0||scoreB<0||scoreA>50||scoreB>50){ $("#matchError").textContent="Geef een geldige score in."; return; }
  const payload={team_a1:ids[0],team_a2:ids[1],team_b1:ids[2],team_b2:ids[3],score_a:scoreA,score_b:scoreB};
  const {error}=await db.from("matches").insert(payload);
  if(error){console.error(error);$("#matchError").textContent="Opslaan mislukt: "+error.message;return}
  e.target.reset(); closeDialog($("#matchDialog")); toast("Match opgeslagen ✓"); await load();
});

$("#playerForm").addEventListener("submit",async e=>{
  e.preventDefault(); $("#playerError").textContent="";
  const name=$("#playerName").value.trim();
  if(!name)return;
  const {error}=await db.from("players").insert({name});
  if(error){console.error(error);$("#playerError").textContent=error.code==="23505"?"Die speler bestaat al.":"Toevoegen mislukt: "+error.message;return}
  e.target.reset();closeDialog($("#playerDialog"));toast("Speler toegevoegd");await load();
});

try{
  db.channel("kicker-home-live")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"matches"},()=>load())
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"players"},()=>load())
    .subscribe();
}catch(e){console.warn("Realtime niet actief; handmatig vernieuwen blijft werken.",e)}
load();
