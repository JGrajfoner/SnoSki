import { mat4 } from 'glm';

import * as WebGPU from '../WebGPU.js';

import { Camera, Model } from '../core/core.js';

import {
    getLocalModelMatrix,
    getGlobalModelMatrix,
    getGlobalViewMatrix,
    getProjectionMatrix,
} from '../core/SceneUtils.js';

import { BaseRenderer } from './BaseRenderer.js';

const vertexBufferLayout = {
    arrayStride: 32,
    attributes: [
        {
            name: 'position',
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3',
        },
        {
            name: 'texcoords',
            shaderLocation: 1,
            offset: 12,
            format: 'float32x2',
        },
        {
            name: 'normal',
            shaderLocation: 2,
            offset: 20,
            format: 'float32x3',
        },
    ],
};

export class LitRenderer extends BaseRenderer {

    constructor(canvas) {
        super(canvas);
        this.lights = [];
    }

    addLight(light) {
        this.lights.push(light);
    }

    async initialize() {
        await super.initialize();

        const code = await fetch(new URL('LitRenderer.wgsl', import.meta.url))
            .then(response => response.text());
        const module = this.device.createShaderModule({ code });

        this.pipeline = await this.device.createRenderPipelineAsync({
            layout: 'auto',
            vertex: {
                module,
                buffers: [ vertexBufferLayout ],
            },
            fragment: {
                module,
                targets: [{
                    format: this.format,
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        }
                    }
                }],
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },
        });

        this.recreateDepthTexture();
    }

    recreateDepthTexture() {
        this.depthTexture?.destroy();
        this.depthTexture = this.device.createTexture({
            format: 'depth24plus',
            size: [this.canvas.width, this.canvas.height],
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    prepareEntity(entity) {
        if (this.gpuObjects.has(entity)) {
            return this.gpuObjects.get(entity);
        }

        const modelUniformBuffer = this.device.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const modelBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                { binding: 0, resource: modelUniformBuffer },
            ],
        });

        const gpuObjects = { modelUniformBuffer, modelBindGroup };
        this.gpuObjects.set(entity, gpuObjects);
        return gpuObjects;
    }

    prepareCamera(camera, cameraPos) {
        if (this.gpuObjects.has(camera)) {
            return this.gpuObjects.get(camera);
        }

        const cameraUniformBuffer = this.device.createBuffer({
            size: 144, // mat4x4 (64) + mat4x4 (64) + vec3f (12) + padding (4)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const cameraBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: cameraUniformBuffer },
            ],
        });

        const gpuObjects = { cameraUniformBuffer, cameraBindGroup };
        this.gpuObjects.set(camera, gpuObjects);
        return gpuObjects;
    }

    prepareTexture(texture) {
        if (this.gpuObjects.has(texture)) {
            return this.gpuObjects.get(texture);
        }

        const { gpuTexture } = this.prepareImage(texture.image, texture.isSRGB);
        const { gpuSampler } = this.prepareSampler(texture.sampler);

        const gpuObjects = { gpuTexture, gpuSampler };
        this.gpuObjects.set(texture, gpuObjects);
        return gpuObjects;
    }

    prepareMaterial(material) {
        if (this.gpuObjects.has(material)) {
            return this.gpuObjects.get(material);
        }

        const baseTexture = this.prepareTexture(material.baseTexture);

        const materialUniformBuffer = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const materialBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                { binding: 0, resource: materialUniformBuffer },
                { binding: 1, resource: baseTexture.gpuTexture },
                { binding: 2, resource: baseTexture.gpuSampler },
            ],
        });

        const gpuObjects = { materialUniformBuffer, materialBindGroup };
        this.gpuObjects.set(material, gpuObjects);
        return gpuObjects;
    }

    prepareLight(light) {
        if (this.gpuObjects.has(light)) {
            return this.gpuObjects.get(light);
        }

        const lightUniformBuffer = this.device.createBuffer({
            size: 64, // vec3f (12) + f32 (4) + vec3f (12) + f32 (4) + vec3f (12) + f32 (4)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const lightBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(3),
            entries: [
                { binding: 0, resource: lightUniformBuffer },
            ],
        });

        const gpuObjects = { lightUniformBuffer, lightBindGroup };
        this.gpuObjects.set(light, gpuObjects);
        return gpuObjects;
    }

    render(entities, camera, cameraPos) {
        if (this.depthTexture.width !== this.canvas.width || this.depthTexture.height !== this.canvas.height) {
            this.recreateDepthTexture();
        }

        const encoder = this.device.createCommandEncoder();
        this.renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture(),
                    clearValue: [0.1, 0.12, 0.2, 1.0], // Temna noč
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
            depthStencilAttachment: {
                view: this.depthTexture,
                depthClearValue: 1,
                depthLoadOp: 'clear',
                depthStoreOp: 'discard',
            },
        });
        this.renderPass.setPipeline(this.pipeline);

        const cameraComponent = camera.getComponentOfType(Camera);
        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);
        const { cameraUniformBuffer, cameraBindGroup } = this.prepareCamera(cameraComponent, cameraPos);
        
        this.device.queue.writeBuffer(cameraUniformBuffer, 0, viewMatrix);
        this.device.queue.writeBuffer(cameraUniformBuffer, 64, projectionMatrix);
        this.device.queue.writeBuffer(cameraUniformBuffer, 128, new Float32Array(cameraPos));
        
        this.renderPass.setBindGroup(0, cameraBindGroup);

        // Pripravi svetlobo
        if (this.lights.length > 0) {
            const light = this.lights[0]; // Zaenkrat samo prva svetloba
            const { lightUniformBuffer, lightBindGroup } = this.prepareLight(light);
            
            // Position (vec3f) at offset 0
            this.device.queue.writeBuffer(lightUniformBuffer, 0, new Float32Array(light.position));
            // Intensity (f32) at offset 12
            this.device.queue.writeBuffer(lightUniformBuffer, 12, new Float32Array([light.intensity]));
            // Color (vec3f) at offset 16
            this.device.queue.writeBuffer(lightUniformBuffer, 16, new Float32Array(light.color));
            // AmbientStrength (f32) at offset 28
            this.device.queue.writeBuffer(lightUniformBuffer, 28, new Float32Array([light.ambientStrength]));
            // Direction (vec3f) at offset 32
            this.device.queue.writeBuffer(lightUniformBuffer, 32, new Float32Array(light.direction || [0, -0.3, -1]));
            // SpotAngle (f32) at offset 44
            this.device.queue.writeBuffer(lightUniformBuffer, 44, new Float32Array([light.spotAngle || 0.5]));
            
            this.renderPass.setBindGroup(3, lightBindGroup);
        }

        for (const entity of entities) {
            this.renderEntity(entity);
        }

        this.renderPass.end();
        this.device.queue.submit([encoder.finish()]);
    }

    renderEntity(entity) {
        const modelMatrix = getGlobalModelMatrix(entity);
        const normalMatrix = mat4.normalFromMat4(mat4.create(), modelMatrix);

        const { modelUniformBuffer, modelBindGroup } = this.prepareEntity(entity);
        this.device.queue.writeBuffer(modelUniformBuffer, 0, modelMatrix);
        this.device.queue.writeBuffer(modelUniformBuffer, 64, normalMatrix);
        this.renderPass.setBindGroup(1, modelBindGroup);

        for (const model of entity.getComponentsOfType(Model)) {
            this.renderModel(model);
        }
    }

    renderModel(model) {
        for (const primitive of model.primitives) {
            this.renderPrimitive(primitive);
        }
    }

    renderPrimitive(primitive) {
        const { materialUniformBuffer, materialBindGroup } = this.prepareMaterial(primitive.material);
        this.device.queue.writeBuffer(materialUniformBuffer, 0, new Float32Array(primitive.material.baseFactor));

        if (!primitive.material.uvScale) primitive.material.uvScale = [1, 1];

        this.device.queue.writeBuffer(
            materialUniformBuffer,
            16, 
            new Float32Array(primitive.material.uvScale)
        );

        this.renderPass.setBindGroup(2, materialBindGroup);

        const { vertexBuffer, indexBuffer } = this.prepareMesh(primitive.mesh, vertexBufferLayout);
        this.renderPass.setVertexBuffer(0, vertexBuffer);
        this.renderPass.setIndexBuffer(indexBuffer, 'uint32');

        this.renderPass.drawIndexed(primitive.mesh.indices.length);
    }

}
