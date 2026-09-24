import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateMetrics, attachIdealRanges } from "./metrics.js";
import { createTracer } from "./tracer.js";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let faceLandmarker = null;
let frontImage = null;
let profileImage = null;
let tracer = null;

const $ = (id) => document.getElementById(id);

const frontFile = $("frontFile");
const profileFile = $("profileFile");
const frontPreview = $("frontPreview");
const profilePreview = $("profilePreview");
const frontFilename = $("frontFilename");
const profileFilename = $("profileFilename");
const frontCard = $("frontCard");
const profileCard = $("profileCard");
const analyzeButton = $("analyzeButton");
const statusEl = $("status");
const results = $("results");
const metricsContainer = $("metricsContainer");

// Initialize MediaPipe Face Landmarker
async function initEngine() {
  try {
    statusEl.textContent = "INITIALIZING AI CORE...";
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "IMAGE",
      numFaces: 1
    });
    statusEl.textContent = "AWAITING FRONTAL MATRIX...";
    statusEl.className = "success";
    if ($("coreStatus")) $("coreStatus").textContent = "CORE ACTIVE";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "ERROR LOADING MEDIAPIPE MODEL.";
    statusEl.className = "error";
  }
}

function handleFileSelect(file, preview, filename, card, callback) {
  if (!file) return;
  filename.textContent = file.name;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataURL = e.target.result;
    preview.src = dataURL;
    preview.classList.add("visible");
    card.classList.add("has-image");
    callback(dataURL);
  };
  reader.readAsDataURL(file);
}

function estimateProfilePoints(imageEl) {
  if (!faceLandmarker) return {};
  try {
    const res = faceLandmarker.detect(imageEl);
    const W = imageEl.naturalWidth || 800;
    const H = imageEl.naturalHeight || 800;
    const p = {};

    if (res && res.faceLandmarks && res.faceLandmarks[0]) {
      const lm = res.faceLandmarks[0];
      const getP = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });

      p.glabella = getP(9);
      p.nasion = getP(6);
      p.pronasale = getP(1);
      p.subnasale = getP(2);
      p.labraleSup = getP(0);
      p.labraleInf = getP(17);
      p.sulcus = getP(18);
      p.pogonion = getP(199);
      p.menton = getP(152);
      p.alare = getP(129);
      p.foreheadMid = getP(101);

      const subN = p.subnasale.y;
      const menN = p.menton.y;
      const thirdH = Math.abs(menN - subN);
      p.trichion = { x: p.glabella.x, y: Math.max(0, p.glabella.y - thirdH) };
    } else {
      // Fallback relative estimates
      p.trichion = { x: W * 0.5, y: H * 0.2 };
      p.foreheadMid = { x: W * 0.52, y: H * 0.28 };
      p.glabella = { x: W * 0.54, y: H * 0.35 };
      p.nasion = { x: W * 0.52, y: H * 0.4 };
      p.pronasale = { x: W * 0.62, y: H * 0.48 };
      p.subnasale = { x: W * 0.54, y: H * 0.54 };
      p.labraleSup = { x: W * 0.56, y: H * 0.58 };
      p.labraleInf = { x: W * 0.55, y: H * 0.63 };
      p.sulcus = { x: W * 0.52, y: H * 0.67 };
      p.pogonion = { x: W * 0.54, y: H * 0.73 };
      p.menton = { x: W * 0.50, y: H * 0.80 };
    }
    return p;
  } catch (err) {
    console.error("Estimation fallback triggered:", err);
    return {};
  }
}

// Frontal upload listener
frontFile.addEventListener("change", (e) => {
  handleFileSelect(e.target.files[0], frontPreview, frontFilename, frontCard, (url) => {
    frontImage = new Image();
    frontImage.src = url;
    frontImage.onload = updateButtonState;
  });
});

// Profile upload listener
profileFile.addEventListener("change", (e) => {
  handleFileSelect(e.target.files[0], profilePreview, profileFilename, profileCard, (url) => {
    profileImage = new Image();
    profileImage.src = url;
    profileImage.onload = () => {
      const estimates = estimateProfilePoints(profileImage);
      if (!tracer) {
        tracer = createTracer({
          insertBefore: $("results"),
          onChange: updateButtonState
        });
      }
      tracer.setImage(url, estimates);
      updateButtonState();
    };
  });
});

function updateButtonState() {
  const ready = frontImage && profileImage && tracer && tracer.isComplete();
  analyzeButton.disabled = !ready;

  if (!frontImage) {
    statusEl.textContent = "MOUNT FRONTAL MATRIX FIRST.";
  } else if (!profileImage) {
    statusEl.textContent = "FRONTAL READY. MOUNT PROFILE MATRIX NEXT.";
  } else if (!tracer.isComplete()) {
    statusEl.textContent = "CONFIRM REQUIRED LANDMARKS ON PROFILE CANVAS BELOW.";
  } else {
    statusEl.textContent = "SYSTEM READY FOR GEOMETRIC COMPUTATION.";
  }
}

analyzeButton.addEventListener("click", async () => {
  if (!faceLandmarker || !frontImage || !profileImage) return;

  statusEl.textContent = "PROCESSING FRONTAL MESH...";
  const frontRes = faceLandmarker.detect(frontImage);
  if (!frontRes.faceLandmarks.length) {
    statusEl.textContent = "FACE NOT DETECTED IN FRONTAL MATRIX.";
    statusEl.className = "error";
    return;
  }

  const W = frontImage.naturalWidth;
  const H = frontImage.naturalHeight;
  const frontalLm = frontRes.faceLandmarks[0].map((pt) => ({
    x: pt.x * W,
    y: pt.y * H,
    z: pt.z
  }));

  const profilePts = tracer.getPoints();

  statusEl.textContent = "COMPUTING CEPHALOMETRIC VECTORS...";
  const rawMetrics = calculateMetrics({ frontal: frontalLm, profile: profilePts });
  const evaluated = attachIdealRanges(rawMetrics);

  renderResults(evaluated);
  results.classList.remove("hidden");
  statusEl.textContent = "COMPUTATION COMPLETE.";
  statusEl.className = "success";
});

function renderResults(metrics) {
  metricsContainer.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "metrics-grid";

  for (const m of Object.values(metrics)) {
    const card = document.createElement("div");
    card.className = "metric-card";
    const statusClass = m.status === "within" ? "within" : m.status === "outside" ? "outside" : "";

    card.innerHTML = `
      <div class="metric-name">${m.name}</div>
      <div class="metric-row">
        <span class="metric-label">MEASURED VALUE</span>
        <span class="metric-value ${statusClass}">${m.formattedValue}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">REFERENCE RANGE</span>
        <span class="metric-value">${m.idealText}</span>
      </div>
      ${m.note ? `<div class="metric-note">${m.note}</div>` : ""}
    `;
    grid.appendChild(card);
  }
  metricsContainer.appendChild(grid);
}

initEngine();
