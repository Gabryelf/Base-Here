// Простой генератор карты боя. Симметричная арена с небольшим числом препятствий.
export function generateBattleMap({ seed = 1 } = {}) {
    const width = 12;
    const height = 9;
  
    // Детерминированный ПСЧ из seed
    let s = seed >>> 0;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  
    const obstacles = [];
    // Пара кусков скал ближе к центру
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    for (let i = 0; i < 8; i++) {
      const ox = centerX + Math.floor(rng() * 3) - 1;
      const oy = centerY + Math.floor(rng() * 3) - 1;
      if (ox < 2 || ox > width - 3) continue;
      if (oy < 1 || oy > height - 2) continue;
      obstacles.push({ x: ox, y: oy });
    }
  
    return { width, height, obstacles };
  }