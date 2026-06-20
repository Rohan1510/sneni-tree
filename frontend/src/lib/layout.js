// Compute 3D positions for a family tree and edges to draw.
//  - Generations: BFS from first member. Parents = +1, partners = same, children = -1.
//  - Within each generation: cluster by parent-set so siblings sit adjacent, then keep partners next to each other.
//  - Edges: parent-child, partner, sibling (shared parents).

export function computeLayout(members) {
  if (!members || members.length === 0) return { nodes: {}, edges: [] };

  const byId = Object.fromEntries(members.map(m => [m.id, m]));
  const generations = {};
  const visited = new Set();
  const queue = [];

  const seed = members[0];
  generations[seed.id] = 0;
  visited.add(seed.id);
  queue.push(seed.id);

  while (queue.length) {
    const id = queue.shift();
    const m = byId[id];
    const gen = generations[id];

    for (const pid of m.parent_ids || []) {
      if (byId[pid] && !visited.has(pid)) {
        generations[pid] = gen + 1;
        visited.add(pid);
        queue.push(pid);
      }
    }
    for (const pid of m.partner_ids || []) {
      if (byId[pid] && !visited.has(pid)) {
        generations[pid] = gen;
        visited.add(pid);
        queue.push(pid);
      }
    }
    for (const other of members) {
      if ((other.parent_ids || []).includes(id) && !visited.has(other.id)) {
        generations[other.id] = gen - 1;
        visited.add(other.id);
        queue.push(other.id);
      }
    }
  }
  for (const m of members) if (!visited.has(m.id)) generations[m.id] = 0;

  // Group by generation
  const byGen = {};
  for (const m of members) {
    const g = generations[m.id];
    if (!byGen[g]) byGen[g] = [];
    byGen[g].push(m);
  }

  const SPACING_X = 4.8;
  const SPACING_Y = 4.5;
  const nodes = {};

  for (const [gStr, list] of Object.entries(byGen)) {
    const g = Number(gStr);
    // Cluster by parent set so siblings are adjacent
    const groups = new Map(); // key: sorted parent ids -> [members]
    for (const m of list) {
      const key = (m.parent_ids || []).slice().sort().join("|") || "_orphan";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }

    const ordered = [];
    const used = new Set();
    for (const group of groups.values()) {
      for (const m of group) {
        if (used.has(m.id)) continue;
        ordered.push(m);
        used.add(m.id);
        // Place partners right after, even if in different sibling group
        for (const pid of m.partner_ids || []) {
          if (!used.has(pid) && byId[pid] && generations[pid] === g) {
            ordered.push(byId[pid]);
            used.add(pid);
          }
        }
      }
    }

    const n = ordered.length;
    ordered.forEach((m, i) => {
      const x = (i - (n - 1) / 2) * SPACING_X;
      const y = g * SPACING_Y;
      const z = ((i % 2 === 0) ? 0.4 : -0.4);
      nodes[m.id] = { x, y, z };
    });
  }

  // Edges
  const edges = [];

  // Parent → child
  for (const m of members) {
    for (const pid of m.parent_ids || []) {
      if (byId[pid]) edges.push({ from: pid, to: m.id, type: "parent" });
    }
  }

  // Partner (undirected, deduped)
  const seenP = new Set();
  for (const m of members) {
    for (const pid of m.partner_ids || []) {
      const k = [m.id, pid].sort().join("|");
      if (seenP.has(k)) continue;
      seenP.add(k);
      if (byId[pid]) edges.push({ from: m.id, to: pid, type: "partner" });
    }
  }

  // Siblings: share at least one parent. Only between members with parents.
  const seenS = new Set();
  const withParents = members.filter(m => (m.parent_ids || []).length > 0);
  for (let i = 0; i < withParents.length; i++) {
    for (let j = i + 1; j < withParents.length; j++) {
      const a = withParents[i], b = withParents[j];
      const sharedParent = (a.parent_ids || []).some(p => (b.parent_ids || []).includes(p));
      if (!sharedParent) continue;
      const k = [a.id, b.id].sort().join("|");
      if (seenS.has(k)) continue;
      seenS.add(k);
      edges.push({ from: a.id, to: b.id, type: "sibling" });
    }
  }

  return { nodes, edges };
}
