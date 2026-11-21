/* Visual components: an animated SVG graph view and the four live demos
   (A coverage, B error injection, C k explorer, D saturated-graph paradox).
   Demos are explanatory simulations on short sequences, never measurements. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const COL = { cyan: "#2ee6d6", teal: "#14b8a6", orange: "#ff8a3d", red: "#ff4d5e", purple: "#b57bff", muted: "#3b4a66", yellow: "#ffd166", blue: "#4c9dff", green: "#4ade80", ink: "#f2f6fc" };
  const COMP_COLORS = ["#2ee6d6", "#ff8a3d", "#b57bff", "#ffd166", "#4c9dff", "#ff4d5e", "#4ade80", "#f472b6", "#a3e635", "#38bdf8", "#fb923c", "#c084fc"];
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  // ------------------------------------------------------------------ GraphView
  class GraphView {
    constructor(container, o = {}) {
      this.o = Object.assign({ w: 800, h: 450, r: 13, labels: true, arrows: true, dur: 550, labelSize: 15, edgeWidth: 2.6 }, o);
      container.innerHTML = "";
      this.svg = mk("svg", { class: "graph", viewBox: `0 0 ${this.o.w} ${this.o.h}`, preserveAspectRatio: "xMidYMid meet" }, container);
      this.defs = mk("defs", {}, this.svg);
      this.gE = mk("g", {}, this.svg);
      this.gN = mk("g", {}, this.svg);
      this.gL = mk("g", {}, this.svg);
      this.gTop = mk("g", {}, this.svg);
      this.nodes = new Map();
      this.edges = new Map();
      this.markers = new Set();
      this.anim = null;
    }
    marker(color) {
      const id = "ar" + color.replace(/[^a-z0-9]/gi, "");
      if (!this.markers.has(id)) {
        const m = mk("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: "auto-start-reverse" }, this.defs);
        mk("path", { d: "M0,0 L10,5 L0,10 z", fill: color }, m);
        this.markers.add(id);
      }
      return `url(#${id})`;
    }
    update(g, pos, style = {}) {
      const ns = style.node || (() => ({})), es = style.edge || (() => ({}));
      const seenN = new Set(), seenE = new Set();
      for (const n of g.nodes.values()) {
        seenN.add(n.id);
        const p = pos.get(n.id) || { x: this.o.w / 2, y: this.o.h / 2 };
        let v = this.nodes.get(n.id);
        const s = ns(n) || {};
        if (!v) {
          const c = mk("circle", { r: s.r || this.o.r, cx: p.x, cy: p.y, class: "node", opacity: 0 }, this.gN);
          const t = mk("text", { x: p.x, y: p.y, class: "lbl" }, this.gL);
          v = { c, t, x: p.x, y: p.y, x0: p.x, y0: p.y, tx: p.x, ty: p.y };
          this.nodes.set(n.id, v);
          requestAnimationFrame(() => c.setAttribute("opacity", 1));
          c.style.transition = "opacity .4s, fill .3s, stroke .3s";
        }
        v.x0 = v.x; v.y0 = v.y; v.tx = p.x; v.ty = p.y; v.dead = false;
        v.c.setAttribute("class", "node " + (s.cls || ""));
        v.c.setAttribute("r", s.r || this.o.r);
        v.c.style.fill = s.fill || ""; v.c.style.stroke = s.stroke || "";
        v.c.setAttribute("opacity", s.opacity ?? 1);
        v.t.textContent = this.o.labels ? (s.label ?? n.id) : (s.label || "");
        v.t.style.fontSize = (s.labelSize || this.o.labelSize) + "px";
        v.t.style.fill = s.labelColor || "";
        v.t.setAttribute("dy", s.labelDy || 0);
        v.c.onmouseenter = style.onHover ? () => style.onHover(n) : null;
      }
      for (const [id, v] of this.nodes) if (!seenN.has(id)) {
        v.c.setAttribute("opacity", 0); v.t.textContent = ""; v.dead = true;
        setTimeout(() => { if (v.dead) { v.c.remove(); v.t.remove(); this.nodes.delete(id); } }, 450);
      }
      const pairs = new Set(g.edges.map((e) => e.u + "→" + e.v));
      for (const e of g.edges) {
        seenE.add(e.id);
        let v = this.edges.get(e.id);
        const s = es(e) || {};
        if (!v) {
          const p = mk("path", { class: "edge", opacity: 0 }, this.gE);
          p.style.transition = "opacity .4s, stroke .3s";
          v = { p };
          this.edges.set(e.id, v);
          requestAnimationFrame(() => p.setAttribute("opacity", s.opacity ?? 0.9));
        } else v.p.setAttribute("opacity", s.opacity ?? 0.9);
        v.u = e.u; v.v = e.v; v.dead = false;
        v.rev = e.u !== e.v && pairs.has(e.v + "→" + e.u);
        v.loopIdx = s.loopIdx || 0; v.bend = s.bend || 0;
        const color = s.color || COL.teal;
        v.p.setAttribute("class", "edge " + (s.cls || ""));
        v.p.style.stroke = color;
        v.p.style.strokeWidth = s.width || this.o.edgeWidth;
        v.p.style.strokeDasharray = s.dash || "";
        if (this.o.arrows) v.p.setAttribute("marker-end", this.marker(color)); else v.p.removeAttribute("marker-end");
      }
      for (const [id, v] of this.edges) if (!seenE.has(id)) {
        v.p.setAttribute("opacity", 0); v.dead = true;
        setTimeout(() => { if (v.dead) { v.p.remove(); this.edges.delete(id); } }, 450);
      }
      this.animate();
    }
    edgePath(v) {
      const a = this.nodes.get(v.u), b = this.nodes.get(v.v);
      if (!a || !b) return "";
      const r = +a.c.getAttribute("r") || this.o.r, rb = +b.c.getAttribute("r") || this.o.r;
      if (v.u === v.v) {
        const cx = this.o.cx ?? this.o.w / 2, cy = this.o.cy ?? this.o.h / 2;
        let ang = Math.atan2(a.y - cy, a.x - cx);
        if (!isFinite(ang) || (a.x === cx && a.y === cy)) ang = -Math.PI / 2;
        const L = r * 3.4, s1 = ang - 0.55, s2 = ang + 0.55;
        const p1 = [a.x + r * Math.cos(s1), a.y + r * Math.sin(s1)], p2 = [a.x + r * Math.cos(s2), a.y + r * Math.sin(s2)];
        const c1 = [a.x + L * Math.cos(ang - 0.7), a.y + L * Math.sin(ang - 0.7)], c2 = [a.x + L * Math.cos(ang + 0.7), a.y + L * Math.sin(ang + 0.7)];
        return `M${p1[0]},${p1[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
      }
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      if (v.rev || v.bend) {
        const off = v.bend || Math.min(26, d * 0.22);
        const mx = (a.x + b.x) / 2 - uy * off, my = (a.y + b.y) / 2 + ux * off;
        const sa = Math.atan2(my - a.y, mx - a.x), sb = Math.atan2(my - b.y, mx - b.x);
        return `M${a.x + r * Math.cos(sa)},${a.y + r * Math.sin(sa)} Q${mx},${my} ${b.x + (rb + 2) * Math.cos(sb)},${b.y + (rb + 2) * Math.sin(sb)}`;
      }
      return `M${a.x + ux * r},${a.y + uy * r} L${b.x - ux * (rb + 2)},${b.y - uy * (rb + 2)}`;
    }
    draw() {
      for (const v of this.nodes.values()) {
        v.c.setAttribute("cx", v.x); v.c.setAttribute("cy", v.y);
        v.t.setAttribute("x", v.x); v.t.setAttribute("y", v.y);
      }
      for (const v of this.edges.values()) v.p.setAttribute("d", this.edgePath(v));
    }
    animate() {
      cancelAnimationFrame(this.anim);
      const t0 = performance.now(), dur = this.o.dur;
      const stepF = (now) => {
        const t = Math.min(1, (now - t0) / dur), k = ease(t);
        for (const v of this.nodes.values()) { v.x = v.x0 + (v.tx - v.x0) * k; v.y = v.y0 + (v.ty - v.y0) * k; }
        this.draw();
        if (t < 1) this.anim = requestAnimationFrame(stepF);
      };
      this.anim = requestAnimationFrame(stepF);
    }
    stop() { cancelAnimationFrame(this.anim); }
  }

  const fmtD = (d) => d == null ? "undef." : d === 0 ? "0" : d < 0.001 ? d.toExponential(1) : d.toFixed(3);
  const stat = (k, id, cls = "") => `<div class="stat"><div class="k">${k}</div><div class="v ${cls}" data-s="${id}">–</div></div>`;
  const setS = (root, id, v) => { const e = root.querySelector(`[data-s="${id}"]`); if (e) e.textContent = v; };

  // ------------------------------------------------- Demo A: coverage → islands
  function CoverageDemo(root) {
    const seq = Toy.LAMBDA_EXCERPT, G = seq.length, L = 30, k = 11;
    const maxN = Math.round(12 * G / L);
    const starts = Toy.readStarts(G, L, maxN, 20261123);
    root.innerHTML = `
      <div class="stack" style="height:100%">
        <div class="ctrl-row"><span>coverage <i>c</i></span><input type="range" min="0" max="12" step="0.25" value="0" data-r="c"><span class="readout" data-s="c"></span>
          <button class="btn" data-b="play">▶ Play</button><button class="btn" data-b="reset">↺ Reset</button></div>
        <div style="flex:1;min-height:0" data-g></div>
        <div class="strip"><span>N<b data-s="n"></b></span><span>components<b class="c-orange" data-s="C"></b></span><span>unseen<b data-s="miss"></b></span><span>D<b class="c-cyan" data-s="D"></b></span></div>
        <div class="small" style="font-size:18px">Toy: first ${G} bp of λ, L = ${L}, k = ${k}, e = 0, seeded reads. Grey = unsampled. Toy c<sub>peak</sub> = L/(L−k+1) = ${(L / (L - k + 1)).toFixed(2)}.</div>
      </div>`;
    const W = 860, H = 250;
    const view = new GraphView(root.querySelector("[data-g]"), { w: W, h: H, r: 6.5, labels: false, arrows: false, edgeWidth: 4 });
    // fixed "genome order" snake layout: node = (k-1)-mer at genome position i
    const allNodes = Toy.kmersOf(seq, k - 1);
    const rows = 4, perRow = Math.ceil(allNodes.length / rows);
    const pos = new Map();
    allNodes.forEach((id, i) => {
      if (pos.has(id)) return;
      const r = Math.floor(i / perRow), j = i % perRow;
      const x = 30 + (r % 2 ? perRow - 1 - j : j) * ((W - 60) / (perRow - 1));
      pos.set(id, { x, y: 25 + r * ((H - 50) / (rows - 1)) });
    });
    // faint background of all genome positions
    const bg = mk("g", {}, view.svg); view.svg.insertBefore(bg, view.gE);
    for (const p of pos.values()) mk("circle", { cx: p.x, cy: p.y, r: 3, fill: "#2a3956" }, bg);
    const genomeKmers = new Set(Toy.kmersOf(seq, k));
    let c = 1, timer = null;
    const slider = root.querySelector('[data-r="c"]');
    function render() {
      const N = Math.round(c * G / L);
      const km = [];
      for (let i = 0; i < N; i++) km.push(...Toy.kmersOf(seq.slice(starts[i], starts[i] + L), k));
      const g = Toy.build(km);
      // colour components by size order for stability
      const sizes = new Map();
      for (const n of g.nodes.values()) sizes.set(n.comp, (sizes.get(n.comp) || 0) + 1);
      const order = [...sizes.keys()].sort((a, b) => sizes.get(b) - sizes.get(a));
      const cmap = new Map(order.map((id, i) => [id, COMP_COLORS[i % COMP_COLORS.length]]));
      view.update(g, pos, {
        node: (n) => ({ fill: cmap.get(n.comp), stroke: cmap.get(n.comp) }),
        edge: (e) => ({ color: cmap.get(g.nodes.get(e.u).comp), width: 4 }),
      });
      const seen = [...genomeKmers].filter((x) => g.counts.has(x)).length;
      setS(root, "c", c.toFixed(2)); setS(root, "n", N); setS(root, "C", g.E ? g.C : 0);
      setS(root, "miss", ((1 - seen / genomeKmers.size) * 100).toFixed(0) + "%"); setS(root, "D", fmtD(g.D));
      slider.value = c;
    }
    slider.oninput = () => { c = +slider.value; stopPlay(); render(); };
    function stopPlay() { clearInterval(timer); timer = null; root.querySelector('[data-b="play"]').textContent = "▶ Play"; }
    function toggle() {
      if (timer) return stopPlay();
      if (c >= 12) c = 0;
      root.querySelector('[data-b="play"]').textContent = "❚❚ Pause";
      timer = setInterval(() => { c = Math.min(12, c + 0.25); render(); if (c >= 12) stopPlay(); }, 380);
    }
    function reset() { stopPlay(); c = 0; render(); }
    root.querySelector('[data-b="play"]').onclick = toggle;
    root.querySelector('[data-b="reset"]').onclick = reset;
    render();
    return { toggle, reset, destroy: () => { stopPlay(); view.stop(); }, set: (v) => { stopPlay(); c = v; render(); } };
  }

  // ------------------------------------------------- Demo B: error injection
  function ErrorDemo(root, opts = {}) {
    const k = 5;
    // pick a 30 bp window of lambda whose 4-mers are all distinct (clean reference path)
    let ref = null;
    for (let o = 0; o + 30 <= Toy.LAMBDA_EXCERPT.length && !ref; o++) {
      const w = Toy.LAMBDA_EXCERPT.slice(o, o + 30);
      const nm = Toy.kmersOf(w, k - 1);
      if (new Set(nm).size === nm.length) ref = w;
    }
    ref = ref || Toy.LAMBDA_EXCERPT.slice(0, 30);
    const RS = 3, RL = 24; // read = ref[3..27)
    const read0 = ref.slice(RS, RS + RL);
    let read = read0.split("");
    root.innerHTML = `
      <div class="stack" style="height:100%">
        <div class="ctrl-row"><span class="muted">Click a base to substitute it ·</span>
          <button class="btn warn" data-p="bubble">Mid-read error</button>
          <button class="btn warn" data-p="tip">Error at read end</button>
          <button class="btn warn" data-p="close">2 errors, 2 bp apart</button>
          <button class="btn warn" data-p="far">2 errors, far apart</button>
          <button class="btn" data-p="reset">↺ Reset</button></div>
        <div style="display:flex;align-items:center;gap:18px"><span class="small mono">read</span><div class="dna" data-read></div></div>
        <div style="flex:1;min-height:0" data-g></div>
        <div class="strip"><span>substitutions<b class="c-orange" data-s="ne"></b></span><span>k-mers affected<b class="c-orange" data-s="aff"></b></span><span>imbalance I<b class="c-red" data-s="I"></b></span><span>I − 2 (linear ends)<b class="c-red" data-s="dI"></b></span><span>structure<b data-s="kind"></b></span></div>
        <div class="small">Toy: 30 bp of lambda (all ${k - 1}-mers distinct), k = ${k}. Grey path = error-free reference k-mers; orange = k-mers that exist only because of the substitution(s). Red nodes have in-degree ≠ out-degree.</div>
      </div>`;
    const W = 1700, H = 280, mid = 175;
    const view = new GraphView(root.querySelector("[data-g]"), { w: W, h: H, r: 17, labelSize: 12, edgeWidth: 3 });
    const refNodes = Toy.kmersOf(ref, k - 1);
    const refK = new Set(Toy.kmersOf(ref, k));
    const sp = (W - 80) / (refNodes.length - 1);
    const basePos = new Map(refNodes.map((id, i) => [id, { x: 40 + i * sp, y: mid }]));
    const readEl = root.querySelector("[data-read]");
    function render() {
      const r = read.join("");
      const mut = read.map((b, i) => b !== read0[i]);
      const readK = Toy.kmersOf(r, k);
      const g = Toy.build([...refK, ...readK]);
      // place off-reference nodes between where the read leaves and rejoins the reference
      const pos = new Map(basePos);
      const rn = Toy.kmersOf(r, k - 1);
      let run = [], before = null, side = 0;
      const flush = (after) => {
        if (!run.length) return;
        const yOff = side++ % 2 ? 80 : -125;
        const x0 = before ? pos.get(before).x : (after ? pos.get(after).x - sp * (run.length + 1) : 40);
        const x1 = after ? pos.get(after).x : x0 + sp * (run.length + 1);
        run.forEach((id, i) => { if (!pos.has(id)) pos.set(id, { x: x0 + ((i + 1) * (x1 - x0)) / (run.length + 1), y: mid + yOff * Math.sin(Math.PI * (i + 1) / (run.length + 1)) * (after && before ? 1 : 0.8) + (after && before ? 0 : yOff * 0.25) }); });
        run = [];
      };
      for (const id of rn) {
        if (basePos.has(id)) { flush(id); before = id; } else run.push(id);
      }
      flush(null);
      view.update(g, pos, {
        node: (n) => {
          const imb = Math.abs(n.in - n.out), off = !basePos.has(n.id);
          return { cls: (imb ? "unbal " : "") + (off ? "err" : ""), label: n.id };
        },
        edge: (e) => ({ color: refK.has(e.id) ? "#5b6b8a" : COL.orange, width: refK.has(e.id) ? 3 : 4 }),
      });
      // read strip
      const affected = new Set();
      mut.forEach((m, i) => { if (m) for (let j = Math.max(0, i - k + 1); j <= Math.min(i, RL - k); j++) affected.add(j); });
      readEl.innerHTML = read.map((b, i) => {
        const inAff = [...affected].some((j) => i >= j && i < j + k);
        return `<span class="click ${mut[i] ? "mut" : inAff ? "aff" : ""}" data-i="${i}">${b}</span>`;
      }).join("");
      readEl.querySelectorAll("span").forEach((s) => s.onclick = () => { const i = +s.dataset.i; read[i] = cycle(read[i], read0[i]); render(); });
      const nErr = mut.filter(Boolean).length;
      setS(root, "ne", nErr); setS(root, "aff", affected.size); setS(root, "I", g.I); setS(root, "dI", g.I - 2);
      const offNodes = [...g.nodes.values()].filter((n) => !basePos.has(n.id));
      const sinks = offNodes.filter((n) => n.out === 0 || n.in === 0).length;
      const detours = g.edges.filter((e) => basePos.has(e.u) && !basePos.has(e.v)).length;
      setS(root, "kind", !nErr ? "clean path" : !offNodes.length ? "—" : sinks ? "tip" : detours > 1 ? `${detours} bubbles` : "1 bubble");
    }
    const cycle = (b, orig) => { const order = "ACGT"; let nb = order[(order.indexOf(b) + 1) % 4]; return nb; };
    const presets = {
      bubble: [11], tip: [RL - 2], close: [10, 12], far: [5, 17],
    };
    const sub = (b) => ({ A: "C", C: "G", G: "T", T: "A" })[b];
    function preset(name) {
      read = read0.split("");
      (presets[name] || []).forEach((i) => read[i] = sub(read0[i]));
      root.querySelectorAll("[data-p]").forEach((b) => b.classList.toggle("on", b.dataset.p === name));
      render();
    }
    root.querySelectorAll("[data-p]").forEach((b) => b.onclick = () => preset(b.dataset.p === "reset" ? "none" : b.dataset.p));
    preset(opts.start || "none");
    return { reset: () => preset("none"), preset, destroy: () => view.stop() };
  }

  // ------------------------------------------------- Demo C: k explorer
  function KDemo(root) {
    const seq = Toy.LAMBDA_EXCERPT, G = seq.length, L = 25;
    const starts = Toy.readStarts(G, L, 200, 77);
    root.innerHTML = `
      <div class="stack" style="height:100%">
        <div class="ctrl-row"><span>k</span><input type="range" min="2" max="20" step="1" value="2" data-r="k" style="width:300px"><span class="readout" data-s="k"></span>
          <button class="btn on" data-m="all">all k-mers (perfect)</button><button class="btn" data-m="reads">reads: c = 4, L = ${L}</button><button class="btn" data-b="reset">↺</button></div>
        <div style="display:grid;grid-template-columns:1fr 330px;gap:20px;flex:1;min-height:0">
          <div data-g style="min-height:0"></div>
          <div class="stats tight" style="grid-template-columns:1fr 1fr;align-content:start">
            ${stat("possible 4ᵏ", "poss")}${stat("edges |E|", "E")}${stat("nodes |V|", "V")}${stat("components C", "C", "c-orange")}${stat("imbalance I", "I", "c-red")}${stat("repeated k-mers", "rep", "c-purple")}${stat("positions collapsed", "col", "c-purple")}${stat("D", "D", "c-cyan")}
          </div>
        </div>
        <div class="small" style="font-size:18px">Toy: first ${G} bp of λ, e = 0. Saturation threshold log₄ ${G} ≈ ${(Math.log(G) / Math.log(4)).toFixed(1)} — same mechanism as the genome, at tiny k.</div>
      </div>`;
    const W = 1000, H = 500;
    const view = new GraphView(root.querySelector("[data-g]"), { w: W, h: H, r: 9, labels: false, arrows: true, edgeWidth: 1.6, dur: 700 });
    let k = 2, mode = "all", prev = new Map();
    const slider = root.querySelector('[data-r="k"]');
    function render() {
      const km = mode === "all" ? Toy.kmersOf(seq, k) : starts.slice(0, Math.round(4 * G / L)).flatMap((s) => Toy.kmersOf(seq.slice(s, s + L), k));
      const g = Toy.build(km);
      const big = g.V > 60;
      view.o.r = big ? 5 : 11; view.o.labels = !big;
      const pos = Toy.layout(g, W, H, { prev, seed: 3, iters: big ? 200 : 320, spacing: big ? 0.9 : 1.3 });
      prev = pos;
      view.o.cx = W / 2; view.o.cy = H / 2;
      view.update(g, pos, {
        node: (n) => ({ cls: n.in !== n.out ? "unbal" : "", r: big ? 5 : 15, label: big ? "" : n.id, labelSize: 13 }),
        edge: (e) => ({ color: e.count > 1 ? COL.purple : COL.teal, width: big ? 1.6 : 2.2, opacity: big ? 0.75 : 0.85 }),
      });
      const genomeK = Toy.kmersOf(seq, k), distinct = new Set(genomeK).size;
      setS(root, "k", k); setS(root, "poss", k <= 8 ? Math.pow(4, k).toLocaleString("en-US") : (Math.pow(4, k) / Math.pow(10, Math.floor(k * Math.log10(4)))).toFixed(1) + "e" + Math.floor(k * Math.log10(4))); setS(root, "E", g.E); setS(root, "V", g.V);
      setS(root, "C", g.C); setS(root, "I", g.I); setS(root, "rep", g.repeated);
      setS(root, "col", ((1 - distinct / genomeK.length) * 100).toFixed(1) + "%"); setS(root, "D", fmtD(g.D));
      slider.value = k;
    }
    slider.oninput = () => { k = +slider.value; render(); };
    root.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => {
      mode = b.dataset.m;
      root.querySelectorAll("[data-m]").forEach((x) => x.classList.toggle("on", x === b));
      render();
    });
    const reset = () => { k = 2; mode = "all"; prev = new Map(); root.querySelectorAll("[data-m]").forEach((x) => x.classList.toggle("on", x.dataset.m === "all")); render(); };
    root.querySelector('[data-b="reset"]').onclick = reset;
    render();
    return { reset, destroy: () => view.stop(), setK: (v) => { k = v; render(); } };
  }

  // ------------------------------------------------- Demo D: the paradox
  function cyclicKmers(s, k) { const e = s + s.slice(0, k - 1); return Toy.kmersOf(e, k).slice(0, s.length); }

  function ParadoxDemo(root, opts = {}) {
    const leftSeq = "AACGTTGC"; // circular; all 2-mers distinct -> simple cycle
    const gl = Toy.build(cyclicKmers(leftSeq, 3));
    const all2 = []; for (const a of "ACGT") for (const b of "ACGT") all2.push(a + b);
    const gr = Toy.build(all2); // every 2-mer once: complete De Bruijn graph, 4 nodes
    // exhaustive enumeration, cached (BEST theorem predicts (4!)^4 / 4^2 = 20,736 for the right graph)
    const cache = ParadoxDemo.cache || (ParadoxDemo.cache = { L: Toy.countEulerCircuits(gl, "AA"), R: Toy.countEulerCircuits(gr, "A") });
    const cntL = cache.L, cntR = cache.R;
    root.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1.25fr;gap:34px;height:100%">
        <div class="panel stack" style="padding:22px 26px">
          <h3 class="c-cyan">Simple cycle · k = 3</h3>
          <div style="flex:1;min-height:0" data-gl></div>
          <div class="stats" style="grid-template-columns:repeat(4,1fr)">${stat("C", "lC")}${stat("I", "lI")}${stat("D", "lD", "c-cyan")}${stat("Euler circuits", "lN", "c-cyan")}</div>
          <div class="mono" style="font-size:24px">spells: <span class="c-cyan">${leftSeq}</span>… (cyclic)</div>
        </div>
        <div class="panel stack" style="padding:22px 26px">
          <h3 class="c-purple">Saturated: all 16 dinucleotides · k = 2</h3>
          <div style="flex:1;min-height:0" data-gr></div>
          <div class="stats" style="grid-template-columns:repeat(4,1fr)">${stat("C", "rC")}${stat("I", "rI")}${stat("D", "rD", "c-purple")}${stat("Euler circuits", "rN", "c-purple")}</div>
          <div class="ctrl-row"><button class="btn purple" data-t="1">Traversal 1</button><button class="btn purple" data-t="2">Traversal 2</button><button class="btn purple" data-t="3">Traversal 3</button><button class="btn" data-t="rand">🎲 Random</button><button class="btn" data-t="reset">↺</button></div>
          <div class="mono" style="font-size:25px;min-height:36px">spells: <span data-spell class="c-purple"></span></div>
        </div>
      </div>`;
    const Wl = 520, Hl = 380, Wr = 700, Hr = 400;
    const vl = new GraphView(root.querySelector("[data-gl]"), { w: Wl, h: Hl, r: 24, labelSize: 17, edgeWidth: 3 });
    const pl = new Map(); [...gl.nodes.keys()].forEach((id, i, a) => { const t = -Math.PI / 2 + (2 * Math.PI * i) / a.length; pl.set(id, { x: Wl / 2 + 145 * Math.cos(t), y: Hl / 2 + 145 * Math.sin(t) }); });
    vl.update(gl, pl, { edge: () => ({ color: COL.cyan }) });
    const vr = new GraphView(root.querySelector("[data-gr]"), { w: Wr, h: Hr, r: 30, labelSize: 22, edgeWidth: 2.4, cx: Wr / 2, cy: Hr / 2 });
    const pr = new Map([["A", { x: Wr / 2 - 130, y: Hr / 2 - 105 }], ["C", { x: Wr / 2 + 130, y: Hr / 2 - 105 }], ["G", { x: Wr / 2 + 130, y: Hr / 2 + 105 }], ["T", { x: Wr / 2 - 130, y: Hr / 2 + 105 }]]);
    // diagonal pairs (A<->G, C<->T) both directions: curve them so all 16 edges are visible
    const baseStyle = () => ({ node: () => ({ stroke: COL.purple, fill: "#1d1233" }), edge: () => ({ color: "#6d5a99", width: 2.4 }) });
    vr.update(gr, pr, baseStyle());
    setS(root, "lC", gl.C); setS(root, "lI", gl.I); setS(root, "lD", fmtD(gl.D)); setS(root, "lN", cntL.cyclic.toLocaleString("en-US"));
    setS(root, "rC", gr.C); setS(root, "rI", gr.I); setS(root, "rD", fmtD(gr.D)); setS(root, "rN", cntR.cyclic.toLocaleString("en-US"));
    const spellEl = root.querySelector("[data-spell]");
    let timer = null, seedBase = 0;
    const SEEDS = { 1: 11, 2: 23, 3: 42 };
    function play(seed) {
      clearInterval(timer);
      const tr = Toy.randomEulerCircuit(gr, "A", seed);
      let i = 0;
      const lit = new Set();
      spellEl.textContent = "A";
      const hue = (j) => `hsl(${265 + j * 6}, 95%, ${62 + (j % 3) * 4}%)`;
      vr.update(gr, pr, { node: () => ({ stroke: COL.purple, fill: "#1d1233" }), edge: () => ({ color: "#3a3157", width: 2 }) });
      timer = setInterval(() => {
        if (i >= tr.edges.length) { clearInterval(timer); timer = null; return; }
        lit.add(tr.edges[i].id);
        const order = new Map(tr.edges.map((e, j) => [e.id, j]));
        vr.update(gr, pr, {
          node: () => ({ stroke: COL.purple, fill: "#1d1233" }),
          edge: (e) => lit.has(e.id) ? { color: e.id === tr.edges[i].id ? COL.yellow : hue(order.get(e.id)), width: e.id === tr.edges[i].id ? 5 : 3.2 } : { color: "#3a3157", width: 2 },
        });
        spellEl.textContent = tr.seq.slice(0, i + 2);
        i++;
      }, opts.speed || 260);
    }
    root.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => {
      const t = b.dataset.t;
      root.querySelectorAll("[data-t]").forEach((x) => x.classList.toggle("on", x === b && t !== "reset"));
      if (t === "reset") return reset();
      play(t === "rand" ? 1000 + (++seedBase) * 7919 : SEEDS[t]);
    });
    function reset() { clearInterval(timer); timer = null; spellEl.textContent = ""; vr.update(gr, pr, baseStyle()); root.querySelectorAll("[data-t]").forEach((x) => x.classList.remove("on")); }
    return { reset, play: () => play(SEEDS[1]), destroy: () => { clearInterval(timer); vl.stop(); vr.stop(); }, counts: { cntL, cntR } };
  }

  window.Viz = { GraphView, CoverageDemo, ErrorDemo, KDemo, ParadoxDemo, COL, COMP_COLORS, mk, fmtD, cyclicKmers };
})();
