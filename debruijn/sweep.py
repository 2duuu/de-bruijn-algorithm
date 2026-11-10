"""Parameter sweeps over (k, coverage, error_rate, ...) with replicates."""

from __future__ import annotations

import csv
import itertools
import json
import math
import os
from concurrent.futures import ProcessPoolExecutor

from .pipeline import DEFAULTS, merge, run_config


def set_dotted(cfg: dict, key: str, value) -> dict:
    """Return a copy of cfg with ``a.b.c = value`` applied."""
    parts = key.split(".")
    override: dict = {}
    cur = override
    for p in parts[:-1]:
        cur[p] = {}
        cur = cur[p]
    cur[parts[-1]] = value
    return merge(cfg, override)


def get_dotted(cfg: dict, key: str):
    cur = cfg
    for p in key.split("."):
        cur = cur[p]
    return cur


def expand(sweep: dict) -> list[dict]:
    """Cartesian product of x values, series values and replicate seeds."""
    base = merge(DEFAULTS, sweep.get("base", {}))
    x = sweep["x"]
    series = sweep.get("series") or {"param": None, "values": [None]}
    reps = int(sweep.get("replicates", 1))
    seed0 = int(base.get("seed", 0))
    jobs = []
    for sv, xv, r in itertools.product(series["values"], x["values"], range(reps)):
        cfg = set_dotted(base, x["param"], xv)
        if series["param"]:
            cfg = set_dotted(cfg, series["param"], sv)
        cfg["seed"] = seed0 + 1000 * r + 1
        cfg["_x"], cfg["_series"], cfg["_rep"] = xv, sv, r
        jobs.append(cfg)
    return jobs


def _run_job(cfg: dict) -> dict:
    meta = {k: cfg.pop(k) for k in ("_x", "_series", "_rep")}
    m = run_config(cfg)
    m.update(x=meta["_x"], series=meta["_series"], replicate=meta["_rep"])
    return m


def run_sweep(sweep: dict, jobs: int = 1, progress: bool = True) -> list[dict]:
    configs = expand(sweep)
    rows = []
    if jobs > 1:
        with ProcessPoolExecutor(max_workers=jobs) as ex:
            for i, row in enumerate(ex.map(_run_job, configs, chunksize=1), 1):
                rows.append(row)
                if progress:
                    print(f"\r  [{i}/{len(configs)}]", end="", flush=True)
    else:
        for i, cfg in enumerate(configs, 1):
            rows.append(_run_job(cfg))
            if progress:
                print(f"\r  [{i}/{len(configs)}]", end="", flush=True)
    if progress:
        print()
    return rows


def write_csv(rows: list[dict], path: str) -> None:
    keys: list[str] = []
    for r in rows:
        for k in r:
            if k not in keys:
                keys.append(k)
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=keys)
        w.writeheader()
        for r in rows:
            w.writerow({k: (round(v, 6) if isinstance(v, float) and math.isfinite(v) else v)
                        for k, v in r.items()})


def run_and_save(sweep: dict, out_dir: str, jobs: int = 1) -> str:
    """Run a sweep and write one CSV row per run to ``out_dir/results.csv``."""
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "config.json"), "w") as fh:
        json.dump(sweep, fh, indent=2)
    rows = run_sweep(sweep, jobs=jobs)
    path = os.path.join(out_dir, "results.csv")
    write_csv(rows, path)
    return path
