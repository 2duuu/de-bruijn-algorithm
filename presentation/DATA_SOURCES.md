# Data sources

## Where every number comes from

| Source | Used for |
|---|---|
| `data/raw/<sweep>/results.csv`, which are copies of `results/lambda/<sweep>/results.csv` from `de bruijn research/results.zip` | all measured charts, tables and stat cards |
| `data/raw/<sweep>/config.json` | experimental parameters (c, e, k, L, replicates) |
| `plots/*.png`, which are the original figures from `results/lambda/plots/` in the same zip | the *Show original figure* toggle |
| `de bruijn research/report.html` | narrative, explanations, and three quoted values not stored in the CSVs: the exponential-fit R² (0.988–0.997) and decay rates (0.59 / 0.50 / 0.36), and the count of 6-mers absent from lambda (43 of 4,096) |
| `de bruijn research/Project_proposal (1).md` | the original hypotheses (slide 3) |
| `data/phage_lambda/NC_001416.fasta` | the 210 bp lambda excerpt used by the live demos |

`tools/aggregate.mjs` groups each CSV by `(x, series)` and stores the replicate **mean** and **sample standard deviation** of each metric in `data/lambda-data.js`. Nothing is smoothed, interpolated or digitised from images. Running it prints cross-checks against the report:

```
k=21 peak C=216 at c=1;    first C=1 at c=12
k=31 peak C=251.8 at c=1.5; first C=1 at c=15
k=51 peak C=360.2 at c=2;  first C=1 at c=20
I per error (minus 2): 1.954 1.907 … 1.628 … 1.372 … 1.048   (e = 0.05%, 0.1%, 0.5%, 1%, 2%)
Thresholds (first k ≥ 13 with D > 0.05): e=0 → 31 51 61 71 81; e=0.005 → 25 31 31 31 31
k=4, c=10, e=0.001: |E|=256 C=1 I=0 collapsed=0.9947 D=0
k=95, c=10, e=0: missing k-mers 54.7%
```

All of these match the report.

## Sweeps

All sweeps use phage lambda (NC_001416.1, G = 48,502 bp, linear), L = 100 and uniform read starts.

| Sweep | Fixed | Varied | Series | Replicates |
|---|---|---|---|---|
| `coverage_sweep` | e = 0 | c = 0.5 … 30 | k = 21, 31, 51 | 5 |
| `error_sweep` | c = 30, k = 31 | e = 0 … 2% | none | 5 |
| `kmer_sweep` | c = 30 | k = 4 … 95 | e = 0, 0.001, 0.005 | 3 |
| `kmer_sweep_c10/15/20/25` | c = 10/15/20/25 | k = 4 … 95 | e = 0, 0.001, 0.005 | 3 |

The archive also contains `error_sweep_mc2` and `error_sweep_mc3` (k-mer count filtering, `min_count` = 2 and 3). The report does not discuss them, so the presentation does not use them. They are a natural basis for the "k-mer filtering" item under future work.

## Lambda vs. "random 50 kb genome": what was checked

The brief warned that some PDFs might be labelled as experiments on a *random 50.0 kb genome with planted repeats*. Here is what we found:

1. **The figures in `results.zip` are all lambda.** Each one is subtitled *"Phage lambda (infects E. coli), 48.5 kb"* (checked visually), and their CSVs report `genome_length = 48502`.
2. **The "random genome" wording comes from the plotting code.** `debruijn/plots.py::genome_label()` writes "Random genome, planted repeats" only when a sweep has no FASTA and no label. Figures with that subtitle therefore come from an earlier run on the synthetic default genome (`genome.length = 50000`), not from lambda. No such PDFs were in `de bruijn research/`, so the presentation does not use them.
3. **No repeats were planted into lambda.** The k-mer sweep configs still list a `repeats` field (and the description string still mentions planted repeats), but `debruijn/genome.py::make_genome()` returns the FASTA sequence before it would ever call `plant_repeats()`. The k-mer results are plain lambda. This is why the report says lambda's small-k effect comes from short k-mers recurring by chance, not from long repeats.

Every measured visual in the deck is therefore labelled *phage lambda NC_001416.1*.

## Model curves (labelled "Model" or "Arithmetic")

- Islands ≈ (cG/L)·e^(−c(L−k+1)/L) and c_peak = L/(L−k+1): slide 7, with no fitted parameters.
- Isolated-error line I = 2 + 2·N·L·e with N = 14,551 reads (the CSV's `n_reads`): slide 8.
- P = 1 − (1−e)^(2(k−1)): slide 9.
- Windows per read L−k+1, unsampled fraction ≈ e^(−c(L−k+1)/L), and error-free probability (1−e)^k: slide 11.
- 4ᵏ vs G and k ≈ log₄ G: slide 14. The E. coli value (≈ 11) is a prediction for future work.

## Illustrations (labelled "Simulation" or "Illustration")

- Interaction A (slides 6–7): seeded reads on the first 210 bp of lambda, L = 30, k = 11.
- Interaction B (slide 9): a 30 bp lambda window whose 4-mers are all distinct, k = 5. The demo computes the imbalance for real; the presets give +2 (bubble), +2 (tip), +2 (two errors 2 bp apart) and +4 (two errors far apart).
- Interaction C (slide 13): the first 210 bp of lambda, k = 2 … 20. Either all k-mers are used, or seeded reads at c = 4, L = 25.
- Interaction D (slide 12): a simple 8-node cycle versus the complete k = 2 graph on all 16 dinucleotides. Both have C = 1, I = 0 and D = 0. The Eulerian circuits are counted by exhaustive enumeration in the browser: 1 versus 20,736, which matches the BEST theorem value (4!)⁴/4².
