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