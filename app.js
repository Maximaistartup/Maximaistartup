import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  calculateMetrics,
  attachIdealRanges,
  getMetricDefinitions
} from "./metrics.js";

const FACET_VERSION = "3.1.0";
window.__FACET_VERSION__ = FACET_VERSION;

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let faceLandmarker = null;
let frontImage = null;
let profileImage = null;

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
const metricCatalog = $("metricCatalog");

$("buildVersion").textContent = `FACET BUILD ${FACET_VERSION}`;

/* ---------- helpers ---------- */

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = type;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataURL) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = dataURL;
  });
}

function updateAnalyzeButton() {
  analyzeButton.disabled = !(frontImage && profileImage && faceLandmarker);
}

/* ---------- MediaPipe ---------- */

async function createLandmarker(delegate) {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "IMAGE",
    numFaces: 2, // 2 so we can detect and reject multiple faces
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
}

async function initFaceLandmarker() {
  setStatus("Loading FACET analysis engine...");
  try {
    faceLandmarker = await createLandmarker("GPU");
  } catch (gpuError) {
    console.warn("FACET GPU init failed, falling back to CPU.", gpuError);
    try {
      faceLandmarker = await createLandmarker("CPU");
    } catch (cpuError) {
      console.error("FACET CPU init failed.", cpuError);
      throw new Error(
        "Could not initialize the facial analysis engine. Check the browser console for details."
      );
    }
  }
  updateAnalyzeButton();
  if (frontImage && profileImage) {
    setStatus("Both photographs loaded. Ready for analysis.", "success");
  } else {
    setStatus("Analysis engine ready.");
  }
}

/* Returns landmarks in PIXEL space so angles/distances are not distorted
   by the image aspect ratio (MediaPipe returns x,y normalized to 0..1). */
async function detectFace(dataURL, description) {
  const image = await loadImage(dataURL);
  const w = image.naturalWidth;
  const h = image.naturalHeight;

  if (w < 100 || h < 100) {
    throw new Error(`The ${description} photograph is too small for reliable analysis.`);
  }

  let result;
  try {
    result = faceLandmarker.detect(image);
  } catch (error) {
    console.error("MediaPipe detection error:", error);
    throw new Error(`FACET could not analyze the ${description} photograph.`);
  }

  const faces = result?.faceLandmarks ?? [];

  if (faces.length === 0) {
    const hint =
      description === "side-profile"
        ? " True 90° profiles are often not detected; a slight turn toward the camera (about 60–75°) can help."
        : "";
    throw new Error(`Please input a human face in the ${description} photograph.${hint}`);
  }
  if (faces.length > 1) {
    throw new Error(`Please input exactly one human face in the ${description} photograph.`);
  }

  return faces[0].map((p) => ({ x: p.x * w, y: p.y * h, z: p.z * w }));
}

/* ---------- rendering ---------- */

function groupByCategory(items) {
  const grouped = {};
  for (const item of items) {
    const c = item.category || "Other";
    (grouped[c] ||= []).push(item);
  }
  return grouped;
}

function renderResults(metrics) {
  metricsContainer.innerHTML = "";

  for (const [category, items] of Object.entries(groupByCategory(Object.values(metrics)))) {
    const section = document.createElement("div");
    section.className = "category";

    const title = document.createElement("div");
    title.className = "category-title";
    title.textContent = category;

    const grid = document.createElement("div");
    grid.className = "metrics-grid";

    for (const m of items) {
      const card = document.createElement("div");
      card.className = "metric-card";

      const statusClass =
        m.status === "within" ? "within" : m.status === "outside" ? "outside" : "unavailable";
      const comparison = m.comparison != null ? m.comparison.toFixed(2) : "—";
      const note = m.note || m.description || "";

      card.innerHTML = `
        <div class="metric-name">${escapeHTML(m.name)}</div>
        <div class="metric-row">
          <span class="metric-label">Your result</span>
          <span class="metric-value ${statusClass}">${escapeHTML(m.formattedValue ?? "Unavailable")}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Ideal range</span>
          <span class="metric-value">${escapeHTML(m.idealText ?? "Not specified")}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Comparison</span>
          <span class="metric-value">${escapeHTML(comparison)}</span>
        </div>
        ${note ? `<div class="metric-note">${escapeHTML(note)}</div>` : ""}
      `;
      grid.appendChild(card);
    }

    section.appendChild(title);
    section.appendChild(grid);
    metricsContainer.appendChild(section);
  }
}

function renderMetricCatalog() {
  metricCatalog.innerHTML = "";

  for (const [category, items] of Object.entries(groupByCategory(getMetricDefinitions()))) {
    const section = document.createElement("div");
    section.className = "info-section";

    const heading = document.createElement("h3");
    heading.textContent = category;
    section.appendChild(heading);

    for (const m of items) {
      const photo = m.requiresProfile && m.requiresFrontal
        ? "Frontal + Profile"
        : m.requiresProfile ? "Profile" : "Frontal";
      const sfx = m.unit === "deg" ? "°" : m.unit === "pct" ? "%" : "";
      const ideal = m.ideal ? `${m.ideal[0]}${sfx} – ${m.ideal[1]}${sfx}` : "Not specified";

      const item = document.createElement("div");
      item.className = "catalog-item";
      item.innerHTML = `
        <div class="catalog-name">${escapeHTML(m.name)}</div>
        <div class="catalog-meta">
          <span class="tag">${escapeHTML(photo)}</span>
          <span class="tag">Ideal: ${escapeHTML(ideal)}</span>
        </div>
        <div class="catalog-description">${escapeHTML(m.description || "")}${
          m.note ? " " + escapeHTML(m.note) : ""
        }</div>
      `;
      section.appendChild(item);
    }
    metricCatalog.appendChild(section);
  }
}

/* ---------- file inputs ---------- */

function bindFileInput({ input, preview, filename, card, label, otherLoaded, setImage }) {
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Please select a valid image file.", "error");
      return;
    }

    try {
      const dataURL = await fileToDataURL(file);
      setImage(dataURL);
      preview.src = dataURL;
      preview.classList.add("visible");
      filename.textContent = file.name;
      card.classList.add("has-image");
      results.classList.add("hidden");

      if (faceLandmarker && otherLoaded()) {
        setStatus("Both photographs loaded. Ready for analysis.", "success");
      } else {
        setStatus(`${label} photograph loaded.`);
      }
      updateAnalyzeButton();
    } catch (error) {
      console.error(error);
      setStatus(error.message || `Could not load the ${label.toLowerCase()} photograph.`, "error");
    }
  });
}

bindFileInput({
  input: frontFile, preview: frontPreview, filename: frontFilename, card: frontCard,
  label: "Frontal", otherLoaded: () => !!profileImage, setImage: (v) => (frontImage = v)
});

bindFileInput({
  input: profileFile, preview: profilePreview, filename: profileFilename, card: profileCard,
  label: "Side-profile", otherLoaded: () => !!frontImage, setImage: (v) => (profileImage = v)
});

/* ---------- analyze ---------- */

analyzeButton.addEventListener("click", async () => {
  try {
    analyzeButton.disabled = true;
    results.classList.add("hidden");
    metricsContainer.innerHTML = "";

    setStatus("Detecting face in frontal photograph...");
    const frontal = await detectFace(frontImage, "frontal");

    setStatus("Detecting face in side-profile photograph...");
    const profile = await detectFace(profileImage, "side-profile");

    setStatus("Calculating facial measurements...");
    const raw = calculateMetrics({ frontal, profile, scaleMm: null });

    if (!raw || Object.keys(raw).length === 0) {
      throw new Error("No measurements were returned by the FACET metric engine.");
    }

    setStatus("Comparing measurements with reference ranges...");
    renderResults(attachIdealRanges(raw, "male"));

    results.classList.remove("hidden");
    setStatus("Analysis complete.", "success");
    setTimeout(() => results.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  } catch (error) {
    console.error("FACET ERROR:", error);
    results.classList.add("hidden");
    setStatus(error.message || "FACET analysis failed.", "error");
  } finally {
    updateAnalyzeButton();
  }
});

/* ---------- sidebar navigation ---------- */

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

navItems.forEach((button) => {
  button.addEventListener("click", () => {
    navItems.forEach((i) => i.classList.remove("active"));
    pages.forEach((p) => p.classList.remove("active"));
    button.classList.add("active");
    const target = $(button.dataset.page);
    if (target) {
      target.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
});

/* ---------- init ---------- */

renderMetricCatalog();
updateAnalyzeButton();

initFaceLandmarker().catch((error) => {
  console.error("FACET INITIALIZATION ERROR:", error);
  setStatus(error.message || "Could not initialize the FACET analysis engine.", "error");
  updateAnalyzeButton();
});

console.log(`FACET ${FACET_VERSION} initialized.`);
