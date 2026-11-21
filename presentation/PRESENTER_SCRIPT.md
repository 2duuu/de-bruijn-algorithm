# Presenter script — When De Bruijn Graphs Break

Tudor Pisica & Andrei Stan · Monday 23 November 2026 · target 20:00

Bracketed cues such as [→] or [Play] mark when to click. Spoken-script time is estimated at 140 words per minute; the remainder of each slot is for pauses and demos.

| # | Slide | Target | Script words | ≈ spoken |
|---|---|---|---|---|
| 1 | When De Bruijn Graphs Break | 1:00 | 138 | 0:59 |
| 2 | From Theory to Experiment | 1:00 | 151 | 1:05 |
| 3 | Our Hypotheses | 1:00 | 119 | 0:51 |
| 4 | Research Pipeline | 1:00 | 136 | 0:58 |
| 5 | Defining Graph Degradation | 1:00 | 150 | 1:04 |
| 6 | Coverage Experiment: Results | 1:30 | 163 | 1:10 |
| 7 | Why the Curve First Rises, Then Falls | 1:30 | 178 | 1:16 |
| 8 | Sequencing Error Experiment: Results | 1:30 | 148 | 1:03 |
| 9 | Why Error Growth Becomes Sublinear | 1:30 | 165 | 1:11 |
| 10 | k-mer Experiment: Results | 1:30 | 156 | 1:07 |
| 11 | How Coverage Shifts the k-mer Threshold | 1:30 | 154 | 1:06 |
| 12 | The Surprise: Zero Degradation | 1:30 | 172 | 1:14 |
| 13 | Why Our Metric Fails | 1:30 | 197 | 1:24 |
| 14 | Why the Peak Occurs Near k = 8 | 1:00 | 132 | 0:57 |
| 15 | What the Results Actually Tell Us | 1:00 | 123 | 0:53 |
| 16 | Conclusion and Future Work | 1:00 | 146 | 1:03 |
| | **Total** | **20:00** | **2428** | **17:21** |

---

## 1. When De Bruijn Graphs Break — 1:00

**Argument.** Set up the question: the elegant Eulerian model meets imperfect data.

**Points to make**
- Who we are; this is the follow-up to our De Bruijn seminar.
- The hero graph cycles through the three ways a graph breaks: gaps, error bubbles, repeat tangles.

**Demo / controls.** The hero animation loops on its own (K pauses it). Press → once to reveal the opening question.

**Script.**

> Good morning. We are Tudor Pisica and Andrei Stan. In our last seminar we showed that genome assembly can be phrased as a graph problem: cut reads into k-mers, make each k-mer an edge of a De Bruijn graph, and the genome becomes an Eulerian path through that graph. Very clean. But that only works with perfect data. Watch the graph on the right. First it is clean, one path spells the genome. Then we lose coverage and gaps appear, so the graph falls apart into islands. Then a sequencing error adds a false branch. And finally repeats make two distant parts of the genome share nodes, so the path can be rerouted. [→] So the question for today is: what happens when this mathematically elegant algorithm meets imperfect sequencing data? We did not just guess. We measured it.

**Transition.** Let me briefly reconnect to what you already saw last time.

---

## 2. From Theory to Experiment — 1:00

**Argument.** Three knobs (coverage, error rate, k) each attack the ideal graph differently.

**Points to make**
- Reminder only: k-mers = edges, (k−1)-mers = nodes, genome = Eulerian path.
- Coverage → missing k-mers. Errors → false k-mers. k → what can be told apart.
- Central question appears on the click.

**Demo / controls.** All three panels animate automatically. Point at each in turn. → reveals the research question.

**Script.**

> One-sentence recap: every k-mer is an edge from its first k−1 letters to its last k−1 letters, and the genome is a walk using every edge once. Real sequencing has three knobs that disturb this. On the left, coverage: reads land at random, and with too few reads some stretches are never seen — those red gaps. In the middle, the error rate: one wrong base creates up to k k-mers that do not exist in the genome, and they form a false branch next to the true path. On the right, the k-mer length. A short window repeats all the time inside a sequence, so different places collapse into one edge. A long window is unique, but a 100-base read only contains L minus k plus one of them. [→] So our research question: how does the topology of a De Bruijn graph degrade as coverage, error rate and k change?

**Transition.** Before running anything, we wrote down what we expected.

---

## 3. Our Hypotheses — 1:00

**Argument.** State the three original predictions — clearly as hypotheses, not results.

**Points to make**
- H1: components decay exponentially to 1 with coverage (Poisson gaps).
- H2: imbalance grows linearly with error rate (each error adds a tip).
- H3: degradation vs k is U-shaped (repeats on the left, missing overlaps on the right).

**Demo / controls.** No interaction. Point at the orange 'before experimentation' tag.

**Script.**

> These are the three predictions from our proposal, and I want to stress the label: these sketches are what we believed before running a single experiment. First, coverage: gaps between reads close like a Poisson process, so the number of connected components should decay exponentially to one. Second, errors: every independent substitution should add a fixed amount of damage, so imbalance should rise linearly with the error rate. Third, k: small k should tangle the graph with repeats, large k should shatter it because error-free overlaps become rare, so degradation should be U-shaped with a sweet spot in the middle. We tested each prediction with a controlled sweep, changing one variable at a time and keeping everything else fixed.

**Transition.** Here is the pipeline that produced every number you will see.

---

## 4. Research Pipeline — 1:00

**Argument.** One fixed pipeline on a real genome; only c, e or k vary.

**Points to make**
- Reference: phage lambda, NC_001416.1, 48,502 bp, linear, 49.9% GC.
- Reads: L = 100, uniform starts, forward strand, i.i.d. substitutions.
- Graph: distinct k-mers as edges — repeated k-mers collapse.
- Replicates: 5, 5 and 3.

**Demo / controls.** Animation runs automatically: the window slides over the first 20 bp of lambda and the graph grows edge by edge. Point at the purple nodes: GGCG and GCGG occur twice in this read, so their node is reused.

**Script.**

> Our reference is a real genome: bacteriophage lambda, the virus that infects E. coli, 48,502 base pairs of linear DNA. We sample reads of length 100 with uniformly random start positions, inject substitution errors independently with probability e per base, cut every read into k-mers, and build the graph. Nodes are distinct (k−1)-mers, and every distinct k-mer is one edge. That word distinct will matter a lot later. At the bottom you see the first 20 bases of lambda with k = 5: the yellow window becomes an edge from its prefix to its suffix. Notice the purple nodes. GGCG appears twice in this read, so both occurrences become the same node and the path loops back. Each point in our plots is the mean over five replicates, three for the k-mer sweeps, with one-standard-deviation bands.

**Transition.** To compare runs we need a single number for 'how broken is this graph'.

---

## 5. Defining Graph Degradation — 1:00

**Argument.** Define D: a log-scaled fragmentation term plus a normalized imbalance term.

**Points to make**
- Fragmentation term ln C / ln|V|: 0 for one component, 1 if every node is isolated; log because C spans orders of magnitude.
- Imbalance term I / 2|E|: 2|E| is the maximum possible imbalance.
- Linear genome: I = 2 even when perfect, so D ≈ 0.00001.
- It is structural — it says nothing about uniqueness.

**Demo / controls.** → reveals the two-component example, → the imbalance example (numbers are computed live), → the warning line.

**Script.**

> Our normalized degradation index has two halves. [→] The orange half is fragmentation: the log of the number of weakly connected components divided by the log of the number of nodes. One component gives zero, every node isolated gives one. We use a logarithm because C ranges from 1 to thousands, and the first breaks are the most important. This example has two components out of ten nodes, giving 0.15. [→] The cyan half is imbalance: for each node, the difference between incoming and outgoing edges, summed, and divided by 2|E|, the worst case. A branch creates two unbalanced nodes here. Note that a linear genome always has imbalance 2 — its start and its end — so a perfect lambda graph scores about 0.00001, not exactly zero. [→] And keep this in mind: D measures structure — whether an Eulerian path can exist. It does not ask whether that path is unique.

**Transition.** Now the first experiment: coverage.

---

## 6. Coverage Experiment: Results — 1:30

**Argument.** H1 confirmed: exponential decay — but only after an initial increase.

**Points to make**
- Peaks: k = 21 → 216 at c ≈ 1–1.5; k = 31 → 252 at c = 1.5; k = 51 → 360 at c = 2.
- One component at c = 12, 15, 20.
- Exponential fits from c ≈ 2: R² 0.988–0.997; decay rates 0.59, 0.50, 0.36.
- Simulation on the right is a toy, labelled as such.

**Demo / controls.** Hover a point for mean ± sd. 'Show original figure' swaps in the matplotlib plot. In the toy panel press Play (or K): islands appear, multiply, then merge. R resets.

**Script.**

> Error-free reads, coverage from 0.5 to 30, three values of k. The y-axis is logarithmic, so a straight falling line means exponential decay — and from coverage about 2 onwards that is exactly what we see, with R-squared between 0.988 and 0.997. The graph becomes a single component at coverage 12 for k = 21, 15 for k = 31, and 20 for k = 51. The decay rates are 0.59, 0.50 and 0.36 per unit of coverage, so larger k decays more slowly. But look at the left edge: the curves first go up. For k = 51 the component count climbs to 360 at coverage 2 before it starts falling. The panel on the right is a toy simulation on 210 bases of lambda, not the experiment. [Play] With few reads every read is its own island; adding reads makes more islands; and only later do they touch and merge into one colour. So the hypothesis holds, but only after this peak.

**Transition.** Why does the curve rise first? There is a clean formula for that.

---

## 7. Why the Curve First Rises, Then Falls — 1:30

**Argument.** Lander–Waterman explains both the peak position and its height, with no fitted parameters.

**Points to make**
- N ≈ cG/L reads.
- A read starts a new island unless the next read shares a k-mer with it: probability ≈ e^(−c(L−k+1)/L).
- Maximise N·e^(−c(L−k+1)/L) → c_peak = L/(L−k+1): 1.25, 1.43, 2.0.
- Model heights 223, 255, 357 vs measured 216, 252, 360.
- Larger k ⇒ fewer k-mers per read ⇒ lower effective coverage.

**Demo / controls.** Press → three times: the toy jumps to c = 0.5, 1.5 and 8 and the matching region lights up on the measured chart. Dotted lines are the parameter-free model.

**Script.**

> The number of reads is coverage times genome length over read length. A read ends an island unless another read starts close enough to share at least one k-mer, and that close enough window is L minus k plus one bases long. So the expected number of islands is N times e to the minus c times (L − k + 1) over L. [→] At very low coverage N is small, so we only have a few isolated reads. [→] As N grows, the count grows — until the exponential takes over. Setting the derivative to zero gives c-peak equals L over L minus k plus one: 1.25, 1.43 and 2.0 for our three k. The table shows the observed peaks sit exactly there, and even the heights match: the model predicts 255 islands for k = 31, we measured 252. [→] Beyond the peak, overlaps win and islands merge exponentially. The dotted lines have no fitted parameter at all. The key intuition: larger k means fewer k-mers per read, so the effective coverage is lower and everything shifts right.

**Transition.** Second experiment: sequencing errors.

---

## 8. Sequencing Error Experiment: Results — 1:30

**Argument.** H2 partly confirmed: imbalance always rises, but bends below the linear prediction.

**Points to make**
- c = 30, k = 31, e from 0 to 2%.
- Imbalance per error (minus boundary 2): 1.95, 1.91, 1.63, 1.37, 1.05.
- ≈ 30,500 total imbalance at 2%.
- Dashed line = 'every error isolated' model: 2 per substitution.

**Demo / controls.** Hover points for I and number of errors. Point at the gap between the dashed model and the measured curve. Original figure available.

**Script.**

> Coverage 30, k = 31, and we raise the substitution rate from zero to two percent. The imbalance rises monotonically — no surprise. The dashed yellow line is what you get if every error contributes exactly 2, independently. At low rates the data sits right on it: at 0.05 percent, each error adds 1.95. But the measured curve bends away. At 1 percent each error adds only 1.37, at 2 percent only 1.05, and the total stops at about 30,500 instead of almost 60,000. Where does the number 2 come from? Look at the small graph: an error in the middle of a read creates a bubble. The path leaves the true graph at one node, which now has two outgoing edges, and rejoins at another, which has two incoming edges. Two nodes off by one: plus 2. So the hypothesis is right only while errors are sparse.

**Transition.** Why does it stop being linear? Let's inject errors ourselves.

---

## 9. Why Error Growth Becomes Sublinear — 1:30

**Argument.** Errors within k−1 bases share one bubble; overlap probability explains the curvature.

**Points to make**
- Mid-read error → bubble (+2). Error at read end → tip (+2).
- Two errors 2 bp apart → one bigger bubble, still +2 total.
- Two errors far apart → two bubbles, +4.
- P = 1 − (1−e)^(2(k−1)): 6% at 0.1%, 70% at 2%.
- Not every error has identical topology — collisions with existing k-mers can happen.

**Demo / controls.** Click 'Mid-read error' (bubble, I − 2 = 2), 'Error at read end' (tip), '2 errors, 2 bp apart' (one bubble, still 2), '2 errors, far apart' (4). Clicking any base also mutates it. Then drag the e slider to 2%.

**Script.**

> This is a real graph on 30 bases of lambda, k = 5. Grey is the true path. [Mid-read error] One substitution in the middle of the read: the k windows that contain it are highlighted in the read, they form the orange detour, and the two red nodes are where it leaves and rejoins. Imbalance above the baseline: 2. [Error at read end] Near the end of the read, the detour never rejoins — that is a tip, a dead end. Also plus 2. [2 errors far apart] Two errors far apart: two bubbles, plus 4. Additive. [2 errors close] But two errors only two bases apart: their windows overlap, so they produce one larger bubble, and the total is still 2, not 4. Now, how often does an error have a neighbour within k − 1 bases on either side? One minus (1 − e) to the power 2(k − 1). [slider] At 0.1 percent, about 6 percent of errors. At 2 percent, 70 percent. That is exactly why the per-error contribution falls from 1.95 to 1.05.

**Transition.** Third experiment: varying k — and this is where things get strange.

---

## 10. k-mer Experiment: Results — 1:30

**Argument.** H3 partly confirmed: a lopsided U for k ≥ 8, driven by different terms on each side — and an unexplained drop at k ≤ 6.

**Points to make**
- Peak D ≈ 0.05 at k = 8–9.
- Valley k ≈ 13–31: ≈ 0 without errors, 0.009–0.017 with errors.
- k = 95: D = 0.38–0.47.
- Left side: only the imbalance term; right side: the component term.
- Leave k ≤ 6 as a question mark for now.

**Demo / controls.** → shades the motif-collision region, → the valley, → the large-k region. Keep the grey '?' region unexplained — it pays off on slide 12.

**Script.**

> Coverage 30, k from 4 to 95 on a log axis, three error rates. Our proposal predicted a U. [→] On the left there is a small peak at k = 8 or 9, about 0.05. Lambda has no long repeats, so this comes from short words that recur by chance — motif collisions. [→] Then a long valley from roughly 13 to 31, where k-mers are distinctive and the graph is almost perfect: zero without errors, around 0.01 to 0.02 with errors. [→] And on the right a steep wall: at k = 95 the index reaches 0.38 to 0.47. The two sides are produced by different terms: the left only by imbalance, the right by fragmentation, which is logarithmic and climbs fast once the graph shatters. So yes, a U — but very asymmetric. And there is something we did not expect at all: below k = 7 the index falls back to zero. Hold that thought.

**Transition.** First, the right side: what moves the wall?

---

## 11. How Coverage Shifts the k-mer Threshold — 1:30

**Argument.** The large-k threshold is set by coverage and errors: fewer windows per read, and fewer error-free ones.

**Points to make**
- e = 0: threshold k* = 31, 51, 61, 71, 81 for c = 10…30.
- e = 0.005: 25, then stuck at 31.
- Windows per read L−k+1: only 6 at k = 95.
- Unsampled ≈ e^(−c(L−k+1)/L) = 55% at k = 95, c = 10; measured 54.7%.
- Error-free probability (1−e)^k shrinks with k.

**Demo / controls.** Click c = 10 … 30 to switch between the measured sweeps; the vertical lines show the threshold. Drag the k slider from 95 down to 31 and watch the windows per read and the unsampled fraction.

**Script.**

> We define the threshold as the first k where D exceeds 0.05. [click through c] Without errors it moves steadily right with coverage: 31 at coverage 10, 51, 61, 71 and 81 at coverage 30. With half a percent of errors it moves to 31 and then gets stuck there. The arithmetic on the right explains both. [slider] A 100-base read holds L minus k plus one k-mers. At k = 95 that is just six. So at coverage 10 the k-mer coverage is only 0.6, and Poisson says about 55 percent of the genome's k-mers are never sampled. We measured 54.7 percent. More coverage pushes this point to larger k. Errors pull it back: a k-mer is read correctly only with probability (1 − e) to the k, so the longer the k-mer, the less of your coverage is actually usable. Coverage moves the right side. But notice: coverage does nothing at all to the left side.

**Transition.** Which brings us back to the strange left side.

---

## 12. The Surprise: Zero Degradation — 1:30

**Argument.** The headline: at k = 4 the graph is 99.5% collapsed, yet D = 0 — and a balanced, connected graph can encode thousands of different sequences.

**Points to make**
- 256 possible 4-mers, all 256 present; C = 1; I = 0; D = 0; 99.5% of positions collapsed.
- It is the complete De Bruijn graph: every node 4 in, 4 out.
- Interaction D: a simple cycle and the complete k = 2 graph both have D = 0.
- The complete graph has 20,736 Eulerian circuits (exhaustive count; BEST theorem agrees).
- The illustration is not the genome.

**Demo / controls.** → reveals the numbers, → D = 0 (pause here), → the complete graph, → switches to Interaction D. There click Traversal 1, 2, 3 or Random: each spells a different valid sequence. K replays traversal 1, R resets.

**Script.**

> Here is k = 4. [→] There are 256 possible 4-mers. In lambda's graph we observe all 256. One component. Zero imbalance. And 99.5 percent of the k-mer positions in the genome reuse a k-mer we have already seen. [→] Our degradation index is… zero. Exactly zero. At every coverage from 10 to 30, and at every error rate. The index says this is a perfect assembly. [→] What happened is that the graph became the complete De Bruijn graph: 64 nodes, each with exactly four edges in and four out. Connected and balanced — Eulerian. But there is no way to read lambda back out of it. [→] Let me show this on graphs small enough to count. Left: a simple cycle — connected, balanced, D = 0, and exactly one way to traverse it. Right: all sixteen dinucleotides, the complete graph for k = 2. Also connected, balanced, D = 0. [Traversal 1, 2, 3] Every traversal spells a different sequence, and every one is equally valid. We enumerated them: 20,736. Same score. Twenty thousand times the ambiguity.

**Transition.** So why does our metric miss this?

---

## 13. Why Our Metric Fails — 1:30

**Argument.** Saturation: when 4^k ≪ G, distinct k-mers saturate, both terms of D vanish, but uniqueness is gone. A limitation of the metric, not of the experiment.

**Points to make**
- Table: collapsed 99.5 → 13.8% and D 0 → 0.051 → 0.036 for k = 4…9 (c = 10, e = 0.001).
- Distinct-edge model keeps one copy of each k-mer.
- Errors cannot add anything: every wrong k-mer already exists.
- k = 6: 43 of 4,096 6-mers never occur in lambda → small imbalance.
- The experiment measured exactly what D defines; D just does not define ambiguity.

**Demo / controls.** Interaction C (210 bp of lambda, all k-mers): k = 2 → all 16 dinucleotides, 92% collapsed, C = 1, I = 0, D = 0. k = 4 → the toy's peak (D ≈ 0.06; log₄ 210 ≈ 3.9). k ≥ 8 → a clean path, D ≈ 0.002. Then click 'reads: c = 4' and push k to 20: components appear and D rises to ≈ 0.27 — the whole asymmetric U in miniature.

**Script.**

> The mechanism is saturation. Our graph keeps one edge per distinct k-mer. With k = 4 there are only 256 possible words, and lambda has 48,500 positions, so almost every word appears many times and all those copies collapse into one edge. The table shows it: 99.5 percent collapsed at k = 4, 98 at k = 5, 92 at k = 6, and the index is zero, zero, 0.002. Errors cannot hurt either, because every erroneous k-mer already exists in the graph. Why is k = 6 not quite zero? Lambda contains only 4,053 of the 4,096 possible 6-mers; some short motifs are under-used in phages, so the graph is almost, but not exactly, complete. [demo] You can see the same thing in miniature on 210 bases of lambda. At k = 2 all sixteen dinucleotides are present, 92 percent of positions collapse, and D is exactly zero. [k = 4] The toy peaks at k = 4, which is log4 of 210. [k = 10] Then it becomes a clean path. To be clear: this is not a failure of the experiment. The pipeline measured exactly what D defines. [→] The problem is the definition: connected and balanced does not mean uniquely reconstructable.

**Transition.** And the location of that left-side peak can be predicted.

---

## 14. Why the Peak Occurs Near k = 8 — 1:00

**Argument.** The transition sits where 4^k ≈ G, i.e. k ≈ log₄ G ≈ 7.8 for lambda.

**Points to make**
- Imbalance is largest when the graph is about half full.
- log₄ 48,502 ≈ 7.8 → observed peak k = 8–9, at every coverage.
- Depends on genome length and composition, not coverage.
- Future work: E. coli 4.6 Mb → k ≈ 11.

**Demo / controls.** Point at the intersection. → adds the E. coli line, clearly labelled as a prediction to test.

**Script.**

> Imbalance is highest when the graph is about half full — when many nodes get an uneven mix of incoming and outgoing edges. That happens when the number of possible k-mers is about the genome length. Four to the k equals G gives k equals log base 4 of G, which for lambda is 7.8. The measured peak is at k = 8 or 9, and on the previous slides it was at the same place for every coverage, which fits: the position depends on genome length and composition, not on how deeply you sequence. [→] This gives a falsifiable prediction. For a 4.6-megabase E. coli chromosome the transition should move to about k = 11. We have not run that yet; it is future work, at about a hundred times the compute.

**Transition.** Let's put the three verdicts side by side.

---

## 15. What the Results Actually Tell Us — 1:00

**Argument.** Scorecard and the key distinction between existence, uniqueness and correctness.

**Points to make**
- Coverage: confirmed after the low-coverage peak.
- Errors: partially — linear only while sparse.
- k: partially — asymmetric U, blind for k ≤ 6.
- Eulerian path exists ≠ unique ≠ correct.

**Demo / controls.** Sparklines are the real measured curves. → reveals the three properties.

**Script.**

> Here is the scorecard. Coverage: confirmed, once you get past the low-coverage peak, which Lander–Waterman predicts. Errors: partially confirmed — the growth is linear only while errors are sparse, because overlapping error windows share bubbles. k-mer size: partially confirmed — we see an asymmetric U above about log4 G, and below that our index is blind. [→] The deeper lesson is that three properties are easy to confuse. First, does an Eulerian traversal exist? That needs one component and balanced degrees, and it is what our index measures. Second, is that traversal unique? That depends on branching and repeat structure, and our index cannot see it. Third, is the sequence correct? That requires comparing against the reference. Our index measures topology, not reconstruction ambiguity.

**Transition.** To close, what we take away.

---

## 16. Conclusion and Future Work — 1:00

**Argument.** Our contribution: quantified, explained degradation — and a concrete limitation of structural metrics.

**Points to make**
- Four findings.
- Future work: ambiguity term, repeat/branching analysis, compare with reconstruction accuracy, larger genomes, k-mer filtering.
- Closing line.

**Demo / controls.** The graph keeps tracing new valid traversals of the same balanced graph. → future work, → closing quote.

**Script.**

> Four findings. Coverage controls connectivity, and a simple Poisson argument predicts both the peak and the exponential decay. Substitution errors create about two units of imbalance each, until their windows start to overlap. The k-mer size has two competing failure modes, split near log4 of the genome length. And structural metrics alone do not describe assembly quality. [→] Next, we want an ambiguity-aware term — for example counting branching nodes, which rises exactly where our index falls to zero — and to compare the index with actual reconstruction accuracy, test the log4 G prediction on E. coli, and try k-mer count filtering to remove errors. [→] The graph on the right is balanced and connected, and it keeps spelling a new genome every few seconds. A graph can be perfectly Eulerian and still fail to uniquely describe the genome. Thank you — we are happy to take questions.

**Transition.** Questions.

---

