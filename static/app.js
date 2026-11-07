const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let data = null;

let scale = null;

function setupScale(points) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  scale = {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    pad: 30,
  };
}

function toCanvas(p) {
  const w = canvas.width - 2 * scale.pad;
  const h = canvas.height - 2 * scale.pad;
  const x = scale.pad + (p[0] - scale.minX) / (scale.maxX - scale.minX) * w;
  const y = scale.pad + h - (p[1] - scale.minY) / (scale.maxY - scale.minY) * h;
  return [x, y];
}

function drawPoints() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#555";
  for (const p of data.points) {
    const [x, y] = toCanvas(p);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const stepInfo = document.getElementById("stepInfo");

let stepIndex = -1;

function dot(i, color, r = 4) {
  const [x, y] = toCanvas(data.points[i]);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function line(p, q, color, width = 2) {
  const [x1, y1] = toCanvas(p);
  const [x2, y2] = toCanvas(q);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawBase(s) {
  for (const i of s.points) dot(i, "#2a9d4a", 5);
  if (s.best) line(s.best[0], s.best[1], "#2a9d4a");
}

function drawStrip(s) {
  const x1 = toCanvas([s.mid_x - s.delta, 0])[0];
  const x2 = toCanvas([s.mid_x + s.delta, 0])[0];
  ctx.fillStyle = "rgba(150, 80, 200, 0.15)";
  ctx.fillRect(x1, 0, x2 - x1, canvas.height);
  for (const i of s.strip) dot(i, "#9650c8");
}

function drawCompare(s) {
  const color = s.improved ? "#d62828" : "#888";
  line(data.points[s.a], data.points[s.b], color);
  dot(s.a, color, 5);
  dot(s.b, color, 5);
}

function drawSplit(s) {
  for (const i of s.left) dot(i, "#2a7de1");
  for (const i of s.right) dot(i, "#e8832a");
  const x = toCanvas([s.mid_x, scale.minY])[0];
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, canvas.height);
  ctx.stroke();
}

function showStep() {
  drawPoints();
  if (stepIndex >= 0) {
    const s = data.steps[stepIndex];
    if (s.type === "split") drawSplit(s);
    else if (s.type === "base") drawBase(s);
    else if (s.type === "strip") drawStrip(s);
    else if (s.type === "compare") drawCompare(s);
  }
  stepInfo.textContent = `Step ${stepIndex + 1} / ${data.steps.length}`;
}

nextBtn.addEventListener("click", () => {
  if (!data || stepIndex >= data.steps.length - 1) return;
  stepIndex++;
  showStep();
});

prevBtn.addEventListener("click", () => {
  if (!data || stepIndex < 0) return;
  stepIndex--;
  showStep();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  status.textContent = "Running...";
  const response = await fetch("/api/closest-pair", {
    method: "POST",
    body: formData,
  });
  data = await response.json();

  status.textContent = `${data.points.length} points, ${data.steps.length} steps`;
  setupScale(data.points);
  stepIndex = -1;
  showStep();
});