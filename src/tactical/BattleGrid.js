import { Unit } from '../data/Unit.js';

// Квадратная сетка боя. Хранит юнитов и препятствия.
export class BattleGrid {
  constructor({ width, height, obstacles = [] } = {}) {
    this.width = width;
    this.height = height;
    // Ключ "x,y" → true, если клетка занята препятствием
    this.obstacles = new Set(obstacles.map((o) => `${o.x},${o.y}`));
    this.units = [];
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isObstacle(x, y) {
    return this.obstacles.has(`${x},${y}`);
  }

  unitAt(x, y) {
    return this.units.find((u) => u.alive && u.x === x && u.y === y) || null;
  }

  isFree(x, y) {
    return this.inBounds(x, y) && !this.isObstacle(x, y) && !this.unitAt(x, y);
  }

  addUnit(unit) {
    this.units.push(unit);
    return unit;
  }

  removeDeadUnits() {
    this.units = this.units.filter((u) => u.alive);
  }

  unitsOf(faction) {
    return this.units.filter((u) => u.alive && u.faction === faction);
  }

  // Простой BFS для получения множества клеток в радиусе (по манхэттену,
  // без прохода сквозь врагов, препятствия и других юнитов).
  reachableTiles(unit, maxDistance) {
    const reachable = new Map(); // key "x,y" → cost
    const start = `${unit.x},${unit.y}`;
    reachable.set(start, 0);

    const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.cost >= maxDistance) continue;

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (!this.inBounds(nx, ny)) continue;
        if (this.isObstacle(nx, ny)) continue;
        const occupant = this.unitAt(nx, ny);
        // Своих и чужих юнитов BFS не проходит (атака — отдельная механика)
        if (occupant && occupant.id !== unit.id) continue;
        if (reachable.has(key)) continue;
        reachable.set(key, cur.cost + 1);
        queue.push({ x: nx, y: ny, cost: cur.cost + 1 });
      }
    }

    // Убираем саму стартовую клетку
    reachable.delete(start);
    return reachable;
  }

  // Юниты в радиусе атаки (по манхэттену)
  enemiesInRange(unit, enemyFaction) {
    const result = [];
    for (const u of this.unitsOf(enemyFaction)) {
      if (unit.distanceTo(u) <= unit.def.range) result.push(u);
    }
    return result;
  }
}