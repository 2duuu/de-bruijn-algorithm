"""Plots for sweep results (mean +/- std over replicates)."""

from __future__ import annotations

import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from . import theory  # noqa: E402
from .pipeline import DEFAULTS, merge  # noqa: E402

LABELS = {
    "coverage": "Coverage depth c",
    "error_rate": "Error rate e",
    "k": "k-mer size k",
    "components": "Weakly connected components",
    "imbalance": r"Graph imbalance $\sum_v |in(v)-out(v)|$",
    "degradation": "Normalized degradation index D",
    "frag_term": "fragmentation ln C / ln |V|",
    "imbalance_term": "imbalance I/2|E|",
    "ambiguity_term": "ambiguity B/|V|",
    "contiguity_term": "contiguity loss 1 - ln NG50 / ln G",
    "missing_kmer_frac": "missing genome k-mers",
    "spurious_kmer_frac": "spurious k-mers",
    "dead_ends": "Dead-end (tip) nodes",
    "branching": "Branching nodes",
    "ng50": "NG50 (bp)",
}

PALETTE = ["#2a6fdb", "#e0533d", "#2e9e5b", "#9b59b6", "#e69f00", "#56b4e9", "#555555"]


def _theory_curve(name: str, base: dict, x_param: str, series_param, sv, xs):
    ys = []
    for xv in xs:
        p = dict(base)
        p[x_param] = xv
        if series_param:
            p[series_param] = sv
        G = base["genome"]["length"]
        if name == "components":
            ys.append(theory.expected_components(G, p["coverage"], p["read_length"], p["k"]))
        elif name == "imbalance":
            ys.append(theory.expected_imbalance_errors(G, p["coverage"], p["error_rate"],
                                                       p["k"], p["read_length"]))
        else:
            raise ValueError(f"unknown theory curve {name}")
    return ys


def plot_sweep(sweep: dict, summary: list[dict], out_dir: str) -> list[str]:
    base = merge(DEFAULTS, sweep.get("base", {}))
    x_param = sweep["x"]["param"]
    series = sweep.get("series") or {"param": None, "values": [None]}
    files = []
    for spec in sweep.get("plots", [{"y": "degradation"}]):
        ys = spec["y"] if isinstance(spec["y"], list) else [spec["y"]]
        fig, ax = plt.subplots(figsize=(6.4, 4.4), dpi=150)
        ci = 0
        for sv in spec.get("series_values", series["values"]):
            pts = sorted((r for r in summary if r["series"] == sv), key=lambda r: r["x"])
            xs = [r["x"] for r in pts]
            for y in ys:
                color = PALETTE[ci % len(PALETTE)]
                ci += 1
                mean = [r[f"{y}_mean"] for r in pts]
                std = [r[f"{y}_std"] for r in pts]
                label_parts = []
                if len(ys) > 1:
                    label_parts.append(LABELS.get(y, y))
                if series["param"]:
                    label_parts.append(f"{series['param']}={sv}")
                label = ", ".join(label_parts) or "simulation"
                ax.errorbar(xs, mean, yerr=std, marker="o", ms=4, lw=1.6, capsize=3,
                            color=color, label=label)
                if spec.get("theory"):
                    tx = xs
                    ty = _theory_curve(spec["theory"], base, x_param, series["param"], sv, tx)
                    ax.plot(tx, ty, ls="--", lw=1.2, color=color, alpha=0.8,
                            label=f"theory ({series['param']}={sv})" if series["param"] else "theory")
        ax.set_xlabel(LABELS.get(x_param, x_param))
        ax.set_ylabel(spec.get("ylabel") or (LABELS.get(ys[0], ys[0]) if len(ys) == 1 else "value"))
        if spec.get("logy"):
            ax.set_yscale("log")
        if spec.get("logx"):
            ax.set_xscale("log")
        ax.set_title(spec.get("title") or sweep.get("title") or sweep.get("name", ""))
        ax.grid(alpha=0.3)
        ax.legend(fontsize=8, frameon=False)
        fig.tight_layout()
        fname = os.path.join(out_dir, spec.get("file") or f"{'_'.join(ys)}_vs_{x_param}.png")
        fig.savefig(fname)
        plt.close(fig)
        files.append(fname)
    return files
