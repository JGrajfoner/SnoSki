export class Skybox {
    constructor({
        texture = null,
        size = 500,
    } = {}) {
        this.texture = texture;
        this.size = size;
    }
}
