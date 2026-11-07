// ASCII planet: a banded planet with glowing light bubbles orbiting on a
// tilted ring, all drawn as a grid of brightness characters.
(() => {
  const canvas = document.querySelector('.ascii-planet');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const RAMP = ' .:-=+*o0@';
  const LEVELS = RAMP.length;
  const BUBBLES = 7;
  const TAU = Math.PI * 2;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Character colour per brightness level: dim blue up to near white.
  const colors = [];
  for (let i = 0; i < LEVELS; i++) {
    const k = i / (LEVELS - 1);
    const r = Math.round(70 + 185 * k ** 1.4);
    const g = Math.round(95 + 160 * k ** 1.2);
    const b = Math.round(170 + 85 * k);
    colors.push(`rgba(${r},${g},${b},${(0.35 + 0.65 * k).toFixed(2)})`);
  }

  let w = 0, h = 0, screenH = 0, cols = 0, rows = 0, cw = 0, ch = 0, font = '';
  let field, stars = [], shooters = [], nextShooter = 2;
  let mouseX = 0, mouseY = 0, tiltX = 0, tiltY = 0;
  let visible = true, last = performance.now(), time = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    screenH = Math.min(h, innerHeight); // the planet lives in the first screen
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const size = w < 500 ? 7 : w < 900 ? 9 : 11;
    font = `${size}px ui-monospace, "SF Mono", Menlo, monospace`;
    ctx.font = font;
    cw = ctx.measureText('M').width;
    ch = size * 1.18;
    cols = Math.ceil(w / cw);
    rows = Math.ceil(h / ch);
    field = new Float32Array(cols * rows);

    // Sparse twinkling stars.
    stars = [];
    const count = Math.round(cols * rows * 0.006);
    for (let i = 0; i < count; i++) {
      stars.push({ i: Math.floor(Math.random() * cols * rows), p: Math.random() * TAU, s: 0.5 + Math.random() * 2 });
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduceMotion) time += dt;
    tiltX += (mouseX - tiltX) * 0.04;
    tiltY += (mouseY - tiltY) * 0.04;
    render();
    if (visible && !reduceMotion) requestAnimationFrame(frame);
  }

  function render() {
    field.fill(0);
    const narrow = w < 700;
    const R = narrow ? Math.min(w / 5, screenH * 0.15) : Math.min(w / 5.6, screenH * 0.2);
    const cx = w * (narrow ? 0.5 : 0.64) + tiltX * w * 0.015;
    const cy = screenH * (narrow ? 0.64 : 0.56) + tiltY * screenH * 0.015;
    const ringR = R * 1.95;
    const tilt = 0.36 + tiltY * 0.1;
    const ringB = ringR * Math.sin(tilt);
    // Roll the whole system so the ring rises from lower left to upper right.
    const roll = -0.34 + tiltX * 0.05;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const toLocal = (ex, ey) => [ex * cr + ey * sr, -ex * sr + ey * cr];
    const inPlanet = (px, py) => (px - cx) ** 2 + (py - cy) ** 2 < R * R;
    const box = (rx, ry) => [
      Math.max(0, Math.floor((cx - rx) / cw)), Math.min(cols - 1, Math.ceil((cx + rx) / cw)),
      Math.max(0, Math.floor((cy - ry) / ch)), Math.min(rows - 1, Math.ceil((cy + ry) / ch)),
    ];

    // Stars, hidden behind the planet.
    for (const s of stars) {
      const px = (s.i % cols + 0.5) * cw, py = (Math.floor(s.i / cols) + 0.5) * ch;
      if (inPlanet(px, py)) continue;
      field[s.i] += 0.13 + 0.12 * Math.sin(time * s.s + s.p);
    }

    // Occasional shooting stars streaking down and to the left.
    if (time > nextShooter) {
      nextShooter = time + 3 + Math.random() * 5;
      const speed = Math.max(w, 600) * (0.5 + Math.random() * 0.4);
      shooters.push({ x: w * (0.3 + Math.random() * 0.8), y: Math.random() * h * 0.85, vx: -speed, vy: speed * 0.35, born: time });
    }
    shooters = shooters.filter((m) => time - m.born < 1.1);
    for (const m of shooters) {
      const age = time - m.born, fade = Math.sin(Math.PI * age / 1.1);
      const hx = m.x + m.vx * age, hy = m.y + m.vy * age;
      for (let k = 0; k < 18; k++) {
        const x = Math.floor((hx - m.vx * k * 0.012) / cw), y = Math.floor((hy - m.vy * k * 0.012) / ch);
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        field[y * cols + x] += fade * 0.95 * (1 - k / 18);
      }
    }

    // Planet: lit sphere with drifting bands and a soft atmosphere rim.
    const lx = -0.55 + tiltX * 0.3, ly = -0.55 + tiltY * 0.3, lz = 0.63;
    let [x0, x1, y0, y1] = box(R * 1.3, R * 1.3);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = ((x + 0.5) * cw - cx) / R, ny = ((y + 0.5) * ch - cy) / R;
        const d2 = nx * nx + ny * ny;
        const i = y * cols + x;
        if (d2 < 1) {
          const nz = Math.sqrt(1 - d2);
          const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
          const [ux, uy] = toLocal(nx, ny);
          const lon = Math.atan2(ux, nz) + time * 0.35;
          const lat = Math.asin(Math.max(-1, Math.min(1, uy)));
          const bands = 0.5 + 0.5 * Math.sin(lat * 5 + Math.sin(lon * 2.5) * 1.4);
          field[i] += 0.08 + 0.85 * diffuse * (0.72 + 0.28 * bands);
        } else {
          const rim = (Math.sqrt(d2) - 1) / 0.12;
          field[i] += 0.28 * Math.exp(-rim * rim);
        }
      }
    }

    // Faint orbit ring. Its back half hides behind the planet.
    [x0, x1, y0, y1] = box(ringR + 10, ringR + 10);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = (x + 0.5) * cw, py = (y + 0.5) * ch;
        const [ex, ey] = toLocal(px - cx, py - cy);
        if (ey < 0 && inPlanet(px, py)) continue;
        const f = (ex / ringR) ** 2 + (ey / ringB) ** 2;
        const g = 2 * Math.hypot(ex / (ringR * ringR), ey / (ringB * ringB)) || 1;
        const dist = (f - 1) / g / (ch * 0.55);
        field[y * cols + x] += 0.16 * Math.exp(-dist * dist);
      }
    }

    // Glowing bubbles orbiting on the ring, larger when closer.
    for (let b = 0; b < BUBBLES; b++) {
      const a = time * 0.55 + (b * TAU) / BUBBLES;
      const ox = Math.cos(a) * ringR, oy = Math.sin(a) * ringB;
      const bx = cx + ox * cr - oy * sr;
      const by = cy + ox * sr + oy * cr;
      const depth = Math.sin(a); // >0 in front of the planet
      const scale = 1 + depth * 0.35;
      const sigma = R * 0.15 * scale;
      const reach = sigma * 3.2;
      const bx0 = Math.max(0, Math.floor((bx - reach) / cw)), bx1 = Math.min(cols - 1, Math.ceil((bx + reach) / cw));
      const by0 = Math.max(0, Math.floor((by - reach) / ch)), by1 = Math.min(rows - 1, Math.ceil((by + reach) / ch));
      const pulse = 1 + 0.12 * Math.sin(time * 3 + b);
      for (let y = by0; y <= by1; y++) {
        for (let x = bx0; x <= bx1; x++) {
          const px = (x + 0.5) * cw, py = (y + 0.5) * ch;
          if (depth < 0 && inPlanet(px, py)) continue;
          const d2 = ((px - bx) ** 2 + (py - by) ** 2) / (sigma * sigma);
          field[y * cols + x] += pulse * (1.4 * Math.exp(-d2 * 1.2) + 0.45 * Math.exp(-d2 * 0.3)) * (0.75 + 0.25 * scale);
        }
      }
    }

    // Draw characters, batched by brightness level.
    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    ctx.textBaseline = 'top';
    const buckets = Array.from({ length: LEVELS }, () => []);
    for (let i = 0; i < field.length; i++) {
      const level = Math.min(LEVELS - 1, Math.floor(field[i] * LEVELS));
      if (level > 0) buckets[level].push(i);
    }
    for (let level = 1; level < LEVELS; level++) {
      ctx.fillStyle = colors[level];
      const c = RAMP[level];
      for (const i of buckets[level]) ctx.fillText(c, (i % cols) * cw, Math.floor(i / cols) * ch);
    }
  }

  addEventListener('pointermove', (e) => {
    mouseX = e.clientX / innerWidth * 2 - 1;
    mouseY = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  new ResizeObserver(() => { resize(); render(); }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    const wasVisible = visible;
    visible = entry.isIntersecting;
    if (visible && !wasVisible && !reduceMotion) { last = performance.now(); requestAnimationFrame(frame); }
  }).observe(canvas);

  resize();
  requestAnimationFrame(frame);
})();
