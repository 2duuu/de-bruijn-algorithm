"""Eulerian path / circuit traversal (Hierholzer's algorithm)."""

from __future__ import annotations

from .graph import DeBruijnGraph


def euler_condition(g: DeBruijnGraph, nodes: list[str]) -> tuple[bool, str | None]:
    """Check the directed Euler condition on one weakly connected component.

    Returns ``(ok, start)``: an Eulerian path exists iff every node is balanced
    except possibly one node with out-in = +1 (start) and one with in-out = +1.
    """
    start = None
    plus = minus = 0
    for v in nodes:
        d = g.out_degree(v) - g.in_degree(v)
        if d == 0:
            continue
        if d == 1:
            plus += 1
            start = v
        elif d == -1:
            minus += 1
        else:
            return False, None
    if (plus, minus) not in ((0, 0), (1, 1)):
        return False, None
    if start is None:  # circuit: start anywhere with an outgoing edge
        start = next((v for v in nodes if g.out_degree(v) > 0), nodes[0])
    return True, start


def eulerian_path(g: DeBruijnGraph, start: str) -> list[str]:
    """Hierholzer's algorithm from ``start``; returns the node sequence.

    Uses every distinct edge reachable from ``start`` exactly once. The caller
    is responsible for checking :func:`euler_condition` first.
    """
    ptr: dict[str, int] = {}
    stack, path = [start], []
    while stack:
        u = stack[-1]
        out = g.out_adj[u]
        i = ptr.get(u, 0)
        if i < len(out):
            stack.append(out[i])
            ptr[u] = i + 1
        else:
            path.append(stack.pop())
    path.reverse()
    return path


def spell_path(path: list[str]) -> str:
    """Spell the sequence of a node path (consecutive nodes overlap by k-2)."""
    if not path:
        return ""
    return path[0] + "".join(v[-1] for v in path[1:])


def spell_cycle(path: list[str]) -> str:
    """Spell a closed node path (first == last) as a cyclic sequence of length |E|."""
    return "".join(v[0] for v in path[:-1])


def assemble_eulerian(g: DeBruijnGraph, components: list[list[str]] | None = None) -> dict:
    """Run the Eulerian traversal on every weakly connected component.

    Returns per-component results: whether an Euler path exists, whether it is
    a circuit and the spelled sequence (only for Eulerian components).
    """
    comps = components if components is not None else g.weak_components()
    results = []
    for comp in comps:
        ok, start = euler_condition(g, comp)
        rec = {"n_nodes": len(comp), "eulerian": ok, "circuit": False, "sequence": None}
        if ok:
            p = eulerian_path(g, start)
            n_edges = sum(g.out_degree(v) for v in comp)
            assert len(p) == n_edges + 1, "Euler path did not use every edge"
            circuit = len(p) > 1 and p[0] == p[-1] and g.out_degree(start) == g.in_degree(start)
            rec["circuit"] = circuit
            rec["sequence"] = spell_cycle(p) if circuit else spell_path(p)
        results.append(rec)
    return {"components": results}
