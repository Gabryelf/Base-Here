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
    this.locationKey = locationKey;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.maxHp = def.hp;

    this.movedThisTurn = false;
    this.attackedThisTurn = false;
    this.usedAbilityThisTurn = false;

    this.morale = 100;                 // 0..100
    this.abilityCooldown = 0;          // тики в начале хода фракции
    this.shield = 0;                   // временный бонус защиты (для heavy)
    this._bonusMove = 0;               // прибавка движения от способностей
  }

  get alive() { return this.hp > 0; }
  get name()  { return this.def.name; }
  get typeId() { return this.type; }

  resetTurn() {
    this.movedThisTurn = false;
    this.attackedThisTurn = false;
    this.usedAbilityThisTurn = false;
  }

  tickCooldowns() {
    if (this.abilityCooldown > 0) this.abilityCooldown--;
  }

  takeDamage(n) {
    this.hp = Math.max(0, this.hp - n);
    return this.hp;
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
    return this.hp;
  }

  changeMorale(delta) {
    this.morale = Math.max(0, Math.min(100, this.morale + delta));
  }

  // Мораль влияет на урон и способность защищаться
  get moraleMultiplier() {
    if (this.morale >= 80) return 1;
    if (this.morale >= 50) return 0.9;
    if (this.morale >= 25) return 0.75;
    return 0.5;
  }

  // Бонус движения с учётом способности
  get currentMove() {
    return this.def.move + (this._bonusMove || 0);
  }

  // Полный боевой урон (до применения укрытий, бустов и т.п.)
  get attackPower() {
    const base = this.def.attack * this.moraleMultiplier;
    return Math.max(1, Math.round(base));
  }

  useAbility() {
    if (!this.def.ability) return false;
    if (this.abilityCooldown > 0) return false;
    if (this.usedAbilityThisTurn) return false;
    this.abilityCooldown = this.def.ability.cooldown;
    this.usedAbilityThisTurn = true;
    return true;
  }

  distanceTo(other) {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  toJSON() {
    return {
      id: this.id, type: this.type, faction: this.faction,
      x: this.x, y: this.y, hp: this.hp, maxHp: this.maxHp,
      locationKey: this.locationKey,
      morale: this.morale, abilityCooldown: this.abilityCooldown,
    };
  }
}