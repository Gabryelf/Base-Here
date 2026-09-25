// Синергии. Часть открывается сразу, часть — только при постройке (hidden: true).
// Показываем игроку намёки (hint) и прогресс.
export const SYNERGIES = [
  {
    id: 'industrial_hub',
    name: 'Промышленный кластер',
    requires: ['factory', 'mine'],
    desc: '+2🔩 ко всей локации',
    effect: { yield: { credits: 0, material: 2, energy: 0 }, defense: 0 },
    hint: 'Две промышленные постройки на одной локации дают бонус.',
  },
  {
    id: 'power_grid',
    name: 'Энергосеть',
    requires: ['solar_plant', 'fusion_reactor'],
    desc: '+3⚡',
    effect: { yield: { credits: 0, material: 0, energy: 3 }, defense: 0 },
    hint: 'Разные источники энергии дружат.',
  },
  {
    id: 'urban_complex',
    name: 'Городской комплекс',
    requires: ['arcology', 'data_hub'],
    desc: '+3💰',
    effect: { yield: { credits: 3, material: 0, energy: 0 }, defense: 0 },
    hint: 'Развитая инфраструктура притягивает людей.',
  },
  {
    id: 'fortress',
    name: 'Крепость',
    requires: ['barracks', 'bunker', 'shield_array'],
    desc: '+5🛡',
    effect: { yield: { credits: 0, material: 0, energy: 0 }, defense: 5 },
    hint: 'Три уровня обороны — сильнее, чем сумма частей.',
  },
  {
    id: 'self_sufficient',
    name: 'Самодостаточность',
    requires: ['factory', 'solar_plant', 'housing'],
    desc: '+1💰 / +1🔩 / +1⚡',
    effect: { yield: { credits: 1, material: 1, energy: 1 }, defense: 0 },
    hint: 'Производство + энергия + жильё = жизнь.',
  },
  // Скрытые синергии — открываются только после постройки
  {
    id: 'cyber_core',
    name: 'Кибер-ядро',
    hidden: true,
    requires: ['data_hub', 'fusion_reactor', 'shield_array'],
    desc: '+5💰, +5⚡, +3🛡',
    effect: { yield: { credits: 5, material: 0, energy: 5 }, defense: 3 },
    hint: 'Технологии будущего требуют энергии, разума и щита.',
  },
  {
    id: 'war_machine',
    name: 'Военная машина',
    hidden: true,
    requires: ['barracks', 'factory', 'bunker'],
    desc: '+4🔩, +3🛡',
    effect: { yield: { credits: 0, material: 4, energy: 0 }, defense: 3 },
    hint: 'Оружие куётся в цехах.',
  },
];

export function activeSynergies(buildingIds) {
  const set = new Set(buildingIds);
  return SYNERGIES.filter((s) => s.requires.every((id) => set.has(id)));
}

// Возвращает синергии, до которых игроку осталось 1 постройка — для подсказок.
export function nearlyActiveSynergies(buildingIds) {
  const set = new Set(buildingIds);
  const result = [];
  for (const s of SYNERGIES) {
    const missing = s.requires.filter((r) => !set.has(r));
    if (missing.length === 1) result.push({ synergy: s, missing: missing[0] });
  }
  return result;
}