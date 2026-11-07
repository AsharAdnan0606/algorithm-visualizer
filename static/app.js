const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let data = null;

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
});