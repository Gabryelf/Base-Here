import { SLOT_TYPES } from './Buildings.js';

// Одна локация = набор слотов под застройку. Привязана к тайлу.
export class Location {
    constructor({ tileKey, seed = 1 }) {
        this.tileKey = tileKey;
        this.slots = [];
        this._rng = makeRng(seed);
        this._generateSlots();
    }

    _generateSlots() {
        // 6 слотов: 2 фиксированных (energy, industrial), 4 случайных.
        const guaranteed = [SLOT_TYPES.ENERGY, SLOT_TYPES.INDUSTRIAL];
        const pool = [
            SLOT_TYPES.ENERGY, SLOT_TYPES.ENERGY,
            SLOT_TYPES.INDUSTRIAL, SLOT_TYPES.INDUSTRIAL,
            SLOT_TYPES.RESIDENTIAL, SLOT_TYPES.RESIDENTIAL,
            SLOT_TYPES.MILITARY, SLOT_TYPES.MILITARY,
            SLOT_TYPES.SPECIAL,
        ];

        const slotTypes = [...guaranteed];
        while (slotTypes.length < 6) {
            const t = pool[Math.floor(this._rng() * pool.length)];
            slotTypes.push(t);
        }

        // Позиции — гексагонально-сеточный паттерн (2 строки по 3).
        const positions = [
            { x: 0.25, y: 0.30 }, { x: 0.50, y: 0.22 }, { x: 0.75, y: 0.30 },
            { x: 0.25, y: 0.70 }, { x: 0.50, y: 0.78 }, { x: 0.75, y: 0.70 },
        ];

        this.slots = slotTypes.map((type, i) => ({
            id: `slot_${i}`,
            type,
            pos: positions[i],
            buildingId: null,
        }));
    }

    getBuildings() {
        return this.slots.map((s) => s.buildingId).filter(Boolean);
    }

    canPlace(slotId, building) {
        const slot = this.slots.find((s) => s.id === slotId);
        if (!slot || slot.buildingId) return false;
        if (slot.type !== building.slot) return false;
        return true;
    }

    place(slotId, buildingId) {
        const slot = this.slots.find((s) => s.id === slotId);
        if (!slot) return false;
        slot.buildingId = buildingId;
        return true;
    }

    remove(slotId) {
        const slot = this.slots.find((s) => s.id === slotId);
        if (!slot) return false;
        slot.buildingId = null;
        return true;
    }

    isEmpty() {
        return this.slots.every((s) => !s.buildingId);
    }

    toJSON() {
        return { tileKey: this.tileKey, slots: this.slots };
    }
}

function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}