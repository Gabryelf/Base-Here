// Рендер боя. Вид сверху (top-down, псевдо-изометрия через подсветку пола).
export class TacticalRenderer {
  constructor({ screen, camera, state }) {
    this.screen = screen;
    this.camera = camera;
    this.state = state;
    this.cellSize = 52;
    this.selectedUnit = null;
    this.reachableKeys = new Set();
  }

  setSelected(unit) {
    this.selectedUnit = unit;
    this.reachableKeys.clear();
    if (unit) {
      const battle = this.state.tactical.battle;
      if (battle && battle.isPlayerTurn && !unit.movedThisTurn) {
        const tiles = battle.grid.reachableTiles(unit, unit.def.move);
        for (const k of tiles.keys()) this.reachableKeys.add(k);
      }
    }
  }

  cellFromWorld(wx, wy) {
    const s = this.cellSize;
    return { x: Math.floor(wx / s), y: Math.floor(wy / s) };
  }

  render() {
    const battle = this.state.tactical.battle;
    if (!battle) return;
    const ctx = this.screen.ctx;
    const s = this.cellSize;
    const grid = battle.grid;

    ctx.save();
    this.camera.apply(ctx);

    // 1) Пол и клетки
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const wx = x * s, wy = y * s;

        // Пол — шахматка
        let fill = ((x + y) % 2 === 0) ? '#161b22' : '#1c2128';
        if (grid.isObstacle(x, y)) fill = '#3a3a3a';
        else if (grid.isCover(x, y)) fill = '#2b3220';
        ctx.fillStyle = fill;
        ctx.fillRect(wx, wy, s, s);

        // Буст-клетки — цветной кружок
        const boost = grid.boostAt(x, y);
        if (boost) {
          ctx.beginPath();
          ctx.arc(wx + s / 2, wy + s / 2, s * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = boost === 'attack' ? 'rgba(248,81,73,0.5)' : 'rgba(88,166,255,0.5)';
          ctx.fill();
        }

        // Укрытие — маленький квадрат
        if (grid.isCover(x, y)) {
          ctx.fillStyle = '#4d5a3a';
          ctx.fillRect(wx + s * 0.3, wy + s * 0.3, s * 0.4, s * 0.4);
        }

        // Сетка
        ctx.strokeStyle = '#2d333b';
        ctx.lineWidth = 1 / this.camera.zoom;
        ctx.strokeRect(wx, wy, s, s);

        // Reachable
        if (this.reachableKeys.has(`${x},${y}`)) {
          ctx.fillStyle = 'rgba(88, 166, 255, 0.22)';
          ctx.fillRect(wx, wy, s, s);
        }
      }
    }

    // 2) Подсветка врагов в радиусе
    if (this.selectedUnit) {
      const enemies = grid.unitsOf(this._enemyFaction());
      for (const e of enemies) {
        if (this.selectedUnit.distanceTo(e) <= this.selectedUnit.def.range) {
          ctx.strokeStyle = '#f85149';
          ctx.lineWidth = Math.max(2, 3 / this.camera.zoom);
          ctx.strokeRect(e.x * s + 2, e.y * s + 2, s - 4, s - 4);
        }
      }
    }

    // 3) Юниты
    for (const u of grid.units) {
      if (!u.alive) continue;
      const wx = u.x * s, wy = u.y * s;
      const cx = wx + s / 2, cy = wy + s / 2;
      const r = s * 0.38;

      // Тень
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.3, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();

      // Круг
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = u.def.color;
      ctx.fill();
      ctx.strokeStyle = (u.faction === this._playerFaction()) ? '#58a6ff' : '#f85149';
      ctx.lineWidth = Math.max(2, 3 / this.camera.zoom);
      ctx.stroke();

      // HP
      const hpFrac = u.hp / u.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(wx + 4, wy + s - 9, s - 8, 5);
      ctx.fillStyle = hpFrac > 0.5 ? '#3fb950' : hpFrac > 0.25 ? '#d29922' : '#f85149';
      ctx.fillRect(wx + 4, wy + s - 9, (s - 8) * hpFrac, 5);

      // Иконка
      ctx.fillStyle = '#0b0d10';
      ctx.font = `bold ${Math.round(s * 0.42)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.def.icon, cx, cy);

      // Выделение
      if (this.selectedUnit && u.id === this.selectedUnit.id) {
        ctx.strokeStyle = '#e6e6e6';
        ctx.lineWidth = Math.max(2, 3 / this.camera.zoom);
        ctx.strokeRect(wx + 1, wy + 1, s - 2, s - 2);
      }
    }

    ctx.restore();
  }

  _playerFaction() { return this.state.tactical.battle.attackerFaction; }
  _enemyFaction()  { return this.state.tactical.battle.defenderFaction; }
}