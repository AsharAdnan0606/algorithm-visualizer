const $ = id => document.getElementById(id);
const canvas = $("canvas"), ctx = canvas.getContext("2d");
const C = { L: "#38bdf8", R: "#fb923c", S: "#a78bfa", B: "#34d399", hit: "#f43f5e", dim: "#475569", gold: "#fbbf24" };
const LEGEND = {
  cp: [[C.L, "Left half"], [C.R, "Right half"], [C.S, "Strip near the split line"], [C.B, "Brute-force base case"], [C.hit, "New best found in strip"], [C.gold, "Final closest pair"]],
  ka: [[C.L, "z0 = b·d"], [C.R, "z2 = a·c"], [C.S, "z1 = (a+b)(c+d) − z2 − z0"], [C.gold, "Current step"]],
};
let mode = "cp", data = null, idx = -1, timer = null, acc = 0, sc = null;

/* ---------- loading ---------- */
async function upload(file) {
  if (!file) return;
  stop(); $("fname").textContent = file.name; $("log").textContent = "Running…";
  const fd = new FormData(); fd.append("file", file);
  try {
    const r = await fetch(mode === "cp" ? "/api/closest-pair" : "/api/karatsuba", { method: "POST", body: fd });
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch (e) { $("log").textContent = "Could not process this file for the selected algorithm."; return; }
  idx = -1; if (mode === "cp") setupScale(data.points);
  $("scrub").max = data.steps.length; renderStats(); show();
}
$("file").onchange = e => upload(e.target.files[0]);
const drop = $("drop");
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); upload(e.dataTransfer.files[0]); };

/* ---------- tabs ---------- */
function setMode(m) {
  mode = m; stop(); data = null; idx = -1; $("file").value = ""; $("fname").textContent = "";
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.mode === m));
  canvas.hidden = m !== "cp"; $("tree").hidden = m !== "ka";
  $("speed").value = m === "cp" ? 30 : 15; $("scrub").max = 0;
  $("legend").innerHTML = LEGEND[m].map(([c, t]) => `<div class="leg"><i style="background:${c}"></i>${t}</div>`).join("");
  $("stats").innerHTML = ""; $("stepInfo").textContent = "Step 0 / 0";
  $("log").textContent = "Load a dataset to begin."; $("scrub").value = 0;
  if (m === "cp") paintEmpty(); else $("tree").innerHTML = '<p style="color:#8a94ab">The recursion tree appears here.</p>';
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => setMode(t.dataset.mode));

/* ---------- closest pair drawing ---------- */
function setupScale(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  sc = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), pad: 34 };
}
function toC(p) {
  const w = canvas.width - 2 * sc.pad, h = canvas.height - 2 * sc.pad;
  return [sc.pad + (p[0] - sc.x0) / ((sc.x1 - sc.x0) || 1) * w, sc.pad + h - (p[1] - sc.y0) / ((sc.y1 - sc.y0) || 1) * h];
}
function bg() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
}
function paintEmpty() { bg(); ctx.fillStyle = "#64748b"; ctx.font = "18px sans-serif"; ctx.textAlign = "center"; ctx.fillText("Drop a closest-pair dataset to see the points", canvas.width / 2, canvas.height / 2); }
function dot(i, color, r = 4, glow = false) {
  const [x, y] = toC(data.points[i]);
  ctx.shadowColor = color; ctx.shadowBlur = glow ? 14 : 0; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0;
}
function seg(p, q, color, w = 2) {
  const [a, b] = toC(p), [c, d] = toC(q);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.shadowColor = color; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); ctx.shadowBlur = 0; ctx.lineWidth = 1;
}
function vline(mx) {
  const x = toC([mx, sc.y0])[0]; ctx.setLineDash([6, 6]); ctx.strokeStyle = "#e6ebf5"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); ctx.setLineDash([]);
}
function band(mx, delta) {
  const a = toC([mx - delta, 0])[0], b = toC([mx + delta, 0])[0];
  ctx.fillStyle = "rgba(167,139,250,.16)"; ctx.fillRect(a, 0, b - a, canvas.height);
}
function paintCP() {
  bg(); const P = data.points, S = data.steps;
  for (let i = 0; i < P.length; i++) dot(i, C.dim, 2.5);
  if (idx >= 0) {
    const s = S[idx];
    if (s.type === "split") { s.left.forEach(i => dot(i, C.L)); s.right.forEach(i => dot(i, C.R)); vline(s.mid_x); }
    else if (s.type === "base") { s.points.forEach(i => dot(i, C.B, 5, true)); if (s.best) seg(s.best[0], s.best[1], C.B); }
    else if (s.type === "strip") { band(s.mid_x, s.delta); vline(s.mid_x); s.strip.forEach(i => dot(i, C.S, 4.5, true)); }
    else if (s.type === "compare") {
      let j = idx; while (j > 0 && S[j].type !== "strip") j--;
      const st = S[j]; band(st.mid_x, st.delta); vline(st.mid_x); st.strip.forEach(i => dot(i, C.S, 3.5));
      const col = s.improved ? C.hit : "#cbd5e1"; seg(P[s.a], P[s.b], col, 2.5); dot(s.a, col, 6, true); dot(s.b, col, 6, true);
    }
  }
  if (idx === S.length - 1) { seg(data.result.p, data.result.q, C.gold, 4); }
}

/* ---------- karatsuba tree ---------- */
function paintKA() {
  const nodes = new Map(); let root = null;
  for (let i = 0; i <= idx; i++) {
    const { type, ...s } = data.steps[i];
    if (type === "enter") { const n = { ...s, kids: [] }; nodes.set(s.id, n); if (s.parent == null) root = n; else nodes.get(s.parent).kids.push(n); }
    else Object.assign(nodes.get(s.id), s);
  }
  const cur = idx >= 0 ? data.steps[idx].id : -1;
  const h = n => `<div class="tn"><div class="nc ${n.role}${n.id === cur ? " cur" : ""}"><span class="role">${n.role}</span>
    <div class="xy">${n.x} × ${n.y}</div>
    ${n.a !== undefined ? `<div class="sp">m=${n.m}<br>a=${n.a} b=${n.b}<br>c=${n.c} d=${n.d}</div>` : ""}
    ${n.z0 !== undefined ? `<div class="zz">z0=${n.z0}<br>z1=${n.z1}<br>z2=${n.z2}</div>` : ""}
    ${n.res !== undefined ? `<div class="res">= ${n.res}</div>` : ""}
    ${n.collapsed && n.z0 === undefined ? '<div class="more">⋯ recurses deeper</div>' : ""}</div>
    ${n.kids.length ? `<div class="kids">${n.kids.map(h).join("")}</div>` : ""}</div>`;
  const t = $("tree");
  t.innerHTML = root ? h(root) : '<p style="color:#8a94ab">Press Play or Next to start the recursion.</p>';
  t.querySelector(".cur")?.scrollIntoView({ block: "nearest", inline: "center" });
}

/* ---------- narration + stats ---------- */
function describe(s) {
  const f = v => v.toFixed(2);
  if (mode === "cp") {
    if (s.type === "split") return `Divide: split at x = ${s.mid_x} into ${s.left.length} points (blue) and ${s.right.length} points (orange). Recursion depth ${s.depth}.`;
    if (s.type === "base") return `Conquer: only ${s.points.length} points left, so brute force is used. Best distance here: ${f(s.best[2])}.`;
    if (s.type === "strip") return `Combine: a closer pair could straddle the line. Only the ${s.strip.length} points within δ = ${f(s.delta)} of it matter (purple band).`;
    return `Comparing two strip points: distance ${f(s.dist)}${s.improved ? ". New best!" : ". No improvement."}`;
  }
  if (s.type === "enter") return `Multiply ${s.x} × ${s.y} (${s.role === "root" ? "top-level call" : "computing " + s.role}).`;
  if (s.type === "leaf") return `One factor is a single digit, so multiply directly: ${s.res}.`;
  if (s.type === "split") return `Split both numbers at ${s.m} digits: x = a·10^${s.m} + b, y = c·10^${s.m} + d. Only 3 recursive multiplications are needed instead of 4.`;
  return `Combine: result = z2·10^(2m) + z1·10^m + z0 = ${s.res}.`;
}
function stat(l, v, cls = "") { return `<div class="stat ${cls}"><span>${l}</span><b>${v}</b></div>`; }
function renderStats() {
  const r = data.result;
  if (mode === "cp") {
    const n = data.points.length, brute = n * (n - 1) / 2; let calcs = 0;
    for (const s of data.steps) { if (s.type === "compare") calcs++; else if (s.type === "base") calcs += s.points.length * (s.points.length - 1) / 2; }
    $("stats").innerHTML = stat("Points", n) + stat("Steps", data.steps.length) + stat("Closest distance", r.dist.toFixed(2)) +
      stat("Saved vs brute force", (100 * (1 - calcs / brute)).toFixed(1) + "%") +
      stat("Distance calcs", `${calcs.toLocaleString()} vs ${brute.toLocaleString()}`, "wide") + stat("Closest pair", `(${r.p}) and (${r.q})`, "wide");
  } else {
    $("stats").innerHTML = stat("Digits (n)", r.digits) + stat("Recursive calls", r.calls.toLocaleString()) +
      stat("Base multiplications", r.mults.toLocaleString()) + stat("Grade-school n²", r.school.toLocaleString()) +
      stat("Product", r.product, "wide") + stat("Check vs x·y", r.verified ? '<span class="ok">✓ verified</span>' : "✗ mismatch", "wide") +
      stat("Tree shown", "top 3 levels", "wide");
  }
}

/* ---------- playback ---------- */
function show() {
  if (!data) return;
  mode === "cp" ? paintCP() : paintKA();
  $("log").textContent = idx >= 0 ? describe(data.steps[idx]) : "Press Play or Next to begin.";
  if (idx === data.steps.length - 1 && mode === "cp") $("log").textContent += ` Done: closest pair found, distance ${data.result.dist.toFixed(2)}.`;
  if (idx === data.steps.length - 1 && mode === "ka") $("log").textContent += " Done: product verified against Python’s own multiplication.";
  $("stepInfo").textContent = `Step ${idx + 1} / ${data.steps.length}`; $("scrub").value = idx + 1;
}
function stop() { clearInterval(timer); timer = null; $("play").textContent = "▶ Play"; }
function go(i) { if (!data) return; idx = Math.max(-1, Math.min(data.steps.length - 1, i)); show(); }
function tick() {
  acc += (Math.pow($("speed").value / 100, 2.5) * 1500 + 1) * 0.04;
  const n = Math.floor(acc); acc -= n; go(idx + n);
  if (idx >= data.steps.length - 1) stop();
}
$("play").onclick = () => {
  if (!data) return; if (timer) return stop();
  if (idx >= data.steps.length - 1) go(-1);
  timer = setInterval(tick, 40); $("play").textContent = "⏸ Pause";
};
$("next").onclick = () => { stop(); go(idx + 1); };
$("prev").onclick = () => { stop(); go(idx - 1); };
$("reset").onclick = () => { stop(); go(-1); };
$("skip").onclick = () => { stop(); if (data) go(data.steps.length - 1); };
$("scrub").oninput = e => { stop(); go(+e.target.value - 1); };
setMode("cp");
