import { getBuilding } from './Buildings.js';
import { activeSynergies } from './Synergies.js';

export const TILE_TYPES = {
  PLAINS: 'plains',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
  URBAN: 'urban',
  RUINS: 'ruins',
};

// Базовый доход ресурсов с тайла по типу. Умножается на уровень.
export const TILE_YIELDS = {
  [TILE_TYPES.PLAINS]: { credits: 1, material: 1, energy: 0 },
  [TILE_TYPES.FOREST]: { credits: 1, material: 2, energy: 0 },
  [TILE_TYPES.MOUNTAIN]: { credits: 0, material: 3, energy: 1 },
  [TILE_TYPES.WATER]: { credits: 2, material: 0, energy: 1 },
  [TILE_TYPES.URBAN]: { credits: 3, material: 1, energy: 2 },
  [TILE_TYPES.RUINS]: { credits: 1, material: 1, energy: 1 },
};

export class Tile {
  constructor({ q, r, type }) {
    this.q = q;
    this.r = r;
    this.type = type;
    this.owner = 'neutral';
    this.capital = false;
    this.location = null; // будет создано MapGen'ом для hasLocation-тайлов

    // Локация: доступна ли для боя/строительства. Пока просто флаг.
    this.hasLocation = type === TILE_TYPES.URBAN || type === TILE_TYPES.RUINS;

    // Защита: базовое значение, растёт со зданиями (пока 0).
    this.defense = 1;

    // Строительные слоты (для будущего режима стройки)
    this.buildSlots = []; // [{ slotType, buildingId }]

    // Юниты-заглушки (для будущего тактического режима)
    this.garrison = 0;
  }

  get key() {
    return `${this.q},${this.r}`;
  }

  getYield() {
    if (this.owner === 'neutral') return { credits: 0, material: 0, energy: 0 };

    const base = TILE_YIELDS[this.type] || { credits: 0, material: 0, energy: 0 };
    const capitalBonus = this.capital ? 2 : 1;

    let credits = base.credits * capitalBonus;
    let material = base.material * capitalBonus;
    let energy = base.energy * capitalBonus;

    // Бонусы от построек
    if (this.location) {
      const buildingIds = this.location.getBuildings();
      for (const id of buildingIds) {
        const b = getBuilding(id);
        if (!b) continue;
        credits += b.yield.credits;
        material += b.yield.material;
        energy += b.yield.energy;
      }
      // Синергии
      const syn = activeSynergies(buildingIds);
      for (const s of syn) {
        credits += s.effect.yield.credits;
        material += s.effect.yield.material;
        energy += s.effect.yield.energy;
      }
    }

    return { credits, material, energy };
  }

  getTotalDefense() {
    let def = this.defense;
    if (this.location) {
      const buildingIds = this.location.getBuildings();
      for (const id of buildingIds) {
        const b = getBuilding(id);
        if (b) def += b.defense;
      }
      for (const s of activeSynergies(buildingIds)) def += s.effect.defense;
    }
    return def;
  }

  toJSON() {
    return {
      q: this.q, r: this.r, type: this.type,
      owner: this.owner, capital: this.capital,
      defense: this.defense, garrison: this.garrison,
      buildSlots: this.buildSlots,
      location: this.location?.toJSON() || null
    };
  }
}