export class BattleGrid {
  constructor({ width, height, obstacles = [], cover = [], boost = [] } = {}) {
    this.width = width;
    this.height = height;
    this.obstacles = new Set(obstacles.map((o) => `${o.x},${o.y}`));
    this.cover = new Set(cover.map((o) => `${o.x},${o.y}`));
    this.boost = new Map(boost.map((o) => [`${o.x},${o.y}`, o.kind]));
    this.units = [];
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  isObstacle(x, y) { return this.obstacles.has(`${x},${y}`); }
  isCover(x, y) { return this.cover.has(`${x},${y}`); }
  boostAt(x, y) { return this.boost.get(`${x},${y}`) || null; }
  unitAt(x, y) { return this.units.find((u) => u.alive && u.x === x && u.y === y) || null; }
  isFree(x, y) { return this.inBounds(x, y) && !this.isObstacle(x, y) && !this.unitAt(x, y); }
  addUnit(u) { this.units.push(u); return u; }
  removeDeadUnits() { this.units = this.units.filter((u) => u.alive); }
  unitsOf(faction) { return this.units.filter((u) => u.alive && u.faction === faction); }

  reachableTiles(unit, maxDistance) {
    const reachable = new Map();
    const start = `${unit.x},${unit.y}`;
    reachable.set(start, 0);
    const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
    const ignoreObstacles = unit.type === 'drone'; // дрон летает

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.cost >= maxDistance) continue;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (!this.inBounds(nx, ny)) continue;
        if (!ignoreObstacles && this.isObstacle(nx, ny)) continue;
        const occ = this.unitAt(nx, ny);
        if (occ && occ.id !== unit.id) continue;
        if (reachable.has(key)) continue;
        reachable.set(key, cur.cost + 1);
        queue.push({ x: nx, y: ny, cost: cur.cost + 1 });
      }
    }
    reachable.delete(start);
    return reachable;
  }
}