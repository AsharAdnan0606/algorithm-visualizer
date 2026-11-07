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
  drawPoints();
});