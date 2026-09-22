// Простейший ИИ защитника: каждый юнит идёт к ближайшему атакующему,
// затем атакует, если дотягивается.
export class BattleAI {
    constructor({ battle }) {
        this.battle = battle;
        this._timers = [];
    }

    runTurn() {
        const battle = this.battle;
        const faction = battle.currentFaction;
        const defenders = battle.grid.unitsOf(faction);
        const enemies = battle.grid.unitsOf(battle.attackerFaction);

        // Асинхронная очередь: по 350 мс на юнита
        let i = 0;
        const step = () => {
            if (battle.finished) return;
            if (i >= defenders.length) {
                // Завершаем ход ИИ
                battle.endTurn();
                return;
            }
            const unit = defenders[i++];
            if (!unit.alive) { step(); return; }
            this._actUnit(unit, enemies);
            this._timers.push(setTimeout(step, 350));
        };
        step();
    }

    _actUnit(unit, enemies) {
        const battle = this.battle;
        // Свежий список живых врагов
        const liveEnemies = battle.grid.unitsOf(battle.attackerFaction);
        if (liveEnemies.length === 0) return;

        // 1) Может ли атаковать кого-то сейчас?
        const inRange = liveEnemies
            .filter((e) => unit.distanceTo(e) <= unit.def.range)
            .sort((a, b) => a.hp - b.hp);
        if (inRange.length > 0) {
            battle.tryAttack(unit, inRange[0]);
            return;
        }

        // 2) Иначе — двигаемся к ближайшему врагу
        const nearest = liveEnemies
            .slice()
            .sort((a, b) => unit.distanceTo(a) - unit.distanceTo(b))[0];
        const reachable = battle.grid.reachableTiles(unit, unit.def.move);

        let best = null;
        let bestDist = Infinity;
        for (const key of reachable.keys()) {
            const [x, y] = key.split(',').map(Number);
            const d = Math.abs(x - nearest.x) + Math.abs(y - nearest.y);
            if (d < bestDist) { bestDist = d; best = { x, y }; }
        }
        if (best) {
            battle.tryMove(unit, best.x, best.y);
        }

        // 3) После движения — попытка атаки, если теперь дотягивается
        const nowInRange = liveEnemies
            .filter((e) => e.alive && unit.distanceTo(e) <= unit.def.range)
            .sort((a, b) => a.hp - b.hp);
        if (nowInRange.length > 0) {
            battle.tryAttack(unit, nowInRange[0]);
        }
    }

    dispose() {
        for (const t of this._timers) clearTimeout(t);
        this._timers = [];
    }
}