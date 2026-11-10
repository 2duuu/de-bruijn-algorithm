"""Degradation metrics and the normalized degradation index.

All terms below are normalized to [0, 1] and are exactly 0 for the ideal
case (error-free reads, every genome k-mer sampled, k larger than the longest
repeat, circular genome):

* ``frag_term``       = ln C / ln |V|           (C = # weakly connected components)
* ``imbalance_term``  = I / (2|E|)              (I = sum_v |in(v) - out(v)|)
* ``ambiguity_term``  = B / |V|                 (B = # branching nodes, in>1 or out>1)
* ``contiguity_term`` = 1 - ln NG50 / ln G      (NG50 of unitigs vs genome length G)

The two log-scaled terms are used because C and NG50 vary over orders of
magnitude; a linear ratio saturates as soon as a handful of breaks appear.

Normalized degradation index:

    D = w_f * frag + w_i * imbalance + w_a * ambiguity + w_c * contiguity,
    with sum(w) = 1 (default: equal weights 1/4).

For a linear genome the ideal imbalance is 2 (start and end node) and the
ideal NG50 is ~G, so D is ~0 rather than exactly 0.
"""

from __future__ import annotations

import math

from .contigs import nx_stat, unitigs
from .euler import assemble_eulerian
from .graph import DeBruijnGraph

DEFAULT_WEIGHTS = {"frag": 0.25, "imbalance": 0.25, "ambiguity": 0.25, "contiguity": 0.25}


def genome_kmers(genome: str, k: int, circular: bool = True) -> list[str]:
    ext = genome + genome[: k - 1] if circular else genome
    n = len(genome) if circular else len(genome) - k + 1
    return [ext[i:i + k] for i in range(n)]


def degradation_index(terms: dict, weights: dict | None = None) -> float:
    w = dict(DEFAULT_WEIGHTS)
    if weights:
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
    m: dict = {"n_nodes": g.n_nodes, "n_edges": g.n_edges}
    if g.n_edges == 0:
        m.update(components=0, imbalance=0, frag_term=1.0, imbalance_term=1.0,
                 ambiguity_term=1.0, contiguity_term=1.0, degradation=1.0)
        return m

    comps = g.weak_components()
    C = len(comps)
    m["components"] = C
    m["largest_component_frac"] = max(len(c) for c in comps) / g.n_nodes
    m["imbalance"] = g.imbalance()
    m.update(g.degree_classes())

    # sanity invariants: handshake lemma for directed graphs
    sum_out = sum(len(o) for o in g.out_adj.values())
    sum_in = sum(g.in_deg.values())
    assert sum_out == sum_in == g.n_edges, "edge/degree conservation violated"

    # Eulerian traversal per component
    if run_euler:
        eu = assemble_eulerian(g, comps)["components"]
        m["eulerian_components"] = sum(r["eulerian"] for r in eu)
        m["eulerian_frac"] = m["eulerian_components"] / C
        m["reconstructed"] = False
        if genome is not None and C == 1 and eu[0]["eulerian"]:
            seq = eu[0]["sequence"]
            m["reconstructed"] = _is_rotation(seq, genome) if circular else seq == genome

    # contigs (unitigs)
    ctgs = unitigs(g)
    lengths = [len(s) for s, _ in ctgs]
    m["n_contigs"] = len(ctgs)
    m["max_contig"] = max(lengths) if lengths else 0
    G = len(genome) if genome is not None else sum(lengths)
    m["ng50"] = nx_stat(lengths, G, 0.5)

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

    # normalized terms and composite index
    m["frag_term"] = math.log(C) / math.log(g.n_nodes) if g.n_nodes > 1 else 0.0
    m["imbalance_term"] = m["imbalance"] / (2 * g.n_edges)
    m["ambiguity_term"] = m["branching"] / g.n_nodes
    ng50 = min(max(m["ng50"], 1), G)
    m["contiguity_term"] = 1 - math.log(ng50) / math.log(G)
    m["degradation"] = degradation_index(m, weights)
    return m
