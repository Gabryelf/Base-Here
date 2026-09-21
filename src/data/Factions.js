// Определения фракций. Пока — только цвет + имя.
export const FACTION_PLAYER = 'player';
export const FACTION_NEUTRAL = 'neutral';
export const FACTION_HEGEMON = 'hegemon';
export const FACTION_CORP_A = 'corp_a';
export const FACTION_CORP_B = 'corp_b';

export const FACTIONS = {
  [FACTION_PLAYER]:  { id: FACTION_PLAYER,  name: 'Ваша фракция', color: '#58a6ff' },
  [FACTION_NEUTRAL]: { id: FACTION_NEUTRAL, name: 'Нейтралы',     color: '#6e7681' },
  [FACTION_HEGEMON]: { id: FACTION_HEGEMON, name: 'Гегемон',      color: '#f85149' },
  [FACTION_CORP_A]:  { id: FACTION_CORP_A,  name: 'Корпорация A', color: '#3fb950' },
  [FACTION_CORP_B]:  { id: FACTION_CORP_B,  name: 'Корпорация B', color: '#d29922' },
};

export function getFaction(id) {
  return FACTIONS[id] || FACTIONS[FACTION_NEUTRAL];
}

// Все фракции-ИИ (всё, кроме игрока и нейтрала)
export const AI_FACTIONS = [FACTION_HEGEMON, FACTION_CORP_A, FACTION_CORP_B];