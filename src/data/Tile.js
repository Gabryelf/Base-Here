export const TILE_TYPES = {
    PLAINS:   'plains',
    FOREST:   'forest',
    MOUNTAIN: 'mountain',
    WATER:    'water',
    URBAN:    'urban',
    RUINS:    'ruins',
  };
  
  // Базовый доход ресурсов с тайла по типу. Умножается на уровень.
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
      this.q = q;
      this.r = r;
      this.type = type;
      this.owner = 'neutral';
      this.capital = false;
  
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
      return {
        credits: base.credits * capitalBonus,
        material: base.material * capitalBonus,
        energy: base.energy * capitalBonus,
      };
    }
  
    toJSON() {
      return {
        q: this.q, r: this.r, type: this.type,
        owner: this.owner, capital: this.capital,
        defense: this.defense, garrison: this.garrison,
        buildSlots: this.buildSlots,
      };
    }
  }