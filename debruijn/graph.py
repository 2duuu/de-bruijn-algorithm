"""De Bruijn graph: nodes are (k-1)-mers, edges are k-mers.

Every distinct k-mer observed in the reads (at least ``min_count`` times)
becomes one directed edge prefix -> suffix. The k-mer multiplicity is kept as
an edge attribute (``counts``) but the topology - degrees, imbalance, Euler
paths - is computed on *distinct* edges, which is the classic Pevzner (2001)
formulation.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Iterable


class DeBruijnGraph:
    def __init__(self, k: int):
        if k < 2:
            raise ValueError("k must be >= 2")
        self.k = k
        self.counts: Counter[str] = Counter()
        self.out_adj: dict[str, list[str]] = {}
        self.in_deg: dict[str, int] = {}

    # ------------------------------------------------------------------ build
    @classmethod
    def from_reads(cls, reads: Iterable[str], k: int, min_count: int = 1) -> "DeBruijnGraph":
        g = cls(k)
        counts = g.counts
        for r in reads:
            for i in range(len(r) - k + 1):
                counts[r[i:i + k]] += 1
        if min_count > 1:
            g.counts = Counter({km: c for km, c in counts.items() if c >= min_count})
        g._build_adjacency()
        return g

    @classmethod
    def from_kmers(cls, kmers: Iterable[str]) -> "DeBruijnGraph":
        kmers = list(kmers)
        g = cls(len(kmers[0]))
        g.counts = Counter(kmers)
        g._build_adjacency()
        return g

    def _build_adjacency(self) -> None:
        out_adj: dict[str, list[str]] = defaultdict(list)
        in_deg: dict[str, int] = defaultdict(int)
        for km in self.counts:
            u, v = km[:-1], km[1:]
            out_adj[u].append(v)
            in_deg[v] += 1
            out_adj.setdefault(v, [])
            in_deg.setdefault(u, 0)
        self.out_adj = dict(out_adj)
        self.in_deg = dict(in_deg)

    # ------------------------------------------------------------- accessors
    @property
    def nodes(self) -> list[str]:
        return list(self.out_adj)

    @property
    def n_nodes(self) -> int:
        return len(self.out_adj)

    @property
    def n_edges(self) -> int:
        return len(self.counts)

    def out_degree(self, v: str) -> int:
        return len(self.out_adj.get(v, ()))

    def in_degree(self, v: str) -> int:
        return self.in_deg.get(v, 0)

    def in_adj(self) -> dict[str, list[str]]:
        rev: dict[str, list[str]] = {v: [] for v in self.out_adj}
        for u, vs in self.out_adj.items():
            for v in vs:
                rev[v].append(u)
        return rev

    # -------------------------------------------------------------- topology
    def weak_components(self) -> list[list[str]]:
        """Weakly connected components (iterative DFS on the undirected graph)."""
        rev = self.in_adj()
        seen: set[str] = set()
        comps = []
        for s in self.out_adj:
            if s in seen:
                continue
            seen.add(s)
            stack, comp = [s], []
            while stack:
                u = stack.pop()
                comp.append(u)
                for w in self.out_adj[u]:
                    if w not in seen:
                        seen.add(w)
                        stack.append(w)
                for w in rev[u]:
                    if w not in seen:
                        seen.add(w)
                        stack.append(w)
            comps.append(comp)
        return comps

    def imbalance(self) -> int:
        """Total imbalance  sum_v |in(v) - out(v)|  (0 <=> Eulerian circuits)."""
        return sum(abs(self.in_degree(v) - len(o)) for v, o in self.out_adj.items())

    def degree_classes(self) -> dict[str, int]:
        """Count structural node types.

        * dead_ends: nodes with in+out == 1 (tip ends: source or sink of degree 1)
        * branching: in > 1 or out > 1 (repeats, bubbles, tips; used by the tests)
        """
        dead = branching = 0
        for v, o in self.out_adj.items():
            i, out = self.in_degree(v), len(o)
            if i + out == 1:
                dead += 1
            if i > 1 or out > 1:
                branching += 1
        return {"dead_ends": dead, "branching": branching}

    def __repr__(self) -> str:
        return f"DeBruijnGraph(k={self.k}, nodes={self.n_nodes}, edges={self.n_edges})"
