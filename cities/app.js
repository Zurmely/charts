/* Cost of living vs. quality of life — quadrant scatter. Vanilla JS + SVG. */

const SVG_NS = "http://www.w3.org/2000/svg";

const CONTINENTS = [
  { name: "Europe",        color: "#2f5d8f" },
  { name: "Asia",          color: "#7b52ab" },
  { name: "Africa",        color: "#e08a3c" },
  { name: "North America", color: "#b23b3b" },
  { name: "South America", color: "#2e8b6f" },
  { name: "Oceania",       color: "#d4a72c" },
  { name: "Antarctica",    color: "#8fa3b3" },
];

const COLOR = Object.fromEntries(CONTINENTS.map(c => [c.name, c.color]));

const QUADRANTS = [
  { key: "best",    title: "BEST VALUE",    sub: "High quality, low cost",       color: "var(--q-best)",    fill: "#7fa86b", x: "left",  y: "top" },
  { key: "premium", title: "PREMIUM LIFE",  sub: "Expensive, but worth it",      color: "var(--q-premium)", fill: "#6d92c4", x: "right", y: "top" },
  { key: "budget",  title: "BUDGET LIVING", sub: "Cheap, but not as comfortable", color: "var(--q-budget)",  fill: "#c2a25e", x: "left",  y: "bottom" },
  { key: "bad",     title: "BAD VALUE",     sub: "High cost, low quality",       color: "var(--q-bad)",     fill: "#c4756d", x: "right", y: "bottom" },
];

const state = {
  hidden: new Set(),
  labels: "auto",
  selected: null,
  hovered: null,
};

const svg = document.getElementById("svg");
const chartEl = document.getElementById("chart");
const tooltipEl = document.getElementById("tooltip");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");
const suggestionsEl = document.getElementById("suggestions");

const idOf = c => `${c.city}|${c.country}`;
const quadrantOf = c => (c.y >= 50 ? (c.x >= 50 ? "premium" : "best") : (c.x >= 50 ? "bad" : "budget"));
const visibleCities = () => CITY_DATA.filter(c => !state.hidden.has(c.continent));

const el = (tag, attrs = {}, text) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
};

/* ---------------- chart ---------------- */

function render() {
  const width = chartEl.clientWidth;
  const height = chartEl.clientHeight;
  if (!width || !height) return;

  const compact = width < 640;
  const m = { top: 18, right: compact ? 12 : 18, bottom: compact ? 54 : 62, left: compact ? 44 : 54 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const pad = 5; // keeps dots at 0 and 100 off the frame edge
  const x = v => m.left + ((v + pad) / (100 + 2 * pad)) * plotW;
  const y = v => m.top + plotH - ((v + pad) / (100 + 2 * pad)) * plotH;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.replaceChildren();

  const cities = visibleCities();
  emptyEl.hidden = cities.length > 0;

  const midX = x(50);
  const midY = y(50);
  const x0 = m.left;
  const x1 = m.left + plotW;
  const y0 = m.top;
  const y1 = m.top + plotH;

  // quadrant washes
  const boxes = {
    best:    [x0, y0, midX - x0, midY - y0],
    premium: [midX, y0, x1 - midX, midY - y0],
    budget:  [x0, midY, midX - x0, y1 - midY],
    bad:     [midX, midY, x1 - midX, y1 - midY],
  };
  for (const q of QUADRANTS) {
    const [bx, by, bw, bh] = boxes[q.key];
    svg.append(el("rect", { x: bx, y: by, width: bw, height: bh, fill: q.fill, "fill-opacity": .16 }));
  }

  // grid + ticks
  for (let v = 0; v <= 100; v += 20) {
    svg.append(el("line", { class: "grid", x1: x(v), x2: x(v), y1: y0, y2: y1 }));
    svg.append(el("line", { class: "grid", x1: x0, x2: x1, y1: y(v), y2: y(v) }));
    svg.append(el("text", { class: "tick", x: x(v), y: y1 + 18, "text-anchor": "middle" }, v));
    svg.append(el("text", { class: "tick", x: x0 - 10, y: y(v) + 4, "text-anchor": "end" }, v));
  }

  svg.append(el("rect", { x: x0, y: y0, width: plotW, height: plotH, fill: "none", stroke: "rgba(27,39,51,.18)" }));
  svg.append(el("line", { class: "mid", x1: midX, x2: midX, y1: y0, y2: y1 }));
  svg.append(el("line", { class: "mid", x1: x0, x2: x1, y1: midY, y2: midY }));

  // quadrant captions; their boxes are kept clear of city labels later
  const captionBoxes = [];
  for (const q of QUADRANTS) {
    const [bx, by, bw, bh] = boxes[q.key];
    const left = q.x === "left";
    const top = q.y === "top";
    const tx = left ? bx + 12 : bx + bw - 12;
    const ty = top ? by + 24 : by + bh - 12;
    const anchor = left ? "start" : "end";
    const titleY = top ? ty : ty;
    const subY = top ? ty + 16 : ty - 18;
    if (!compact) {
      svg.append(el("text", { class: "quad-title", x: tx, y: titleY, "text-anchor": anchor, fill: q.fill }, q.title));
      svg.append(el("text", { class: "quad-sub", x: tx, y: subY, "text-anchor": anchor, fill: q.fill }, q.sub));
    } else {
      svg.append(el("text", { class: "quad-sub", x: tx, y: titleY, "text-anchor": anchor, fill: q.fill }, q.title));
    }
    const capW = Math.max(q.title.length * 9, compact ? 0 : q.sub.length * 6.4) + 10;
    const capH = compact ? 22 : 42;
    captionBoxes.push({
      x: left ? bx + 6 : bx + bw - 6 - capW,
      y: top ? by + 6 : by + bh - 6 - capH,
      w: capW,
      h: capH,
    });
  }

  // axis titles
  svg.append(el("text", { class: "axis-title", x: m.left + plotW / 2, y: height - 14, "text-anchor": "middle" },
    "Cost of living, percentile  ·  more expensive →"));
  const yTitle = el("text", { class: "axis-title", "text-anchor": "middle",
    transform: `translate(${14},${m.top + plotH / 2}) rotate(-90)` }, "Quality of life, percentile  ·  better →");
  svg.append(yTitle);

  // dots
  const r = compact ? 4 : 5.5;
  const focus = state.selected;
  const dotsLayer = el("g");
  const labelsLayer = el("g");
  svg.append(dotsLayer, labelsLayer);

  const placed = [];
  for (const c of cities) {
    const cx = x(c.x);
    const cy = y(c.y);
    const isFocus = focus && idOf(focus) === idOf(c);
    const dot = el("circle", {
      class: `dot${focus && !isFocus ? " dim" : ""}${isFocus ? " hit" : ""}`,
      cx, cy, r: isFocus ? r + 2.5 : r,
      fill: COLOR[c.continent] || "#888",
    });
    const baseR = isFocus ? r + 2.5 : r;
    dot.addEventListener("mouseenter", () => setHover(c, dot, baseR, isFocus));
    dot.addEventListener("mouseleave", () => setHover(null, dot, baseR, isFocus));
    dot.addEventListener("click", e => { e.stopPropagation(); select(state.selected && idOf(state.selected) === idOf(c) ? null : c); });
    dotsLayer.append(dot);
    placed.push({ c, cx, cy });
  }

  drawLabels(labelsLayer, placed, { x0, x1, y0, y1, r, focus, compact, captionBoxes });
}

function drawLabels(layer, points, { x0, x1, y0, y1, r, focus, compact, captionBoxes }) {
  if (state.labels === "none" && !focus) return;

  const taken = [...captionBoxes];
  const fits = box =>
    box.x >= x0 + 2 && box.x + box.w <= x1 - 2 && box.y >= y0 && box.y + box.h <= y1 &&
    !taken.some(t => !(box.x + box.w < t.x || t.x + t.w < box.x || box.y + box.h < t.y || t.y + t.h < box.y));

  // Points furthest from the middle of the chart get first claim on label space.
  const order = [...points].sort((a, b) => priority(b.c) - priority(a.c));
  const wanted = state.labels === "none" ? [] : order;
  const budget = state.labels === "all" ? Infinity : compact ? 45 : 120;

  const queue = [];
  if (focus) {
    const hit = points.find(p => idOf(p.c) === idOf(focus));
    if (hit) queue.push(hit);
  }
  for (const p of wanted) if (!focus || idOf(p.c) !== idOf(focus)) queue.push(p);

  let count = 0;
  for (const p of queue) {
    const isFocus = focus && idOf(p.c) === idOf(focus);
    if (!isFocus && count >= budget) break;
    const text = p.c.city;
    const w = text.length * 6.1 + 4;
    const h = 13;
    const gap = r + 5;
    const candidates = [
      { x: p.cx + gap, y: p.cy - h / 2, anchor: "start" },
      { x: p.cx - gap - w, y: p.cy - h / 2, anchor: "end" },
      { x: p.cx - w / 2, y: p.cy - gap - h, anchor: "middle" },
      { x: p.cx - w / 2, y: p.cy + gap, anchor: "middle" },
    ];
    const spot = candidates.find(cand => fits({ ...cand, w, h }));
    if (!spot && !isFocus) continue;
    const box = spot || candidates[0];
    taken.push({ x: box.x, y: box.y, w, h });
    const tx = box.anchor === "start" ? box.x : box.anchor === "end" ? box.x + w : box.x + w / 2;
    const node = el("text", {
      class: `label${focus && !isFocus ? " dim" : ""}`,
      x: tx, y: box.y + h - 3, "text-anchor": box.anchor,
      fill: isFocus ? "#1b2733" : "#2c3a48",
    }, text);
    layer.append(node);
    if (!isFocus) count++;
  }
}

function priority(c) {
  return Math.hypot(c.x - 50, c.y - 50) + Math.abs(c.value) * 0.35;
}

/* ---------------- interaction ---------------- */

function setHover(c, dot, baseRadius, isFocus) {
  state.hovered = c;
  dot.setAttribute("r", c ? baseRadius + 2 : baseRadius);
  dot.classList.toggle("hit", Boolean(c) || isFocus);
  if (c) {
    showTooltip(c);
  } else if (state.selected) {
    showTooltip(state.selected);
  } else {
    hideTooltip();
  }
}

function select(c) {
  state.selected = c;
  state.hovered = null;
  render();
  if (c) showTooltip(c); else hideTooltip();
}

function showTooltip(c) {
  const q = QUADRANTS.find(q => q.key === quadrantOf(c));
  const place = [c.region, c.country].filter(Boolean).join(", ");
  tooltipEl.innerHTML = `
    <h3><span style="width:10px;height:10px;border-radius:50%;background:${COLOR[c.continent]};display:inline-block"></span>${c.city}</h3>
    <p class="place">${place} · ${c.continent}</p>
    <dl>
      <dt>Cost of living</dt><dd>${c.x.toFixed(0)}<span style="color:var(--ink-soft);font-weight:400">th pct</span></dd>
      <dt>Quality of life</dt><dd>${c.y.toFixed(0)}<span style="color:var(--ink-soft);font-weight:400">th pct</span></dd>
      <dt>Value gap</dt><dd style="color:${c.value >= 0 ? "#2e8b6f" : "#b23b3b"}">${c.value > 0 ? "+" : ""}${c.value.toFixed(0)}</dd>
      <div class="rule"></div>
      <dt>Safety</dt><dd>${c.safety.toFixed(1)}</dd>
      <dt>Health care</dt><dd>${c.health.toFixed(1)}</dd>
      <dt>Traffic commute</dt><dd>${c.traffic.toFixed(1)}</dd>
      <dt>Pollution</dt><dd>${c.pollution.toFixed(1)}</dd>
      <dt>Climate</dt><dd>${c.climate.toFixed(1)}</dd>
      <dt>Cost of living index</dt><dd>${c.col.toFixed(1)}</dd>
      <div class="rule"></div>
      <dt>Quadrant</dt><dd style="color:${q.fill}">${q.title}</dd>
    </dl>`;
  tooltipEl.hidden = false;

  const width = chartEl.clientWidth;
  const height = chartEl.clientHeight;
  const box = tooltipEl.getBoundingClientRect();
  const compact = width < 640;
  const m = { top: 18, right: compact ? 12 : 18, bottom: compact ? 54 : 62, left: compact ? 44 : 54 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const pad = 5;
  const px = m.left + ((c.x + pad) / (100 + 2 * pad)) * plotW;
  const py = m.top + plotH - ((c.y + pad) / (100 + 2 * pad)) * plotH;

  let left = px + 16;
  if (left + box.width > width - 4) left = px - 16 - box.width;
  let top = py - box.height / 2;
  top = Math.max(4, Math.min(top, height - box.height - 4));
  tooltipEl.style.left = `${Math.max(4, left)}px`;
  tooltipEl.style.top = `${top}px`;
}

function hideTooltip() { tooltipEl.hidden = true; }

/* ---------------- legend ---------------- */

function buildLegend() {
  const counts = CITY_DATA.reduce((acc, c) => (acc[c.continent] = (acc[c.continent] || 0) + 1, acc), {});
  const legend = document.getElementById("legend");
  legend.replaceChildren();
  for (const { name, color } of CONTINENTS) {
    const n = counts[name] || 0;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.continent = name;
    btn.innerHTML = `<span class="swatch" style="background:${color}"></span>${name} <span class="count">${n}</span>`;
    if (n === 0) btn.disabled = true;
    btn.addEventListener("click", () => {
      state.hidden.has(name) ? state.hidden.delete(name) : state.hidden.add(name);
      if (state.selected && state.hidden.has(state.selected.continent)) select(null);
      btn.classList.toggle("off", state.hidden.has(name));
      buildBoards();
      render();
    });
    legend.append(btn);
  }
}

/* ---------------- boards ---------------- */

const BOARDS = [
  { title: "Best value", hint: "Quality percentile minus cost percentile", pick: list => [...list].sort((a, b) => b.value - a.value), num: c => `+${c.value.toFixed(0)}` },
  { title: "Worst value", hint: "Paying the most for the least", pick: list => [...list].sort((a, b) => a.value - b.value), num: c => c.value.toFixed(0) },
  { title: "Highest quality of life", hint: "Cost ignored entirely", pick: list => [...list].sort((a, b) => b.y - a.y), num: c => c.y.toFixed(0) },
  { title: "Cheapest cities", hint: "Lowest cost of living", pick: list => [...list].sort((a, b) => a.x - b.x), num: c => c.x.toFixed(0) },
];

function buildBoards() {
  const list = visibleCities();
  const wrap = document.getElementById("boards");
  wrap.replaceChildren();
  for (const board of BOARDS) {
    const section = document.createElement("section");
    section.className = "board";
    const items = board.pick(list).slice(0, 8);
    section.innerHTML = `<h2>${board.title}</h2><p class="hint">${board.hint}</p><ol></ol>`;
    const ol = section.querySelector("ol");
    items.forEach((c, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="rank">${i + 1}</span>
        <span class="swatch" style="width:9px;height:9px;border-radius:50%;background:${COLOR[c.continent]};display:inline-block"></span>
        <span class="name">${c.city}</span><span class="num">${board.num(c)}</span>`;
      li.addEventListener("click", () => select(c));
      ol.append(li);
    });
    wrap.append(section);
  }
}

/* ---------------- search ---------------- */

function updateSuggestions() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) { suggestionsEl.hidden = true; return; }
  const hits = visibleCities()
    .filter(c => c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
    .sort((a, b) => a.city.localeCompare(b.city))
    .slice(0, 12);
  if (!hits.length) { suggestionsEl.hidden = true; return; }
  suggestionsEl.replaceChildren();
  for (const c of hits) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `${c.city} <span class="muted">${c.country}</span>`;
    btn.addEventListener("click", e => {
      e.stopPropagation();
      select(c);
      searchEl.value = c.city;
      suggestionsEl.hidden = true;
    });
    suggestionsEl.append(btn);
  }
  suggestionsEl.hidden = false;
}

/* ---------------- wiring ---------------- */

document.querySelectorAll("[data-labels]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.labels = btn.dataset.labels;
    document.querySelectorAll("[data-labels]").forEach(b => b.classList.toggle("on", b === btn));
    render();
  });
});

document.getElementById("reset").addEventListener("click", () => {
  state.hidden.clear();
  state.selected = null;
  state.hovered = null;
  searchEl.value = "";
  suggestionsEl.hidden = true;
  document.querySelectorAll(".legend button").forEach(b => b.classList.remove("off"));
  hideTooltip();
  buildBoards();
  render();
});

searchEl.addEventListener("input", updateSuggestions);
searchEl.addEventListener("focus", updateSuggestions);
document.addEventListener("click", e => {
  if (!e.target.closest(".search")) suggestionsEl.hidden = true;
  if (!e.target.closest(".chart, .board, .controls") && state.selected) select(null);
});
document.addEventListener("keydown", e => { if (e.key === "Escape") select(null); });

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { hideTooltip(); render(); }, 120);
});

buildLegend();
buildBoards();
render();
