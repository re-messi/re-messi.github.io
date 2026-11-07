// A floating ASCII astronaut, built from shaded 3D-ish shapes (helmet, gold
// visor, suit, backpack, panel lights, gloves, boots, tether) and drawn as
// coloured characters.
(() => {
  const canvas = document.querySelector('canvas.ascii-astronaut');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const RAMP = " .,:;-~=+*oaxO#%@";
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Light from the upper left, viewer straight ahead.
  const L = norm([-0.45, -0.55, 0.7]);
  const H = norm([L[0], L[1], L[2] + 1]);
  function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }

  const MAT = {
    suit:    { c: [225, 233, 255], a: 0.84, s: 0.3 },
    seam:    { c: [120, 140, 200], a: 0.55, s: 0.05 },
    pack:    { c: [140, 160, 215], a: 0.62, s: 0.1 },
    helmet:  { c: [235, 241, 255], a: 0.95, s: 0.9 },
    ring:    { c: [150, 170, 225], a: 0.7, s: 0.4 },
    visor:   { c: [90, 120, 210], a: 0.4, s: 1.2 },
    panel:   { c: [100, 120, 185], a: 0.5, s: 0.2 },
    boot:    { c: [160, 178, 228], a: 0.6, s: 0.2 },
    glove:   { c: [205, 218, 252], a: 0.78, s: 0.3 },
    tether:  { c: [170, 188, 240], a: 0.55, s: 0.1 },
    patch:   { c: [255, 246, 216], a: 0.85, s: 0.2 },
  };

  function ell(x, y, cx, cy, rx, ry, rot = 0) {
    const dx = x - cx, dy = y - cy, c = Math.cos(rot), s = Math.sin(rot);
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    const q = (lx / rx) ** 2 + (ly / ry) ** 2;
    if (q >= 1) return null;
    const nx = lx / rx, ny = ly / ry;
    return { q, lx: nx, ly: ny, n: [nx * c - ny * s, nx * s + ny * c, Math.sqrt(1 - q)] };
  }

  function cap(x, y, ax, ay, bx, by, r) {
    const vx = bx - ax, vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    const dx = x - (ax + vx * t), dy = y - (ay + vy * t);
    const q = (dx * dx + dy * dy) / (r * r);
    if (q >= 1) return null;
    return { q, t, n: [dx / r, dy / r, Math.sqrt(1 - q)] };
  }

  // Rounded box (superellipse) with a soft pillow normal.
  function box(x, y, cx, cy, hw, hh, rot = 0) {
    const dx = x - cx, dy = y - cy, c = Math.cos(rot), s = Math.sin(rot);
    const lx = (dx * c + dy * s) / hw, ly = (-dx * s + dy * c) / hh;
    const f = lx ** 4 + ly ** 4;
    if (f >= 1) return null;
    const q = Math.sqrt(f);
    let gx = lx ** 3, gy = ly ** 3;
    const gl = Math.hypot(gx, gy) || 1;
    gx = gx / gl * q; gy = gy / gl * q;
    return { q, lx, ly, n: [gx * c - gy * s, gx * s + gy * c, Math.sqrt(Math.max(0, 1 - q * q))] };
  }

  // Suit fabric: soft folds along a limb, darker bearing rings at the joints.
  const limbMat = (h, rings) => (rings.some(([a, b]) => h.t > a && h.t < b) ? MAT.seam : MAT.suit);
  const folds = (h, k) => ({ fold: 0.12 * Math.sin(h.t * k) });

  // Returns the front-most surface at a point in figure units (y down).
  function sample(x, y, t) {
    let hit = null;
    const put = (h, mat, extra) => { if (h) hit = { ...h, mat, ...extra }; };
    const drift = Math.sin(t * 0.7) * 0.012;

    // Tether drifting off to the left, behind everything.
    if (x < -0.15 && x > -0.62) {
      const ty = -0.06 + 0.04 * Math.sin(x * 14 + t * 1.2) * Math.min(1, (-0.15 - x) * 5);
      const d = (y - ty) / 0.006;
      if (Math.abs(d) < 1) put({ q: d * d, n: [0, d, Math.sqrt(1 - d * d)] }, MAT.tether, { dashed: true });
    }

    // Life-support backpack, wider than the torso and above the shoulders.
    const pack = box(x, y, -0.005, -0.15, 0.165, 0.19);
    if (pack) put(pack, MAT.pack, { fold: Math.abs(pack.ly) < 0.05 ? -0.15 : 0 });

    // Legs: thighs, knee joints, lower legs and boots, slightly bent as if floating.
    for (const [sx, kx, ky, ax, ay, bend] of [[-1, -0.085, 0.24, -0.075, 0.41, 0.25], [1, 0.1, 0.22, 0.14, 0.39, -0.35]]) {
      const thigh = cap(x, y, sx * 0.06, 0.06, kx, ky, 0.056);
      if (thigh) put(thigh, limbMat(thigh, [[0.92, 1.01]]), folds(thigh, 18));
      const shin = cap(x, y, kx, ky, ax, ay, 0.05);
      if (shin) put(shin, limbMat(shin, [[-0.01, 0.07]]), folds(shin, 16));
      put(box(x, y, ax + sx * 0.012, ay + 0.04, 0.06, 0.038, bend * 0.4), MAT.boot);
      const sole = box(x, y, ax + sx * 0.012, ay + 0.072, 0.064, 0.011, bend * 0.4);
      if (sole) put(sole, MAT.seam);
    }

    // Lower torso and waist bearing.
    const brief = box(x, y, 0, 0.04, 0.115, 0.065);
    if (brief) put(brief, MAT.suit, { fold: 0.08 * Math.sin(brief.ly * 9) });
    const waist = box(x, y, 0, -0.025, 0.12, 0.018);
    if (waist) put(waist, MAT.seam);

    // Back arm (viewer's left), relaxed and slightly out.
    const ua = cap(x, y, -0.135, -0.215, -0.205, -0.08 + drift, 0.047);
    if (ua) put(ua, limbMat(ua, [[-0.01, 0.1], [0.9, 1.01]]), folds(ua, 20));
    const fa = cap(x, y, -0.205, -0.08 + drift, -0.235, 0.05 + drift, 0.042);
    if (fa) put(fa, limbMat(fa, [[0.88, 1.01]]), folds(fa, 18));
    put(ell(x, y, -0.238, 0.09 + drift, 0.036, 0.047, 0.15), MAT.glove);

    // Hard upper torso with a chest control box.
    const torso = box(x, y, 0, -0.15, 0.135, 0.125);
    if (torso) {
      let mat = MAT.suit, extra = {};
      const dcm = box(x, y, 0, -0.105, 0.075, 0.048);
      if (dcm) {
        mat = dcm.q > 0.82 ? MAT.ring : MAT.panel;
        // Dials and indicator lights on the control box.
        [[-0.04, -0.12], [-0.012, -0.12], [0.016, -0.12]].forEach(([bx, by], i) => {
          if ((x - bx) ** 2 + (y - by) ** 2 < 0.0085 ** 2) {
            extra = { emit: 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.5 + i * 2)), col: [215, 228, 255] };
          }
        });
        if ((x - 0.045) ** 2 + (y + 0.1) ** 2 < 0.018 ** 2) mat = MAT.ring; // dial
        if (y > -0.09 && y < -0.065 && Math.abs(x) < 0.06 && Math.floor((x + 0.06) / 0.012) % 2 === 0) mat = MAT.seam;
        put(dcm, mat, extra);
      } else {
        // Shoulder flag patch and a seam down the chest.
        if (Math.abs(x + 0.085) < 0.022 && Math.abs(y + 0.21) < 0.013) mat = MAT.patch;
        put(torso, mat, { fold: Math.abs(x) < 0.006 ? -0.15 : 0 });
      }
    }

    // Neck ring and helmet with visor assembly and side lights.
    put(ell(x, y, 0, -0.272, 0.085, 0.022), MAT.ring);
    const helmet = ell(x, y, 0, -0.365, 0.1, 0.102);
    if (helmet) {
      put(helmet, MAT.helmet);
      for (const lxp of [-0.078, 0.078]) {
        const lamp = box(x, y, lxp * 1.1, -0.415, 0.016, 0.022);
        if (lamp) hit = { ...lamp, mat: MAT.ring, ...(lamp.q < 0.5 ? { emit: 0.7, col: [235, 242, 255] } : {}) };
      }
      const visor = ell(x, y, 0.008, -0.355, 0.08, 0.077, -0.05);
      if (visor) {
        const streak = Math.abs(visor.ly - (-0.45 + 0.4 * visor.lx * visor.lx + 0.03 * Math.sin(t * 0.6)));
        let glow = streak < 0.1 && visor.lx > -0.7 && visor.lx < 0.5 ? 0.8 * (1 - streak / 0.1) : 0;
        // Faint reflection of the planet and stars in the visor.
        if ((visor.lx - 0.35) ** 2 + (visor.ly - 0.3) ** 2 < 0.06) glow = Math.max(glow, 0.22);
        for (const [sx2, sy2] of [[-0.3, 0.2], [0.1, 0.45], [0.55, -0.2]]) {
          if ((visor.lx - sx2) ** 2 + (visor.ly - sy2) ** 2 < 0.004) glow = Math.max(glow, 0.5 + 0.3 * Math.sin(t * 3 + sx2 * 9));
        }
        glow += 0.12 * Math.max(0, -visor.ly - visor.lx * 0.3);
        hit = { ...visor, mat: visor.q > 0.84 ? MAT.ring : MAT.visor, glow };
      }
    }

    // Front arm, reaching gently forward.
    const ua2 = cap(x, y, 0.135, -0.215, 0.22, -0.11 - drift, 0.047);
    if (ua2) put(ua2, limbMat(ua2, [[-0.01, 0.1], [0.9, 1.01]]), folds(ua2, 20));
    const fa2 = cap(x, y, 0.22, -0.11 - drift, 0.275, -0.0 - drift, 0.042);
    if (fa2) put(fa2, limbMat(fa2, [[0.86, 1.01]]), folds(fa2, 18));
    // Wrist checklist/mirror and glove.
    const cuff = box(x, y, 0.262, -0.03 - drift, 0.026, 0.014, 1.1);
    if (cuff) put(cuff, MAT.ring);
    put(ell(x, y, 0.288, 0.04 - drift, 0.035, 0.047, -0.4), MAT.glove);

    return hit;
  }

  let w = 0, h = 0, cw = 0, ch = 0, cols = 0, rows = 0, font = '';
  let time = 0, last = 0, visible = false, running = false;
  const stars = Array.from({ length: 18 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6 }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = w < 260 ? 5 : 6;
    font = `${size}px ui-monospace, "SF Mono", Menlo, monospace`;
    ctx.font = font;
    cw = ctx.measureText('M').width;
    ch = size * 1.12;
    cols = Math.ceil(w / cw);
    rows = Math.ceil(h / ch);
  }

  function draw() {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    ctx.textBaseline = 'top';
    const scale = h * 0.9, cx = w * 0.5, cy = h * 0.53;
    const tilt = Math.sin(time * 0.45) * 0.1, c = Math.cos(tilt), s = Math.sin(tilt);

    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const px = (k + 0.5) * cw - cx, py = (r + 0.5) * ch - cy;
        const x = (px * c + py * s) / scale, y = (-px * s + py * c) / scale;
        const hit = sample(x, y, time);
        let v, col;
        if (!hit) {
          // Twinkling background stars.
          const st = stars.find((p) => Math.abs(p.x * w - (k + 0.5) * cw) < cw / 2 && Math.abs(p.y * h - (r + 0.5) * ch) < ch / 2);
          if (!st) continue;
          v = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 2 + st.p));
          col = [200, 215, 255];
        } else if (hit.emit !== undefined) {
          v = 0.35 + 0.65 * hit.emit;
          col = hit.col;
        } else {
          const n = hit.n, m = hit.mat;
          const diffuse = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
          const spec = Math.pow(Math.max(0, n[0] * H[0] + n[1] * H[1] + n[2] * H[2]), 28) * m.s;
          const edge = hit.q > 0.78 ? 1 - (hit.q - 0.78) * 2.6 : 1; // outlines
          v = m.a * (0.16 + 0.84 * diffuse) * edge * (1 + (hit.fold || 0)) + spec + (hit.glow || 0);
          if (hit.dashed && Math.floor(px / (cw * 2)) % 2 === 0) v *= 0.4;
          const lift = Math.min(1, spec + (hit.glow || 0));
          col = m.c.map((ch2) => ch2 + (255 - ch2) * lift);
        }
        const level = Math.max(1, Math.min(RAMP.length - 1, Math.floor(v * RAMP.length)));
        const shade = 0.45 + 0.55 * Math.min(1, v);
        ctx.fillStyle = `rgb(${(col[0] * shade) | 0},${(col[1] * shade) | 0},${(col[2] * shade) | 0})`;
        ctx.fillText(RAMP[level], k * cw, r * ch);
      }
    }
  }

  function frame(now) {
    time += Math.min(0.05, (now - last) / 1000);
    last = now;
    draw();
    if (visible) requestAnimationFrame(frame); else running = false;
  }

  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !running && !reduceMotion) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }).observe(canvas);
})();
