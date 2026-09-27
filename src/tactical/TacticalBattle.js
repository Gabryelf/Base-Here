import { BattleGrid } from './BattleGrid.js';
import { Unit } from '../data/Unit.js';
import { generateBattleMap } from './BattleMapGen.js';
import { BattleAI } from './BattleAI.js';

export class TacticalBattle {
  constructor({
    attackerFaction, defenderFaction, locationKey,
    attackerUnits = [], defenderUnits = [], seed = 1,
  }) {
    this.attackerFaction = attackerFaction;
    this.defenderFaction = defenderFaction;
    this.locationKey = locationKey;
    this.turn = 1;
    this.currentFaction = attackerFaction;
    this.finished = false;
    this.result = null;

    const map = generateBattleMap({ seed });
    this.grid = new BattleGrid(map);
    this._spawn(attackerUnits, defenderUnits);
    this.ai = new BattleAI({ battle: this });
    this.log = [];
  }

  _spawn(attackerUnits, defenderUnits) {
    this._spawnSide(attackerUnits, 0, this.attackerFaction);
    this._spawnSide(defenderUnits, this.grid.width - 1, this.defenderFaction);
  }

  _spawnSide(units, edgeX, faction) {
    const baseY = Math.floor(this.grid.height / 2) - Math.floor(units.length / 2);
    units.forEach((data, i) => {
      let x = edgeX;
      let y = Math.max(0, Math.min(this.grid.height - 1, baseY + i));
      let tries = 0;
      while (!this.grid.isFree(x, y) && tries < this.grid.height) {
        y = (y + 1) % this.grid.height;
        tries++;
      }
      const u = new Unit({ type: data.type, faction, x, y, locationKey: data.locationKey });
      if (typeof data.hp === 'number') u.hp = Math.max(1, data.hp);
      if (typeof data.morale === 'number') u.morale = data.morale;
      this.grid.addUnit(u);
    });
  }

  get isPlayerTurn() { return this.currentFaction === this.attackerFaction; }

  // ===== Движение =====
  tryMove(unit, tx, ty) {
    if (!unit.alive || unit.faction !== this.currentFaction) return false;
    if (unit.movedThisTurn) return false;

    const reach = this.grid.reachableTiles(unit, unit.currentMove);
    if (!reach.has(`${tx},${ty}`)) return false;

    unit.x = tx;
    unit.y = ty;
    unit.movedThisTurn = true;
    // Лёгкая усталость от движения
    unit.changeMorale(-2);
    this._pushLog(`${unit.name} переместился`);
    return true;
  }

  // ===== Атака =====
  tryAttack(attacker, target) {
    if (!attacker.alive || !target.alive) return false;
    if (attacker.faction !== this.currentFaction) return false;
    if (attacker.attackedThisTurn) return false;
    if (attacker.faction === target.faction) return false;
    if (attacker.distanceTo(target) > attacker.def.range) return false;

    let dmg = attacker.attackPower;

    // Фланг: атака по диагонали (учитывая топ-даун сетку) — бонус +1
    const diagonal =
      Math.abs(attacker.x - target.x) === 1 &&
      Math.abs(attacker.y - target.y) === 1;
    if (diagonal) dmg += 1;

    // Укрытие защитника — минус 2 урона
    if (this.grid.isCover(target.x, target.y)) dmg = Math.max(1, dmg - 2);

    // Буст-клетка атакующего — +2 урона
    if (this.grid.boostAt(attacker.x, attacker.y) === 'attack') dmg += 2;

    // Пониженный урон от усталости (если мораль низкая — атака слабее)
    if (attacker.morale < 25) dmg = Math.max(1, dmg - 1);

    // Редукция урона у цели (heavy — минус 2)
    if (target.def.damageReduction) dmg = Math.max(1, dmg - target.def.damageReduction);
    if (target.shield > 0) { dmg = Math.max(0, dmg - target.shield); target.shield = 0; }

    target.takeDamage(dmg);
    attacker.attackedThisTurn = true;
    target.changeMorale(-15);

    this._pushLog(`${attacker.name} → ${target.name}: ${dmg} урона`);

    if (!target.alive) {
      this._pushLog(`${target.name} уничтожен`);
      // Падение морали у всех врагов рядом (союзников цели)
      for (const ally of this.grid.unitsOf(target.faction)) {
        if (ally.distanceTo(target) <= 2) ally.changeMorale(-10);
      }
    }

    // Контратака: цель жива, ближний бой (range 1), не убежала
    if (
      target.alive &&
      attacker.distanceTo(target) <= 1 &&
      attacker.faction !== target.faction
    ) {
      const back = Math.max(1, Math.floor(target.attackPower * 0.4));
      attacker.takeDamage(back);
      this._pushLog(`${target.name} контратакует: ${back}`);
      if (!attacker.alive) this._pushLog(`${attacker.name} погиб в контратаке`);
    }

    this._checkVictory();
    return true;
  }

  // ===== Способности =====
  tryAbility(unit, target = null) {
    if (!unit.alive || unit.faction !== this.currentFaction) return false;
    if (!unit.def.ability) return false;
    if (!unit.useAbility()) return false;

    const a = unit.def.ability;

    if (a.id === 'volley') {
      // Пехота: +2 урона по цели
      if (target && target.alive) {
        const extra = 2;
        target.takeDamage(extra);
        this._pushLog(`${unit.name}: Залп +${extra}`);
        if (!target.alive) this._pushLog(`${target.name} уничтожен`);
      }
    } else if (a.id === 'shield') {
      // Тяжёлые: +4 HP и временный +1 к редукции
      unit.heal(4);
      unit.shield = 1;
      this._pushLog(`${unit.name}: Щит (+4 HP, +1 защита)`);
    } else if (a.id === 'dash') {
      // Разведка: +3 к движению и сброс "уже ходил"
      unit._bonusMove = 3;
      unit.movedThisTurn = false;
      this._pushLog(`${unit.name}: Рывок (+3 к движению)`);
    } else if (a.id === 'burst') {
      // Дрон: два удара
      if (target && target.alive) {
        const d1 = unit.attackPower;
        target.takeDamage(d1);
        this._pushLog(`${unit.name}: Залп-1 ${d1}`);
        if (target.alive) {
          const d2 = unit.attackPower;
          target.takeDamage(d2);
          this._pushLog(`${unit.name}: Залп-2 ${d2}`);
        }
        if (!target.alive) this._pushLog(`${target.name} уничтожен`);
        target.changeMorale(-10);
      }
    }

    this._checkVictory();
    return true;
  }

  // ===== Ход =====
  endTurn() {
    if (this.finished) return;

    // Сброс флагов хода
    for (const u of this.grid.unitsOf(this.currentFaction)) u.resetTurn();
    // Тик кулдаунов способностей
    for (const u of this.grid.units) u.tickCooldowns();
    // Сброс временного бонуса движения
    for (const u of this.grid.units) u._bonusMove = 0;

    this.grid.removeDeadUnits();
    this._checkVictory();
    if (this.finished) return;

    if (this.currentFaction === this.attackerFaction) {
      this.currentFaction = this.defenderFaction;
      this.ai.runTurn();
    } else {
      this.currentFaction = this.attackerFaction;
      this.turn += 1;
    }
  }

  _checkVictory() {
    const attackers = this.grid.unitsOf(this.attackerFaction);
    const defenders = this.grid.unitsOf(this.defenderFaction);
    if (attackers.length === 0) { this.finished = true; this.result = 'defender'; }
    else if (defenders.length === 0) { this.finished = true; this.result = 'attacker'; }
  }

  _pushLog(line) {
    this.log.push(line);
    if (this.log.length > 50) this.log.shift();
  }
}