import { BattleGrid } from './BattleGrid.js';
import { Unit } from '../data/Unit.js';
import { UNIT_TYPES } from '../data/UnitTypes.js';
import { generateBattleMap } from './BattleMapGen.js';
import { BattleAI } from './BattleAI.js';

// Полное состояние одной тактической битвы.
export class TacticalBattle {
  constructor({ attackerFaction, defenderFaction, locationKey, garrison = 3, seed = 1 }) {
    this.attackerFaction = attackerFaction;
    this.defenderFaction = defenderFaction;
    this.locationKey = locationKey;
    this.turn = 1;
    this.currentFaction = attackerFaction;
    this.finished = false;
    this.result = null; // 'attacker' | 'defender'

    // Карта
    const map = generateBattleMap({ seed });
    this.grid = new BattleGrid(map);

    // Юниты: атакующий = 3 базовых, защитник = по гарнизону
    this._spawnUnits(garrison);

    this.ai = new BattleAI({ battle: this });

    // Событие — для UI/лога
    this.log = [];
  }

  _spawnUnits(garrison) {
    // Атакующий: 3 юнита на левом краю
    const attackerComp = ['infantry', 'infantry', 'scout'];
    attackerComp.forEach((type, i) => {
      const unit = new Unit({
        type,
        faction: this.attackerFaction,
        x: 0,
        y: Math.floor(this.grid.height / 2) - 1 + i,
      });
      // Проверка на препятствие — сдвигаем, если занято
      while (!this.grid.isFree(unit.x, unit.y) && unit.y < this.grid.height - 1) unit.y++;
      this.grid.addUnit(unit);
    });

    // Защитник: гарнизон решает состав
    const defenderComp = [];
    for (let i = 0; i < Math.max(1, garrison); i++) {
      defenderComp.push(i === 0 && garrison >= 3 ? 'heavy' : 'infantry');
    }
    defenderComp.forEach((type, i) => {
      const unit = new Unit({
        type,
        faction: this.defenderFaction,
        x: this.grid.width - 1,
        y: Math.floor(this.grid.height / 2) - 1 + i,
      });
      while (!this.grid.isFree(unit.x, unit.y) && unit.y > 0) unit.y--;
      this.grid.addUnit(unit);
    });
  }

  get isPlayerTurn() {
    return this.currentFaction === this.attackerFaction;
  }

  // ===== Действия игрока =====

  // Возвращает true, если ход был использован.
  tryMove(unit, targetX, targetY) {
    if (!unit.alive || unit.faction !== this.currentFaction) return false;
    if (unit.movedThisTurn) return false;

    const reachable = this.grid.reachableTiles(unit, unit.def.move);
    const key = `${targetX},${targetY}`;
    if (!reachable.has(key)) return false;

    unit.x = targetX;
    unit.y = targetY;
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

    const dmg = attacker.def.attack;
    target.takeDamage(dmg);
    attacker.attackedThisTurn = true;
    this._pushLog(`${attacker.name} бьёт ${target.name} на ${dmg}`);
    if (!target.alive) this._pushLog(`${target.name} уничтожен`);

    this._checkVictory();
    return true;
  }

  // ===== Ходы =====

  endTurn() {
    if (this.finished) return;

    // Сброс флагов текущей фракции
    for (const u of this.grid.unitsOf(this.currentFaction)) u.resetTurn();

    this.grid.removeDeadUnits();

    // Передаём ход
    if (this.currentFaction === this.attackerFaction) {
      this.currentFaction = this.defenderFaction;
      this._checkVictory();
      if (this.finished) return;
      // ИИ ходит асинхронно — через серию таймеров, чтобы игрок видел
      this.ai.runTurn();
    } else {
      this.currentFaction = this.attackerFaction;
      this.turn += 1;
    }
  }

  _checkVictory() {
    const attackers = this.grid.unitsOf(this.attackerFaction);
    const defenders = this.grid.unitsOf(this.defenderFaction);
    if (attackers.length === 0) {
      this.finished = true;
      this.result = 'defender';
    } else if (defenders.length === 0) {
      this.finished = true;
      this.result = 'attacker';
    }
  }

  _pushLog(line) {
    this.log.push(line);
    if (this.log.length > 50) this.log.shift();
  }
}