import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

import {
  calculateMetrics,
  attachIdealRanges
} from "./metrics.js";


/* =========================================================
   FACET APPLICATION
   ========================================================= */

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";


/* =========================================================
   DOM
   ========================================================= */

const frontFile =
  document.getElementById("frontFile");

const profileFile =
  document.getElementById("profileFile");

const frontPreview =
  document.getElementById("frontPreview");

const profilePreview =
  document.getElementById("profilePreview");

const frontFilename =
  document.getElementById("frontFilename");

const profileFilename =
  document.getElementById("profileFilename");

const frontCard =
  document.getElementById("frontCard");

const profileCard =
  document.getElementById("profileCard");

const analyzeButton =
  document.getElementById("analyzeButton");

const status =
  document.getElementById("status");

const results =
  document.getElementById("results");

const metricsContainer =
  document.getElementById("metricsContainer");


/* =========================================================
   STATE
   ========================================================= */

let frontImageData = null;
let profileImageData = null;

let faceLandmarker = null;
let mediaPipeReady = false;


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(message, type = "") {

  status.textContent = message;
  status.className = type;

}


/* =========================================================
   INITIALIZE MEDIAPIPE
   ========================================================= */

async function initializeMediaPipe() {

  try {

    setStatus(
      "Loading facial landmark model..."
    );

    const vision =
      await FilesetResolver.forVisionTasks(
        WASM_URL
      );

    faceLandmarker =
      await FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: MODEL_URL
          },

          runningMode: "IMAGE",

          numFaces: 2,

          minFaceDetectionConfidence: 0.5,

          minFacePresenceConfidence: 0.5,

          minTrackingConfidence: 0.5,

          outputFaceBlendshapes: false,

          outputFacialTransformationMatrixes: false
        }
      );

    mediaPipeReady = true;

    if (
      frontImageData &&
      profileImageData
    ) {

      setStatus(
        "Both photographs loaded. Ready for analysis.",
        "success"
      );

    } else {

      setStatus(
        "Add both photographs to begin."
      );

    }

  }

  catch (error) {

    console.error(
      "MediaPipe initialization error:",
      error
    );

    mediaPipeReady = false;

    setStatus(
      "Facial analysis could not be initialized. Check the browser console.",
      "error"
    );

  }

}


/* =========================================================
   FILE READER
   ========================================================= */

function readFileAsDataURL(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(reader.result);

      reader.onerror =
        () => reject(
          new Error(
            "Could not read the image file."
          )
        );

      reader.readAsDataURL(file);

    }
  );

}


/* =========================================================
   IMAGE LOADER
   ========================================================= */

function loadImage(dataURL) {

  return new Promise(
    (resolve, reject) => {

      const image =
        new Image();

      image.onload =
        () => resolve(image);

      image.onerror =
        () => reject(
          new Error(
            "Could not decode the uploaded image."
          )
        );

      image.src = dataURL;

    }
  );

}


/* =========================================================
   FRONT PHOTO
   ========================================================= */

frontFile.addEventListener(
  "change",
  async function () {

    if (
      !this.files ||
      this.files.length === 0
    ) {
      return;
    }

    try {

      const file =
        this.files[0];

      frontFilename.textContent =
        file.name;

      frontImageData =
        await readFileAsDataURL(file);

      frontPreview.src =
        frontImageData;

      frontPreview.classList.add(
        "visible"
      );

      frontCard.classList.add(
        "has-image"
      );

      updateAnalyzeButton();

    }

    catch (error) {

      console.error(error);

      frontImageData = null;

      setStatus(
        "Could not load the frontal photograph.",
        "error"
      );

    }

  }
);


/* =========================================================
   PROFILE PHOTO
   ========================================================= */

profileFile.addEventListener(
  "change",
  async function () {

    if (
      !this.files ||
      this.files.length === 0
    ) {
      return;
    }

    try {

      const file =
        this.files[0];

      profileFilename.textContent =
        file.name;

      profileImageData =
        await readFileAsDataURL(file);

      profilePreview.src =
        profileImageData;

      profilePreview.classList.add(
        "visible"
      );

      profileCard.classList.add(
        "has-image"
      );

      updateAnalyzeButton();

    }

    catch (error) {

      console.error(error);

      profileImageData = null;

      setStatus(
        "Could not load the side-profile photograph.",
        "error"
      );

    }

  }
);


/* =========================================================
   BUTTON STATE
   ========================================================= */

function updateAnalyzeButton() {

  analyzeButton.disabled =
    !(
      frontImageData &&
      profileImageData
    );

  if (
    frontImageData &&
    profileImageData
  ) {

    if (mediaPipeReady) {

      setStatus(
        "Both photographs loaded. Ready for analysis.",
        "success"
      );

    } else {

      setStatus(
        "Both photographs loaded. Loading analysis engine..."
      );

    }

  } else {

    setStatus(
      "Add both photographs to begin."
    );

  }

}


/* =========================================================
   RUN FACELANDMARKER
   ========================================================= */

async function detectFace(
  dataURL,
  photoName
) {

  const image =
    await loadImage(dataURL);


  const mpImage =
    await import(
      "@mediapipe/tasks-vision"
    );


  const imageObject =
    new mpImage.MPImage(
      image
    );


  let detectionResult;

  try {

    detectionResult =
      faceLandmarker.detect(
        imageObject
      );

  }

  finally {

    try {

      imageObject.close();

    }

    catch (_) {}

  }


  if (
    !detectionResult ||
    !detectionResult.faceLandmarks
  ) {

    throw new Error(
      `Please input a human face in the ${photoName} photograph.`
    );

  }


  const faces =
    detectionResult.faceLandmarks;


  if (
    faces.length === 0
  ) {

    throw new Error(
      `Please input a human face in the ${photoName} photograph.`
    );

  }


  if (
    faces.length > 1
  ) {

    throw new Error(
      `Please input exactly one human face in the ${photoName} photograph.`
    );

  }


  return {
    landmarks: faces[0],
    image
  };

}


/* =========================================================
   SCALE ESTIMATION
   =========================================================

   MediaPipe coordinates are normalized 0–1 values.

   Facial measurements that are ratios or angles do not
   require an absolute physical scale.

   For millimetre-based measurements we use an operational
   reference scale derived from the detected facial width.

   This is NOT a clinical anthropometric calibration.
   ========================================================= */

function estimateScaleMm(
  landmarks
) {

  const leftFace =
    landmarks[234];

  const rightFace =
    landmarks[454];

  if (
    !leftFace ||
    !rightFace
  ) {

    return null;

  }

  const width =
    Math.sqrt(
      Math.pow(
        leftFace.x - rightFace.x,
        2
      ) +
      Math.pow(
        leftFace.y - rightFace.y,
        2
      ) +
      Math.pow(
        leftFace.z - rightFace.z,
        2
      )
    );


  if (
    !Number.isFinite(width) ||
    width <= 0
  ) {

    return null;

  }


  /*
    Operational facial-width reference.

    This allows the metric engine to produce a consistent
    normalized millimetre-like value from photographs.

    It should not be interpreted as a clinically calibrated
    anthropometric measurement.
  */

  const referenceFaceWidthMm = 140;

  return (
    referenceFaceWidthMm /
    width
  );

}


/* =========================================================
   METRIC FORMATTING
   ========================================================= */

function formatValue(
  value
) {

  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {

    return "Unavailable";

  }


  return value.toFixed(2);

}


/* =========================================================
   STATUS COLOR
   ========================================================= */

function statusClass(
  metric
) {

  if (
    !metric ||
    !Number.isFinite(metric.value)
  ) {

    return "unavailable";

  }


  if (
    typeof metric.comparison === "number" &&
    metric.comparison <= 1
  ) {

    return "within";

  }


  return "outside";

}


/* =========================================================
   METRIC CARD
   ========================================================= */

function createMetricCard(
  metric
) {

  const card =
    document.createElement("div");

  card.className =
    "metric-card";


  const name =
    document.createElement("div");

  name.className =
    "metric-name";

  name.textContent =
    metric.name ||
    metric.label ||
    metric.id ||
    "Metric";


  card.appendChild(name);


  const valueRow =
    document.createElement("div");

  valueRow.className =
    "metric-row";


  const valueLabel =
    document.createElement("span");

  valueLabel.className =
    "metric-label";

  valueLabel.textContent =
    "Your result";


  const value =
    document.createElement("span");

  value.className =
    "metric-value";

  value.textContent =
    metric.formattedValue ||
    formatValue(metric.value);


  valueRow.appendChild(
    valueLabel
  );

  valueRow.appendChild(
    value
  );

  card.appendChild(
    valueRow
  );


  const idealRow =
    document.createElement("div");

  idealRow.className =
    "metric-row";


  const idealLabel =
    document.createElement("span");

  idealLabel.className =
    "metric-label";

  idealLabel.textContent =
    "Reference range";


  const ideal =
    document.createElement("span");

  ideal.className =
    "metric-value";

  ideal.textContent =
    metric.idealText ||
    "Unavailable";


  idealRow.appendChild(
    idealLabel
  );

  idealRow.appendChild(
    ideal
  );

  card.appendChild(
    idealRow
  );


  const comparisonRow =
    document.createElement("div");

  comparisonRow.className =
    "metric-row";


  const comparisonLabel =
    document.createElement("span");

  comparisonLabel.className =
    "metric-label";

  comparisonLabel.textContent =
    "Comparison";


  const comparison =
    document.createElement("span");

  comparison.className =
    `metric-value comparison-${statusClass(metric)}`;


  if (
    typeof metric.comparison === "number" &&
    Number.isFinite(metric.comparison)
  ) {

    comparison.textContent =
      metric.comparison.toFixed(2);

  } else {

    comparison.textContent =
      "Unavailable";

  }


  comparisonRow.appendChild(
    comparisonLabel
  );

  comparisonRow.appendChild(
    comparison
  );

  card.appendChild(
    comparisonRow
  );


  return card;

}


/* =========================================================
   METRIC RESULTS
   ========================================================= */

function renderMetrics(
  metrics
) {

  metricsContainer.innerHTML = "";


  const entries =
    Object.entries(metrics);


  if (
    entries.length === 0
  ) {

    throw new Error(
      "No facial measurements were returned."
    );

  }


  const categories =
    {};


  for (
    const [key, metric] of entries
  ) {

    if (
      !metric ||
      typeof metric !== "object"
    ) {

      continue;

    }


    const category =
      metric.category ||
      "Facial Geometry";


    if (
      !categories[category]
    ) {

      categories[category] = [];

    }


    categories[category].push(
      metric
    );

  }


  for (
    const [categoryName, categoryMetrics]
    of Object.entries(categories)
  ) {

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


    category.appendChild(
      title
    );


    const grid =
      document.createElement("div");

    grid.className =
      "metrics-grid";


    for (
      const metric of categoryMetrics
    ) {

      grid.appendChild(
        createMetricCard(metric)
      );

    }


    category.appendChild(
      grid
    );


    metricsContainer.appendChild(
      category
    );

  }

}


/* =========================================================
   ANALYSIS
   ========================================================= */

analyzeButton.addEventListener(
  "click",
  async function () {

    if (
      !frontImageData ||
      !profileImageData
    ) {

      setStatus(
        "Please add both photographs.",
        "error"
      );

      return;

    }


    if (
      !mediaPipeReady ||
      !faceLandmarker
    ) {

      setStatus(
        "Facial analysis engine is still loading.",
        "error"
      );

      return;

    }


    analyzeButton.disabled =
      true;

    results.classList.remove(
      "visible"
    );

    metricsContainer.innerHTML =
      "";


    try {

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
        "Calculating facial geometry..."
      );


      const frontalScale =
        estimateScaleMm(
          frontal.landmarks
        );


      const profileScale =
        estimateScaleMm(
          profile.landmarks
        );


      const scaleMm =
        frontalScale ||
        profileScale ||
        null;


      const rawMetrics =
        calculateMetrics({
          frontal:
            frontal.landmarks,

          profile:
            profile.landmarks,

          scaleMm
        });


      if (
        !rawMetrics ||
        typeof rawMetrics !== "object"
      ) {

        throw new Error(
          "The metric engine did not return any measurements."
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


      renderMetrics(
        metrics
      );


      results.classList.add(
        "visible"
      );


      setStatus(
        "Analysis complete.",
        "success"
      );


      window.scrollTo({
        top:
          results.offsetTop - 30,
        behavior:
          "smooth"
      });

    }

    catch (error) {

      console.error(
        "FACET analysis error:",
        error
      );


      results.classList.remove(
        "visible"
      );


      setStatus(
        error.message ||
        "Facial analysis failed.",
        "error"
      );

    }

    finally {

      analyzeButton.disabled =
        !(
          frontImageData &&
          profileImageData
        );

    }

  }
);


/* =========================================================
   START
   ========================================================= */

initializeMediaPipe();
