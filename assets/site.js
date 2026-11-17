/* Fig. 1: an array of hexagonal electrode modules, seven electrodes each (the layout of the
   multi-module retinal device). Electrodes inside an eye-shaped pattern glow as phosphenes; a scan
   drives one module at a time, and each drive appears as a charge-balanced biphasic pulse on the
   trace. The first frame is the finished image; motion stops for prefers-reduced-motion, when the
   figure is off-screen, and in hidden tabs. */
(() => {
  "use strict";

  /* Email: written as "name [at] domain" in the HTML, assembled here. Links marked
     data-mail-keep (the Email button) keep their label and only get the mailto: address. */
  document.querySelectorAll("[data-mail-user]").forEach((el) => {
    const addr = `${el.dataset.mailUser}@${el.dataset.mailDomain}`;
    if (el.tagName === "A") el.href = `mailto:${addr}`;
    if (!el.hasAttribute("data-mail-keep")) el.textContent = addr;
  });

  const fig = document.querySelector("[data-fig1]");
  if (!fig) return;
  const arrayCanvas = fig.querySelector(".fig-array");
  const traceCanvas = fig.querySelector(".fig-trace");
  if (!arrayCanvas || !traceCanvas || !arrayCanvas.getContext) return;
  const ga = arrayCanvas.getContext("2d");
  const gt = traceCanvas.getContext("2d");

  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const hex = (h) => {
    const s = h.replace("#", "");
    const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const C = {
    dot: hex(token("--fig-dot", "#5a5281")),
    line: hex(token("--fig-line", "#3f3557")),
    glow: hex(token("--fig-glow", "#ffb45e")),
    core: hex(token("--fig-core", "#fff2de")),
    trace: token("--fig-trace", "#a59cf3"),
    grid: hex(token("--fig-grid", "#3b2427")),
  };
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a))})`;

  /* Modules on a pointy-top hexagonal lattice (neighbour distance √3), each with a centre
     electrode and six around it. Coordinates are normalised to a unit circle. */
  const M = 6;          // lattice radius in modules
  const RING = 0.52;    // electrode ring radius inside a module
  const HEX = 0.93;     // module outline circumradius
  const modules = [];
  for (let q = -M; q <= M; q++) {
    for (let r = Math.max(-M, -q - M); r <= Math.min(M, -q + M); r++) {
      modules.push({ x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r, els: [] });
    }
  }
  const span = Math.max(...modules.map((m) => Math.hypot(m.x, m.y))) + HEX;
  const cells = [];
  for (const m of modules) {
    const pts = [[m.x, m.y]];
    for (let k = 0; k < 6; k++) {
      const t = ((30 + 60 * k) * Math.PI) / 180;
      pts.push([m.x + RING * Math.cos(t), m.y + RING * Math.sin(t)]);
    }
    for (const [x, y] of pts) {
      const c = { u: x / span, v: y / span, kind: 0, flash: -1e9 };
      m.els.push(c);
      cells.push(c);
    }
    m.u = m.x / span;
    m.v = m.y / span;
  }

  /* Eye pattern: almond outline (kind 1) and iris ring (kind 2); the pupil stays dark. */
  const A = 0.47, B = 0.86, W = 0.065;
  for (const c of cells) {
    if (Math.abs(c.u) <= B + 0.04) {
      const lid = A * (1 - (c.u / B) ** 2);
      if (Math.abs(Math.abs(c.v) - lid) < W) c.kind = 1;
    }
    const d = Math.hypot(c.u, c.v);
    if (d >= 0.19 && d <= 0.31) c.kind = 2;
  }
  const active = cells.filter((c) => c.kind > 0);
  const groups = modules
    .filter((m) => m.els.some((c) => c.kind > 0))
    .sort((a, b) => (a.v - b.v) || (a.u - b.u))
    .map((m) => m.els.filter((c) => c.kind > 0));

  let dpr = 1, AW = 0, AH = 0, TW = 0, TH = 0;
  const events = [];
  const WINDOW = 2600;        // ms of trace on screen
  /* Drawing timescale only, not physiological values. Every pulse is cathodic-first and
     symmetric (same amplitude and duration in both phases), so it is charge-balanced.
     A whole pulse (2 * PHASE + GAP = 82 ms) must fit inside one INTERVAL: if pulses overlap,
     the next one cuts the anodic phase short and the drawn pulse is no longer balanced. */
  const PHASE = 35, GAP = 12;
  const INTERVAL = 115, HOLD = 1700;

  function drawArray(now) {
    const g = ga;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, AW, AH);
    const S = Math.min(AW, AH);
    const cx = AW / 2, cy = AH / 2;
    const rho = S * 0.48;              // px radius of the unit circle
    const unit = rho / span;           // px per lattice unit
    const er = unit * 0.16;            // electrode radius

    // module outlines
    g.lineWidth = 1;
    g.strokeStyle = rgba(C.line, 0.9);
    for (const m of modules) {
      const x = cx + m.u * rho, y = cy + m.v * rho;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const t = ((30 + 60 * k) * Math.PI) / 180;
        const px = x + HEX * unit * Math.cos(t), py = y + HEX * unit * Math.sin(t);
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.stroke();
    }

    // idle electrodes
    g.fillStyle = rgba(C.dot, 0.95);
    for (const c of cells) {
      if (c.kind) continue;
      g.beginPath();
      g.arc(cx + c.u * rho, cy + c.v * rho, er, 0, Math.PI * 2);
      g.fill();
    }

    // phosphenes
    g.globalCompositeOperation = "lighter";
    for (const c of active) {
      const x = cx + c.u * rho, y = cy + c.v * rho;
      const age = now - c.flash;
      const f = age >= 0 && age < 520 ? 1 - age / 520 : 0;
      const level = (c.kind === 2 ? 0.82 : 0.68) + 0.4 * f;
      const gr = er * (3.2 + 2.2 * f);
      const grad = g.createRadialGradient(x, y, 0, x, y, gr);
      grad.addColorStop(0, rgba(C.core, level));
      grad.addColorStop(0.3, rgba(C.glow, 0.5 * level));
      grad.addColorStop(1, rgba(C.glow, 0));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, gr, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = rgba(C.core, Math.min(1, 0.85 + 0.15 * f));
      g.beginPath();
      g.arc(x, y, er * 0.95, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }

  function level(t) {
    let k = events.length - 1;
    while (k >= 0 && events[k] > t) k--;
    if (k < 0) return 0;
    const dt = t - events[k];
    if (dt < PHASE) return 1;              // cathodic phase (drawn downward)
    if (dt < PHASE + GAP) return 0;        // interphase gap
    if (dt < 2 * PHASE + GAP) return -1;   // anodic, charge-balancing phase
    return 0;
  }

  function drawTrace(now) {
    const g = gt;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, TW, TH);
    g.strokeStyle = rgba(C.grid, 1);
    g.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const x = Math.round((i * TW) / 10) + 0.5;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, TH); g.stroke();
    }
    for (let j = 1; j < 4; j++) {
      const y = Math.round((j * TH) / 4) + 0.5;
      g.beginPath(); g.moveTo(0, y); g.lineTo(TW, y); g.stroke();
    }
    const mid = TH / 2, amp = TH * 0.3;
    const t0 = now - WINDOW;
    g.beginPath();
    let prev = null;
    for (let px = 0; px <= TW; px += 1) {
      const lv = level(t0 + (px / TW) * WINDOW);
      const y = mid + lv * amp;
      if (prev === null) g.moveTo(px, y);
      else if (lv !== prev) { g.lineTo(px, mid + prev * amp); g.lineTo(px, y); }
      else g.lineTo(px, y);
      prev = lv;
    }
    g.strokeStyle = C.trace;
    g.lineWidth = 1.5;
    g.stroke();
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const a = arrayCanvas.getBoundingClientRect();
    const t = traceCanvas.getBoundingClientRect();
    AW = a.width; AH = a.height; TW = t.width; TH = t.height;
    arrayCanvas.width = Math.max(1, Math.round(AW * dpr));
    arrayCanvas.height = Math.max(1, Math.round(AH * dpr));
    traceCanvas.width = Math.max(1, Math.round(TW * dpr));
    traceCanvas.height = Math.max(1, Math.round(TH * dpr));
  }

  function seedTrace(now) {
    events.length = 0;
    for (let t = now - WINDOW + 220; t < now; t += 420) events.push(t);
  }

  function drawStill() {
    const now = 100000;
    for (const c of active) c.flash = -1e9;
    seedTrace(now);
    drawArray(now);
    drawTrace(now);
  }

  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  let running = false, raf = 0, nextAt = 0, idx = 0, onScreen = true;

  function tick(now) {
    if (!running) return;
    if (!nextAt || now - nextAt > 2000) {
      // (re)start: keep the trace populated like the resting frame, then begin the scan
      nextAt = now + 400;
      idx = 0;
      seedTrace(now);
    }
    while (now >= nextAt) {
      if (idx < groups.length) {
        for (const c of groups[idx]) c.flash = nextAt;
        events.push(nextAt);
        idx++;
        nextAt += INTERVAL;
      } else {
        idx = 0;
        nextAt += HOLD;
      }
    }
    while (events.length && events[0] < now - WINDOW - 400) events.shift();
    drawArray(now);
    drawTrace(now);
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running || reduce.matches || !onScreen || document.hidden) return;
    running = true;
    nextAt = 0;
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  size();
  drawStill();

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => { size(); if (!running) drawStill(); }).observe(fig);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start(); else stop();
    }).observe(fig);
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else start(); });
  if (reduce.addEventListener) {
    reduce.addEventListener("change", () => { if (reduce.matches) { stop(); drawStill(); } else start(); });
  }
  start();
})();
