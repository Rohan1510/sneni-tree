// Compute 3D positions for a family tree, plus the edges to draw.
// Generation (y): older generation = positive y, younger = negative y.
// Strategy:
//  1. BFS from first member, assigning generations (parents +1, children -1, partners +0)
//  2. Group by generation, cluster partners adjacent, spread along x
//  3. Add small z variance for depth

export function computeLayout(members) {
  if (!members || members.length === 0) {
    return { nodes: {}, edges: [] };
  }

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

  // Disconnected nodes -> place at gen 0
  for (const m of members) {
    if (!visited.has(m.id)) generations[m.id] = 0;
  }

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
    // Order: cluster partners adjacent
    const ordered = [];
    const used = new Set();
    for (const m of list) {
      if (used.has(m.id)) continue;
      ordered.push(m);
      used.add(m.id);
      for (const pid of m.partner_ids || []) {
        if (!used.has(pid) && byId[pid] && generations[pid] === g) {
          ordered.push(byId[pid]);
          used.add(pid);
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
  for (const m of members) {
    for (const pid of m.parent_ids || []) {
      if (byId[pid]) edges.push({ from: pid, to: m.id, type: "parent" });
    }
  }
  const seen = new Set();
  for (const m of members) {
    for (const pid of m.partner_ids || []) {
      const k = [m.id, pid].sort().join("|");
      if (seen.has(k)) continue;
      seen.add(k);
      if (byId[pid]) edges.push({ from: m.id, to: pid, type: "partner" });
    }
  }

  return { nodes, edges };
}
