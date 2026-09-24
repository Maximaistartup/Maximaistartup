/*
  FACET METRIC ENGINE

  IMPORTANT:
  Coordinates come directly from MediaPipe Face Landmarker.

  x and y are normalized image coordinates.
  Therefore:

      distance(A,B)

  by itself is NOT a physical measurement.

  FACET therefore prefers:

      distance(A,B) / distance(C,D)

  and angles.

  No universal 140 mm face-width assumption is used.
*/


/* =========================================================
   BASIC GEOMETRY
========================================================= */

function point(lm, index) {

  return lm[index];
}


function distance(a, b) {

  if (!a || !b) return NaN;

  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}


function ratio(a, b) {

  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    b === 0
  ) {
    return NaN;
  }

  return a / b;
}


function midpoint(a, b) {

  if (!a || !b) return null;

  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2
  };
}


function vector(a, b) {

  return {
    x: b.x - a.x,
    y: b.y - a.y
  };
}


function vectorLength(v) {

  return Math.hypot(v.x, v.y);
}


function dot(a, b) {

  return a.x * b.x + a.y * b.y;
}


function angleBetweenVectors(a, b) {

  const denominator =
    vectorLength(a) *
    vectorLength(b);

  if (denominator === 0) {
    return NaN;
  }

  const value =
    Math.max(
      -1,
      Math.min(
        1,
        dot(a, b) / denominator
      )
    );

  return Math.acos(value) * 180 / Math.PI;
}


function angle(a, b, c) {

  if (!a || !b || !c) {
    return NaN;
  }

  return angleBetweenVectors(
    vector(b, a),
    vector(b, c)
  );
}


function signedAngle(a, b, c) {

  if (!a || !b || !c) {
    return NaN;
  }

  const ba = vector(b, a);
  const bc = vector(b, c);

  const cross =
    ba.x * bc.y -
    ba.y * bc.x;

  const dotProduct =
    dot(ba, bc);

  return Math.atan2(
    cross,
    dotProduct
  ) * 180 / Math.PI;
}


function lineDistance(pointValue, lineA, lineB) {

  if (!pointValue || !lineA || !lineB) {
    return NaN;
  }

  const numerator =
    Math.abs(
      (lineB.y - lineA.y) * pointValue.x -
      (lineB.x - lineA.x) * pointValue.y +
      lineB.x * lineA.y -
      lineB.y * lineA.x
    );

  const denominator =
    distance(lineA, lineB);

  if (denominator === 0) {
    return NaN;
  }

  return numerator / denominator;
}


function signedLineDistance(pointValue, lineA, lineB) {

  if (!pointValue || !lineA || !lineB) {
    return NaN;
  }

  const numerator =
    (lineB.y - lineA.y) * pointValue.x -
    (lineB.x - lineA.x) * pointValue.y +
    lineB.x * lineA.y -
    lineB.y * lineA.x;

  const denominator =
    distance(lineA, lineB);

  if (denominator === 0) {
    return NaN;
  }

  return numerator / denominator;
}


function finite(value) {

  return Number.isFinite(value);
}


/* =========================================================
   LANDMARKS
========================================================= */

const L = {

  forehead: 10,
  glabella: 9,
  nasion: 168,
  noseBridge: 1,
  noseTip: 4,
  subnasale: 2,

  upperLip: 13,
  lowerLip: 14,
  mouth: 0,

  chin: 152,
  menton: 175,

  leftEyeInner: 133,
  rightEyeInner: 362,

  leftEyeOuter: 33,
  rightEyeOuter: 263,

  leftEyeTop: 159,
  rightEyeTop: 386,

  leftEyeBottom: 145,
  rightEyeBottom: 374,

  leftBrow: 70,
  rightBrow: 300,

  leftCheek: 234,
  rightCheek: 454,

  leftJaw: 172,
  rightJaw: 397,

  leftEar: 127,
  rightEar: 356,

  leftOrbit: 33,
  rightOrbit: 263,

  leftRamus: 172,
  rightRamus: 397
};


/* =========================================================
   DEFINITIONS
========================================================= */

const DEFINITIONS = [

  {
    id: "oneEyeApart",
    name: "One Eye Apart Test",
    category: "Facial Proportions",
    description:
      "Intercanthal distance relative to one eye width.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.80, 1.20]
  },

  {
    id: "facialWidthHeight",
    name: "Facial Width / Height",
    category: "Facial Proportions",
    description:
      "Bizygomatic facial width divided by upper facial height.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.72, 0.82]
  },

  {
    id: "middleThird",
    name: "Middle Third",
    category: "Facial Proportions",
    description:
      "Nasion-to-subnasale relative to total forehead-to-menton height.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.30, 0.37]
  },

  {
    id: "lowerThird",
    name: "Lower Third",
    category: "Facial Proportions",
    description:
      "Subnasale-to-menton relative to total facial height.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.30, 0.37]
  },

  {
    id: "eyeSpacing",
    name: "Interpupillary / Eye Spacing",
    category: "Eyes",
    description:
      "Relative spacing between the eyes.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.85, 1.15]
  },

  {
    id: "eyeAspectLeft",
    name: "Left Eye Aspect Ratio",
    category: "Eyes",
    description:
      "Eye opening height relative to eye width.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.22, 0.40]
  },

  {
    id: "eyeAspectRight",
    name: "Right Eye Aspect Ratio",
    category: "Eyes",
    description:
      "Eye opening height relative to eye width.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.22, 0.40]
  },

  {
    id: "eyebrowTilt",
    name: "Eyebrow Tilt",
    category: "Eyes",
    description:
      "Difference in eyebrow slope between the two sides.",
    requiresProfile: false,
    unit: "degrees",
    ideal: [-5, 5]
  },

  {
    id: "canthalTilt",
    name: "Canthal Tilt",
    category: "Eyes",
    description:
      "Lateral-to-medial eye corner inclination.",
    requiresProfile: false,
    unit: "degrees",
    ideal: [3, 8]
  },

  {
    id: "midfaceRatio",
    name: "Midface Ratio",
    category: "Facial Proportions",
    description:
      "Interocular width relative to midface vertical height.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.90, 1.10]
  },

  {
    id: "mouthWidthFaceWidth",
    name: "Mouth Width / Face Width",
    category: "Lower Face",
    description:
      "Mouth width relative to facial width.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.42, 0.52]
  },

  {
    id: "jawWidthFaceWidth",
    name: "Jaw Width / Face Width",
    category: "Jaw",
    description:
      "Bigonial width relative to bizygomatic width.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.70, 0.88]
  },

  {
    id: "cheekboneJawRatio",
    name: "Cheekbone / Jaw Ratio",
    category: "Jaw",
    description:
      "Bizygomatic width divided by bigonial width.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [1.10, 1.35]
  },

  {
    id: "facialSymmetry",
    name: "Facial Symmetry",
    category: "Symmetry",
    description:
      "Normalized left/right landmark asymmetry.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0, 0.04]
  },


  /* PROFILE */

  {
    id: "nasalWH",
    name: "Nasal W : H Ratio",
    category: "Profile",
    description:
      "Nasal width divided by nasal height. Requires frontal nasal width.",
    requiresProfile: false,
    unit: "ratio",
    ideal: [0.65, 0.85]
  },

  {
    id: "noseTipRotation",
    name: "Nose Tip Rotation Angle",
    category: "Profile",
    description:
      "Approximate nasal tip rotation from subnasale, tip and columellar geometry.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [20, 30]
  },

  {
    id: "facialConvexityGlabella",
    name: "Facial Convexity (Glabella)",
    category: "Profile",
    description:
      "Profile facial convexity using glabella, subnasale and chin.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [165, 175]
  },

  {
    id: "totalFacialConvexity",
    name: "Total Facial Convexity",
    category: "Profile",
    description:
      "Overall facial convexity from forehead through chin.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [135, 150]
  },

  {
    id: "submentalCervicalAngle",
    name: "Submental Cervical Angle",
    category: "Profile",
    description:
      "Not reliably measurable because MediaPipe does not provide a true neck landmark.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [105, 125]
  },

  {
    id: "nasalTipAngle",
    name: "Nasal Tip Angle",
    category: "Profile",
    description:
      "Approximate nasal tip angle.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [110, 125]
  },

  {
    id: "facialConvexityNasion",
    name: "Facial Convexity (Nasion)",
    category: "Profile",
    description:
      "Profile convexity around nasion.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [165, 175]
  },

  {
    id: "nasofrontalAngle",
    name: "Nasofrontal Angle",
    category: "Profile",
    description:
      "Forehead-to-nasal bridge angle.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [115, 130]
  },

  {
    id: "zAngle",
    name: "Z Angle",
    category: "Profile",
    description:
      "Approximate profile soft-tissue Z angle.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [70, 80]
  },

  {
    id: "browridgeInclination",
    name: "Browridge Inclination Angle",
    category: "Profile",
    description:
      "Approximate brow-to-orbital inclination.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [15, 25]
  },

  {
    id: "recessionFrankfort",
    name: "Recession Relative to Frankfort Plane",
    category: "Profile",
    description:
      "Cannot be expressed as true millimetres without image calibration.",
    requiresProfile: true,
    unit: "unavailable",
    ideal: [0, 6]
  },

  {
    id: "upperForeheadSlope",
    name: "Upper Forehead Slope",
    category: "Profile",
    description:
      "Forehead inclination relative to the facial vertical.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [0, 10]
  },

  {
    id: "nasomentalAngle",
    name: "Nasomental Angle",
    category: "Profile",
    description:
      "Nasal projection relationship to the chin.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [125, 135]
  },

  {
    id: "nasolabialAngle",
    name: "Nasolabial Angle",
    category: "Profile",
    description:
      "Angle between columellar/subnasal region and upper lip.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [95, 110]
  },

  {
    id: "orbitalVector",
    name: "Orbital Vector",
    category: "Profile",
    description:
      "Relative anterior/posterior orbital position.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [-1, 3]
  },

  {
    id: "mandibularPlaneAngle",
    name: "Mandibular Plane Angle",
    category: "Profile",
    description:
      "Mandibular plane relative to facial horizontal.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [20, 32]
  },

  {
    id: "ramusMandibleRatio",
    name: "Ramus : Mandible Ratio",
    category: "Profile",
    description:
      "Vertical ramus length relative to mandibular body length.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [0.60, 0.75]
  },

  {
    id: "nasalProjection",
    name: "Nasal Projection",
    category: "Profile",
    description:
      "Nasal projection relative to nasal base.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [0.65, 0.80]
  },

  {
    id: "frankfortTipAngle",
    name: "Frankfort-Tip Angle",
    category: "Profile",
    description:
      "Approximate facial horizontal to nasal tip relationship.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [35, 50]
  },

  {
    id: "gonialAngle",
    name: "Gonial Angle",
    category: "Profile",
    description:
      "Approximate mandibular angle.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [110, 125]
  },

  {
    id: "facialDepthHeight",
    name: "Facial Depth : Height Ratio",
    category: "Profile",
    description:
      "Anteroposterior facial depth relative to facial height.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [1.15, 1.35]
  },

  {
    id: "interiorMidfaceProjection",
    name: "Interior Midface Projection Angle",
    category: "Profile",
    description:
      "Approximate midface projection angle.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [58, 65]
  },

  {
    id: "anteriorFacialDepth",
    name: "Anterior Facial Depth",
    category: "Profile",
    description:
      "Approximate anterior facial depth angle.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [60, 68]
  },

  {
    id: "nasofacialAngle",
    name: "Nasofacial Angle",
    category: "Profile",
    description:
      "Nasal projection relative to the facial plane.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [29, 35]
  },

  {
    id: "lowerLipSLine",
    name: "Lower Lip S-Line Position",
    category: "Profile",
    description:
      "Normalized lower lip position relative to the S-line.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [-0.03, 0.03]
  },

  {
    id: "upperLipSLine",
    name: "Upper Lip S-Line Position",
    category: "Profile",
    description:
      "Normalized upper lip position relative to the S-line.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [-0.04, 0.02]
  },

  {
    id: "lowerLipELine",
    name: "Lower Lip E-Line Position",
    category: "Profile",
    description:
      "Normalized lower lip position relative to the E-line.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [-0.04, 0.01]
  },

  {
    id: "upperLipELine",
    name: "Upper Lip E-Line Position",
    category: "Profile",
    description:
      "Normalized upper lip position relative to the E-line.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [-0.06, 0]
  },

  {
    id: "lowerLipBurstone",
    name: "Lower Lip Burstone Line",
    category: "Profile",
    description:
      "Normalized lower lip position relative to a Burstone-type reference line.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [-0.04, 0.01]
  },

  {
    id: "upperLipBurstone",
    name: "Upper Lip Burstone Line",
    category: "Profile",
    description:
      "Normalized upper lip position relative to a Burstone-type reference line.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [-0.05, 0]
  },

  {
    id: "holdawayHLine",
    name: "Holdaway H-Line",
    category: "Profile",
    description:
      "Normalized lip relationship to a Holdaway-type reference line.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [-0.02, 0.02]
  },

  {
    id: "mentolabialAngle",
    name: "Mentolabial Angle",
    category: "Profile",
    description:
      "Angle formed by lower lip, labiomental region and chin.",
    requiresProfile: true,
    unit: "degrees",
    ideal: [120, 135]
  },

  {
    id: "gonionMouthLine",
    name: "Gonion → Mouth Line",
    category: "Profile",
    description:
      "Normalized gonion-to-mouth distance.",
    requiresProfile: true,
    unit: "ratio",
    ideal: [0.18, 0.30]
  }
];


/* =========================================================
   FRONT METRICS
========================================================= */

function calculateFrontalMetrics(lm) {

  const p = i => point(lm, i);

  const faceWidth =
    distance(
      p(L.leftCheek),
      p(L.rightCheek)
    );

  const faceHeight =
    distance(
      p(L.forehead),
      p(L.menton)
    );

  const eyeWidthLeft =
    distance(
      p(L.leftEyeInner),
      p(L.leftEyeOuter)
    );

  const eyeWidthRight =
    distance(
      p(L.rightEyeInner),
      p(L.rightEyeOuter)
    );

  const intercanthal =
    distance(
      p(L.leftEyeInner),
      p(L.rightEyeInner)
    );

  const interocular =
    distance(
      p(L.leftEyeOuter),
      p(L.rightEyeOuter)
    );

  const middleHeight =
    distance(
      p(L.nasion),
      p(L.subnasale)
    );

  const lowerHeight =
    distance(
      p(L.subnasale),
      p(L.menton)
    );

  const mouthWidth =
    distance(
      p(78),
      p(308)
    );

  const jawWidth =
    distance(
      p(L.leftJaw),
      p(L.rightJaw)
    );

  const cheekWidth =
    distance(
      p(L.leftCheek),
      p(L.rightCheek)
    );


  const leftEyeHeight =
    distance(
      p(L.leftEyeTop),
      p(L.leftEyeBottom)
    );

  const rightEyeHeight =
    distance(
      p(L.rightEyeTop),
      p(L.rightEyeBottom)
    );


  const leftCanthal =
    Math.atan2(
      p(L.leftEyeOuter).y -
      p(L.leftEyeInner).y,

      p(L.leftEyeOuter).x -
      p(L.leftEyeInner).x
    ) * 180 / Math.PI;


  const rightCanthal =
    Math.atan2(
      p(L.rightEyeInner).y -
      p(L.rightEyeOuter).y,

      p(L.rightEyeInner).x -
      p(L.rightEyeOuter).x
    ) * 180 / Math.PI;


  const leftBrowTilt =
    Math.atan2(
      p(L.leftBrow).y -
      p(L.leftEyeOuter).y,

      p(L.leftBrow).x -
      p(L.leftEyeOuter).x
    ) * 180 / Math.PI;


  const rightBrowTilt =
    Math.atan2(
      p(L.rightBrow).y -
      p(L.rightEyeOuter).y,

      p(L.rightBrow).x -
      p(L.rightEyeOuter).x
    ) * 180 / Math.PI;


  const eyeAspectLeft =
    ratio(
      leftEyeHeight,
      eyeWidthLeft
    );

  const eyeAspectRight =
    ratio(
      rightEyeHeight,
      eyeWidthRight
    );


  const symmetry =
    ratio(
      Math.abs(
        distance(
          p(L.leftCheek),
          p(L.leftJaw)
        ) -
        distance(
          p(L.rightCheek),
          p(L.rightJaw)
        )
      ),
      faceWidth
    );


  const nasalWidth =
    distance(
      p(129),
      p(358)
    );

  const nasalHeight =
    distance(
      p(L.nasion),
      p(L.subnasale)
    );


  return {

    oneEyeApart: {
      ...DEFINITIONS.find(x => x.id === "oneEyeApart"),
      value:
        ratio(
          intercanthal,
          (eyeWidthLeft + eyeWidthRight) / 2
        )
    },

    facialWidthHeight: {
      ...DEFINITIONS.find(x => x.id === "facialWidthHeight"),
      value:
        ratio(
          faceWidth,
          faceHeight
        )
    },

    middleThird: {
      ...DEFINITIONS.find(x => x.id === "middleThird"),
      value:
        ratio(
          middleHeight,
          faceHeight
        )
    },

    lowerThird: {
      ...DEFINITIONS.find(x => x.id === "lowerThird"),
      value:
        ratio(
          lowerHeight,
          faceHeight
        )
    },

    eyeSpacing: {
      ...DEFINITIONS.find(x => x.id === "eyeSpacing"),
      value:
        ratio(
          interocular,
          faceWidth
        )
    },

    eyeAspectLeft: {
      ...DEFINITIONS.find(x => x.id === "eyeAspectLeft"),
      value: eyeAspectLeft
    },

    eyeAspectRight: {
      ...DEFINITIONS.find(x => x.id === "eyeAspectRight"),
      value: eyeAspectRight
    },

    eyebrowTilt: {
      ...DEFINITIONS.find(x => x.id === "eyebrowTilt"),
      value:
        leftBrowTilt -
        rightBrowTilt
    },

    canthalTilt: {
      ...DEFINITIONS.find(x => x.id === "canthalTilt"),
      value:
        (leftCanthal + rightCanthal) / 2
    },

    midfaceRatio: {
      ...DEFINITIONS.find(x => x.id === "midfaceRatio"),
      value:
        ratio(
          interocular,
          middleHeight
        )
    },

    mouthWidthFaceWidth: {
      ...DEFINITIONS.find(x => x.id === "mouthWidthFaceWidth"),
      value:
        ratio(
          mouthWidth,
          faceWidth
        )
    },

    jawWidthFaceWidth: {
      ...DEFINITIONS.find(x => x.id === "jawWidthFaceWidth"),
      value:
        ratio(
          jawWidth,
          faceWidth
        )
    },

    cheekboneJawRatio: {
      ...DEFINITIONS.find(x => x.id === "cheekboneJawRatio"),
      value:
        ratio(
          cheekWidth,
          jawWidth
        )
    },

    facialSymmetry: {
      ...DEFINITIONS.find(x => x.id === "facialSymmetry"),
      value: symmetry
    },

    nasalWH: {
      ...DEFINITIONS.find(x => x.id === "nasalWH"),
      value:
        ratio(
          nasalWidth,
          nasalHeight
        )
    }
  };
}


/* =========================================================
   PROFILE METRICS
========================================================= */

function calculateProfileMetrics(lm) {

  const p = i => point(lm, i);

  const forehead = p(L.forehead);
  const glabella = p(L.glabella);
  const nasion = p(L.nasion);
  const noseTip = p(L.noseTip);
  const subnasale = p(L.subnasale);
  const upperLip = p(L.upperLip);
  const lowerLip = p(L.lowerLip);
  const mouth = p(L.mouth);
  const chin = p(L.chin);
  const menton = p(L.menton);

  const facialHeight =
    distance(
      forehead,
      menton
    );


  const noseHeight =
    distance(
      nasion,
      subnasale
    );


  const nasalProjection =
    Math.abs(
      noseTip.x -
      subnasale.x
    );


  const nasalBase =
    distance(
      nasion,
      subnasale
    );


  const noseProjectionRatio =
    ratio(
      nasalProjection,
      nasalBase
    );


  const mandibularPlane =
    Math.abs(
      Math.atan2(
        menton.y - chin.y,
        menton.x - chin.x
      ) * 180 / Math.PI
    );


  const ramusLength =
    distance(
      p(L.leftRamus),
      chin
    );


  const mandibularLength =
    distance(
      p(L.leftRamus),
      menton
    );


  const ramusRatio =
    ratio(
      ramusLength,
      mandibularLength
    );


  const gonial =
    angle(
      p(L.leftRamus),
      chin,
      menton
    );


  const facialConvexityGlabella =
    angle(
      glabella,
      subnasale,
      chin
    );


  const facialConvexityNasion =
    angle(
      nasion,
      subnasale,
      chin
    );


  const totalFacialConvexity =
    angle(
      forehead,
      glabella,
      chin
    );


  const nasofrontal =
    angle(
      forehead,
      nasion,
      noseTip
    );


  const nasomental =
    angle(
      noseTip,
      subnasale,
      chin
    );


  const nasolabial =
    angle(
      noseTip,
      subnasale,
      upperLip
    );


  const nasofacial =
    angle(
      nasion,
      noseTip,
      chin
    );


  const mentolabial =
    angle(
      lowerLip,
      mouth,
      chin
    );


  const foreheadSlope =
    Math.abs(
      Math.atan2(
        glabella.y - forehead.y,
        glabella.x - forehead.x
      ) * 180 / Math.PI
    );


  const upperForeheadSlope =
    Math.abs(
      Math.atan2(
        glabella.y - forehead.y,
        glabella.x - forehead.x
      ) * 180 / Math.PI
    );


  const noseTipRotation =
    angle(
      subnasale,
      noseTip,
      upperLip
    );


  const nasalTipAngle =
    angle(
      noseTip,
      subnasale,
      upperLip
    );


  const frankfortTip =
    angle(
      p(L.leftEar),
      p(L.leftOrbit),
      noseTip
    );


  const facialDepth =
    Math.abs(
      glabella.x -
      chin.x
    );


  const facialDepthHeight =
    ratio(
      facialDepth,
      facialHeight
    );


  const gonionMouth =
    ratio(
      distance(
        p(L.leftRamus),
        mouth
      ),
      facialHeight
    );


  /*
    True S-line / E-line / Burstone / Holdaway
    distances normally require calibrated profile
    cephalometric landmarks.

    We normalize them to facial height rather than
    pretending they are millimetres.
  */

  const referenceLine =
    (a, b) =>
      signedLineDistance(
        mouth,
        a,
        b
      );


  const sLine =
    signedLineDistance(
      lowerLip,
      noseTip,
      chin
    );


  const sLineUpper =
    signedLineDistance(
      upperLip,
      noseTip,
      chin
    );


  const eLine =
    signedLineDistance(
      lowerLip,
      noseTip,
      chin
    );


  const eLineUpper =
    signedLineDistance(
      upperLip,
      noseTip,
      chin
    );


  const burstoneLower =
    signedLineDistance(
      lowerLip,
      subnasale,
      chin
    );


  const burstoneUpper =
    signedLineDistance(
      upperLip,
      subnasale,
      chin
    );


  const holdaway =
    signedLineDistance(
      mouth,
      noseTip,
      chin
    );


  const normalized =
    value =>
      finite(value)
        ? value / facialHeight
        : NaN;


  return {

    noseTipRotation: {
      ...DEFINITIONS.find(x => x.id === "noseTipRotation"),
      value: noseTipRotation
    },

    facialConvexityGlabella: {
      ...DEFINITIONS.find(x => x.id === "facialConvexityGlabella"),
      value: facialConvexityGlabella
    },

    totalFacialConvexity: {
      ...DEFINITIONS.find(x => x.id === "totalFacialConvexity"),
      value: totalFacialConvexity
    },

    submentalCervicalAngle: {
      ...DEFINITIONS.find(x => x.id === "submentalCervicalAngle"),
      value: NaN,
      available: false
    },

    nasalTipAngle: {
      ...DEFINITIONS.find(x => x.id === "nasalTipAngle"),
      value: nasalTipAngle
    },

    facialConvexityNasion: {
      ...DEFINITIONS.find(x => x.id === "facialConvexityNasion"),
      value: facialConvexityNasion
    },

    nasofrontalAngle: {
      ...DEFINITIONS.find(x => x.id === "nasofrontalAngle"),
      value: nasofrontal
    },

    zAngle: {
      ...DEFINITIONS.find(x => x.id === "zAngle"),
      value:
        angle(
          upperLip,
          chin,
          noseTip
        )
    },

    browridgeInclination: {
      ...DEFINITIONS.find(x => x.id === "browridgeInclination"),
      value:
        foreheadSlope
    },

    recessionFrankfort: {
      ...DEFINITIONS.find(x => x.id === "recessionFrankfort"),
      value: NaN,
      available: false
    },

    upperForeheadSlope: {
      ...DEFINITIONS.find(x => x.id === "upperForeheadSlope"),
      value: upperForeheadSlope
    },

    nasomentalAngle: {
      ...DEFINITIONS.find(x => x.id === "nasomentalAngle"),
      value: nasomental
    },

    nasolabialAngle: {
      ...DEFINITIONS.find(x => x.id === "nasolabialAngle"),
      value: nasolabial
    },

    orbitalVector: {
      ...DEFINITIONS.find(x => x.id === "orbitalVector"),
      value:
        (p(L.leftOrbit).x -
        p(L.nasion).x) /
        facialHeight
    },

    mandibularPlaneAngle: {
      ...DEFINITIONS.find(x => x.id === "mandibularPlaneAngle"),
      value: mandibularPlane
    },

    ramusMandibleRatio: {
      ...DEFINITIONS.find(x => x.id === "ramusMandibleRatio"),
      value: ramusRatio
    },

    nasalProjection: {
      ...DEFINITIONS.find(x => x.id === "nasalProjection"),
      value: noseProjectionRatio
    },

    frankfortTipAngle: {
      ...DEFINITIONS.find(x => x.id === "frankfortTipAngle"),
      value: frankfortTip
    },

    gonialAngle: {
      ...DEFINITIONS.find(x => x.id === "gonialAngle"),
      value: gonial
    },

    facialDepthHeight: {
      ...DEFINITIONS.find(x => x.id === "facialDepthHeight"),
      value: facialDepthHeight
    },

    interiorMidfaceProjection: {
      ...DEFINITIONS.find(x => x.id === "interiorMidfaceProjection"),
      value:
        angle(
          glabella,
          nasion,
          subnasale
        )
    },

    anteriorFacialDepth: {
      ...DEFINITIONS.find(x => x.id === "anteriorFacialDepth"),
      value:
        angle(
          glabella,
          subnasale,
          chin
        )
    },

    nasofacialAngle: {
      ...DEFINITIONS.find(x => x.id === "nasofacialAngle"),
      value: nasofacial
    },

    lowerLipSLine: {
      ...DEFINITIONS.find(x => x.id === "lowerLipSLine"),
      value: normalized(sLine)
    },

    upperLipSLine: {
      ...DEFINITIONS.find(x => x.id === "upperLipSLine"),
      value: normalized(sLineUpper)
    },

    lowerLipELine: {
      ...DEFINITIONS.find(x => x.id === "lowerLipELine"),
      value: normalized(eLine)
    },

    upperLipELine: {
      ...DEFINITIONS.find(x => x.id === "upperLipELine"),
      value: normalized(eLineUpper)
    },

    lowerLipBurstone: {
      ...DEFINITIONS.find(x => x.id === "lowerLipBurstone"),
      value: normalized(burstoneLower)
    },

    upperLipBurstone: {
      ...DEFINITIONS.find(x => x.id === "upperLipBurstone"),
      value: normalized(burstoneUpper)
    },

    holdawayHLine: {
      ...DEFINITIONS.find(x => x.id === "holdawayHLine"),
      value: normalized(holdaway)
    },

    mentolabialAngle: {
      ...DEFINITIONS.find(x => x.id === "mentolabialAngle"),
      value: mentolabial
    },

    gonionMouthLine: {
      ...DEFINITIONS.find(x => x.id === "gonionMouthLine"),
      value: gonionMouth
    }
  };
}


/* =========================================================
   MASTER CALCULATION
========================================================= */

function calculateMetrics({
  frontal,
  profile,
  scaleMm = null
}) {

  const frontalMetrics =
    calculateFrontalMetrics(
      frontal
    );

  const profileMetrics =
    calculateProfileMetrics(
      profile
    );

  return {
    ...frontalMetrics,
    ...profileMetrics
  };
}


/* =========================================================
   REFERENCE COMPARISON
========================================================= */

function attachIdealRanges(
  metrics,
  sex = "male"
) {

  return Object.fromEntries(

    Object.entries(metrics).map(
      ([id, metric]) => {

        const definition =
          DEFINITIONS.find(
            x => x.id === id
          );


        const output = {
          ...metric
        };


        if (
          metric.available === false ||
          !finite(metric.value)
        ) {

          output.available = false;
          output.formattedValue = "Unavailable";
          output.idealText =
            definition
              ? formatIdeal(definition)
              : "Unavailable";
          output.status = "unavailable";
          output.comparison = NaN;

          return [id, output];
        }


        output.available = true;

        output.formattedValue =
          formatMeasurement(
            metric.value,
            metric.unit
          );


        output.idealText =
          formatIdeal(
            definition
          );


        const [low, high] =
          definition.ideal;


        const midpoint =
          (low + high) / 2;


        const halfRange =
          (high - low) / 2;


        /*
          0 = exact midpoint
          1 = reference boundary
          >1 = outside reference interval
        */

        output.comparison =
          halfRange === 0
            ? Math.abs(
                metric.value -
                midpoint
              )
            : Math.abs(
                metric.value -
                midpoint
              ) / halfRange;


        output.status =
          metric.value >= low &&
          metric.value <= high
            ? "within"
            : "outside";


        return [id, output];
      }
    )
  );
}


function formatMeasurement(
  value,
  unit
) {

  if (!finite(value)) {
    return "Unavailable";
  }

  if (unit === "degrees") {

    return `${value.toFixed(1)}°`;
  }

  if (unit === "ratio") {

    return value.toFixed(3);
  }

  if (unit === "unavailable") {

    return "Unavailable";
  }

  return value.toFixed(3);
}


function formatIdeal(
  definition
) {

  if (!definition) {
    return "No reference";
  }

  const [low, high] =
    definition.ideal;

  if (definition.unit === "degrees") {

    return `${low}° – ${high}°`;
  }

  if (definition.unit === "ratio") {

    return `${low} – ${high}`;
  }

  return `${low} – ${high}`;
}


/* =========================================================
   PUBLIC API
========================================================= */

function getMetricDefinition(id) {

  return DEFINITIONS.find(
    metric => metric.id === id
  );
}


function getMetricsByCategory(category) {

  return DEFINITIONS.filter(
    metric =>
      metric.category === category
  );
}


function getProfileMetrics() {

  return DEFINITIONS.filter(
    metric =>
      metric.requiresProfile
  );
}


function getFrontalMetrics() {

  return DEFINITIONS.filter(
    metric =>
      !metric.requiresProfile
  );
}


function getMetricDefinitions() {

  return [...DEFINITIONS];
}


export {
  calculateMetrics,
  calculateFrontalMetrics,
  calculateProfileMetrics,
  attachIdealRanges,
  getMetricDefinition,
  getMetricsByCategory,
  getProfileMetrics,
  getFrontalMetrics,
  getMetricDefinitions
};
