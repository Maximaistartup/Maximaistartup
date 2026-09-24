/* =========================================================
   FACET PROFILE TRACER
   True 90° profiles cannot be reliably auto-detected by the
   MediaPipe face mesh, so the profile landmarks are placed by
   the user on a zoomable canvas (as in soft-tissue cephalometric
   tracing). Every measurement is then computed exactly from
   those points. Coordinates are stored in NATURAL image pixels.
========================================================= */

export const TRACE_POINTS = [
  { key: "trichion", label: "Trichion", required: false,
    help: "Hairline at the midline of the forehead." },
  { key: "foreheadMid", label: "Mid-forehead", required: false,
    help: "Most forward point of the forehead, halfway between trichion and glabella." },
  { key: "glabella", label: "Glabella", required: true,
    help: "Most forward point of the forehead between the eyebrows." },
  { key: "nasion", label: "Nasion", required: true,
    help: "Deepest point of the curve between the forehead and the nose bridge." },
  { key: "pronasale", label: "Pronasale (nose tip)", required: true,
    help: "Most forward point of the tip of the nose." },
  { key: "alare", label: "Alar crease", required: false,
    help: "Where the nostril wing meets the cheek." },
  { key: "subnasale", label: "Subnasale", required: true,
    help: "Point where the base of the nose meets the upper lip." },
  { key: "labraleSup", label: "Upper lip", required: true,
    help: "Most forward point of the upper lip." },
  { key: "labraleInf", label: "Lower lip", required: true,
    help: "Most forward point of the lower lip." },
  { key: "sulcus", label: "Mentolabial sulcus", required: true,
    help: "Deepest point of the curve between the lower lip and the chin." },
  { key: "pogonion", label: "Pogonion (chin)", required: true,
    help: "Most forward point of the chin." },
  { key: "menton", label: "Menton", required: true,
    help: "Lowest point of the chin." },
  { key: "cervical", label: "Cervical point", required: false,
    help: "Where the underside of the chin meets the neck." },
  { key: "neckLower", label: "Lower neck point", required: false,
    help: "A point on the front of the neck, about 3–4 cm below the cervical point, along the neck line." },
  { key: "gonion", label: "Gonion", required: false,
    help: "Angle of the jaw: the corner of the jawline below the ear." },
  { key: "tragus", label: "Tragus", required: false,
    help: "The small cartilage flap in front of the ear canal. Needed for Frankfort-based metrics." },
  { key: "orbitale", label: "Orbitale", required: false,
    help: "Lowest point of the bony rim under the eye (on the cheek, below the eye). Needed for Frankfort-based metrics." }
];

const ZOOMS = [1, 1.5, 2, 3, 4];

function injectStyles() {
  if (document.getElementById("tracerStyles")) return;
  const style = document.createElement("style");
  style.id = "tracerStyles";
  style.textContent = `
    .tracer { margin-top: 30px; background: #11151a; border: 1px solid #252a32; border-radius: 12px; padding: 22px; }
    .tracer.hidden { display: none; }
    .tracer h2 { margin: 0 0 6px; font-size: 20px; }
    .tracer-intro { color: #8b939f; font-size: 13px; line-height: 1.55; margin: 0 0 16px; }
    .tracer-prompt { background: #1b2028; border-radius: 8px; padding: 12px 14px; font-size: 14px; line-height: 1.5; margin-bottom: 12px; }
    .tracer-prompt b { color: #ffffff; }
    .tracer-prompt .opt { color: #858d99; font-size: 12px; }
    .tracer-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
    .tracer-controls button { border: 0; background: #f2f3f5; color: #0b0d10; font-weight: 700; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .tracer-controls button.secondary { background: #1b2028; color: #d5d9df; }
    .tracer-controls button:disabled { opacity: 0.35; cursor: not-allowed; }
    .tracer-zoom { color: #9da5b1; font-size: 13px; min-width: 44px; text-align: center; }
    .tracer-wrap { max-height: 720px; overflow: auto; border: 1px solid #252a32; border-radius: 8px; background: #080a0d; }
    .tracer-wrap canvas { display: block; cursor: crosshair; touch-action: none; }
    .tracer-steps { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
    .tracer-chip { font-size: 11px; padding: 4px 8px; border-radius: 5px; background: #1b2028; color: #737c88; }
    .tracer-chip.done { background: #173324; color: #7edc9a; }
    .tracer-chip.skipped { text-decoration: line-through; }
    .tracer-chip.current { background: #f2f3f5; color: #0b0d10; font-weight: 700; }
  `;
  document.head.appendChild(style);
}

export function createTracer({ insertBefore, onChange }) {
  injectStyles();

  const section = document.createElement("section");
  section.className = "tracer hidden";
  section.innerHTML = `
    <h2>Trace side-profile landmarks</h2>
    <p class="tracer-intro">
      A true 90° profile cannot be reliably auto-detected, so you place the
      landmarks yourself and FACET computes every measurement exactly from them.
      Zoom in for precision. Click to place the highlighted point; drag any
      placed point to adjust it. Frankfort-based metrics need the tragus and
      orbitale; metrics whose landmarks you skip are shown as Unavailable.
    </p>
    <div class="tracer-prompt"></div>
    <div class="tracer-controls">
      <button class="secondary" data-act="zoomOut">Zoom −</button>
      <span class="tracer-zoom">1×</span>
      <button class="secondary" data-act="zoomIn">Zoom +</button>
      <button class="secondary" data-act="undo">Undo</button>
      <button class="secondary" data-act="skip">Skip this point</button>
      <button class="secondary" data-act="reset">Reset all</button>
    </div>
    <div class="tracer-wrap"><canvas></canvas></div>
    <div class="tracer-steps"></div>
  `;
  insertBefore.parentNode.insertBefore(section, insertBefore);

  const promptEl = section.querySelector(".tracer-prompt");
  const zoomEl = section.querySelector(".tracer-zoom");
  const stepsEl = section.querySelector(".tracer-steps");
  const wrap = section.querySelector(".tracer-wrap");
  const canvas = section.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const btn = (act) => section.querySelector(`[data-act="${act}"]`);

  const order = TRACE_POINTS.map((p) => p.key);
  const byKey = Object.fromEntries(TRACE_POINTS.map((p) => [p.key, p]));

  let img = null;
  let W = 0;
  let H = 0;
  let zoomIndex = 0;
  let pts = {};
  let skipped = new Set();
  let history = [];
  let dragKey = null;

  const currentKey = () => order.find((k) => !pts[k] && !skipped.has(k)) || null;

  function scale() {
    const avail = Math.min(wrap.clientWidth || 900, 900);
    return (avail / W) * ZOOMS[zoomIndex];
  }

  function resize() {
    if (!img) return;
    const s = scale();
    canvas.width = Math.max(1, Math.round(W * s));
    canvas.height = Math.max(1, Math.round(H * s));
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    draw();
  }

  function draw() {
    if (!img) return;
    const s = canvas.width / W;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (pts.tragus && pts.orbitale) {
      ctx.strokeStyle = "rgba(90, 200, 250, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pts.tragus.x * s, pts.tragus.y * s);
      ctx.lineTo(pts.orbitale.x * s, pts.orbitale.y * s);
      ctx.stroke();
    }

    ctx.font = "12px Arial, sans-serif";
    order.forEach((key, i) => {
      const p = pts[key];
      if (!p) return;
      const x = p.x * s;
      const y = p.y * s;
      ctx.strokeStyle = "#ff4d4d";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
      ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
      ctx.stroke();
      ctx.fillStyle = "#ffe066";
      ctx.fillText(`${i + 1}`, x + 8, y - 6);
    });
  }

  function renderUI() {
    zoomEl.textContent = `${ZOOMS[zoomIndex]}×`;
    btn("zoomOut").disabled = zoomIndex === 0;
    btn("zoomIn").disabled = zoomIndex === ZOOMS.length - 1;
    btn("undo").disabled = history.length === 0;

    const key = currentKey();
    const canSkip = key && !byKey[key].required;
    btn("skip").style.display = canSkip ? "" : "none";

    if (key) {
      const p = byKey[key];
      const n = order.indexOf(key) + 1;
      promptEl.innerHTML =
        `Point ${n} of ${order.length}: <b>${p.label}</b> ` +
        `<span class="opt">${p.required ? "(required)" : "(optional)"}</span><br>${p.help}`;
    } else {
      promptEl.innerHTML =
        "All points handled. Drag any point to fine-tune it, then click <b>Analyze Face</b>.";
    }

    stepsEl.innerHTML = "";
    order.forEach((k, i) => {
      const chip = document.createElement("span");
      chip.className = "tracer-chip";
      if (pts[k]) chip.classList.add("done");
      else if (skipped.has(k)) chip.classList.add("skipped");
      else if (k === key) chip.classList.add("current");
      chip.textContent = `${i + 1}. ${byKey[k].label}`;
      stepsEl.appendChild(chip);
    });
  }

  function refresh() {
    draw();
    renderUI();
    if (onChange) onChange();
  }

  function eventToImage(e) {
    const r = canvas.getBoundingClientRect();
    const s = canvas.width / W;
    return {
      x: ((e.clientX - r.left) * (canvas.width / r.width)) / s,
      y: ((e.clientY - r.top) * (canvas.height / r.height)) / s
    };
  }

  function nearestPlaced(pos) {
    const s = canvas.width / W;
    let best = null;
    let bestDist = 12 / s; // 12 display px
    for (const key of order) {
      const p = pts[key];
      if (!p) continue;
      const dist = Math.hypot(p.x - pos.x, p.y - pos.y);
      if (dist <= bestDist) { best = key; bestDist = dist; }
    }
    return best;
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!img) return;
    const pos = eventToImage(e);
    const hit = nearestPlaced(pos);
    if (hit) {
      dragKey = hit;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    const key = currentKey();
    if (!key) return;
    pts[key] = pos;
    history.push({ type: "place", key });
    refresh();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragKey) return;
    const pos = eventToImage(e);
    pts[dragKey] = {
      x: Math.min(Math.max(pos.x, 0), W),
      y: Math.min(Math.max(pos.y, 0), H)
    };
    draw();
  });

  const endDrag = () => {
    if (!dragKey) return;
    dragKey = null;
    refresh();
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  section.addEventListener("click", (e) => {
    const act = e.target?.dataset?.act;
    if (!act) return;

    if (act === "zoomIn" && zoomIndex < ZOOMS.length - 1) { zoomIndex++; resize(); renderUI(); }
    if (act === "zoomOut" && zoomIndex > 0) { zoomIndex--; resize(); renderUI(); }

    if (act === "undo") {
      const last = history.pop();
      if (!last) return;
      if (last.type === "place") delete pts[last.key];
      else skipped.delete(last.key);
      refresh();
    }

    if (act === "skip") {
      const key = currentKey();
      if (!key || byKey[key].required) return;
      skipped.add(key);
      history.push({ type: "skip", key });
      refresh();
    }

    if (act === "reset") {
      pts = {};
      skipped = new Set();
      history = [];
      refresh();
    }
  });

  window.addEventListener("resize", () => { if (img) resize(); });

  return {
    setImage(dataURL) {
      const image = new Image();
      image.onload = () => {
        img = image;
        W = image.naturalWidth;
        H = image.naturalHeight;
        pts = {};
        skipped = new Set();
        history = [];
        zoomIndex = 0;
        section.classList.remove("hidden");
        requestAnimationFrame(() => { resize(); renderUI(); if (onChange) onChange(); });
      };
      image.src = dataURL;
    },

    getPoints() {
      const out = {};
      for (const k of order) if (pts[k]) out[k] = { x: pts[k].x, y: pts[k].y };
      return out;
    },

    isComplete() {
      return TRACE_POINTS.filter((p) => p.required).every((p) => pts[p.key]);
    },

    remainingRequired() {
      return TRACE_POINTS.filter((p) => p.required && !pts[p.key]).length;
    }
  };
}
