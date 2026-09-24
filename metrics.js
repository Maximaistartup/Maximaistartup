/* =========================================================
   FACET METRIC ENGINE  (build 3.1.0)
   Scale-independent facial geometry.
   Input landmarks MUST be in pixel space ({x, y}), not the
   normalized 0..1 space MediaPipe returns; otherwise angles and
   distances are distorted on non-square images. app.js converts.
========================================================= */

/* ---------- geometry ---------- */

const P = (lm, i) => {
  const p = lm && lm[i];
  return p ? { x: p.x, y: p.y } : null;
};
const d = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : NaN);
const ratio = (a, b) =>
  Number.isFinite(a) && Number.isFinite(b) && Math.abs(b) > 1e-9 ? a / b : NaN;
const vec = (a, b) => (a && b ? { x: b.x - a.x, y: b.y - a.y } : null);
const mid = (a, b) => (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null);
const RAD = 180 / Math.PI;

function angV(u, v) {
  if (!u || !v) return NaN;
  const lu = Math.hypot(u.x, u.y);
  const lv = Math.hypot(v.x, v.y);
  if (!lu || !lv) return NaN;
  const c = (u.x * v.x + u.y * v.y) / (lu * lv);
  return Math.acos(Math.max(-1, Math.min(1, c))) * RAD;
}
const angABC = (a, b, c) => angV(vec(b, a), vec(b, c));

/* Signed distance of p from line a->b. Line drawn top -> bottom on a face
   looking toward +x: positive = in FRONT of the line. */
function signedDist(p, a, b) {
  if (!p || !a || !b) return NaN;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const n = Math.hypot(dx, dy);
  if (!n) return NaN;
  return (dx * (a.y - p.y) - (a.x - p.x) * dy) / n;
}

/* Lean of segment (lower -> upper) away from vertical, positive = leaning back */
const fromVertical = (lower, upper) =>
  lower && upper ? Math.atan2(lower.x - upper.x, lower.y - upper.y) * RAD : NaN;


/* ---------- frontal ---------- */

function frontalValues(lm) {
  const p = (i) => P(lm, i);
  const fh = p(10), gl = p(9), sn = p(2), men = p(152);
  const W = d(p(234), p(454));
  const H = d(fh, men);
  const upper = d(fh, gl);
  const middle = d(gl, sn);
  const lower = d(sn, men);
  const eyeAvg = (d(p(33), p(133)) + d(p(263), p(362))) / 2;

  // outer-end-up tilt of a brow, degrees
  const tilt = (inner, outer) =>
    inner && outer
      ? Math.atan2(inner.y - outer.y, Math.abs(inner.x - outer.x)) * RAD
      : NaN;

  return {
    facialWidthToHeight: ratio(W, H),
    facialHeightToWidth: ratio(H, W),
    upperMiddleThirdRatio: ratio(upper, middle),
    middleLowerThirdRatio: ratio(middle, lower),
    facialThirds: ratio(upper + middle, lower),
    eyeSpacingRatio: ratio(d(p(133), p(362)), eyeAvg),
    eyeWidthRatio: ratio(eyeAvg, W),
    mouthWidthRatio: ratio(d(p(61), p(291)), W),
    noseWidthRatio: ratio(d(p(129), p(358)), W),
    eyebrowTilt: tilt(p(107), p(70)) - tilt(p(336), p(300)),
    eyeLevelAsymmetry: ratio(Math.abs(p(33).y - p(263).y), H),
    mouthLevelAsymmetry: ratio(Math.abs(p(61).y - p(291).y), H)
  };
}


/* ---------- profile ---------- */

/* Mirror so the face always looks toward +x, and pick the camera-facing side.
   The near-side ear landmark sits farther BACK than the far-side one. */
function prepareProfile(lm) {
  let sx = 0;
  for (const q of lm) sx += q.x;
  const meanX = sx / lm.length;
  const facingRight = lm[4].x >= meanX;
  const pts = lm.map((q) => ({ x: facingRight ? q.x : -q.x, y: q.y }));
  const sideA = pts[127].x <= pts[356].x;
  const idx = sideA
    ? { ear: 127, eye: 33, jaw: 172, ala: 129 }
    : { ear: 356, eye: 263, jaw: 397, ala: 358 };
  return { pts, idx };
}

function profileValues(lm) {
  const { pts, idx } = prepareProfile(lm);
  const p = (i) => pts[i];

  const fh = p(10), fore = p(151), gl = p(9), nas = p(168), dors = p(195);
  const tip = p(4), sn = p(2), ul = p(0), ll = p(17);
  const sulcus = p(200), pog = p(175), men = p(152);
  const ear = p(idx.ear), eye = p(idx.eye), jaw = p(idx.jaw), ala = p(idx.ala);

  const F = vec(ear, eye);                       // Frankfort proxy (ear -> orbit)
  const faceH = d(nas, men);                     // normalizer for all lengths
  const pct = (v) => ratio(v, faceH) * 100;
  const lipFront = ul.x >= ll.x ? ul : ll;
  const sMid = mid(sn, tip);

  const Fn = Math.hypot(F.x, F.y);
  const recession = Fn
    ? ((pog.x - nas.x) * F.x + (pog.y - nas.y) * F.y) / Fn
    : NaN;

  return {
    nasalWH: NaN,                                // needs transverse width
    noseTipRotation: Math.atan2(sn.y - tip.y, tip.x - sn.x) * RAD,
    facialConvexityGlabella: angABC(gl, sn, pog),
    totalFacialConvexity: angABC(gl, tip, pog),
    submentalCervicalAngle: NaN,                 // needs neck landmarks
    nasalTipAngle: angABC(dors, tip, sn),
    facialConvexityNasion: angABC(nas, sn, pog),
    nasofrontalAngle: angABC(gl, nas, dors),
    zAngle: angV(F, vec(pog, lipFront)),
    browridgeInclination: fromVertical(gl, fore),
    frankfortRecession: pct(recession),
    upperForeheadSlope: fromVertical(fore, fh),
    nasomentalAngle: angABC(nas, tip, pog),
    nasolabialAngle: angABC(tip, sn, ul),
    orbitalVector: NaN,                          // needs cornea + malar points
    mandibularPlaneAngle: angV(F, vec(jaw, men)),
    ramusMandibleRatio: ratio(d(ear, jaw), d(jaw, men)),
    nasalProjection: ratio(tip.x - ala.x, d(nas, tip)),
    frankfortTipAngle: angV(F, vec(nas, tip)),
    gonialAngle: angABC(ear, jaw, men),
    facialDepthHeightRatio: ratio(d(ear, tip), faceH),
    interiorMidfaceProjectionAngle: NaN,         // needs malar landmark
    anteriorFacialDepth: NaN,                    // clinically a mm measure
    nasofacialAngle: angV(vec(nas, tip), vec(nas, pog)),
    lowerLipSLine: pct(signedDist(ll, sMid, pog)),
    upperLipSLine: pct(signedDist(ul, sMid, pog)),
    lowerLipELine: pct(signedDist(ll, tip, pog)),
    upperLipELine: pct(signedDist(ul, tip, pog)),
    lowerLipBurstone: pct(signedDist(ll, sn, pog)),
    upperLipBurstone: pct(signedDist(ul, sn, pog)),
    holdawayHLine: pct(signedDist(ll, ul, pog)),
    mentolabialAngle: angABC(ll, sulcus, pog),
    gonionMouthLine: ratio(d(jaw, ul), faceH)
  };
}


/* =========================================================
   DEFINITIONS  (single source of truth: metadata + reference range)
   Ranges are PROVISIONAL, configurable reference values.
   unit: "deg" | "ratio" | "pct" (% of nasion-to-menton distance)
========================================================= */

const D = (key, name, category, requires, unit, ideal, description, note = "") => ({
  key, name, category,
  requiresFrontal: requires === "frontal",
  requiresProfile: requires === "profile",
  unit, ideal, description, note
});

const DEFS = [
  /* frontal */
  D("facialWidthToHeight", "Facial Width : Height Ratio", "Facial Proportions", "frontal", "ratio", [0.72, 0.88], "Cheek-to-cheek width relative to forehead-to-chin height."),
  D("facialHeightToWidth", "Facial Height : Width Ratio", "Facial Proportions", "frontal", "ratio", [1.14, 1.39], "Forehead-to-chin height relative to cheek-to-cheek width."),
  D("upperMiddleThirdRatio", "Upper : Middle Third Ratio", "Facial Thirds", "frontal", "ratio", [0.90, 1.10], "Forehead-top to glabella, relative to glabella to subnasale. The mesh has no true hairline point."),
  D("middleLowerThirdRatio", "Middle : Lower Third Ratio", "Facial Thirds", "frontal", "ratio", [0.90, 1.10], "Glabella-to-subnasale relative to subnasale-to-menton."),
  D("facialThirds", "Facial Thirds Balance", "Facial Thirds", "frontal", "ratio", [1.80, 2.20], "Upper + middle third relative to the lower third."),
  D("eyeSpacingRatio", "Interocular Spacing Ratio", "Eyes", "frontal", "ratio", [0.80, 1.20], "Inner-canthus distance relative to average eye width."),
  D("eyeWidthRatio", "Average Eye Width : Face Width", "Eyes", "frontal", "ratio", [0.18, 0.26], "Average eye width relative to cheek-to-cheek width."),
  D("mouthWidthRatio", "Mouth Width : Face Width", "Mouth", "frontal", "ratio", [0.28, 0.42], "Mouth-corner distance relative to cheek-to-cheek width."),
  D("noseWidthRatio", "Nose Width : Face Width", "Nose", "frontal", "ratio", [0.18, 0.28], "Alar width relative to cheek-to-cheek width."),
  D("eyebrowTilt", "Eyebrow Tilt Asymmetry", "Brows", "frontal", "deg", [-5, 5], "Difference between the outer-end-up tilt of the two brows."),
  D("eyeLevelAsymmetry", "Eye Level Asymmetry", "Symmetry", "frontal", "ratio", [0, 0.025], "Vertical difference between outer eye corners, relative to facial height."),
  D("mouthLevelAsymmetry", "Mouth Level Asymmetry", "Symmetry", "frontal", "ratio", [0, 0.025], "Vertical difference between mouth corners, relative to facial height."),

  /* profile */
  D("nasalWH", "Nasal W : H Ratio", "Nose", "profile", "ratio", [0.65, 0.85], "Nasal width relative to height.", "Unavailable: transverse nasal width cannot be measured from a side profile."),
  D("noseTipRotation", "Nose Tip Rotation Angle", "Nose", "profile", "deg", [20, 30], "Inclination of the subnasale-to-tip line above horizontal."),
  D("facialConvexityGlabella", "Facial Convexity (Glabella)", "Facial Convexity", "profile", "deg", [165, 175], "Angle glabella - subnasale - pogonion."),
  D("totalFacialConvexity", "Total Facial Convexity", "Facial Convexity", "profile", "deg", [135, 150], "Angle glabella - nasal tip - pogonion."),
  D("submentalCervicalAngle", "Submental Cervical Angle", "Jaw / Neck", "profile", "deg", [105, 125], "Angle between the chin-neck and neck lines.", "Unavailable: MediaPipe provides no neck landmarks."),
  D("nasalTipAngle", "Nasal Tip Angle", "Nose", "profile", "deg", [110, 125], "Angle dorsum - tip - subnasale."),
  D("facialConvexityNasion", "Facial Convexity (Nasion)", "Facial Convexity", "profile", "deg", [165, 175], "Angle nasion - subnasale - pogonion."),
  D("nasofrontalAngle", "Nasofrontal Angle", "Nose", "profile", "deg", [115, 130], "Angle glabella - nasion - nasal dorsum."),
  D("zAngle", "Z Angle", "Profile", "profile", "deg", [70, 80], "Angle between the Frankfort proxy (ear to orbit) and the pogonion-to-lip line."),
  D("browridgeInclination", "Browridge Inclination Angle", "Forehead / Brow", "profile", "deg", [15, 25], "Lean from vertical of the glabella-to-mid-forehead segment."),
  D("frankfortRecession", "Recession Relative to Frankfort Plane", "Profile", "profile", "pct", [-2, 3], "Pogonion position ahead of nasion along the Frankfort proxy, as % of nasion-menton distance."),
  D("upperForeheadSlope", "Upper Forehead Slope", "Forehead / Brow", "profile", "deg", [0, 10], "Lean from vertical of the upper forehead segment."),
  D("nasomentalAngle", "Nasomental Angle", "Nose / Chin", "profile", "deg", [125, 135], "Angle nasion - nasal tip - pogonion."),
  D("nasolabialAngle", "Nasolabial Angle", "Nose / Lips", "profile", "deg", [95, 110], "Angle nasal tip - subnasale - upper lip."),
  D("orbitalVector", "Orbital Vector", "Orbit", "profile", "ratio", null, "Globe projection relative to the malar prominence.", "Unavailable: requires corneal and malar landmarks the mesh does not provide."),
  D("mandibularPlaneAngle", "Mandibular Plane Angle", "Mandible", "profile", "deg", [20, 32], "Angle between the Frankfort proxy and the gonion-to-menton line."),
  D("ramusMandibleRatio", "Ramus : Mandible Ratio", "Mandible", "profile", "ratio", [0.60, 0.75], "Ear-to-gonion length relative to gonion-to-menton length."),
  D("nasalProjection", "Nasal Projection (Goode)", "Nose", "profile", "ratio", [0.50, 0.65], "Tip projection ahead of the alar base, relative to nasion-to-tip length."),
  D("frankfortTipAngle", "Frankfort-tip Angle", "Profile", "profile", "deg", [35, 50], "Angle between the Frankfort proxy and the nasion-to-tip line."),
  D("gonialAngle", "Gonial Angle", "Mandible", "profile", "deg", [110, 125], "Angle ear-proxy - gonion - menton."),
  D("facialDepthHeightRatio", "Facial Depth : Height Ratio", "Facial Proportions", "profile", "ratio", [1.15, 1.35], "Ear-to-nasal-tip depth relative to nasion-to-menton height."),
  D("interiorMidfaceProjectionAngle", "Interior Midface Projection Angle", "Midface", "profile", "deg", null, "Angular projection of the midface.", "Unavailable: requires a malar landmark the mesh does not provide."),
  D("anteriorFacialDepth", "Anterior Facial Depth", "Facial Proportions", "profile", "deg", null, "Anterior facial depth.", "Unavailable: clinically a millimetre measure and cannot be derived without calibration."),
  D("nasofacialAngle", "Nasofacial Angle", "Nose", "profile", "deg", [29, 35], "Angle between the nasal dorsum and the nasion-pogonion line."),
  D("lowerLipSLine", "Lower Lip S-Line Position", "Lips", "profile", "pct", [-1.7, 1.7], "Lower lip vs. line from pogonion to the nose-tip/subnasale midpoint. + = ahead of line. % of nasion-menton."),
  D("upperLipSLine", "Upper Lip S-Line Position", "Lips", "profile", "pct", [-2.5, 0.8], "Upper lip vs. the S-line. + = ahead of line. % of nasion-menton."),
  D("lowerLipELine", "Lower Lip E-Line Position", "Lips", "profile", "pct", [-3.3, 0.8], "Lower lip vs. nose-tip-to-pogonion line. + = ahead of line. % of nasion-menton."),
  D("upperLipELine", "Upper Lip E-Line Position", "Lips", "profile", "pct", [-5, 0], "Upper lip vs. the E-line. + = ahead of line. % of nasion-menton."),
  D("lowerLipBurstone", "Lower Lip Burstone Line", "Lips", "profile", "pct", [0.4, 2.3], "Lower lip vs. subnasale-to-pogonion line. + = ahead of line. % of nasion-menton."),
  D("upperLipBurstone", "Upper Lip Burstone Line", "Lips", "profile", "pct", [1.3, 3.0], "Upper lip vs. the Burstone line. + = ahead of line. % of nasion-menton."),
  D("holdawayHLine", "Holdaway H-Line", "Lips / Profile", "profile", "pct", [-1.7, 1.7], "Lower lip vs. line from pogonion to upper lip. % of nasion-menton."),
  D("mentolabialAngle", "Mentolabial Angle", "Lips / Chin", "profile", "deg", [120, 135], "Angle lower lip - mentolabial sulcus - pogonion."),
  D("gonionMouthLine", "Gonion → Mouth Line", "Mandible / Lips", "profile", "ratio", [0.55, 0.80], "Gonion-to-upper-lip distance relative to nasion-to-menton distance.")
];


/* =========================================================
   PUBLIC API
========================================================= */

function calculateMetrics({ frontal, profile, scaleMm = null } = {}) {
  const fv = frontal ? frontalValues(frontal) : {};
  const pv = profile ? profileValues(profile) : {};
  const values = { ...fv, ...pv };
  const out = {};

  for (const def of DEFS) {
    if (!(def.key in values)) continue;
    out[def.key] = {
      name: def.name,
      category: def.category,
      value: values[def.key],
      unit: def.unit,
      description: def.description,
      note: Number.isFinite(values[def.key]) ? "" : def.note,
      requiresFrontal: def.requiresFrontal,
      requiresProfile: def.requiresProfile
    };
  }
  return out;
}

function formatValue(value, unit) {
  if (!Number.isFinite(value)) return "Unavailable";
  if (unit === "deg") return `${value.toFixed(2)}°`;
  if (unit === "pct") return `${value.toFixed(2)}%`;
  return value.toFixed(3);
}

const suffix = (unit) => (unit === "deg" ? "°" : unit === "pct" ? "%" : "");

/* 0 = interval midpoint, 1 = boundary, >1 = outside */
function comparisonDistance(value, low, high) {
  if (![value, low, high].every(Number.isFinite)) return null;
  const half = (high - low) / 2;
  if (half === 0) return value === low ? 0 : Infinity;
  return Math.abs(value - (low + high) / 2) / half;
}

function attachIdealRanges(metrics /* , sex = "male" */) {
  const result = {};
  for (const [key, m] of Object.entries(metrics)) {
    const def = DEFS.find((x) => x.key === key);
    const range = def && def.ideal;
    const copy = { ...m, ideal: range || null };

    copy.formattedValue = formatValue(m.value, m.unit);
    copy.idealText = range
      ? `${range[0]}${suffix(m.unit)} – ${range[1]}${suffix(m.unit)}`
      : "Not specified";

    if (!range || !Number.isFinite(m.value)) {
      copy.status = "unavailable";
      copy.comparison = null;
    } else {
      copy.status = m.value >= range[0] && m.value <= range[1] ? "within" : "outside";
      copy.comparison = comparisonDistance(m.value, range[0], range[1]);
    }
    result[key] = copy;
  }
  return result;
}

const getMetricDefinitions = () => DEFS.map((x) => ({ ...x }));
const getMetricDefinition = (key) => DEFS.find((x) => x.key === key) || null;
const getMetricsByCategory = (c) => DEFS.filter((x) => x.category === c);
const getProfileMetrics = () => DEFS.filter((x) => x.requiresProfile);
const getFrontalMetrics = () => DEFS.filter((x) => x.requiresFrontal);

export {
  calculateMetrics,
  attachIdealRanges,
  getMetricDefinition,
  getMetricDefinitions,
  getMetricsByCategory,
  getProfileMetrics,
  getFrontalMetrics
};
