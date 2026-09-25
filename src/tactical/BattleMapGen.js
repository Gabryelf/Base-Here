// Карта боя 16×12 с препятствиями, укрытиями и зонами буста.
export function generateBattleMap({ seed = 1 } = {}) {
  const width = 16;
  const height = 12;

  let s = seed >>> 0;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const obstacles = [];   // скалы — блокируют движение и обзор (условно)
  const cover = [];       // укрытия — дают +защиту стоящему
  const boost = [];       // буст-клетки — дают +урон/+скорость

  // Скалы — 2-3 «пятна» ближе к центру
  for (let cluster = 0; cluster < 3; cluster++) {
    const cx = 4 + Math.floor(rng() * (width - 8));
    const cy = 2 + Math.floor(rng() * (height - 4));
    for (let i = 0; i < 4; i++) {
      const ox = cx + Math.floor(rng() * 3) - 1;
      const oy = cy + Math.floor(rng() * 3) - 1;
      if (ox < 2 || ox > width - 3) continue;
      if (oy < 1 || oy > height - 2) continue;
      obstacles.push({ x: ox, y: oy });
    }
  }

  // Укрытия — по 3 с каждой стороны + пара в центре
  for (let i = 0; i < 3; i++) {
    cover.push({ x: 2 + i, y: 2 + i });
    cover.push({ x: width - 3 - i, y: height - 3 - i });
  }
  cover.push({ x: 8, y: 5 });
  cover.push({ x: 8, y: 7 });

  // Бусты — 4 точки в интересных местах
  boost.push({ x: 4, y: 6, kind: 'attack' });
  boost.push({ x: width - 5, y: 6, kind: 'attack' });
  boost.push({ x: 8, y: 2, kind: 'defense' });
  boost.push({ x: 8, y: height - 3, kind: 'defense' });

  return { width, height, obstacles, cover, boost };
}