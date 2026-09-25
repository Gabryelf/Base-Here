import { getBuilding } from './Buildings.js';
import { activeSynergies } from './Synergies.js';

export const TILE_TYPES = {
  PLAINS: 'plains', FOREST: 'forest', MOUNTAIN: 'mountain',
  WATER: 'water', URBAN: 'urban', RUINS: 'ruins',
};

export const TILE_YIELDS = {
  [TILE_TYPES.PLAINS]:   { credits: 1, material: 1, energy: 0 },
  [TILE_TYPES.FOREST]:   { credits: 1, material: 2, energy: 0 },
  [TILE_TYPES.MOUNTAIN]: { credits: 0, material: 3, energy: 1 },
  [TILE_TYPES.WATER]:    { credits: 2, material: 0, energy: 1 },
  [TILE_TYPES.URBAN]:    { credits: 3, material: 1, energy: 2 },
  [TILE_TYPES.RUINS]:    { credits: 1, material: 1, energy: 1 },
};

export class Tile {
  constructor({ q, r, type }) {
    this.q = q; this.r = r; this.type = type;
    this.owner = 'neutral';
    this.capital = false;
    this.location = null;
    this.hasLocation = type === TILE_TYPES.URBAN || type === TILE_TYPES.RUINS;
    this.defense = 1;
    this.garrison = 0; // для нейтралов; у фракций юниты хранятся в state.armies
  }

  get key() { return `${this.q},${this.r}`; }

  getYield() {
    if (this.owner === 'neutral') return { credits: 0, material: 0, energy: 0 };
    const base = TILE_YIELDS[this.type] || { credits: 0, material: 0, energy: 0 };
    const capitalBonus = this.capital ? 2 : 1;
    let credits = base.credits * capitalBonus;
    let material = base.material * capitalBonus;
    let energy = base.energy * capitalBonus;

    if (this.location) {
      const ids = this.location.getBuildings();
      for (const id of ids) {
        const b = getBuilding(id);
        if (!b) continue;
        credits += b.yield.credits;
        material += b.yield.material;
        energy += b.yield.energy;
      }
      for (const s of activeSynergies(ids)) {
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
      const ids = this.location.getBuildings();
      for (const id of ids) {
        const b = getBuilding(id);
        if (b) def += b.defense;
      }
      for (const s of activeSynergies(ids)) def += s.effect.defense;
    }
    return def;
  }

  // Краткая сводка построек — для иконок на стратегической карте
  getBuildingSummary() {
    if (!this.location) return [];
    return this.location.slots
      .filter((s) => s.buildingId)
      .map((s) => ({ slotId: s.id, id: s.buildingId }));
  }
}