// ============================================================
// pathfind.js — 店內尋路（BFS 廣度優先）
// 在「可走的地板」之間找最短路徑，讓顧客繞過貨架/牆。
// 店面很小，每次重算成本極低，不需要 A*。
// ============================================================

// store 需提供 walkableAt(cx,cy) 與 inBounds(cx,cy)
// start/goal 是 {cx, cy}。回傳路徑陣列 [{cx,cy}...]（含起點與終點），找不到回 null。
export function bfs(store, start, goal) {
  if (!store.walkableAt(start.cx, start.cy) || !store.walkableAt(goal.cx, goal.cy))
    return null;
  if (start.cx === goal.cx && start.cy === goal.cy) return [{ ...start }];

  const W = store.w;
  const key = (x, y) => y * W + x;
  const prev = new Map();      // 子 -> 父，用來回溯路徑
  const visited = new Set([key(start.cx, start.cy)]);
  let queue = [start];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (queue.length) {
    const next = [];
    for (const cur of queue) {
      for (const [dx, dy] of dirs) {
        const nx = cur.cx + dx, ny = cur.cy + dy;
        const k = key(nx, ny);
        if (visited.has(k)) continue;
        if (!store.walkableAt(nx, ny)) continue;
        visited.add(k);
        prev.set(k, cur);
        if (nx === goal.cx && ny === goal.cy) {
          // 回溯
          const path = [{ cx: nx, cy: ny }];
          let p = cur;
          while (p) { path.push({ cx: p.cx, cy: p.cy }); p = prev.get(key(p.cx, p.cy)); }
          path.reverse();
          return path;
        }
        next.push({ cx: nx, cy: ny });
      }
    }
    queue = next;
  }
  return null; // 走不到
}
