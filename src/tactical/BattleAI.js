// ИИ защитника. Ходит по одному юниту с паузой, чтобы игрок видел.
export class BattleAI {
    constructor({ battle }) {
      this.battle = battle;
      this._timers = [];
    }
  
    runTurn() {
      const battle = this.battle;
      const faction = battle.currentFaction;
      const myUnits = battle.grid.unitsOf(faction);
  
      let i = 0;
      const step = () => {
        if (battle.finished) return;
        if (i >= myUnits.length) {
          // Все походили — передаём ход игроку
          battle.endTurn();
          return;
        }
        const unit = myUnits[i++];
        if (!unit.alive) { step(); return; }
        this._actUnit(unit);
        this._timers.push(setTimeout(step, 400));
      };
      step();
    }
  
    _actUnit(unit) {
      const battle = this.battle;
      const enemies = battle.grid.unitsOf(battle.attackerFaction);
      if (enemies.length === 0) return;
  
      // 1) Если может бить — бьёт самого слабого
      const inRange = enemies
        .filter((e) => unit.distanceTo(e) <= unit.def.range)
        .sort((a, b) => a.hp - b.hp);
      if (inRange.length > 0) {
        battle.tryAttack(unit, inRange[0]);
        return;
      }
  
      // 2) Иначе идёт к ближайшему
      const nearest = enemies.slice().sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];
      const reach = battle.grid.reachableTiles(unit, unit.def.move);
      let best = null, bestDist = Infinity;
      for (const key of reach.keys()) {
        const [x, y] = key.split(',').map(Number);
        const d = Math.abs(x - nearest.x) + Math.abs(y - nearest.y);
        if (d < bestDist) { bestDist = d; best = { x, y }; }
      }
      if (best) battle.tryMove(unit, best.x, best.y);
  
      // 3) Если после движения достаёт — атакует
      const nowIn = enemies
        .filter((e) => e.alive && unit.distanceTo(e) <= unit.def.range)
        .sort((a, b) => a.hp - b.hp);
      if (nowIn.length > 0) battle.tryAttack(unit, nowIn[0]);
    }
  
    dispose() {
      for (const t of this._timers) clearTimeout(t);
      this._timers = [];
    }
  }