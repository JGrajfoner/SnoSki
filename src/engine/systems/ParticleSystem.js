import { Transform, Entity, Model, Primitive, Material } from 'engine/core/core.js';

/**
 * Individual particle data
 */
class Particle {
    constructor(position, velocity, lifetime, size, color) {
        this.position = [...position];     // [x, y, z]
        this.velocity = [...velocity];     // [vx, vy, vz]
        this.lifetime = lifetime;          // seconds
        this.age = 0;                      // seconds
        this.size = size;                  // scale
        this.initialSize = size;
        this.color = [...color];           // [r, g, b, a]
        this.initialAlpha = color[3];
        this.active = true;
    }
    
    update(t, dt, parentTransform) {
        if (!this.enabled || !parentTransform) return;
        if (!this.active) return;
        
        this.age += dt;
        
        // Update position based on velocity
        this.position[0] += this.velocity[0] * dt;
        this.position[1] += this.velocity[1] * dt;
        this.position[2] += this.velocity[2] * dt;
        
        // Apply gravity
        this.velocity[1] -= 9.8 * dt;
        
        // Apply air resistance
        const drag = 0.98;
        this.velocity[0] *= drag;
        this.velocity[1] *= drag;
        this.velocity[2] *= drag;
        
        // Fade out over lifetime
        const lifeRatio = this.age / this.lifetime;
        this.color[3] = this.initialAlpha * (1 - lifeRatio);
        this.size = this.initialSize * (1 - lifeRatio * 0.5);
        
        // Deactivate when lifetime expires
        if (this.age >= this.lifetime) {
            this.active = false;
        }
    }
}

/**
 * ParticleSystem component for entity-based particle effects
 */
export class ParticleSystem {
    constructor({
        maxParticles = 100,
        emissionRate = 20,      // particles per second
        particleLifetime = 1.0, // seconds
        particleSize = 0.15,
        particleColor = [1, 1, 1, 0.8],
        spawnOffset = [0, 0, 0],
        velocityRange = {
            x: [-2, 2],
            y: [0.5, 2],
            z: [-2, 2]
        },
        mesh = null,
        texture = null,
    } = {}) {
        this.maxParticles = maxParticles;
        this.emissionRate = emissionRate;
        this.particleLifetime = particleLifetime;
        this.particleSize = particleSize;
        this.particleColor = particleColor;
        this.spawnOffset = spawnOffset;
        this.velocityRange = velocityRange;
        
        this.particles = [];
        this.particleEntities = [];
        this.emissionAccumulator = 0;
        this.enabled = true;
        
        this.mesh = mesh;
        this.texture = texture;
    }
    
    setMesh(mesh) {
        this.mesh = mesh;
    }
    
    setTexture(texture) {
        this.texture = texture;
    }
    
    emit(parentTransform, count = 1) {
        if (!this.mesh || !parentTransform) return; 
        
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const particle = this.createParticle(parentTransform);
            this.particles.push(particle);
            
            // Create entity for this particle
            const entity = this.createParticleEntity(particle);
            this.particleEntities.push(entity);
        }
    }
    
    createParticle(parentTransform) {
        const parentPos = parentTransform.translation;
        
        // Random position offset
        const position = [
            parentPos[0] + this.spawnOffset[0] + (Math.random() - 0.5) * 0.5,
            parentPos[1] + this.spawnOffset[1],
            parentPos[2] + this.spawnOffset[2] + (Math.random() - 0.5) * 0.5,
        ];
        
        // Random velocity
        const velocity = [
            this.velocityRange.x[0] + Math.random() * (this.velocityRange.x[1] - this.velocityRange.x[0]),
            this.velocityRange.y[0] + Math.random() * (this.velocityRange.y[1] - this.velocityRange.y[0]),
            this.velocityRange.z[0] + Math.random() * (this.velocityRange.z[1] - this.velocityRange.z[0]),
        ];
        
        // Random lifetime variation
        const lifetime = this.particleLifetime * (0.8 + Math.random() * 0.4);
        
        // Random size variation
        const size = this.particleSize * (0.7 + Math.random() * 0.6);
        
        return new Particle(position, velocity, lifetime, size, [...this.particleColor]);
    }
    
    createParticleEntity(particle) {
        const entity = new Entity();
        
        entity.addComponent(new Transform({
            translation: particle.position,
            scale: [particle.size, particle.size, particle.size],
        }));
        
        entity.addComponent(new Model({
            primitives: [new Primitive({
                mesh: this.mesh,
                material: new Material({
                    baseTexture: this.texture,
                    baseFactor: particle.color,
                }),
            })],
        }));
        
        return entity;
    }
    
    update(t, dt, parentTransform) {
        if (!this.enabled) return;
        
        // Emit new particles based on emission rate
        this.emissionAccumulator += dt;
        const particlesToEmit = Math.floor(this.emissionAccumulator * this.emissionRate);
        if (particlesToEmit > 0) {
            this.emit(parentTransform, particlesToEmit);
            this.emissionAccumulator -= particlesToEmit / this.emissionRate;
        }
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(dt);
            
            if (particle.active) {
                // Update entity transform and material
                const entity = this.particleEntities[i];
                const transform = entity.getComponentOfType(Transform);
                const model = entity.getComponentOfType(Model);
                
                if (transform) {
                    transform.translation = particle.position;
                    transform.scale = [particle.size, particle.size, particle.size];
                }
                
                if (model && model.primitives[0]) {
                    model.primitives[0].material.baseFactor = particle.color;
                }
            } else {
                // Remove dead particles
                this.particles.splice(i, 1);
                this.particleEntities.splice(i, 1);
            }
        }
    }
    
    getParticleEntities() {
        return this.particleEntities;
    }
    
    clear() {
        this.particles = [];
        this.particleEntities = [];
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
