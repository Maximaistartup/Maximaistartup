/* =========================================================
   FACET METRIC ENGINE  (build 4.0.0)
   Scale-independent facial geometry.

   frontal : MediaPipe landmarks in PIXEL space ({x, y})
   profile : user-traced landmarks in image pixels, keyed by name
             (glabella, nasion, pronasale, ...) — see tracer.js
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


/* ---------- profile (traced landmarks) ---------- */

const REQUIRED_TRACE = [
  "glabella", "nasion", "pronasale", "subnasale",
  "labraleSup", "labraleInf", "sulcus", "pogonion", "menton"
];

/* Mirror so the face always looks toward +x (the nose tip is in front of nasion). */
function prepareTrace(pts) {
  if (!pts) return null;
  for (const k of REQUIRED_TRACE) if (!pts[k]) return null;
  const facingRight = pts.pronasale.x >= pts.nasion.x;
  const out = {};
  for (const [k, v] of Object.entries(pts)) {
    if (v) out[k] = { x: facingRight ? v.x : -v.x, y: v.y };
  }
  return out;
}

function profileValues(traced) {
  const t = prepareTrace(traced);
  if (!t) return {};

  const g = t.glabella, nas = t.nasion, tip = t.pronasale, sn = t.subnasale;
  const ls = t.labraleSup, li = t.labraleInf, sul = t.sulcus;
  const pog = t.pogonion, men = t.menton;
  const tri = t.trichion, fm = t.foreheadMid, ala = t.alare;
  const cerv = t.cervical, neck = t.neckLower, gon = t.gonion;
  const tra = t.tragus, orb = t.orbitale;

  const faceH = d(nas, men);              // normalizer for lengths
  const pct = (v) => ratio(v, faceH) * 100;

  /* Frankfort horizontal from the traced tragus -> orbitale line.
     F = forward unit vector, U = "up" unit vector (image y points down). */
  let F = null;
  let U = null;
  if (tra && orb) {
    const v = vec(tra, orb);
    const n = Math.hypot(v.x, v.y);
    if (n) {
      F = { x: v.x / n, y: v.y / n };
      U = { x: F.y, y: -F.x };
    }
  }
  const along = (v) => (F && v ? v.x * F.x + v.y * F.y : NaN);
  const upOf = (v) => (F && v ? v.x * U.x + v.y * U.y : NaN);

  /* lean of a segment (lower -> upper) away from the Frankfort-perpendicular,
     positive = leaning back */
  const lean = (lower, upper) => {
    const v = vec(lower, upper);
    return F && v ? Math.atan2(-along(v), upOf(v)) * RAD : NaN;
  };

  const lipFront = ls.x >= li.x ? ls : li;
  const sMid = mid(sn, tip);

  return {
    nasalWH: NaN,
    noseTipRotation: F ? Math.atan2(upOf(vec(sn, tip)), along(vec(sn, tip))) * RAD : NaN,
    facialConvexityGlabella: angABC(g, sn, pog),
    totalFacialConvexity: angABC(g, tip, pog),
    submentalCervicalAngle: angABC(men, cerv, neck),
    nasalTipAngle: angABC(nas, tip, sn),
    facialConvexityNasion: angABC(nas, sn, pog),
    nasofrontalAngle: angABC(g, nas, tip),
    zAngle: F ? angV(F, vec(pog, lipFront)) : NaN,
    browridgeInclination: lean(g, fm),
    frankfortRecession: F ? pct(along(vec(nas, pog))) : NaN,
    upperForeheadSlope: lean(fm, tri),
    nasomentalAngle: angABC(nas, tip, pog),
    nasolabialAngle: angABC(tip, sn, ls),
    orbitalVector: NaN,
    mandibularPlaneAngle: F && gon ? angV(F, vec(gon, men)) : NaN,
    ramusMandibleRatio: ratio(d(tra, gon), d(gon, men)),
    nasalProjection: F && ala ? ratio(along(vec(ala, tip)), d(nas, tip)) : NaN,
    frankfortTipAngle: F ? angV(F, vec(nas, tip)) : NaN,
    gonialAngle: angABC(tra, gon, men),
    facialDepthHeightRatio: ratio(d(tra, tip), faceH),
    interiorMidfaceProjectionAngle: NaN,
    anteriorFacialDepth: NaN,
    nasofacialAngle: angV(vec(nas, tip), vec(nas, pog)),
    lowerLipSLine: pct(signedDist(li, sMid, pog)),
    upperLipSLine: pct(signedDist(ls, sMid, pog)),
    lowerLipELine: pct(signedDist(li, tip, pog)),
    upperLipELine: pct(signedDist(ls, tip, pog)),
    lowerLipBurstone: pct(signedDist(li, sn, pog)),
    upperLipBurstone: pct(signedDist(ls, sn, pog)),
    holdawayHLine: pct(signedDist(li, ls, pog)),
    mentolabialAngle: angABC(li, sul, pog),
    gonionMouthLine: ratio(d(gon, ls), faceH)
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

const FRANKFORT = "Needs the traced tragus and orbitale (Frankfort proxy).";

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

  /* profile (traced) */
  D("nasalWH", "Nasal W : H Ratio", "Nose", "profile", "ratio", [0.65, 0.85], "Nasal width relative to height.", "Unavailable: transverse nasal width cannot be measured from a side profile."),
  D("noseTipRotation", "Nose Tip Rotation Angle", "Nose", "profile", "deg", [20, 30], "Inclination of the subnasale-to-pronasale line above the Frankfort horizontal.", FRANKFORT),
  D("facialConvexityGlabella", "Facial Convexity (Glabella)", "Facial Convexity", "profile", "deg", [165, 175], "Angle glabella - subnasale - pogonion."),
  D("totalFacialConvexity", "Total Facial Convexity", "Facial Convexity", "profile", "deg", [135, 150], "Angle glabella - pronasale - pogonion."),
  D("submentalCervicalAngle", "Submental Cervical Angle", "Jaw / Neck", "profile", "deg", [105, 125], "Angle menton - cervical point - lower neck point.", "Needs the traced cervical point and lower neck point."),
  D("nasalTipAngle", "Nasal Tip Angle", "Nose", "profile", "deg", [110, 125], "Angle nasion - pronasale - subnasale."),
  D("facialConvexityNasion", "Facial Convexity (Nasion)", "Facial Convexity", "profile", "deg", [165, 175], "Angle nasion - subnasale - pogonion."),
  D("nasofrontalAngle", "Nasofrontal Angle", "Nose", "profile", "deg", [115, 130], "Angle glabella - nasion - pronasale."),
  D("zAngle", "Z Angle", "Profile", "profile", "deg", [70, 80], "Angle between the Frankfort horizontal and the pogonion-to-most-forward-lip line.", FRANKFORT),
  D("browridgeInclination", "Browridge Inclination Angle", "Forehead / Brow", "profile", "deg", [15, 25], "Lean of the glabella-to-mid-forehead segment from the Frankfort perpendicular.", "Needs the traced mid-forehead point plus tragus and orbitale."),
  D("frankfortRecession", "Recession Relative to Frankfort Plane", "Profile", "profile", "pct", [-2, 3], "Pogonion position ahead of nasion along the Frankfort horizontal, as % of nasion-menton distance.", FRANKFORT),
  D("upperForeheadSlope", "Upper Forehead Slope", "Forehead / Brow", "profile", "deg", [0, 10], "Lean of the mid-forehead-to-trichion segment from the Frankfort perpendicular.", "Needs the traced trichion and mid-forehead points plus tragus and orbitale."),
  D("nasomentalAngle", "Nasomental Angle", "Nose / Chin", "profile", "deg", [125, 135], "Angle nasion - pronasale - pogonion."),
  D("nasolabialAngle", "Nasolabial Angle", "Nose / Lips", "profile", "deg", [95, 110], "Angle pronasale - subnasale - upper lip."),
  D("orbitalVector", "Orbital Vector", "Orbit", "profile", "ratio", null, "Globe projection relative to the malar prominence.", "Unavailable: requires corneal and malar landmarks that are not traced."),
  D("mandibularPlaneAngle", "Mandibular Plane Angle", "Mandible", "profile", "deg", [20, 32], "Angle between the Frankfort horizontal and the gonion-to-menton line.", "Needs the traced gonion plus tragus and orbitale."),
  D("ramusMandibleRatio", "Ramus : Mandible Ratio", "Mandible", "profile", "ratio", [0.60, 0.75], "Tragus-to-gonion length relative to gonion-to-menton length (soft-tissue proxy).", "Needs the traced gonion and tragus."),
  D("nasalProjection", "Nasal Projection (Goode)", "Nose", "profile", "ratio", [0.50, 0.65], "Tip projection ahead of the alar crease along the Frankfort horizontal, relative to nasion-to-tip length.", "Needs the traced alar crease plus tragus and orbitale."),
  D("frankfortTipAngle", "Frankfort-tip Angle", "Profile", "profile", "deg", [35, 50], "Angle between the Frankfort horizontal and the nasion-to-pronasale line.", FRANKFORT),
  D("gonialAngle", "Gonial Angle", "Mandible", "profile", "deg", [110, 125], "Angle tragus - gonion - menton (soft-tissue proxy).", "Needs the traced gonion and tragus."),
  D("facialDepthHeightRatio", "Facial Depth : Height Ratio", "Facial Proportions", "profile", "ratio", [1.15, 1.35], "Tragus-to-pronasale depth relative to nasion-to-menton height.", "Needs the traced tragus."),
  D("interiorMidfaceProjectionAngle", "Interior Midface Projection Angle", "Midface", "profile", "deg", null, "Angular projection of the midface.", "Unavailable: requires a malar landmark that is not traced."),
  D("anteriorFacialDepth", "Anterior Facial Depth", "Facial Proportions", "profile", "deg", null, "Anterior facial depth.", "Unavailable: clinically a millimetre measure and cannot be derived without calibration."),
  D("nasofacialAngle", "Nasofacial Angle", "Nose", "profile", "deg", [29, 35], "Angle between the nasal dorsum (nasion-pronasale) and the nasion-pogonion line."),
  D("lowerLipSLine", "Lower Lip S-Line Position", "Lips", "profile", "pct", [-1.7, 1.7], "Lower lip vs. line from pogonion to the pronasale/subnasale midpoint. + = ahead of line. % of nasion-menton."),
  D("upperLipSLine", "Upper Lip S-Line Position", "Lips", "profile", "pct", [-2.5, 0.8], "Upper lip vs. the S-line. + = ahead of line. % of nasion-menton."),
  D("lowerLipELine", "Lower Lip E-Line Position", "Lips", "profile", "pct", [-3.3, 0.8], "Lower lip vs. pronasale-to-pogonion line. + = ahead of line. % of nasion-menton."),
  D("upperLipELine", "Upper Lip E-Line Position", "Lips", "profile", "pct", [-5, 0], "Upper lip vs. the E-line. + = ahead of line. % of nasion-menton."),
  D("lowerLipBurstone", "Lower Lip Burstone Line", "Lips", "profile", "pct", [0.4, 2.3], "Lower lip vs. subnasale-to-pogonion line. + = ahead of line. % of nasion-menton."),
  D("upperLipBurstone", "Upper Lip Burstone Line", "Lips", "profile", "pct", [1.3, 3.0], "Upper lip vs. the Burstone line. + = ahead of line. % of nasion-menton."),
  D("holdawayHLine", "Holdaway H-Line", "Lips / Profile", "profile", "pct", [-1.7, 1.7], "Lower lip vs. line from pogonion to upper lip. % of nasion-menton."),
  D("mentolabialAngle", "Mentolabial Angle", "Lips / Chin", "profile", "deg", [120, 135], "Angle lower lip - mentolabial sulcus - pogonion."),
  D("gonionMouthLine", "Gonion → Mouth Line", "Mandible / Lips", "profile", "ratio", [0.55, 0.80], "Gonion-to-upper-lip distance relative to nasion-to-menton distance.", "Needs the traced gonion.")
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
    const ok = Number.isFinite(values[def.key]);
    out[def.key] = {
      name: def.name,
      category: def.category,
      value: values[def.key],
      unit: def.unit,
      description: def.description,
      note: ok ? "" : def.note || "A required landmark was not available.",
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
