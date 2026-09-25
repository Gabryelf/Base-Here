import { BattleGrid } from './BattleGrid.js';
import { Unit } from '../data/Unit.js';
import { generateBattleMap } from './BattleMapGen.js';
import { BattleAI } from './BattleAI.js';

// Одна тактическая битва. Обе стороны ходят по очереди по-настоящему.
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
    // Атакующий — слева, защитник — справа
    this._spawnSide(attackerUnits, 0, this.attackerFaction);
    this._spawnSide(defenderUnits, this.grid.width - 1, this.defenderFaction);
  }

  _spawnSide(units, edgeX, faction) {
    const baseY = Math.floor(this.grid.height / 2) - Math.floor(units.length / 2);
    units.forEach((data, i) => {
      let x = edgeX;
      let y = Math.max(0, Math.min(this.grid.height - 1, baseY + i));
      // Ищем свободную клетку в колонке
      let tries = 0;
      while (!this.grid.isFree(x, y) && tries < this.grid.height) {
        y = (y + 1) % this.grid.height;
        tries++;
      }
      const u = new Unit({ type: data.type, faction, x, y, locationKey: data.locationKey });
      // Сохраняем HP, если пришёл с карты
      if (typeof data.hp === 'number') u.hp = Math.max(1, data.hp);
      this.grid.addUnit(u);
    });
  }

  get isPlayerTurn() { return this.currentFaction === this.attackerFaction; }

  tryMove(unit, tx, ty) {
    if (!unit.alive || unit.faction !== this.currentFaction) return false;
    if (unit.movedThisTurn) return false;
    const reach = this.grid.reachableTiles(unit, unit.def.move);
    if (!reach.has(`${tx},${ty}`)) return false;
    unit.x = tx; unit.y = ty;
    unit.movedThisTurn = true;
    this._pushLog(`${unit.name} переместился`);
    return true;
  }

  tryAttack(attacker, target) {
    if (!attacker.alive || !target.alive) return false;
    if (attacker.faction !== this.currentFaction) return false;
    if (attacker.attackedThisTurn) return false;
    if (attacker.faction === target.faction) return false;
    if (attacker.distanceTo(target) > attacker.def.range) return false;

    let dmg = attacker.def.attack;
    // Укрытие у защитника снижает урон
    if (this.grid.isCover(target.x, target.y)) dmg = Math.max(1, dmg - 2);
    // Буст-клетки: +2 к урону
    if (this.grid.boostAt(attacker.x, attacker.y) === 'attack') dmg += 2;

    target.takeDamage(dmg);
    attacker.attackedThisTurn = true;
    this._pushLog(`${attacker.name} → ${target.name}: ${dmg}`);
    if (!target.alive) this._pushLog(`${target.name} уничтожен`);
    this._checkVictory();
    return true;
  }

  endTurn() {
    if (this.finished) return;
    for (const u of this.grid.unitsOf(this.currentFaction)) u.resetTurn();
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