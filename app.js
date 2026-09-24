import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

import {
  calculateMetrics,
  attachIdealRanges,
  getMetricDefinitions
} from "./metrics.js";


const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";


let faceLandmarker = null;

let frontImageData = null;
let profileImageData = null;


/* ---------------------------------------------------------
   DOM
--------------------------------------------------------- */

const frontFile = document.getElementById("frontFile");
const profileFile = document.getElementById("profileFile");

const frontPreview = document.getElementById("frontPreview");
const profilePreview = document.getElementById("profilePreview");

const frontEmpty = document.getElementById("frontEmpty");
const profileEmpty = document.getElementById("profileEmpty");

const frontFilename = document.getElementById("frontFilename");
const profileFilename = document.getElementById("profileFilename");

const frontCard = document.getElementById("frontCard");
const profileCard = document.getElementById("profileCard");

const analyzeButton = document.getElementById("analyzeButton");
const status = document.getElementById("status");

const metricsContainer = document.getElementById("metricsContainer");
const metricLibrary = document.getElementById("metricLibrary");


/* ---------------------------------------------------------
   STATUS
--------------------------------------------------------- */

function setStatus(message, type = "") {

  status.textContent = message;

  status.className = "status";

  if (type) {
    status.classList.add(type);
  }
}


/* ---------------------------------------------------------
   FILE -> DATA URL
--------------------------------------------------------- */

function readFile(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () =>
      reject(new Error("Could not read the selected photograph."));

    reader.readAsDataURL(file);
  });
}


/* ---------------------------------------------------------
   IMAGE LOADER
--------------------------------------------------------- */

function loadImage(dataURL) {

  return new Promise((resolve, reject) => {

    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () =>
      reject(new Error("The selected file is not a valid image."));

    image.src = dataURL;
  });
}


/* ---------------------------------------------------------
   FILE PREVIEWS
--------------------------------------------------------- */

frontFile.addEventListener("change", async () => {

  const file = frontFile.files?.[0];

  if (!file) return;

  try {

    frontImageData = await readFile(file);

    frontPreview.src = frontImageData;
    frontPreview.classList.add("visible");

    frontEmpty.style.display = "none";

    frontFilename.textContent = file.name;

    frontCard.classList.add("has-image");

    updateAnalyzeButton();

    setStatus("Frontal photograph loaded.");

  } catch (error) {

    setStatus(error.message, "error");
  }
});


profileFile.addEventListener("change", async () => {

  const file = profileFile.files?.[0];

  if (!file) return;

  try {

    profileImageData = await readFile(file);

    profilePreview.src = profileImageData;
    profilePreview.classList.add("visible");

    profileEmpty.style.display = "none";

    profileFilename.textContent = file.name;

    profileCard.classList.add("has-image");

    updateAnalyzeButton();

    setStatus("Side-profile photograph loaded.");

  } catch (error) {

    setStatus(error.message, "error");
  }
});


function updateAnalyzeButton() {

  analyzeButton.disabled =
    !frontImageData ||
    !profileImageData ||
    !faceLandmarker;
}


/* ---------------------------------------------------------
   MEDIAPIPE
--------------------------------------------------------- */

async function initializeFaceLandmarker() {

  try {

    setStatus("Loading MediaPipe face model...");

    const vision =
      await FilesetResolver.forVisionTasks(WASM_URL);

    faceLandmarker =
      await FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU"
          },

          runningMode: "IMAGE",

          numFaces: 1,

          minFaceDetectionConfidence: 0.5,

          minFacePresenceConfidence: 0.5,

          minTrackingConfidence: 0.5
        }
      );

    setStatus("FACET engine ready.");

    updateAnalyzeButton();

  } catch (gpuError) {

    console.warn(
      "GPU MediaPipe initialization failed. Retrying with CPU.",
      gpuError
    );

    try {

      const vision =
        await FilesetResolver.forVisionTasks(WASM_URL);

      faceLandmarker =
        await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: "CPU"
            },

            runningMode: "IMAGE",

            numFaces: 1,

            minFaceDetectionConfidence: 0.5,

            minFacePresenceConfidence: 0.5,

            minTrackingConfidence: 0.5
          }
        );

      setStatus("FACET engine ready.");

      updateAnalyzeButton();

    } catch (cpuError) {

      console.error("FACET MediaPipe initialization failed:", cpuError);

      setStatus(
        "FACET engine failed to load. Open the browser console for the exact error.",
        "error"
      );
    }
  }
}


/* ---------------------------------------------------------
   FACE DETECTION
--------------------------------------------------------- */

async function detectFace(dataURL, description) {

  if (!faceLandmarker) {

    throw new Error(
      "The FACET face-analysis engine has not finished loading."
    );
  }

  const image = await loadImage(dataURL);

  let result;

  try {

    result = faceLandmarker.detect(image);

  } catch (error) {

    console.error("MediaPipe detection error:", error);

    throw new Error(
      `FACET could not analyze the ${description} photograph.`
    );
  }

  if (
    !result ||
    !result.faceLandmarks ||
    result.faceLandmarks.length === 0
  ) {

    throw new Error(
      `Please input a human face in the ${description} photograph.`
    );
  }

  if (result.faceLandmarks.length > 1) {

    throw new Error(
      `Please use a photograph containing exactly one face in the ${description} photograph.`
    );
  }

  return result.faceLandmarks[0];
}


/* ---------------------------------------------------------
   RENDER METRICS
--------------------------------------------------------- */

function formatValue(metric) {

  if (!metric || !Number.isFinite(metric.value)) {
    return "Unavailable";
  }

  return metric.formattedValue ||
    `${metric.value}`;
}


function renderMetric(metric) {

  const card =
    document.createElement("div");

  card.className = "metric-card";


  const name =
    document.createElement("div");

  name.className = "metric-name";

  name.textContent =
    metric.name;

  card.appendChild(name);


  if (metric.description) {

    const description =
      document.createElement("div");

    description.className =
      "metric-description";

    description.textContent =
      metric.description;

    card.appendChild(description);
  }


  const resultRow =
    document.createElement("div");

  resultRow.className =
    "metric-row";

  resultRow.innerHTML = `
    <span class="metric-label">Result</span>
    <span class="metric-value ${
      metric.available === false
        ? "unavailable"
        : metric.status === "within"
          ? "good"
          : "outside"
    }">${formatValue(metric)}</span>
  `;

  card.appendChild(resultRow);


  const referenceRow =
    document.createElement("div");

  referenceRow.className =
    "metric-row";

  referenceRow.innerHTML = `
    <span class="metric-label">Reference</span>
    <span class="metric-value">
      ${metric.idealText || "No reference range"}
    </span>
  `;

  card.appendChild(referenceRow);


  if (metric.available !== false &&
      Number.isFinite(metric.comparison)) {

    const comparison =
      document.createElement("div");

    comparison.className =
      "comparison";

    comparison.innerHTML = `
      <span class="metric-label">
        Normalized distance from reference midpoint
      </span>

      <span class="comparison-number">
        ${metric.comparison.toFixed(2)}
      </span>
    `;

    card.appendChild(comparison);
  }


  return card;
}


function renderResults(metrics) {

  metricsContainer.innerHTML = "";


  const categories = {};

  for (const metric of Object.values(metrics)) {

    const category =
      metric.category || "Other";

    if (!categories[category]) {
      categories[category] = [];
    }

    categories[category].push(metric);
  }


  for (const [categoryName, categoryMetrics] of
    Object.entries(categories)) {

    const category =
      document.createElement("div");

    category.className =
      "category";


    const title =
      document.createElement("div");

    title.className =
      "category-title";

    title.textContent =
      categoryName;

    category.appendChild(title);


    const grid =
      document.createElement("div");

    grid.className =
      "metrics-grid";


    for (const metric of categoryMetrics) {

      grid.appendChild(
        renderMetric(metric)
      );
    }


    category.appendChild(grid);

    metricsContainer.appendChild(category);
  }
}


/* ---------------------------------------------------------
   METRIC LIBRARY
--------------------------------------------------------- */

function renderMetricLibrary() {

  if (!metricLibrary) return;

  metricLibrary.innerHTML = "";

  for (const metric of getMetricDefinitions()) {

    const item =
      document.createElement("div");

    item.className =
      "library-item";

    item.innerHTML = `
      <strong>${metric.name}</strong>
      <span>
        ${metric.requiresProfile
          ? "Side profile"
          : "Frontal photograph"}
      </span>
    `;

    metricLibrary.appendChild(item);
  }
}


/* ---------------------------------------------------------
   ANALYSIS
--------------------------------------------------------- */

analyzeButton.addEventListener("click", async () => {

  if (!frontImageData || !profileImageData) {

    setStatus(
      "Please upload both photographs first.",
      "error"
    );

    return;
  }


  try {

    analyzeButton.disabled = true;

    metricsContainer.innerHTML = `
      <div class="info-card">
        <h3>Analyzing photographs...</h3>
        <p>
          Detecting facial landmarks and calculating measurements.
        </p>
      </div>
    `;


    setStatus(
      "Detecting face in frontal photograph..."
    );

    const frontal =
      await detectFace(
        frontImageData,
        "frontal"
      );


    setStatus(
      "Detecting face in side-profile photograph..."
    );

    const profile =
      await detectFace(
        profileImageData,
        "side-profile"
      );


    setStatus(
      "Calculating facial measurements..."
    );


    /*
      IMPORTANT:
      No universal facial-width or physical-size assumption
      is passed here.

      scaleMm is deliberately null.
    */

    const rawMetrics =
      calculateMetrics({
        frontal,
        profile,
        scaleMm: null
      });


    if (
      !rawMetrics ||
      Object.keys(rawMetrics).length === 0
    ) {

      throw new Error(
        "FACET calculated no facial measurements."
      );
    }


    setStatus(
      "Comparing measurements with reference ranges..."
    );


    const metrics =
      attachIdealRanges(
        rawMetrics,
        "male"
      );


    renderResults(metrics);


    setStatus(
      "Analysis complete.",
      "success"
    );


    document
      .getElementById("resultsSection")
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });


  } catch (error) {

    console.error(
      "FACET ANALYSIS ERROR:",
      error
    );


    metricsContainer.innerHTML = `
      <div class="info-card" style="border-color:#5b2929">
        <h3 style="color:#ff7474">
          Analysis failed
        </h3>

        <p>
          ${error.message || "Unknown FACET error."}
        </p>
      </div>
    `;


    setStatus(
      error.message ||
      "FACET analysis failed.",
      "error"
    );

  } finally {

    updateAnalyzeButton();
  }
});


/* ---------------------------------------------------------
   SIDEBAR NAVIGATION
--------------------------------------------------------- */

const navButtons =
  document.querySelectorAll(".nav-button");


navButtons.forEach(button => {

  button.addEventListener("click", () => {

    const targetId =
      button.dataset.target;

    const target =
      document.getElementById(targetId);

    if (!target) return;


    navButtons.forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");


    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});


/* ---------------------------------------------------------
   INITIALIZATION
--------------------------------------------------------- */

renderMetricLibrary();

initializeFaceLandmarker();
