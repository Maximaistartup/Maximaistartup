// FACET — Facial Geometry Metrics
// MediaPipe Face Landmarker landmark calculations

function distance(a, b) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2
  };
}

function angle(a, b, c) {
  const ab = {
    x: a.x - b.x,
    y: a.y - b.y
  };

  const cb = {
    x: c.x - b.x,
    y: c.y - b.y
  };

  const dot = ab.x * cb.x + ab.y * cb.y;

  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);

  if (!magAB || !magCB) return null;

  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));

  return Math.acos(cos) * (180 / Math.PI);
}


// ============================================================
// REFERENCE RANGES
// ============================================================

export const IDEAL_RANGES = {

  // ---------- FACIAL PROPORTIONS ----------

  upperFacialThird: {
    male: [30.0, 32.0],
    female: [30.4, 33.6],
    unit: "%"
  },

  midfaceVerticalProportion: {
    male: [31.4, 33.4],
    female: [32.2, 34.8],
    unit: "%"
  },

  lowerFacialThird: {
    male: [33.9, 37.0],
    female: [29.5, 33.2],
    unit: "%"
  },

  lowerFaceProportion: {
    all: [31.0, 33.5],
    unit: "%"
  },

  facialWidthHeightRatio: {
    male: [1.96, 2.00],
    female: [1.94, 1.98],
    unit: ""
  },

  totalFacialProportion: {
    male: [1.34, 1.37],
    female: [1.32, 1.35],
    unit: ""
  },

  temporalWidthProportion: {
    male: [86.5, 92.5],
    female: [80.1, 85.7],
    unit: "%"
  },

  midfaceProportion: {
    male: [0.97, 1.00],
    female: [1.03, 1.06],
    unit: ""
  },

  malarHeight: {
    all: [83.0, 100.0],
    unit: "%"
  },

  bigonialProportion: {
    male: [87.5, 91.5],
    female: [83.7, 88.4],
    unit: "%"
  },

  cervicofacialWidthProportion: {
    male: [92.0, 98.0],
    female: [72.5, 81.4],
    unit: "%"
  },


  // ---------- EYES ----------

  interocularProportion: {
    all: [1.05, 1.10],
    unit: ""
  },

  palpebralAspectRatio: {
    male: [3.00, 3.50],
    female: [2.77, 3.36],
    unit: ""
  },

  interocularWidthProportion: {
    male: [45.7, 46.8],
    female: [46.5, 47.5],
    unit: "%"
  },

  canthalInclination: {
    male: [6.0, 7.7],
    female: [7.1, 8.4],
    unit: "°"
  },


  // ---------- EYEBROWS ----------

  browFaceWidthProportion: {
    male: [0.69, 0.76],
    female: [0.64, 0.73],
    unit: ""
  },

  browInclination: {
    male: [6.5, 11.0],
    female: [10.2, 15.5],
    unit: "°"
  },

  browVerticalPosition: {
    male: [0.0, 0.45],
    female: [0.48, 0.94],
    unit: ""
  },


  // ---------- NOSE ----------

  nasalTipDeviation: {
    all: [0.0, 3.0],
    unit: "mm"
  },

  intercanthalNasalProportion: {
    male: [1.04, 1.16],
    female: [0.93, 1.05],
    unit: ""
  },

  nasalBridgeWidthProportion: {
    male: [2.06, 2.14],
    female: [2.14, 2.22],
    unit: ""
  },

  nasalWidthFaceProportion: {
    all: [0.25, 0.27],
    unit: ""
  },

  ipsilateralAlarInclination: {
    all: [86.5, 92.5],
    unit: "°"
  },

  alarJawAngularDeviation: {
    male: [0.0, 2.5],
    female: [0.1, 1.7],
    unit: "°"
  },


  // ---------- MOUTH / LIPS ----------

  oralCommissureDeviation: {
    all: [0.0, 4.0],
    unit: "mm"
  },

  cupidDepth: {
    all: [2.3, 4.0],
    unit: "mm"
  },

  oralNasalWidthProportion: {
    male: [1.42, 1.50],
    female: [1.52, 1.60],
    unit: ""
  },

  ipdOralWidthProportion: {
    male: [0.83, 0.87],
    female: [0.74, 0.78],
    unit: ""
  },

  chinPhiltrumProportion: {
    all: [2.15, 2.45],
    unit: ""
  },

  lipHeightProportion: {
    all: [1.55, 1.85],
    unit: ""
  },


  // ---------- JAW ----------

  mandibularFrontalAngle: {
    all: [86.5, 92.5],
    unit: "°"
  },

  mandibularInclination: {
    male: [140.0, 142.5],
    female: [142.2, 144.3],
    unit: "°"
  },


  // ---------- EARS ----------

  auricularProjectionAngle: {
    all: [10.0, 11.5],
    unit: "°"
  },

  auricularProjectionProportion: {
    all: [8.0, 12.0],
    unit: "%"
  }
};


// ============================================================
// RANGE / DEVIATION ENGINE
// ============================================================

export function compareToIdeal(value, range) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    !range
  ) {
    return {
      value,
      lower: null,
      upper: null,
      deviation: null,
      score: null,
      inside: false
    };
  }

  const lower = range[0];
  const upper = range[1];

  let deviation = 0;

  if (value < lower) {
    deviation = lower - value;
  } else if (value > upper) {
    deviation = value - upper;
  }

  const intervalWidth = upper - lower;

  const score =
    deviation === 0
      ? 0
      : deviation / intervalWidth;

  return {
    value,
    lower,
    upper,
    deviation,
    score,
    inside: deviation === 0
  };
}


// ============================================================
// FORMATTER
// ============================================================

export function formatMetricComparison(value, range, decimals = 2) {

  const comparison = compareToIdeal(value, range);

  if (comparison.value === null) {
    return {
      value: "N/A",
      ideal: "N/A",
      deviation: "N/A",
      score: null,
      inside: false
    };
  }

  return {
    value: Number(value.toFixed(decimals)),
    ideal: `${range[0]}–${range[1]}`,
    deviation: Number(comparison.deviation.toFixed(decimals)),
    score: Number(comparison.score.toFixed(2)),
    inside: comparison.inside
  };
}


// ============================================================
// MAIN FACIAL MEASUREMENTS
// ============================================================

export function calculateMetrics(landmarks) {

  const L = landmarks;

  // Basic facial dimensions
  const facialWidth = distance(L[234], L[454]);
  const facialHeight = distance(L[10], L[152]);

  // Eyes
  const leftEyeWidth = distance(L[33], L[133]);
  const rightEyeWidth = distance(L[362], L[263]);

  const averageEyeWidth =
    (leftEyeWidth + rightEyeWidth) / 2;

  const intercanthalDistance =
    distance(L[133], L[362]);

  const interpupillaryDistance =
    distance(L[468], L[473]);

  // Nose
  const noseWidth =
    distance(L[98], L[327]);

  // Mouth
  const mouthWidth =
    distance(L[61], L[291]);

  // ----------------------------------------------------------
  // METRICS
  // ----------------------------------------------------------

  const metrics = {

    interocularProportion:
      intercanthalDistance / averageEyeWidth,

    facialWidthHeightRatio:
      facialWidth / facialHeight,

    totalFacialProportion:
      facialWidth / facialHeight,

    interocularWidthProportion:
      (intercanthalDistance / facialWidth) * 100,

    interpupillaryDistance:
      (interpupillaryDistance / facialWidth) * 100,

    palpebralAspectRatio:
      averageEyeWidth / distance(L[159], L[145]),

    nasalWidthFaceProportion:
      noseWidth / facialWidth,

    intercanthalNasalProportion:
      intercanthalDistance / noseWidth,

    oralNasalWidthProportion:
      mouthWidth / noseWidth,

    ipdOralWidthProportion:
      interpupillaryDistance / mouthWidth
  };


  // ----------------------------------------------------------
  // FACIAL MIDLINE DEVIATION
  // ----------------------------------------------------------

  const facialMidline =
    midpoint(L[234], L[454]);

  const noseDeviation =
    Math.abs(L[4].x - facialMidline.x) * facialWidth;

  const chinDeviation =
    Math.abs(L[152].x - facialMidline.x) * facialWidth;


  metrics.nasalTipDeviation = noseDeviation;
  metrics.chinDeviation = chinDeviation;


  // ----------------------------------------------------------
  // CANthal TILT
  // ----------------------------------------------------------

  metrics.canthalInclination =
    Math.atan2(
      L[263].y - L[362].y,
      L[263].x - L[362].x
    ) * (180 / Math.PI);


  // ----------------------------------------------------------
  // JAW FRONTAL ANGLE
  // ----------------------------------------------------------

  metrics.mandibularFrontalAngle =
    angle(L[234], L[152], L[454]);


  return metrics;
}


// ============================================================
// ADD REFERENCE INFORMATION TO RESULTS
// ============================================================

export function attachIdealRanges(metrics, sex = "male") {

  const results = {};

  for (const [key, value] of Object.entries(metrics)) {

    const definition = IDEAL_RANGES[key];

    if (!definition) {
      results[key] = {
        value
      };
      continue;
    }

    const range =
      definition[sex] ||
      definition.all;

    results[key] = {
      value,
      ideal: range,
      unit: definition.unit,
      comparison: compareToIdeal(value, range)
    };
  }

  return results;
}
