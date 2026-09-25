export const SLOT_TYPES = {
    ENERGY:      'energy',
    INDUSTRIAL:  'industrial',
    RESIDENTIAL: 'residential',
    MILITARY:    'military',
    SPECIAL:     'special',
  };
  
  // Каталог. Поле `hidden` — часть эффекта скрыта до постройки.
  export const BUILDINGS = {
    solar_plant: {
      id: 'solar_plant', name: 'Солнечная станция',
      slot: SLOT_TYPES.ENERGY,
      cost: { credits: 6, material: 4, energy: 0 },
      desc: '+2⚡ к доходу',
      yield: { credits: 0, material: 0, energy: 2 },
      defense: 0,
      // Внутренний вклад в синергии — показываем намёком
      tags: ['power'],
    },
    fusion_reactor: {
      id: 'fusion_reactor', name: 'Термоядерный реактор',
      slot: SLOT_TYPES.ENERGY,
      cost: { credits: 12, material: 10, energy: 4 },
      desc: '+5⚡, +1🛡',
      yield: { credits: 0, material: 0, energy: 5 },
      defense: 1,
      tags: ['power', 'advanced'],
    },
    factory: {
      id: 'factory', name: 'Фабрика',
      slot: SLOT_TYPES.INDUSTRIAL,
      cost: { credits: 10, material: 6, energy: 2 },
      desc: '+3🔩',
      yield: { credits: 0, material: 3, energy: 0 },
      defense: 0,
      tags: ['production'],
    },
    mine: {
      id: 'mine', name: 'Шахта',
      slot: SLOT_TYPES.INDUSTRIAL,
      cost: { credits: 6, material: 2, energy: 1 },
      desc: '+2🔩',
      yield: { credits: 0, material: 2, energy: 0 },
      defense: 0,
      tags: ['production'],
    },
    arcology: {
      id: 'arcology', name: 'Аркология',
      slot: SLOT_TYPES.RESIDENTIAL,
      cost: { credits: 14, material: 8, energy: 3 },
      desc: '+4💰',
      yield: { credits: 4, material: 0, energy: 0 },
      defense: 0,
      tags: ['population'],
    },
    housing: {
      id: 'housing', name: 'Жилой блок',
      slot: SLOT_TYPES.RESIDENTIAL,
      cost: { credits: 5, material: 3, energy: 1 },
      desc: '+2💰',
      yield: { credits: 2, material: 0, energy: 0 },
      defense: 0,
      tags: ['population'],
    },
    barracks: {
      id: 'barracks', name: 'Казармы',
      slot: SLOT_TYPES.MILITARY,
      cost: { credits: 8, material: 6, energy: 2 },
      desc: '+2🛡, ускоряет найм',
      yield: { credits: 0, material: 0, energy: 0 },
      defense: 2,
      tags: ['fort', 'recruitment'],
    },
    bunker: {
      id: 'bunker', name: 'Бункер',
      slot: SLOT_TYPES.MILITARY,
      cost: { credits: 10, material: 10, energy: 3 },
      desc: '+4🛡',
      yield: { credits: 0, material: 0, energy: 0 },
      defense: 4,
      tags: ['fort'],
    },
    data_hub: {
      id: 'data_hub', name: 'Дата-хаб',
      slot: SLOT_TYPES.SPECIAL,
      cost: { credits: 16, material: 4, energy: 6 },
      desc: '+3💰, +1⚡',
      yield: { credits: 3, material: 0, energy: 1 },
      defense: 0,
      tags: ['research', 'advanced'],
    },
    shield_array: {
      id: 'shield_array', name: 'Щитовой массив',
      slot: SLOT_TYPES.SPECIAL,
      cost: { credits: 18, material: 12, energy: 8 },
      desc: '+6🛡',
      yield: { credits: 0, material: 0, energy: 0 },
      defense: 6,
      tags: ['fort', 'advanced'],
    },
  };
  
  export function getBuilding(id) { return BUILDINGS[id] || null; }
  export function buildingsForSlot(slotType) {
    return Object.values(BUILDINGS).filter((b) => b.slot === slotType);
  }