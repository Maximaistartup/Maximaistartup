import {
  FaceLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

import {
  calculateMetrics,
  attachIdealRanges
} from "./metrics.js";


const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";


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


let frontImage =
  null;

let profileImage =
  null;

let faceLandmarker =
  null;

let engineReady =
  false;


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
  message,
  type = ""
) {

  status.textContent =
    message;

  status.className =
    type;

}


/* =========================================================
   IMAGE LOADER
   ========================================================= */

function loadImage(
  dataURL
) {

  return new Promise(
    (resolve, reject) => {

      const image =
        new Image();

      image.onload =
        () => resolve(image);

      image.onerror =
        () =>
          reject(
            new Error(
              "The uploaded image could not be read."
            )
          );

      image.src =
        dataURL;

    }
  );

}


/* =========================================================
   FILE READER
   ========================================================= */

function readFile(
  file
) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(
          reader.result
        );

      reader.onerror =
        () =>
          reject(
            new Error(
              "The image file could not be read."
            )
          );

      reader.readAsDataURL(
        file
      );

    }
  );

}


/* =========================================================
   MEDIAPIPE INITIALIZATION
   ========================================================= */

async function initialize() {

  try {

    setStatus(
      "Loading FACET analysis engine..."
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
            modelAssetPath:
              MODEL_URL
          },

          runningMode:
            "IMAGE",

          numFaces:
            2,

          minFaceDetectionConfidence:
            0.5,

          minFacePresenceConfidence:
            0.5
        }
      );


    engineReady =
      true;


    updateButton();


  }

  catch (error) {

    console.error(
      error
    );

    setStatus(
      "FACET could not load the facial analysis engine. Open the browser console for the exact error.",
      "error"
    );

  }

}


/* =========================================================
   FRONT PHOTO
   ========================================================= */

frontFile.addEventListener(
  "change",
  async () => {

    if (
      !frontFile.files ||
      !frontFile.files[0]
    ) {
      return;
    }


    try {

      const file =
        frontFile.files[0];


      frontImage =
        await readFile(
          file
        );


      frontPreview.src =
        frontImage;


      frontPreview.classList.add(
        "visible"
      );


      frontCard.classList.add(
        "has-image"
      );


      frontFilename.textContent =
        file.name;


      updateButton();

    }

    catch (error) {

      setStatus(
        error.message,
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
  async () => {

    if (
      !profileFile.files ||
      !profileFile.files[0]
    ) {
      return;
    }


    try {

      const file =
        profileFile.files[0];


      profileImage =
        await readFile(
          file
        );


      profilePreview.src =
        profileImage;


      profilePreview.classList.add(
        "visible"
      );


      profileCard.classList.add(
        "has-image"
      );


      profileFilename.textContent =
        file.name;


      updateButton();

    }

    catch (error) {

      setStatus(
        error.message,
        "error"
      );

    }

  }
);


/* =========================================================
   BUTTON
   ========================================================= */

function updateButton() {

  const ready =
    engineReady &&
    frontImage &&
    profileImage;


  analyzeButton.disabled =
    !ready;


  if (
    ready
  ) {

    setStatus(
      "Both photographs loaded. Ready for analysis.",
      "success"
    );

  }

}


/* =========================================================
   FACE DETECTION
   ========================================================= */

async function detectFace(
  dataURL,
  description
) {

  const image =
    await loadImage(
      dataURL
    );


  const result =
    faceLandmarker.detect(
      image
    );


  if (
    !result ||
    !result.faceLandmarks ||
    result.faceLandmarks.length === 0
  ) {

    throw new Error(
      `Please input a human face in the ${description} photograph.`
    );

  }


  if (
    result.faceLandmarks.length > 1
  ) {

    throw new Error(
      `Please input exactly one human face in the ${description} photograph.`
    );

  }


  return result.faceLandmarks[0];

}


/* =========================================================
   RENDER ONE METRIC
   ========================================================= */

function renderMetric(
  metric
) {

  const card =
    document.createElement(
      "div"
    );

  card.className =
    "metric-card";


  const title =
    document.createElement(
      "div"
    );

  title.className =
    "metric-name";

  title.textContent =
    metric.name ||
    metric.label ||
    metric.id ||
    "Metric";


  card.appendChild(
    title
  );


  const valueRow =
    document.createElement(
      "div"
    );

  valueRow.className =
    "metric-row";


  valueRow.innerHTML =
    `
      <span class="metric-label">
        Your result
      </span>

      <span class="metric-value">
        ${
          metric.formattedValue ??
          (
            Number.isFinite(metric.value)
              ? metric.value.toFixed(2)
              : "Unavailable"
          )
        }
      </span>
    `;


  card.appendChild(
    valueRow
  );


  const idealRow =
    document.createElement(
      "div"
    );

  idealRow.className =
    "metric-row";


  idealRow.innerHTML =
    `
      <span class="metric-label">
        Reference range
      </span>

      <span class="metric-value">
        ${
          metric.idealText ??
          "Unavailable"
        }
      </span>
    `;


  card.appendChild(
    idealRow
  );


  const comparisonRow =
    document.createElement(
      "div"
    );

  comparisonRow.className =
    "metric-row";


  let comparisonText =
    "Unavailable";


  if (
    Number.isFinite(
      metric.comparison
    )
  ) {

    comparisonText =
      metric.comparison.toFixed(
        2
      );

  }


  comparisonRow.innerHTML =
    `
      <span class="metric-label">
        Comparison
      </span>

      <span class="metric-value">
        ${comparisonText}
      </span>
    `;


  card.appendChild(
    comparisonRow
  );


  return card;

}


/* =========================================================
   RENDER RESULTS
   ========================================================= */

function renderResults(
  metrics
) {

  metricsContainer.innerHTML =
    "";


  const categories =
    {};


  for (
    const metric of Object.values(
      metrics
    )
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

      categories[category] =
        [];

    }


    categories[category].push(
      metric
    );

  }


  for (
    const [
      categoryName,
      categoryMetrics
    ]
    of Object.entries(
      categories
    )
  ) {

    const category =
      document.createElement(
        "div"
      );

    category.className =
      "category";


    const title =
      document.createElement(
        "div"
      );

    title.className =
      "category-title";

    title.textContent =
      categoryName;


    category.appendChild(
      title
    );


    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "metrics-grid";


    for (
      const metric
      of categoryMetrics
    ) {

      grid.appendChild(
        renderMetric(
          metric
        )
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
   ANALYZE
   ========================================================= */

analyzeButton.addEventListener(
  "click",
  async () => {

    try {

      analyzeButton.disabled =
        true;


      results.classList.remove(
        "visible"
      );


      metricsContainer.innerHTML =
        "";


      setStatus(
        "Detecting face in frontal photograph..."
      );


      const frontal =
        await detectFace(
          frontImage,
          "frontal"
        );


      setStatus(
        "Detecting face in side-profile photograph..."
      );


      const profile =
        await detectFace(
          profileImage,
          "side-profile"
        );


      setStatus(
        "Calculating facial measurements..."
      );


      /*
       * IMPORTANT:
       *
       * No artificial physical facial width is used here.
       *
       * The metric engine receives the actual MediaPipe
       * landmarks from this individual.
       *
       * Ratios and angles are therefore scale-independent.
       */

      const rawMetrics =
        calculateMetrics(
          {
            frontal,
            profile,

            scaleMm:
              null
          }
        );


      if (
        !rawMetrics ||
        Object.keys(
          rawMetrics
        ).length === 0
      ) {

        throw new Error(
          "No measurements were returned by the FACET metric engine."
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


      renderResults(
        metrics
      );


      results.classList.add(
        "visible"
      );


      setStatus(
        "Analysis complete.",
        "success"
      );


      results.scrollIntoView(
        {
          behavior: "smooth",
          block: "start"
        }
      );

    }

    catch (error) {

      console.error(
        "FACET ERROR:",
        error
      );


      results.classList.remove(
        "visible"
      );


      setStatus(
        error.message ||
        "FACET analysis failed.",
        "error"
      );

    }

    finally {

      updateButton();

    }

  }
);


/* =========================================================
   START
   ========================================================= */

initialize();
