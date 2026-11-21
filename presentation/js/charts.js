/* Minimal SVG chart helper: line series with ±1 sd bands, linear/log axes,
   annotations and hover tooltips. Data are plotted exactly as given. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  function scale(ax, r0, r1) {
    const [d0, d1] = ax.domain;
    if (ax.log) {
      const l0 = Math.log10(d0), l1 = Math.log10(d1);
      const f = (v) => r0 + ((Math.log10(Math.max(v, d0 * 1e-3)) - l0) / (l1 - l0)) * (r1 - r0);
      f.inv = (p) => Math.pow(10, l0 + ((p - r0) / (r1 - r0)) * (l1 - l0));
      return f;
    }
    const f = (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
    f.inv = (p) => d0 + ((p - r0) / (r1 - r0)) * (d1 - d0);
    return f;
  }
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const txt = (parent, x, y, s, attrs = {}) => { const t = el("text", { x, y, ...attrs }, parent); t.textContent = s; return t; };

  function line(container, o) {
    container.innerHTML = "";
    container.classList.add("chart");
    const W = container.clientWidth || 800, H = container.clientHeight || 500;
    const m = Object.assign({ l: 96, r: 30, t: 24, b: 78 }, o.margin || {});
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}` }, container);
    const tip = document.createElement("div");
    tip.className = "chart-tip";
    container.appendChild(tip);
    const sx = scale(o.x, m.l, W - m.r), sy = scale(o.y, H - m.b, m.t);
    const clipId = "c" + Math.random().toString(36).slice(2);
    const defs = el("defs", {}, svg);
    el("rect", { x: m.l, y: m.t - 4, width: W - m.l - m.r, height: H - m.t - m.b + 8 }, el("clipPath", { id: clipId }, defs));

    // grid + axes
    const grid = el("g", { class: "grid" }, svg), axis = el("g", { class: "axis" }, svg);
    const fx = o.x.format || ((v) => v), fy = o.y.format || ((v) => v);
    (o.y.ticks || []).forEach((v) => {
      el("line", { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v) }, grid);
      txt(axis, m.l - 14, sy(v) + 6, fy(v), { "text-anchor": "end" });
    });
    (o.x.ticks || []).forEach((v) => {
      if (o.x.grid) el("line", { x1: sx(v), x2: sx(v), y1: m.t, y2: H - m.b }, grid);
      el("line", { x1: sx(v), x2: sx(v), y1: H - m.b, y2: H - m.b + 7, class: "dom" }, axis);
      txt(axis, sx(v), H - m.b + 32, fx(v), { "text-anchor": "middle" });
    });
    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "dom" }, axis);
    el("line", { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, class: "dom" }, axis);
    if (o.x.label) txt(axis, (m.l + W - m.r) / 2, H - 12, o.x.label, { class: "axis-label", "text-anchor": "middle" });
    if (o.y.label) txt(axis, 26, (m.t + H - m.b) / 2, o.y.label, { class: "axis-label", "text-anchor": "middle", transform: `rotate(-90 26 ${(m.t + H - m.b) / 2})` });

    const under = el("g", { "clip-path": `url(#${clipId})` }, svg);
    const plot = el("g", { "clip-path": `url(#${clipId})` }, svg);
    const over = el("g", { class: "ann" }, svg);

    // annotations drawn under the data
    (o.annotations || []).forEach((a) => {
      if (a.type === "rect") {
        const x0 = a.x0 != null ? sx(a.x0) : m.l, x1 = a.x1 != null ? sx(a.x1) : W - m.r;
        const r = el("rect", { x: x0, y: m.t, width: x1 - x0, height: H - m.t - m.b, fill: a.color, opacity: a.opacity ?? 0.12 }, under);
        if (a.cls) r.setAttribute("class", a.cls);
        if (a.label) txt(over, (x0 + x1) / 2, m.t + 26, a.label, { fill: a.textColor || a.color, "text-anchor": "middle", class: a.cls || "" });
      } else if (a.type === "vline") {
        const x = sx(a.x);
        el("line", { x1: x, x2: x, y1: m.t, y2: H - m.b, stroke: a.color, "stroke-width": a.width || 2, "stroke-dasharray": a.dash || "6 6", class: a.cls || "" }, under);
        if (a.label) txt(over, x + (a.dx ?? 8), a.y != null ? sy(a.y) : m.t + 22, a.label, { fill: a.color, "text-anchor": a.anchor || "start", class: a.cls || "" });
      } else if (a.type === "hline") {
        const y = sy(a.y);
        el("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: a.color, "stroke-width": a.width || 2, "stroke-dasharray": a.dash || "6 6", class: a.cls || "" }, under);
        if (a.label) txt(over, a.x != null ? sx(a.x) : W - m.r - 8, y - 10, a.label, { fill: a.color, "text-anchor": a.anchor || "end", class: a.cls || "" });
      } else if (a.type === "text") {
        txt(over, sx(a.x) + (a.dx || 0), sy(a.y) + (a.dy || 0), a.label, { fill: a.color, "text-anchor": a.anchor || "start", class: a.cls || "", "font-size": a.size || 19 });
      } else if (a.type === "point") {
        el("circle", { cx: sx(a.x), cy: sy(a.y), r: a.r || 10, fill: "none", stroke: a.color, "stroke-width": 3, class: a.cls || "" }, over);
        if (a.label) txt(over, sx(a.x) + (a.dx ?? 14), sy(a.y) + (a.dy ?? -14), a.label, { fill: a.color, class: a.cls || "", "text-anchor": a.anchor || "start" });
      }
    });

    const groups = [];
    (o.series || []).forEach((s) => {
      const g = el("g", { class: "series" + (s.cls ? " " + s.cls : "") }, plot);
      groups.push(g);
      const pts = s.points.filter((p) => p.y != null && (!o.y.log || p.y > 0 || s.allowZero));
      if (s.band !== false && pts.some((p) => p.sd)) {
        const lo = (p) => sy(o.y.log ? Math.max(p.y - p.sd, o.y.domain[0]) : Math.max(p.y - p.sd, o.y.domain[0]));
        const hi = (p) => sy(p.y + p.sd);
        const d = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x)},${hi(p)}`).join("") +
          pts.slice().reverse().map((p) => `L${sx(p.x)},${lo(p)}`).join("") + "Z";
        el("path", { d, class: "band", fill: s.color }, g);
      }
      const d = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x)},${sy(p.y)}`).join("");
      const path = el("path", { d, class: "line", stroke: s.color }, g);
      if (s.dash) path.setAttribute("stroke-dasharray", s.dash);
      if (s.width) path.setAttribute("stroke-width", s.width);
      if (s.markers !== false) {
        pts.forEach((p) => {
          const c = el("circle", { cx: sx(p.x), cy: sy(p.y), r: s.r || 6.5, fill: s.color }, g);
          if (o.tooltip) {
            c.addEventListener("mouseenter", () => {
              tip.innerHTML = o.tooltip(p, s);
              tip.style.left = sx(p.x) / W * 100 + "%";
              tip.style.top = sy(p.y) / H * 100 + "%";
              tip.classList.add("show");
            });
            c.addEventListener("mouseleave", () => tip.classList.remove("show"));
          }
        });
      }
      if (s.endLabel) {
        const p = pts[pts.length - 1];
        txt(over, sx(p.x) + 14, sy(p.y) + 7 + (s.endDy || 0), s.endLabel, { fill: s.color, "font-size": 20 });
      }
    });

    // legend
    if (o.legend) {
      const lg = el("g", { class: "legend" }, svg);
      const lx = o.legend.x ?? m.l + 24, ly = o.legend.y ?? m.t + 20;
      o.series.filter((s) => !s.noLegend).forEach((s, i) => {
        const y = ly + i * 34;
        const l = el("line", { x1: lx, x2: lx + 38, y1: y, y2: y, stroke: s.color, "stroke-width": 4 }, lg);
        if (s.dash) l.setAttribute("stroke-dasharray", s.dash);
        txt(lg, lx + 50, y + 7, s.name);
      });
    }
    return { svg, sx, sy, W, H, m, over, under, groups };
  }

  // log tick helpers
  const fmtInt = (v) => v >= 1000 ? v.toLocaleString("en-US") : String(v);
  window.Charts = { line, scale, el, txt, fmtInt };
})();
