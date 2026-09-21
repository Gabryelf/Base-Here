import { FACTION_PLAYER, AI_FACTIONS } from '../data/Factions.js';
import { getNeighbors, hexDistance } from '../data/MapGen.js';
import { TILE_TYPES } from '../data/Tile.js';

// Порядок ходов: игрок → ИИ-фракции (по очереди) → снова игрок.
export class TurnManager {
  constructor({ state, bus }) {
    this.state = state;
    this.bus = bus;
    this._order = [FACTION_PLAYER, ...AI_FACTIONS];
    this._idx = 0;
    this._started = false;
  }

  start() {
    this._idx = 0;
    this._started = true;
    this._beginFactionTurn();
  }

  // Завершает ход текущей фракции, передаёт ход следующей.
  endTurn() {
    if (!this._started) return;
    const current = this._order[this._idx];

    // Доход фракции в конце её хода
    if (current === FACTION_PLAYER) {
      const income = this.state.computePlayerIncome();
      this.state.addResources(FACTION_PLAYER, income);
      this.bus.emit('resources:changed', { faction: FACTION_PLAYER, income });
    } else {
      // ИИ-фракция: пусть "богатеет" условно, чтобы позже можно было её сдерживать.
      this._aiTurn(current);
    }

    this._idx = (this._idx + 1) % this._order.length;
    if (this._idx === 0) {
      this.state.turn += 1;
      this.bus.emit('turn:newRound', { turn: this.state.turn });
    }
    this._beginFactionTurn();
  }

  _beginFactionTurn() {
    const faction = this._order[this._idx];
    this.state.currentFaction = faction;
    this.bus.emit('turn:started', { faction, turn: this.state.turn });
  }

  // ===== Простой ИИ =====
  _aiTurn(faction) {
    const tiles = [...this.state.strategy.tiles.values()];
    const owned = tiles.filter((t) => t.owner === faction);
    if (owned.length === 0) return;

    // Каждый owned-тайл пытается "поглотить" соседний нейтрал.
    for (const tile of owned) {
      // 1 "единица действия" на тайл, с шансом ~50%
      if (Math.random() > 0.5) continue;
      const neutralNeighbors = getNeighbors(tile, this.state.strategy.tiles)
        .filter((n) => n.owner === 'neutral' && n.type !== TILE_TYPES.WATER);
      if (neutralNeighbors.length === 0) continue;

      const target = neutralNeighbors[Math.floor(Math.random() * neutralNeighbors.length)];
      // Захватываем без боя, если гарнизона нет; иначе — с шансом по defense.
      if (target.garrison === 0 || Math.random() * 4 > target.defense) {
        target.owner = faction;
        target.garrison = 1;
        this.bus.emit('tile:captured', { faction, q: target.q, r: target.r });
      }
    }
  }

  // Помощник: доступен ли сейчас ход игрока
  isPlayerTurn() {
    return this._order[this._idx] === FACTION_PLAYER;
  }
}

// (переиспользуемая функция — оставлена на случай будущих проверок радиуса)
export function tileDistance(a, b) {
  return hexDistance(a.q, a.r, b.q, b.r);
}