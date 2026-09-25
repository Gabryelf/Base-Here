import { FACTION_PLAYER, AI_FACTIONS } from '../data/Factions.js';
import { getNeighbors } from '../data/MapGen.js';
import { TILE_TYPES } from '../data/Tile.js';
import { UNIT_TYPES } from '../data/UnitTypes.js';
import { Unit } from '../data/Unit.js';

// Пошаговость: игрок → ИИ-фракции. ИИ атакует границы игрока.
export class TurnManager {
  constructor({ state, bus }) {
    this.state = state;
    this.bus = bus;
    this._order = [FACTION_PLAYER, ...AI_FACTIONS];
    this._idx = 0;
    this._started = false;
    this._aiBusy = false;
  }

  start() {
    this._idx = 0;
    this._started = true;
    this._beginFactionTurn();
  }

  endTurn() {
    if (!this._started) return;
    const current = this._order[this._idx];

    if (current === FACTION_PLAYER) {
      // Доход и содержание армии
      const income = this.state.computePlayerIncome();
      this.state.addResources(FACTION_PLAYER, income);
      this._payUpkeep(FACTION_PLAYER);
      this.state.removeDeadUnits();
      this.bus.emit('resources:changed', { faction: FACTION_PLAYER });
    } else {
      this._aiTurn(current);
    }

    this._idx = (this._idx + 1) % this._order.length;
    if (this._idx === 0) {
      this.state.turn += 1;
      this.state.resetAP();
      this.bus.emit('turn:newRound', { turn: this.state.turn });
    }
    this._beginFactionTurn();
  }

  _beginFactionTurn() {
    const faction = this._order[this._idx];
    this.state.currentFaction = faction;
    this.bus.emit('turn:started', { faction, turn: this.state.turn });
  }

  _payUpkeep(faction) {
    const army = this.state.getArmy(faction);
    let cost = 0;
    for (const u of army) if (u.alive) cost += u.def.upkeep || 0;
    const res = this.state.resources[faction];
    if (!res) return;
    if (res.credits >= cost) {
      res.credits -= cost;
    } else {
      // Не хватает — часть юнитов дезертирует
      const deficit = cost - res.credits;
      res.credits = 0;
      let deserters = Math.ceil(deficit / 2);
      const alive = army.filter((u) => u.alive);
      while (deserters-- > 0 && alive.length > 0) {
        const victim = alive.pop();
        victim.hp = 0;
        this.bus.emit('unit:deserted', { faction, unitId: victim.id });
      }
      this.state.removeDeadUnits();
    }
  }

  isPlayerTurn() {
    return this._order[this._idx] === FACTION_PLAYER;
  }

  // ===== ИИ =====
  _aiTurn(faction) {
    this._aiBusy = true;
    const tiles = [...this.state.strategy.tiles.values()];
    const owned = tiles.filter((t) => t.owner === faction);
    if (owned.length === 0) { this._aiBusy = false; return; }

    // 1) Найм: если у ИИ много ресурсов, пусть добавит юнитов в столицу
    const capital = owned.find((t) => t.capital);
    const aiArmy = this.state.getArmy(faction);
    const ownedCount = owned.length;
    const targetArmy = Math.max(3, Math.floor(ownedCount * 1.2));

    if (capital && aiArmy.filter((u) => u.alive).length < targetArmy) {
      const type = ownedCount >= 4 ? 'heavy' : 'infantry';
      this.state.addUnit(new Unit({ type, faction, locationKey: capital.key }));
    }

    // 2) Перемещения: каждый юнит ИИ может двигаться к ближайшей границе с игроком
    const playerTiles = tiles.filter((t) => t.owner === FACTION_PLAYER);
    for (const u of aiArmy) {
      if (!u.alive) continue;
      const tile = tiles.find((t) => t.key === u.locationKey);
      if (!tile) continue;

      // Ищем соседний тайл с игроком
      const neighbors = getNeighbors(tile, this.state.strategy.tiles);
      const enemyNeighbor = neighbors.find((n) => n.owner === FACTION_PLAYER);
      if (enemyNeighbor) {
        // Здесь атака на границе — открываем бой с шансом
        if (Math.random() < 0.55) {
          this.bus.emit('ai:attackPlayer', {
            faction,
            fromKey: tile.key,
            targetKey: enemyNeighbor.key,
            unitId: u.id,
          });
          break; // пока один бой за ход ИИ
        }
      } else {
        // Пытаемся сдвинуть к ближайшему owned или нейтралу
        const neutral = neighbors.find((n) => n.owner === 'neutral' && n.type !== TILE_TYPES.WATER);
        if (neutral && Math.random() < 0.5) {
          // Просто захватываем нейтрал (без боя, если гарнизона нет)
          if (neutral.garrison === 0) {
            neutral.owner = faction;
            neutral.garrison = 0;
            u.locationKey = neutral.key;
            this.bus.emit('tile:captured', { faction, q: neutral.q, r: neutral.r });
          } else if (Math.random() * 4 > neutral.defense) {
            neutral.owner = faction;
            neutral.garrison = 1;
            this.bus.emit('tile:captured', { faction, q: neutral.q, r: neutral.r });
          }
        }
      }
    }

    this._aiBusy = false;
  }
}