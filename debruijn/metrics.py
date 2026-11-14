"""Degradation metrics and the normalized degradation index.

The index combines the proposal's two structural metrics, each normalized to
[0, 1] and exactly 0 in the ideal case (error-free reads, every genome k-mer
sampled, circular genome):

* ``frag_term``      = ln C / ln |V|     (C = # weakly connected components)
* ``imbalance_term`` = I / (2|E|)        (I = sum_v |in(v) - out(v)|)

The fragmentation term is log-scaled because C varies over orders of
magnitude; a linear ratio such as 1 - 1/C saturates after a few breaks.

Normalized degradation index:

    D = w_f * frag + w_i * imbalance,   with w_f + w_i = 1 (default 1/2 each).

For a linear genome the ideal imbalance is 2 (start and end node), so D is
~0 rather than exactly 0. Dead ends, Euler checks and ground-truth k-mer
fractions are reported as diagnostics but are not part of D.
"""

from __future__ import annotations

import math

from .euler import assemble_eulerian
from .graph import DeBruijnGraph

DEFAULT_WEIGHTS = {"frag": 0.5, "imbalance": 0.5}


def genome_kmers(genome: str, k: int, circular: bool = True) -> list[str]:
    ext = genome + genome[: k - 1] if circular else genome
    n = len(genome) if circular else len(genome) - k + 1
    return [ext[i:i + k] for i in range(n)]


def degradation_index(terms: dict, weights: dict | None = None) -> float:
    w = dict(DEFAULT_WEIGHTS)
    if weights:
        unknown = set(weights) - set(DEFAULT_WEIGHTS)
        if unknown:
            raise ValueError(f"unknown degradation weights {sorted(unknown)}; "
                             f"valid: {sorted(DEFAULT_WEIGHTS)}")
        w.update(weights)
    total = sum(w.values())
    return sum(w[name] * terms[f"{name}_term"] for name in w) / total


def _is_rotation(seq: str, genome: str) -> bool:
    return len(seq) == len(genome) and seq in genome + genome


def compute_metrics(
    g: DeBruijnGraph,
    genome: str | None = None,
    circular: bool = True,
    weights: dict | None = None,
    run_euler: bool = True,
) -> dict:
    """Return the formula metrics first, then the correctness-check metrics."""
    m: dict = {"n_nodes": g.n_nodes, "n_edges": g.n_edges}
    if g.n_edges == 0:
        m.update(components=0, imbalance=0, frag_term=1.0, imbalance_term=1.0,
                 degradation=1.0)
        return m

    # sanity invariants: handshake lemma for directed graphs
    sum_out = sum(len(o) for o in g.out_adj.values())
    sum_in = sum(g.in_deg.values())
    assert sum_out == sum_in == g.n_edges, "edge/degree conservation violated"

    # --- degradation index: D = w_f * ln C / ln|V| + w_i * I / (2|E|)
    comps = g.weak_components()
    C = len(comps)
    m["components"] = C
    m["imbalance"] = g.imbalance()
    m["frag_term"] = math.log(C) / math.log(g.n_nodes) if g.n_nodes > 1 else 0.0
    m["imbalance_term"] = m["imbalance"] / (2 * g.n_edges)
    m["degradation"] = degradation_index(m, weights)

    # --- correctness-check metrics (see tests/test_correctness.py)
    # Eulerian traversal per component; reconstructed = Euler path spells the genome
    if run_euler:
        eu = assemble_eulerian(g, comps)["components"]
        m["reconstructed"] = False
        if genome is not None and C == 1 and eu[0]["eulerian"]:
            seq = eu[0]["sequence"]
            m["reconstructed"] = _is_rotation(seq, genome) if circular else seq == genome

    m["dead_ends"] = g.degree_classes()["dead_ends"]

    # ground-truth comparison
    if genome is not None:
        true = genome_kmers(genome, g.k, circular)
        true_set = set(true)
        obs = g.counts.keys()
        hit = sum(1 for km in true_set if km in g.counts)
        m["true_kmers"] = len(true_set)
        m["missing_kmer_frac"] = 1 - hit / len(true_set)
        m["spurious_kmer_frac"] = (len(obs) - hit) / len(obs)
        m["repeat_collapse_frac"] = 1 - len(true_set) / len(true)
    return m
