export class Light {
    constructor(options = {}) {
        this.position = options.position || [10, 10, 10];
        this.color = options.color || [1, 1, 1];
        this.intensity = options.intensity ?? 1.0;
        this.ambientStrength = options.ambientStrength ?? 0.3;
        this.direction = options.direction || [0, -0.3, -1]; // Smer spotlight cone
        this.spotAngle = options.spotAngle ?? 0.5; // Kot spotlight (radianov)
    }
}
