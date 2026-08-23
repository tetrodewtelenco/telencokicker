
const cfg=window.TELCO_CONFIG||{};
const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("PASTE_")&&cfg.SUPABASE_PUBLISHABLE_KEY&&!cfg.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");
const db=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY):null;
let players=[],matches=[],selected={a1:null,a2:null,b1:null,b2:null},activeSlot=null,currentProfile=null,editingMatch=null,isAdmin=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function toast(m){const e=$("#toast");e.textContent=m;e.classList.add("show");clearTimeout(window.__t);window.__t=setTimeout(()=>e.classList.remove("show"),2100)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function initials(n){return n.trim().split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}
function nav(p){$$(".page").forEach(x=>x.classList.toggle("active",x.id===p));$$("[data-nav]").forEach(x=>x.classList.toggle("active",x.dataset.nav===p));window.scrollTo({top:0,behavior:"smooth"})}
$$("[data-nav]").forEach(b=>b.onclick=()=>nav(b.dataset.nav));

function monthKey(d){d=new Date(d);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function monthName(key){const [y,m]=key.split("-").map(Number);return new Date(y,m-1,1).toLocaleDateString("nl-BE",{month:"long",year:"numeric"})}
function compute(matchSet=matches){
  const s={};players.filter(p=>p.active!==false).forEach(p=>s[p.id]={id:p.id,name:p.name,rating:1000,matches:0,wins:0,losses:0,streak:0,best:0,gf:0,ga:0});
  [...matchSet].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).forEach(m=>{
    const A=[m.team_a1,m.team_a2],B=[m.team_b1,m.team_b2]; if(![...A,...B].every(id=>s[id]))return;
    const ar=(s[A[0]].rating+s[A[1]].rating)/2,br=(s[B[0]].rating+s[B[1]].rating)/2,ea=1/(1+Math.pow(10,(br-ar)/400)),aa=m.score_a>m.score_b?1:0,d=32*(aa-ea);
    A.forEach(id=>{let x=s[id];x.rating+=d;x.matches++;x.gf+=m.score_a;x.ga+=m.score_b;if(aa){x.wins++;x.streak=x.streak>=0?x.streak+1:1;x.best=Math.max(x.best,x.streak)}else{x.losses++;x.streak=x.streak<=0?x.streak-1:-1}});
    B.forEach(id=>{let x=s[id];x.rating-=d;x.matches++;x.gf+=m.score_b;x.ga+=m.score_a;if(!aa){x.wins++;x.streak=x.streak>=0?x.streak+1:1;x.best=Math.max(x.best,x.streak)}else{x.losses++;x.streak=x.streak<=0?x.streak-1:-1}});
  });
  return Object.values(s).map(x=>({...x,rating:Math.round(x.rating),winpct:x.matches?Math.round(x.wins/x.matches*100):0}));
}
function statsForMode(){const mode=$("#rankingMode").value;if(mode==="all")return compute();const k=monthKey(new Date());return compute(matches.filter(m=>monthKey(m.created_at)===k))}
function rankSort(a,b){return b.rating-a.rating||b.winpct-a.winpct||b.matches-a.matches}

async function loadAll(){
  if(!db){$("#leaderboard").innerHTML='<div class="empty">Nog niet gekoppeld met Supabase. Vul <b>config.js</b> in.</div>';return}
  const [p,m,u]=await Promise.all([db.from("players").select("*").order("name"),db.from("matches").select("*").order("created_at",{ascending:true}),db.auth.getUser()]);
  if(p.error||m.error){console.error(p.error||m.error);return toast("Data laden mislukt")}
  players=p.data||[];matches=m.data||[];isAdmin=!!u.data?.user;render();renderAdmin();
}
function render(){
  const all=compute().sort(rankSort), shown=statsForMode().sort(rankSort), nowKey=monthKey(new Date());
  $("#seasonLabel").textContent=`${monthName(nowKey)} · 2 vs 2`;
  $("#leaderboard").innerHTML=shown.length?shown.map((s,i)=>`<div class="leader-row clickable" data-player="${s.id}"><div class="rank">${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div><div class="person"><strong>${esc(s.name)}</strong><small>${s.wins}W · ${s.losses}L · ${s.winpct}%${s.matches<10?" · voorlopig":""}</small></div><div class="rating"><strong>${s.rating}</strong><small>${s.streak>0?"🔥 W"+s.streak:s.streak<0?"L"+Math.abs(s.streak):"—"}</small></div></div>`).join(""):'<div class="empty">Nog geen spelers.</div>';
  $$("#leaderboard [data-player]").forEach(e=>e.onclick=()=>openProfile(e.dataset.player));
  const top=all[0];$("#topName").textContent=top?.name||"—";$("#topMeta").textContent=top?`${top.rating} ELO`:"—";
  const hot=[...all].filter(x=>x.streak>0).sort((a,b)=>b.streak-a.streak)[0];$("#streakName").textContent=hot?.name||"—";$("#streakMeta").textContent=hot?`W${hot.streak} op rij`:"—";
  $("#matchCount").textContent=matches.length;$("#monthCount").textContent=`${matches.filter(m=>monthKey(m.created_at)===nowKey).length} deze maand`;
  renderPlayers(all);renderHistory();renderFun(all);renderHall();updatePickers();if(currentProfile)openProfile(currentProfile,false);
}
function renderPlayers(stats){
  const map=Object.fromEntries(stats.map(x=>[x.id,x]));const q=$("#playersSearch").value.toLowerCase();
  const ps=players.filter(p=>p.active!==false&&p.name.toLowerCase().includes(q));
  $("#playersList").innerHTML=ps.length?ps.map(p=>{const s=map[p.id];return `<div class="player-row clickable" data-player="${p.id}"><div class="player-main"><div class="avatar">${initials(p.name)}</div><div><strong>${esc(p.name)}</strong><small>${s?.rating||1000} ELO · ${s?.matches||0} matchen</small></div></div>${isAdmin?`<button class="admin-link" data-deactivate="${p.id}">beheer</button>`:""}</div>`}).join(""):'<div class="empty">Geen spelers gevonden.</div>';
  $$("#playersList [data-player]").forEach(e=>e.onclick=ev=>{if(ev.target.dataset.deactivate)return;openProfile(e.dataset.player)});
  $$("[data-deactivate]").forEach(b=>b.onclick=async ev=>{ev.stopPropagation();const id=b.dataset.deactivate;if(!confirm("Speler deactiveren? Historiek blijft behouden."))return;const {error}=await db.from("players").update({active:false}).eq("id",id);if(error)return toast("Mislukt");toast("Speler gedeactiveerd");});
}
function renderHistory(){
  const n=Object.fromEntries(players.map(p=>[p.id,p.name]));
  $("#historyList").innerHTML=matches.length?[...matches].reverse().map(m=>{const a=`${n[m.team_a1]||"?"} + ${n[m.team_a2]||"?"}`,b=`${n[m.team_b1]||"?"} + ${n[m.team_b2]||"?"}`,aw=m.score_a>m.score_b,date=new Date(m.created_at).toLocaleString("nl-BE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});return `<div class="history-row"><div class="history-top"><small>${date}</small><strong>${m.score_a} – ${m.score_b}${isAdmin?`<button class="admin-link" data-edit="${m.id}">beheer</button>`:""}</strong></div><p><span class="${aw?"winner":""}">${esc(a)}</span><br><span class="${!aw?"winner":""}">${esc(b)}</span></p></div>`}).join(""):'<div class="empty">Nog geen matchen.</div>';
  $$("[data-edit]").forEach(b=>b.onclick=()=>openEditMatch(b.dataset.edit));
}
function relationData(pid){
  const mate={},opp={};
  matches.forEach(m=>{const A=[m.team_a1,m.team_a2],B=[m.team_b1,m.team_b2],inA=A.includes(pid),inB=B.includes(pid);if(!inA&&!inB)return;const won=inA?m.score_a>m.score_b:m.score_b>m.score_a;const partner=(inA?A:B).find(x=>x!==pid);mate[partner]??={m:0,w:0};mate[partner].m++;if(won)mate[partner].w++;(inA?B:A).forEach(o=>{opp[o]??={m:0,w:0};opp[o].m++;if(won)opp[o].w++})});
  return {mate,opp}
}
function renderFun(stats){
  if(!stats.length){$("#funStats").innerHTML='<div class="empty">Nog geen data.</div>';return}
  const most= [...stats].sort((a,b)=>b.matches-a.matches)[0],bestWin=[...stats].filter(x=>x.matches>=5).sort((a,b)=>b.winpct-a.winpct)[0],bestStreak=[...stats].sort((a,b)=>b.best-a.best)[0];
  let bestDuo=null;const d={};matches.forEach(m=>[[m.team_a1,m.team_a2,m.score_a>m.score_b],[m.team_b1,m.team_b2,m.score_b>m.score_a]].forEach(([x,y,w])=>{const k=[x,y].sort().join("|");d[k]??={ids:[x,y],m:0,w:0};d[k].m++;if(w)d[k].w++}));Object.values(d).filter(x=>x.m>=3).forEach(x=>{x.p=x.w/x.m;if(!bestDuo||x.p>bestDuo.p||x.p===bestDuo.p&&x.m>bestDuo.m)bestDuo=x});
  const names=Object.fromEntries(players.map(p=>[p.id,p.name]));
  $("#funStats").innerHTML=[
    ["🎮 Meeste matchen",most?`${esc(most.name)} · ${most.matches}`:"—"],
    ["🎯 Beste winrate",bestWin?`${esc(bestWin.name)} · ${bestWin.winpct}%`:"min. 5 matchen"],
    ["🔥 Beste streak",bestStreak?`${esc(bestStreak.name)} · W${bestStreak.best}`:"—"],
    ["🤝 Beste duo",bestDuo?`${esc(names[bestDuo.ids[0]])} + ${esc(names[bestDuo.ids[1]])} · ${Math.round(bestDuo.p*100)}%`:"min. 3 samen"]
  ].map(([a,b])=>`<div class="fun-card"><span>${a}</span><strong>${b}</strong></div>`).join("");
}
function renderHall(){
  const keys=[...new Set(matches.map(m=>monthKey(m.created_at)))].sort().reverse(),now=monthKey(new Date());
  const rows=keys.filter(k=>k!==now).map(k=>{const s=compute(matches.filter(m=>monthKey(m.created_at)===k)).sort(rankSort)[0];return s?`<div class="hall-row"><div><strong>${monthName(k)}</strong><br><small>${s.matches} matchen · ${s.winpct}% winrate</small></div><div><strong>🏆 ${esc(s.name)}</strong><br><small>${s.rating} maand-ELO</small></div></div>`:""}).join("");
  $("#hallList").innerHTML=rows||'<div class="empty">De eerste maandkampioen verschijnt na afloop van deze maand.</div>';
}
function openProfile(id,go=true){
  currentProfile=id;const all=compute().sort(rankSort),s=all.find(x=>x.id===id),p=players.find(x=>x.id===id);if(!s||!p)return;
  $("#profileAvatar").textContent=initials(p.name);$("#profileName").textContent=p.name;$("#profileElo").textContent=`${s.rating} ELO`;$("#profileRank").textContent=`#${all.findIndex(x=>x.id===id)+1}`;
  $("#profileCards").innerHTML=[["Matchen",s.matches],["Wins",s.wins],["Winrate",`${s.winpct}%`],["Beste streak",`W${s.best}`]].map(([a,b])=>`<div class="profile-card"><span>${a}</span><strong>${b}</strong></div>`).join("");
  const {mate,opp}=relationData(id),names=Object.fromEntries(players.map(x=>[x.id,x.name]));
  const arr=o=>Object.entries(o).map(([id,x])=>({id,...x,p:x.m?x.w/x.m:0}));const mates=arr(mate),opps=arr(opp);
  const bestMate=[...mates].filter(x=>x.m>=2).sort((a,b)=>b.p-a.p||b.m-a.m)[0],worstMate=[...mates].filter(x=>x.m>=2).sort((a,b)=>a.p-b.p||b.m-a.m)[0],nemesis=[...opps].filter(x=>x.m>=2).sort((a,b)=>a.p-b.p||b.m-a.m)[0],victim=[...opps].filter(x=>x.m>=2).sort((a,b)=>b.p-a.p||b.m-a.m)[0];
  const rel=[["🤝 Beste partner",bestMate],["🧊 Moeilijkste partner",worstMate],["☠️ Nemesis",nemesis],["🎯 Favoriete tegenstander",victim]];
  $("#profileRelations").innerHTML=rel.map(([l,x])=>`<div class="relation-row"><div><strong>${l}</strong><br><small>${x?esc(names[x.id]):"Nog te weinig data"}</small></div><div>${x?`<strong>${Math.round(x.p*100)}%</strong><br><small>${x.w}/${x.m} gewonnen</small>`:""}</div></div>`).join("");
  const relevant=matches.filter(m=>[m.team_a1,m.team_a2,m.team_b1,m.team_b2].includes(id)).slice(-8).reverse();
  $("#profileHistory").innerHTML=relevant.length?relevant.map(m=>{const inA=[m.team_a1,m.team_a2].includes(id),won=inA?m.score_a>m.score_b:m.score_b>m.score_a;return `<div class="relation-row"><div><strong>${won?"✅ Winst":"❌ Verlies"}</strong><br><small>${new Date(m.created_at).toLocaleDateString("nl-BE")}</small></div><div><strong>${m.score_a}–${m.score_b}</strong></div></div>`}).join(""):'<div class="empty">Nog geen matchen.</div>';
  if(go)nav("profile");
}
$("#backProfiles").onclick=()=>nav("players");$("#rankingMode").onchange=render;$("#playersSearch").oninput=()=>renderPlayers(compute());

$$(".player-picker").forEach(b=>b.onclick=()=>{activeSlot=b.dataset.slot;$("#playerSearch").value="";renderPicker("");$("#playerModal").classList.add("show")});
$("#playerSearch").oninput=e=>renderPicker(e.target.value);
function renderPicker(q){const used=new Set(Object.entries(selected).filter(([k,v])=>k!==activeSlot&&v).map(x=>x[1]));const ps=players.filter(p=>p.active!==false&&!used.has(p.id)&&p.name.toLowerCase().includes(q.toLowerCase()));$("#pickerList").innerHTML=ps.map(p=>`<button class="picker-item" data-id="${p.id}"><div class="avatar">${initials(p.name)}</div>${esc(p.name)}</button>`).join("")||'<div class="empty">Geen spelers.</div>';$$("#pickerList .picker-item").forEach(b=>b.onclick=()=>{selected[activeSlot]=b.dataset.id;$("#playerModal").classList.remove("show");updatePickers()})}
function updatePickers(){const n=Object.fromEntries(players.map(p=>[p.id,p.name]));$$(".player-picker").forEach(b=>{const id=selected[b.dataset.slot];b.textContent=id?n[id]:"+ Kies speler";b.classList.toggle("selected",!!id)})}

$("#saveMatchBtn").onclick=async()=>{if(!db)return toast("Koppel eerst Supabase");const ids=[selected.a1,selected.a2,selected.b1,selected.b2],a=parseInt($("#scoreA").value),b=parseInt($("#scoreB").value);if(ids.some(x=>!x))return toast("Kies 4 spelers");if(new Set(ids).size!==4)return toast("Elke speler maar 1 keer");if(Number.isNaN(a)||Number.isNaN(b))return toast("Geef de score in");if(a===b)return toast("Geen gelijkspel");const {error}=await db.from("matches").insert({team_a1:selected.a1,team_a2:selected.a2,team_b1:selected.b1,team_b2:selected.b2,score_a:a,score_b:b});if(error){console.error(error);return toast("Opslaan mislukt")}selected={a1:null,a2:null,b1:null,b2:null};$("#scoreA").value="";$("#scoreB").value="";toast("Match opgeslagen ✓");nav("home")};

$("#addPlayerBtn").onclick=()=>{$("#newPlayerName").value="";$("#addModal").classList.add("show")};
$("#createPlayerBtn").onclick=async()=>{const name=$("#newPlayerName").value.trim();if(!name)return toast("Vul een naam in");const {error}=await db.from("players").insert({name});if(error)return toast(error.code==="23505"?"Speler bestaat al":"Toevoegen mislukt");$("#addModal").classList.remove("show");toast("Speler toegevoegd")};

function renderAdmin(){$("#adminLoggedOut").hidden=isAdmin;$("#adminLoggedIn").hidden=!isAdmin}
$("#adminBtn").onclick=()=>{$("#adminModal").classList.add("show");renderAdmin()};
$("#adminLoginBtn").onclick=async()=>{const email=$("#adminEmail").value.trim(),password=$("#adminPassword").value;const {error}=await db.auth.signInWithPassword({email,password});if(error)return toast("Login mislukt");isAdmin=true;renderAdmin();toast("Adminmodus actief");render()};
$("#adminLogoutBtn").onclick=async()=>{await db.auth.signOut();isAdmin=false;renderAdmin();render();toast("Uitgelogd")};

function openEditMatch(id){editingMatch=matches.find(m=>m.id===id);if(!editingMatch)return;const n=Object.fromEntries(players.map(p=>[p.id,p.name]));$("#editMatchText").textContent=`${n[editingMatch.team_a1]} + ${n[editingMatch.team_a2]} vs ${n[editingMatch.team_b1]} + ${n[editingMatch.team_b2]}`;$("#editScoreA").value=editingMatch.score_a;$("#editScoreB").value=editingMatch.score_b;$("#editMatchModal").classList.add("show")}
$("#updateMatchBtn").onclick=async()=>{const a=parseInt($("#editScoreA").value),b=parseInt($("#editScoreB").value);if(a===b||Number.isNaN(a)||Number.isNaN(b))return toast("Ongeldige score");const {error}=await db.from("matches").update({score_a:a,score_b:b}).eq("id",editingMatch.id);if(error)return toast("Aanpassen mislukt");$("#editMatchModal").classList.remove("show");toast("Match aangepast")};
$("#deleteMatchBtn").onclick=async()=>{if(!confirm("Match definitief verwijderen?"))return;const {error}=await db.from("matches").delete().eq("id",editingMatch.id);if(error)return toast("Verwijderen mislukt");$("#editMatchModal").classList.remove("show");toast("Match verwijderd")};

$$(".modal .close").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("show"));$$(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("show")});
$("#syncBtn").onclick=loadAll;

if(db){db.channel("telco-kicker-live").on("postgres_changes",{event:"*",schema:"public",table:"players"},()=>loadAll()).on("postgres_changes",{event:"*",schema:"public",table:"matches"},()=>loadAll()).subscribe()}
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
loadAll();
