"""De Bruijn graph genome assembly and degradation analysis."""

from .genome import random_genome, plant_repeats, read_fasta, make_genome
from .reads import simulate_reads, tile_reads
from .graph import DeBruijnGraph
from .euler import eulerian_path, spell_path
from .metrics import compute_metrics, degradation_index
from .pipeline import run_config

__all__ = [
    "random_genome", "plant_repeats", "read_fasta", "make_genome",
    "simulate_reads", "tile_reads", "DeBruijnGraph", "eulerian_path",
    "spell_path", "compute_metrics",
    "degradation_index", "run_config",
]
