const TOTAL_MS = 15 * 60 * 1000;
const WEIGHTS = {cpu:.30,gpu:.25,ram:.15,ssd:.15,wifi:.15};
const state = {running:false, stopped:false, startedAt:0, scores:{}, details:{}, results:{}, timer:null};

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const clamp = (n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const fmt = n => Math.round(n);

window.addEventListener("load", ()=>{
  setTimeout(()=>$("#app").classList.remove("hidden"), 2600);
  detectHardware();
  $("#startBtn").onclick = startBenchmark;
  $("#stopBtn").onclick = stopBenchmark;
  $("#againBtn").onclick = ()=>location.reload();
  $("#refreshInfo").onclick = detectHardware;
  $("#copyBtn").onclick = copyReport;
  $("#jsonBtn").onclick = downloadJSON;
  $("#supportStatus").textContent = navigator.gpu ? "WebGPU ✓ · WebGL ✓" : "WebGL ✓ · WebGPU chưa có";
});

async function browserName(){
  try{
    const brands = (navigator.userAgentData?.brands || [])
      .map(x=>x.brand)
      .filter(b=>b && !/not.?a.?brand/i.test(b));
    if(brands.length) return brands[brands.length-1];
  }catch{}
  const ua=navigator.userAgent;
  if(/Edg\//i.test(ua)) return "Microsoft Edge";
  if(/Firefox\//i.test(ua)) return "Mozilla Firefox";
  if(/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Google Chrome";
  if(/Chromium\//i.test(ua)) return "Chromium";
  if(/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  return "Trình duyệt không xác định";
}
function detectHardware(){
  const c = navigator.hardwareConcurrency || "Không rõ";
  const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB (ước tính)` : "Không công khai";
  const conn = navigator.connection || {};
  const items = [
    ["CPU logic", `${c} luồng`],
    ["RAM", mem],
    ["GPU", getGPUName()],
    ["OS", navigator.userAgentData?.platform || navigator.platform || "Không rõ"],
    ["Browser", browserName()],
    ["Network", conn.effectiveType ? `${conn.effectiveType} · ${conn.downlink ?? "?"} Mbps` : "Trình duyệt không cung cấp"]
  ];
  $("#hardwareGrid").innerHTML = items.map(([a,b])=>`<div class="hw"><small>${a}</small><strong>${escapeHtml(b)}</strong></div>`).join("");
}

function getGPUName(){
  try{
    const c=document.createElement("canvas"), gl=c.getContext("webgl2")||c.getContext("webgl");
    if(!gl) return "WebGL không khả dụng";
    const ext=gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "GPU (trình duyệt ẩn tên)";
  }catch{return "Không đọc được GPU";}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function setCard(k,score,detail){$(`#score-${k}`).textContent=`${fmt(score)}/100`;$(`#detail-${k}`).textContent=detail;state.scores[k]=score;state.details[k]=detail;}
function updateProgress(p){$("#overallProgress").style.width=`${clamp(p)}%`;}
function remaining(){return Math.max(0,TOTAL_MS-(performance.now()-state.startedAt));}
function formatTime(ms){const s=Math.ceil(ms/1000);return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}

async function startBenchmark(){
  if(state.running)return;
  state.running=true;state.stopped=false;state.startedAt=performance.now();
  $("#startBtn").disabled=true;$("#stopBtn").disabled=false;$("#resultPanel").classList.add("hidden");
  state.timer=setInterval(()=>{$("#timer").textContent=formatTime(remaining()); if(remaining()<=0) stopBenchmark(true)},250);
  const tests=[
    ["CPU",cpuTest,0,20],
    ["GPU",gpuTest,20,40],
    ["RAM",ramTest,40,53],
    ["SSD",ssdTest,53,67],
    ["Wi-Fi",wifiTest,67,87],
    ["Ổn định",stabilityTest,87,100]
  ];
  try{
    for(const [name,fn,a,b] of tests){
      if(state.stopped || remaining()<=0) break;
      $("#phaseText").textContent=`Đang test ${name}…`;
      await fn(Math.max(800,Math.min(remaining()-2000,TOTAL_MS*(b-a)/100)));
      updateProgress(b);
    }
  }catch(e){console.error(e);$("#phaseText").textContent="Có lỗi ở một bài test; kết quả còn lại vẫn được giữ."}
  finish();
}

function stopBenchmark(auto=false){
  if(!state.running)return;
  state.stopped=true;
  if(!auto) $("#phaseText").textContent="Đã dừng test";
  finish();
}
function finish(){
  if(!state.running)return;
  state.running=false;clearInterval(state.timer);$("#stopBtn").disabled=true;$("#startBtn").disabled=false;
  $("#timer").textContent=formatTime(remaining());
  Object.keys(WEIGHTS).forEach(k=>{if(state.scores[k]==null)setCard(k,0,"Không hoàn thành")});
  renderResults();
}

async function cpuTest(ms){
  const workers=Math.max(1,Math.min(navigator.hardwareConcurrency||2,8));
  const until=performance.now()+ms, jobs=[];
  for(let i=0;i<workers;i++) jobs.push(new Promise((resolve,reject)=>{
    const w=new Worker("workers/cpu-worker.js"); w.onmessage=e=>{w.terminate();resolve(e.data)};w.onerror=reject;w.postMessage({until});
  }));
  const r=await Promise.all(jobs), ops=r.reduce((a,b)=>a+b.ops,0), seconds=Math.max(.1,ms/1000);
  const opsSec=ops/seconds;
  // Relative browser score. Calibrate through repeated runs, not as an absolute hardware ranking.
  const score=clamp(35 + 25*Math.log10(Math.max(1,opsSec/1e7)));
  setCard("cpu",score,`${(opsSec/1e6).toFixed(1)} M ops/s · ${workers} worker`);
}
async function gpuTest(ms){
  const canvas=document.createElement("canvas");canvas.width=640;canvas.height=360;canvas.style.display="none";document.body.appendChild(canvas);
  const gl=canvas.getContext("webgl2",{antialias:false,powerPreference:"high-performance"})||canvas.getContext("webgl",{antialias:false});
  if(!gl){setCard("gpu",0,"WebGL không khả dụng");canvas.remove();return}
  const vs=`attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs=`precision mediump float; uniform float t; void main(){vec2 uv=gl_FragCoord.xy/vec2(640.,360.); float v=sin(uv.x*18.+t)+cos(uv.y*21.-t); gl_FragColor=vec4(.3+.3*sin(v+t),.5+.4*cos(v),.9,.1);}`;
  const prog=makeProgram(gl,vs,fs); const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,"p");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const tl=gl.getUniformLocation(prog,"t");let frames=0,start=performance.now();
  while(performance.now()-start<ms && !state.stopped){gl.uniform1f(tl,performance.now()/300);gl.drawArrays(gl.TRIANGLES,0,6);frames++;if(frames%30===0)await new Promise(requestAnimationFrame)}
  const fps=frames/Math.max(.1,(performance.now()-start)/1000);const score=clamp(fps*1.25);
  setCard("gpu",score,`${fps.toFixed(1)} FPS · WebGL`);
  canvas.remove();
}
function makeProgram(gl,vs,fs){
  const c=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
  const p=gl.createProgram();gl.attachShader(p,c(gl.VERTEX_SHADER,vs));gl.attachShader(p,c(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);gl.useProgram(p);return p;
}
async function ramTest(ms){
  const size=64*1024*1024, a=new Uint32Array(size/4), until=performance.now()+ms;let bytes=0;
  while(performance.now()<until && !state.stopped){for(let i=0;i<a.length;i+=16)a[i]=(a[i]+i)^0x9e3779b9;bytes+=a.byteLength;await new Promise(requestAnimationFrame)}
  const mbps=bytes/Math.max(.1,(ms/1000))/1e6;const score=clamp(25+15*Math.log2(Math.max(1,mbps/100)));
  setCard("ram",score,`${mbps.toFixed(0)} MB/s · test browser`);
}
async function ssdTest(ms){
  if(!window.indexedDB){setCard("ssd",0,"IndexedDB không khả dụng");return}
  const db=await openDB(), chunk=new Uint8Array(1024*1024);crypto.getRandomValues(chunk);
  const until=performance.now()+ms;let written=0,read=0;
  while(performance.now()<until && !state.stopped){
    await txPut(db,chunk);written+=chunk.byteLength;
    await txGet(db);read+=chunk.byteLength;
  }
  const sec=Math.max(.1,ms/1000), speed=(written+read)/sec/1e6;
  const score=clamp(25+18*Math.log10(Math.max(1,speed/10)));
  setCard("ssd",score,`${speed.toFixed(0)} MB/s · IndexedDB`);
  db.close();
}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open("benchmark-kk",1);r.onupgradeneeded=()=>r.result.createObjectStore("bench");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function txPut(db,data){return new Promise((res,rej)=>{const t=db.transaction("bench","readwrite");t.objectStore("bench").put(data,"x");t.oncomplete=res;t.onerror=()=>rej(t.error)})}
function txGet(db){return new Promise((res,rej)=>{const t=db.transaction("bench","readonly");t.objectStore("bench").get("x").onsuccess=res;t.onerror=()=>rej(t.error)})}
async function wifiTest(ms){
  const start=performance.now();let n=0,bytes=0,lat=[];
  const url=new URL("assets/ping.txt",location.href);
  while(performance.now()-start<ms && !state.stopped){
    const t=performance.now();
    try{const r=await fetch(`${url}?t=${Date.now()}-${n}`,{cache:"no-store"});const b=await r.arrayBuffer();bytes+=b.byteLength;lat.push(performance.now()-t);n++}
    catch{break}
  }
  if(!n){setCard("wifi",0,"Không thể test tới server");return}
  const sec=Math.max(.1,(performance.now()-start)/1000), mbps=bytes*8/sec/1e6, avg=lat.reduce((a,b)=>a+b,0)/lat.length;
  const score=clamp(100 - avg*1.5 + Math.min(40,mbps/2));
  setCard("wifi",score,`${mbps.toFixed(1)} Mbps · ${avg.toFixed(0)} ms`);
}
async function stabilityTest(ms){
  const end=performance.now()+ms;let sum=0,n=0;
  while(performance.now()<end && !state.stopped){sum+=Math.sqrt(Math.random()*1e6);n++;await new Promise(requestAnimationFrame)}
  // Stability is used as a small correction, not an extra category.
  $("#phaseText").textContent="Đã hoàn thành benchmark";
  updateProgress(100);
}
function renderResults(){
  const total=Object.entries(WEIGHTS).reduce((s,[k,w])=>s+(state.scores[k]||0)*w,0);
  $("#totalScore").textContent=fmt(total);$("#grade").textContent=grade(total);
  $("#resultBars").innerHTML=Object.keys(WEIGHTS).map(k=>`<div class="bar-row"><span>${label(k)}</span><div class="bar"><i style="width:${clamp(state.scores[k]||0)}%"></i></div><b>${fmt(state.scores[k]||0)}</b></div>`).join("");
  $("#summary").innerHTML=buildSummary(total);
  $("#recommendations").innerHTML=buildRecommendations(total);
  $("#resultPanel").classList.remove("hidden");
  $("#resultPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function label(k){return {cpu:"CPU",gpu:"GPU",ram:"RAM",ssd:"SSD",wifi:"Wi-Fi"}[k]}
function grade(s){return s>=91?"Rất mạnh":s>=76?"Mạnh":s>=61?"Khá":s>=41?"Trung bình":s>=21?"Yếu":"Rất yếu"}
function buildSummary(total){
  const arr=Object.entries(state.scores).sort((a,b)=>b[1]-a[1]);const strong=label(arr[0][0]), weak=label(arr[arr.length-1][0]);
  return `<b>Điểm tổng: ${fmt(total)}/100 — ${grade(total)}</b><br>Thành phần nổi bật: <b>${strong}</b> (${fmt(arr[0][1])}/100).<br>Thành phần thấp nhất: <b>${weak}</b> (${fmt(arr[arr.length-1][1])}/100).<br><br><span style="color:var(--muted)">Điểm Benchmark KK là điểm nội bộ của web, chịu ảnh hưởng bởi trình duyệt, driver, hệ điều hành và tải nền.</span>`;
}
function buildRecommendations(total){
  let title, apps;
  if(total >= 80){
    title="Gợi ý ứng dụng học tập";
    apps=["VS Code — lập trình và làm dự án web/C++/Python","LibreOffice — soạn tài liệu, bảng tính và thuyết trình","GeoGebra — học Toán và trực quan hóa đồ thị","BeatXEdu — chạy tốt các công cụ học tập trên web"];
  }else if(total >= 60){
    title="Gợi ý ứng dụng nhẹ";
    apps=["VS Code — nên hạn chế mở quá nhiều extension cùng lúc","LibreOffice — phù hợp học tập và làm tài liệu","GeoGebra — học Toán, đồ thị và hình học","BeatXEdu — ưu tiên các công cụ chạy trực tiếp trên trình duyệt"];
  }else{
    title="Gợi ý cho cấu hình tiết kiệm tài nguyên";
    apps=["BeatXEdu — các công cụ web nhẹ, không cần cài nhiều phần mềm","Geany hoặc trình soạn thảo nhẹ — phù hợp code cơ bản","LibreOffice — dùng khi cần soạn tài liệu, nên đóng ứng dụng nền","GeoGebra Web — dùng bản web để giảm tải cài đặt"];
  }
  return `<h4>📚 ${title}</h4><ul>${apps.map(x=>`<li>${x}</li>`).join("")}</ul><small style="color:var(--muted)">Gợi ý dựa trên điểm benchmark của trình duyệt; trải nghiệm thực tế còn phụ thuộc hệ điều hành, driver và tác vụ.</small>`;
}
function reportObject(){return {project:"Benchmark KK",by:"BeatXEdu",date:new Date().toISOString(),hardware:$("#hardwareGrid").innerText,scores:state.scores,details:state.details,total:Object.entries(WEIGHTS).reduce((s,[k,w])=>s+(state.scores[k]||0)*w,0)}}
async function copyReport(){await navigator.clipboard?.writeText(JSON.stringify(reportObject(),null,2));$("#copyBtn").textContent="✓ Đã sao chép"}
function downloadJSON(){const blob=new Blob([JSON.stringify(reportObject(),null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="benchmark-kk-result.json";a.click();URL.revokeObjectURL(a.href)}
