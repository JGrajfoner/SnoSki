import { Transform, Entity, Model, Primitive, Material } from 'engine/core/core.js';

/**
 * Lightweight particle system with object pooling.
 * Pre-allocates entities and reuses them to avoid per-frame allocations.
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
    } = {}) {
        this.maxParticles = maxParticles;
        this.emissionRate = emissionRate;
        this.particleLifetime = particleLifetime;
        this.particleSize = particleSize;
        this.particleColor = particleColor.slice();
        this.spawnOffset = spawnOffset;
        this.velocityRange = velocityRange;

        this.mesh = null;
        this.texture = null;

        this.emissionAccumulator = 0;
        this.enabled = true;

        // Pooling structures
        this.particles = new Array(this.maxParticles).fill(null); // particle data objects
        this.particleEntities = new Array(this.maxParticles).fill(null); // pre-created entities
        this.freeIndices = [];
        this.activeList = []; // list of active indices

        for (let i = this.maxParticles - 1; i >= 0; i--) this.freeIndices.push(i);

        this._entitiesCreated = false;
    }

    setMesh(mesh) {
        this.mesh = mesh;
        this._ensureEntities();
    }

    setTexture(texture) {
        this.texture = texture;
        // update existing materials if entities already created
        if (this._entitiesCreated) {
            for (let i = 0; i < this.particleEntities.length; i++) {
                const ent = this.particleEntities[i];
                if (!ent) continue;
                const model = ent.getComponentOfType(Model);
                if (model && model.primitives[0]) {
                    model.primitives[0].material.baseTexture = this.texture;
                }
            }
        }
    }

    _ensureEntities() {
        if (this._entitiesCreated) return;
        if (!this.mesh) return; // need mesh to create entities

        for (let i = 0; i < this.maxParticles; i++) {
            const entity = new Entity();
            entity.addComponent(new Transform({
                translation: [0, -9999, 0],
                scale: [0, 0, 0],
            }));

            const mat = new Material({
                baseTexture: this.texture,
                baseFactor: this.particleColor.slice(),
            });

            entity.addComponent(new Model({
                primitives: [new Primitive({
                    mesh: this.mesh,
                    material: mat,
                })],
            }));

            this.particleEntities[i] = entity;
        }

        this._entitiesCreated = true;
    }

    _createParticleData(parentTransform) {
        const parentPos = parentTransform.translation;

        const position = [
            parentPos[0] + this.spawnOffset[0] + (Math.random() - 0.5) * 0.5,
            parentPos[1] + this.spawnOffset[1],
            parentPos[2] + this.spawnOffset[2] + (Math.random() - 0.5) * 0.5,
        ];

        const velocity = [
            this.velocityRange.x[0] + Math.random() * (this.velocityRange.x[1] - this.velocityRange.x[0]),
            this.velocityRange.y[0] + Math.random() * (this.velocityRange.y[1] - this.velocityRange.y[0]),
            this.velocityRange.z[0] + Math.random() * (this.velocityRange.z[1] - this.velocityRange.z[0]),
        ];

        const lifetime = this.particleLifetime * (0.8 + Math.random() * 0.4);
        const size = this.particleSize * (0.7 + Math.random() * 0.6);

        return {
            position,
            velocity,
            lifetime,
            age: 0,
            size,
            initialSize: size,
            color: this.particleColor.slice(),
            initialAlpha: this.particleColor[3],
            active: true,
        };
    }

    emit(parentTransform, count = 1) {
        if (!this.enabled || !parentTransform) return;
        this._ensureEntities();

        for (let i = 0; i < count && this.freeIndices.length > 0; i++) {
            const idx = this.freeIndices.pop();
            const p = this._createParticleData(parentTransform);
            this.particles[idx] = p;
            this.activeList.push(idx);

            const ent = this.particleEntities[idx];
            if (ent) {
                const tr = ent.getComponentOfType(Transform);
                const model = ent.getComponentOfType(Model);
                if (tr) tr.translation = p.position.slice();
                if (tr) tr.scale = [p.size, p.size, p.size];
                if (model && model.primitives[0]) model.primitives[0].material.baseFactor = p.color.slice();
            }
        }
    }

    update(t, dt, parentTransform) {
        if (!this.enabled) return;
        if (!this._entitiesCreated) return; // nothing to update yet

        // Emit new particles based on emission rate
        this.emissionAccumulator += dt;
        const particlesToEmit = Math.floor(this.emissionAccumulator * this.emissionRate);
        if (particlesToEmit > 0) {
            this.emit(parentTransform, particlesToEmit);
            this.emissionAccumulator -= particlesToEmit / this.emissionRate;
        }

        // Update existing particles (iterate backwards to allow swap-removal)
        for (let i = this.activeList.length - 1; i >= 0; i--) {
            const idx = this.activeList[i];
            const p = this.particles[idx];
            if (!p || !p.active) {
                // shouldn't normally happen, but clean up
                this._deactivateIndexByActiveListPos(i);
                continue;
            }

            // integrate
            p.age += dt;
            p.position[0] += p.velocity[0] * dt;
            p.position[1] += p.velocity[1] * dt;
            p.position[2] += p.velocity[2] * dt;

            // gravity
            p.velocity[1] -= 9.8 * dt;

            // simple drag
            const drag = 0.98;
            p.velocity[0] *= drag;
            p.velocity[1] *= drag;
            p.velocity[2] *= drag;

            const lifeRatio = p.age / p.lifetime;
            p.color[3] = p.initialAlpha * Math.max(0, 1 - lifeRatio);
            p.size = p.initialSize * Math.max(0, 1 - lifeRatio * 0.5);

            // update entity
            const ent = this.particleEntities[idx];
            if (ent) {
                const tr = ent.getComponentOfType(Transform);
                const model = ent.getComponentOfType(Model);
                if (tr) {
                    tr.translation = p.position.slice();
                    tr.scale = [p.size, p.size, p.size];
                }
                if (model && model.primitives[0]) {
                    model.primitives[0].material.baseFactor = p.color.slice();
                }
            }

            if (p.age >= p.lifetime) {
                // deactivate particle: swap-remove from activeList
                this._deactivateIndexByActiveListPos(i);
            }
        }
    }

    _deactivateIndexByActiveListPos(activePos) {
        const idx = this.activeList[activePos];
        // hide entity
        const ent = this.particleEntities[idx];
        if (ent) {
            const tr = ent.getComponentOfType(Transform);
            if (tr) tr.scale = [0, 0, 0];
        }

        // clear particle data
        this.particles[idx] = null;
        // return index to free pool
        this.freeIndices.push(idx);

        // remove from activeList by swapping with last
        const lastPos = this.activeList.length - 1;
        if (activePos !== lastPos) {
            this.activeList[activePos] = this.activeList[lastPos];
        }
        this.activeList.length = lastPos;
    }

    getParticleEntities() {
        // return only active particle entities (references)
        const out = [];
        for (let i = 0; i < this.activeList.length; i++) {
            const idx = this.activeList[i];
            const ent = this.particleEntities[idx];
            if (ent) out.push(ent);
        }
        return out;
    }

    clear() {
        // Reset all pools
        for (let i = 0; i < this.particleEntities.length; i++) {
            const ent = this.particleEntities[i];
            if (ent) {
                const tr = ent.getComponentOfType(Transform);
                if (tr) tr.scale = [0, 0, 0];
            }
            this.particles[i] = null;
        }
        this.freeIndices.length = 0;
        for (let i = this.maxParticles - 1; i >= 0; i--) this.freeIndices.push(i);
        this.activeList.length = 0;
        this.emissionAccumulator = 0;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
