import { generateMap } from '../data/MapGen.js';
import { FACTION_PLAYER } from '../data/Factions.js';

export class GameState {
  constructor({ seed = 1337, radius = 8 } = {}) {
    this.turn = 1;
    this.mode = 'strategy';
    this.currentFaction = FACTION_PLAYER; // чей сейчас ход
    this.gameOver = false;

    // Карта
    const { tiles, radius: r } = generateMap({ seed, radius });
    this.strategy = {
      hexSize: 44,
      radius: r,
      seed,
      tiles,
      selected: null,
    };

    // Ресурсы игрока
    this.resources = {
      player: { credits: 20, material: 10, energy: 0 },
      // ИИ-ресурсы можно не считать детально — они действуют по упрощённой логике.
    };

    // Тактический / строительный слои — заглушки
    this.tactical = { active: false, locationKey: null, battle: null };
    this.build = { active: false, locationKey: null };
  }

  getTile(q, r) {
    return this.strategy.tiles.get(`${q},${r}`) || null;
  }

  getPlayerTiles() {
    const out = [];
    for (const t of this.strategy.tiles.values()) {
      if (t.owner === FACTION_PLAYER) out.push(t);
    }
    return out;
  }

  // Считает доход игрока по owned-тайлам
  computePlayerIncome() {
    let credits = 0, material = 0, energy = 0;
    for (const t of this.strategy.tiles.values()) {
      if (t.owner !== FACTION_PLAYER) continue;
      const y = t.getYield();
      credits += y.credits;
      material += y.material;
      energy += y.energy;
    }
    return { credits, material, energy };
  }

  addResources(faction, delta) {
    const res = this.resources[faction];
    if (!res) return;
    res.credits += delta.credits || 0;
    res.material += delta.material || 0;
    res.energy += delta.energy || 0;
  }
}