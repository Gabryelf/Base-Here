// Базовые типы юнитов. Используются и в тактике, и в гарнизоне на карте.
export const UNIT_TYPES = {
    infantry: {
      id: 'infantry',
      name: 'Пехота',
      hp: 10,
      attack: 3,
      range: 1,
      move: 2,
      color: '#58a6ff',
      icon: '●',
    },
    heavy: {
      id: 'heavy',
      name: 'Тяжёлые',
      hp: 18,
      attack: 4,
      range: 1,
      move: 1,
      color: '#a371f7',
      icon: '■',
    },
    scout: {
      id: 'scout',
      name: 'Разведка',
      hp: 6,
      attack: 2,
      range: 3,
      move: 4,
      color: '#3fb950',
      icon: '▲',
    },
    drone: {
      id: 'drone',
      name: 'Дрон',
      hp: 8,
      attack: 3,
      range: 2,
      move: 2,
      color: '#d29922',
      icon: '✦',
    },
  };
  
  // Состав "типовой группы" по размеру гарнизона.
  // Гарнизон 1 → 1 пехотинец, 3 → 1 тяжёлый + 2 пехоты и т.д.
  export function compositionFor(garrisonSize, faction) {
    const comp = [];
    let n = garrisonSize;
    while (n > 0) {
      if (n >= 3 && comp.length === 0) {
        comp.push('heavy');
        n -= 3;
      } else if (n >= 2 && Math.random() < 0.4) {
        comp.push('scout');
        n -= 2;
      } else {
        comp.push('infantry');
        n -= 1;
      }
    }
    // Для игрока-защитника (редкий случай) можно было бы добавлять "drone",
    // но пока не нужно: игрок всегда атакующий.
    return comp.map((type) => ({
      type,
      faction,
    }));
  }