// Базовый интерфейс режима. Все режимы должны его реализовать.
export class Mode {
    constructor(ctx) {
      this.ctx = ctx; // { bus, state, screen, camera, input }
      this.active = false;
    }
  
    // Вызывается при входе в режим
    onEnter() {}
    // Вызывается при выходе
    onExit() {}
    // Логика кадра
    update(_dt) {}
    // Отрисовка кадра (canvas 2D уже очищен и камера применена)
    render(_dt) {}
    // Обработка игровых команд (клики/тапы уже преобразованы в мировые координаты)
    onPointerDown(_worldPos, _screenPos) {}
    onPointerUp(_worldPos, _screenPos) {}
    onPointerMove(_worldPos, _screenPos) {}
  }