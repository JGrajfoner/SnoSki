export class UpdateSystem {

    constructor(application) {
        this._loop = this._loop.bind(this);

        this.application = application;
        this.running = false;
    }

    start() {
        if (this.running) return;

        this.application.start?.();

        this._time = performance.now() / 1000;
        this.running = true;
        this._frameId = requestAnimationFrame(this._loop);
    }

    stop() {
        if (!this.running) return;

        this.application.stop?.();
        this.running = false;
        cancelAnimationFrame(this._frameId);
        this._frameId = null;
    }

    _loop() {
        if (!this.running) return;

        const time = performance.now() / 1000;
        let dt = time - this._time;
        this._time = time;

        // Clamp dt to avoid huge jumps after tab switching or debugging pause
        const MAX_DT = 0.05; // 50 ms
        if (dt > MAX_DT) dt = MAX_DT;

        this.application.update?.(time, dt);
        this.application.render?.();

        this._frameId = requestAnimationFrame(this._loop);
    }

}
