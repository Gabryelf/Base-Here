import { UNIT_TYPES } from './UnitTypes.js';

let _uid = 1;
export function nextUnitId() {
  return _uid++;
}

export class Unit {
  constructor({ type, faction, x, y }) {
    const def = UNIT_TYPES[type];
    if (!def) throw new Error(`Unknown unit type: ${type}`);

    this.id = nextUnitId();
    this.type = type;
    this.def = def;
    this.faction = faction;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.movedThisTurn = false;
    this.attackedThisTurn = false;
  }

  get alive() {
    return this.hp > 0;
  }

  get name() {
    return this.def.name;
  }

  resetTurn() {
    this.movedThisTurn = false;
    this.attackedThisTurn = false;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp;
  }

  distanceTo(other) {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  toJSON() {
    return {
      id: this.id, type: this.type, faction: this.faction,
      x: this.x, y: this.y, hp: this.hp, maxHp: this.maxHp,
    };
  }
}