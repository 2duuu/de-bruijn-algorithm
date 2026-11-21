# Project Proposal

## Team and Topic

* **Students:** Tudor Pisica, Andrei Stan

* **Topic:** Analyzing the Degradation of De Bruijn Graphs in Genome Assembly

* **Key papers and resources:**
  * Pevzner, P. A., Tang, H., & Waterman, M. S. (2001). "An Eulerian path approach to DNA fragment assembly." *Proceedings of the National Academy of Sciences*. [https://pmc.ncbi.nlm.nih.gov/articles/PMC55524/](https://pmc.ncbi.nlm.nih.gov/articles/PMC55524/)
  * Zerbino, D. R., & Birney, E. (2008). "Velvet: Algorithms for de novo short read assembly using de Bruijn graphs." *Genome Research*. [https://pmc.ncbi.nlm.nih.gov/articles/PMC2336801/](https://pmc.ncbi.nlm.nih.gov/articles/PMC2336801/)
  * Edmonds, J., & Johnson, E. L. (1973). "Matching, Euler tours and the Chinese postman." *Mathematical Programming* 5, 88–124. [https://doi.org/10.1007/BF01580113](https://doi.org/10.1007/BF01580113)

## Idea and Research Questions

* **Idea:** Our primary objective is to quantify the structural degradation of De Bruijn graph-based genome assemblies under realistic constraints. By evaluating a grid of sequencing error rates and coverage depths, we aim to map how assembly fidelity degrades as a function of the chosen $k$-mer size ($k$).

* **Research questions:** Under which specific input perturbations (e.g., coverage gaps, base substitution errors, sub-optimal $k$-mer choices) does the idealized Eulerian path model break down, and what is the mathematical rate of this topological degradation?

* **Predictions:**

  * **Coverage:** As sequencing coverage increases, we hypothesize that the number of connected components will decay exponentially toward one. Random gaps should close according to Poisson distribution, gradually stitching fragmented subgraphs into a single, contiguous component.

  * **Errors:** Increasing the sequencing error rate will cause a monotonic linear rise in graph imbalance, as independent base substitutions systematically generate dead-end tips (nodes whose endpoints lack outgoing/incoming edges).

  * $k$**-mer Variation (with errors):** When sequencing errors are present, varying the $k$-mer size will yield a U-shaped convex degradation curve. Small $k$ values will collapse identical repeats into tangled topological knots, while excessively large $k$ values will exponentially reduce the probability of error-free overlaps, shattering the graph into disjoint pieces.

  * $k$**-mer Variation (without errors):** In an error-free environment, degradation will remain flat at high coverage because longer overlaps cleanly untangle repeats without dropping connectivity. Conversely, at low coverage, degradation will rise steadily as increasing the required overlap length creates an escalating number of coverage gaps.

## Implementation

* **Own code and reused code:** We will develop a custom software pipeline from scratch. This includes the synthetic read sampling, the construction of the De Bruijn graph, the Eulerian path traversal, and the computation of the degradation indices.

* **Language and tools:** Python. Our workflow will consist of the following automated steps:

  1. Generate synthetic DNA reads from a known reference genome.

  2. Modulate system parameters across a defined search grid: overlap length ($k$), sequencing coverage depth ($c$), and error rate ($e$).

  3. Run the custom assembly algorithm for each configuration.

  4. Measure structural degradation using a fixed mathematical formula.

  5. Output the results as visualizations, plotting degradation as a function of $k$ against our ($c$, $e$) search grid.

* **Correctness check:** To validate our implementation, we will test the pipeline against synthetic datasets with known analytical ground truths before executing full genome sweeps.

  * *First*, we will generate a small, error-free linear sequence to verify that at high coverage, the graph yields exactly one connected component and zero imbalance (except at the boundary start/end nodes).

  * *Next*, we will introduce controlled point mutations to confirm that tip nodes and dead-ends scale in exact proportion to the introduced error count.

  * *Then*, we will construct a sequence with an intentional exact repeat and test $k$ values strictly below and above the repeat length to ensure the repeat collapse vanishes exactly when $k$ exceeds the repeat length.

  * *Finally*, we will log graph invariants (e.g., total $k$-mers, edge-node balance conservation, component counts) across a parameter sweep to guarantee our resulting curves match expected theoretical trajectories (exponential decay, linear growth, U-shape) without numerical discontinuities.

## Evaluation Plan

* **Baselines, references, ground truth:** Our theoretical baseline is the ideal scenario: zero sequencing errors and complete $k$-mer generation. Under these assumptions, a perfect Eulerian path exists, and the degradation metric will be exactly 0.

* **Metrics:**

  * **Number of connected components:** Serves as a measure of the graph's weak connectivity.

  * **Graph imbalance:** The cumulative discrepancy between node in-degree and out-degree across the assembly.

  * **Normalized degradation index:** A composite score to quantify overall assembly failure.

* **Inputs:** Coverage depth ($c$), Sequencing error rate ($e$), $k$-mer size ($k$), and Fixed read length ($L$).

* **Sketch of the key plots:** We expect to generate 2D performance curves illustrating:

  * An exponential decay curve (Y: Connected Components vs. X: Coverage Depth).

  * A linear growth line (Y: Graph Imbalance vs. X: Error Rate).

  * A U-shaped convex curve (Y: Normalized Degradation vs. X: $k$-mer size).

## Schedule

* **Minimal experiment before the pre-defense review:** We will conduct core experimental sweeps to validate our foundational hypotheses:

  1. **Coverage Sweep (**$e = 0$**):** Demonstrating the exponential decay of connected components.

  2. **Error Sweep (fixed** $c$**, fixed** $k$**):** Plotting the monotonic linear growth of graph imbalance.

  3. $k$**-mer Sweep (small** $e$**, fixed high** $c$**):** Mapping the U-shaped normalized degradation curve.

* **Extensions:** If time permits, we will implement and evaluate a simple $k$-mer frequency threshold (coverage cutoff) to demonstrate basic error recovery and graph topology restoration.

* **Main risk:** Computational bottlenecks. Assembling the complete human genome (\~3.2 billion base pairs) is computationally prohibitive for our timescale. **Mitigation:** We will conduct our experiments on a smaller, circular bacterial reference genome, which is mathematically sufficient to prove our hypotheses while remaining computationally tractable.