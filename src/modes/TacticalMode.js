import { Mode } from '../core/Mode.js';
import { TacticalBattle } from '../tactical/TacticalBattle.js';
import { TacticalRenderer } from '../render/TacticalRenderer.js';
import { FACTION_PLAYER } from '../data/Factions.js';

export class TacticalMode extends Mode {
  constructor(ctx) {
    super(ctx);
    this.renderer = new TacticalRenderer(ctx);
  }

  onEnter() {
    this.ctx.state.mode = 'tactical';
    const cfg = this.ctx.state.tactical.config;
    if (!cfg) {
      this.ctx.bus.emit('mode:requestSwitch', { name: 'strategy' });
      return;
    }
    const tile = this.ctx.state.strategy.tiles.get(cfg.locationKey);
    if (!tile) {
      this.ctx.bus.emit('mode:requestSwitch', { name: 'strategy' });
      return;
    }

    // Берём реальные юниты из армий
    const playerUnits = this.ctx.state.getUnitsAt(FACTION_PLAYER, cfg.locationKey)
      .map((u) => ({ type: u.type, hp: u.hp, locationKey: u.locationKey, id: u.id }));

    // Защитник: если вражеская фракция — их юниты, если нейтрал — синтетика
    let defenderUnits;
    if (cfg.defenderFaction === 'neutral') {
      const g = Math.max(1, tile.garrison || 1);
      defenderUnits = [];
      for (let i = 0; i < g; i++) defenderUnits.push({ type: i === 0 && g >= 3 ? 'heavy' : 'infantry' });
    } else {
      defenderUnits = this.ctx.state.getUnitsAt(cfg.defenderFaction, cfg.locationKey)
        .map((u) => ({ type: u.type, hp: u.hp, locationKey: u.locationKey, id: u.id }));
      if (defenderUnits.length === 0) defenderUnits.push({ type: 'infantry' });
    }

    const battle = new TacticalBattle({
      attackerFaction: FACTION_PLAYER,
      defenderFaction: cfg.defenderFaction,
      locationKey: cfg.locationKey,
      attackerUnits: playerUnits,
      defenderUnits,
      seed: (tile.q * 73856093) ^ (tile.r * 19349663),
    });
    this.ctx.state.tactical.battle = battle;

    // Связываем конкретные юниты стратегии с юнитами боя — по индексу типа
    // (простой вариант: HP боя синхронизируется обратно в стратегию по окончании)
    battle._syncBack = () => {
      this._syncBackToStrategy(battle);
    };

    // Камера — центрируем арену
    const grid = battle.grid;
    const s = this.renderer.cellSize;
    this.ctx.camera.x = (grid.width * s) / 2;
    this.ctx.camera.y = (grid.height * s) / 2;
    this.ctx.camera.zoom = Math.min(
      (this.ctx.screen.width - 30) / (grid.width * s),
      (this.ctx.screen.height - 160) / (grid.height * s),
      1.2,
    );

    this._subscribe();
    this.ctx.bus.emit('battle:started', { battle });
  }

  onExit() {
    const battle = this.ctx.state.tactical.battle;
    if (battle?.ai) battle.ai.dispose();
    this.ctx.state.tactical.battle = null;
    this.ctx.state.tactical.config = null;
    this.ctx.state.tactical.locationKey = null;
    this._unsubscribe();
    this._finishing = false;
  }

  _subscribe() {
    this._onAction = ({ action }) => this._handleBattleAction(action);
    this.ctx.bus.on('battle:action', this._onAction);
  }

  _unsubscribe() {
    if (this._onAction) this.ctx.bus.off('battle:action', this._onAction);
  }

  _handleBattleAction(action) {
    const battle = this.ctx.state.tactical.battle;
    if (!battle || battle.finished) return;
    if (action === 'end-turn') {
      if (!battle.isPlayerTurn) return;
      battle.endTurn();
      this.ctx.bus.emit('battle:updated');
    } else if (action === 'retreat') {
      battle.finished = true;
      battle.result = 'defender';
      this._finishBattle();
    }
  }

  update() {
    const battle = this.ctx.state.tactical.battle;
    if (battle && battle.finished && !this._finishing) {
      this._finishing = true;
      setTimeout(() => this._finishBattle(), 600);
    }
  }

  render() { this.renderer.render(); }

  onPointerDown(worldPos) {
    const battle = this.ctx.state.tactical.battle;
    if (!battle || battle.finished) return;

    const { x, y } = this.renderer.cellFromWorld(worldPos.x, worldPos.y);
    if (!battle.grid.inBounds(x, y)) return;
    const clicked = battle.grid.unitAt(x, y);
    const selected = this.renderer.selectedUnit;

    if (clicked && clicked.faction === battle.attackerFaction) {
      this.renderer.setSelected(clicked);
      this.ctx.bus.emit('battle:updated');
      return;
    }
    if (!selected || !battle.isPlayerTurn) return;

    if (clicked && clicked.faction !== battle.attackerFaction) {
      if (battle.tryAttack(selected, clicked)) this.ctx.bus.emit('battle:updated');
      return;
    }
    if (!clicked) {
      if (battle.tryMove(selected, x, y)) {
        this.renderer.setSelected(selected);
        this.ctx.bus.emit('battle:updated');
      }
    }
  }

  _syncBackToStrategy(battle) {
    // Обновляем HP реальных юнитов игрока по количеству выживших и их hp
    const playerUnitsOnMap = battle.grid.unitsOf(battle.attackerFaction);
    const stratUnits = this.ctx.state.getUnitsAt(FACTION_PLAYER, battle.locationKey);
    // Простая синхронизация: соответствие по индексу
    for (let i = 0; i < stratUnits.length; i++) {
      if (i < playerUnitsOnMap.length) {
        stratUnits[i].hp = playerUnitsOnMap[i].hp;
        stratUnits[i].locationKey = battle.locationKey;
      } else {
        stratUnits[i].hp = 0;
      }
    }
    // Если атака удалась — переносим локацию юнитам на захваченный тайл
    if (battle.result === 'attacker') {
      for (const u of stratUnits) {
        if (u.hp > 0) u.locationKey = battle.locationKey;
      }
    }
    this.ctx.state.removeDeadUnits();
  }

  _finishBattle() {
    const battle = this.ctx.state.tactical.battle;
    if (!battle) return;

    battle._syncBack?.();

    const tile = this.ctx.state.strategy.tiles.get(battle.locationKey);
    if (tile) {
      if (battle.result === 'attacker') {
        // Тайл становится игрока
        tile.owner = FACTION_PLAYER;
        if (tile.garrison != null) tile.garrison = 0;
        tile.defense = tile.getTotalDefense();
        this.ctx.bus.emit('tile:captured', {
          faction: FACTION_PLAYER, q: tile.q, r: tile.r,
        });
      } else {
        // Отступили/проиграли — гарнизон врага уменьшается
        if (tile.owner === 'neutral') {
          const survivors = battle.grid.unitsOf(battle.defenderFaction).length;
          tile.garrison = Math.max(0, survivors);
        } else {
          // Обновим их армию
          const enemyUnits = this.ctx.state.getUnitsAt(battle.defenderFaction, battle.locationKey);
          const survivors = battle.grid.unitsOf(battle.defenderFaction);
          for (let i = 0; i < enemyUnits.length; i++) {
            if (i < survivors.length) enemyUnits[i].hp = survivors[i].hp;
            else enemyUnits[i].hp = 0;
          }
          this.ctx.state.removeDeadUnits();
        }
        tile.defense = tile.getTotalDefense();
      }
    }

    this.ctx.bus.emit('battle:finished', { result: battle.result });
    setTimeout(() => this.ctx.bus.emit('mode:requestSwitch', { name: 'strategy' }), 500);
  }
}