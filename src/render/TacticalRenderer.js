// Рендер боя. Top-down (псевдо-изометрия через подсветку пола).
export class TacticalRenderer {
  constructor({ screen, camera, state }) {
    this.screen = screen;
    this.camera = camera;
    this.state = state;
    this.cellSize = 52;
    this.selectedUnit = null;
    this.reachableKeys = new Set();
    this._flash = null; // { x, y, color, t }
  }

  setSelected(unit) {
    this.selectedUnit = unit;
    this.reachableKeys.clear();
    if (unit) {
      const battle = this.state.tactical.battle;
      if (battle && battle.isPlayerTurn && !unit.movedThisTurn) {
        const tiles = battle.grid.reachableTiles(unit, unit.currentMove);
        for (const k of tiles.keys()) this.reachableKeys.add(k);
      }
    }
  }

  flash(x, y, color) {
    this._flash = { x, y, color, t: 0.6 };
  }

  cellFromWorld(wx, wy) {
    const s = this.cellSize;
    return { x: Math.floor(wx / s), y: Math.floor(wy / s) };
  }

  update(dt) {
    if (this._flash) {
      this._flash.t -= dt;
      if (this._flash.t <= 0) this._flash = null;
    }
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
        let fill = ((x + y) % 2 === 0) ? '#161b22' : '#1c2128';
        if (grid.isObstacle(x, y)) fill = '#3a3a3a';
        else if (grid.isCover(x, y)) fill = '#2b3220';
        ctx.fillStyle = fill;
        ctx.fillRect(wx, wy, s, s);

        // Укрытие — маленький квадрат
        if (grid.isCover(x, y)) {
          ctx.fillStyle = '#4d5a3a';
          ctx.fillRect(wx + s * 0.3, wy + s * 0.3, s * 0.4, s * 0.4);
        }

        // Буст-клетка
        const boost = grid.boostAt(x, y);
        if (boost) {
          ctx.beginPath();
          ctx.arc(wx + s / 2, wy + s / 2, s * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = boost === 'attack'
            ? 'rgba(248,81,73,0.55)'
            : 'rgba(88,166,255,0.55)';
          ctx.fill();
        }

        // Сетка
        ctx.strokeStyle = '#2d333b';
        ctx.lineWidth = 1 / this.camera.zoom;
        ctx.strokeRect(wx, wy, s, s);

        // Подсветка доступных клеток
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

    // 3) Флеш от эффекта
    if (this._flash) {
      const a = Math.max(0, this._flash.t / 0.6);
      ctx.beginPath();
      ctx.arc(
        this._flash.x * s + s / 2,
        this._flash.y * s + s / 2,
        s * (0.6 + (1 - a) * 0.5),
        0, Math.PI * 2,
      );
      ctx.strokeStyle = this._flash.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3 / this.camera.zoom;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 4) Юниты
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

      // Круг юнита
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = u.def.color;
      ctx.fill();

      // Обводка фракции
      ctx.strokeStyle = (u.faction === this._playerFaction())
        ? '#58a6ff' : '#f85149';
      ctx.lineWidth = Math.max(2, 3 / this.camera.zoom);
      ctx.stroke();

      // Если на клетке щит — рисуем тонкое кольцо
      if (u.shield > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#3fb950';
        ctx.lineWidth = 2 / this.camera.zoom;
        ctx.stroke();
      }

      // HP
      const hpFrac = u.hp / u.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(wx + 4, wy + s - 9, s - 8, 5);
      ctx.fillStyle = hpFrac > 0.5 ? '#3fb950' : hpFrac > 0.25 ? '#d29922' : '#f85149';
      ctx.fillRect(wx + 4, wy + s - 9, (s - 8) * hpFrac, 5);

      // Мораль
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(wx + 4, wy + 4, s - 8, 3);
      ctx.fillStyle = u.morale > 70 ? '#3fb950' : u.morale > 30 ? '#d29922' : '#f85149';
      ctx.fillRect(wx + 4, wy + 4, (s - 8) * (u.morale / 100), 3);

      // Иконка
      ctx.fillStyle = '#0b0d10';
      ctx.font = `bold ${Math.round(s * 0.42)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.def.icon, cx, cy);

      // Индикатор готовой способности
      if (u.def.ability && u.abilityCooldown === 0 && !u.usedAbilityThisTurn) {
        ctx.beginPath();
        ctx.arc(wx + s - 8, wy + 8, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#d29922';
        ctx.fill();
      }

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