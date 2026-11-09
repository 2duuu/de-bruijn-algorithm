"""Reference genome generation / loading."""

from __future__ import annotations

import random
from typing import Iterable

BASES = "ACGT"


def random_genome(length: int, seed: int | None = None, gc: float = 0.5) -> str:
    """Uniform i.i.d. random genome with the given GC content."""
    rng = random.Random(seed)
    at, cg = (1 - gc) / 2, gc / 2
    return "".join(rng.choices(BASES, weights=[at, cg, cg, at], k=length))


def plant_repeats(genome: str, repeats: Iterable[dict], seed: int | None = None) -> str:
    """Insert exact repeats into ``genome`` (overwriting, length is preserved).

    Each repeat spec is ``{"length": R, "copies": n}``. Copies are placed at
    non-overlapping random positions and the flanking bases of every copy are
    forced to differ, so the repeat is *exactly* ``R`` bp long (it is not
    accidentally extended by matching neighbours).
    """
    rng = random.Random(seed)
    g = list(genome)
    n = len(g)
    used: list[tuple[int, int]] = []  # occupied intervals incl. flanks

    def free(a: int, b: int) -> bool:
        return all(b < u0 or a > u1 for u0, u1 in used)

    for spec in repeats:
        R, copies = int(spec["length"]), int(spec.get("copies", 2))
        unit = random_genome(R, seed=rng.randrange(1 << 30))
        positions = []
        for _ in range(copies):
            for _attempt in range(10_000):
                p = rng.randrange(1, n - R - 1)
                if free(p - 2, p + R + 1):
                    break
            else:
                raise ValueError("could not place repeat; genome too small")
            used.append((p - 2, p + R + 1))
            g[p:p + R] = unit
            positions.append(p)
        # make the flanks pairwise distinct so the repeat is exactly R bp
        for side in (-1, R):
            seen = set()
            for p in positions:
                idx = p + side
                choices = [b for b in BASES if b not in seen] or list(BASES)
                g[idx] = rng.choice(choices)
                seen.add(g[idx])
    return "".join(g)


def read_fasta(path: str) -> str:
    """Read the first record of a FASTA file (non-ACGT bases are dropped)."""
    seq = []
    started = False
    with open(path) as fh:
        for line in fh:
            if line.startswith(">"):
                if started:
                    break
                started = True
                continue
            seq.append(line.strip().upper())
    s = "".join(seq)
    return "".join(c for c in s if c in BASES)


def make_genome(spec: dict) -> str:
    """Build a genome from a config dict.

    ``{"fasta": path}`` loads a reference, otherwise a random genome of
    ``length`` bp is generated with optional planted ``repeats``.
    """
    if spec.get("fasta"):
        g = read_fasta(spec["fasta"])
        if spec.get("length"):
            g = g[: int(spec["length"])]
        return g
    seed = spec.get("seed", 0)
    g = random_genome(int(spec.get("length", 50_000)), seed=seed, gc=spec.get("gc", 0.5))
    if spec.get("repeats"):
        g = plant_repeats(g, spec["repeats"], seed=seed + 1)
    return g
