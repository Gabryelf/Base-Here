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

    // Юниты игрока
    const playerUnits = this.ctx.state.getUnitsAt(FACTION_PLAYER, cfg.locationKey)
      .map((u) => ({
        type: u.type, hp: u.hp, locationKey: u.locationKey,
        id: u.id, morale: u.morale,
      }));

    // Если атака со стороны ИИ — тогда игрок защищается (меняем роли местами
    // при спавне: юниты игрока стартуют справа, ИИ — слева). Пока просто
    // спавним игрока справа для наглядности.
    const defenderUnits = this._buildDefenderUnits(cfg, tile);

    const battle = new TacticalBattle({
      attackerFaction: FACTION_PLAYER,
      defenderFaction: cfg.defenderFaction,
      locationKey: cfg.locationKey,
      attackerUnits: playerUnits,
      defenderUnits,
      seed: (tile.q * 73856093) ^ (tile.r * 19349663),
    });
    this.ctx.state.tactical.battle = battle;
    this.ctx.state.tactical.selectedUnit = null;

    battle._syncBack = () => this._syncBackToStrategy(battle);

    // Камера центрируется по карте
    const grid = battle.grid;
    const s = this.renderer.cellSize;
    this.ctx.camera.x = (grid.width * s) / 2;
    this.ctx.camera.y = (grid.height * s) / 2;
    this.ctx.camera.zoom = Math.min(
      (this.ctx.screen.width - 30) / (grid.width * s),
      (this.ctx.screen.height - 180) / (grid.height * s),
      1.2,
    );

    this._subscribe();
    this.ctx.bus.emit('battle:started', { battle });
    this.ctx.bus.emit('battle:updated');
  }

  _buildDefenderUnits(cfg, tile) {
    if (cfg.defenderFaction === 'neutral') {
      const g = Math.max(1, tile.garrison || 1);
      const arr = [];
      for (let i = 0; i < g; i++) {
        arr.push({ type: i === 0 && g >= 3 ? 'heavy' : 'infantry' });
      }
      return arr;
    }
    const arr = this.ctx.state.getUnitsAt(cfg.defenderFaction, cfg.locationKey)
      .map((u) => ({
        type: u.type, hp: u.hp, locationKey: u.locationKey,
        id: u.id, morale: u.morale,
      }));
    if (arr.length === 0) arr.push({ type: 'infantry' });
    return arr;
  }

  onExit() {
    const battle = this.ctx.state.tactical.battle;
    if (battle?.ai) battle.ai.dispose();
    this.ctx.state.tactical.battle = null;
    this.ctx.state.tactical.config = null;
    this.ctx.state.tactical.locationKey = null;
    this.ctx.state.tactical.selectedUnit = null;
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
    } else if (action === 'ability') {
      const sel = this.renderer.selectedUnit;
      if (!sel || !battle.isPlayerTurn) return;
      // Цель — ближайший враг в радиусе, если способность атакующая
      let target = null;
      const enemies = battle.grid.unitsOf(battle.defenderFaction)
        .filter((e) => sel.distanceTo(e) <= sel.def.range)
        .sort((a, b) => a.hp - b.hp);
      if (enemies.length > 0) target = enemies[0];
      const ok = battle.tryAbility(sel, target);
      if (ok) {
        this.renderer.flash(sel.x, sel.y, '#d29922');
        this.ctx.bus.emit('battle:updated');
      }
    }
  }

  update(dt) {
    this.renderer.update(dt);
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

    // 1) Клик по своему юниту — выделяем
    if (clicked && clicked.faction === battle.attackerFaction) {
      this.renderer.setSelected(clicked);
      this.ctx.state.tactical.selectedUnit = clicked;
      this.ctx.bus.emit('battle:updated');
      return;
    }

    if (!selected || !battle.isPlayerTurn) return;

    // 2) Клик по врагу — атака
    if (clicked && clicked.faction !== battle.attackerFaction) {
      if (battle.tryAttack(selected, clicked)) {
        this.renderer.flash(clicked.x, clicked.y, '#f85149');
        this.ctx.bus.emit('battle:updated');
      }
      return;
    }

    // 3) Клик по пустой клетке — движение
    if (!clicked) {
      if (battle.tryMove(selected, x, y)) {
        this.renderer.setSelected(selected);
        this.ctx.bus.emit('battle:updated');
      }
    }
  }

  _syncBackToStrategy(battle) {
    const survivors = battle.grid.unitsOf(battle.attackerFaction);
    const stratUnits = this.ctx.state.getUnitsAt(FACTION_PLAYER, battle.locationKey);

    for (let i = 0; i < stratUnits.length; i++) {
      if (i < survivors.length) {
        stratUnits[i].hp = survivors[i].hp;
        stratUnits[i].morale = survivors[i].morale;
        stratUnits[i].locationKey = battle.locationKey;
      } else {
        stratUnits[i].hp = 0;
      }
    }

    // Обновляем мораль выживших
    for (const u of stratUnits) {
      if (u.hp > 0) u.morale = Math.min(100, u.morale + 10);
    }

    if (battle.result === 'attacker') {
      for (const u of stratUnits) if (u.hp > 0) u.locationKey = battle.locationKey;
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
        tile.owner = FACTION_PLAYER;
        if (tile.garrison != null) tile.garrison = 0;
        tile.defense = tile.getTotalDefense();
        this.ctx.bus.emit('tile:captured', {
          faction: FACTION_PLAYER, q: tile.q, r: tile.r,
        });
      } else {
        if (tile.owner === 'neutral') {
          const surv = battle.grid.unitsOf(battle.defenderFaction).length;
          tile.garrison = Math.max(0, surv);
        } else {
          const enemyUnits = this.ctx.state.getUnitsAt(
            battle.defenderFaction, battle.locationKey,
          );
          const survivors = battle.grid.unitsOf(battle.defenderFaction);
          for (let i = 0; i < enemyUnits.length; i++) {
            if (i < survivors.length) {
              enemyUnits[i].hp = survivors[i].hp;
              enemyUnits[i].morale = survivors[i].morale;
            } else {
              enemyUnits[i].hp = 0;
            }
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