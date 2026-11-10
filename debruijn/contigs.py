"""Contig extraction as maximal non-branching paths (unitigs)."""

from __future__ import annotations

from .euler import spell_path
from .graph import DeBruijnGraph


def unitigs(g: DeBruijnGraph) -> list[tuple[str, bool]]:
    """Maximal non-branching paths (Compeau & Pevzner), incl. isolated cycles.

    Returns a list of ``(sequence, is_cycle)``. For a cycle the sequence is the
    cyclic sequence of length = number of edges.
    """
    def one_in_one_out(v: str) -> bool:
        return g.in_degree(v) == 1 and g.out_degree(v) == 1

    contigs: list[tuple[str, bool]] = []
    used_nodes_in_paths: set[str] = set()
    for v, outs in g.out_adj.items():
        if one_in_one_out(v):
            continue
        for w in outs:
            path = [v, w]
            while one_in_one_out(w):
                used_nodes_in_paths.add(w)
                w = g.out_adj[w][0]
                path.append(w)
            contigs.append((spell_path(path), False))
    # isolated cycles: all nodes 1-in-1-out and not yet visited
    visited = set(used_nodes_in_paths)
    for v in g.out_adj:
        if v in visited or not one_in_one_out(v):
            continue
        cyc = [v]
        visited.add(v)
        w = g.out_adj[v][0]
        while w != v:
            cyc.append(w)
            visited.add(w)
            w = g.out_adj[w][0]
        contigs.append(("".join(x[0] for x in cyc), True))
    return contigs


def nx_stat(lengths: list[int], total: int, x: float = 0.5) -> int:
    """NGx-style statistic: largest length L such that contigs >= L sum to x*total."""
    acc = 0
    for L in sorted(lengths, reverse=True):
        acc += L
        if acc >= x * total:
            return L
    return 0
