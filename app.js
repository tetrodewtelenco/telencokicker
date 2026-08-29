const C = window.KICKER_CONFIG || {};
const db = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
let P = [], M = [], R = {}, format = "2v2";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const initials = n => (n || "?").split(/\s+/).filter(Boolean).map(x => x[0]).slice(0,2).join("").toUpperCase();
const playerById = id => P.find(p => String(p.id) === String(id));
const pname = id => playerById(id)?.name || "?";
const avatar = p => p?.photo_url
  ? `<img class="player-avatar" src="${p.photo_url}" alt="${p.name}">`
  : `<div class="player-avatar">${initials(p?.name)}</div>`;

function expected(a,b){ return 1/(1+Math.pow(10,(b-a)/400)); }
function sidePlayers(m, side){
  const a = side === "a";
  return [a ? m.team_a_player1 : m.team_b_player1, a ? m.team_a_player2 : m.team_b_player2].filter(Boolean);
}
function calc(){
  R = {};
  P.forEach(p => R[p.id] = {rating:1000,games:0,w:0,l:0,streak:0,delta:0,partners:new Set(),opponents:new Set(),onevone:0,twovtwo:0});
  [...M].sort((a,b)=>new Date(a.played_at)-new Date(b.played_at)).forEach(m => {
    const A = sidePlayers(m,"a"), B = sidePlayers(m,"b");
    if(!A.length || !B.length || !A.concat(B).every(id => R[id])) return;
    const ra = A.reduce((s,id)=>s+R[id].rating,0)/A.length;
    const rb = B.reduce((s,id)=>s+R[id].rating,0)/B.length;
    const aWin = +m.score_a > +m.score_b;
    const d = Math.round(32*((aWin?1:0)-expected(ra,rb)));
    A.forEach(id => {
      const r=R[id]; r.rating+=d; r.delta+=d; r.games++; aWin?r.w++:r.l++;
      r.streak = aWin ? Math.max(1,r.streak+1) : Math.min(-1,r.streak-1);
      if(A.length===1 && B.length===1) r.onevone++; else r.twovtwo++;
      A.filter(x=>x!==id).forEach(x=>r.partners.add(x)); B.forEach(x=>r.opponents.add(x));
    });
    B.forEach(id => {
      const r=R[id]; r.rating-=d; r.delta-=d; r.games++; !aWin?r.w++:r.l++;
      r.streak = !aWin ? Math.max(1,r.streak+1) : Math.min(-1,r.streak-1);
      if(A.length===1 && B.length===1) r.onevone++; else r.twovtwo++;
      B.filter(x=>x!==id).forEach(x=>r.partners.add(x)); A.forEach(x=>r.opponents.add(x));
    });
  });
}
function variation(id){
  if(P.length < 2 || !R[id]) return 0;
  const people = new Set([...R[id].partners,...R[id].opponents]);
  return Math.min(100, Math.round(people.size/(P.length-1)*100));
}
function typeOf(m){ return sidePlayers(m,"a").length===1 && sidePlayers(m,"b").length===1 ? "1V1" : "2V2"; }
function firstName(name){ return (name || "").split(" ")[0]; }

function render(){
  calc();
  const sorted = [...P].sort((a,b)=>(R[b.id]?.rating||1000)-(R[a.id]?.rating||1000));
  const one = M.filter(m=>typeOf(m)==="1V1").length;
  $("#heroMatches").textContent = M.length;
  $("#heroPlayers").textContent = P.length;
  $("#hero1v1").textContent = one;
  $("#hero2v2").textContent = M.length-one;

  const podium = sorted.slice(0,3);
  $("#podium").innerHTML = podium.length ? podium.map((p,i)=>{
    const r=R[p.id], wr=r.games?Math.round(r.w/r.games*100):0;
    return `<article class="podium-card ${i===0?'first':''}">
      <div class="medal">${i+1}</div>${avatar(p)}
      <h3>${p.name}</h3>
      <div class="podium-rating">${Math.round(r.rating)}</div>
      <div class="podium-meta">${r.games} matchen · ${wr}% winrate</div>
      <div class="trend">${r.delta>=0?'+':''}${r.delta} ELO totaal</div>
    </article>`;
  }).join("") : `<div class="empty">Nog geen spelers.</div>`;

  $("#ranking").innerHTML = sorted.length ? sorted.map((p,i)=>{
    const r=R[p.id], wr=r.games?Math.round(r.w/r.games*100):0;
    return `<div class="rank-row">
      <div class="rank-pos">${i+1}</div>${avatar(p)}
      <div><div class="rank-name">${p.name}</div><div class="rank-meta">${r.games} matchen · ${wr}% win · ${r.onevone}× 1v1 · ${r.twovtwo}× 2v2 · ${variation(p.id)}% variatie</div></div>
      <div class="rank-elo"><strong>${Math.round(r.rating)}</strong><span>${r.delta>=0?'+':''}${r.delta}</span></div>
    </div>`;
  }).join("") : `<div class="empty">Nog geen ranking. Voeg eerst spelers toe.</div>`;

  const recent=[...M].sort((a,b)=>new Date(b.played_at)-new Date(a.played_at)).slice(0,8);
  $("#recent").innerHTML = recent.length ? recent.map(m=>{
    const A=sidePlayers(m,"a").map(pname).join(" + "), B=sidePlayers(m,"b").map(pname).join(" + ");
    const dt=new Date(m.played_at).toLocaleString("nl-BE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
    return `<div class="match-card"><div class="match-top"><div class="match-team">${A}</div><div class="match-score">${m.score_a} — ${m.score_b}</div><div class="match-team right">${B}</div></div><div class="match-bottom"><span class="type-pill">${typeOf(m)}</span><span>${dt}</span></div></div>`;
  }).join("") : `<div class="empty">Nog geen matchkes gespeeld.</div>`;

  const st=[...P].sort((a,b)=>(R[b.id]?.streak||0)-(R[a.id]?.streak||0))[0];
  $("#streak").textContent=st && R[st.id].streak>0 ? `${firstName(st.name)} · W${R[st.id].streak}` : "—";
  const cl=[...P].sort((a,b)=>(R[b.id]?.delta||0)-(R[a.id]?.delta||0))[0];
  $("#climber").textContent=cl ? `${firstName(cl.name)} · ${R[cl.id].delta>=0?'+':''}${R[cl.id].delta}` : "—";
  const va=[...P].sort((a,b)=>variation(b.id)-variation(a.id))[0];
  $("#variation").textContent=va ? `${firstName(va.name)} · ${variation(va.id)}%` : "—";
  const low=[...P].sort((a,b)=>(R[a.id]?.games||0)-(R[b.id]?.games||0)).slice(0,3);
  $("#priority").textContent=low.length ? low.map(x=>firstName(x.name)).join(" · ") : "—";
  fillSelects();
}

function fillSelects(){
  ["a1","a2","b1","b2"].forEach(id=>{
    const el=$("#"+id), old=el.value;
    el.innerHTML='<option value="">Kies speler</option>'+P.map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
    el.value=old;
  });
}
function setFormat(next){
  format=next;
  $$(".format").forEach(b=>b.classList.toggle("active",b.dataset.format===next));
  $("#a2").classList.toggle("hidden",next==="1v1");
  $("#b2").classList.toggle("hidden",next==="1v1");
  if(next==="1v1"){ $("#a2").value=""; $("#b2").value=""; }
}
function openMatch(){ $("#mmsg").textContent=""; setFormat("2v2"); $("#matchDlg").showModal(); }

async function load(){
  const [{data:p,error:pe},{data:m,error:me}] = await Promise.all([
    db.from("players").select("*").order("name"),
    db.from("matches").select("*").order("played_at",{ascending:false})
  ]);
  if(pe || me){
    console.error(pe || me);
    document.body.insertAdjacentHTML("beforeend",`<div style="position:fixed;left:15px;right:15px;bottom:15px;z-index:999;background:#fff3cd;border:1px solid #eed58d;padding:12px;border-radius:12px;font:12px Inter,sans-serif">Database kon niet geladen worden: ${(pe||me).message}</div>`);
    return;
  }
  P=p||[]; M=m||[]; render();
}

$$("[data-open-match]").forEach(b=>b.addEventListener("click",openMatch));
$$("[data-close-match]").forEach(b=>b.addEventListener("click",()=>$("#matchDlg").close()));
$$("[data-close-player]").forEach(b=>b.addEventListener("click",()=>$("#playerDlg").close()));
$$(".format").forEach(b=>b.addEventListener("click",()=>setFormat(b.dataset.format)));
$("#addPlayer").addEventListener("click",()=>{ $("#pmsg").textContent=""; $("#playerDlg").showModal(); });

$("#saveMatch").addEventListener("click",async()=>{
  const ids=[$("#a1").value,$("#a2").value,$("#b1").value,$("#b2").value];
  const used=format==="1v1"?[ids[0],ids[2]]:ids;
  const sa=Number($("#sa").value), sb=Number($("#sb").value);
  if(used.some(x=>!x) || new Set(used).size!==used.length || Number.isNaN(sa) || Number.isNaN(sb) || sa===sb || sa<0 || sb<0){
    $("#mmsg").textContent="Kies geldige spelers en een geldige eindscore."; return;
  }
  $("#saveMatch").disabled=true; $("#saveMatch").textContent="Opslaan…";
  const payload={team_a_player1:ids[0],team_a_player2:format==="2v2"?ids[1]:null,team_b_player1:ids[2],team_b_player2:format==="2v2"?ids[3]:null,score_a:sa,score_b:sb,match_type:format};
  const {error}=await db.from("matches").insert(payload);
  $("#saveMatch").disabled=false; $("#saveMatch").textContent="Resultaat opslaan";
  if(error){ $("#mmsg").textContent=error.message; return; }
  $("#sa").value=""; $("#sb").value=""; $("#matchDlg").close(); await load();
});

$("#savePlayer").addEventListener("click",async()=>{
  const name=$("#pname").value.trim(), file=$("#photo").files[0];
  if(!name){ $("#pmsg").textContent="Geef een naam in."; return; }
  $("#savePlayer").disabled=true; $("#savePlayer").textContent="Toevoegen…";
  let photo_url=null;
  if(file){
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=`${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from("avatars").upload(path,file);
    if(up.error){ $("#pmsg").textContent=up.error.message; $("#savePlayer").disabled=false; $("#savePlayer").textContent="Speler toevoegen"; return; }
    photo_url=db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }
  const {error}=await db.from("players").insert({name,photo_url});
  $("#savePlayer").disabled=false; $("#savePlayer").textContent="Speler toevoegen";
  if(error){ $("#pmsg").textContent=error.message; return; }
  $("#pname").value=""; $("#photo").value=""; $("#playerDlg").close(); await load();
});

db.channel("kicker-v5-live")
  .on("postgres_changes",{event:"*",schema:"public",table:"matches"},load)
  .on("postgres_changes",{event:"*",schema:"public",table:"players"},load)
  .subscribe();

load();
