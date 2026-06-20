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
  // kind: 'full' (share ALL parents on each side, both have >=1 shared parent and identical parent sets having intersection size == min size and both nonempty)
  //       'half' (share at least one parent but not all)
  const seenS = new Set();
  const withParents = members.filter(m => (m.parent_ids || []).length > 0);
  for (let i = 0; i < withParents.length; i++) {
    for (let j = i + 1; j < withParents.length; j++) {
      const a = withParents[i], b = withParents[j];
      const aP = new Set(a.parent_ids || []);
      const bP = new Set(b.parent_ids || []);
      const shared = [...aP].filter(p => bP.has(p));
      if (shared.length === 0) continue;
      const k = [a.id, b.id].sort().join("|");
      if (seenS.has(k)) continue;
      seenS.add(k);
      // Full sibling: both have the same parent set (every known parent matches)
      // (handles single-parent cases too: both have only that one parent recorded)
      const isFull = aP.size === bP.size && shared.length === aP.size;
      edges.push({ from: a.id, to: b.id, type: "sibling", kind: isFull ? "full" : "half" });
    }
  }

  return { nodes, edges };
}

// Return { full: [...], half: [...] } siblings for a given member, sorted with full first.
export function siblingsOf(memberId, members) {
  const me = members.find(m => m.id === memberId);
  if (!me) return { full: [], half: [] };
  const meParents = new Set(me.parent_ids || []);
  if (meParents.size === 0) return { full: [], half: [] };
  const full = [];
  const half = [];
  for (const other of members) {
    if (other.id === memberId) continue;
    const oP = new Set(other.parent_ids || []);
    if (oP.size === 0) continue;
    const shared = [...meParents].filter(p => oP.has(p));
    if (shared.length === 0) continue;
    const isFull = meParents.size === oP.size && shared.length === meParents.size;
    (isFull ? full : half).push(other);
  }
  return { full, half };
}

// Returns bounding box {min, max, center} for nodes object {id: {x,y,z}}
export function boundingBox(nodes) {
  const vals = Object.values(nodes);
  if (vals.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, center: { x: 0, y: 0, z: 0 }, size: 10 };
  }
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const v of vals) {
    if (v.x < min.x) min.x = v.x; if (v.y < min.y) min.y = v.y; if (v.z < min.z) min.z = v.z;
    if (v.x > max.x) max.x = v.x; if (v.y > max.y) max.y = v.y; if (v.z > max.z) max.z = v.z;
  }
  const center = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
  const size = Math.max(max.x - min.x, max.y - min.y, 6);
  return { min, max, center, size };
}
