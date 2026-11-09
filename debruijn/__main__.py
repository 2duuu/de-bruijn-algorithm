"""Command line interface.

    python -m debruijn coverage            # preset: configs/coverage_sweep.json
    python -m debruijn error               # preset: configs/error_sweep.json
    python -m debruijn kmer                # preset: configs/kmer_sweep.json
    python -m debruijn all                 # the three presets
    python -m debruijn sweep my_sweep.json # any sweep config
    python -m debruijn run --k 31 --coverage 20 --error-rate 0.001

Common options: --replicates N, --jobs J, --out DIR, --set key=value
(dotted keys reach into the base config, e.g. --set genome.length=20000,
--set x.values=[1,2,4]).
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from .pipeline import run_config
from .sweep import run_and_save, set_dotted

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRESETS = {
    "coverage": "coverage_sweep.json",
    "error": "error_sweep.json",
    "kmer": "kmer_sweep.json",
}


def _parse_value(s: str):
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return s


def _apply_sets(sweep: dict, sets: list[str]) -> dict:
    for item in sets or []:
        key, _, val = item.partition("=")
        val = _parse_value(val)
        if key.split(".")[0] in ("x", "series", "replicates", "plots", "name", "title"):
            sweep = set_dotted(sweep, key, val)
        else:
            sweep = set_dotted(sweep, "base." + key, val)
    return sweep


def _run_sweep_file(path: str, args) -> None:
    with open(path) as fh:
        sweep = json.load(fh)
    sweep = _apply_sets(sweep, args.set)
    if args.replicates:
        sweep["replicates"] = args.replicates
    out = os.path.join(args.out, sweep.get("name", os.path.splitext(os.path.basename(path))[0]))
    print(f"== {sweep.get('name')}: {sweep.get('description', '')}")
    _, summary, files = run_and_save(sweep, out, jobs=args.jobs)
    print(f"   wrote {out}/raw.csv, summary.csv and {len(files)} plot(s)")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="debruijn", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=[*PRESETS, "all", "sweep", "run"])
    ap.add_argument("config", nargs="?", help="sweep config (for 'sweep')")
    ap.add_argument("--replicates", type=int)
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument("--out", default=os.path.join(ROOT, "results"))
    ap.add_argument("--set", action="append", default=[], metavar="KEY=VALUE")
    # single-run options
    ap.add_argument("--k", type=int)
    ap.add_argument("--coverage", type=float)
    ap.add_argument("--error-rate", type=float)
    ap.add_argument("--read-length", type=int)
    ap.add_argument("--genome-length", type=int)
    ap.add_argument("--min-count", type=int)
    ap.add_argument("--seed", type=int)
    args = ap.parse_args(argv)

    if args.command == "run":
        cfg: dict = {}
        for key in ("k", "coverage", "error_rate", "read_length", "min_count", "seed"):
            if getattr(args, key) is not None:
                cfg[key] = getattr(args, key)
        if args.genome_length:
            cfg["genome"] = {"length": args.genome_length}
        for item in args.set:
            key, _, val = item.partition("=")
            cfg = set_dotted(cfg, key, _parse_value(val))
        m = run_config(cfg)
        width = max(map(len, m))
        for key, val in m.items():
            print(f"{key:<{width}}  {round(val, 6) if isinstance(val, float) else val}")
        return 0

    if args.command == "sweep":
        if not args.config:
            ap.error("'sweep' needs a config file")
        _run_sweep_file(args.config, args)
        return 0

    names = list(PRESETS) if args.command == "all" else [args.command]
    for name in names:
        _run_sweep_file(os.path.join(ROOT, "configs", PRESETS[name]), args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
