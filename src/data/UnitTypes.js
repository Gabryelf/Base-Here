// Типы войск. Один файл — источник истины для всех юнитов.
export const UNIT_TYPES = {
  infantry: {
    id: 'infantry',
    name: 'Пехота',
    hp: 12, attack: 3, range: 1, move: 2,
    cost: { credits: 4, material: 2, energy: 0 },
    upkeep: 1,
    color: '#58a6ff',
    icon: '●',
    desc: 'Универсальный боец ближнего боя.',
    ability: {
      id: 'volley',
      name: 'Залп',
      desc: '+2 урона по цели.',
      cooldown: 1,
    },
  },
  heavy: {
    id: 'heavy',
    name: 'Тяжёлые',
    hp: 22, attack: 5, range: 1, move: 1,
    cost: { credits: 8, material: 6, energy: 1 },
    upkeep: 2,
    color: '#a371f7',
    icon: '■',
    desc: 'Танки. Игнорируют 2 урона при попадании.',
    ability: {
      id: 'shield',
      name: 'Щит',
      desc: '+4 HP и -1 урон следующей атаки по нему.',
      cooldown: 2,
    },
    damageReduction: 2,
  },
  scout: {
    id: 'scout',
    name: 'Разведка',
    hp: 8, attack: 2, range: 3, move: 4,
    cost: { credits: 3, material: 1, energy: 1 },
    upkeep: 1,
    color: '#3fb950',
    icon: '▲',
    desc: 'Быстрая, бьёт с дистанции.',
    ability: {
      id: 'dash',
      name: 'Рывок',
      desc: '+3 движения в этот ход.',
      cooldown: 2,
    },
  },
  drone: {
    id: 'drone',
    name: 'Дрон',
    hp: 10, attack: 4, range: 2, move: 3,
    cost: { credits: 6, material: 2, energy: 3 },
    upkeep: 2,
    color: '#d29922',
    icon: '✦',
    desc: 'Летает, игнорирует препятствия.',
    ability: {
      id: 'burst',
      name: 'Залп',
      desc: 'Бьёт по цели дважды.',
      cooldown: 2,
    },
    flying: true,
  },
};

export function getUnitType(id) {
  return UNIT_TYPES[id] || null;
}