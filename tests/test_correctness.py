"""Correctness checks from the proposal (section 'Correctness check')."""

import random

import pytest

from debruijn import (DeBruijnGraph, compute_metrics, eulerian_path, plant_repeats,
                      random_genome, simulate_reads, spell_path, tile_reads)
from debruijn.euler import assemble_eulerian, euler_condition
from debruijn.pipeline import run_config
import math

K = 21
L = 100


# --------------------------------------------------------------------- basics
def test_euler_on_textbook_graph():
    # short sequence with repeated 3-mer *nodes* (branching) but unique 4-mers
    s = "AACAACTTTAGCAAAT"
    kmers = [s[i:i + 4] for i in range(len(s) - 3)]
    assert len(set(kmers)) == len(kmers)
    g = DeBruijnGraph.from_kmers(kmers)
    assert g.degree_classes()["branching"] > 0
    ok, start = euler_condition(g, g.nodes)
    assert ok
    path = eulerian_path(g, start)
    assert len(path) == g.n_edges + 1
    spelled = spell_path(path)
    # any Eulerian path spells a string with exactly the same 3-mer multiset
    assert sorted(spelled[i:i + 4] for i in range(len(spelled) - 3)) == sorted(g.counts)


def test_degree_conservation_and_nodes():
    genome = random_genome(3000, seed=1)
    reads, _ = simulate_reads(genome, 20, L, 0.01, seed=2)
    g = DeBruijnGraph.from_reads(reads, K)
    assert sum(g.out_degree(v) for v in g.nodes) == g.n_edges
    assert sum(g.in_degree(v) for v in g.nodes) == g.n_edges
    assert sum(g.out_degree(v) - g.in_degree(v) for v in g.nodes) == 0
    assert g.imbalance() % 2 == 0


# ------------------------------------------- check 1: error-free, high coverage
@pytest.mark.parametrize("circular", [True, False])
def test_error_free_high_coverage(circular):
    genome = random_genome(5000, seed=3)
    reads, _ = simulate_reads(genome, 50, L, 0.0, circular=circular, seed=4)
    g = DeBruijnGraph.from_reads(reads, K)
    m = compute_metrics(g, genome, circular=circular)
    assert m["components"] == 1
    assert m["imbalance"] == (0 if circular else 2)  # only start/end for linear
    if circular:
        # (for a linear genome the extreme k-mers are only covered by a read
        #  starting exactly at the end, so exact recovery uses tiled reads below)
        assert m["missing_kmer_frac"] == 0
        assert m["reconstructed"]                     # Euler circuit == genome
        assert m["degradation"] == 0.0


def test_tiled_reads_exact_reconstruction():
    genome = random_genome(4000, seed=5)
    g = DeBruijnGraph.from_reads(tile_reads(genome, L, step=10, circular=False), K)
    res = assemble_eulerian(g)["components"]
    assert len(res) == 1 and res[0]["eulerian"] and res[0]["sequence"] == genome


# ----------------------------------- check 2: controlled point mutations
def _mutated_dataset(n_mut, where, seed=0):
    """Perfect tiled reads + one extra read per mutation with one substitution.

    Mutations sit at distinct genome loci at least 3k apart. ``where`` selects
    the error position inside the extra read: 'middle' -> bubble, 'end' -> tip.
    """
    rng = random.Random(seed)
    genome = random_genome(20000, seed=seed)
    reads = tile_reads(genome, L, step=5)
    loci = rng.sample(range(L, len(genome) - 2 * L, 3 * K), n_mut)
    for s in loci:
        read = list(genome[s:s + L])
        p = L // 2 if where == "middle" else L - 1
        read[p] = rng.choice([b for b in "ACGT" if b != read[p]])
        reads.append("".join(read))
    return genome, reads


@pytest.mark.parametrize("n_mut", [0, 1, 5, 20, 50])
def test_mutations_middle_create_bubbles(n_mut):
    genome, reads = _mutated_dataset(n_mut, "middle")
    g = DeBruijnGraph.from_reads(reads, K)
    m = compute_metrics(g, genome)
    assert m["n_edges"] - m["true_kmers"] == K * n_mut       # k novel k-mers / error
    assert m["imbalance"] == 2 * n_mut                       # diverge + rejoin
    assert g.degree_classes()["branching"] == 2 * n_mut
    assert m["dead_ends"] == 0


@pytest.mark.parametrize("n_mut", [1, 5, 20, 50])
def test_mutations_at_read_end_create_tips(n_mut):
    genome, reads = _mutated_dataset(n_mut, "end")
    g = DeBruijnGraph.from_reads(reads, K)
    m = compute_metrics(g, genome)
    assert m["n_edges"] - m["true_kmers"] == n_mut           # only the last k-mer
    assert m["imbalance"] == 2 * n_mut
    assert m["dead_ends"] == n_mut                           # one tip per error


def test_kmer_cutoff_removes_errors():
    genome = random_genome(10000, seed=7)
    reads, info = simulate_reads(genome, 40, L, 0.002, seed=8)
    noisy = compute_metrics(DeBruijnGraph.from_reads(reads, K), genome)
    clean = compute_metrics(DeBruijnGraph.from_reads(reads, K, min_count=3), genome)
    assert noisy["imbalance"] > 0
    assert clean["spurious_kmer_frac"] < noisy["spurious_kmer_frac"]
    assert clean["imbalance"] < noisy["imbalance"] / 10


# -------------------------------------------- check 3: exact repeat threshold
@pytest.mark.parametrize("R", [20, 35])
def test_repeat_collapse_threshold(R):
    genome = plant_repeats(random_genome(6000, seed=9), [{"length": R, "copies": 2}], seed=10)
    reads = tile_reads(genome, 120, step=3)
    for k in range(R - 4, R + 5):
        g = DeBruijnGraph.from_reads(reads, k)
        m = compute_metrics(g, genome)
        # duplicate k-mers exist iff k <= R ...
        assert (m["repeat_collapse_frac"] > 0) == (k <= R), k
        # ... and the graph branches iff a (k-1)-mer node repeats, i.e. k <= R+1
        assert (g.degree_classes()["branching"] > 0) == (k <= R + 1), k
        # Euler circuit recovers the genome once no k-mer is collapsed (k > R).
        # At k = R+1 the repeat node is balanced (in=out=2) and, on a circle
        # with two copies, both Euler circuits spell the same cyclic genome.
        assert m["reconstructed"] == (k > R), k


# --------------------------------------------------- check 4: sweep invariants
def test_components_decrease_with_coverage():
    G = 30000
    means = []
    for c in [1, 2, 4, 8, 16]:
        vals = [run_config({"genome": {"length": G}, "coverage": c, "k": K, "seed": s,
                            "run_euler": False})["components"] for s in range(3)]
        mean = sum(vals) / len(vals)
        means.append(mean)
        # Lander-Waterman: expected k-mer islands ~ N * exp(-c (L-k+1) / L)
        expected = max(1.0, G * (1 - math.exp(-c / L)) * math.exp(-c / L * (L - K + 1)))
        if expected > 20:  # Poisson regime: within 25% of Lander-Waterman
            assert abs(mean - expected) / expected < 0.25, (c, mean, expected)
    assert all(a >= b for a, b in zip(means, means[1:]))
    assert means[-1] == 1


def test_imbalance_matches_two_per_error():
    G, c = 20000, 20
    for e in [0.001, 0.003]:
        m = run_config({"genome": {"length": G}, "coverage": c, "k": K, "error_rate": e,
                        "seed": 1, "run_euler": False})
        expected = 2 * e * c * G  # each isolated error unbalances 2 nodes
        assert abs(m["imbalance"] - expected) / expected < 0.1
        # ~2 per realised error (errors < k apart in one read share a structure)
        assert 1.7 * m["n_errors"] <= m["imbalance"] <= 2 * m["n_errors"]
