/* The 16 slides. Every experimental number is read from window.LAMBDA_DATA
   (aggregated from the pipeline's CSVs) or quoted from report.html. */
(function () {
  "use strict";
  const S = LAMBDA_DATA.sweeps;
  const { GraphView, COL } = Viz;
  const G = LAMBDA_DATA.genome.length, L = 100;

  // ---------- helpers ----------
  const ser = (sweep, s, field = "degradation") => S[sweep].points.filter((p) => p.series === s)
    .map((p) => ({ x: p.x, y: p[field], sd: p[field + "_sd"], raw: p }));
  const row = (sweep, s, x) => S[sweep].points.find((p) => p.series === s && p.x === x);
  const head = (eyebrow, title, takeaway, cls = "") =>
    `<div class="header"><div><div class="eyebrow ${cls}">${eyebrow}</div><h2>${title}</h2></div>${takeaway ? `<div class="takeaway">${takeaway}</div>` : ""}</div>`;
  const DFORM = (cls = "big") => `<span class="math ${cls}"><i>D</i> = ½·<span class="frac term-f"><span>ln <i>C</i></span><span>ln |<i>V</i>|</span></span> + ½·<span class="frac term-i"><span><i>I</i></span><span>2|<i>E</i>|</span></span></span>`;
  const chartPanel = (id, meta, png, tag = '<span class="tag measured">● Measured · phage lambda NC_001416.1</span>') =>
    `<div class="panel stack" style="padding:18px 24px 14px;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">${tag}${png ? `<button class="btn" data-png="${png}" data-for="${id}" style="font-size:16px;padding:6px 12px">show original figure</button>` : ""}</div>
      <div style="flex:1;min-height:0;position:relative" data-chart="${id}"></div>
      <div class="plot-meta">${meta}</div></div>`;
  function life() {
    const ids = [];
    return {
      every(fn, ms) { const i = setInterval(fn, ms); ids.push(() => clearInterval(i)); return i; },
      after(fn, ms) { const i = setTimeout(fn, ms); ids.push(() => clearTimeout(i)); return i; },
      add(f) { ids.push(f); },
      clear() { ids.splice(0).forEach((f) => f()); },
    };
  }
  // chart registry with "original figure" toggle
  function bindCharts(el, renderers) {
    const show = {};
    for (const id in renderers) renderers[id](el.querySelector(`[data-chart="${id}"]`));
    el.querySelectorAll("[data-png]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.for, box = el.querySelector(`[data-chart="${id}"]`);
        show[id] = !show[id];
        b.classList.toggle("on", show[id]);
        b.textContent = show[id] ? "show interactive chart" : "show original figure";
        if (show[id]) box.innerHTML = `<img class="plot-img" src="plots/${b.dataset.png}" alt="Original matplotlib figure">`;
        else { box.innerHTML = ""; renderers[id](box); }
      };
    });
  }
  const pct = (v, d = 1) => (v * 100).toFixed(d) + "%";
  const tipD = (p, s) => `${s.name}<br>k = ${p.x} · D = ${p.y.toFixed(4)} ± ${p.sd.toFixed(4)}<br><span style="color:#7d8aa3">C = ${p.raw.components} · I = ${p.raw.imbalance} · n = ${p.raw.n}</span>`;
  const KT = [4, 5, 6, 7, 8, 10, 15, 20, 30, 50, 70, 95];
  const ESER = [[0, "e = 0", COL.cyan], [0.001, "e = 0.001", COL.yellow], [0.005, "e = 0.005", COL.orange]];

  function kChart(box, sweep, opts = {}) {
    return Charts.line(box, {
      x: { log: true, domain: [3.7, 104], ticks: KT, label: "k-mer size k (log scale)" },
      y: { domain: [0, opts.ymax || 0.5], ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5].filter((t) => t <= (opts.ymax || 0.5)), label: "degradation index D", format: (v) => v.toFixed(1) },
      series: (opts.only || ESER).map(([e, name, color]) => ({ name, color, points: ser(sweep, e) })),
      legend: opts.legend === false ? null : (opts.legendPos || { x: 130, y: 40 }),
      annotations: opts.ann || [],
      tooltip: tipD, margin: opts.margin,
    });
  }

  // ======================================================== 1. Title / hero
  (function () {
    const lf = life();
    let view, phase = 0, playing = true;
    const N = 18, W = 1000, H = 620;
    const base = [];
    for (let i = 0; i < N; i++) base.push({ id: "n" + i, x: 70 + i * ((W - 140) / (N - 1)), y: H / 2 + Math.sin(i * 0.62) * 150 });
    const pos = new Map(base.map((b) => [b.id, { x: b.x, y: b.y }]));
    pos.set("e1", { x: base[8].x - 20, y: base[8].y - 120 }); pos.set("e2", { x: base[9].x + 20, y: base[9].y - 125 });
    const CAP = ["A clean De Bruijn graph: one Eulerian path spells the genome",
      "Missing coverage → gaps split the graph into islands",
      "A sequencing error → a spurious bubble with unbalanced nodes",
      "Repeats collapse → the path can be re-routed: ambiguity"];
    function graph(ph) {
      const nodes = new Map(), edges = [];
      const add = (id) => nodes.set(id, { id, in: 0, out: 0 });
      base.forEach((b) => add(b.id));
      for (let i = 0; i < N - 1; i++) edges.push({ id: `p${i}`, u: "n" + i, v: "n" + (i + 1) });
      if (ph >= 2) { add("e1"); add("e2"); edges.push({ id: "b1", u: "n7", v: "e1" }, { id: "b2", u: "e1", v: "e2" }, { id: "b3", u: "e2", v: "n10" }); }
      if (ph >= 3) edges.push({ id: "r1", u: "n3", v: "n14" }, { id: "r2", u: "n13", v: "n4" });
      return { nodes, edges };
    }
    function render() {
      const g = graph(phase);
      view.update(g, pos, {
        node: (n) => ({
          r: 15, label: "",
          cls: phase >= 2 && (n.id === "n7" || n.id === "n10") ? "unbal" : n.id[0] === "e" ? "err" : "",
          stroke: phase >= 3 && ["n3", "n4", "n13", "n14"].includes(n.id) ? COL.purple : "",
          fill: phase >= 3 && ["n3", "n4", "n13", "n14"].includes(n.id) ? "#2a1846" : "",
        }),
        edge: (e) => {
          if (phase >= 1 && (e.id === "p4" || e.id === "p11")) return { color: COL.red, dash: "4 10", opacity: 0.55, width: 3 };
          if (e.id[0] === "b") return { color: COL.orange, width: 3.5 };
          if (e.id[0] === "r") return { color: COL.purple, width: 3.5 };
          return { color: COL.cyan, width: 3.5 };
        },
      });
      const cap = document.querySelector("#hero-cap");
      if (cap) { cap.textContent = CAP[phase]; cap.className = "mono " + ["c-cyan", "c-red", "c-orange", "c-purple"][phase]; }
    }
    Deck.add({
      title: "When De Bruijn Graphs Break", duration: 60, steps: 1,
      html: `
      <div style="display:grid;grid-template-columns:780px 1fr;gap:40px;height:100%;align-items:center">
        <div class="stack" style="gap:26px">
          <div class="eyebrow">Algorithms &amp; Data Structures · follow-up study</div>
          <h1 style="font-size:96px;line-height:1.0">When De Bruijn<br>Graphs <span class="c-orange">Break</span></h1>
          <div class="lead" style="font-size:34px">Experimental Analysis of Genome Assembly Degradation</div>
          <div style="font-size:28px;margin-top:18px">Tudor Pisica &nbsp;·&nbsp; Andrei Stan</div>
          <div class="small mono">Monday, 23 November 2026</div>
        </div>
        <div class="stack" style="height:100%;justify-content:center">
          <div data-hero style="height:640px"></div>
          <div id="hero-cap" class="mono c-cyan" style="font-size:24px;text-align:center;min-height:34px"></div>
        </div>
      </div>
      <div data-step="1" style="position:absolute;left:96px;right:96px;bottom:92px;font-size:34px;color:var(--ink-2);text-align:center;font-style:italic">
        “What happens when a mathematically elegant genome assembly algorithm<br>encounters imperfect sequencing data?”</div>`,
      enter(el) {
        view = new GraphView(el.querySelector("[data-hero]"), { w: W, h: H, r: 15, labels: false, edgeWidth: 3.5, dur: 900 });
        phase = 0; playing = true; render();
        lf.every(() => { if (playing) { phase = (phase + 1) % 4; render(); } }, 2600);
      },
      leave() { lf.clear(); view && view.stop(); },
      toggle() { playing = !playing; },
      reset() { phase = 0; render(); },
    });
  })();

  // ======================================================== 2. From theory to experiment
  (function () {
    const lf = life();
    Deck.add({
      title: "From Theory to Experiment", duration: 60, steps: 1,
      html: `${head("Last seminar → this study", "From theory to experiment", "k-mers are edges; the genome is an Eulerian path. <b>Real reads break the ideal.</b>")}
      <div class="body cols-3" style="grid-template-rows:1fr auto;gap:30px 34px">
        <div class="panel stack"><h3 class="c-cyan">① Coverage <span class="math mid">c</span></h3><div data-cov style="flex:1"></div><div class="small">Too few reads → k-mers never observed → gaps</div></div>
        <div class="panel stack"><h3 class="c-orange">② Error rate <span class="math mid">e</span></h3><div data-err style="flex:1"></div><div class="small">One wrong base → up to k false k-mers → spurious branch</div></div>
        <div class="panel stack"><h3 class="c-purple">③ k-mer size <span class="math mid">k</span></h3><div data-k style="flex:1"></div><div class="small" data-kcap>Window length decides what the graph can tell apart</div></div>
        <div data-step="1" style="grid-column:1/-1;text-align:center;font-size:36px;padding:8px 0 0">
          How does the <b class="c-cyan">topology</b> of a De Bruijn graph degrade as <span class="c-cyan">c</span>, <span class="c-orange">e</span> and <span class="c-purple">k</span> change?</div>
      </div>`,
      enter(el) {
        // coverage panel: reads accumulate along a genome, gaps shown in red
        const cov = el.querySelector("[data-cov]");
        cov.innerHTML = `<svg viewBox="0 0 500 300" style="width:100%;height:100%"></svg>`;
        const svg = cov.firstChild, Wd = 460;
        let reads = [], r = Toy.rng(5);
        function drawCov() {
          svg.innerHTML = "";
          const covered = new Uint8Array(Wd);
          reads.forEach((s) => { for (let i = s; i < s + 60 && i < Wd; i++) covered[i] = 1; });
          reads.forEach((s, i) => Viz.mk("rect", { x: 20 + s, y: 30 + (i % 9) * 20, width: 60, height: 12, rx: 4, fill: COL.cyan, opacity: 0.8 }, svg));
          Viz.mk("rect", { x: 20, y: 236, width: Wd, height: 14, rx: 7, fill: "#22314d" }, svg);
          let i = 0;
          while (i < Wd) { let j = i; while (j < Wd && covered[j] === covered[i]) j++; Viz.mk("rect", { x: 20 + i, y: 236, width: j - i, height: 14, fill: covered[i] ? COL.teal : COL.red, opacity: covered[i] ? 0.9 : 0.85 }, svg); i = j; }
          const t = Viz.mk("text", { x: 20, y: 286, fill: "#b7c3d6", "font-size": 20, "font-family": "Consolas" }, svg);
          t.textContent = `reads: ${reads.length}   uncovered: ${Math.round((1 - covered.reduce((a, b) => a + b, 0) / Wd) * 100)}%`;
        }
        lf.every(() => { if (reads.length > 16) reads = []; else reads.push(Math.floor(r() * (Wd - 60))); drawCov(); }, 420);
        drawCov();
        // error panel: path + bubble when a base flips
        const err = el.querySelector("[data-err]");
        err.innerHTML = `<div class="dna sm" style="justify-content:center;margin:10px 0 6px">${"ACGTTAGCCA".split("").map((b) => `<span>${b}</span>`).join("")}</div><div data-eg style="height:200px"></div>`;
        const ev = new GraphView(err.querySelector("[data-eg]"), { w: 500, h: 220, r: 12, labels: false, edgeWidth: 3 });
        const ep = new Map(); for (let i = 0; i < 7; i++) ep.set("n" + i, { x: 40 + i * 70, y: 150 }); ep.set("x1", { x: 180, y: 55 }); ep.set("x2", { x: 320, y: 55 });
        let on = false;
        const egraph = () => { const nodes = new Map(); const e = []; for (let i = 0; i < 7; i++) nodes.set("n" + i, { id: "n" + i }); for (let i = 0; i < 6; i++) e.push({ id: "p" + i, u: "n" + i, v: "n" + (i + 1) }); if (on) { nodes.set("x1", { id: "x1" }); nodes.set("x2", { id: "x2" }); e.push({ id: "q1", u: "n1", v: "x1" }, { id: "q2", u: "x1", v: "x2" }, { id: "q3", u: "x2", v: "n5" }); } return { nodes, edges: e }; };
        const drawE = () => {
          ev.update(egraph(), ep, { node: (n) => ({ cls: on && (n.id === "n1" || n.id === "n5") ? "unbal" : n.id[0] === "x" ? "err" : "", label: "" }), edge: (e) => ({ color: e.id[0] === "q" ? COL.orange : COL.cyan }) });
          const sp = err.querySelectorAll(".dna span")[5]; sp.classList.toggle("mut", on); sp.textContent = on ? "C" : "A";
        };
        drawE();
        lf.every(() => { on = !on; drawE(); }, 1600);
        lf.add(() => ev.stop());
        // k panel: sliding window of alternating size
        const kp = el.querySelector("[data-k]"), seq = "GCGATGCGATGCGTTA";
        kp.innerHTML = `<div class="dna sm" style="justify-content:center;margin-top:30px">${seq.split("").map((b) => `<span>${b}</span>`).join("")}</div><div class="mono" data-kt style="text-align:center;font-size:24px;margin-top:26px"></div><div class="small" data-kd style="text-align:center;margin-top:10px"></div>`;
        let kk = 3, pos0 = 0;
        lf.every(() => {
          const spans = kp.querySelectorAll(".dna span");
          spans.forEach((s, i) => s.classList.toggle("inwin", i >= pos0 && i < pos0 + kk));
          const w = seq.slice(pos0, pos0 + kk);
          const occ = Toy.kmersOf(seq, kk).filter((x) => x === w).length;
          kp.querySelector("[data-kt]").innerHTML = `k = ${kk} · window <span class="c-purple">${w}</span>`;
          kp.querySelector("[data-kd]").textContent = occ > 1 ? `occurs ${occ}× in this read — collapses into one edge` : `unique — but only ${seq.length - kk + 1} windows fit in this read`;
          pos0++; if (pos0 + kk > seq.length) { pos0 = 0; kk = kk === 3 ? 8 : 3; }
        }, 700);
      },
      leave() { lf.clear(); },
    });
  })();

  // ======================================================== 3. Hypotheses
  (function () {
    const sketch = (path, xl, yl, color) => `<svg viewBox="0 0 420 260" style="width:100%;height:100%">
      <line x1="50" y1="220" x2="400" y2="220" stroke="#3a4b6b" stroke-width="2"/><line x1="50" y1="20" x2="50" y2="220" stroke="#3a4b6b" stroke-width="2"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="5" stroke-dasharray="12 9" stroke-linecap="round"/>
      <text x="225" y="252" fill="#b7c3d6" font-size="20" text-anchor="middle">${xl}</text>
      <text x="22" y="120" fill="#b7c3d6" font-size="20" text-anchor="middle" transform="rotate(-90 22 120)">${yl}</text></svg>`;
    Deck.add({
      title: "Our Hypotheses", duration: 60, steps: 0,
      html: `${head("Proposal", "Three predictions", '<span class="tag hyp">◇ Original hypotheses — before experimentation</span>')}
      <div class="body cols-3" style="gap:34px">
        <div class="panel stack"><h3 class="c-cyan">H1 · Coverage</h3><div style="flex:1;min-height:0">${sketch("M60,40 C120,170 200,205 390,212", "coverage c", "components C", COL.cyan)}</div>
          <div class="math mid"><i>C</i>(<i>c</i>) ∝ e<sup>−λ<i>c</i></sup> → 1</div><div class="small">Poisson gaps close; fragments stitch into one component.</div></div>
        <div class="panel stack"><h3 class="c-orange">H2 · Errors</h3><div style="flex:1;min-height:0">${sketch("M60,212 L390,40", "error rate e", "imbalance I", COL.orange)}</div>
          <div class="math mid"><i>I</i>(<i>e</i>) ∝ <i>e</i></div><div class="small">Each independent substitution adds a dead-end tip.</div></div>
        <div class="panel stack"><h3 class="c-purple">H3 · k-mer size</h3><div style="flex:1;min-height:0">${sketch("M60,40 C130,205 300,205 390,40", "k-mer size k", "degradation D", COL.purple)}</div>
          <div class="math mid"><i>D</i>(<i>k</i>) is U-shaped</div><div class="small">Small k: repeats tangle. Large k: error-free overlaps vanish.</div></div>
      </div>
      <div style="font-size:26px;color:var(--ink-2);text-align:center;margin-top:26px">Each tested with a controlled parameter sweep — one variable at a time.</div>`,
    });
  })();

  // ======================================================== 4. Pipeline
  (function () {
    const lf = life();
    const STEPS = [["Reference genome", "λ phage · 48,502 bp", COL.cyan], ["Sample reads", "N = cG/L, uniform starts", COL.cyan], ["Inject errors", "substitution w.p. e / base", COL.orange],
      ["Extract k-mers", "L − k + 1 per read", COL.purple], ["Build graph", "(k−1)-mer nodes, distinct k-mer edges", COL.teal], ["Measure", "C, I, D", COL.yellow]];
    const READ = "GGGCGGCGACCTCGCGGGTT", K = 5;
    let view, pos, i = 0;
    Deck.add({
      title: "Research Pipeline", duration: 60, steps: 0,
      html: `${head("Method", "Research pipeline", "Same pipeline for every sweep; only <span class='c-cyan'>c</span>, <span class='c-orange'>e</span> or <span class='c-purple'>k</span> changes.")}
      <div style="display:flex;gap:14px;align-items:stretch" data-pipe>
        ${STEPS.map((s, j) => `<div class="panel" data-ps="${j}" style="flex:1;padding:18px 18px;transition:border-color .3s, box-shadow .3s"><div class="mono" style="font-size:16px;color:${s[2]}">0${j + 1}</div><div style="font-size:25px;font-weight:600;margin:4px 0">${s[0]}</div><div class="small" style="font-size:18px">${s[1]}</div></div>${j < 5 ? '<div style="align-self:center;color:#3a4b6b;font-size:30px">→</div>' : ""}`).join("")}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1.1fr;gap:34px;margin-top:28px;flex:1;min-height:0">
        <div class="stack">
          <div class="stats" style="grid-template-columns:repeat(3,1fr)">
            <div class="stat"><div class="k">genome G</div><div class="v" style="font-size:30px">48,502 bp</div></div>
            <div class="stat"><div class="k">read length L</div><div class="v" style="font-size:30px">100 bp</div></div>
            <div class="stat"><div class="k">replicates</div><div class="v" style="font-size:30px">5 · 5 · 3</div></div>
            <div class="stat"><div class="k">coverage c</div><div class="v c-cyan" style="font-size:30px">0.5 – 30</div></div>
            <div class="stat"><div class="k">error e</div><div class="v c-orange" style="font-size:30px">0 – 2%</div></div>
            <div class="stat"><div class="k">k-mer k</div><div class="v c-purple" style="font-size:30px">4 – 95</div></div>
          </div>
          <div class="small">Enterobacteria phage lambda, NCBI NC_001416.1 · linear dsDNA · 49.9% GC · forward-strand reads · i.i.d. substitutions. Replicates: coverage 5, error 5, k-mer 3.</div>
          <div class="panel" style="padding:18px 22px">
            <div class="small mono" style="margin-bottom:10px">example read (first 20 bp of λ) · k = ${K}</div>
            <div class="dna sm" data-read>${READ.split("").map((b) => `<span>${b}</span>`).join("")}</div>
            <div class="mono" style="font-size:26px;margin-top:16px" data-km></div>
          </div>
        </div>
        <div class="panel stack" style="padding:16px 20px"><div class="small">distinct-edge graph growing window by window — repeated (k−1)-mers <span class="c-purple">GGCG</span>, <span class="c-purple">GCGG</span> reuse a node</div><div data-g style="flex:1;min-height:0"></div></div>
      </div>`,
      enter(el) {
        const km = Toy.kmersOf(READ, K);
        const full = Toy.build(km);
        pos = Toy.layout(full, 820, 420, { seed: 11, iters: 400, spacing: 1.25 });
        view = new GraphView(el.querySelector("[data-g]"), { w: 820, h: 420, r: 22, labelSize: 13, edgeWidth: 2.6 });
        i = 0;
        const tickF = () => {
          const g = Toy.build(km.slice(0, i + 1));
          const rep = new Set(["GGCG", "GCGG"]);
          view.update(g, pos, { node: (n) => ({ stroke: rep.has(n.id) ? COL.purple : "", fill: rep.has(n.id) ? "#2a1846" : "" }), edge: (e) => ({ color: e.id === km[i] ? COL.yellow : COL.teal, width: e.id === km[i] ? 4 : 2.6 }) });
          el.querySelectorAll("[data-read] span").forEach((s, j) => s.classList.toggle("inwin", j >= i && j < i + K));
          const w = km[i];
          el.querySelector("[data-km]").innerHTML = `<span class="c-yellow">${w}</span> → edge <span class="c-cyan">${w.slice(0, -1)}</span> → <span class="c-cyan">${w.slice(1)}</span>`;
          el.querySelectorAll("[data-ps]").forEach((p, j) => { const on = j === Math.min(5, Math.floor(i / 2.7)); p.style.borderColor = on ? STEPS[j][2] : ""; p.style.boxShadow = on ? `0 0 0 1px ${STEPS[j][2]}, 0 0 30px ${STEPS[j][2]}33` : ""; });
          i = (i + 1) % km.length;
        };
        tickF();
        lf.every(tickF, 900);
      },
      leave() { lf.clear(); view && view.stop(); },
    });
  })();

  // ======================================================== 5. Defining degradation
  (function () {
    let v1, v2;
    Deck.add({
      title: "Defining Graph Degradation", duration: 60, steps: 3,
      html: `${head("Metric", "Normalized degradation index", "Both terms are 0 for a perfect graph and 1 at the worst.")}
      <div style="text-align:center;margin:6px 0 26px">${DFORM()}</div>
      <div class="body cols-2" style="gap:34px">
        <div class="panel stack" data-step="1"><h3><span class="term-f">Fragmentation</span> · <span class="math mid"><span class="term-f">ln C / ln |V|</span></span></h3>
          <div data-g1 style="flex:1;min-height:0"></div><div class="mono" style="font-size:24px" data-m1></div>
          <div class="small">Log scale: C spans 1 … thousands; the first breaks count most.</div></div>
        <div class="panel stack" data-step="2"><h3><span class="term-i">Imbalance</span> · <span class="math mid"><span class="term-i">I / 2|E|</span></span>, &nbsp;<span class="math mid"><i>I</i> = Σ<sub><i>v</i></sub> |in(<i>v</i>) − out(<i>v</i>)|</span></h3>
          <div data-g2 style="flex:1;min-height:0"></div><div class="mono" style="font-size:24px" data-m2></div>
          <div class="small">2|E| is the largest imbalance |E| edges can create. A linear genome always has I = 2 (its two ends).</div></div>
      </div>
      <div data-step="3" style="text-align:center;font-size:30px;margin-top:22px">D measures <b class="c-cyan">structure</b> — whether an Eulerian path can exist — <span class="muted">not whether the reconstruction is unique.</span></div>`,
      enter(el) {
        const f1 = Toy.build([...Toy.kmersOf("ACGTTG", 3), ...Toy.kmersOf("GAATCC", 3)]);
        const p1 = new Map(); ["AC", "CG", "GT", "TT", "TG"].forEach((id, i) => p1.set(id, { x: 60 + i * 90, y: 90 })); ["GA", "AA", "AT", "TC", "CC"].forEach((id, i) => p1.set(id, { x: 300 + i * 90, y: 230 }));
        v1 = new GraphView(el.querySelector("[data-g1]"), { w: 760, h: 300, r: 24, labelSize: 16 });
        v1.update(f1, p1, { node: (n) => ({ stroke: n.comp ? COL.orange : COL.cyan, cls: n.in !== n.out ? "" : "" }), edge: (e) => ({ color: f1.nodes.get(e.u).comp ? COL.orange : COL.cyan }) });
        el.querySelector("[data-m1]").innerHTML = `C = ${f1.C}, |V| = ${f1.V} → ½·ln${f1.C}/ln${f1.V} = <span class="term-f">${(0.5 * f1.frag).toFixed(3)}</span> · I = ${f1.I}, |E| = ${f1.E} → D = ${f1.D.toFixed(3)}`;
        const f2 = Toy.build([...Toy.kmersOf("ACGTTG", 3), "GTA"]);
        const p2 = new Map([["AC", { x: 80, y: 170 }], ["CG", { x: 210, y: 170 }], ["GT", { x: 340, y: 170 }], ["TT", { x: 480, y: 110 }], ["TG", { x: 620, y: 110 }], ["TA", { x: 480, y: 250 }]]);
        v2 = new GraphView(el.querySelector("[data-g2]"), { w: 760, h: 300, r: 24, labelSize: 16 });
        v2.update(f2, p2, { node: (n) => ({ cls: n.in !== n.out ? "unbal" : "" }), edge: (e) => ({ color: e.id === "GTA" ? COL.orange : COL.cyan }) });
        el.querySelector("[data-m2]").innerHTML = `C = ${f2.C} · I = ${f2.I}, |E| = ${f2.E} → ½·${f2.I}/${2 * f2.E} = <span class="term-i">${(0.5 * f2.imb).toFixed(3)}</span> → D = ${f2.D.toFixed(3)}`;
      },
      leave() { v1 && v1.stop(); v2 && v2.stop(); },
    });
  })();

  // ======================================================== 5b. Why this metric
  (function () {
    let view, el0;
    // degraded example: component A = path a1→a2→a3→a4 with a tip a2→t; component B = path b1→b2→b3
    const BASE = [["a1", "a2"], ["a2", "a3"], ["a3", "a4"], ["a2", "t"], ["b1", "b2"], ["b2", "b3"]];
    // a minimum repair (3 arcs): each joins a node with in > out to a node with out > in
    const REPAIR = [["t", "b1"], ["b3", "a2"], ["a4", "a1"]];
    const POS = new Map([["a1", { x: 90, y: 150 }], ["a2", { x: 260, y: 150 }], ["a3", { x: 430, y: 150 }], ["a4", { x: 600, y: 150 }], ["t", { x: 260, y: 300 }],
      ["b1", { x: 260, y: 440 }], ["b2", { x: 430, y: 440 }], ["b3", { x: 600, y: 440 }]]);
    function metrics(edgeList) {
      const nodes = new Map();
      const n = (id) => { if (!nodes.has(id)) nodes.set(id, { id, in: 0, out: 0 }); return nodes.get(id); };
      const edges = edgeList.map(([u, v]) => { n(u).out++; n(v).in++; return { id: u + ">" + v, u, v }; });
      const par = new Map([...nodes.keys()].map((k) => [k, k]));
      const f = (x) => { while (par.get(x) !== x) x = par.get(x); return x; };
      edges.forEach((e) => par.set(f(e.u), f(e.v)));
      const comp = new Map();
      for (const v of nodes.values()) { const r = f(v.id); comp.set(r, (comp.get(r) || 0) + Math.abs(v.in - v.out)); }
      const I = [...nodes.values()].reduce((a, v) => a + Math.abs(v.in - v.out), 0);
      const C = comp.size, V = nodes.size, E = edges.length;
      const R = C === 1 ? I / 2 : [...comp.values()].reduce((a, Ij) => a + Math.max(1, Ij / 2), 0); // Edmonds–Johnson
      return { nodes, edges, I, C, V, E, R, Ij: [...comp.values()], D: 0.5 * (V > 1 ? Math.log(C) / Math.log(V) : 0) + 0.5 * I / (2 * E) };
    }
    const before = metrics(BASE), after = metrics([...BASE, ...REPAIR]);
    const Vg = 48466; // |V| of the error-free lambda graph at k = 31 (error_sweep CSV, e = 0)
    const opts = [2, 10, 100, 1000];
    function draw(step) {
      const g = step >= 1 ? metrics([...BASE, ...REPAIR]) : before;
      view.update({ nodes: g.nodes, edges: g.edges }, POS, {
        node: (v) => ({ cls: step < 1 && v.in !== v.out ? "unbal" : "", label: v.id, stroke: v.id[0] === "b" ? COL.orange : "" }),
        edge: (e) => REPAIR.some(([u, v]) => e.id === u + ">" + v) ? { color: COL.yellow, dash: "8 7", width: 3.5, bend: e.id === "a4>a1" ? 120 : 0 } : { color: e.u[0] === "b" ? COL.orange : COL.cyan },
      });
      el0.querySelector("[data-rs]").innerHTML = step >= 1
        ? `after adding <b class="c-yellow">${REPAIR.length}</b> edges: C = ${after.C}, I = ${after.I} → Eulerian, D = ${after.D.toFixed(3)}`
        : `C = ${before.C}, I = ${before.I} (I<sub>A</sub> = ${before.Ij[0]}, I<sub>B</sub> = ${before.Ij[1]}), |V| = ${before.V}, |E| = ${before.E} → D = ${before.D.toFixed(3)}`;
    }
    Deck.add({
      title: "Why We Chose This Metric", duration: 60, steps: 3,
      html: `${head("Metric design", "Why we chose this metric", "How far is the graph from having an Euler tour?")}
      <div class="body" style="grid-template-columns:1fr 1.12fr;gap:30px">
        <div class="panel stack" style="padding:18px 24px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h3 style="font-size:24px;margin:0">Repair it with the fewest new edges</h3><span class="tag sim">◆ Exact toy graph</span></div>
          <div data-g style="flex:1;min-height:0"></div>
          <div class="mono" style="font-size:22px;min-height:60px" data-rs></div>
          <div class="small" style="font-size:18px"><span class="c-red">●</span> in ≠ out &nbsp; <span class="c-yellow">┄</span> added edge: joins a node with in &gt; out to one with out &gt; in</div>
        </div>
        <div class="stack" style="gap:16px">
          <div class="panel" style="padding:16px 24px;border-color:#5a4a1d">
            <div class="small mono" style="color:var(--yellow)">EDMONDS &amp; JOHNSON (1973) · EULER TOURS &amp; THE CHINESE POSTMAN</div>
            <div style="font-size:23px;margin:8px 0 6px">Fewest edges to add so a digraph has an Euler tour:</div>
            <div class="math mid">R = <span class="frac"><span><i>I</i></span><span>2</span></span> &nbsp;(C = 1), &nbsp;&nbsp; R = Σ<sub><i>j</i></sub> max(1, <span class="frac"><span><i>I<sub>j</sub></i></span><span>2</span></span>) &nbsp;(C ≥ 2)</div>
            <div class="math mid" style="margin-top:6px">⇒ &nbsp;max(<i>C</i>, <i>I</i>/2) ≤ R ≤ <span class="term-f"><i>C</i></span> + <span class="term-i"><i>I</i>/2</span></div>
            <div class="small" style="margin-top:4px">The repair cost depends on exactly two quantities: <b class="term-f">components</b> and <b class="term-i">imbalance</b>.</div>
          </div>
          <div class="panel" data-step="2" style="padding:14px 24px">
            <div style="font-size:23px;margin-bottom:6px">Raw C and I grow with genome size → normalise each to [0, 1]</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
              <div><div class="math mid"><span class="term-i"><span class="frac"><span><i>I</i>/2</span><span>|<i>E</i>|</span></span> = <span class="frac"><span><i>I</i></span><span>2|<i>E</i>|</span></span></span></div><div class="small" style="font-size:18px">balancing edges needed per existing edge</div></div>
              <table class="data" style="font-size:18px;white-space:nowrap"><tr><th>C</th>${opts.map((c) => `<th>${c}</th>`).join("")}</tr>
                <tr><td>C/|V|</td>${opts.map((c) => `<td>${(c / Vg).toExponential(0)}</td>`).join("")}</tr>
                <tr><td>1 − 1/C</td>${opts.map((c) => `<td>${(1 - 1 / c).toFixed(3)}</td>`).join("")}</tr>
                <tr><td class="term-f">ln C / ln|V|</td>${opts.map((c) => `<td class="term-f">${(Math.log(c) / Math.log(Vg)).toFixed(2)}</td>`).join("")}</tr></table>
            </div>
            <div class="small" style="font-size:18px;margin-top:4px">C spans 1 … thousands: C/|V| stays ≈ 0, 1 − 1/C saturates after a few breaks, the log spreads it evenly (|V| = 48,466, lambda at k = 31).</div>
          </div>
          <div class="panel" data-step="3" style="padding:14px 24px;text-align:center">${DFORM("mid")}
            <div class="small" style="margin-top:6px">Equal weights. D = 0 ⇔ no repair needed (a linear genome keeps its 2 end-point units). D = 1 at the worst.</div></div>
        </div>
      </div>`,
      enter(el) {
        el0 = el;
        view = new GraphView(el.querySelector("[data-g]"), { w: 700, h: 540, r: 26, labelSize: 17, edgeWidth: 3 });
        draw(Deck.step);
      },
      onStep(s) { if (el0 && el0.classList.contains("active")) draw(s); },
      leave() { view && view.stop(); },
    });
  })();

  // ======================================================== 6. Coverage results
  (function () {
    let demo;
    const KC = [[21, COL.blue], [31, COL.cyan], [51, COL.yellow]];
    const covChart = (box, ann = [], model = false, xmax = 31) => Charts.line(box, {
      x: { domain: [0, xmax], ticks: xmax > 20 ? [0, 5, 10, 15, 20, 25, 30] : [0, 1, 2, 3, 4, 5, 6, 8], label: "coverage depth c" },
      y: { log: true, domain: [0.7, 700], ticks: [1, 3, 10, 30, 100, 300], label: "connected components C (log)" },
      series: [
        ...KC.map(([k, color]) => ({ name: `k = ${k}`, color, points: ser("coverage_sweep", k, "components") })),
        ...(model ? KC.map(([k, color]) => ({ name: `model k=${k}`, color, dash: "3 8", width: 2.5, markers: false, band: false, noLegend: true,
          points: Array.from({ length: 160 }, (_, i) => { const c = 0.05 + i * (xmax / 160); return { x: c, y: (c * G / L) * Math.exp(-c * (L - k + 1) / L) }; }).filter((p) => p.y >= 0.7) })) : []),
      ],
      legend: { x: (box.clientWidth || 900) - 190, y: 36 },
      annotations: ann,
      tooltip: (p, s) => `${s.name} · c = ${p.x}<br>C = ${p.y} ± ${p.sd}<br><span style="color:#7d8aa3">n = ${p.raw.n} replicates</span>`,
    });
    Deck.add({
      title: "Coverage Experiment: Results", duration: 90, steps: 1,
      html: `${head("Experiment 1 · e = 0, L = 100", "Coverage: exponential decay — after a peak", "<span class='verdict ok'>CONFIRMED</span>&nbsp; after the low-coverage rise")}
      <div class="body cols-21" style="gap:30px">
        ${chartPanel("cov", "Mean of 5 replicates, band = ±1 sd. Log y: a straight falling line is exponential decay.", "1_components_vs_coverage.png")}
        <div class="stack" style="gap:18px">
          <div class="panel" style="padding:12px 20px">
            <table class="data" style="font-size:21px"><tr><th>k</th><th>peak C</th><th>at c</th><th>C = 1 at</th><th>decay rate</th></tr>
            ${[[21, "1–1.5", 0.59], [31, "1.5", 0.5], [51, "2", 0.36]].map(([k, at, r]) => { const p = ser("coverage_sweep", k, "components"); const pk = Math.max(...p.map((q) => q.y)); const one = p.find((q) => q.y === 1).x; return `<tr><td>${k}</td><td>${Math.round(pk)}</td><td>${at}</td><td>${one}</td><td>${r.toFixed(2)}</td></tr>`; }).join("")}
            </table><div class="small" style="margin-top:8px">Exponential fits from c ≈ 2: R² = 0.988–0.997 (report)</div></div>
          <div class="panel stack" style="flex:1;min-height:0;padding:16px 20px"><span class="tag sim panel-tag">◆ Simulation · toy</span><h3 style="font-size:23px">Interaction A · islands merge</h3><div data-demo style="flex:1;min-height:0"></div></div>
        </div>
      </div>`,
      enter(el) {
        bindCharts(el, { cov: (b) => covChart(b) });
        demo = Viz.CoverageDemo(el.querySelector("[data-demo]"));
      },
      leave() { demo && demo.destroy(); },
      toggle() { demo && demo.toggle(); }, reset() { demo && demo.reset(); },
    });
    window.__covChart = covChart;
  })();

  // ======================================================== 7. Why rise then fall
  (function () {
    let demo, el0;
    const covChart = window.__covChart;
    const peaks = [21, 31, 51].map((k) => {
      const cp = L / (L - k + 1);
      const p = ser("coverage_sweep", k, "components"); const pk = p.reduce((a, b) => (b.y > a.y ? b : a));
      return { k, cp, model: (cp * G / L) * Math.exp(-1), obs: pk.y, obsAt: pk.x };
    });
    const STAGE = [null, { c: 0.5, x0: 0, x1: 1, label: "few isolated reads" }, { c: 1.5, x0: 1, x1: 2.5, label: "maximum islands" }, { c: 8, x0: 4, x1: 31, label: "islands merge" }];
    function draw(step) {
      const st = STAGE[step];
      const ann = [...peaks.map((p, i) => ({ type: "vline", x: p.cp, color: [COL.blue, COL.cyan, COL.yellow][i], dash: "2 6", width: 2 }))];
      if (st) ann.unshift({ type: "rect", x0: st.x0, x1: st.x1, color: COL.purple, opacity: 0.14, label: st.label, textColor: COL.purple });
      covChart(el0.querySelector('[data-chart="cov7"]'), ann, true, 31);
      if (st && demo) demo.set(st.c);
    }
    Deck.add({
      title: "Why the Curve First Rises, Then Falls", duration: 90, steps: 3,
      html: `${head("Explanation · Lander–Waterman", "Why the curve rises first, then falls", "New reads first <b>create</b> islands, later they <b>connect</b> them.")}
      <div class="body cols-2" style="gap:30px">
        <div class="stack">
          <div class="panel stack" style="flex:1;min-height:0;padding:16px 20px"><span class="tag sim panel-tag">◆ Simulation · toy</span><div class="small mono" data-stage>step through: few reads → peak → merge</div><div data-demo style="flex:1;min-height:0"></div></div>
          <div class="panel" style="padding:18px 24px;display:grid;grid-template-columns:auto 1fr;gap:10px 28px;align-items:center">
            <span class="math mid"><i>N</i> ≈ <span class="frac"><span><i>cG</i></span><span><i>L</i></span></span></span><span class="small">reads sampled</span>
            <span class="math mid">islands ≈ <i>N</i> · e<sup>−<i>c</i>(<i>L</i>−<i>k</i>+1)/<i>L</i></sup></span><span class="small">reads not overlapped by the next k-mer-sharing read</span>
            <span class="math mid"><i>c</i><sub>peak</sub> = <span class="frac"><span><i>L</i></span><span><i>L</i> − <i>k</i> + 1</span></span></span><span class="small">set d/dc = 0. Larger k ⇒ fewer k-mers per read ⇒ lower effective coverage</span>
          </div>
        </div>
        <div class="stack">
          ${chartPanel("cov7", "Solid: measured (5 replicates). Dotted: N·e^(−c(L−k+1)/L) with G = 48,502, L = 100 — no fitted parameters. Vertical: predicted c_peak.", null, '<span class="tag measured">● Measured</span> <span class="tag model">┄ Model</span>')}
          <div class="panel" style="padding:14px 22px;flex:none"><table class="data"><tr><th>k</th><th>c_peak predicted</th><th>peak observed at</th><th>height model</th><th>height measured</th></tr>
          ${peaks.map((p) => `<tr><td>${p.k}</td><td class="c-yellow">${p.cp.toFixed(2)}</td><td>${p.k === 21 ? "1–1.5" : p.obsAt}</td><td class="c-yellow">${Math.round(p.model)}</td><td>${Math.round(p.obs)}</td></tr>`).join("")}</table></div>
        </div>
      </div>`,
      enter(el) { el0 = el; demo = Viz.CoverageDemo(el.querySelector("[data-demo]")); draw(Deck.step); },
      onStep(s) { if (el0 && el0.classList.contains("active")) { draw(s); const t = el0.querySelector("[data-stage]"); if (t) t.textContent = s ? `stage ${s}/3 · ${STAGE[s].label} (toy c = ${STAGE[s].c})` : "step through: few reads → peak → merge"; } },
      leave() { demo && demo.destroy(); },
      toggle() { demo && demo.toggle(); }, reset() { demo && demo.reset(); },
    });
  })();

  // ======================================================== 8. Error results
  (function () {
    const pts = ser("error_sweep", null, "imbalance");
    const READS = 14551; // N = round(30 · 48,502 / 100), from the CSV n_reads column
    const perErr = S.error_sweep.points.filter((p) => p.x > 0).map((p) => ({ e: p.x, v: (p.imbalance - 2) / p.n_errors }));
    let v;
    Deck.add({
      title: "Sequencing Error Experiment: Results", duration: 90, steps: 1,
      html: `${head("Experiment 2 · c = 30, k = 31", "Errors: monotonic, but bending", "<span class='verdict part'>PARTIALLY CONFIRMED</span>&nbsp; linear only while errors are sparse")}
      <div class="body cols-21" style="gap:30px">
        ${chartPanel("err", "Mean of 5 replicates (sd bands too narrow to see). Dashed: isolated-error model I = 2 + 2 × (expected substitutions = N·L·e, N = 14,551).", "2_imbalance_vs_error_rate.png", '<span class="tag measured">● Measured · phage lambda</span> <span class="tag model">┄ Model</span>')}
        <div class="stack">
          <div class="panel" style="padding:18px 24px"><h3 style="font-size:24px">Imbalance per substitution <span class="small">(I − 2) / #errors</span></h3>
            ${perErr.filter((p) => [0.0005, 0.001, 0.005, 0.01, 0.02].includes(p.e)).map((p) => `<div style="display:grid;grid-template-columns:90px 1fr 70px;gap:14px;align-items:center;margin:9px 0"><span class="mono" style="font-size:22px">${(p.e * 100).toFixed(2).replace(/0$/, "")}%</span><div style="height:22px;background:#152038;border-radius:6px;overflow:hidden"><div style="width:${p.v / 2 * 100}%;height:100%;background:linear-gradient(90deg,${COL.orange},${COL.red})"></div></div><span class="mono" style="font-size:22px">${p.v.toFixed(2)}</span></div>`).join("")}
            <div class="small">2.00 = every error isolated. Total I at 2% ≈ ${Math.round(pts[pts.length - 1].y).toLocaleString("en-US")}.</div></div>
          <div class="panel stack" style="flex:1;min-height:0;padding:14px 20px"><h3 style="font-size:23px">A substitution makes a bubble</h3><div data-g style="flex:1;min-height:0"></div>
            <div class="small"><span class="c-red">●</span> leave node: out = 2, in = 1 &nbsp; <span class="c-red">●</span> rejoin node: in = 2, out = 1 → +2</div></div>
        </div>
      </div>`,
      enter(el) {
        bindCharts(el, {
          err: (b) => Charts.line(b, {
            x: { domain: [0, 0.021], ticks: [0, 0.005, 0.01, 0.015, 0.02], format: (v) => (v * 100).toFixed(1) + "%", label: "substitution error rate e (per base)" },
            y: { domain: [0, 62000], ticks: [0, 10000, 20000, 30000, 40000, 50000, 60000], format: Charts.fmtInt, label: "graph imbalance I" },
            margin: { l: 110 },
            series: [
              { name: "isolated-error model", color: COL.yellow, dash: "8 8", width: 2.5, markers: false, band: false, points: [0, 0.02].map((e) => ({ x: e, y: 2 + 2 * READS * L * e })) },
              { name: "measured (k = 31, c = 30)", color: COL.orange, points: pts },
            ],
            legend: { x: 140, y: 40 },
            tooltip: (p, s) => `e = ${(p.x * 100).toFixed(2)}%<br>I = ${Math.round(p.y).toLocaleString("en-US")} ± ${Math.round(p.sd)}<br><span style="color:#7d8aa3">errors ≈ ${Math.round(p.raw.n_errors).toLocaleString("en-US")}</span>`,
          }),
        });
        const nodes = new Map(), edges = [];
        for (let i = 0; i < 7; i++) nodes.set("n" + i, { id: "n" + i });
        ["x1", "x2", "x3"].forEach((x) => nodes.set(x, { id: x }));
        for (let i = 0; i < 6; i++) edges.push({ id: "p" + i, u: "n" + i, v: "n" + (i + 1) });
        edges.push({ id: "q0", u: "n1", v: "x1" }, { id: "q1", u: "x1", v: "x2" }, { id: "q2", u: "x2", v: "x3" }, { id: "q3", u: "x3", v: "n5" });
        const pos = new Map(); for (let i = 0; i < 7; i++) pos.set("n" + i, { x: 50 + i * 110, y: 190 });
        pos.set("x1", { x: 230, y: 70 }); pos.set("x2", { x: 380, y: 45 }); pos.set("x3", { x: 530, y: 70 });
        v = new GraphView(el.querySelector("[data-g]"), { w: 760, h: 250, r: 18, labels: false });
        v.update({ nodes, edges }, pos, { node: (n) => ({ cls: n.id === "n1" || n.id === "n5" ? "unbal" : n.id[0] === "x" ? "err" : "" }), edge: (e) => ({ color: e.id[0] === "q" ? COL.orange : COL.cyan }) });
      },
      leave() { v && v.stop(); },
    });
  })();

  // ======================================================== 9. Why sublinear
  (function () {
    let demo, el0;
    const P = (e, k = 31) => 1 - Math.pow(1 - e, 2 * (k - 1));
    const perErr = new Map(S.error_sweep.points.filter((p) => p.x > 0).map((p) => [p.x, (p.imbalance - 2) / p.n_errors]));
    Deck.add({
      title: "Why Error Growth Becomes Sublinear", duration: 90, steps: 0,
      html: `${head("Explanation · overlapping error windows", "Why error growth becomes sublinear", "Errors closer than k share one bubble: together they add 2, not 4.")}
      <div class="panel" style="flex:1;min-height:0;padding:18px 26px"><span class="tag sim panel-tag" style="top:auto;bottom:18px">◆ Simulation · toy · Interaction B</span><div data-demo style="height:100%"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1.15fr;gap:30px;margin-top:18px;flex:none">
        <div class="panel" style="padding:16px 24px">
          <div class="math mid" style="margin-bottom:10px"><i>P</i>(neighbour within <i>k</i>−1) = 1 − (1 − <i>e</i>)<sup>2(<i>k</i>−1)</sup></div>
          <div class="ctrl-row"><span>e</span><input type="range" min="0" max="0.02" step="0.0005" value="0.001" data-e style="width:420px"><span class="readout" data-ev></span><span>→ P =</span><span class="readout c-orange" data-pv style="font-size:30px"></span><span class="small">(k = 31)</span></div>
        </div>
        <div class="panel" style="padding:12px 22px"><table class="data" style="font-size:22px"><tr><th>e</th>${[0.0005, 0.001, 0.005, 0.01, 0.02].map((e) => `<th>${(e * 100).toFixed(2).replace(/0$/, "")}%</th>`).join("")}</tr>
          <tr><td class="c-yellow">P (computed)</td>${[0.0005, 0.001, 0.005, 0.01, 0.02].map((e) => `<td class="c-yellow">${pct(P(e), 0)}</td>`).join("")}</tr>
          <tr><td class="c-orange">I / error (measured)</td>${[0.0005, 0.001, 0.005, 0.01, 0.02].map((e) => `<td class="c-orange">${perErr.get(e).toFixed(2)}</td>`).join("")}</tr></table></div>
      </div>`,
      enter(el) {
        el0 = el;
        demo = Viz.ErrorDemo(el.querySelector("[data-demo]"));
        const s = el.querySelector("[data-e]");
        const upd = () => { const e = +s.value; el.querySelector("[data-ev]").textContent = (e * 100).toFixed(2) + "%"; el.querySelector("[data-pv]").textContent = pct(P(e)); };
        s.oninput = upd; upd();
      },
      leave() { demo && demo.destroy(); },
      reset() { demo && demo.reset(); if (el0) { el0.querySelector("[data-e]").value = 0.001; el0.querySelector("[data-e]").oninput(); } },
    });
  })();

  // ======================================================== 10. k-mer results
  (function () {
    let el0;
    function draw(step) {
      const ann = [
        { type: "rect", x0: 3.7, x1: 6.5, color: "#7d8aa3", opacity: 0.12, label: "?", textColor: "#b7c3d6", cls: "pulse" },
      ];
      if (step >= 1) ann.push({ type: "rect", x0: 6.5, x1: 11.8, color: COL.purple, opacity: 0.14, label: "motif collisions", textColor: COL.purple });
      if (step >= 2) ann.push({ type: "rect", x0: 11.8, x1: 36, color: COL.teal, opacity: 0.1, label: "distinguishable", textColor: COL.teal });
      if (step >= 3) ann.push({ type: "rect", x0: 36, x1: 104, color: COL.orange, opacity: 0.1, label: "missing k-mers + errors", textColor: COL.orange });
      kChart(el0.querySelector('[data-chart="k10"]'), "kmer_sweep", { ann, margin: { t: 50 }, legendPos: { x: 430, y: 110 } });
    }
    Deck.add({
      title: "k-mer Experiment: Results", duration: 90, steps: 3,
      html: `${head("Experiment 3 · c = 30, L = 100", "k-mer size: an asymmetric U", "<span class='verdict part'>PARTIALLY CONFIRMED</span>&nbsp; U-shape for k ≥ 8 … and something odd below")}
      <div class="body cols-21" style="gap:30px">
        ${chartPanel("k10", "Mean of 3 replicates, band = ±1 sd. Log x-axis, k = 4 … 95.", "3_degradation_vs_k.png")}
        <div class="stack" style="gap:16px">
          <div class="stat"><div class="k">local peak · k = 8–9</div><div class="v c-purple">D ≈ ${row("kmer_sweep", 0.001, 8).degradation.toFixed(3)}</div></div>
          <div class="stat" data-step="2"><div class="k">valley · k ≈ 13–31</div><div class="v c-cyan">≈ 0 <span class="small">(e = 0)</span> · ${(() => { const v = S.kmer_sweep.points.filter((p) => p.series > 0 && p.x >= 13 && p.x <= 25).map((p) => p.degradation); return Math.min(...v).toFixed(3) + "–" + Math.max(...v).toFixed(3); })()} <span class="small">(errors, k 13–25)</span></div></div>
          <div class="stat" data-step="3"><div class="k">k = 95 · only 6 k-mers per read</div><div class="v c-orange">D = ${row("kmer_sweep", 0, 95).degradation.toFixed(2)} – ${row("kmer_sweep", 0.005, 95).degradation.toFixed(2)}</div></div>
          <div class="stat"><div class="k">k ≤ 6</div><div class="v pulse" style="color:#b7c3d6">D → 0 ?</div></div>
          <div class="small" style="margin-top:auto">Left side: only the imbalance term is active. Right side: the logarithmic component term takes over (≈ 0.8 when the graph shatters).</div>
        </div>
      </div>`,
      enter(el) { el0 = el; bindCharts(el, { k10: () => draw(Deck.step) }); },
      onStep(s) { if (el0 && el0.classList.contains("active")) draw(s); },
    });
  })();

  // ======================================================== 11. Coverage shifts threshold
  (function () {
    let el0, cSel = 10;
    const SW = { 10: "kmer_sweep_c10", 15: "kmer_sweep_c15", 20: "kmer_sweep_c20", 25: "kmer_sweep_c25", 30: "kmer_sweep" };
    const thr = (sw, e) => (S[sw].points.filter((p) => p.series === e && p.x >= 13 && p.degradation > 0.05)[0] || {}).x;
    const PNG = { 10: "3_degradation_vs_k_c10.png", 15: "3_degradation_vs_k_c15.png", 20: "3_degradation_vs_k_c20.png", 25: "3_degradation_vs_k_c25.png", 30: "3_degradation_vs_k.png" };
    function drawK() {
      const sw = SW[cSel];
      const t0 = thr(sw, 0), t5 = thr(sw, 0.005);
      kChart(el0.querySelector('[data-chart="k11"]'), sw, {
        ann: [{ type: "hline", y: 0.05, color: "#7d8aa3", dash: "4 6", label: "D = 0.05", x: 4.2, anchor: "start" },
          { type: "vline", x: t0, color: COL.cyan, label: `k = ${t0}`, y: 0.47 }, { type: "vline", x: t5, color: COL.orange, label: `k = ${t5}`, y: 0.42, anchor: "end", dx: -8 }],
      });
      el0.querySelectorAll("[data-c]").forEach((b) => b.classList.toggle("on", +b.dataset.c === cSel));
      const pb = el0.querySelector("[data-png]"); if (pb) { pb.dataset.png = PNG[cSel]; }
    }
    function drawWin(k) {
      const w = L - k + 1, c = 10, e = 0.005;
      const box = el0.querySelector("[data-win]");
      const n = Math.min(w, 96);
      box.innerHTML = `<svg viewBox="0 0 760 120" style="width:100%">
        <rect x="10" y="10" width="740" height="22" rx="6" fill="#22314d"/>
        <text x="380" y="26" fill="#b7c3d6" font-size="15" text-anchor="middle" font-family="Consolas">read · L = 100</text>
        ${Array.from({ length: Math.min(n, 12) }, (_, i) => { const x = 10 + (i * (740 - k * 7.4)) / Math.max(1, Math.min(n, 12) - 1 || 1); return `<rect x="${n === 1 ? 10 : x}" y="${42 + i * 6}" width="${k * 7.4}" height="5" rx="2" fill="${COL.purple}" opacity=".85"/>`; }).join("")}
      </svg>`;
      el0.querySelector("[data-wk]").textContent = k;
      el0.querySelector("[data-ww]").textContent = w;
      el0.querySelector("[data-wc]").textContent = (c * w / L).toFixed(2);
      el0.querySelector("[data-wm]").textContent = pct(Math.exp(-c * w / L));
      el0.querySelector("[data-we]").textContent = pct(Math.pow(1 - e, k));
    }
    Deck.add({
      title: "How Coverage Shifts the k-mer Threshold", duration: 90, steps: 0,
      html: `${head("Large-k side", "Coverage moves the right wall", "First k with D > 0.05 — errors pull it back to k ≈ 31.")}
      <div class="body cols-2" style="gap:30px">
        <div class="stack">
          <div class="ctrl-row">coverage: ${[10, 15, 20, 25, 30].map((c) => `<button class="btn" data-c="${c}">c = ${c}</button>`).join("")}</div>
          ${chartPanel("k11", "Measured k-mer sweeps at each coverage, 3 replicates each, ±1 sd. Vertical lines: first k ≥ 13 with D > 0.05.", "3_degradation_vs_k_c10.png")}
        </div>
        <div class="stack">
          <div class="panel" style="padding:14px 22px"><table class="data"><tr><th>coverage c</th>${[10, 15, 20, 25, 30].map((c) => `<th>${c}</th>`).join("")}</tr>
            <tr><td class="c-cyan">k* (e = 0)</td>${[10, 15, 20, 25, 30].map((c) => `<td class="c-cyan">${thr(SW[c], 0)}</td>`).join("")}</tr>
            <tr><td class="c-orange">k* (e = 0.005)</td>${[10, 15, 20, 25, 30].map((c) => `<td class="c-orange">${thr(SW[c], 0.005)}</td>`).join("")}</tr></table></div>
          <div class="panel stack" style="flex:1;min-height:0;padding:16px 24px"><span class="tag model panel-tag">┄ Arithmetic</span>
            <div class="ctrl-row"><span>k</span><input type="range" min="4" max="95" value="95" data-kw style="width:420px"><span class="readout" data-wk></span></div>
            <div data-win></div>
            <div class="stats" style="grid-template-columns:repeat(2,1fr)">
              <div class="stat"><div class="k">windows / read · L−k+1</div><div class="v c-purple" data-ww></div></div>
              <div class="stat"><div class="k">k-mer coverage at c = 10</div><div class="v" data-wc></div></div>
              <div class="stat"><div class="k">unsampled ≈ e^(−c(L−k+1)/L)</div><div class="v c-red" data-wm></div></div>
              <div class="stat"><div class="k">error-free k-mer (1−e)^k, e = 0.5%</div><div class="v c-orange" data-we></div></div>
            </div>
            <div class="small">Measured at k = 95, c = 10: <b class="c-red">${pct(row("kmer_sweep_c10", 0, 95).missing_kmer_frac)}</b> of lambda's k-mers never sampled.</div>
          </div>
        </div>
      </div>`,
      enter(el) {
        el0 = el;
        bindCharts(el, { k11: () => drawK() });
        el.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => { cSel = +b.dataset.c; const pb = el.querySelector("[data-png]"); if (pb && pb.classList.contains("on")) pb.click(); drawK(); });
        const s = el.querySelector("[data-kw]"); s.oninput = () => drawWin(+s.value); drawWin(+s.value);
      },
      reset() { cSel = 10; drawK(); const s = el0.querySelector("[data-kw]"); s.value = 95; drawWin(95); },
    });
  })();

  // ======================================================== 12. The surprise
  (function () {
    let el0, demo, hv;
    const r4 = row("kmer_sweep_c10", 0.001, 4);
    Deck.add({
      title: "The Surprise: Zero Degradation", duration: 90, steps: 4,
      html: `<div data-layerA style="display:flex;flex-direction:column;height:100%;transition:opacity .4s">
        ${head("What surprised us · phage lambda, k = 4", '<span class="c-purple glow-purple">99.5% collapsed.</span> <span class="c-cyan">Zero degradation.</span>', "")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;flex:1;min-height:0">
          <div class="stack" style="justify-content:center;gap:18px">
            <div class="stats" style="grid-template-columns:1fr 1fr;gap:18px">
              <div class="stat" data-step="1"><div class="k">possible 4-mers 4⁴</div><div class="v">256</div></div>
              <div class="stat" data-step="1"><div class="k">distinct edges observed</div><div class="v">${r4.n_edges}</div></div>
              <div class="stat" data-step="1"><div class="k">components C</div><div class="v c-cyan">${r4.components}</div></div>
              <div class="stat" data-step="1"><div class="k">imbalance I</div><div class="v c-cyan">${r4.imbalance}</div></div>
              <div class="stat" data-step="1" style="grid-column:1/-1;border-color:#5a3d8f"><div class="k">genome k-mer positions collapsed</div><div class="v c-purple" style="font-size:54px">${pct(r4.repeat_collapse_frac)}</div></div>
            </div>
            <div data-step="2" class="pop" style="text-align:center;padding:10px 0"><div class="small mono">normalized degradation index</div><div class="mono c-cyan glow-cyan" style="font-size:150px;font-weight:700;line-height:1">D = ${r4.degradation === 0 ? "0" : r4.degradation}</div><div class="small">every coverage 10–30, every error rate</div></div>
          </div>
          <div class="stack" data-step="3"><div data-hair style="flex:1;min-height:0"></div>
            <div style="font-size:26px;text-align:center">The <b class="c-purple">complete</b> De Bruijn graph: 64 nodes, each with <b>4 in</b> and <b>4 out</b>.<br><span class="muted">Connected. Balanced. Yet it cannot tell you the genome.</span></div></div>
        </div>
        <div class="slide-foot" style="bottom:30px">c = 10, e = 0.001, mean of 3 replicates (pipeline CSV) · Interaction D on the next build →</div>
      </div>
      <div data-layerB style="position:absolute;inset:72px 96px 88px;display:none;flex-direction:column">
        ${head("Interaction D · exact small graphs", "Same score, very different ambiguity", '<span class="tag sim">◆ Illustration · not the genome</span>')}
        <div data-demo style="flex:1;min-height:0"></div>
        <div style="font-size:24px;text-align:center;margin-top:14px" class="muted">Every traversal uses each distinct 2-mer exactly once — all are equally valid reconstructions. Count by exhaustive enumeration (BEST theorem: (4!)⁴ / 4² = 20,736).</div>
      </div>`,
      enter(el) {
        el0 = el;
        // hairball: complete graph on 64 3-mers, edges = all 256 4-mers
        const all = []; const B = "ACGT";
        for (const a of B) for (const b of B) for (const c of B) for (const d of B) all.push(a + b + c + d);
        const g = Toy.build(all);
        const pos = new Map(); [...g.nodes.keys()].sort().forEach((id, i) => { const t = (2 * Math.PI * i) / 64 - Math.PI / 2; pos.set(id, { x: 400 + 330 * Math.cos(t), y: 360 + 330 * Math.sin(t) }); });
        hv = new GraphView(el.querySelector("[data-hair]"), { w: 800, h: 720, r: 7, labels: false, arrows: false, edgeWidth: 1, cx: 400, cy: 360 });
        hv.update(g, pos, { node: () => ({ stroke: COL.purple, fill: "#2a1846", r: 7 }), edge: () => ({ color: COL.purple, width: 1, opacity: 0.32 }) });
        this.onStep(Deck.step);
      },
      onStep(s) {
        if (!el0) return;
        const A = el0.querySelector("[data-layerA]"), Bl = el0.querySelector("[data-layerB]");
        A.style.display = s >= 4 ? "none" : "flex";
        Bl.style.display = s >= 4 ? "flex" : "none";
        if (s >= 4 && !demo) { demo = Viz.ParadoxDemo(el0.querySelector("[data-demo]")); }
      },
      leave() { if (demo) { demo.destroy(); demo = null; } hv && hv.stop(); },
      toggle() { demo && demo.play(); }, reset() { demo && demo.reset(); },
    });
  })();

  // ======================================================== 13. Why the metric fails
  (function () {
    let demo;
    const rows = [4, 5, 6, 7, 8, 9].map((k) => row("kmer_sweep_c10", 0.001, k));
    Deck.add({
      title: "Why Our Metric Fails", duration: 90, steps: 1,
      html: `${head("Saturation of the k-mer space", "Why our metric fails", "Distinct-edge model: identical k-mers collapse into <b>one</b> edge.")}
      <div class="body" style="grid-template-columns:0.95fr 1.3fr;gap:30px">
        <div class="stack">
          <div class="panel" style="padding:12px 20px"><table class="data"><tr><th>k</th><th>4ᵏ</th><th>|E|</th><th>C</th><th>I</th><th>collapsed</th><th>D</th></tr>
            ${rows.map((r) => `<tr class="${r.x <= 5 ? "hl" : ""}"><td>${r.x}</td><td>${Math.pow(4, r.x).toLocaleString("en-US")}</td><td>${Math.round(r.n_edges).toLocaleString("en-US")}</td><td>${r.components}</td><td>${Math.round(r.imbalance).toLocaleString("en-US")}</td><td>${pct(r.repeat_collapse_frac)}</td><td>${r.degradation.toFixed(3)}</td></tr>`).join("")}
          </table><div class="small" style="margin-top:6px">Lambda, c = 10, e = 0.001 · means of 3 replicates (report shows one replicate for |E|, C, I)</div></div>
          <div class="panel" style="padding:16px 22px;font-size:24px;line-height:1.5">
            <span class="math mid">4<sup><i>k</i></sup> ≪ <i>G</i></span> ⇒ almost every possible k-mer occurs ⇒ graph ≈ complete ⇒ <span class="c-cyan">C = 1</span>, <span class="c-cyan">I = 0</span> ⇒ <span class="c-cyan">D = 0</span>.<br>
            <span class="muted">Errors add nothing: every erroneous k-mer already exists. At k = 6, 43 of 4,096 6-mers never occur in lambda (under-used motifs) → small I.</span></div>
        </div>
        <div class="panel stack" style="padding:16px 22px"><span class="tag sim panel-tag">◆ Simulation · Interaction C</span><h3 style="font-size:23px">Explore k on 210 bp of lambda</h3><div data-demo style="flex:1;min-height:0"></div></div>
      </div>
      <div data-step="1" style="text-align:center;font-size:40px;font-weight:650;margin-top:18px">“Connected and balanced does <span class="c-purple">not</span> mean uniquely reconstructable.”</div>`,
      enter(el) { demo = Viz.KDemo(el.querySelector("[data-demo]")); },
      leave() { demo && demo.destroy(); },
      reset() { demo && demo.reset(); },
    });
  })();

  // ======================================================== 14. log4 G
  (function () {
    let el0;
    const kx = Math.log(G) / Math.log(4), kE = Math.log(4.6e6) / Math.log(4);
    function draw(step) {
      Charts.line(el0.querySelector('[data-chart="pow"]'), {
        x: { domain: [3, 14], ticks: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], label: "k" },
        y: { log: true, domain: [10, 3e8], ticks: [10, 1e3, 1e5, 1e7], format: (v) => "10" + "⁰¹²³⁴⁵⁶⁷⁸⁹"[Math.round(Math.log10(v))], label: "number of possible k-mers" },
        series: [{ name: "4ᵏ", color: COL.purple, markers: false, band: false, width: 4, points: Array.from({ length: 111 }, (_, i) => ({ x: 3 + i * 0.1, y: Math.pow(4, 3 + i * 0.1) })) }],
        annotations: [
          { type: "hline", y: G, color: COL.cyan, label: "λ genome G = 48,502", x: 3.2, anchor: "start" },
          { type: "vline", x: kx, color: COL.cyan, label: `k = log₄G ≈ ${kx.toFixed(1)}`, y: 2e7 },
          { type: "point", x: kx, y: G, color: COL.yellow, r: 11 },
          ...(step >= 1 ? [{ type: "hline", y: 4.6e6, color: COL.orange, dash: "3 7", label: "E. coli ≈ 4.6 Mb (future work)", x: 3.2, anchor: "start" },
            { type: "vline", x: kE, color: COL.orange, dash: "3 7", label: `≈ ${kE.toFixed(1)}`, y: 1.5e8 }] : []),
        ],
      });
      Charts.line(el0.querySelector('[data-chart="dk"]'), {
        x: { domain: [3.5, 14], ticks: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], label: "k" },
        y: { domain: [0, 0.07], ticks: [0, 0.02, 0.04, 0.06], format: (v) => v.toFixed(2), label: "D (measured)" },
        series: ESER.map(([e, name, color]) => ({ name, color, points: ser("kmer_sweep", e).filter((p) => p.x <= 15) })),
        legend: { x: 560, y: 34 },
        annotations: [{ type: "vline", x: kx, color: COL.cyan, label: `log₄G ≈ ${kx.toFixed(1)}`, y: 0.066 }],
        tooltip: tipD,
      });
    }
    Deck.add({
      title: "Why the Peak Occurs Near k = 8", duration: 60, steps: 1,
      html: `${head("Explanation", "Why the peak sits near k = 8", "Imbalance peaks when the graph is about <b>half full</b>: 4ᵏ ≈ G.")}
      <div class="body cols-2" style="gap:30px">
        ${chartPanel("pow", "4ᵏ grows past the genome length between k = 7 and 8.", null, '<span class="tag model">┄ Arithmetic</span>')}
        ${chartPanel("dk", "Measured: lambda, c = 30, 3 replicates, ±1 sd. Peak at k = 8–9 at every coverage (10–30).", null)}
      </div>
      <div style="text-align:center;margin-top:20px"><span class="math big">4<sup><i>k</i></sup> ≈ <i>G</i> &nbsp;⇒&nbsp; <i>k</i> ≈ log<sub>4</sub> <i>G</i> = log<sub>4</sub> 48,502 ≈ <span class="c-cyan">${kx.toFixed(1)}</span></span>
        <div class="small" style="margin-top:8px">Depends on genome length and composition, not coverage. <span data-step="1" class="c-orange">Prediction to test: E. coli (4.6 Mb) → k ≈ ${kE.toFixed(0)}.</span></div></div>`,
      enter(el) { el0 = el; draw(Deck.step); },
      onStep(s) { if (el0 && el0.classList.contains("active")) draw(s); },
    });
  })();

  // ======================================================== 15. What results tell us
  (function () {
    let el0;
    Deck.add({
      title: "What the Results Actually Tell Us", duration: 60, steps: 1,
      html: `${head("Verdict", "What the results actually tell us", "")}
      <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:34px;flex:1;min-height:0">
        <div class="stack" style="gap:16px">
          ${[["Coverage", "components decay exponentially", "CONFIRMED", "ok", "after the low-coverage peak", "s1"],
            ["Errors", "imbalance grows linearly", "PARTIAL", "part", "linear only while sparse", "s2"],
            ["k-mer size", "U-shaped degradation", "PARTIAL", "part", "asymmetric U · blind for k ≤ 6", "s3"]].map(([t, h, v, c, o, id]) => `
            <div class="panel" style="display:grid;grid-template-columns:240px 1fr 200px;gap:20px;align-items:center;padding:16px 22px;flex:1;min-height:0">
              <div><div style="font-size:28px;font-weight:600">${t}</div><div class="small">${h}</div></div>
              <div data-chart="${id}" style="height:100%;min-height:120px"></div>
              <div><span class="verdict ${c}">${v}</span><div class="small" style="margin-top:8px">${o}</div></div></div>`).join("")}
        </div>
        <div class="stack" data-step="1" style="gap:16px">
          <div style="font-size:28px">Three different properties:</div>
          <div class="panel" style="border-color:${COL.cyan}"><h3 class="c-cyan">1 · An Eulerian traversal exists</h3><div class="small">C = 1 and balanced (I ≤ 2). <b class="c-cyan">This is what D measures.</b></div></div>
          <div class="panel" style="border-color:${COL.purple}"><h3 class="c-purple">2 · The traversal is unique</h3><div class="small">Needs branching / repeat structure. <b class="c-purple">Invisible to D.</b></div></div>
          <div class="panel"><h3>3 · The sequence is correct</h3><div class="small">Needs comparison to the reference genome.</div></div>
          <div style="font-size:24px;color:var(--ink-2);margin-top:auto">Our index measures <b>topology</b>, not <b>reconstruction ambiguity</b>.</div>
        </div>
      </div>`,
      enter(el) {
        el0 = el;
        const spark = (box, o) => Charts.line(box, Object.assign({ margin: { l: 10, r: 10, t: 10, b: 10 } }, o));
        spark(el.querySelector('[data-chart="s1"]'), { x: { domain: [0, 31], ticks: [] }, y: { log: true, domain: [0.7, 500], ticks: [] }, series: [{ name: "k=31", color: COL.cyan, points: ser("coverage_sweep", 31, "components"), r: 3.5 }] });
        spark(el.querySelector('[data-chart="s2"]'), { x: { domain: [0, 0.021], ticks: [] }, y: { domain: [0, 34000], ticks: [] }, series: [{ name: "I", color: COL.orange, points: ser("error_sweep", null, "imbalance"), r: 3.5 }] });
        spark(el.querySelector('[data-chart="s3"]'), { x: { log: true, domain: [3.7, 104], ticks: [] }, y: { domain: [0, 0.45], ticks: [] }, series: [{ name: "D", color: COL.yellow, points: ser("kmer_sweep", 0.001), r: 3.5 }], annotations: [{ type: "rect", x0: 3.7, x1: 6.5, color: COL.purple, opacity: 0.25 }] });
      },
    });
  })();

  // ======================================================== 16. Conclusion
  (function () {
    const lf = life();
    let v, seedN = 0;
    Deck.add({
      title: "Conclusion and Future Work", duration: 60, steps: 2,
      html: `${head("Conclusion", "What we contribute", "")}
      <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:40px;flex:1;min-height:0">
        <div class="stack" style="gap:18px">
          ${["<b class='c-cyan'>Coverage</b> controls connectivity — Lander–Waterman predicts the peak and the decay.",
            "<b class='c-orange'>Substitutions</b> create imbalance ≈ 2 each, until their k-windows overlap.",
            "<b class='c-purple'>k-mer size</b> has two competing failure modes, split near log₄ G.",
            "<b>Structural metrics alone</b> do not describe assembly quality."].map((t, i) => `<div style="display:flex;gap:18px;font-size:29px;line-height:1.35"><span class="mono" style="color:#4b5975">0${i + 1}</span><span>${t}</span></div>`).join("")}
          <div class="panel" data-step="1" style="margin-top:8px"><h3 style="font-size:24px">Future work</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 26px;font-size:22px;color:var(--ink-2)">
              <span>• ambiguity-aware term (branching nodes)</span><span>• repeat & branching structure analysis</span>
              <span>• compare D with reconstruction accuracy</span><span>• larger genome: E. coli (k-peak → ≈ 11)</span>
              <span>• k-mer count filtering / error correction</span></div></div>
        </div>
        <div class="stack"><div data-g style="flex:1;min-height:0"></div><div class="mono c-purple" data-sp style="font-size:24px;text-align:center;min-height:34px"></div></div>
      </div>
      <div data-step="2" style="text-align:center;font-size:40px;font-weight:600;margin-top:12px">“A graph can be perfectly Eulerian and still fail to uniquely describe the genome.”</div>`,
      enter(el) {
        const all2 = []; for (const a of "ACGT") for (const b of "ACGT") all2.push(a + b);
        const g = Toy.build(all2);
        const W = 640, H = 460;
        const pos = new Map([["A", { x: W / 2 - 140, y: H / 2 - 120 }], ["C", { x: W / 2 + 140, y: H / 2 - 120 }], ["G", { x: W / 2 + 140, y: H / 2 + 120 }], ["T", { x: W / 2 - 140, y: H / 2 + 120 }]]);
        v = new GraphView(el.querySelector("[data-g]"), { w: W, h: H, r: 32, labelSize: 24, cx: W / 2, cy: H / 2, dur: 300 });
        const run = () => {
          const tr = Toy.randomEulerCircuit(g, "A", 500 + (seedN++) * 131);
          let i = 0;
          const lit = new Set();
          const t = setInterval(() => {
            if (i >= tr.edges.length) { clearInterval(t); return; }
            lit.add(tr.edges[i].id);
            v.update(g, pos, { node: () => ({ stroke: COL.purple, fill: "#1d1233" }), edge: (e) => ({ color: lit.has(e.id) ? COL.cyan : "#3a3157", width: lit.has(e.id) ? 3.2 : 2 }) });
            el.querySelector("[data-sp]").textContent = tr.seq.slice(0, i + 2);
            i++;
          }, 170);
          lf.add(() => clearInterval(t));
        };
        run(); lf.every(run, 4200);
      },
      leave() { lf.clear(); v && v.stop(); },
    });
  })();
})();
