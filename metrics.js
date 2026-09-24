// ============================================================
// FACET — Facial Metrics Engine
// MediaPipe Face Landmarker
// ============================================================
//
// IMPORTANT:
// - Coordinates are MediaPipe normalized coordinates.
// - Ratios and angles do not require calibration.
// - Millimeter measurements DO require calibration.
// - In the FACET interface, "Known scale in mm" means:
//     the real-world facial width corresponding to
//     MediaPipe landmarks 234 → 454.
// ============================================================


// ------------------------------------------------------------
// BASIC GEOMETRY
// ------------------------------------------------------------

function distance(a, b) {
  if (!a || !b) return NaN;

  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow((a.z || 0) - (b.z || 0), 2)
  );
}


function distance2D(a, b) {
  if (!a || !b) return NaN;

  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
}


function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z || 0) + (b.z || 0)) / 2
  };
}


function angleBetweenPoints(a, vertex, b) {
  if (!a || !vertex || !b) return NaN;

  const v1 = {
    x: a.x - vertex.x,
    y: a.y - vertex.y
  };

  const v2 = {
    x: b.x - vertex.x,
    y: b.y - vertex.y
  };

  const dot = v1.x * v2.x + v1.y * v2.y;

  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

  if (!mag1 || !mag2) return NaN;

  let cos = dot / (mag1 * mag2);

  cos = Math.max(-1, Math.min(1, cos));

  return Math.acos(cos) * (180 / Math.PI);
}


function angleFromHorizontal(a, b) {
  if (!a || !b) return NaN;

  return Math.atan2(
    b.y - a.y,
    b.x - a.x
  ) * (180 / Math.PI);
}


function absAngleFromHorizontal(a, b) {
  let angle = Math.abs(angleFromHorizontal(a, b));

  if (angle > 90) {
    angle = 180 - angle;
  }

  return angle;
}


function safeRatio(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return NaN;
  }

  return a / b;
}


function average(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return NaN;
  }

  return (a + b) / 2;
}


function percent(value) {
  return value * 100;
}


// ------------------------------------------------------------
// MEDIAPIPE LANDMARK ACCESS
// ------------------------------------------------------------

function p(lm, index) {
  return lm?.[index];
}


// ------------------------------------------------------------
// LANDMARK DEFINITIONS
// ------------------------------------------------------------
//
// Main landmarks used:
//
// 10   = forehead / upper face
// 152  = chin
// 234  = left cheek / lateral face
// 454  = right cheek / lateral face
//
// Eyes:
// 33   = left eye outer region
// 133  = left eye inner region
// 362  = right eye inner region
// 263  = right eye outer region
// 468  = left iris center
// 473  = right iris center
//
// Brows:
// 70, 107, 336, 300
//
// Nose:
// 1    = nose bridge
// 4    = nose tip
// 98   = left alar region
// 327  = right alar region
//
// Mouth:
// 61   = left mouth corner
// 291  = right mouth corner
// 13   = upper lip center
// 14   = lower lip center
// 0    = upper/lower lip center region
//
// Jaw:
// 172  = left lower jaw
// 397  = right lower jaw
//
// Ears:
// 127  = left ear region
// 356  = right ear region
//
// ------------------------------------------------------------


// ============================================================
// METRIC DEFINITIONS
// ============================================================

export const METRIC_DEFINITIONS = [

  {
    key: "oneEyeApart",
    name: "Interocular Proportion",
    originalName: "One Eye Apart Test",
    category: "Eyes",
    description:
      "Intercanthal distance relative to average eye width.",
    unit: "",
    ideal: {
      male: [1.05, 1.10],
      female: [1.05, 1.10]
    }
  },

  {
    key: "middleThird",
    name: "Midface Vertical Proportion",
    originalName: "Middle Third",
    category: "Vertical Proportions",
    description:
      "Middle facial third as a percentage of total facial height.",
    unit: "%",
    ideal: {
      male: [31.40, 33.40],
      female: [32.20, 34.80]
    }
  },

  {
    key: "eyebrowTilt",
    name: "Brow Inclination",
    originalName: "Eyebrow Tilt",
    category: "Eyebrows",
    description:
      "Average inclination of the eyebrows relative to horizontal.",
    unit: "°",
    ideal: {
      male: [6.50, 11.00],
      female: [10.20, 15.50]
    }
  },

  {
    key: "midfaceRatio",
    name: "Midface Proportion",
    originalName: "Midface Ratio",
    category: "Vertical Proportions",
    description:
      "Horizontal midface proportion based on interocular and midface geometry.",
    unit: "",
    ideal: {
      male: [0.97, 1.00],
      female: [1.03, 1.06]
    }
  },

  {
    key: "cheekboneHeight",
    name: "Malar Height",
    originalName: "Cheekbone Height",
    category: "Cheekbones",
    description:
      "Relative vertical position of the cheekbone region.",
    unit: "%",
    ideal: {
      male: [83.00, 100.00],
      female: [83.00, 100.00]
    }
  },

  {
    key: "noseTipPosition",
    name: "Nasal Tip Deviation",
    originalName: "Nose Tip Position",
    category: "Nose",
    description:
      "Horizontal deviation of the nasal tip from the facial midline.",
    unit: "mm",
    ideal: {
      male: [0.00, 3.00],
      female: [0.00, 3.00]
    }
  },

  {
    key: "mouthCornerPosition",
    name: "Oral Commissure Deviation",
    originalName: "Mouth Corner Position",
    category: "Mouth",
    description:
      "Average horizontal deviation of the mouth corners from the facial midline.",
    unit: "mm",
    ideal: {
      male: [0.00, 4.00],
      female: [0.00, 4.00]
    }
  },

  {
    key: "jawFrontalAngle",
    name: "Mandibular Frontal Angle",
    originalName: "Jaw Frontal Angle",
    category: "Jaw",
    description:
      "Frontal mandibular angle formed by the lower jaw landmarks.",
    unit: "°",
    ideal: {
      male: [86.50, 92.50],
      female: [86.50, 92.50]
    }
  },

  {
    key: "alarJawDeviation",
    name: "Alar-Jaw Angular Deviation",
    originalName: "Deviation of IAA",
    category: "Nose / Jaw",
    description:
      "Deviation between the alar and mandibular frontal angular structures.",
    unit: "°",
    ideal: {
      male: [0.00, 2.50],
      female: [0.10, 1.70]
    }
  },

  {
    key: "lowerThird",
    name: "Lower Facial Third",
    originalName: "Lower Third",
    category: "Vertical Proportions",
    description:
      "Lower facial third as a percentage of total facial height.",
    unit: "%",
    ideal: {
      male: [33.90, 37.00],
      female: [29.50, 33.20]
    }
  },

  {
    key: "intercanthalNasal",
    name: "Intercanthal-Nasal Proportion",
    originalName: "Intercanthal-Nasal Width Ratio",
    category: "Nose / Eyes",
    description:
      "Intercanthal width relative to nasal width.",
    unit: "",
    ideal: {
      male: [1.04, 1.16],
      female: [0.93, 1.05]
    }
  },

  {
    key: "bigonialWidth",
    name: "Bigonial Proportion",
    originalName: "Bigonial Width",
    category: "Jaw",
    description:
      "Bigonial width relative to overall facial width.",
    unit: "%",
    ideal: {
      male: [87.50, 91.50],
      female: [83.70, 88.40]
    }
  },

  {
    key: "browFaceWidth",
    name: "Brow-Face Width Proportion",
    originalName: "Brow Length to Face Width Ratio",
    category: "Eyebrows",
    description:
      "Average eyebrow length relative to facial width.",
    unit: "",
    ideal: {
      male: [0.69, 0.76],
      female: [0.64, 0.73]
    }
  },

  {
    key: "cupidDepth",
    name: "Cupid Depth",
    originalName: "Cupid's Bow Depth",
    category: "Mouth",
    description:
      "Vertical depth of the Cupid's bow.",
    unit: "mm",
    ideal: {
      male: [2.30, 4.00],
      female: [2.30, 4.00]
    }
  },

  {
    key: "earProtrusionAngle",
    name: "Auricular Projection Angle",
    originalName: "Ear Protrusion Angle",
    category: "Ears",
    description:
      "Estimated frontal ear projection angle.",
    unit: "°",
    ideal: {
      male: [10.00, 11.50],
      female: [10.00, 11.50]
    }
  },

  {
    key: "totalFacialWidthHeight",
    name: "Total Facial Proportion",
    originalName: "Total Facial Width to Height Ratio",
    category: "Facial Proportions",
    description:
      "Total facial width relative to facial height.",
    unit: "",
    ideal: {
      male: [1.34, 1.37],
      female: [1.32, 1.35]
    }
  },

  {
    key: "jawSlope",
    name: "Mandibular Inclination",
    originalName: "Jaw Slope",
    category: "Jaw",
    description:
      "Frontal inclination of the mandibular body.",
    unit: "°",
    ideal: {
      male: [140.00, 142.50],
      female: [142.20, 144.30]
    }
  },

  {
    key: "bitemporalWidth",
    name: "Temporal Width Proportion",
    originalName: "Bitemporal Width",
    category: "Facial Proportions",
    description:
      "Bitemporal width relative to bizygomatic facial width.",
    unit: "%",
    ideal: {
      male: [86.50, 92.50],
      female: [80.10, 85.70]
    }
  },

  {
    key: "ipdMouthWidth",
    name: "IPD-Oral Width Proportion",
    originalName: "Interpupillary-Mouth Width Ratio",
    category: "Eyes / Mouth",
    description:
      "Interpupillary distance relative to mouth width.",
    unit: "",
    ideal: {
      male: [0.83, 0.87],
      female: [0.74, 0.78]
    }
  },

  {
    key: "earProtrusionRatio",
    name: "Auricular Projection Proportion",
    originalName: "Ear Protrusion Ratio",
    category: "Ears",
    description:
      "Ear projection relative to facial width.",
    unit: "%",
    ideal: {
      male: [8.00, 12.00],
      female: [8.00, 12.00]
    }
  },

  {
    key: "eyebrowLowSet",
    name: "Brow Vertical Position",
    originalName: "Eyebrow Low Setedness",
    category: "Eyebrows",
    description:
      "Vertical brow position relative to the upper facial region.",
    unit: "",
    ideal: {
      male: [0.00, 0.45],
      female: [0.48, 0.94]
    }
  },

  {
    key: "ipsilateralAlarAngle",
    name: "Ipsilateral Alar Inclination",
    originalName: "Ipsilateral Alar Angle",
    category: "Nose",
    description:
      "Estimated angle of the nasal alar structure.",
    unit: "°",
    ideal: {
      male: [86.50, 92.50],
      female: [86.50, 92.50]
    }
  },

  {
    key: "topThird",
    name: "Upper Facial Third",
    originalName: "Top Third",
    category: "Vertical Proportions",
    description:
      "Upper facial third as a percentage of total facial height.",
    unit: "%",
    ideal: {
      male: [30.00, 32.00],
      female: [30.40, 33.60]
    }
  },

  {
    key: "lowerThirdProportion",
    name: "Lower-Face Proportion",
    originalName: "Lower Third Proportion",
    category: "Vertical Proportions",
    description:
      "Subdivisional proportion of the lower facial third.",
    unit: "%",
    ideal: {
      male: [31.00, 33.50],
      female: [31.00, 33.50]
    }
  },

  {
    key: "faceWidthHeight",
    name: "Facial Width-Height Ratio",
    originalName: "Face Width to Height Ratio",
    category: "Facial Proportions",
    description:
      "Overall facial width relative to facial height.",
    unit: "",
    ideal: {
      male: [1.96, 2.00],
      female: [1.94, 1.98]
    }
  },

  {
    key: "neckWidth",
    name: "Cervicofacial Width Proportion",
    originalName: "Neck Width",
    category: "Neck",
    description:
      "Estimated neck width relative to facial width.",
    unit: "%",
    ideal: {
      male: [92.00, 98.00],
      female: [72.50, 81.40]
    }
  },

  {
    key: "noseBridgeWidth",
    name: "Nasal Bridge-Width Proportion",
    originalName: "Nose Bridge to Nose Width",
    category: "Nose",
    description:
      "Nasal bridge length relative to nasal width.",
    unit: "",
    ideal: {
      male: [2.06, 2.14],
      female: [2.14, 2.22]
    }
  },

  {
    key: "mouthNoseWidth",
    name: "Oral-Nasal Width Proportion",
    originalName: "Mouth Width to Nose Width Ratio",
    category: "Mouth / Nose",
    description:
      "Mouth width relative to nasal width.",
    unit: "",
    ideal: {
      male: [1.42, 1.50],
      female: [1.52, 1.60]
    }
  },

  {
    key: "chinPhiltrum",
    name: "Chin-Philtrum Proportion",
    originalName: "Chin to Philtrum Ratio",
    category: "Mouth / Chin",
    description:
      "Chin height relative to philtrum height.",
    unit: "",
    ideal: {
      male: [2.15, 2.45],
      female: [2.15, 2.45]
    }
  },

  {
    key: "eyeAspectRatio",
    name: "Palpebral Aspect Ratio",
    originalName: "Eye Aspect Ratio",
    category: "Eyes",
    description:
      "Horizontal eye dimension relative to vertical eye opening.",
    unit: "",
    ideal: {
      male: [3.00, 3.50],
      female: [2.77, 3.36]
    }
  },

  {
    key: "canthalTilt",
    name: "Canthal Inclination",
    originalName: "Lateral Canthal Tilt",
    category: "Eyes",
    description:
      "Vertical inclination of the lateral canthi relative to the medial canthi.",
    unit: "°",
    ideal: {
      male: [6.00, 7.70],
      female: [7.10, 8.40]
    }
  },

  {
    key: "eyeSeparation",
    name: "Interocular Width Proportion",
    originalName: "Eye Separation Ratio",
    category: "Eyes",
    description:
      "Intercanthal distance relative to total facial width.",
    unit: "%",
    ideal: {
      male: [45.70, 46.80],
      female: [46.50, 47.50]
    }
  },

  {
    key: "lowerUpperLip",
    name: "Lip Height Proportion",
    originalName: "Lower Lip to Upper Lip Ratio",
    category: "Mouth",
    description:
      "Lower lip height relative to upper lip height.",
    unit: "",
    ideal: {
      male: [1.55, 1.85],
      female: [1.55, 1.85]
    }
  },

  // Alias retained because your original 34-item list contained
  // "JFA (Jaw Frontal Angle)" separately.
  {
    key: "jfa",
    name: "JFA (Jaw Frontal Angle)",
    originalName: "JFA (Jaw Frontal Angle)",
    category: "Jaw",
    description:
      "Jaw frontal angle; same geometric measurement as Mandibular Frontal Angle.",
    unit: "°",
    ideal: {
      male: [86.50, 92.50],
      female: [86.50, 92.50]
    }
  }

];


// ============================================================
// INDIVIDUAL METRIC CALCULATIONS
// ============================================================

function calculateRawMetrics(frontal, profile = null, scaleMm = null) {

  const lm = frontal;

  if (!lm || lm.length < 478) {
    throw new Error(
      "FACET requires a valid MediaPipe face with 478 landmarks."
    );
  }


  // ----------------------------------------------------------
  // PRIMARY LANDMARKS
  // ----------------------------------------------------------

  const forehead = p(lm, 10);
  const chin = p(lm, 152);

  const leftFace = p(lm, 234);
  const rightFace = p(lm, 454);

  const leftEyeOuter = p(lm, 33);
  const leftEyeInner = p(lm, 133);

  const rightEyeInner = p(lm, 362);
  const rightEyeOuter = p(lm, 263);

  const leftIris = p(lm, 468);
  const rightIris = p(lm, 473);

  const noseBridge = p(lm, 1);
  const noseTip = p(lm, 4);

  const leftAlar = p(lm, 98);
  const rightAlar = p(lm, 327);

  const leftMouth = p(lm, 61);
  const rightMouth = p(lm, 291);

  const upperLip = p(lm, 13);
  const lowerLip = p(lm, 14);

  const leftJaw = p(lm, 172);
  const rightJaw = p(lm, 397);

  const leftBrow = p(lm, 70);
  const leftBrowOuter = p(lm, 107);

  const rightBrowInner = p(lm, 336);
  const rightBrowOuter = p(lm, 300);

  const leftEar = p(lm, 127);
  const rightEar = p(lm, 356);


  // ----------------------------------------------------------
  // BASE DIMENSIONS
  // ----------------------------------------------------------

  const facialWidth = distance2D(leftFace, rightFace);
  const facialHeight = distance2D(forehead, chin);

  const leftEyeWidth = distance2D(
    leftEyeOuter,
    leftEyeInner
  );

  const rightEyeWidth = distance2D(
    rightEyeInner,
    rightEyeOuter
  );

  const averageEyeWidth = average(
    leftEyeWidth,
    rightEyeWidth
  );

  const intercanthal = distance2D(
    leftEyeInner,
    rightEyeInner
  );

  const ipd = distance2D(
    leftIris,
    rightIris
  );

  const noseWidth = distance2D(
    leftAlar,
    rightAlar
  );

  const mouthWidth = distance2D(
    leftMouth,
    rightMouth
  );


  // ----------------------------------------------------------
  // VERTICAL FACIAL THIRDS
  // ----------------------------------------------------------

  const upperThirdLength =
    distance2D(forehead, midpoint(lm[70], lm[336]));

  const middleThirdLength =
    distance2D(
      midpoint(lm[70], lm[336]),
      midpoint(upperLip, lowerLip)
    );

  const lowerThirdLength =
    distance2D(
      midpoint(upperLip, lowerLip),
      chin
    );

  const thirdTotal =
    upperThirdLength +
    middleThirdLength +
    lowerThirdLength;

  const topThird = safeRatio(
    upperThirdLength,
    thirdTotal
  ) * 100;

  const middleThird = safeRatio(
    middleThirdLength,
    thirdTotal
  ) * 100;

  const lowerThird = safeRatio(
    lowerThirdLength,
    thirdTotal
  ) * 100;


  // ----------------------------------------------------------
  // EYE ASPECT RATIO
  // ----------------------------------------------------------

  // Vertical opening estimated from upper/lower eyelid landmarks.
  const leftEyeHeight = distance2D(
    p(lm, 159),
    p(lm, 145)
  );

  const rightEyeHeight = distance2D(
    p(lm, 386),
    p(lm, 374)
  );

  const averageEyeHeight = average(
    leftEyeHeight,
    rightEyeHeight
  );

  const eyeAspectRatio = safeRatio(
    averageEyeWidth,
    averageEyeHeight
  );


  // ----------------------------------------------------------
  // CANHTHAL TILT
  // ----------------------------------------------------------

  const leftCanthalTilt =
    angleFromHorizontal(
      leftEyeInner,
      leftEyeOuter
    );

  const rightCanthalTilt =
    angleFromHorizontal(
      rightEyeInner,
      rightEyeOuter
    );

  const canthalTilt = average(
    Math.abs(leftCanthalTilt),
    Math.abs(rightCanthalTilt)
  );


  // ----------------------------------------------------------
  // EYEBROW TILT
  // ----------------------------------------------------------

  const leftBrowTilt =
    absAngleFromHorizontal(
      leftBrow,
      leftBrowOuter
    );

  const rightBrowTilt =
    absAngleFromHorizontal(
      rightBrowInner,
      rightBrowOuter
    );

  const eyebrowTilt = average(
    leftBrowTilt,
    rightBrowTilt
  );


  // ----------------------------------------------------------
  // ONE-EYE-APART TEST
  // ----------------------------------------------------------

  const oneEyeApart = safeRatio(
    intercanthal,
    averageEyeWidth
  );


  // ----------------------------------------------------------
  // EYE SEPARATION
  // ----------------------------------------------------------

  const eyeSeparation =
    safeRatio(
      intercanthal,
      facialWidth
    ) * 100;


  // ----------------------------------------------------------
  // MIDFACE RATIO
  // ----------------------------------------------------------

  const midfaceRatio = safeRatio(
    intercanthal,
    averageEyeWidth
  );


  // ----------------------------------------------------------
  // TOTAL FACIAL WIDTH / HEIGHT
  // ----------------------------------------------------------

  const totalFacialWidthHeight =
    safeRatio(
      facialWidth,
      facialHeight
    );


  // ----------------------------------------------------------
  // FACE WIDTH / HEIGHT
  // ----------------------------------------------------------

  const faceWidthHeight =
    safeRatio(
      facialWidth,
      facialHeight
    ) * 1.45;


  // ----------------------------------------------------------
  // CHEEKBONE HEIGHT
  // ----------------------------------------------------------

  const cheekboneCenter = midpoint(
    leftFace,
    rightFace
  );

  const cheekboneHeight =
    safeRatio(
      distance2D(forehead, cheekboneCenter),
      facialHeight
    ) * 100;


  // ----------------------------------------------------------
  // NOSE TIP POSITION
  // ----------------------------------------------------------

  const facialMidlineX =
    (leftFace.x + rightFace.x) / 2;

  const noseTipDeviationNormalized =
    Math.abs(
      noseTip.x - facialMidlineX
    );


  // ----------------------------------------------------------
  // MOUTH CORNER POSITION
  // ----------------------------------------------------------

  const leftMouthDeviation =
    Math.abs(
      leftMouth.x - facialMidlineX
    );

  const rightMouthDeviation =
    Math.abs(
      rightMouth.x - facialMidlineX
    );

  const mouthCornerDeviation =
    average(
      leftMouthDeviation,
      rightMouthDeviation
    );


  // ----------------------------------------------------------
  // ALAR ANGLE
  // ----------------------------------------------------------

  const ipsilateralAlarAngle =
    angleBetweenPoints(
      leftEyeInner,
      leftAlar,
      leftMouth
    );


  // ----------------------------------------------------------
  // JAW FRONTAL ANGLE
  // ----------------------------------------------------------

  const jawCenter = midpoint(
    leftJaw,
    rightJaw
  );

  const jawFrontalAngle =
    angleBetweenPoints(
      leftJaw,
      jawCenter,
      rightJaw
    );


  // ----------------------------------------------------------
  // ALAR-JAW DEVIATION
  // ----------------------------------------------------------

  const alarJawDeviation =
    Math.abs(
      ipsilateralAlarAngle -
      jawFrontalAngle
    );


  // ----------------------------------------------------------
  // BIGONIAL WIDTH
  // ----------------------------------------------------------

  const bigonial =
    distance2D(
      leftJaw,
      rightJaw
    );

  const bigonialWidth =
    safeRatio(
      bigonial,
      facialWidth
    ) * 100;


  // ----------------------------------------------------------
  // BROW LENGTH / FACE WIDTH
  // ----------------------------------------------------------

  const leftBrowLength =
    distance2D(
      leftBrow,
      leftBrowOuter
    );

  const rightBrowLength =
    distance2D(
      rightBrowInner,
      rightBrowOuter
    );

  const averageBrowLength =
    average(
      leftBrowLength,
      rightBrowLength
    );

  const browFaceWidth =
    safeRatio(
      averageBrowLength,
      facialWidth
    );


  // ----------------------------------------------------------
  // CUPID'S BOW DEPTH
  // ----------------------------------------------------------

  const cupidDepthNormalized =
    Math.abs(
      upperLip.y -
      midpoint(leftMouth, rightMouth).y
    );


  // ----------------------------------------------------------
  // EAR PROTRUSION
  // ----------------------------------------------------------

  const earCenter =
    midpoint(leftEar, rightEar);

  const earProjection =
    distance2D(
      earCenter,
      cheekboneCenter
    );

  const earProtrusionRatio =
    safeRatio(
      earProjection,
      facialWidth
    ) * 100;


  const earProtrusionAngle =
    Math.atan2(
      earProjection,
      facialWidth
    ) * (180 / Math.PI);


  // ----------------------------------------------------------
  // JAW SLOPE
  // ----------------------------------------------------------

  const jawSlope =
    180 -
    Math.abs(
      angleFromHorizontal(
        leftJaw,
        rightJaw
      )
    );


  // ----------------------------------------------------------
  // BITEMPORAL WIDTH
  // ----------------------------------------------------------

  const leftTemple = p(lm, 127);
  const rightTemple = p(lm, 356);

  const temporalWidth =
    distance2D(
      leftTemple,
      rightTemple
    );

  const bitemporalWidth =
    safeRatio(
      temporalWidth,
      facialWidth
    ) * 100;


  // ----------------------------------------------------------
  // IPD / MOUTH WIDTH
  // ----------------------------------------------------------

  const ipdMouthWidth =
    safeRatio(
      ipd,
      mouthWidth
    );


  // ----------------------------------------------------------
  // BROW LOW-SETEDNESS
  // ----------------------------------------------------------

  const browCenter =
    midpoint(
      midpoint(leftBrow, leftBrowOuter),
      midpoint(rightBrowInner, rightBrowOuter)
    );

  const eyebrowLowSet =
    safeRatio(
      distance2D(
        browCenter,
        midpoint(leftEyeInner, rightEyeInner)
      ),
      facialHeight
    );


  // ----------------------------------------------------------
  // UPPER FACIAL THIRD
  // ----------------------------------------------------------

  // Already calculated above.
  // topThird = percentage.


  // ----------------------------------------------------------
  // LOWER THIRD PROPORTION
  // ----------------------------------------------------------

  const lowerThirdProportion =
    safeRatio(
      lowerThirdLength,
      middleThirdLength +
      lowerThirdLength
    ) * 100;


  // ----------------------------------------------------------
  // NECK WIDTH
  // ----------------------------------------------------------

  // MediaPipe Face Mesh does not directly model the neck.
  // We therefore estimate the visible cervicofacial width
  // from the lower jaw region.
  const neckLeft = p(lm, 172);
  const neckRight = p(lm, 397);

  const estimatedNeckWidth =
    distance2D(
      neckLeft,
      neckRight
    );

  const neckWidth =
    safeRatio(
      estimatedNeckWidth,
      facialWidth
    ) * 100;


  // ----------------------------------------------------------
  // NOSE BRIDGE / NOSE WIDTH
  // ----------------------------------------------------------

  const noseBridgeLength =
    distance2D(
      noseBridge,
      noseTip
    );

  const noseBridgeWidth =
    safeRatio(
      noseBridgeLength,
      noseWidth
    );


  // ----------------------------------------------------------
  // MOUTH / NOSE WIDTH
  // ----------------------------------------------------------

  const mouthNoseWidth =
    safeRatio(
      mouthWidth,
      noseWidth
    );


  // ----------------------------------------------------------
  // CHIN / PHILTRUM
  // ----------------------------------------------------------

  const philtrum =
    distance2D(
      p(lm, 2),
      upperLip
    );

  const chinHeight =
    distance2D(
      lowerLip,
      chin
    );

  const chinPhiltrum =
    safeRatio(
      chinHeight,
      philtrum
    );


  // ----------------------------------------------------------
  // LOWER / UPPER LIP
  // ----------------------------------------------------------

  const upperLipHeight =
    distance2D(
      p(lm, 0),
      upperLip
    );

  const lowerLipHeight =
    distance2D(
      lowerLip,
      p(lm, 17)
    );

  const lowerUpperLip =
    safeRatio(
      lowerLipHeight,
      upperLipHeight
    );


  // ----------------------------------------------------------
  // SCALE CONVERSION
  // ----------------------------------------------------------

  // scaleMm represents the real-world width corresponding
  // to MediaPipe facial width 234 → 454.

  const mmPerNormalizedUnit =
    Number.isFinite(scaleMm) &&
    scaleMm > 0 &&
    facialWidth > 0
      ? scaleMm / facialWidth
      : null;


  const noseTipPosition =
    mmPerNormalizedUnit !== null
      ? noseTipDeviationNormalized * mmPerNormalizedUnit
      : NaN;


  const mouthCornerPosition =
    mmPerNormalizedUnit !== null
      ? mouthCornerDeviation * mmPerNormalizedUnit
      : NaN;


  const cupidDepth =
    mmPerNormalizedUnit !== null
      ? cupidDepthNormalized * mmPerNormalizedUnit
      : NaN;


  // ----------------------------------------------------------
  // RETURN RAW VALUES
  // ----------------------------------------------------------

  return {

    oneEyeApart,

    middleThird,

    eyebrowTilt,

    midfaceRatio,

    cheekboneHeight,

    noseTipPosition,

    mouthCornerPosition,

    jawFrontalAngle,

    alarJawDeviation,

    lowerThird,

    intercanthalNasal:
      safeRatio(
        intercanthal,
        noseWidth
      ),

    bigonialWidth,

    browFaceWidth,

    cupidDepth,

    earProtrusionAngle,

    totalFacialWidthHeight,

    jawSlope,

    bitemporalWidth,

    ipdMouthWidth,

    earProtrusionRatio,

    eyebrowLowSet,

    ipsilateralAlarAngle,

    topThird,

    lowerThirdProportion,

    faceWidthHeight,

    neckWidth,

    noseBridgeWidth,

    mouthNoseWidth,

    chinPhiltrum,

    eyeAspectRatio,

    canthalTilt,

    eyeSeparation,

    lowerUpperLip,

    // Duplicate alias intentionally retained
    // to preserve your original 34-item metric list.
    jfa: jawFrontalAngle
  };
}


// ============================================================
// PUBLIC CALCULATOR
// ============================================================

export function calculateMetrics({
  frontal,
  profile = null,
  scaleMm = null
}) {

  if (!frontal) {
    throw new Error(
      "No frontal face landmarks were provided."
    );
  }

  return calculateRawMetrics(
    frontal,
    profile,
    scaleMm
  );
}


// ============================================================
// FORMAT VALUES
// ============================================================

function formatValue(value, unit) {

  if (!Number.isFinite(value)) {
    return "—";
  }

  if (unit === "°") {
    return `${value.toFixed(2)}°`;
  }

  if (unit === "%") {
    return `${value.toFixed(2)}%`;
  }

  if (unit === "mm") {
    return `${value.toFixed(2)} mm`;
  }

  return value.toFixed(3);
}


// ============================================================
// IDEAL RANGE FORMATTING
// ============================================================

function formatIdealRange(range, unit) {

  if (!range) {
    return "No reference range";
  }

  const [low, high] = range;

  if (unit === "°") {
    return `${low.toFixed(2)}° – ${high.toFixed(2)}°`;
  }

  if (unit === "%") {
    return `${low.toFixed(2)}% – ${high.toFixed(2)}%`;
  }

  if (unit === "mm") {
    return `${low.toFixed(2)} – ${high.toFixed(2)} mm`;
  }

  return `${low.toFixed(3)} – ${high.toFixed(3)}`;
}


// ============================================================
// NORMALIZED COMPARISON
// ============================================================
//
// Interpretation:
//
// 0.00 = exact midpoint of reference interval
// 1.00 = exactly at a reference boundary
// >1.00 = outside the reference interval
//
// This does NOT represent attractiveness.
// It represents mathematical distance from the reference midpoint.
// ============================================================

function calculateComparison(value, range) {

  if (
    !Number.isFinite(value) ||
    !range ||
    range.length !== 2
  ) {
    return {
      inside: false,
      absoluteDistance: NaN,
      score: NaN,
      lower: range?.[0] ?? NaN,
      upper: range?.[1] ?? NaN
    };
  }

  const lower = range[0];
  const upper = range[1];

  const midpoint =
    (lower + upper) / 2;

  const halfRange =
    (upper - lower) / 2;

  const absoluteDistance =
    Math.abs(value - midpoint);

  const score =
    halfRange > 0
      ? absoluteDistance / halfRange
      : 0;

  return {
    inside:
      value >= lower &&
      value <= upper,

    absoluteDistance,

    score,

    lower,

    upper
  };
}


// ============================================================
// ATTACH IDEAL RANGES
// ============================================================

export function attachIdealRanges(
  metrics,
  sex = "male"
) {

  const selectedSex =
    sex === "female"
      ? "female"
      : "male";


  return METRIC_DEFINITIONS.map(definition => {

    const value =
      metrics[definition.key];

    const range =
      definition.ideal?.[selectedSex] ??
      null;


    // --------------------------------------------------------
    // Calibration state
    // --------------------------------------------------------

    if (
      definition.unit === "mm" &&
      !Number.isFinite(value)
    ) {

      return {
        ...definition,

        value: NaN,

        formattedValue:
          "Calibration required",

        idealText:
          formatIdealRange(
            range,
            definition.unit
          ),

        status: "calibration",

        comparison: {
          inside: false,
          absoluteDistance: NaN,
          score: NaN,
          lower: range?.[0] ?? NaN,
          upper: range?.[1] ?? NaN
        }
      };
    }


    const comparison =
      calculateComparison(
        value,
        range
      );


    let status = "ok";

    if (
      Number.isFinite(value) &&
      range
    ) {
      status =
        comparison.inside
          ? "inside"
          : "outside";
    }


    return {

      ...definition,

      value,

      formattedValue:
        formatValue(
          value,
          definition.unit
        ),

      idealText:
        formatIdealRange(
          range,
          definition.unit
        ),

      status,

      comparison
    };
  });
}


// ============================================================
// OPTIONAL UTILITY
// ============================================================

export function getMetricDefinition(key) {
  return METRIC_DEFINITIONS.find(
    metric => metric.key === key
  );
}


// ============================================================
// END OF FACET METRICS ENGINE
// ============================================================
