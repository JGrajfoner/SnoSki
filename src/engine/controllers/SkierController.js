import { Transform } from 'engine/core/core.js';

export class SkierController {
    constructor(entity, domElement, {
        forwardSpeed = 15,        // hitrost navzdol po progi
        lateralSpeed = 8,         // hitrost levo/desno
        maxX = 25,                // meja na levi in desni strani proge
    } = {}) {
        this.entity = entity;
        this.domElement = domElement;
        
        this.forwardSpeed = forwardSpeed;
        this.lateralSpeed = lateralSpeed;
        this.maxX = maxX;
        
        this.keys = {};
        
        this.initHandlers();
    }
    
    initHandlers() {
        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);
        
        const doc = this.domElement.ownerDocument;
        doc.addEventListener('keydown', this.keydownHandler);
        doc.addEventListener('keyup', this.keyupHandler);
    }
    
    update(t, dt) {
        const transform = this.entity.getComponentOfType(Transform);
        if (!transform) {
            return;
        }
        
        // Gibanje levo/desno
        let lateralMovement = 0;
        
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            lateralMovement -= 1;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            lateralMovement += 1;
        }
        
        // Posodobi X pozicijo (levo/desno)
        transform.translation[0] += lateralMovement * this.lateralSpeed * dt;
        
        // Omejitev na progi (ne sme iti preveč na rob)
        transform.translation[0] = Math.max(-this.maxX, Math.min(this.maxX, transform.translation[0]));
        
        // Avtomatično gibanje naprej (navzdol po progi, negativna Z smer)
        transform.translation[2] -= this.forwardSpeed * dt;
    }
    
    keydownHandler(e) {
        this.keys[e.code] = true;
    }
    
    keyupHandler(e) {
        this.keys[e.code] = false;
    }
    
    // Cleanup method (opcijsko)
    destroy() {
        const doc = this.domElement.ownerDocument;
        doc.removeEventListener('keydown', this.keydownHandler);
        doc.removeEventListener('keyup', this.keyupHandler);
    }
}
