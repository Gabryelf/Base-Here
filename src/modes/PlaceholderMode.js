import { Mode } from '../core/Mode.js';

// Заглушка для тактического и строительного режимов на этапе 0.
export class PlaceholderMode extends Mode {
  constructor(ctx, label, color) {
    super(ctx);
    this.label = label;
    this.color = color;
  }

  onEnter() {
    this.ctx.state.mode = this.label;
  }

  render() {
    const { screen, camera } = this.ctx;
    const ctx2d = screen.ctx;

    // Рисуем сетку квадратов, чтобы отличать режимы визуально
    ctx2d.save();
    camera.apply(ctx2d);
    ctx2d.lineWidth = 1 / camera.zoom;
    ctx2d.strokeStyle = this.color;

    const step = 64;
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(screen.width, screen.height);
    const startX = Math.floor(Math.min(topLeft.x, bottomRight.x) / step) * step;
    const endX = Math.ceil(Math.max(topLeft.x, bottomRight.x) / step) * step;
    const startY = Math.floor(Math.min(topLeft.y, bottomRight.y) / step) * step;
    const endY = Math.ceil(Math.max(topLeft.y, bottomRight.y) / step) * step;

    ctx2d.beginPath();
    for (let x = startX; x <= endX; x += step) {
      ctx2d.moveTo(x, startY);
      ctx2d.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += step) {
      ctx2d.moveTo(startX, y);
      ctx2d.lineTo(endX, y);
    }
    ctx2d.stroke();
    ctx2d.restore();

    // Текст режима — экранными координатами
    ctx2d.save();
    ctx2d.fillStyle = this.color;
    ctx2d.font = '600 20px system-ui, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText(this.label.toUpperCase(), screen.width / 2, screen.height / 2);
    ctx2d.restore();
  }

  onPointerDown(worldPos) {
    // Пока ничего — точка расширения.
    console.log(`[${this.label}] tap`, worldPos);
  }
}