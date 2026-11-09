"""Single configuration run: genome -> reads -> graph -> Euler -> metrics."""

from __future__ import annotations

import json
import time
from functools import lru_cache

from .genome import make_genome
from .graph import DeBruijnGraph
from .metrics import compute_metrics
from .reads import simulate_reads

DEFAULTS = {
    "genome": {"length": 50_000, "seed": 0, "circular": True, "repeats": []},
    "read_length": 100,
    "coverage": 30.0,
    "error_rate": 0.0,
    "k": 31,
    "min_count": 1,       # k-mer frequency cutoff (extension; 1 = off)
    "seed": 0,            # read-sampling seed (varied across replicates)
    "weights": None,      # degradation-index weights, None = equal
    "run_euler": True,
}


@lru_cache(maxsize=16)
def _genome_cached(spec_json: str) -> str:
    return make_genome(json.loads(spec_json))


def merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for key, val in override.items():
        if isinstance(val, dict) and isinstance(out.get(key), dict):
            out[key] = merge(out[key], val)
        else:
            out[key] = val
    return out


def run_config(cfg: dict) -> dict:
    """Run the full pipeline for one parameter configuration and return metrics."""
    cfg = merge(DEFAULTS, cfg)
    gspec = cfg["genome"]
    circular = gspec.get("circular", True)
    genome = _genome_cached(json.dumps(gspec, sort_keys=True))

    t0 = time.perf_counter()
    reads, info = simulate_reads(
        genome, cfg["coverage"], cfg["read_length"], cfg["error_rate"],
        circular=circular, seed=cfg["seed"],
    )
    g = DeBruijnGraph.from_reads(reads, cfg["k"], min_count=cfg["min_count"])
    m = compute_metrics(g, genome, circular=circular, weights=cfg["weights"],
                        run_euler=cfg["run_euler"])
    m.update(
        genome_length=len(genome), n_reads=info["n_reads"], n_errors=info["n_errors"],
        k=cfg["k"], coverage=cfg["coverage"], error_rate=cfg["error_rate"],
        read_length=cfg["read_length"], min_count=cfg["min_count"], seed=cfg["seed"],
        runtime_s=round(time.perf_counter() - t0, 3),
    )
    return m
