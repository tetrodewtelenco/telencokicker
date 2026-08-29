const cfg=window.TELCO_CONFIG||{};
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
let players=[],matches=[],mode="2v2",currentProfileId=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const initials=n=>n.trim().split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
const pBy=id=>players.find(p=>String(p.id)===String(id));
const pName=id=>pBy(id)?.name||"Onbekend";
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(window.__t);window.__t=setTimeout(()=>t.classList.remove("show"),2200)};
function avatar(p,cls="mini-avatar"){return `<div class="${cls}">${p?.photo_url?`<img src="${esc(p.photo_url)}" alt="">`:initials(p?.name||"?")}</div>`}

async function load(){
  $("#errorBox").hidden=true;
  try{
    const [pr,mr]=await Promise.all([
      db.from("players").select("id,name,created_at,photo_url,active").order("name"),
      db.from("matches").select("id,team_a1,team_a2,team_b1,team_b2,score_a,score_b,created_at,match_type").order("created_at",{ascending:true})
    ]);
    if(pr.error) throw pr.error;if(mr.error) throw mr.error;
    players=(pr.data||[]).filter(p=>p.active!==false);
    matches=mr.data||[];
    render();fillSelects();
  }catch(e){
    console.error(e);$("#errorBox").hidden=false;$("#errorBox").textContent="Database kon niet geladen worden: "+(e.message||e);
  }
}

function compute(){
  const s={};players.forEach(p=>s[p.id]={...p,rating:1000,m:0,w:0,l:0,streak:0,best:0,others:new Set(),partners:{},opponents:{}});
  [...matches].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).forEach(m=>{
    const A=[m.team_a1,m.team_a2].filter(Boolean),B=[m.team_b1,m.team_b2].filter(Boolean);
    if(!A.length||!B.length||![...A,...B].every(id=>s[id])||m.score_a===m.score_b)return;
    const ar=A.reduce((z,id)=>z+s[id].rating,0)/A.length,br=B.reduce((z,id)=>z+s[id].rating,0)/B.length;
    const ea=1/(1+Math.pow(10,(br-ar)/400)),aw=m.score_a>m.score_b,d=32*((aw?1:0)-ea);
    const apply=(ids,opp,win,delta)=>{
      ids.forEach(id=>{const x=s[id];x.rating+=delta;x.m++;win?x.w++:x.l++;x.streak=win?(x.streak>=0?x.streak+1:1):(x.streak<=0?x.streak-1:-1);x.best=Math.max(x.best,x.streak);
        [...ids,...opp].filter(o=>o!==id).forEach(o=>x.others.add(o));
        ids.filter(o=>o!==id).forEach(o=>{x.partners[o]=x.partners[o]||{w:0,l:0};win?x.partners[o].w++:x.partners[o].l++});
        opp.forEach(o=>{x.opponents[o]=x.opponents[o]||{w:0,l:0};win?x.opponents[o].w++:x.opponents[o].l++});
      })
    };
    apply(A,B,aw,d);apply(B,A,!aw,-d);
  });
  return Object.values(s).map(x=>({...x,rating:Math.round(x.rating),winpct:x.m?Math.round(x.w/x.m*100):0,variation:players.length>1?Math.round(x.others.size/(players.length-1)*100):0}));
}
function ranked(){return compute().sort((a,b)=>b.rating-a.rating||b.winpct-a.winpct||b.m-a.m)}
function podCard(s,pos){if(!s)return`<article class="pod"><h3>Vrije plek</h3></article>`;return`<article class="pod ${pos===1?"first":""}"><div class="medal">${pos===1?"🥇":pos===2?"🥈":"🥉"}</div>${avatar(s,"avatar")}<h3>${esc(s.name)}</h3><div class="elo">${s.rating} ELO</div><div class="meta">${s.w}W · ${s.l}L · ${s.winpct}%</div></article>`}
function render(){
  const r=ranked();
  $("#podium").innerHTML=[podCard(r[1],2),podCard(r[0],1),podCard(r[2],3)].join("");
  const hot=[...r].filter(x=>x.streak>0).sort((a,b)=>b.streak-a.streak)[0];
  const active=[...r].sort((a,b)=>b.m-a.m)[0];
  const vk=[...r].sort((a,b)=>b.variation-a.variation)[0];
  const win=[...r].filter(x=>x.m>=3).sort((a,b)=>b.winpct-a.winpct)[0];
  $("#statsGrid").innerHTML=[
    ["🔥 Hot streak",hot?.name||"—",hot?`${hot.streak} wins op rij`:"nog geen streak"],
    ["⚡ Meest actief",active?.name||"—",active?`${active.m} matchen`:"—"],
    ["👑 Variation king",vk?.name||"—",vk?`${vk.variation}% variatie`:"—"],
    ["🎯 Winrate king",win?.name||"—",win?`${win.winpct}% · min. 3`:"min. 3 matchen"]
  ].map(x=>`<article class="stat"><span>${x[0]}</span><strong>${esc(x[1])}</strong><small>${x[2]}</small></article>`).join("");

  $("#leaderboard").innerHTML=r.length?r.map((s,i)=>`<div class="rank-row" data-player="${s.id}"><div class="rank-pos">${i+1}</div><div class="player">${avatar(s)}<div><strong>${esc(s.name)}</strong><small>${s.m} matchen · ${s.w}W ${s.l}L · ${s.winpct}% · ${s.variation}% variatie${s.m<10?" · voorlopig":""}</small></div></div><div class="form ${s.streak>=2?"hot":""}">${s.streak>0?"W"+s.streak:s.streak<0?"L"+Math.abs(s.streak):"—"}</div><div class="elo">${s.rating}</div></div>`).join(""):`<div style="padding:20px;color:#777">Nog geen spelers.</div>`;
  document.querySelectorAll("[data-player]").forEach(el=>el.onclick=()=>openProfile(el.dataset.player,r));

  const recent=[...matches].reverse().slice(0,10);
  $("#history").innerHTML=recent.length?recent.map(m=>{const A=[m.team_a1,m.team_a2].filter(Boolean).map(pName).join(" & "),B=[m.team_b1,m.team_b2].filter(Boolean).map(pName).join(" & "),aw=m.score_a>m.score_b,d=new Date(m.created_at).toLocaleString("nl-BE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});return`<article class="match"><div class="date">${esc(d.toUpperCase())} · ${(m.match_type||(!m.team_a2?"1v1":"2v2")).toUpperCase()}</div><div class="result"><div class="teamname ${aw?"winner":""}">${esc(A)}</div><div class="score">${m.score_a}–${m.score_b}</div><div class="teamname right ${!aw?"winner":""}">${esc(B)}</div></div></article>`}).join(""):`<div style="padding:20px;color:#777">Nog geen matchen.</div>`;

  const least=[...r].sort((a,b)=>a.m-b.m).slice(0,3);
  $("#recommendations").innerHTML=least.map(s=>`<article class="rec"><strong>${esc(s.name)}</strong><small>${s.m} matchen · ${s.variation}% variatie</small><small>Geef deze speler wat tafelminuten 👀</small></article>`).join("");
}
function openProfile(id,r){
  currentProfileId=id;
  const s=r.find(x=>String(x.id)===String(id));if(!s)return;
  $("#profileName").textContent=s.name;
  const bestPartner=Object.entries(s.partners).sort((a,b)=>(b[1].w-b[1].l)-(a[1].w-a[1].l))[0];
  const nemesis=Object.entries(s.opponents).sort((a,b)=>b[1].l-a[1].l)[0];
  const favorite=Object.entries(s.opponents).sort((a,b)=>b[1].w-a[1].w)[0];
  const recent=matches.filter(m=>[m.team_a1,m.team_a2,m.team_b1,m.team_b2].includes(s.id)).slice(-5).reverse();
  $("#profileContent").innerHTML=`<div class="profile-top">${avatar(s,"profile-avatar")}<div><div style="font-size:34px;font-weight:950">${s.rating} ELO</div><div class="meta">${s.m} matchen · ${s.winpct}% winrate · ${s.variation}% variation</div></div></div>
  <div class="profile-stats">
    <div class="profile-stat"><span>WINS</span><strong>${s.w}</strong></div><div class="profile-stat"><span>LOSSES</span><strong>${s.l}</strong></div>
    <div class="profile-stat"><span>STREAK</span><strong>${s.streak>0?"W"+s.streak:s.streak<0?"L"+Math.abs(s.streak):"—"}</strong></div><div class="profile-stat"><span>BEST</span><strong>${s.best||0}W</strong></div>
  </div>
  <div class="profile-list"><h3>Rivalries</h3>
    <div class="profile-row"><span>Beste partner</span><strong>${bestPartner?pName(bestPartner[0]):"—"}</strong></div>
    <div class="profile-row"><span>Nemesis</span><strong>${nemesis?pName(nemesis[0]):"—"}</strong></div>
    <div class="profile-row"><span>Favoriete tegenstander</span><strong>${favorite?pName(favorite[0]):"—"}</strong></div>
  </div>
  <div class="profile-list"><h3>Recente matchen</h3>${recent.map(m=>`<div class="profile-row"><span>${[m.team_a1,m.team_a2].includes(s.id)?[m.team_a1,m.team_a2].filter(Boolean).map(pName).join(" & "):[m.team_b1,m.team_b2].filter(Boolean).map(pName).join(" & ")}</span><strong>${m.score_a}–${m.score_b}</strong></div>`).join("")||"<div class='meta'>Nog geen matchen.</div>"}</div>`;
  $("#profileDialog").showModal();
}
function fillSelects(){["a1","a2","b1","b2"].forEach(id=>{$("#"+id).innerHTML='<option value="">Kies speler</option>'+players.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")})}
document.querySelectorAll("[data-open-match]").forEach(b=>b.onclick=()=>$("#matchDialog").showModal());
$("#addPlayerBtn").onclick=()=>$("#playerDialog").showModal();
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());
$("#refreshBtn").onclick=async()=>{await load();toast("Ranking vernieuwd")};
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll(".mode").forEach(x=>x.classList.toggle("active",x===b));const one=mode==="1v1";$("#a2").style.display=one?"none":"block";$("#b2").style.display=one?"none":"block";$("#a2").required=!one;$("#b2").required=!one});
$("#matchForm").addEventListener("submit",async e=>{e.preventDefault();$("#matchError").textContent="";const ids=[$("#a1").value,$("#b1").value],A2=$("#a2").value,B2=$("#b2").value;if(mode==="2v2")ids.push(A2,B2);if(ids.some(x=>!x)){ $("#matchError").textContent="Kies alle spelers.";return}if(new Set(ids).size!==ids.length){$("#matchError").textContent="Elke speler mag maar één keer meedoen.";return}const a=Number($("#scoreA").value),b=Number($("#scoreB").value);if(a===b){$("#matchError").textContent="Geen gelijkspel mogelijk.";return}
 const payload={team_a1:$("#a1").value,team_a2:mode==="1v1"?null:A2,team_b1:$("#b1").value,team_b2:mode==="1v1"?null:B2,score_a:a,score_b:b,match_type:mode};
 const {error}=await db.from("matches").insert(payload);if(error){$("#matchError").textContent=error.message;return}e.target.reset();$("#matchDialog").close();toast("Match opgeslagen ✓");await load()});
$("#playerForm").addEventListener("submit",async e=>{e.preventDefault();$("#playerError").textContent="";const name=$("#playerName").value.trim();if(!name)return;let photo_url=null;const f=$("#playerPhoto").files[0];if(f){const ext=(f.name.split(".").pop()||"jpg").toLowerCase();const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const up=await db.storage.from("avatars").upload(path,f,{upsert:false});if(up.error){$("#playerError").textContent="Foto upload mislukt: "+up.error.message;return}photo_url=db.storage.from("avatars").getPublicUrl(path).data.publicUrl}
 const {error}=await db.from("players").insert({name,photo_url});if(error){$("#playerError").textContent=error.message;return}e.target.reset();$("#playerDialog").close();toast("Speler toegevoegd");await load()});

$("#changePhotoBtn").onclick=()=>$("#profilePhotoInput").click();

$("#profilePhotoInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];
  if(!file || !currentProfileId) return;

  $("#profilePhotoError").textContent="";
  $("#changePhotoBtn").disabled=true;
  $("#changePhotoBtn").textContent="Foto uploaden…";

  try{
    if(!file.type.startsWith("image/")) throw new Error("Kies een geldig afbeeldingsbestand.");
    if(file.size > 8*1024*1024) throw new Error("Foto is te groot. Maximum 8 MB.");

    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
    const path=`${currentProfileId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext||"jpg"}`;

    const up=await db.storage.from("avatars").upload(path,file,{upsert:false,cacheControl:"3600"});
    if(up.error) throw up.error;

    const publicUrl=db.storage.from("avatars").getPublicUrl(path).data.publicUrl;

    const upd=await db.from("players").update({photo_url:publicUrl}).eq("id",currentProfileId);
    if(upd.error) throw upd.error;

    toast("Profielfoto aangepast ✓");
    await load();

    const r=ranked();
    openProfile(currentProfileId,r);
  }catch(err){
    console.error(err);
    $("#profilePhotoError").textContent="Foto wijzigen mislukt: "+(err.message||err);
  }finally{
    $("#changePhotoBtn").disabled=false;
    $("#changePhotoBtn").textContent="Profielfoto wijzigen";
    e.target.value="";
  }
});

try{db.channel("kicker-v8").on("postgres_changes",{event:"*",schema:"public",table:"matches"},load).on("postgres_changes",{event:"*",schema:"public",table:"players"},load).subscribe()}catch(e){}
load();
