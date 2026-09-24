import { Mode } from '../core/Mode.js';
import { BuildRenderer } from '../render/BuildRenderer.js';
import { BuildPanel } from '../ui/BuildPanel.js';
import { getBuilding } from '../data/Buildings.js';
import { FACTION_PLAYER } from '../data/Factions.js';

// Полноценный строительный режим.
export class BuildMode extends Mode {
    constructor(ctx) {
        super(ctx);
        this.renderer = new BuildRenderer(ctx);
        this.panel = new BuildPanel({ bus: ctx.bus, state: ctx.state });
        this._bound = false;
    }

    onEnter() {
        this.ctx.state.mode = 'build';
        const key = this.ctx.state.build.locationKey;
        if (!key) {
            this.ctx.bus.emit('mode:requestSwitch', { name: 'strategy' });
            return;
        }
        const tile = this.ctx.state.strategy.tiles.get(key);
        if (!tile || !tile.location) {
            this.ctx.bus.emit('mode:requestSwitch', { name: 'strategy' });
            return;
        }

        // Настраиваем "мир" канваса стройки
        const worldW = 800;
        const worldH = 600;
        this.ctx.state.build.activeLocation = tile.location;
        this.ctx.state.build.worldW = worldW;
        this.ctx.state.build.worldH = worldH;
        this.ctx.state.build.slotRadius = 56;

        // Камера: центрируем и подгоняем по размеру экрана
        const { width, height } = this.ctx.screen;
        this.ctx.camera.x = worldW / 2;
        this.ctx.camera.y = worldH / 2;
        this.ctx.camera.zoom = Math.min(
            (width - 40) / worldW,
            (height - 140) / worldH,
            1.2,
        );

        this._bind();
        this.panel.show();
        this.ctx.bus.emit('build:updated');
    }

    onExit() {
        this.ctx.state.build.activeLocation = null;
        this.ctx.state.build.locationKey = null;
        this.panel.hide();
        this._unbind();
    }

    _bind() {
        if (this._bound) return;
        this._bound = true;

        this._onBuild = ({ buildingId }) => this._tryBuild(buildingId);
        this._onRemove = ({ slotId }) => this._tryRemove(slotId);
        this.ctx.bus.on('build:requestBuild', this._onBuild);
        this.ctx.bus.on('build:requestRemove', this._onRemove);
    }

    _unbind() {
        if (!this._bound) return;
        this._bound = false;
        this.ctx.bus.off('build:requestBuild', this._onBuild);
        this.ctx.bus.off('build:requestRemove', this._onRemove);
    }

    render() {
        this.renderer.render();
    }

    onPointerDown(worldPos) {
        const slot = this.renderer.slotAtWorld(worldPos.x, worldPos.y);
        if (!slot) {
            this.renderer.setSelected(null);
            this.ctx.bus.emit('build:slotSelected', { slot: null });
            return;
        }
        this.renderer.setSelected(slot.id);
        this.ctx.bus.emit('build:slotSelected', { slot });
    }

    _tryBuild(buildingId) {
        const slot = this.renderer.selectedSlotId
            ? this.ctx.state.build.activeLocation.slots.find((s) => s.id === this.renderer.selectedSlotId)
            : null;
        if (!slot) return;
        const b = getBuilding(buildingId);
        if (!b) return;
        if (!this.ctx.state.build.activeLocation.canPlace(slot.id, b)) return;

        // Проверяем ресурсы
        const res = this.ctx.state.resources[FACTION_PLAYER];
        if (res.credits < b.cost.credits) return;
        if (res.material < b.cost.material) return;
        if (res.energy < b.cost.energy) return;

        // Списываем и ставим
        res.credits -= b.cost.credits;
        res.material -= b.cost.material;
        res.energy -= b.cost.energy;
        this.ctx.state.build.activeLocation.place(slot.id, b.id);

        // Пересчёт обороны тайла (для будущих боёв)
        const tile = this.ctx.state.strategy.tiles.get(this.ctx.state.build.locationKey);
        if (tile) tile.defense = tile.getTotalDefense();

        this.ctx.bus.emit('resources:changed', { faction: FACTION_PLAYER });
        this.ctx.bus.emit('build:updated');
        this.ctx.bus.emit('build:slotSelected', { slot });
    }

    _tryRemove(slotId) {
        const loc = this.ctx.state.build.activeLocation;
        if (!loc) return;
        const slot = loc.slots.find((s) => s.id === slotId);
        if (!slot || !slot.buildingId) return;

        // Возвращаем 50% стоимости
        const b = getBuilding(slot.buildingId);
        if (b) {
            const res = this.ctx.state.resources[FACTION_PLAYER];
            res.credits += Math.floor(b.cost.credits * 0.5);
            res.material += Math.floor(b.cost.material * 0.5);
            res.energy += Math.floor(b.cost.energy * 0.5);
        }
        loc.remove(slotId);

        const tile = this.ctx.state.strategy.tiles.get(this.ctx.state.build.locationKey);
        if (tile) tile.defense = tile.getTotalDefense();

        this.ctx.bus.emit('resources:changed', { faction: FACTION_PLAYER });
        this.ctx.bus.emit('build:updated');
        this.ctx.bus.emit('build:slotSelected', { slot });
    }
}