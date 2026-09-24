import { Tile, TILE_TYPES } from './Tile.js';
import { createRng, randInt, pick } from '../utils/rng.js';
import { hexKey } from '../utils/hex.js';
import { FACTION_PLAYER, FACTION_NEUTRAL, AI_FACTIONS } from './Factions.js';
import { Location } from './Location.js';

// Генерирует карту в виде Map<"q,r", Tile> + ставит стартовые столицы.
export function generateMap({ seed = 1337, radius = 8 } = {}) {
  const rng = createRng(seed);
  const tiles = new Map();

  // 1) Типы тайлов. Простой алгоритм: у воды/гор немного, остальное — равнина/лес.
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) {
      // Чем ближе к центру — тем вероятнее "цивилизованные" тайлы.
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      const centerBias = 1 - dist / radius; // 1 в центре, ~0 на краю

      let type;
      const roll = rng();
      if (roll < 0.06 + (1 - centerBias) * 0.05) type = TILE_TYPES.WATER;
      else if (roll < 0.16) type = TILE_TYPES.MOUNTAIN;
      else if (roll < 0.16 + 0.30 * centerBias) type = TILE_TYPES.URBAN;
      else if (roll < 0.60) type = TILE_TYPES.FOREST;
      else if (roll < 0.68) type = TILE_TYPES.RUINS;
      else type = TILE_TYPES.PLAINS;

      tiles.set(hexKey(q, r), new Tile({ q, r, type }));
    }
  }

  // 2) Расставляем стартовые позиции. Игрок — слева, ИИ — по кругу.
  const allKeys = [...tiles.keys()].filter((k) => {
    const t = tiles.get(k);
    return t.type !== TILE_TYPES.WATER && t.type !== TILE_TYPES.MOUNTAIN;
  });

  const usedPositions = new Set();
  function pickStart(minDistFromOthers = 4) {
    // Пытаемся найти тайл, далёкий от уже использованных.
    for (let attempt = 0; attempt < 200; attempt++) {
      const key = allKeys[randInt(rng, 0, allKeys.length - 1)];
      if (usedPositions.has(key)) continue;
      const t = tiles.get(key);
      let ok = true;
      for (const usedKey of usedPositions) {
        const u = tiles.get(usedKey);
        const d = hexDistance(t.q, t.r, u.q, u.r);
        if (d < minDistFromOthers) { ok = false; break; }
      }
      if (ok) { usedPositions.add(key); return t; }
    }
    // Фолбэк — просто первый свободный
    const key = allKeys.find((k) => !usedPositions.has(k));
    usedPositions.add(key);
    return tiles.get(key);
  }

  // Игрок
  const playerStart = pickStart(5);
  playerStart.owner = FACTION_PLAYER;
  playerStart.capital = true;
  playerStart.type = TILE_TYPES.URBAN; // старт всегда город
  playerStart.hasLocation = true;

  // ИИ-фракции
  for (const faction of AI_FACTIONS) {
    const start = pickStart(5);
    start.owner = faction;
    start.capital = true;
    start.type = TILE_TYPES.URBAN;
    start.hasLocation = true;
  }

  // Нейтральный гарнизон на некоторых URBAN/RUINS для будущих боёв
  for (const tile of tiles.values()) {
    if (tile.owner === FACTION_NEUTRAL && tile.hasLocation) {
      tile.garrison = randInt(rng, 1, 3);
      tile.defense = 2 + tile.garrison;
    }
  }

  for (const tile of tiles.values()) {
    if (tile.hasLocation) {
      tile.location = new Location({
        tileKey: hexKey(tile.q, tile.r),
        seed: (tile.q * 374761393) ^ (tile.r * 668265263),
      });
    }
  }

  return { tiles, radius, seed };
}

// Расстояние между двумя гексами (axial)
export function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

// Возвращает соседей в axial-координатах (6 направлений)
export const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

export function getNeighbors(tile, tilesMap) {
  const result = [];
  for (const d of HEX_DIRECTIONS) {
    const k = hexKey(tile.q + d.q, tile.r + d.r);
    const t = tilesMap.get(k);
    if (t) result.push(t);
  }
  return result;
}