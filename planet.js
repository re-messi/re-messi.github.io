// Shared behaviour for planet pages: a calm ASCII surface in the hero and
// the "on this page" highlight. Each planet picks its surface with data-theme.
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;

  const THEMES = {
    // SkinAI: a soft dream planet. Slow clouds, rising bubbles, gentle hills.
    dream: {
      ramp: ' .·:~*o',
      color: [196, 118, 156],
      setup(w, h) {
        const clouds = Array.from({ length: 6 }, (_, i) => ({
          x: Math.random() * w, y: h * (0.12 + 0.12 * (i % 3)) + Math.random() * h * 0.06,
          rx: w * (0.08 + Math.random() * 0.08), ry: h * (0.025 + Math.random() * 0.02), sp: 6 + Math.random() * 8,
        }));
        const bubbles = Array.from({ length: 9 }, () => ({
          x: Math.random(), r: 8 + Math.random() * 18, sp: 0.012 + Math.random() * 0.018, p: Math.random(),
        }));
        return { clouds, bubbles };
      },
      sample(px, py, t, w, h, s) {
        let v = 0;
        // Three layers of pink sand dunes with wind ripples. Each dune has a
        // soft rounded side and a sharper crest, like real dunes.
        const dune = (base, amp, freq, phase) => {
          const u = px / w * freq + phase;
          const wave = Math.abs(Math.sin(u * Math.PI)) ** 0.8;
          return h * base - wave * h * amp - Math.sin(u * 2.3) * h * amp * 0.25;
        };
        const layers = [[0.78, 0.07, 1.6, 0.3, 0.3], [0.85, 0.06, 1.2, 1.1, 0.45], [0.93, 0.05, 0.9, 0.6, 0.62]];
        for (const [base, amp, freq, phase, tone] of layers) {
          const top = dune(base, amp, freq, phase);
          if (py > top) {
            const depth = (py - top) / (h * 0.08);
            const ripple = 0.5 + 0.5 * Math.sin((py - top) * 0.28 + px * 0.012 + Math.sin(px * 0.004) * 3);
            v = tone + 0.12 * ripple - 0.06 * Math.min(1, depth) + (py - top < 5 ? 0.12 : 0);
          }
        }
        // Drifting clouds.
        for (const c of s.clouds) {
          const cx = ((c.x + t * c.sp) % (w + c.rx * 2)) - c.rx;
          const q = ((px - cx) / c.rx) ** 2 + ((py - c.y) / c.ry) ** 2;
          if (q < 1) v = Math.max(v, 0.18 + 0.32 * (1 - q));
        }
        // Bubbles floating up, drawn as soft rings with a highlight.
        for (const b of s.bubbles) {
          const by = h * (1.05 - ((b.p + t * b.sp) % 1) * 1.15);
          const bx = b.x * w + Math.sin(t * 0.5 + b.p * 9) * 14;
          const d = Math.hypot(px - bx, py - by);
          if (Math.abs(d - b.r) < 3.2) v = Math.max(v, 0.62);
          if (Math.hypot(px - bx + b.r * 0.4, py - by + b.r * 0.4) < b.r * 0.22) v = Math.max(v, 0.85);
        }
        return v;
      },
    },

    // Smart Travel Planner: a calm map planet. Topographic hills, drifting
    // clouds, and a plane flying a dotted route between two pins.
    map: {
      ramp: ' .·:-~=',
      color: [84, 122, 168],
      boost: 1.5,
      setup(w, h) {
        const clouds = Array.from({ length: 5 }, (_, i) => ({
          x: Math.random() * w, y: h * (0.1 + 0.1 * (i % 3)) + Math.random() * h * 0.05,
          rx: w * (0.07 + Math.random() * 0.07), ry: h * (0.022 + Math.random() * 0.015), sp: 5 + Math.random() * 6,
        }));
        const narrow = w < 760;
        const p0 = [w * (narrow ? 0.1 : 0.06), h * 0.8], p1 = [w * 0.5, h * (narrow ? 0.42 : 0.18)], p2 = [w * (narrow ? 0.9 : 0.94), h * 0.74];
        const path = Array.from({ length: 140 }, (_, i) => {
          const u = i / 139, a = (1 - u) ** 2, b = 2 * u * (1 - u), c = u * u;
          return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]];
        });
        return { clouds, path };
      },
      sample(px, py, t, w, h, s) {
        let v = 0;
        // Hills with topographic contour lines.
        const top = h * 0.76 + Math.sin(px / w * TAU * 0.9 + 1.3) * h * 0.04 + Math.sin(px / w * TAU * 2.4) * h * 0.012;
        if (py > top) {
          const e = (py - top) / h * 9 + Math.sin(px * 0.011 + py * 0.004) * 0.9 + Math.sin(px * 0.004 - py * 0.013) * 0.7;
          const contour = Math.abs(e - Math.round(e));
          v = contour < 0.09 ? 0.62 : 0.1;
          if (py - top < 4) v = 0.6;
        }
        for (const c of s.clouds) {
          const cx = ((c.x + t * c.sp) % (w + c.rx * 2)) - c.rx;
          const q = ((px - cx) / c.rx) ** 2 + ((py - c.y) / c.ry) ** 2;
          if (q < 1) v = Math.max(v, 0.18 + 0.3 * (1 - q));
        }
        return v;
      },
      // Drawn on top: the dotted route, two pins, and the plane.
      overlay(t, w, h, s) {
        const marks = [];
        const n = s.path.length, u = (t * 0.035) % 1, at = Math.floor(u * (n - 1));
        for (let i = 0; i < n; i += 3) marks.push([...s.path[i], '·', i <= at ? 0.9 : 0.4]);
        marks.push([...s.path[0], '◉', 1], [...s.path[n - 1], '◉', 1]);
        marks.push([...s.path[at], '✈', 1]);
        return marks;
      },
    },

    // Melville Clothing: a sunset planet. A striped sun sinking behind a
    // street of little buildings with lit windows, one of them the store.
    boutique: {
      ramp: ' .·:=▪',
      color: [61, 128, 184],
      boost: 1.15,
      setup(w, h) {
        const street = h * 0.9;
        const buildings = [];
        let x = -10, i = 0;
        const storeAt = w < 760 ? 0.08 : 0.16;
        while (x < w + 20) {
          const store = !buildings.some((b) => b.store) && x > w * storeAt - 60;
          const bw = store ? Math.max(130, w * 0.13) : 50 + ((i * 37) % 60);
          const bh = store ? h * 0.12 : h * (0.04 + ((i * 53) % 100) / 100 * 0.08);
          buildings.push({ x, w: bw, top: street - bh, store, seed: i * 7.3 });
          x += bw + 6 + ((i * 29) % 18);
          i++;
        }
        const stars = Array.from({ length: 0 }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.45, p: Math.random() * 9 }));
        const clouds = Array.from({ length: 4 }, (_, k) => ({
          x: Math.random() * w, y: h * (0.18 + 0.1 * k), rx: w * (0.09 + Math.random() * 0.08), ry: h * 0.012, sp: 4 + Math.random() * 5,
        }));
        const sun = { x: w * (w < 760 ? 0.6 : 0.5), y: street - h * 0.02, r: Math.min(w, h) * (w < 760 ? 0.22 : 0.2) };
        return { street, buildings, stars, clouds, sun };
      },
      sample(px, py, t, w, h, s) {
        let v = 0;
        // Twinkling stars up high, where it is still night.
        for (const st of s.stars) {
          if (Math.abs(px - st.x) < 4 && Math.abs(py - st.y) < 7) v = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + st.p));
        }
        // Thin drifting clouds.
        for (const c of s.clouds) {
          const cx = ((c.x + t * c.sp) % (w + c.rx * 2)) - c.rx;
          const q = ((px - cx) / c.rx) ** 2 + ((py - c.y) / c.ry) ** 2;
          if (q < 1) v = Math.max(v, 0.22 + 0.2 * (1 - q));
        }
        // Sun with retro gaps that thicken toward the horizon.
        const { sun } = s;
        const d = Math.hypot(px - sun.x, py - sun.y) / sun.r;
        if (d < 1) {
          const k = (py - (sun.y - sun.r)) / (sun.r * 2);
          const band = ((py - sun.y + sun.r) / (sun.r * 0.16) + t * 0.15) % 1;
          if (!(k > 0.45 && band < (k - 0.45) * 1.1)) v = 0.5 + 0.2 * (1 - d);
        } else if (d < 1.3) v = Math.max(v, 0.22 * (1.3 - d) / 0.3);
        // Street of buildings.
        if (py > s.street) {
          return (Math.floor(px / 22) + Math.floor(t * 0.5)) % 3 === 0 && py - s.street < 16 ? 0.5 : 0.3;
        }
        for (const b of s.buildings) {
          if (px < b.x || px > b.x + b.w || py < b.top) continue;
          if (px - b.x < 3 || b.x + b.w - px < 3 || py - b.top < 4) return 0.7;
          if (b.store) {
            const ground = s.street - (s.street - b.top) * 0.55;
            if (py > ground - 12 && py < ground + 4) return Math.floor((px - b.x) / 9) % 2 ? 0.85 : 0.5;
            if (py > ground + 4) return px - b.x > b.w * 0.15 && px - b.x < b.w * 0.85 ? 0.88 : 0.55;
          }
          const wx = Math.floor((px - b.x - 6) / 12), wy = Math.floor((py - b.top - 8) / 15);
          const inWin = (px - b.x - 6) % 12 < 6 && (py - b.top - 8) % 15 < 8 && px - b.x > 6 && b.x + b.w - px > 6;
          if (inWin) {
            const hsh = Math.sin(b.seed * 12.9 + wx * 78.2 + wy * 37.7) * 43758.5;
            const lit = hsh - Math.floor(hsh);
            const on = lit > 0.45 && Math.sin(t * 0.2 + lit * 40) > -0.85;
            return on ? 0.9 : 0.55;
          }
          return 0.55;
        }
        return v;
      },
    },
  };

  function surface(canvas) {
    const theme = THEMES[canvas.dataset.theme];
    if (!theme) return;
    const ctx = canvas.getContext('2d');
    const RAMP = theme.ramp;
    const [cr, cg, cb] = theme.color;
    const boost = theme.boost || 1;
    const colors = Array.from({ length: RAMP.length }, (_, i) => `rgba(${cr},${cg},${cb},${Math.min(1, boost * (0.12 + 0.5 * (i / (RAMP.length - 1)))).toFixed(2)})`);
    let w = 0, h = 0, cw = 0, ch = 0, cols = 0, rows = 0, font = '', state = null;
    let time = 0, last = 0, visible = false, running = false;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const size = w < 700 ? 9 : 11;
      font = `${size}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.font = font;
      cw = ctx.measureText('M').width;
      ch = size * 1.25;
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / ch);
      state = theme.setup(w, h);
    }

    function draw() {
      if (!w) return;
      ctx.clearRect(0, 0, w, h);
      ctx.font = font;
      ctx.textBaseline = 'top';
      const buckets = Array.from({ length: RAMP.length }, () => []);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = theme.sample((c + 0.5) * cw, (r + 0.5) * ch, time, w, h, state);
          const level = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length));
          if (level > 0) buckets[level].push(r * cols + c);
        }
      }
      for (let level = 1; level < RAMP.length; level++) {
        ctx.fillStyle = colors[level];
        for (const i of buckets[level]) ctx.fillText(RAMP[level], (i % cols) * cw, Math.floor(i / cols) * ch);
      }
      if (theme.overlay) {
        for (const [x, y, c, v] of theme.overlay(time, w, h, state, cw, ch)) {
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, boost * (0.25 + 0.6 * v)).toFixed(2)})`;
          if (theme.free) ctx.fillText(c, x, y);
          else ctx.fillText(c, Math.floor(x / cw) * cw, Math.floor(y / ch) * ch);
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
  }

  document.querySelectorAll('canvas.p-surface').forEach(surface);

  // ASCII dune dividers between sections, sized to fit their width.
  document.querySelectorAll('.p-dunes').forEach((el, n) => {
    const fill = () => {
      const cols = Math.ceil(el.clientWidth / 6.6) + 2, rows = 3, chars = ' .·:~';
      let text = '';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const crest = 1.2 + Math.sin(c * 0.09 + n * 2) * 0.9 + Math.sin(c * 0.23 + n) * 0.35;
          const below = r - crest;
          text += below < -0.5 ? ' ' : chars[Math.min(4, 1 + Math.floor(below + 0.5 + ((c + r * 3) % 4 === 0 ? 1 : 0)))];
        }
        text += '\n';
      }
      el.textContent = text;
    };
    fill();
    new ResizeObserver(fill).observe(el);
  });

  // Tap a photo to see it bigger.
  const zoomers = document.querySelectorAll('[data-full]');
  if (zoomers.length) {
    const box = document.createElement('dialog');
    box.className = 'p-lightbox';
    box.setAttribute('aria-label', 'Image viewer');
    box.innerHTML = '<button type="button" aria-label="Close image viewer">×</button><img alt="" />';
    document.body.append(box);
    const big = box.querySelector('img');
    zoomers.forEach((el) => el.addEventListener('click', () => {
      big.src = el.dataset.full;
      big.alt = el.querySelector('img')?.alt || '';
      box.showModal();
    }));
    box.querySelector('button').addEventListener('click', () => box.close());
    box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  }

  // "On this page": highlight the section you're reading.
  const links = [...document.querySelectorAll('.p-nav a[href^="#"]')];
  const targets = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (targets.length) {
    const update = () => {
      const line = innerHeight * 0.35;
      let current = null;
      for (const t of targets) if (t.getBoundingClientRect().top <= line) current = t;
      links.forEach((a) => {
        if (current && a.getAttribute('href') === `#${current.id}`) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }
})();
