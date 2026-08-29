const C=window.KICKER_CONFIG||{};
const configured=C.SUPABASE_URL && !C.SUPABASE_URL.includes("VUL_HIER") && C.SUPABASE_ANON_KEY && !C.SUPABASE_ANON_KEY.includes("VUL_HIER");
const db=configured?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
let P=[],M=[],R={},format="2v2";
const $=s=>document.querySelector(s);
const initials=n=>n.split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();
const pname=id=>(P.find(p=>p.id===id)||{}).name||"?";
const avatar=p=>p.photo_url?`<img class="avatar" src="${p.photo_url}" alt="">`:`<div class="avatar">${initials(p.name)}</div>`;

function exp(a,b){return 1/(1+Math.pow(10,(b-a)/400))}
function sidePlayers(m,side){
  const a=side==="a";
  return [a?m.team_a_player1:m.team_b_player1,a?m.team_a_player2:m.team_b_player2].filter(Boolean);
}
function calc(){
  R={}; P.forEach(p=>R[p.id]={rating:1000,games:0,w:0,l:0,streak:0,delta:0,partners:new Set(),opponents:new Set(),onevone:0,twovtwo:0});
  [...M].sort((a,b)=>new Date(a.played_at)-new Date(b.played_at)).forEach(m=>{
    const A=sidePlayers(m,"a"),B=sidePlayers(m,"b");
    if(!A.length||!B.length||!A.concat(B).every(id=>R[id]))return;
    const ra=A.reduce((s,id)=>s+R[id].rating,0)/A.length;
    const rb=B.reduce((s,id)=>s+R[id].rating,0)/B.length;
    const aWin=+m.score_a>+m.score_b, ea=exp(ra,rb), d=Math.round(32*((aWin?1:0)-ea));
    A.forEach(id=>{
      const r=R[id];r.rating+=d;r.delta+=d;r.games++;aWin?r.w++:r.l++;
      r.streak=aWin?Math.max(1,r.streak+1):Math.min(-1,r.streak-1);
      (A.length===1&&B.length===1?r.onevone:r.twovtwo)++;
      A.filter(x=>x!==id).forEach(x=>r.partners.add(x));B.forEach(x=>r.opponents.add(x));
    });
    B.forEach(id=>{
      const r=R[id];r.rating-=d;r.delta-=d;r.games++;!aWin?r.w++:r.l++;
      r.streak=!aWin?Math.max(1,r.streak+1):Math.min(-1,r.streak-1);
      (A.length===1&&B.length===1?r.onevone:r.twovtwo)++;
      B.filter(x=>x!==id).forEach(x=>r.partners.add(x));A.forEach(x=>r.opponents.add(x));
    });
  });
}
function variation(id){
  if(P.length<2)return 0;
  const people=new Set([...R[id].partners,...R[id].opponents]);
  return Math.min(100,Math.round(people.size/(P.length-1)*100));
}
function matchType(m){return sidePlayers(m,"a").length===1&&sidePlayers(m,"b").length===1?"1V1":"2V2"}

function render(){
  calc();
  const sorted=[...P].sort((a,b)=>(R[b.id]?.rating||1000)-(R[a.id]?.rating||1000));
  $("#podium").innerHTML=sorted.slice(0,3).map((p,i)=>`<article class="pod"><div class="rankwater">0${i+1}</div>${avatar(p)}<h3>${p.name}</h3><div class="rating">${Math.round(R[p.id].rating)}</div><div class="sub">${R[p.id].games} matchen · ${R[p.id].games?Math.round(R[p.id].w/R[p.id].games*100):0}% winrate</div></article>`).join("")||"<div>Nog geen spelers.</div>";
  $("#ranking").innerHTML=sorted.map((p,i)=>`<div class="row"><div class="pos">${i+1}</div>${avatar(p)}<div><div class="name">${p.name}</div><div class="meta">${R[p.id].games} matchen · ${R[p.id].onevone}× 1v1 · ${R[p.id].twovtwo}× 2v2 · ${variation(p.id)}% variatie</div></div><div class="elo">${Math.round(R[p.id].rating)}</div></div>`).join("");
  $("#recent").innerHTML=[...M].sort((a,b)=>new Date(b.played_at)-new Date(a.played_at)).slice(0,8).map(m=>{
    const A=sidePlayers(m,"a").map(pname).join(" + "),B=sidePlayers(m,"b").map(pname).join(" + ");
    return `<div class="match"><div class="matchline"><div class="team">${A}</div><div class="mscore">${m.score_a} — ${m.score_b}</div><div class="team right">${B}</div></div><span class="type-tag">${matchType(m)}</span><small>${new Date(m.played_at).toLocaleString("nl-BE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</small></div>`;
  }).join("")||"Nog geen matchkes.";
  const st=[...P].sort((a,b)=>(R[b.id]?.streak||0)-(R[a.id]?.streak||0))[0];
  $("#streak").textContent=st&&R[st.id].streak>0?`${st.name} · W${R[st.id].streak}`:"—";
  const cl=[...P].sort((a,b)=>(R[b.id]?.delta||0)-(R[a.id]?.delta||0))[0];
  $("#climber").textContent=cl?`${cl.name} · ${R[cl.id].delta>=0?"+":""}${R[cl.id].delta}`:"—";
  const va=[...P].sort((a,b)=>variation(b.id)-variation(a.id))[0];
  $("#variation").textContent=va?`${va.name} · ${variation(va.id)}%`:"—";
  const low=[...P].sort((a,b)=>(R[a.id]?.games||0)-(R[b.id]?.games||0)).slice(0,3);
  $("#priority").textContent=low.map(x=>x.name.split(" ")[0]).join(" · ")||"—";
  fillSelects();
}
function fillSelects(){
  ["a1","a2","b1","b2"].forEach(id=>{
    const el=$("#"+id),old=el.value;
    el.innerHTML='<option value="">Kies speler</option>'+P.map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
    el.value=old;
  })
}
function setFormat(next){
  format=next;
  document.querySelectorAll(".format").forEach(b=>b.classList.toggle("active",b.dataset.format===next));
  $("#a2").classList.toggle("hidden",next==="1v1");
  $("#b2").classList.toggle("hidden",next==="1v1");
  if(next==="1v1"){ $("#a2").value=""; $("#b2").value=""; }
}
document.querySelectorAll(".format").forEach(b=>b.onclick=()=>setFormat(b.dataset.format));

async function load(){
  if(!db){
    P=[{id:"1",name:"Willem Tetrode"},{id:"2",name:"Siebe Luyten"},{id:"3",name:"Omar"},{id:"4",name:"Bo"},{id:"5",name:"Aya"},{id:"6",name:"Cyril"}];
    M=[
      {team_a_player1:"1",team_a_player2:"4",team_b_player1:"2",team_b_player2:"3",score_a:5,score_b:3,played_at:new Date().toISOString()},
      {team_a_player1:"1",team_a_player2:null,team_b_player1:"2",team_b_player2:null,score_a:10,score_b:8,played_at:new Date(Date.now()-3600000).toISOString()}
    ];
    render();return;
  }
  const [{data:p,error:pe},{data:m,error:me}]=await Promise.all([db.from("players").select("*"),db.from("matches").select("*")]);
  if(pe||me){console.error(pe||me);return}
  P=p||[];M=m||[];render();
}
const openMatch=()=>{setFormat("2v2");matchDlg.showModal()};
$("#newMatch").onclick=$("#mobileMatch").onclick=$("#heroMatch").onclick=openMatch;
$("#addPlayer").onclick=()=>playerDlg.showModal();

$("#saveMatch").onclick=async()=>{
  const ids=[$("#a1").value,$("#a2").value,$("#b1").value,$("#b2").value];
  const used=format==="1v1"?[ids[0],ids[2]]:ids;
  const sa=+$("#sa").value,sb=+$("#sb").value;
  if(used.some(x=>!x)||new Set(used).size!==used.length||sa===sb||sa<0||sb<0){$("#mmsg").textContent="Kies geldige spelers en een geldige eindscore.";return}
  if(!db){$("#mmsg").textContent="Demo-modus: vul eerst config.js in.";return}
  const payload={team_a_player1:ids[0],team_a_player2:format==="2v2"?ids[1]:null,team_b_player1:ids[2],team_b_player2:format==="2v2"?ids[3]:null,score_a:sa,score_b:sb,match_type:format};
  const {error}=await db.from("matches").insert(payload);
  if(error){$("#mmsg").textContent=error.message;return}
  matchDlg.close();await load();
};

$("#savePlayer").onclick=async()=>{
  const name=$("#pname").value.trim(),file=$("#photo").files[0];
  if(!name){$("#pmsg").textContent="Geef een naam in.";return}
  if(!db){$("#pmsg").textContent="Demo-modus: vul eerst config.js in.";return}
  let photo_url=null;
  if(file){
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase(),path=`${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from("avatars").upload(path,file);
    if(up.error){$("#pmsg").textContent=up.error.message;return}
    photo_url=db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }
  const {error}=await db.from("players").insert({name,photo_url});
  if(error){$("#pmsg").textContent=error.message;return}
  playerDlg.close();await load();
};

if(db)db.channel("kicker-v4")
  .on("postgres_changes",{event:"*",schema:"public",table:"matches"},load)
  .on("postgres_changes",{event:"*",schema:"public",table:"players"},load)
  .subscribe();

load();