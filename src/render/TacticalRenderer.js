// Отрисовка тактического боя: сетка, препятствия, юниты, подсветка, ходы.
export class TacticalRenderer {
    constructor({ screen, camera, state }) {
      this.screen = screen;
      this.camera = camera;
      this.state = state;
  
      this.cellSize = 44;      // мировой размер клетки
      this.selectedUnit = null;
      this.hoverTile = null;
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
  
    worldFromCell(x, y) {
      const s = this.cellSize;
      return { x: x * s + s / 2, y: y * s + s / 2 };
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
  
      // 1) Клетки
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const wx = x * s;
          const wy = y * s;
  
          // Фон
          let fill = ((x + y) % 2 === 0) ? '#161b22' : '#1c2128';
          if (grid.isObstacle(x, y)) fill = '#3a3a3a';
          ctx.fillStyle = fill;
          ctx.fillRect(wx, wy, s, s);
  
          // Сетка
          ctx.strokeStyle = '#2d333b';
          ctx.lineWidth = 1 / this.camera.zoom;
          ctx.strokeRect(wx, wy, s, s);
  
          // Доступные клетки для движения
          if (this.reachableKeys.has(`${x},${y}`)) {
            ctx.fillStyle = 'rgba(88, 166, 255, 0.18)';
            ctx.fillRect(wx, wy, s, s);
          }
        }
      }
  
      // 2) Радиус атаки выбранного юнита — подсветить врагов
      if (this.selectedUnit) {
        const liveEnemies = grid.unitsOf(this._enemyFaction());
        for (const e of liveEnemies) {
          if (this.selectedUnit.distanceTo(e) <= this.selectedUnit.def.range) {
            const wx = e.x * s;
            const wy = e.y * s;
            ctx.strokeStyle = '#f85149';
            ctx.lineWidth = Math.max(2, 2 / this.camera.zoom);
            ctx.strokeRect(wx + 2, wy + 2, s - 4, s - 4);
          }
        }
      }
  
      // 3) Юниты
      for (const u of grid.units) {
        if (!u.alive) continue;
        const wx = u.x * s;
        const wy = u.y * s;
  
        // Круг
        const cx = wx + s / 2;
        const cy = wy + s / 2;
        const r = s * 0.35;
  
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = u.def.color;
        ctx.fill();
  
        // Обводка фракции
        ctx.strokeStyle = (u.faction === this._playerFaction()) ? '#58a6ff' : '#f85149';
        ctx.lineWidth = Math.max(2, 2 / this.camera.zoom);
        ctx.stroke();
  
        // HP-полоса
        const hpFrac = u.hp / u.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(wx + 4, wy + s - 8, s - 8, 4);
        ctx.fillStyle = hpFrac > 0.5 ? '#3fb950' : hpFrac > 0.25 ? '#d29922' : '#f85149';
        ctx.fillRect(wx + 4, wy + s - 8, (s - 8) * hpFrac, 4);
  
        // Иконка типа
        ctx.fillStyle = '#0b0d10';
        ctx.font = `bold ${Math.round(s * 0.4)}px system-ui`;
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
  
    _playerFaction() {
      return this.state.tactical.battle.attackerFaction;
    }
    _enemyFaction() {
      return this.state.tactical.battle.defenderFaction;
    }
  }