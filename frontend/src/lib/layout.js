// Compute 3D positions for a family tree and edges to draw.
//  - Generations: BFS from first member. Parents = +1, partners = same, children = -1.
//  - Within each generation: cluster by parent-set so siblings sit adjacent, then keep partners next to each other.
//  - Edges: parent-child, partner, sibling (shared parents).

export function computeLayout(members, mode = "tree") {
  if (!members || members.length === 0) return { nodes: {}, edges: [], yearRange: null };

  const byId = Object.fromEntries(members.map(m => [m.id, m]));
  const generations = {};
  const visited = new Set();

  // Multi-component BFS — handle disconnected sub-families and orphans.
  // For each component, seed on a root (no parents) when possible so the tree grows naturally downward.
  while (visited.size < members.length) {
    const seed = members.find(m => !visited.has(m.id) && (m.parent_ids || []).length === 0)
              || members.find(m => !visited.has(m.id));
    if (!seed) break;

    generations[seed.id] = 0;
    visited.add(seed.id);
    const queue = [seed.id];

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
  }
  for (const m of members) if (!visited.has(m.id)) generations[m.id] = 0;

  // Group by generation
  const byGen = {};
  for (const m of members) {
    const g = generations[m.id];
    if (!byGen[g]) byGen[g] = [];
    byGen[g].push(m);
  }

  const SPACING_X = 4.6;
  const SPACING_Y = 4.5;
  const PARTNER_DX = 2.6; // half-distance between partners
  const nodes = {};

  // ---- Hierarchical placement: process older generations first, then position children
  //      directly under the centre of their parents. Resolve sibling-group overlap by
  //      shifting later groups to the right.
  const sortedGens = Object.keys(byGen).map(Number).sort((a, b) => b - a); // oldest first

  for (const g of sortedGens) {
    const list = byGen[g];
    // Build sibling groups (key = sorted parent ids; "" if no parents)
    const groups = new Map();
    for (const m of list) {
      const key = (m.parent_ids || []).slice().sort().join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }

    // Compute a desired centre x per group:
    //  - children of placed parents: midpoint of parents
    //  - orphans / standalone: sequential
    const groupEntries = [];
    let nextStandaloneX = 0;
    for (const [key, list2] of groups.entries()) {
      let desired;
      if (key === "") {
        desired = nextStandaloneX;
        nextStandaloneX += (list2.length + 1) * SPACING_X;
      } else {
        const parentXs = key.split("|")
          .map(pid => nodes[pid]?.x)
          .filter(x => x != null);
        if (parentXs.length === 0) {
          desired = nextStandaloneX;
          nextStandaloneX += (list2.length + 1) * SPACING_X;
        } else {
          desired = parentXs.reduce((a, b) => a + b, 0) / parentXs.length;
        }
      }
      groupEntries.push({ key, members: list2, desired });
    }

    // Sort groups by desired x, then resolve overlaps
    groupEntries.sort((a, b) => a.desired - b.desired);

    let lastRight = -Infinity;
    for (const grp of groupEntries) {
      // Within group: order members keeping partners adjacent
      const ordered = [];
      const used = new Set();
      for (const m of grp.members) {
        if (used.has(m.id)) continue;
        ordered.push(m);
        used.add(m.id);
        for (const pid of m.partner_ids || []) {
          if (!used.has(pid) && byId[pid] && generations[pid] === g) {
            // Partner only if also in this same parent-group OR partner has no parents
            const pInGroup = grp.members.some(x => x.id === pid);
            if (pInGroup) { ordered.push(byId[pid]); used.add(pid); }
          }
        }
      }
      // Add any leftover members (e.g., partner from outside group already pushed in another iteration)
      for (const m of grp.members) {
        if (!used.has(m.id)) { ordered.push(m); used.add(m.id); }
      }

      const n = ordered.length;
      // Desired centre = group.desired; spread n items symmetrically
      const groupWidth = (n - 1) * SPACING_X;
      let startX = grp.desired - groupWidth / 2;
      // Resolve overlap with previous group
      if (startX < lastRight + SPACING_X * 0.9) {
        startX = lastRight + SPACING_X * 0.9;
      }

      ordered.forEach((m, i) => {
        const x = startX + i * SPACING_X;
        const y = g * SPACING_Y;
        // Small alternating z for visual depth in tree mode (avoid perfectly flat plane)
        const z = ((i % 2 === 0) ? 0.25 : -0.25);
        nodes[m.id] = { x, y, z };
      });

      lastRight = startX + groupWidth;
    }
  }

  // Second pass: place same-generation partners that don't share parents (cross-family partners)
  // next to their already-placed partner if they ended up far away.
  for (const m of members) {
    if (!nodes[m.id]) continue;
    for (const pid of m.partner_ids || []) {
      if (!nodes[pid]) continue;
      if (generations[pid] !== generations[m.id]) continue;
      const dx = Math.abs(nodes[m.id].x - nodes[pid].x);
      if (dx > SPACING_X * 1.6) {
        // The partner without parents (or fewer parents) shifts next to the other.
        // Deterministic tie-break: left if anchor.id < mover.id (string compare), else right.
        const moveOther = (byId[pid].parent_ids || []).length <= (m.parent_ids || []).length ? pid : m.id;
        const anchor = moveOther === pid ? m.id : pid;
        const goRight = anchor < moveOther;
        const targetX = nodes[anchor].x + PARTNER_DX * (goRight ? 1 : -1);
        nodes[moveOther].x = targetX;
      }
    }
  }

  // Recenter all nodes horizontally around 0
  const xs = Object.values(nodes).map(n => n.x);
  if (xs.length > 0) {
    const offset = (Math.min(...xs) + Math.max(...xs)) / 2;
    for (const id in nodes) nodes[id].x -= offset;
  }

  // === Timeline mode: override z by birth year ===
  // Year range derived from all known birth and death years (+ current year).
  let yearRange = null;
  const years = [];
  const nowY = new Date().getFullYear();
  for (const m of members) {
    if (m.birth_date) {
      const y = parseInt(m.birth_date.slice(0, 4), 10);
      if (!isNaN(y)) years.push(y);
    }
    if (m.death_date) {
      const y = parseInt(m.death_date.slice(0, 4), 10);
      if (!isNaN(y)) years.push(y);
    }
  }
  if (years.length > 0) {
    const minY = Math.min(...years);
    const maxY = Math.max(...years, nowY);
    yearRange = { min: minY, max: maxY };
  }

  if (mode === "timeline" && yearRange) {
    const Z_SCALE = 0.28;
    const span = Math.max(1, yearRange.max - yearRange.min);
    const midZ = (span * Z_SCALE) / 2;
    for (const m of members) {
      const node = nodes[m.id];
      if (!node) continue;
      let year = null;
      if (m.birth_date) {
        const parsed = parseInt(m.birth_date.slice(0, 4), 10);
        if (!isNaN(parsed)) year = parsed;
      }
      if (year !== null) {
        node.z = (year - yearRange.min) * Z_SCALE - midZ;
      } else {
        node.z = -midZ - 2; // unknown-year members float behind the timeline
      }
    }
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

  return { nodes, edges, yearRange };
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
  const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 6);
  return { min, max, center, size };
}
