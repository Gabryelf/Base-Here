// ИИ защитника. Ходит по одному юниту с паузой, умеет применять способности.
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

    // 1) Возможно применить способность до движения/атаки
    this._maybeUseAbility(unit, enemies);

    // 2) Атака, если уже достаёт
    const inRange = enemies
      .filter((e) => e.alive && unit.distanceTo(e) <= unit.def.range)
      .sort((a, b) => a.hp - b.hp);
    if (inRange.length > 0) {
      // Если в зоне видимости есть раненый — бьём его
      battle.tryAttack(unit, inRange[0]);
      return;
    }

    // 3) Движение к ближайшему врагу
    const nearest = enemies
      .slice()
      .sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];
    const reach = battle.grid.reachableTiles(unit, unit.currentMove);
    let best = null, bestDist = Infinity;
    for (const key of reach.keys()) {
      const [x, y] = key.split(',').map(Number);
      const d = Math.abs(x - nearest.x) + Math.abs(y - nearest.y);
      if (d < bestDist) { bestDist = d; best = { x, y }; }
    }
    if (best) battle.tryMove(unit, best.x, best.y);

    // 4) Атака после движения
    const nowIn = enemies
      .filter((e) => e.alive && unit.distanceTo(e) <= unit.def.range)
      .sort((a, b) => a.hp - b.hp);
    if (nowIn.length > 0) battle.tryAttack(unit, nowIn[0]);
  }

  _maybeUseAbility(unit, enemies) {
    const battle = this.battle;
    const a = unit.def.ability;
    if (!a) return;
    if (unit.abilityCooldown > 0) return;

    // Пехота: залп, если цель рядом и она ранена (добить)
    if (a.id === 'volley') {
      const wounded = enemies.find(
        (e) => e.hp <= e.maxHp * 0.5 && unit.distanceTo(e) <= unit.def.range,
      );
      if (wounded && Math.random() < 0.6) battle.tryAbility(unit, wounded);
      return;
    }

    // Тяжёлые: щит, если HP ниже 60%
    if (a.id === 'shield') {
      if (unit.hp <= unit.maxHp * 0.6) battle.tryAbility(unit);
      return;
    }

    // Разведка: рывок, если враг далеко, чтобы догнать
    if (a.id === 'dash') {
      const nearest = enemies
        .slice()
        .sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];
      if (nearest && unit.distanceTo(nearest) > unit.def.move + unit.def.range) {
        battle.tryAbility(unit);
      }
      return;
    }

    // Дрон: залп, если враг в радиусе
    if (a.id === 'burst') {
      const tgt = enemies
        .filter((e) => unit.distanceTo(e) <= unit.def.range)
        .sort((a, b) => a.hp - b.hp)[0];
      if (tgt && Math.random() < 0.5) battle.tryAbility(unit, tgt);
    }
  }

  dispose() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
  }
}