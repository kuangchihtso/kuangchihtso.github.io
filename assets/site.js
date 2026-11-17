/* Fig. 1: an array of hexagonal electrode modules, seven electrodes each (the layout of the
   multi-module retinal device). Each module's CMOS stimulator drives one of its seven electrodes
   at a time, and all modules work at once: in each time slot every module stimulates the
   electrode in the same position (the centre first, then the ring clockwise from the top), and
   only electrodes inside an eye-shaped pattern are stimulated. A stimulated electrode glows as a
   phosphene until the next slot begins, so no module ever shows two lit electrodes. Now and then
   the eye blinks. The trace is the current of one module (outlined): one charge-balanced
   biphasic pulse for each electrode it stimulates. The first frame is the finished image, eye
   open; motion stops for prefers-reduced-motion, when the figure is off-screen, and in hidden
   tabs. */
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
    mark: hex(token("--fig-trace", "#a59cf3")),
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
      const c = { u: x / span, v: y / span, kind: 0, flash: -1e9, litKind: 0 };
      m.els.push(c);
      cells.push(c);
    }
    m.u = m.x / span;
    m.v = m.y / span;
  }

  /* Eye pattern: almond outline (kind 1) and iris ring (kind 2); the pupil stays dark.
     `shut` runs from 0 (open) to 1 (closed). In a blink the upper lid comes most of the way down
     and the lower lid rises a little, both meeting halfway down the lower half of the eye; the
     corners stay where they are, and the lids cover the iris as they pass. */
  const A = 0.47, B = 0.86, W = 0.065;
  function setPattern(shut) {
    for (const c of cells) {
      const L = A * (1 - (c.u / B) ** 2);       // lid distance from the centre line when open
      const up = L * (-1 + 1.5 * shut), low = L * (1 - 0.5 * shut);
      c.kind = 0;
      if (Math.abs(c.u) <= B + 0.04) {
        const onLid = L <= 0
          ? Math.abs(Math.abs(c.v) - L) < W     // the corners
          : Math.abs(c.v - up) < W || Math.abs(c.v - low) < W;
        if (onLid) c.kind = 1;
      }
      const d = Math.hypot(c.u, c.v);
      if (!c.kind && d >= 0.19 && d <= 0.31 && c.v > up && c.v < low) c.kind = 2;
    }
  }

  /* Time slots. Electrode 0 is a module's centre; electrodes 1-6 sit at 30, 90, ..., 330 degrees,
     which on the canvas (y down) are lower right, bottom, lower left, upper left, top and upper
     right. In slot s every module stimulates its electrode ORDER[s] at once, if that electrode is
     part of the pattern at that moment. */
  const ORDER = [0, 5, 6, 1, 2, 3, 4];   // centre, then the ring clockwise from the top
  const SLOTS = ORDER.length;

  /* With the eye open: the electrodes each slot stimulates, and the module whose current the
     trace shows. That module is one of those with the most electrodes in the pattern, chosen so
     its unused electrode comes last in the cycle (each cycle's pulses then stay together on the
     trace), nearest the centre. */
  setPattern(0);
  const openSlots = ORDER.map((k) => modules.map((m) => m.els[k]).filter((c) => c.kind > 0));
  const inPattern = (m) => m.els.filter((c) => c.kind > 0).length;
  const most = Math.max(...modules.map(inPattern));
  const rep = modules
    .filter((m) => inPattern(m) === most)
    .sort((a, b) =>
      (a.els[ORDER[SLOTS - 1]].kind > 0) - (b.els[ORDER[SLOTS - 1]].kind > 0) ||
      Math.hypot(a.u, a.v) - Math.hypot(b.u, b.v))[0];
  const openRepSlot = ORDER.map((k) => rep.els[k].kind > 0);

  let dpr = 1, AW = 0, AH = 0, TW = 0, TH = 0;
  const events = [];
  const WINDOW = 2600;        // ms of trace on screen
  /* Drawing timescale only, not physiological values. Every pulse is cathodic-first and
     symmetric (same amplitude and duration in both phases), so it is charge-balanced.
     A whole pulse (2 * PHASE + GAP = 82 ms) must fit inside one INTERVAL, the length of a slot:
     if pulses overlap, the next one cuts the anodic phase short and the pulse is no longer
     balanced. */
  const PHASE = 35, GAP = 12;
  const INTERVAL = 115;       // one slot; a cycle of seven slots takes 805 ms
  const PULSE = 2 * PHASE + GAP;

  /* Blinks: the lids close in 320 ms, stay shut for 160 ms and open in 420 ms. The pauses between
     blinks come from a fixed list, so they look irregular but are the same on every visit. */
  const CLOSE = 320, SHUT = 160, OPEN = 420, BLINK = CLOSE + SHUT + OPEN;
  const PAUSES = [4200, 6100, 3400, 5200, 7000, 3900];
  const FIRST_BLINK = 2500;   // ms after the animation starts
  const ease = (x) => x * x * (3 - 2 * x);
  let blinkAt = 0, pause = 0;
  /* How shut the eye is at time t; t never goes backwards between calls. */
  function shutAt(t) {
    while (t >= blinkAt + BLINK) {
      blinkAt += BLINK + PAUSES[pause];
      pause = (pause + 1) % PAUSES.length;
    }
    const a = t - blinkAt;
    if (a < 0) return 0;
    if (a < CLOSE) return ease(a / CLOSE);
    if (a < CLOSE + SHUT) return 1;
    return 1 - ease((a - CLOSE - SHUT) / OPEN);
  }

  /* Brightness of an electrode stimulated `age` ms ago: on for the whole of its slot and off as
     the next slot begins, so a module never has two lit electrodes. No fade: every module
     switches at the same moment, and a shared fade would make the whole figure flicker. */
  function lit(age) {
    return age >= 0 && age < INTERVAL ? 1 : 0;
  }

  function drawArray(now) {
    const g = ga;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, AW, AH);
    const S = Math.min(AW, AH);
    const cx = AW / 2, cy = AH / 2;
    const rho = S * 0.48;              // px radius of the unit circle
    const unit = rho / span;           // px per lattice unit
    const er = unit * 0.16;            // electrode radius

    const outline = (m) => {
      const x = cx + m.u * rho, y = cy + m.v * rho;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const t = ((30 + 60 * k) * Math.PI) / 180;
        const px = x + HEX * unit * Math.cos(t), py = y + HEX * unit * Math.sin(t);
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };

    // module outlines; the module on the trace is outlined in the trace colour
    g.lineWidth = 1;
    g.strokeStyle = rgba(C.line, 0.9);
    for (const m of modules) { outline(m); g.stroke(); }
    outline(rep);
    g.lineWidth = 1.5;
    g.strokeStyle = C.trace;
    g.stroke();

    // electrodes at rest: pattern electrodes are marked, the others idle
    for (const c of cells) {
      g.fillStyle = c.kind ? rgba(C.mark, 0.55) : rgba(C.dot, 0.95);
      g.beginPath();
      g.arc(cx + c.u * rho, cy + c.v * rho, er, 0, Math.PI * 2);
      g.fill();
    }

    // phosphenes: only the electrodes stimulated in the current slot
    g.globalCompositeOperation = "lighter";
    for (const c of cells) {
      const f = lit(now - c.flash);
      if (f <= 0) continue;
      const x = cx + c.u * rho, y = cy + c.v * rho;
      const level = (c.litKind === 2 ? 1.2 : 1.05) * f;
      const gr = er * (3.2 + 2.2 * f);
      const grad = g.createRadialGradient(x, y, 0, x, y, gr);
      grad.addColorStop(0, rgba(C.core, level));
      grad.addColorStop(0.3, rgba(C.glow, 0.5 * level));
      grad.addColorStop(1, rgba(C.glow, 0));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, gr, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = rgba(C.core, f);
      g.beginPath();
      g.arc(x, y, er * 0.95, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = "source-over";
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
    /* Pulses are laid out in whole pixels, both phases the same width, so every drawn pulse
       stays symmetric wherever it falls on the pixel grid. */
    const pxPerMs = TW / WINDOW;
    const pw = Math.max(1, Math.round(PHASE * pxPerMs));
    const gw = Math.max(1, Math.round(GAP * pxPerMs));
    const n = Math.floor(TW) + 1;
    const lv = new Int8Array(n);   // +1 cathodic (drawn downward), -1 anodic, 0 at rest
    const t0 = now - WINDOW;
    for (const e of events) {
      const x0 = Math.round((e - t0) * pxPerMs);
      for (let i = 0; i < pw; i++) {
        const a = x0 + i, b = x0 + pw + gw + i;
        if (a >= 0 && a < n) lv[a] = 1;
        if (b >= 0 && b < n) lv[b] = -1;
      }
    }
    const mid = TH / 2, amp = TH * 0.3;
    g.beginPath();
    let prev = null;
    for (let px = 0; px < n; px++) {
      const y = mid + lv[px] * amp;
      if (prev === null) g.moveTo(px, y);
      else if (lv[px] !== prev) { g.lineTo(px, mid + prev * amp); g.lineTo(px, y); }
      else g.lineTo(px, y);
      prev = lv[px];
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

  /* Lay out the cycle as if it had been running with the eye open: slot s starts at time t, and
     the slots before it are filled in backwards, the one just before still glowing. */
  function seed(t, s) {
    events.length = 0;
    for (let j = Math.ceil((WINDOW + 400) / INTERVAL); j >= 1; j--) {
      if (openRepSlot[(((s - j) % SLOTS) + SLOTS) % SLOTS]) events.push(t - j * INTERVAL);
    }
    for (const c of cells) c.flash = -1e9;
    for (const c of openSlots[(s - 1 + SLOTS) % SLOTS]) { c.flash = t - INTERVAL; c.litKind = c.kind; }
  }

  /* The still frame shows the open eye and the slot that lights the most electrodes on the traced
     module's turn, its pulse just finished. */
  const STILL = openSlots.reduce((b, cs, s) => (openRepSlot[s] && cs.length > openSlots[b].length ? s : b), openRepSlot.indexOf(true));

  function drawStill() {
    const now = 100000;
    setPattern(0);
    seed(now - PULSE - 3 + INTERVAL, (STILL + 1) % SLOTS);
    drawArray(now);
    drawTrace(now);
  }

  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  let running = false, raf = 0, nextAt = 0, slot = 0, onScreen = true;

  function tick(now) {
    if (!running) return;
    if (!nextAt || now - nextAt > 2000) {
      // (re)start: carry on the cycle as if it had been running, eye open, so the trace stays
      // populated; the next blink comes a little later
      nextAt = now + INTERVAL;
      slot = 0;
      blinkAt = now + FIRST_BLINK;
      pause = 0;
      setPattern(0);
      seed(nextAt, slot);
    }
    while (now >= nextAt) {
      setPattern(shutAt(nextAt));
      for (const m of modules) {
        const c = m.els[ORDER[slot]];
        if (c.kind) { c.flash = nextAt; c.litKind = c.kind; }
      }
      if (rep.els[ORDER[slot]].kind) events.push(nextAt);
      slot = (slot + 1) % SLOTS;
      nextAt += INTERVAL;
    }
    while (events.length && events[0] < now - WINDOW - 400) events.shift();
    setPattern(shutAt(now));
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
