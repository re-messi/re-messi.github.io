// Little project planets: the project's image is wrapped sharply onto the
// face of a gently turning sphere, with an ASCII glow and optional ring.
(() => {
  const RAMP = ' .:-=+*o0@';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEX = 320;

  function makeWorld(canvas) {
    const ctx = canvas.getContext('2d');
    const link = canvas.closest('a');
    const hasRing = canvas.hasAttribute('data-ring');
    const phase = Number(canvas.dataset.offset || 0);
    const face = document.createElement('canvas');
    const fctx = face.getContext('2d');
    let tex = null, faceData = null, geo = null;
    let w = 0, h = 0, dpr = 1, cw = 0, ch = 0, cols = 0, rows = 0, font = '', R = 0, S = 0;
    let time = 0, amp = 1, targetAmp = 1, visible = false, last = 0, running = false;

    // Cover-fit the (optionally cropped) image into a square texture.
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = TEX;
      const t = c.getContext('2d');
      const [fx, fy, fw, fh] = (canvas.dataset.crop || '0 0 1 1').split(' ').map(Number);
      let sx = fx * img.width, sy = fy * img.height, sw = fw * img.width, sh = fh * img.height;
      if (sw > sh) { sx += (sw - sh) / 2; sw = sh; } else { sy += (sh - sw) / 2; sh = sw; }
      t.drawImage(img, sx, sy, sw, sh, 0, 0, TEX, TEX);
      tex = t.getImageData(0, 0, TEX, TEX).data;
      draw();
    };
    img.src = canvas.dataset.src;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const size = w < 180 ? 6 : 7;
      font = `${size}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.font = font;
      cw = ctx.measureText('M').width;
      ch = size * 1.15;
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / ch);

      // Sphere geometry for every pixel of the face, computed once.
      R = Math.min(w, h) * (hasRing ? 0.3 : 0.36);
      S = Math.max(2, Math.round(R * 2 * dpr));
      face.width = face.height = S;
      faceData = fctx.createImageData(S, S);
      geo = new Float32Array(S * S * 4); // lon, v, shade, alpha
      const lx = -0.5, ly = -0.45, lz = 0.74;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const nx = (x + 0.5) / S * 2 - 1, ny = (y + 0.5) / S * 2 - 1;
          const d2 = nx * nx + ny * ny, k = (y * S + x) * 4;
          if (d2 >= 1) { geo[k + 3] = 0; continue; }
          const nz = Math.sqrt(1 - d2);
          const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
          geo[k] = Math.atan2(nx, nz);
          geo[k + 1] = Math.asin(ny) / Math.PI + 0.5;
          geo[k + 2] = 0.45 + 0.75 * diffuse;
          geo[k + 3] = Math.min(1, (1 - Math.sqrt(d2)) * S * 0.5); // soft edge
        }
      }
    }

    function draw() {
      if (!w || !geo) return;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const sway = Math.sin(time * 0.6 + phase) * 0.32 * amp;

      // Sharp image face. The front hemisphere shows the whole image.
      if (tex) {
        const out = faceData.data;
        for (let i = 0, k = 0; i < out.length; i += 4, k += 4) {
          const a = geo[k + 3];
          if (!a) { out[i + 3] = 0; continue; }
          let u = (geo[k] + sway) / Math.PI + 0.5;
          if (u < 0 || u > 1) u = u < 0 ? -u : 2 - u; // mirror past the edges
          const tx = Math.min(TEX - 1, Math.floor(u * TEX));
          const ty = Math.min(TEX - 1, Math.floor(geo[k + 1] * TEX));
          const t = (ty * TEX + tx) * 4, s = geo[k + 2];
          out[i] = Math.min(255, tex[t] * s + 18);
          out[i + 1] = Math.min(255, tex[t + 1] * s + 22);
          out[i + 2] = Math.min(255, tex[t + 2] * s + 40);
          out[i + 3] = a * 255;
        }
        fctx.putImageData(faceData, 0, 0);
        ctx.drawImage(face, cx - R, cy - R, R * 2, R * 2);
      }

      // ASCII glow around the planet and the ring.
      ctx.font = font;
      ctx.textBaseline = 'top';
      const ringR = R * 1.6, ringB = ringR * 0.28, roll = -0.3;
      const cr = Math.cos(roll), sr = Math.sin(roll);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = (x + 0.5) * cw, py = (y + 0.5) * ch;
          const d = Math.hypot(px - cx, py - cy) / R;
          let v = 0;
          if (d >= 1) {
            const rim = (d - 1) / 0.16;
            v = 0.42 * Math.exp(-rim * rim);
          }
          if (hasRing) {
            const ex = (px - cx) * cr + (py - cy) * sr, ey = -(px - cx) * sr + (py - cy) * cr;
            if (!(ey < 0 && d < 1)) {
              const f = (ex / ringR) ** 2 + (ey / ringB) ** 2;
              const g = 2 * Math.hypot(ex / (ringR * ringR), ey / (ringB * ringB)) || 1;
              const dist = (f - 1) / g / (ch * 0.5);
              v += 0.55 * Math.exp(-dist * dist);
            }
          }
          const level = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length));
          if (level < 1) continue;
          const a = 0.35 + 0.65 * (level / (RAMP.length - 1));
          ctx.fillStyle = `rgba(185,205,255,${a.toFixed(2)})`;
          ctx.fillText(RAMP[level], x * cw, y * ch);
        }
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      amp += (targetAmp - amp) * 0.06;
      time += dt * (0.6 + 0.4 * amp);
      draw();
      if (visible) requestAnimationFrame(frame); else running = false;
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }

    const excite = () => { targetAmp = 2.2; };
    const calm = () => { targetAmp = 1; };
    link?.addEventListener('pointerenter', excite);
    link?.addEventListener('pointerleave', calm);
    link?.addEventListener('focus', excite);
    link?.addEventListener('blur', calm);

    new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }).observe(canvas);
  }

  document.querySelectorAll('canvas.ascii-world').forEach(makeWorld);
})();
