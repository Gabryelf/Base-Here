// Синергии: определённые наборы построек дают бонусы к доходу/обороне.
// Каждая синергия проверяется по списку построек, присутствующих на локации.
export const SYNERGIES = [
    {
      id: 'industrial_hub',
      name: 'Промышленный кластер',
      requires: ['factory', 'mine'],
      desc: '+2🔩 ко всей локации',
      effect: { yield: { credits: 0, material: 2, energy: 0 }, defense: 0 },
    },
    {
      id: 'power_grid',
      name: 'Энергосеть',
      requires: ['solar_plant', 'fusion_reactor'],
      desc: '+3⚡ ко всей локации',
      effect: { yield: { credits: 0, material: 0, energy: 3 }, defense: 0 },
    },
    {
      id: 'urban_complex',
      name: 'Городской комплекс',
      requires: ['arcology', 'data_hub'],
      desc: '+3💰 ко всей локации',
      effect: { yield: { credits: 3, material: 0, energy: 0 }, defense: 0 },
    },
    {
      id: 'fortress',
      name: 'Крепость',
      requires: ['barracks', 'bunker', 'shield_array'],
      desc: '+5🛡 к обороне',
      effect: { yield: { credits: 0, material: 0, energy: 0 }, defense: 5 },
    },
    {
      id: 'self_sufficient',
      name: 'Самодостаточность',
      requires: ['factory', 'solar_plant', 'housing'],
      desc: '+1💰 / +1🔩 / +1⚡',
      effect: { yield: { credits: 1, material: 1, energy: 1 }, defense: 0 },
    },
  ];
  
  // Возвращает список активных синергий для набора построек.
  export function activeSynergies(buildingIds) {
    const set = new Set(buildingIds);
    return SYNERGIES.filter((s) => s.requires.every((id) => set.has(id)));
  }