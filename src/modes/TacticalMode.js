import { Mode } from '../core/Mode.js';
import { TacticalBattle } from '../tactical/TacticalBattle.js';
import { TacticalRenderer } from '../render/TacticalRenderer.js';
import { UNIT_TYPES } from '../data/UnitTypes.js';
import { FACTION_PLAYER } from '../data/Factions.js';

// Полноценный тактический режим. Активируется, когда state.tactical.locationKey задан.
export class TacticalMode extends Mode {
    constructor(ctx) {
        super(ctx);
        this.renderer = new TacticalRenderer(ctx);
    }

    onEnter() {
        this.ctx.state.mode = 'tactical';

        const key = this.ctx.state.tactical.locationKey;
        if (!key) {
            // Некуда входить — возвращаемся
            this.ctx.bus.emit('tactical:noTarget');
            return;
        }
        const tile = this.ctx.state.strategy.tiles.get(key);
        if (!tile) return;

        // Стартуем битву
        const battle = new TacticalBattle({
            attackerFaction: FACTION_PLAYER,
            defenderFaction: tile.owner === 'neutral' ? 'neutral' : tile.owner,
            locationKey: key,
            garrison: Math.max(1, tile.garrison || 2),
            seed: (tile.q * 73856093) ^ (tile.r * 19349663),
        });
        this.ctx.state.tactical.battle = battle;

        // Камера — центрируем на карте боя
        const grid = battle.grid;
        const s = this.renderer.cellSize;
        this.ctx.camera.x = (grid.width * s) / 2;
        this.ctx.camera.y = (grid.height * s) / 2;
        this.ctx.camera.zoom = this._fitZoom(grid, s);

        this._subscribe();
        this.ctx.bus.emit('battle:started', { battle });
    }

    onExit() {
        const battle = this.ctx.state.tactical.battle;
        if (battle?.ai) battle.ai.dispose();
        this.ctx.state.tactical.battle = null;
        this.ctx.state.tactical.locationKey = null;
        this._unsubscribe();
        this._finishing = false;
    }

    _fitZoom(grid, s) {
        const { width, height } = this.ctx.screen;
        const worldW = grid.width * s;
        const worldH = grid.height * s;
        const margin = 40;
        return Math.min(
            (width - margin) / worldW,
            (height - margin * 2) / worldH,
            1.4,
        );
    }

    _subscribe() {
        this._onAction = ({ action }) => this._handleBattleAction(action);
        this._onUpdated = () => this.renderer.setSelected(this.renderer.selectedUnit);
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

    update(_dt) {
        const battle = this.ctx.state.tactical.battle;
        if (battle && battle.finished && !this._finishing) {
            this._finishing = true;
            setTimeout(() => this._finishBattle(), 600);
        }
    }

    render() {
        this.renderer.render();
    }

    onPointerDown(worldPos, screenPos) {
        const battle = this.ctx.state.tactical.battle;
        if (!battle || battle.finished) return;

        const { x, y } = this.renderer.cellFromWorld(worldPos.x, worldPos.y);
        if (!battle.grid.inBounds(x, y)) return;

        const clickedUnit = battle.grid.unitAt(x, y);
        const selected = this.renderer.selectedUnit;

        // 1) Клик по своему юниту — выделяем
        if (clickedUnit && clickedUnit.faction === battle.attackerFaction) {
            this.renderer.setSelected(clickedUnit);
            this.ctx.bus.emit('battle:updated');
            return;
        }

        if (!selected || !battle.isPlayerTurn) return;

        // 2) Клик по врагу — попытка атаки
        if (clickedUnit && clickedUnit.faction !== battle.attackerFaction) {
            const ok = battle.tryAttack(selected, clickedUnit);
            if (ok) this.ctx.bus.emit('battle:updated');
            return;
        }

        // 3) Клик по пустой клетке — попытка движения
        if (!clickedUnit) {
            const ok = battle.tryMove(selected, x, y);
            if (ok) {
                this.renderer.setSelected(selected); // пересчитать reachable
                this.ctx.bus.emit('battle:updated');
            }
        }
    }

    _finishBattle() {
        const battle = this.ctx.state.tactical.battle;
        if (!battle) return;

        const tile = this.ctx.state.strategy.tiles.get(battle.locationKey);
        if (tile) {
            if (battle.result === 'attacker') {
                tile.owner = battle.attackerFaction;
                tile.garrison = battle.grid.unitsOf(battle.attackerFaction).length;
                tile.defense = 2 + tile.garrison;
                this.ctx.bus.emit('tile:captured', {
                    faction: battle.attackerFaction, q: tile.q, r: tile.r,
                });
            } else {
                // Отступили/проиграли: гарнизон защитника уменьшается, если были потери.
                const survivors = battle.grid.unitsOf(battle.defenderFaction).length;
                tile.garrison = Math.max(0, survivors);
                tile.defense = 2 + tile.garrison;
            }
        }

        this.ctx.bus.emit('battle:finished', { result: battle.result });
        // Возвращаемся на стратегическую карту
        setTimeout(() => this.ctx.bus.emit('mode:requestSwitch', { name: 'strategy' }), 400);
    }
}