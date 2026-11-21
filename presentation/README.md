# When De Bruijn Graphs Break — interactive presentation

20-minute, 16-slide HTML presentation of our research project *Analyzing the Degradation of De Bruijn Graphs in Genome Assembly* (Tudor Pisica & Andrei Stan, Monday 23 November 2026).

Plain HTML/CSS/JS. You don't need to build or install anything, and it works without internet access.

## Running it

**Option A: just open it.** Double-click `index.html` (Chrome, Edge or Firefox). Everything is loaded with plain `<script>` tags, so it works from `file://`, including from a USB stick.

**Option B: local server** (only if a browser restricts local files):

```powershell
node tools/serve.mjs
```

Then open <http://localhost:8123>.

The slide stage is authored at 1920×1080 and scaled to fit any window, so the layout is identical on a 1366×768 laptop and a 1080p projector.

## Controls

| Key | Action |
|---|---|
| `→` `Space` `PgDn` `Enter` | next build step / next slide (works with presentation clickers) |
| `←` `PgUp` | previous step / slide |
| `F` | fullscreen |
| `N` | speaker-notes overlay at the bottom of the screen |
| `P` | presenter window (notes, per-slide timer vs target, next slide). Allow pop-ups. |
| `K` | play / pause the current slide's animation |
| `R` | reset the current slide's demo |
| `T` | restart the talk timer |
| `Home` / `End` | first / last slide |
| `?` | keyboard help |

Moving the mouse shows a control bar (prev/next, play, reset, timer, notes, presenter, fullscreen). The URL hash (`#7`) keeps your slide across reloads.

## Slides and timing (20:00)

| # | Slide | Time | Interaction |
|---|---|---|---|
| 1 | When De Bruijn Graphs Break | 1:00 | animated hero graph |
| 2 | From theory to experiment | 1:00 | three animated panels |
| 3 | Our hypotheses | 1:00 | conceptual sketches (labelled as hypotheses) |
| 4 | Research pipeline | 1:00 | read → k-mers → graph animation |
| 5 | Defining graph degradation | 1:00 | computed mini-graphs |
| 6 | Coverage: results | 1:30 | measured chart + **Interaction A** |
| 7 | Why rise then fall | 1:30 | Lander–Waterman model vs data, 3-stage toy |
| 8 | Errors: results | 1:30 | measured chart vs isolated-error model |
| 9 | Why sublinear | 1:30 | **Interaction B** (error injection) |
| 10 | k-mer: results | 1:30 | measured chart with staged regions |
| 11 | Coverage shifts the threshold | 1:30 | per-coverage measured sweeps, windows-per-read slider |
| 12 | The surprise: zero degradation | 1:30 | k = 4 reveal, then **Interaction D** (paradox) |
| 13 | Why our metric fails | 1:30 | measured table + **Interaction C** (k explorer) |
| 14 | Why the peak is near k = 8 | 1:00 | 4ᵏ vs G, measured D near the peak |
| 15 | What the results tell us | 1:00 | verdicts with measured sparklines |
| 16 | Conclusion & future work | 1:00 | balanced graph tracing new genomes |

The full spoken script is in [PRESENTER_SCRIPT.md](PRESENTER_SCRIPT.md) (about 2,400 words, ≈ 17 min spoken at 140 wpm, plus about 3 min for demos and pauses). The same notes appear in the `N` overlay and the `P` presenter window.

## Measured vs. illustrative content

Every visual is labelled:

- **● Measured**: means of the replicate runs of our pipeline on phage lambda, read from the CSVs (see [DATA_SOURCES.md](DATA_SOURCES.md)). Bands are ±1 sample standard deviation. Hover a point for its exact value. *Show original figure* swaps in the matplotlib figure produced by `python -m debruijn plot`.
- **┄ Model / Arithmetic**: closed-form formulas from the report (Lander–Waterman islands, isolated-error model, 4ᵏ vs G). None of them has fitted parameters.
- **◆ Simulation / Illustration**: live demos on short sequences (the first 210 bp of lambda, or exact toy graphs). They are never presented as experimental results.

## Project layout

```
presentation/
├── index.html              entry point
├── css/deck.css            dark theme, 1920×1080 stage
├── js/
│   ├── deck.js             navigation, steps, notes, presenter window, timer, fullscreen
│   ├── slides.js           the 16 slides
│   ├── notes.js            speaker notes (single source of truth)
│   ├── charts.js           small SVG chart helper (log axes, sd bands, tooltips)
│   ├── viz.js              animated graph view + Interactions A–D
│   └── toy-graph.js        tiny graph helper used only by the on-screen demos
├── data/
│   ├── lambda-data.js      aggregated measurements (generated)
│   └── raw/<sweep>/        copies of the pipeline's results.csv + config.json
├── plots/                  original matplotlib figures (PNG)
├── tools/
│   ├── aggregate.mjs       raw CSVs → data/lambda-data.js (+ prints report cross-checks)
│   ├── export-notes.mjs    js/notes.js → PRESENTER_SCRIPT.md (+ timing table)
│   └── serve.mjs           optional static server
├── PRESENTER_SCRIPT.md
└── DATA_SOURCES.md
```

`toy-graph.js` doesn't replace the research pipeline in `debruijn/`. It only builds the few-hundred-base graphs that the live demos need in the browser, using the same conventions (distinct-k-mer edges, weak components, I = Σ|in − out|, the same D).

## Regenerating

After re-running sweeps, copy the new `results.csv`/`config.json` into `data/raw/<sweep>/`, then run:

```powershell
node tools/aggregate.mjs
```

After editing `js/notes.js`, run:

```powershell
node tools/export-notes.mjs
```
