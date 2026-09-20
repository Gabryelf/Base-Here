// Единое дерево состояния игры. На этом этапе — минимально.
export class GameState {
    constructor() {
      this.turn = 1;
      this.mode = 'strategy';
  
      // Стратегический слой (заглушка)
      this.strategy = {
        hexSize: 48,
        gridRadius: 12,
        tiles: new Map(), // key: "q,r" -> tile
        selected: null,
      };
  
      // Тактический слой (заглушка на будущее)
      this.tactical = {
        active: false,
        locationId: null,
      };
  
      // Строительный слой (заглушка на будущее)
      this.build = {
        active: false,
        locationId: null,
      };
    }
  }