"""Plots for the three pre-defense sweeps.

Reads ``results/<sweep>/results.csv`` and writes one figure per hypothesis:

1. coverage sweep -> connected components vs coverage depth (log y: exponential
   decay shows as a straight line)
2. error sweep    -> graph imbalance vs error rate (linear growth)
3. k-mer sweep    -> normalized degradation index vs k (U-shape)

Each point is the mean over replicates; the shaded band is +/- one standard
deviation. Requires matplotlib (imported lazily so the pipeline itself does not).
"""

from __future__ import annotations

import csv
import json
import math
import os
from collections import defaultdict

# Categorical slots 1-3 (blue, orange, aqua): validated colorblind-safe as a set.
SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"]
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"


# ---------------------------------------------------------------- data
def _num(s: str):
    if s in ("", "None"):
        return None
    try:
        return float(s)
    except ValueError:
        return s


def load_rows(path: str) -> list[dict]:
    with open(path, newline="") as fh:
        return [{k: _num(v) for k, v in r.items()} for r in csv.DictReader(fh)]


def summarize(rows: list[dict], y: str) -> dict:
    """{series_value: [(x, mean, sd, n), ...]} sorted by x."""
    groups: dict = defaultdict(lambda: defaultdict(list))
    for r in rows:
        if r.get(y) is not None:
            groups[r.get("series")][r["x"]].append(float(r[y]))
    out = {}
    for s, by_x in groups.items():
        pts = []
        for x in sorted(by_x):
            v = by_x[x]
            mean = sum(v) / len(v)
            sd = math.sqrt(sum((a - mean) ** 2 for a in v) / (len(v) - 1)) if len(v) > 1 else 0.0
            pts.append((x, mean, sd, len(v)))
        out[s] = pts
    return dict(sorted(out.items(), key=lambda kv: (kv[0] is None, kv[0])))


# --------------------------------------------------------------- style
def _style(ax, plt) -> None:
    ax.set_facecolor(SURFACE)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(AXIS)
    ax.tick_params(colors=MUTED, labelcolor=INK_2, labelsize=9)
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.xaxis.label.set_color(INK_2)
    ax.yaxis.label.set_color(INK_2)


def _figure(plt, title: str, subtitle: str):
    fig, ax = plt.subplots(figsize=(7, 4.4), dpi=110)
    fig.patch.set_facecolor(SURFACE)
    fig.suptitle(title, x=0.08, y=0.97, ha="left", fontsize=12.5, fontweight="bold", color=INK)
    fig.text(0.08, 0.905, subtitle, ha="left", fontsize=9, color=INK_2)
    _style(ax, plt)
    return fig, ax


def _draw(ax, series: dict, label_fmt, log_y: bool = False, end_labels: bool = True) -> None:
    """Mean line + markers + +/-1 sd band per series, plus direct end labels."""
    multi = len(series) > 1
    ends = []
    for i, (s, pts) in enumerate(series.items()):
        color = SERIES_COLORS[i % len(SERIES_COLORS)]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        lo = [max(p[1] - p[2], 1e-9 if log_y else -math.inf) for p in pts]
        hi = [p[1] + p[2] for p in pts]
        ax.fill_between(xs, lo, hi, color=color, alpha=0.14, linewidth=0, zorder=2)
        ax.plot(xs, ys, color=color, linewidth=2, marker="o", markersize=5.5,
                markeredgecolor=SURFACE, markeredgewidth=1.2,
                label=label_fmt(s) if multi else None, zorder=3)
        ends.append((xs[-1], ys[-1], label_fmt(s)))
    if multi:
        leg = ax.legend(frameon=False, fontsize=9, loc="upper left" if not log_y else "upper right")
        for t in leg.get_texts():
            t.set_color(INK_2)
        if end_labels:
            _end_labels(ax, ends, log_y)


def _end_labels(ax, ends, log_y: bool) -> None:
    """Direct labels at the right end of each line, spread apart symmetrically.

    Positions are worked out in points (the unit of the annotation offset), and
    overlapping neighbours are pushed apart equally in both directions, so each
    label stays as close as possible to its own line end.
    """
    fig = ax.figure
    fig.canvas.draw()
    pt_per_px = 72.0 / fig.dpi
    gap = 11.0  # minimum vertical distance between labels, in points
    ends = sorted(ends, key=lambda e: e[1])
    true = [ax.transData.transform((x, y))[1] * pt_per_px for x, y, _ in ends]
    pos = list(true)
    for _ in range(100):
        moved = False
        for i in range(len(pos) - 1):
            overlap = gap - (pos[i + 1] - pos[i])
            if overlap > 1e-6:
                pos[i] -= overlap / 2
                pos[i + 1] += overlap / 2
                moved = True
        if not moved:
            break
    for (x, y, text), p, t in zip(ends, pos, true):
        ax.annotate(text, xy=(x, y), xytext=(7, p - t), textcoords="offset points",
                    va="center", fontsize=8.5, color=INK_2, annotation_clip=False)


def _save(fig, out_dir: str, name: str) -> list[str]:
    fig.subplots_adjust(left=0.1, right=0.88, top=0.84, bottom=0.13)
    paths = []
    for ext in ("png", "pdf"):
        p = os.path.join(out_dir, f"{name}.{ext}")
        fig.savefig(p, dpi=200, facecolor=fig.get_facecolor())
        paths.append(p)
    return paths


# --------------------------------------------------------------- plots
def plot_coverage(rows, out_dir, plt, suffix: str = "", ymax: float | None = None,
                  genome: str = "") -> list[str]:
    from matplotlib.ticker import LogLocator, ScalarFormatter
    r0 = rows[0]
    fig, ax = _figure(plt, "Connected components vs coverage depth",
                      f"{genome or 'Genome'}, {r0['genome_length'] / 1000:.1f} kb, e = 0. "
                      "Log y: a straight line is exponential decay.")
    # every line ends at C = 1, so end labels would pile up: the legend identifies them
    _draw(ax, summarize(rows, "components"), lambda s: f"k = {int(s)}", log_y=True,
          end_labels=False)
    ax.set_yscale("log")
    ax.yaxis.set_major_locator(LogLocator(base=10))
    ax.yaxis.set_major_formatter(ScalarFormatter())
    ax.set_xlabel("coverage depth c")
    ax.set_ylabel("connected components C")
    ax.set_xlim(left=0)
    return _save(fig, out_dir, "1_components_vs_coverage" + suffix)


def plot_error(rows, out_dir, plt, suffix: str = "", ymax: float | None = None,
               genome: str = "") -> list[str]:
    from matplotlib.ticker import MultipleLocator, PercentFormatter
    r0 = rows[0]
    fig, ax = _figure(plt, "Graph imbalance vs sequencing error rate",
                      f"{genome or 'Genome'}, {r0['genome_length'] / 1000:.1f} kb, "
                      f"coverage c = {r0['coverage']:g}, k = {int(r0['k'])}. "
                      "I = Σ |in(v) − out(v)|.")
    _draw(ax, summarize(rows, "imbalance"), str)
    ax.xaxis.set_major_locator(MultipleLocator(0.005))
    ax.xaxis.set_major_formatter(PercentFormatter(xmax=1, decimals=1))
    ax.set_xlabel("error rate e (per base)")
    ax.set_ylabel("graph imbalance I")
    ax.set_xlim(left=0)
    ax.set_ylim(bottom=0)
    return _save(fig, out_dir, "2_imbalance_vs_error_rate" + suffix)


def plot_kmer(rows, out_dir, plt, suffix: str = "", ymax: float | None = None,
              genome: str = "") -> list[str]:
    from matplotlib.ticker import FixedLocator, NullLocator, ScalarFormatter
    r0 = rows[0]
    fig, ax = _figure(plt, "Normalized degradation index vs k-mer size",
                      f"{genome or 'Genome'}, {r0['genome_length'] / 1000:.1f} kb, "
                      f"coverage c = {r0['coverage']:g}. D = ½·ln C / ln|V| + ½·I / (2|E|).")
    _draw(ax, summarize(rows, "degradation"), lambda s: f"e = {s:g}")
    ax.set_xscale("log")
    ks = sorted({int(r["x"]) for r in rows})
    ticks = [k for k in (4, 5, 6, 7, 8, 10, 15, 20, 30, 50, 70, 95) if ks[0] <= k <= ks[-1]]
    ax.xaxis.set_major_locator(FixedLocator(ticks))
    ax.xaxis.set_major_formatter(ScalarFormatter())
    ax.xaxis.set_minor_locator(NullLocator())
    ax.set_xlabel("k-mer size k (log scale)")
    ax.set_ylabel("degradation index D")
    ax.set_ylim(bottom=0, top=ymax)
    return _save(fig, out_dir, "3_degradation_vs_k" + suffix)


PLOTS = {
    "coverage_sweep": plot_coverage,
    "error_sweep": plot_error,
    "kmer_sweep": plot_kmer,
}


def _sweep_dirs(results_dir: str, sweep: str) -> list[tuple[str, str]]:
    """``results/<sweep>`` plus variants ``results/<sweep>_<tag>`` -> [(path, suffix)]."""
    found = []
    if not os.path.isdir(results_dir):
        return found
    for name in sorted(os.listdir(results_dir)):
        if name == sweep or name.startswith(sweep + "_"):
            path = os.path.join(results_dir, name, "results.csv")
            if os.path.exists(path):
                found.append((path, name[len(sweep):]))
    return found


def genome_label(config_path: str) -> str:
    """Short description of the genome a sweep used, from its saved config.json.

    ``genome.label`` wins if set; otherwise the FASTA file name, or "Random genome"
    (with "planted repeats" when the sweep planted any).
    """
    try:
        with open(config_path) as fh:
            spec = json.load(fh).get("base", {}).get("genome", {})
    except (OSError, ValueError):
        return ""
    if spec.get("label"):
        return str(spec["label"])
    if spec.get("fasta"):
        return os.path.splitext(os.path.basename(spec["fasta"]))[0]
    return "Random genome, planted repeats" if spec.get("repeats") else "Random genome"


def plot_all(results_dir: str, out_dir: str | None = None) -> list[str]:
    """Draw every plot whose sweep CSV exists; returns the written file paths.

    Variants of a sweep (e.g. ``results/kmer_sweep_c10``, made with
    ``--set name=kmer_sweep_c10``) get their own figure with the same suffix,
    and all variants of one sweep share the y-axis range so they can be compared.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    out_dir = out_dir or os.path.join(results_dir, "plots")
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for sweep, fn in PLOTS.items():
        variants = [(load_rows(p), sfx, genome_label(os.path.join(os.path.dirname(p), "config.json")))
                    for p, sfx in _sweep_dirs(results_dir, sweep)]
        if not variants:
            print(f"   skip {sweep}: no results/{sweep}*/results.csv (run the sweep first)")
            continue
        ymax = None
        if len(variants) > 1 and sweep == "kmer_sweep":
            ymax = 1.05 * max(m + sd for rows, _, _ in variants
                              for pts in summarize(rows, "degradation").values()
                              for _, m, sd, _ in pts)
        for rows, sfx, genome in variants:
            written += fn(rows, out_dir, plt, suffix=sfx, ymax=ymax, genome=genome)
            plt.close("all")
    return written
