import { Transform } from 'engine/core/core.js';
import { quat } from 'glm';

export class SkierController {
    constructor(entity, domElement, {
        maxSpeed = 40,            // maksimalna hitrost (povečana z 25)
        minSpeed = 12,             // minimalna hitrost (povečana z 8)
        acceleration = 15,         // pospeševanje naprej (povečano z 8)
        deceleration = 14,        // zaviranje pri zavijanju (povečano z 12)
        lateralSpeed = 18,        // hitrost levo/desno (povečana z 12)
        maxX = 25,                // meja na levi in desni strani proge
        turnRotationSpeed = 5.5,  // hitrost rotacije pri zavijanju (povečana z 3.5)
        tiltAmount = 0.45,        // nagib smučarja pri zavijanju (povečan z 0.35)
    } = {}) {
        this.entity = entity;
        this.domElement = domElement;
        
        // Physics parameters
        this.maxSpeed = maxSpeed;
        this.minSpeed = minSpeed;
        this.acceleration = acceleration;
        this.deceleration = deceleration;
        this.lateralSpeed = lateralSpeed;
        this.maxX = maxX;
        this.turnRotationSpeed = turnRotationSpeed;
        this.tiltAmount = tiltAmount;
        
        // Current state
        this.currentSpeed = minSpeed; // Start at minimum speed
        this.targetRotationY = 0;     // Target Y rotation (heading)
        this.currentRotationY = 0;    // Current Y rotation
        this.currentTilt = 0;         // Current roll/tilt angle
        
        // Jump state
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.jumpForce = 14;          // Zmanjšana amplituda skoka
        this.gravity = 28;            // Povečana gravitacija
        this.groundY = 0.15;          // Normalna višina nad tlemi
        
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
        
        // === 1. INPUT HANDLING ===
        let lateralInput = 0;
        
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            lateralInput -= 1;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            lateralInput += 1;
        }
        
        // === 2. SPEED DYNAMICS ===
        // Zaviranje pri zavijanju (večji kot = več zaviranja)
        const turnIntensity = Math.abs(lateralInput);
        
        if (turnIntensity > 0.1) {
            // Zavijanje = upočasnitev
            this.currentSpeed = Math.max(
                this.minSpeed,
                this.currentSpeed - this.deceleration * turnIntensity * dt
            );
        } else {
            // Naravnost = pospeševanje
            this.currentSpeed = Math.min(
                this.maxSpeed,
                this.currentSpeed + this.acceleration * dt
            );
        }
        
        // === 3. ROTATION & TILT ===
        // Target rotation based on input
        // Invert sign so positive lateralInput (move right) yields a rightward yaw
        this.targetRotationY = -lateralInput * 0.6; // Max ~35 degrees turn
        
        // Smooth rotation interpolation
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.turnRotationSpeed * dt;
        
        // Target tilt (roll) when turning
        // Match tilt direction with input (lean into the turn)
        const targetTilt = lateralInput * this.tiltAmount;
        this.currentTilt += (targetTilt - this.currentTilt) * 4.0 * dt;
        
        // Apply rotation to transform (Y-axis rotation for heading, X-axis for tilt)
        const rotationQuat = quat.create();
        quat.rotateY(rotationQuat, rotationQuat, this.currentRotationY);
        quat.rotateX(rotationQuat, rotationQuat, this.currentTilt);
        transform.rotation = Array.from(rotationQuat);
        
        // === 4. LATERAL MOVEMENT ===
        // Move sideways based on input and current speed
        const lateralMovement = lateralInput * this.lateralSpeed * dt;
        transform.translation[0] += lateralMovement;
        
        // Clamp to track boundaries
        transform.translation[0] = Math.max(-this.maxX, Math.min(this.maxX, transform.translation[0]));
        
        // === 5. FORWARD MOVEMENT ===
        // Move forward at current speed (negative Z direction)
        transform.translation[2] -= this.currentSpeed * dt;
        
        // === 6. JUMP MECHANICS ===
        // Trigger jump on Space press
        if (this.keys['Space'] && !this.isJumping && transform.translation[1] <= this.groundY + 0.01) {
            this.isJumping = true;
            this.jumpVelocity = this.jumpForce;
        }
        
        // Apply jump physics
        if (this.isJumping || transform.translation[1] > this.groundY) {
            // Apply velocity
            transform.translation[1] += this.jumpVelocity * dt;
            
            // Apply gravity
            this.jumpVelocity -= this.gravity * dt;
            
            // Land on ground
            if (transform.translation[1] <= this.groundY) {
                transform.translation[1] = this.groundY;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }
    }
    
    // Get current speed for external use (e.g., UI display)
    getCurrentSpeed() {
        return this.currentSpeed;
    }
    
    // Reset physics state (useful for game restart)
    reset() {
        this.currentSpeed = this.minSpeed;
        this.targetRotationY = 0;
        this.currentRotationY = 0;
        this.currentTilt = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
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
