import { getBuilding } from '../data/Buildings.js';

// Рендер строительного канваса: сетка слотов, постройки, подсветка.
export class BuildRenderer {
    constructor({ screen, camera, state }) {
        this.screen = screen;
        this.camera = camera;
        this.state = state;
        this.selectedSlotId = null;
        this.hoverSlotId = null;
    }

    setSelected(slotId) { this.selectedSlotId = slotId; }

    render() {
        const { screen, camera, state } = this;
        const build = state.build;
        if (!build.activeLocation) return;

        const ctx = screen.ctx;
        const W = screen.width;
        const H = screen.height;

        ctx.save();
        camera.apply(ctx);

        // Мировая область канваса стройки: от 0,0 до build.worldW/H
        const worldW = build.worldW;
        const worldH = build.worldH;

        // Фон локации
        ctx.fillStyle = '#14181e';
        ctx.fillRect(0, 0, worldW, worldH);

        // Рамка
        ctx.strokeStyle = '#2d333b';
        ctx.lineWidth = 2 / camera.zoom;
        ctx.strokeRect(0, 0, worldW, worldH);

        // Слоты
        const slotRadius = build.slotRadius;
        for (const slot of build.activeLocation.slots) {
            const cx = slot.pos.x * worldW;
            const cy = slot.pos.y * worldH;

            const isSelected = slot.id === this.selectedSlotId;
            const isHover = slot.id === this.hoverSlotId;
            const occupied = !!slot.buildingId;

            // Круг слота
            ctx.beginPath();
            ctx.arc(cx, cy, slotRadius, 0, Math.PI * 2);
            ctx.fillStyle = occupied
                ? this._buildingColor(slot.buildingId)
                : this._slotColor(slot.type);
            ctx.fill();

            ctx.lineWidth = Math.max(2, (isSelected ? 4 : 2) / camera.zoom);
            ctx.strokeStyle = isSelected
                ? '#58a6ff'
                : isHover ? '#e6e6e6' : '#2d333b';
            ctx.stroke();

            // Иконка постройки/слота
            ctx.fillStyle = '#0b0d10';
            ctx.font = `bold ${Math.round(slotRadius * 0.9)}px system-ui`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                occupied ? this._buildingIcon(slot.buildingId) : this._slotIcon(slot.type),
                cx, cy,
            );

            // Подпись типа слота снизу
            ctx.fillStyle = 'rgba(173, 186, 199, 0.9)';
            ctx.font = `${Math.round(slotRadius * 0.4)}px system-ui`;
            ctx.fillText(this._slotLabel(slot.type), cx, cy + slotRadius + slotRadius * 0.5);
        }

        ctx.restore();
    }

    _slotColor(type) {
        return {
            energy: '#2a2030',
            industrial: '#2a2a20',
            residential: '#202a30',
            military: '#2e1f1f',
            special: '#202a24',
        }[type] || '#222';
    }

    _slotIcon(type) {
        return {
            energy: '⚡', industrial: '🏭', residential: '🏠',
            military: '🛡', special: '✦',
        }[type] || '·';
    }

    _slotLabel(type) {
        return {
            energy: 'Энергия', industrial: 'Пром.', residential: 'Жильё',
            military: 'Воен.', special: 'Особый',
        }[type] || type;
    }

    _buildingColor(buildingId) {
        return {
            solar_plant: '#d29922', fusion_reactor: '#d29922',
            factory: '#a371f7', mine: '#a371f7',
            arcology: '#58a6ff', housing: '#58a6ff',
            barracks: '#f85149', bunker: '#f85149',
            data_hub: '#3fb950', shield_array: '#3fb950',
        }[buildingId] || '#6e7681';
    }

    _buildingIcon(buildingId) {
        return {
            solar_plant: '☀', fusion_reactor: '☢',
            factory: '🏭', mine: '⛏',
            arcology: '🏙', housing: '🏠',
            barracks: '⚔', bunker: '🧱',
            data_hub: '☷', shield_array: '⌬',
        }[buildingId] || '?';
    }

    // Клик по мировым координатам → id слота или null
    slotAtWorld(wx, wy) {
        const build = this.state.build;
        if (!build.activeLocation) return null;
        const worldW = build.worldW;
        const worldH = build.worldH;
        const r = build.slotRadius;

        for (const slot of build.activeLocation.slots) {
            const cx = slot.pos.x * worldW;
            const cy = slot.pos.y * worldH;
            const d = Math.hypot(wx - cx, wy - cy);
            if (d <= r) return slot;
        }
        return null;
    }
}