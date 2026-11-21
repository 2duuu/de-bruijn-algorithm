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
| 6 | Why We Chose This Metric | 1:00 | 139 | 1:00 |
| 7 | Coverage Experiment: Results | 1:30 | 163 | 1:10 |
| 8 | Why the Curve First Rises, Then Falls | 1:30 | 178 | 1:16 |
| 9 | Sequencing Error Experiment: Results | 1:30 | 148 | 1:03 |
| 10 | Why We Expected Linear Growth | 1:00 | 138 | 0:59 |
| 11 | Why Error Growth Becomes Sublinear | 1:30 | 117 | 0:50 |
| 12 | Counting Bubbles, Not Errors | 1:00 | 212 | 1:31 |
| 13 | k-mer Experiment: Results | 1:30 | 158 | 1:08 |
| 14 | What Drives Each Zone | 1:30 | 196 | 1:24 |
| 15 | How Coverage Shifts the k-mer Threshold | 1:30 | 154 | 1:06 |
| 16 | The Surprise: Zero Degradation | 1:00 | 105 | 0:45 |
| 17 | An Eulerian Path Exists, but It Is Not Unique | 0:45 | 67 | 0:29 |
| 18 | Why Our Metric Fails | 1:30 | 197 | 1:24 |
| 19 | Why the Peak Occurs Near k = 8 | 1:00 | 132 | 0:57 |
| 20 | Why the Imbalance Peaks at k ≈ 8 | 1:00 | 182 | 1:18 |
| 21 | What the Results Actually Tell Us | 1:00 | 123 | 0:53 |
| 22 | Conclusion and Future Work | 1:00 | 216 | 1:33 |
| | **Total** | **25:45** | **3319** | **23:42** |

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

## 6. Why We Chose This Metric — 1:00

**Argument.** D is built from C and I because the minimum repair needed to make the graph Eulerian depends on exactly those two numbers (Edmonds & Johnson 1973).

**Points to make**
- Repair = fewest new edges so the graph has an Euler tour.
- Edmonds & Johnson: R = I/2 for one component; R = Σⱼ max(1, Iⱼ/2) for C ≥ 2, so max(C, I/2) ≤ R ≤ C + I/2.
- Toy: C = 2, I = 6 → exactly 3 added edges make it Eulerian.
- Normalise: I/2 per edge = I/(2|E|); components on a log scale because C spans orders of magnitude.
- Equal weights; D = 0 means no repair needed.

**Demo / controls.** Step 0: degraded toy graph with its red unbalanced nodes. → the 3 yellow repair edges appear and the graph becomes Eulerian. → normalisation (compare the three options for C). → the final formula.

**Script.**

> Why these two ingredients? We asked: what is the smallest number of edges you must add to a broken graph so that it has an Euler tour? Edmonds and Johnson answered this in 1973, in their work on Euler tours and the Chinese postman. With one component you need I over 2 new edges; with several, the sum over components of max(1, I_j over 2) — always between max(C, I/2) and C plus I/2. So the repair cost depends on components and imbalance, and nothing else. [→] Here: two components, imbalance 6, and exactly three yellow edges make it Eulerian. [→] Raw counts grow with the genome, so we normalise: I over 2 per edge is I over 2|E|, and components get a logarithm, because C/|V| stays near zero and 1 − 1/C saturates. [→] Average the two and you get D.

**Transition.** With the metric defined and motivated, let's look at the first experiment.

---

## 7. Coverage Experiment: Results — 1:30

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

## 8. Why the Curve First Rises, Then Falls — 1:30

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

## 9. Sequencing Error Experiment: Results — 1:30

**Argument.** H2 partly confirmed: imbalance always rises, but bends below the linear prediction.

**Points to make**
- c = 30, k = 31, e from 0 to 2%.
- Imbalance per error (minus boundary 2): 1.95, 1.91, 1.63, 1.37, 1.05.
- ≈ 30,500 total imbalance at 2%.
- Dashed line = 'every error isolated' model: 2 per substitution.

**Demo / controls.** Hover points for I and number of errors. Point at the gap between the dashed model and the measured curve. Original figure available.

**Script.**

> Coverage 30, k = 31, and we raise the substitution rate from zero to two percent. The imbalance rises monotonically — no surprise. The dashed yellow line is what you get if every error contributes exactly 2, independently. At low rates the data sits right on it: at 0.05 percent, each error adds 1.95. But the measured curve bends away. At 1 percent each error adds only 1.37, at 2 percent only 1.05, and the total stops at about 30,500 instead of almost 60,000. Where does the number 2 come from? Look at the small graph: an error in the middle of a read creates a bubble. The path leaves the true graph at one node, which now has two outgoing edges, and rejoins at another, which has two incoming edges. Two nodes off by one: plus 2. So the hypothesis is right only while errors are sparse.

**Transition.** Before explaining the bend: where did the straight line come from?

---

## 10. Why We Expected Linear Growth — 1:00

**Argument.** H2 came from a counting argument: expected errors grow in proportion to e, and each error was assumed to cost exactly +2.

**Points to make**
- N reads × L bases = N·L sequenced bases (N = cG/L = 14,551, L = 100 → 1,455,100).
- Each base is wrong with probability e, independently → E[#errors] = N·L·e.
- Assumption: every error is isolated → one bubble → +2.
- So I = 2 + 2·E[#errors] = 2 + 2NLe: a straight line in e.
- Fits at 0.05–0.1%; at 2% the prediction (≈ 58,200) is almost twice the measurement (≈ 30,500).

**Demo / controls.** → three times: bases read, expected errors, the +2 assumption; the last → reveals the predicted-vs-measured table.

**Script.**

> Where did our straight line come from? It is just counting. We have N reads, each L bases long, so we sequence N times L bases — 14,551 reads of 100 bases, about 1.46 million bases. [→] Every one of those bases is wrong with probability e, independently, so the expected number of errors is N times L times e. At one percent that is about 14,500 errors. [→] Then the assumption: every error is isolated, so each one makes its own bubble and adds exactly 2 to the imbalance. Plus the 2 that the linear genome always has at its ends. So I equals 2 plus 2 N L e, a straight line in e. [→] And at low error rates it works. But at 2 percent it predicts 58,000 and we measured 30,500. So the assumption must break somewhere.

**Transition.** So why does it stop being linear? Let's inject errors ourselves.

---

## 11. Why Error Growth Becomes Sublinear — 1:30

**Argument.** Errors within k−1 bases share one bubble; overlap probability explains the curvature.

**Points to make**
- Mid-read error → bubble (+2). Error at read end → tip (+2).
- Two errors 2 bp apart → one bigger bubble, still +2 total.
- Two errors far apart → two bubbles, +4.
- Not every error has identical topology — collisions with existing k-mers can happen.

**Demo / controls.** Click 'Mid-read error' (bubble, I − 2 = 2), 'Error at read end' (tip), '2 errors, 2 bp apart' (one bubble, still 2), '2 errors, far apart' (4). Clicking any base also mutates it.

**Script.**

> This is a real graph on 18 bases of lambda, k = 4, so the nodes are 3-mers. Grey is the true path. [Mid-read error] One substitution in the middle of the read: the k windows that contain it are highlighted in the read, they form the orange detour, and the two red nodes are where it leaves and rejoins. Imbalance above the baseline: 2. [Error at read end] Near the end of the read, the detour never rejoins — that is a tip, a dead end. Also plus 2. [2 errors far apart] Two errors far apart: two bubbles, plus 4. Additive. [2 errors close] But two errors only two bases apart: their windows overlap, so they produce one larger bubble, and the total is still 2, not 4.

**Transition.** So the imbalance counts bubbles, not errors. Let's count them.

---

## 12. Counting Bubbles, Not Errors — 1:00

**Argument.** Imbalance counts bubbles, not errors: E[I] = 2 + 2NL·e(1−e)^(k−1), so each error is worth 2(1−e)^(k−1) on average.

**Points to make**
- Errors inside an open bubble add nothing: inner detour nodes are balanced.
- A base opens a bubble iff it is an error (e) AND the k−1 bases before it are correct ((1−e)^(k−1)).
- E[#bubbles] ≈ NL·e(1−e)^(k−1); E[I] ≈ 2 + 2·E[#bubbles]. Approximate: ignores read starts (+) and identical/touching bubbles across reads (−).
- Per error: 2(1−e)^30 = 1.97, 1.94, 1.72, 1.48, 1.09 vs measured 1.95, 1.91, 1.63, 1.37, 1.05.
- P = 1 − (1−e)^(2(k−1)) is how many errors have a close neighbour (6% at 0.1%, 70% at 2%); it shows sharing becomes common, but the prediction uses the one-sided (1−e)^(k−1).

**Demo / controls.** → three times for the derivation; the last → reveals the slider and table. Drag e to 2%: P climbs to 70% and the predicted value falls to 1.09.

**Script.**

> From the demo: an error inside a bubble that is already open adds nothing, because the nodes inside a detour have one edge in and one out. Only the leave and rejoin nodes count. [→] So we count bubbles. A base opens a new bubble when it is an error, probability e, and the k − 1 bases before it are all correct, probability (1 − e) to the k − 1. Over N times L bases, the expected number of bubbles is approximately N L e (1 − e) to the k − 1. [→] Each bubble adds 2, so the expected imbalance is 2 plus 2 N L e (1 − e) to the k − 1. Divide by the expected number of errors, N L e, and each error is worth 2 (1 − e) to the k − 1. [→] With k = 31: 1.97, 1.94, 1.72, 1.48 and 1.09, against measured 1.95 down to 1.05. It is an approximation: errors at the very start of a read have fewer than k − 1 bases before them, and bubbles from different reads can coincide, but the trend is captured. [slider] At 2 percent, 70 percent of errors have a close neighbour, and only about half of them still open a new bubble.

**Transition.** Third experiment: varying k — and this is where things get strange.

---

## 13. k-mer Experiment: Results — 1:30

**Argument.** H3 partly confirmed: a lopsided U for k ≥ 8, driven by different terms on each side — and an unexplained drop at k ≤ 6.

**Points to make**
- Peak D ≈ 0.05 at k = 8–9.
- Valley k ≈ 13–31: ≈ 0 without errors, 0.009–0.017 with errors.
- k = 95: D = 0.38–0.47.
- Left side: only the imbalance term; right side: the component term.
- Leave k ≤ 6 as a question mark for now.

**Demo / controls.** → shades the k-mer-repeat region, → the valley, → the large-k region. Keep the grey '?' region unexplained — it pays off on slide 16.

**Script.**

> Coverage 30, k from 4 to 95 on a log axis, three error rates. Our proposal predicted a U. [→] On the left there is a small peak at k = 8 or 9, about 0.05. Lambda has no long repeats, so this comes from short k-mers that repeat by chance — k-mer repeats, or collisions. [→] Then a long valley from roughly 13 to 31, where k-mers are distinctive and the graph is almost perfect: zero without errors, around 0.01 to 0.02 with errors. [→] And on the right a steep wall: at k = 95 the index reaches 0.38 to 0.47. The two sides are produced by different terms: the left only by imbalance, the right by fragmentation, which is logarithmic and climbs fast once the graph shatters. So yes, a U — but very asymmetric. And there is something we did not expect at all: below k = 7 the index falls back to zero. Hold that thought.

**Transition.** Why does each zone behave like that?

---

## 14. What Drives Each Zone — 1:30

**Argument.** Three regimes of k: low k → accidental k-mer repeats unbalance nodes; middle k → unique, overlapping k-mers give one balanced path; high k → reads stop overlapping and the graph shatters.

**Points to make**
- k ≈ 7–9: 4^k ≈ G, so k-mers repeat at unrelated places by accident; merged nodes have unequal in/out → I ≈ 6,100, C = 1, D ≈ 0.05 (k = 8, e = 0).
- k ≈ 13–31: unique (4^k ≫ G) and still ≥ 70 k-mers per read → one balanced path: C = 1, I = 2, D ≈ 0 (k = 31, e = 0).
- k ≳ 50: reads must overlap by ≥ k−1 bases to connect; only L−k+1 = 6 k-mers per read at k = 95 → 17% of k-mers never sampled, ≈ 2,100 components, D ≈ 0.38.
- Errors worsen the right side: a k-mer is error-free with probability (1−e)^k.
- Left peak = imbalance term; right wall = component term. k ≤ 6 is still the open question.

**Demo / controls.** → twice: the k-mer-repeat zone, then the valley, then the right wall. All numbers are means of the c = 30 k-mer sweep.

**Script.**

> Why does each zone behave the way it does? On the left, k is low, so there are only a few tens of thousands of possible k-mers, about as many as positions in lambda. The same k-mer turns up at unrelated places purely by accident, and the graph merges them into one node. Here, two different k-mers come in, but only one shared k-mer goes out, so the node is off by one. Thousands of these give an imbalance of about 6,000 at k = 8, but the graph is still one piece. [→] In the middle, k-mers are long enough to be unique, and every read still holds at least 70 of them, so neighbouring reads always share one. One balanced path, D essentially zero. [→] On the right, reads connect only if they overlap by at least k − 1 bases. At k = 95 a read holds just six k-mers, so many neighbouring reads share none, and the graph breaks into about 2,000 components. Errors make it worse, because a long k-mer is less likely to be read correctly. So the left peak comes from the imbalance term, the right wall from the component term.

**Transition.** First, the right side: what moves the wall?

---

## 15. How Coverage Shifts the k-mer Threshold — 1:30

**Argument.** The large-k threshold is set by coverage and errors: fewer windows per read, and fewer error-free ones.

**Points to make**
- e = 0: threshold k* = 31, 51, 61, 71, 81 for c = 10…30.
- e = 0.005: 25, then stuck at 31.
- k-mers per read L−k+1: only 6 at k = 95.
- Chance a k-mer is not read at all ≈ e^(−c(L−k+1)/L) = 55% at k = 95, c = 10; measured 54.7%.
- Error-free probability (1−e)^k shrinks with k.

**Demo / controls.** Click c = 10 … 30 to switch between the measured sweeps; the vertical lines show the threshold. Drag the k slider from 95 down to 31 and watch the windows per read and the unsampled fraction.

**Script.**

> We define the threshold as the first k where D exceeds 0.05. [click through c] Without errors it moves steadily right with coverage: 31 at coverage 10, 51, 61, 71 and 81 at coverage 30. With half a percent of errors it moves to 31 and then gets stuck there. The arithmetic on the right explains both. [slider] A 100-base read holds L minus k plus one k-mers. At k = 95 that is just six. So at coverage 10 the k-mer coverage is only 0.6, and Poisson says about 55 percent of the genome's k-mers are never sampled. We measured 54.7 percent. More coverage pushes this point to larger k. Errors pull it back: a k-mer is read correctly only with probability (1 − e) to the k, so the longer the k-mer, the less of your coverage is actually usable. Coverage moves the right side. But notice: coverage does nothing at all to the left side.

**Transition.** Which brings us back to the strange left side.

---

## 16. The Surprise: Zero Degradation — 1:00

**Argument.** The headline: at k = 4 the graph is 99.5% collapsed, yet D = 0 — and a balanced, connected graph can encode thousands of different sequences.

**Points to make**
- 256 possible 4-mers, all 256 present; C = 1; I = 0; D = 0; 99.5% of positions collapsed.
- It is the complete De Bruijn graph: every node 4 in, 4 out.
- D = 0 says an Eulerian path exists, not that it is unique.

**Demo / controls.** → reveals the numbers, → D = 0 (pause here), → the complete graph.

**Script.**

> Here is k = 4. [→] There are 256 possible 4-mers. In lambda's graph we observe all 256. One component. Zero imbalance. And 99.5 percent of the k-mer positions in the genome reuse a k-mer we have already seen. [→] Our degradation index is… zero. Exactly zero. At every coverage from 10 to 30, and at every error rate. The index says this is a perfect assembly. [→] What happened is that the graph became the complete De Bruijn graph: 64 nodes, each with exactly four edges in and four out. Connected and balanced — Eulerian. But there is no way to read lambda back out of it.

**Transition.** Let me show this on graphs small enough to count.

---

## 17. An Eulerian Path Exists, but It Is Not Unique — 0:45

**Argument.** An Eulerian path exists, but it is not unique: two graphs with identical C, I and D = 0 have 1 versus 20,736 valid traversals.

**Points to make**
- Left: a simple cycle — C = 1, I = 0, D = 0, exactly 1 Eulerian circuit.
- Right: the complete k = 2 graph (all 16 dinucleotides) — also C = 1, I = 0, D = 0.
- It has 20,736 Eulerian circuits (exhaustive count; BEST theorem (4!)⁴/4² agrees).
- Each traversal spells a different, equally valid sequence.
- The illustration is not the genome.

**Demo / controls.** Click Traversal 1, 2, 3 or Random: each spells a different valid sequence. K replays traversal 1, R resets.

**Script.**

> Left: a simple cycle — connected, balanced, D = 0, and exactly one way to traverse it. Right: all sixteen dinucleotides, the complete graph for k = 2. Also connected, balanced, D = 0. [Traversal 1, 2, 3] Every traversal spells a different sequence, and every one is equally valid. We enumerated them: 20,736. Same score. Twenty thousand times the ambiguity. An Eulerian path exists — but it is not unique.

**Transition.** So why does our metric miss this?

---

## 18. Why Our Metric Fails — 1:30

**Argument.** Saturation: when 4^k ≪ G, distinct k-mers saturate, both terms of D vanish, but uniqueness is gone. A limitation of the metric, not of the experiment.

**Points to make**
- Table: collapsed 99.5 → 13.8% and D 0 → 0.051 → 0.036 for k = 4…9 (c = 10, e = 0.001).
- Distinct-edge model keeps one copy of each k-mer.
- Errors cannot add anything: every wrong k-mer already exists.
- k = 6: 43 of 4,096 6-mers never occur in lambda → small imbalance.
- The experiment measured exactly what D defines; D just does not define ambiguity.

**Demo / controls.** Interaction C (210 bp of lambda, all k-mers): k = 2 → all 16 dinucleotides, 92% collapsed, C = 1, I = 0, D = 0. k = 4 → the toy's peak (D ≈ 0.06; log₄ 210 ≈ 3.9). k ≥ 8 → a clean path, D ≈ 0.002. Then click 'reads: c = 4' and push k to 20: components appear and D rises to ≈ 0.27 — the whole asymmetric U in miniature.

**Script.**

> The mechanism is saturation. Our graph keeps one edge per distinct k-mer. With k = 4 there are only 256 possible words, and lambda has 48,500 positions, so almost every word appears many times and all those copies collapse into one edge. The table shows it: 99.5 percent collapsed at k = 4, 98 at k = 5, 92 at k = 6, and the index is zero, zero, 0.002. Errors cannot hurt either, because every erroneous k-mer already exists in the graph. Why is k = 6 not quite zero? Lambda contains only 4,053 of the 4,096 possible 6-mers; some short k-mers are under-used in phages, so the graph is almost, but not exactly, complete. [demo] You can see the same thing in miniature on 210 bases of lambda. At k = 2 all sixteen dinucleotides are present, 92 percent of positions collapse, and D is exactly zero. [k = 4] The toy peaks at k = 4, which is log4 of 210. [k = 10] Then it becomes a clean path. To be clear: this is not a failure of the experiment. The pipeline measured exactly what D defines. [→] The problem is the definition: connected and balanced does not mean uniquely reconstructable.

**Transition.** And the location of that left-side peak can be predicted.

---

## 19. Why the Peak Occurs Near k = 8 — 1:00

**Argument.** The transition sits where 4^k ≈ G, i.e. k ≈ log₄ G ≈ 7.8 for lambda.

**Points to make**
- Imbalance is largest when the graph is about half full.
- log₄ 48,502 ≈ 7.8 → observed peak k = 8–9, at every coverage.
- Depends on genome length and composition, not coverage.
- Future work: E. coli 4.6 Mb → k ≈ 11.

**Demo / controls.** Point at the intersection. → adds the E. coli line, clearly labelled as a prediction to test.

**Script.**

> Imbalance is highest when the graph is about half full — when many nodes get an uneven mix of incoming and outgoing edges. That happens when the number of possible k-mers is about the genome length. Four to the k equals G gives k equals log base 4 of G, which for lambda is 7.8. The measured peak is at k = 8 or 9, and on the previous slides it was at the same place for every coverage, which fits: the position depends on genome length and composition, not on how deeply you sequence. [→] This gives a falsifiable prediction. For a 4.6-megabase E. coli chromosome the transition should move to about k = 11. We have not run that yet; it is future work, at about a hundred times the compute.

**Transition.** But why is the imbalance largest exactly there?

---

## 20. Why the Imbalance Peaks at k ≈ 8 — 1:00

**Argument.** The imbalance peaks where each k-mer appears only about once on average (G/4^k ≈ 1): chance repeats and gaps give nodes uneven in- and out-edges.

**Points to make**
- Average appearances of a k-mer = G/4^k: ≈ 47 at k = 5, ≈ 0.74 at k = 8, ≈ 0.000003 at k = 17.
- k = 5: every k-mer present → every node 4 in, 4 out → I = 0.
- k = 8: some k-mers appear 2–3 times, many never → uneven nodes → I ≈ 6,100.
- k = 17: every k-mer unique → 1 in, 1 out → I = 2 (just the two ends).
- Example: node ACAATGG appears twice (positions 188 and 19,367), letters before A and T, after A both times → 2 in-edges, 1 out-edge → off by 1.

**Demo / controls.** → reveals the lambda example.

**Script.**

> The key number is how often a k-mer appears on average: the genome length divided by 4 to the k. At k = 5, every 5-mer appears about 47 times, so every possible k-mer is there and every node has all four edges in and out: balanced. At k = 17, a k-mer appears far less than once: every k-mer is unique, so the graph is a clean path. At k = 8, each k-mer appears about once on average. That means by chance some appear twice or three times and many not at all, and nodes end up with an uneven number of in- and out-edges. [→] Here is a real example from lambda. The node ACAATGG appears twice, at two unrelated places. The letters before are A and T, so two incoming edges. The letter after is A both times, so that outgoing k-mer appears twice but is stored once: one outgoing edge. Two in, one out. Thousands of these chance repeats give an imbalance of about 6,000. And average appearances about one is exactly 4 to the k about G.

**Transition.** Let's put the three verdicts side by side.

---

## 21. What the Results Actually Tell Us — 1:00

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

## 22. Conclusion and Future Work — 1:00

**Argument.** Our contribution: quantified, explained degradation — and a concrete limitation of structural metrics.

**Points to make**
- 01 Coverage — confirmed: Lander–Waterman predicts peak and decay.
- 02 Errors — partial: ≈ 2 per substitution until errors share bubbles, ≈ 2(1−e)^(k−1) per error.
- 03 k-mer size — partial: low k chance repeats (peak at 4^k ≈ G), high k reads stop overlapping.
- 04 The metric — limitation: D = 0 ≠ solvable (complete graph at k ≤ 6, 20,736 paths in the k = 2 toy).
- Future work: ambiguity term, E. coli test (k ≈ 11), compare with reconstruction accuracy, k-mer count filtering.
- Closing line.

**Demo / controls.** The graph keeps tracing new valid traversals of the same balanced graph. → future work, → closing quote.

**Script.**

> Four findings. Coverage controls connectivity, and the Lander–Waterman model predicts both the low-coverage peak and the exponential decay. Each substitution adds about two units of imbalance, until errors land in the same bubble; counting bubbles gives about 2 (1 − e) to the k − 1 per error. The k-mer size has two failure modes: at low k, chance k-mer repeats unbalance the nodes, peaking where 4 to the k is about G; at high k, reads stop overlapping and the graph breaks apart. And our metric has a blind spot: D = 0 does not mean solvable. At k ≤ 6 the graph is complete, connected and balanced, with thousands of valid paths — like the one on the right, which keeps spelling a new sequence. [→] Next, we want an ambiguity-aware term — for example counting branching nodes, which rises exactly where our index falls to zero — and to compare the index with actual reconstruction accuracy, test the log4 G prediction on E. coli, and try k-mer count filtering to remove errors. [→] The graph on the right is balanced and connected, and it keeps spelling a new genome every few seconds. A graph can be perfectly Eulerian and still fail to uniquely describe the genome. Thank you — we are happy to take questions.

**Transition.** Questions.

---

