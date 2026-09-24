import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateMetrics, attachIdealRanges } from "./metrics.js";

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

async function initEngine() {
  try {
    statusEl.textContent = "Loading MediaPipe...";

    const vision = await FilesetResolver.forVisionTasks(
      "/node_modules/@mediapipe/tasks-vision/wasm"
    );

    faceLandmarker =
      await FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          numFaces: 1
        }
      );

    statusEl.textContent =
      "Ready. Upload frontal image.";

    if ($("coreStatus")) {
      $("coreStatus").textContent =
        "CORE ACTIVE";
    }
  } catch (err) {
    console.error(err);

    statusEl.textContent =
      "Failed to load MediaPipe.";

    if ($("coreStatus")) {
      $("coreStatus").textContent =
        "CORE ERROR";
    }
  }
}

function updateButtonState() {
  analyzeButton.disabled =
    !(frontImage && profileImage);
}

function loadImageFile(
  file,
  preview,
  filename,
  card,
  callback
) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const dataURL = e.target.result;

    preview.src = dataURL;
    preview.style.display = "block";

    const placeholder =
      card.querySelector(".placeholder");

    if (placeholder) {
      placeholder.style.display = "none";
    }

    card.classList.add("has-image");
    filename.textContent = file.name;

    callback(dataURL);
  };

  reader.readAsDataURL(file);
}

frontFile.addEventListener(
  "change",
  (e) => {
    const file = e.target.files[0];

    loadImageFile
