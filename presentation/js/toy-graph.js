/* Small helper used ONLY by the on-screen demonstrations (toy sequences of a
   few hundred bases). It mirrors the conventions of the real pipeline in
   debruijn/graph.py + debruijn/metrics.py (nodes = (k-1)-mers, one edge per
   DISTINCT k-mer, weak components, I = Σ|in-out|, D = ½ lnC/ln|V| + ½ I/(2|E|))
   so the numbers shown in the demos are computed the same way.
   All experimental results in the deck come from the real pipeline's CSVs. */
(function () {
  "use strict";

  // First 210 bp of Enterobacteria phage lambda, NC_001416.1 (data/phage_lambda/NC_001416.fasta)
  const LAMBDA_EXCERPT =
    "GGGCGGCGACCTCGCGGGTTTTCGCTATTTATGAAAATTTTCCGGTTTAAGGCGTTTCCGTTCTTCTTCG" +
    "TCATAACTTAATGTTTTTATTTAAAATACCCTCTGAAAAGAAAGGAAACGACAGGTGCTGAAAGCGAGGC" +
    "TTTTTGGCCTCTGTCGTTTCCTTTCTCTGTTTTTGTCCGTGGAATGAACAATGGAAGTCAACAAAAAGCA";

  function rng(seed) { // mulberry32: reproducible demo randomness
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function kmersOf(seq, k) {
    const out = [];
    for (let i = 0; i + k <= seq.length; i++) out.push(seq.slice(i, i + k));
    return out;
  }

  /** Distinct-edge De Bruijn graph + the three metrics. */
  function build(kmerList) {
    const counts = new Map();
    for (const km of kmerList) counts.set(km, (counts.get(km) || 0) + 1);
    const nodes = new Map();
    const node = (l) => {
      let n = nodes.get(l);
      if (!n) { n = { id: l, in: 0, out: 0, comp: -1 }; nodes.set(l, n); }
      return n;
    };
    const edges = [];
    for (const [km, c] of counts) {
      const u = node(km.slice(0, -1)), v = node(km.slice(1));
      u.out++; v.in++;
      edges.push({ id: km, u: u.id, v: v.id, count: c });
    }
    // weak components via union-find
    const parent = new Map();
    for (const id of nodes.keys()) parent.set(id, id);
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    for (const e of edges) { const a = find(e.u), b = find(e.v); if (a !== b) parent.set(a, b); }
    const compIds = new Map();
    for (const n of nodes.values()) {
      const r = find(n.id);
      if (!compIds.has(r)) compIds.set(r, compIds.size);
      n.comp = compIds.get(r);
    }
    let I = 0;
    for (const n of nodes.values()) I += Math.abs(n.in - n.out);
    const V = nodes.size, E = edges.length, C = compIds.size;
    let D = null, frag = null, imb = null;
    if (E > 0) { // degenerate graphs: no edges -> D undefined (pipeline reports 1.0)
      frag = V > 1 ? Math.log(C) / Math.log(V) : 0;
      imb = I / (2 * E);
      D = 0.5 * frag + 0.5 * imb;
    }
    const repeated = [...counts.values()].filter((c) => c > 1).length;
    return { nodes, edges, counts, V, E, C, I, D, frag, imb, repeated };
  }

  /** Reads with uniform starts; the first N starts never change as coverage grows. */
  function readStarts(G, L, maxN, seed) {
    const r = rng(seed), out = [];
    for (let i = 0; i < maxN; i++) out.push(Math.floor(r() * (G - L + 1)));
    return out;
  }

  /** Count Eulerian circuits by exhaustive backtracking (small graphs only).
      Returns {linear, cyclic}: linear = edge sequences starting at `start`;
      cyclic = distinct circuits up to rotation = linear / outdeg(start). */
  function countEulerCircuits(g, start) {
    const adj = new Map();
    for (const n of g.nodes.keys()) adj.set(n, []);
    g.edges.forEach((e, i) => adj.get(e.u).push({ v: e.v, i }));
    const used = new Uint8Array(g.edges.length);
    let linear = 0;
    (function dfs(u, depth) {
      if (depth === g.edges.length) { if (u === start) linear++; return; }
      for (const { v, i } of adj.get(u)) {
        if (used[i]) continue;
        used[i] = 1; dfs(v, depth + 1); used[i] = 0;
      }
    })(start, 0);
    return { linear, cyclic: linear / g.nodes.get(start).out };
  }

  /** A random Eulerian circuit from `start` (Hierholzer, randomized edge order). */
  function randomEulerCircuit(g, start, seed) {
    const r = rng(seed);
    const adj = new Map();
    for (const n of g.nodes.keys()) adj.set(n, []);
    g.edges.forEach((e) => adj.get(e.u).push(e));
    for (const list of adj.values()) for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    const stack = [{ node: start, edge: null }], path = [];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const list = adj.get(top.node);
      if (list.length) { const e = list.pop(); stack.push({ node: e.v, edge: e }); }
      else { stack.pop(); if (top.edge) path.push(top.edge); }
    }
    path.reverse();
    const seq = start + path.map((e) => e.id.slice(-1)).join("");
    return { edges: path, seq };
  }

  /** Deterministic Fruchterman–Reingold layout with warm start from `prev`. */
  function layout(g, w, h, opts = {}) {
    const prev = opts.prev || new Map();
    const r = rng(opts.seed || 7);
    const ids = [...g.nodes.keys()];
    const pos = new Map();
    ids.forEach((id) => {
      const p = prev.get(id);
      pos.set(id, p ? { x: p.x, y: p.y } : { x: w * (0.15 + 0.7 * r()), y: h * (0.15 + 0.7 * r()) });
    });
    const n = ids.length || 1;
    const kk = (opts.spacing || 1) * Math.sqrt((w * h) / n) * 0.75;
    const iters = opts.iters || 260;
    let temp = opts.prev && opts.prev.size ? w * 0.03 : w * 0.12;
    const P = ids.map((id) => pos.get(id));
    const idx = new Map(ids.map((id, i) => [id, i]));
    const E = g.edges.filter((e) => e.u !== e.v).map((e) => [idx.get(e.u), idx.get(e.v)]);
    for (let it = 0; it < iters; it++) {
      const dx = new Float64Array(n), dy = new Float64Array(n);
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        let ex = P[i].x - P[j].x, ey = P[i].y - P[j].y;
        let d2 = ex * ex + ey * ey || 0.01;
        const f = (kk * kk) / d2;
        dx[i] += ex * f; dy[i] += ey * f; dx[j] -= ex * f; dy[j] -= ey * f;
      }
      for (const [a, b] of E) {
        const ex = P[a].x - P[b].x, ey = P[a].y - P[b].y;
        const d = Math.sqrt(ex * ex + ey * ey) || 0.01;
        const f = d / kk;
        dx[a] -= ex * f; dy[a] -= ey * f; dx[b] += ex * f; dy[b] += ey * f;
      }
      for (let i = 0; i < P.length; i++) {
        // gentle gravity keeps disconnected islands on screen
        dx[i] += (w / 2 - P[i].x) * 0.02 * kk / 40; dy[i] += (h / 2 - P[i].y) * 0.02 * kk / 40;
        const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
        const m = Math.min(d, temp);
        P[i].x = Math.max(-w, Math.min(2 * w, P[i].x + (dx[i] / d) * m));
        P[i].y = Math.max(-h, Math.min(2 * h, P[i].y + (dy[i] / d) * m));
      }
      temp *= 0.985;
    }
    // fit the result into the box (uniform scale, centred) so nothing hugs the edges
    if (P.length > 1 && !opts.noFit) {
      const pad = opts.pad || 40;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      const s = Math.min((w - 2 * pad) / Math.max(1, x1 - x0), (h - 2 * pad) / Math.max(1, y1 - y0));
      const ox = (w - s * (x1 - x0)) / 2, oy = (h - s * (y1 - y0)) / 2;
      for (const p of P) { p.x = ox + (p.x - x0) * s; p.y = oy + (p.y - y0) * s; }
    }
    return pos;
  }

  window.Toy = { LAMBDA_EXCERPT, rng, kmersOf, build, readStarts, countEulerCircuits, randomEulerCircuit, layout };
})();
