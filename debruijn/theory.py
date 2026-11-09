"""Closed-form expectations used as overlays / sanity checks."""

from __future__ import annotations

import math


def expected_components(G: int, c: float, L: int, k: int, circular: bool = True) -> float:
    """Lander-Waterman style expected # of k-mer islands (error-free reads).

    A k-mer is covered iff a read starts in a window of w = L-k+1 positions.
    With N = cG/L reads (Poisson starts, rate lambda = N/G = c/L per base) the
    expected number of covered->uncovered transitions is
        G * (1 - e^{-lambda}) * e^{-lambda w}  ~  N * exp(-c (L-k+1) / L).
    A circular genome with no gap is a single component.
    """
    lam = c / L
    w = L - k + 1
    islands = G * (1 - math.exp(-lam)) * math.exp(-lam * w)
    return max(1.0, islands)


def expected_imbalance_errors(G: int, c: float, e: float, k: int, L: int) -> float:
    """First-order expected imbalance created by substitution errors: 2 e c G.

    Every isolated error yields one bubble (error inside the read) or one tip
    (error within k-1 bases of a read end). Either way exactly two nodes become
    unbalanced by 1, so I = 2 * #errors and E[#errors] = e * N * L = e c G.
    Higher-order effects make the real curve sub-linear at large e: errors
    closer than k in one read share a single structure, identical errors in
    different reads share k-mers, and one error's re-join node can coincide
    with another error's branch node (in = out = 2 is balanced again).
    """
    return 2 * e * c * G


def expected_kmer_coverage(c: float, L: int, k: int, e: float = 0.0) -> float:
    """Mean multiplicity of an error-free genome k-mer."""
    return c * (L - k + 1) / L * (1 - e) ** k
