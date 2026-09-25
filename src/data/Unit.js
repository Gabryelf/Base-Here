import { UNIT_TYPES } from './UnitTypes.js';

let _uid = 1;
export function nextUnitId() { return _uid++; }

export class Unit {
  constructor({ type, faction, x = -1, y = -1, locationKey = null }) {
    const def = UNIT_TYPES[type];
    if (!def) throw new Error(`Unknown unit type: ${type}`);

    this.id = nextUnitId();
    this.type = type;
    this.def = def;
    this.faction = faction;
    this.locationKey = locationKey;  // где стоит на стратегической карте
    this.x = x;                       // позиция на тактической карте
    this.y = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.movedThisTurn = false;
    this.attackedThisTurn = false;
    this.usedAbility = false;
  }

  get alive() { return this.hp > 0; }
  get name()  { return this.def.name; }
  get typeId() { return this.type; }

  resetTurn() {
    this.movedThisTurn = false;
    this.attackedThisTurn = false;
  }

  takeDamage(n) { this.hp = Math.max(0, this.hp - n); return this.hp; }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); return this.hp; }

  distanceTo(other) {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  toJSON() {
    return {
      id: this.id, type: this.type, faction: this.faction,
      x: this.x, y: this.y, hp: this.hp, maxHp: this.maxHp,
      locationKey: this.locationKey,
    };
  }
}