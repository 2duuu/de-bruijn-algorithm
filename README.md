# Degradation of De Bruijn Graphs in Genome Assembly

A from-scratch Python implementation of De Bruijn graph assembly for the project
*"Analyzing the Degradation of De Bruijn Graphs in Genome Assembly"*. It simulates reads
from a reference genome, builds the De Bruijn graph, runs the Eulerian traversal
(Pevzner et al. 2001), and computes degradation metrics. Sweeps over
coverage `c`, error rate `e` and k-mer size `k` write raw CSV results for your own analysis.

## Quick start

```bash
pip install -r requirements.txt
python -m pytest              # correctness checks from the proposal
python -m debruijn all        # run the three sweeps -> results/<sweep>/results.csv
```

Run one sweep at a time:

```bash
python -m debruijn coverage   # coverage sweep  (e = 0)            configs/coverage_sweep.json
python -m debruijn error      # error sweep     (fixed c, fixed k) configs/error_sweep.json
python -m debruijn kmer       # k-mer sweep     (small e, high c)  configs/kmer_sweep.json
```

Each sweep writes `results/<name>/results.csv` (one row per run) and a copy of the
`config.json` that was used. Columns, in order:

| group | columns |
|---|---|
| sweep coordinates and run settings | `x`, `series`, `replicate`, `k`, `coverage`, `error_rate`, `read_length`, `min_count`, `seed`, `genome_length`, `n_reads`, `n_errors`, `runtime_s` |
| degradation index | `n_nodes`, `n_edges`, `components`, `imbalance`, `frag_term`, `imbalance_term`, `degradation` |
| correctness checks | `reconstructed`, `dead_ends`, `true_kmers`, `missing_kmer_frac`, `spurious_kmer_frac`, `repeat_collapse_frac` |

### Configuring experiments

Every sweep is a JSON file with a `base` configuration, one `x` parameter to vary, an
optional `series` parameter (a second parameter, crossed with `x`), and `replicates`
(repeated runs with different read seeds).
You can override any field from the command line without editing the file:

```bash
python -m debruijn coverage --set k=25 --set genome.length=100000 --replicates 10
python -m debruijn kmer --set coverage=15 --set series.values=[0,0.002]
python -m debruijn error --set x.values=[0,0.001,0.002] --jobs 4
python -m debruijn sweep my_custom_sweep.json   # any parameter as x / series
```

Single run (prints every metric):

```bash
python -m debruijn run --k 31 --coverage 20 --error-rate 0.001
python -m debruijn run --k 31 --coverage 30 --error-rate 0.005 --min-count 3   # k-mer cutoff
```

Configuration keys (defaults in `debruijn/pipeline.py`):

| key | meaning | default |
|---|---|---|
| `genome.length` | random genome length (bp) | 50000 |
| `genome.seed` | genome seed (fixed across replicates) | 0 |
| `genome.circular` | circular (bacterial) or linear genome | true |
| `genome.repeats` | planted exact repeats, e.g. `[{"length": 40, "copies": 3}]` | `[]` |
| `genome.fasta` | load a real reference instead (first record, optional `length` cap) | – |
| `read_length` | read length `L` | 100 |
| `coverage` | coverage depth `c` (number of reads `N = cG/L`) | 30 |
| `error_rate` | per-base substitution probability `e` | 0 |
| `k` | k-mer size (edges are k-mers, nodes are (k-1)-mers) | 31 |
| `min_count` | k-mer frequency cutoff, 1 = off (the proposal's extension) | 1 |
| `weights` | weights of the two degradation index terms | `{"frag": 0.5, "imbalance": 0.5}` |

## Pipeline

| step | module |
|---|---|
| reference genome (random i.i.d., planted exact repeats, or FASTA) | `debruijn/genome.py` |
| read sampling: uniform starts (Poisson / Lander-Waterman), i.i.d. substitutions | `debruijn/reads.py` |
| De Bruijn graph: (k-1)-mer nodes, distinct k-mer edges, k-mer multiplicities | `debruijn/graph.py` |
| Euler condition and Hierholzer's algorithm, run on each weakly connected component | `debruijn/euler.py` |
| metrics and degradation index | `debruijn/metrics.py` |
| sweeps, replicates, CSV output, CLI | `debruijn/sweep.py`, `__main__.py` |

## Metrics

All metrics are computed on the graph of **distinct** k-mers. That is the classic
Eulerian formulation, and it is what lets errors show up as imbalance.

* `components`: number of weakly connected components `C`.
* `imbalance`: `I = Σ_v |in(v) − out(v)|` (0 means every component has an Euler circuit).
* `dead_ends`: tip ends, nodes with `in+out = 1`.
* `reconstructed`: true when the graph is a single component and its Euler path or
  circuit spells exactly the reference (up to rotation for a circular genome).
* Ground-truth checks: `missing_kmer_frac` (coverage gaps), `spurious_kmer_frac`
  (error k-mers), `repeat_collapse_frac` (genome k-mers that occur more than once).

**Normalized degradation index.** It combines the two structural metrics, connected
components and graph imbalance, each normalized to [0, 1] and exactly 0 in the ideal case
(circular genome, all k-mers sampled, no errors):

```
frag       = ln C / ln |V|              weak fragmentation
imbalance  = I / (2|E|)                 departure from Eulerian balance

D = w_f·frag + w_i·imbalance            (w_f + w_i = 1, default 1/2 each)
```

The fragmentation term is log-scaled because `C` ranges over several orders of magnitude.
With a linear ratio (`1 − 1/C`) the term jumps to about 1 after only a few breaks, and the
curves become flat. The correctness-check metrics (`reconstructed`, `dead_ends`, k-mer
fractions) are written to the CSV for the checks below but are not part of `D`.

## Correctness checks (`tests/test_correctness.py`)

These are the checks listed in the proposal. All 19 tests pass. The branching-node count
used in checks 2 and 3 comes from `DeBruijnGraph.degree_classes()`; it is only used by the
tests and is not written to the CSV.

1. **Error-free, high coverage.** One component; imbalance 0 for a circular genome (2 for
   a linear one: the start and end nodes); the Euler circuit spells the genome exactly;
   `D = 0`.
2. **Controlled point mutations.** Every error placed in the middle of a read adds exactly
   `k` new k-mers, one bubble, 2 to the imbalance and 2 branching nodes, with no dead ends.
   Every error at a read end adds one tip (1 dead end) and 2 to the imbalance. Tested for
   0–50 mutations.
3. **Exact repeat of length R.** Duplicate k-mers exist if and only if `k ≤ R`; branching
   nodes exist if and only if `k ≤ R+1`; the Euler circuit recovers the genome if and only
   if `k > R`. (At `k = R+1` the repeat node has in = out = 2, so the graph is still
   balanced. With two copies on a circle, both Euler circuits spell the same cyclic genome.)
4. **Invariants and theory.** Degree conservation (`Σin = Σout = |E|`); the component count
   decreases with coverage and is within 25 % of Lander-Waterman; the imbalance is about 2
   per error.

## Simplifications and known limitations

* Reads come from the forward strand only (no reverse complements), and only
  substitution errors are simulated (no indels).
* The Euler traversal uses distinct k-mers. Copy number is not inferred, so collapsed
  repeats make the Euler path shorter than the genome.
* The default genome is a 50 kb random sequence, chosen for speed. A real bacterial
  reference can be used via `genome.fasta`. One run takes about 0.3–1 s at 50 kb and 30×
  coverage, and the cost scales linearly with genome size; use `--jobs` to run in parallel.
