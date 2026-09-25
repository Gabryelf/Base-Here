import { generateMap } from '../data/MapGen.js';
import { FACTION_PLAYER, AI_FACTIONS } from '../data/Factions.js';
import { Unit } from '../data/Unit.js';

const MAX_AP = 5;

export class GameState {
  constructor({ seed = 1337, radius = 8 } = {}) {
    this.turn = 1;
    this.mode = 'strategy';
    this.currentFaction = FACTION_PLAYER;
    this.gameOver = false;

    const { tiles, radius: r } = generateMap({ seed, radius });
    this.strategy = {
      hexSize: 44,
      radius: r,
      seed,
      tiles,
      selected: null,
    };

    // Очки действия игрока
    this.ap = MAX_AP;
    this.apMax = MAX_AP;

    // Ресурсы игрока
    this.resources = {
      player: { credits: 30, material: 15, energy: 4 },
    };

    // Армии всех фракций: Map<factionId, Unit[]>
    this.armies = new Map();
    this.armies.set(FACTION_PLAYER, []);
    for (const f of AI_FACTIONS) this.armies.set(f, []);

    // Стартовый юнит игрока в столице
    const playerCapital = [...tiles.values()]
      .find((t) => t.owner === FACTION_PLAYER && t.capital);
    if (playerCapital) {
      const u = new Unit({
        type: 'infantry',
        faction: FACTION_PLAYER,
        locationKey: playerCapital.key,
      });
      this.armies.get(FACTION_PLAYER).push(u);
    }

    // ИИ получают по 2 защитных юнита на столицу
    for (const f of AI_FACTIONS) {
      const cap = [...tiles.values()].find((t) => t.owner === f && t.capital);
      if (!cap) continue;
      this.armies.get(f).push(
        new Unit({ type: 'infantry', faction: f, locationKey: cap.key }),
        new Unit({ type: 'heavy', faction: f, locationKey: cap.key }),
      );
    }

    this.tactical = { active: false, locationKey: null, battle: null };
    this.build = {
      active: false, locationKey: null, activeLocation: null,
      worldW: 800, worldH: 600, slotRadius: 56,
    };
  }

  // ===== AP =====
  get maxAP() { return this.apMax; }
  canSpendAP(n) { return this.ap >= n; }
  spendAP(n) { this.ap = Math.max(0, this.ap - n); return this.ap; }
  resetAP() { this.ap = this.apMax; }

  // ===== Ресурсы =====
  canAfford(cost) {
    const r = this.resources[FACTION_PLAYER];
    return r.credits >= (cost.credits || 0)
        && r.material >= (cost.material || 0)
        && r.energy >= (cost.energy || 0);
  }
  spendCost(cost) {
    const r = this.resources[FACTION_PLAYER];
    r.credits -= cost.credits || 0;
    r.material -= cost.material || 0;
    r.energy -= cost.energy || 0;
  }
  refund(cost, factor = 0.5) {
    const r = this.resources[FACTION_PLAYER];
    r.credits += Math.floor((cost.credits || 0) * factor);
    r.material += Math.floor((cost.material || 0) * factor);
    r.energy += Math.floor((cost.energy || 0) * factor);
  }

  getTile(q, r) { return this.strategy.tiles.get(`${q},${r}`) || null; }

  getPlayerTiles() {
    const out = [];
    for (const t of this.strategy.tiles.values()) {
      if (t.owner === FACTION_PLAYER) out.push(t);
    }
    return out;
  }

  computePlayerIncome() {
    let credits = 0, material = 0, energy = 0;
    for (const t of this.strategy.tiles.values()) {
      if (t.owner !== FACTION_PLAYER) continue;
      const y = t.getYield();
      credits += y.credits; material += y.material; energy += y.energy;
    }
    return { credits, material, energy };
  }

  addResources(faction, delta) {
    const r = this.resources[faction];
    if (!r) return;
    r.credits += delta.credits || 0;
    r.material += delta.material || 0;
    r.energy += delta.energy || 0;
  }

  // ===== Армии =====
  getArmy(faction) { return this.armies.get(faction) || []; }

  getUnitsAt(faction, locationKey) {
    return this.getArmy(faction).filter((u) => u.alive && u.locationKey === locationKey);
  }

  countUnitsAt(faction, locationKey) { return this.getUnitsAt(faction, locationKey).length; }

  addUnit(unit) {
    const arr = this.armies.get(unit.faction) || [];
    arr.push(unit);
    this.armies.set(unit.faction, arr);
  }

  removeDeadUnits() {
    for (const [f, arr] of this.armies) {
      this.armies.set(f, arr.filter((u) => u.alive));
    }
  }
}