// Синергии: часть открывается сразу, часть скрыта до постройки (hidden: true).
// Показываем намёки и прогресс игроку.
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
  // === Скрытые синергии ===
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
  // Дополнительные скрытые синергии — влияют на найм и мораль
  {
    id: 'drone_hive',
    name: 'Гнездо дронов',
    hidden: true,
    requires: ['data_hub', 'fusion_reactor'],
    desc: '−20% к стоимости дронов и +10 морали всем юнитам в начале боя.',
    effect: {
      yield: { credits: 0, material: 0, energy: 0 },
      defense: 0,
      recruitDiscount: { drone: 0.2 },
      battleStartMorale: 10,
    },
    hint: 'Разум и энергия рождают крылатых слуг.',
  },
  {
    id: 'war_cadre',
    name: 'Военный костяк',
    hidden: true,
    requires: ['barracks', 'arcology'],
    desc: '−15% к стоимости найма пехоты и +10 HP всем пехотинцам.',
    effect: {
      yield: { credits: 0, material: 0, energy: 0 },
      defense: 0,
      recruitDiscount: { infantry: 0.15 },
      hpBonus: { infantry: 10 },
    },
    hint: 'Города-крепости растят лучших бойцов.',
  },
];

export function activeSynergies(buildingIds) {
  const set = new Set(buildingIds);
  return SYNERGIES.filter((s) => s.requires.every((id) => set.has(id)));
}

// Синергии, до которых осталась 1 постройка — для подсказок в UI.
export function nearlyActiveSynergies(buildingIds) {
  const set = new Set(buildingIds);
  const result = [];
  for (const s of SYNERGIES) {
    const missing = s.requires.filter((r) => !set.has(r));
    if (missing.length === 1) result.push({ synergy: s, missing: missing[0] });
  }
  return result;
}

// Собирает суммарные модификаторы от всех активных синергий локации.
// Удобно для найма и стартов боя.
export function collectSynergyEffects(buildingIds) {
  const effects = {
    recruitDiscount: {},
    hpBonus: {},
    battleStartMorale: 0,
  };
  for (const s of activeSynergies(buildingIds)) {
    const e = s.effect;
    if (e.recruitDiscount) {
      for (const [k, v] of Object.entries(e.recruitDiscount)) {
        effects.recruitDiscount[k] = (effects.recruitDiscount[k] || 0) + v;
      }
    }
    if (e.hpBonus) {
      for (const [k, v] of Object.entries(e.hpBonus)) {
        effects.hpBonus[k] = (effects.hpBonus[k] || 0) + v;
      }
    }
    if (e.battleStartMorale) effects.battleStartMorale += e.battleStartMorale;
  }
  return effects;
}