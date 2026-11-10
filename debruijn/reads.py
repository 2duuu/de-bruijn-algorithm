"""Synthetic read sampling with substitution errors."""

from __future__ import annotations

import math
import random

BASES = "ACGT"
_SUBST = {b: [x for x in BASES if x != b] for b in BASES}


def _mutate(read: str, error_rate: float, rng: random.Random) -> tuple[str, int]:
    """Apply i.i.d. substitutions with probability ``error_rate`` per base.

    Error positions are drawn by geometric skipping, so the cost is
    proportional to the number of errors rather than the read length.
    """
    if error_rate <= 0:
        return read, 0
    if error_rate >= 1:
        return "".join(rng.choice(_SUBST[b]) for b in read), len(read)
    chars = None
    log_q = math.log(1.0 - error_rate)
    pos = -1
    n_err = 0
    while True:
        pos += 1 + int(math.log(1.0 - rng.random()) / log_q)
        if pos >= len(read):
            break
        if chars is None:
            chars = list(read)
        chars[pos] = rng.choice(_SUBST[chars[pos]])
        n_err += 1
    return ("".join(chars) if chars else read), n_err


def simulate_reads(
    genome: str,
    coverage: float,
    read_length: int,
    error_rate: float = 0.0,
    circular: bool = True,
    seed: int | None = None,
) -> tuple[list[str], dict]:
    """Sample ``N = round(c * G / L)`` reads with uniformly random starts.

    Start positions are uniform, so the number of reads covering a given
    position is ~Poisson(c), which is the Lander-Waterman model.
    Returns ``(reads, info)`` where ``info`` holds the true read starts and the
    number of substitution errors introduced.
    """
    G, L = len(genome), read_length
    if L > G:
        raise ValueError("read length exceeds genome length")
    rng = random.Random(seed)
    n_reads = int(round(coverage * G / L))
    ext = genome + genome[: L - 1] if circular else genome
    max_start = G if circular else G - L + 1
    reads, starts, n_errors = [], [], 0
    for _ in range(n_reads):
        s = rng.randrange(max_start)
        r, ne = _mutate(ext[s:s + L], error_rate, rng)
        reads.append(r)
        starts.append(s)
        n_errors += ne
    return reads, {"n_reads": n_reads, "n_errors": n_errors, "starts": starts}


def tile_reads(genome: str, read_length: int, step: int = 1, circular: bool = True) -> list[str]:
    """Deterministic, error-free reads at every ``step`` positions (full coverage)."""
    G, L = len(genome), read_length
    ext = genome + genome[: L - 1] if circular else genome
    last = G if circular else G - L + 1
    starts = list(range(0, last, step))
    if not circular and starts[-1] != G - L:
        starts.append(G - L)
    return [ext[s:s + L] for s in starts]
