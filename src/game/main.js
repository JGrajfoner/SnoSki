import {
    Camera,
    Entity,
    Material,
    Model,
    Primitive,
    Sampler,
    Texture,
    Transform,
} from 'engine/core/core.js';

import { UnlitRenderer } from 'engine/renderers/UnlitRenderer.js';
import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';
import { ParticleSystem } from 'engine/systems/ParticleSystem.js';
import { loadResources } from 'engine/loaders/resources.js';
import { SkierController } from 'engine/controllers/SkierController.js';

import { GameState } from './GameState.js';
import { checkTreeCollisions, checkGateCollisions } from './CollisionDetection.js';

//
// 1) NALOŽIMO MESH IN SNEŽNO TEKSTURO
//
const resources = await loadResources({
    cubeMesh: new URL('../models/cube/cube.json', import.meta.url),
    snowTex:  new URL('../models/snow/Snow010A_2K-JPG_Color.jpg', import.meta.url),
});

// enotni sampler + tekstura (sneg) za vse objekte
const snowTexture = new Texture({
    image: resources.snowTex,
    sampler: new Sampler({
        magFilter: 'linear',
        minFilter: 'linear',
    }),
});

// helper: primitive z barvnim faktorjem (barva * tekstura)
function createColoredPrimitive(r, g, b, a = 1) {
    return new Primitive({
        mesh: resources.cubeMesh,
        material: new Material({
            baseTexture: snowTexture,
            baseFactor: [r, g, b, a],
        }),
    });
}

//
// 2) ENTITETE – SVET
//

// Calculate course length based on gates
const gateCount = 14;
const firstGateZ = -40;
const gateStepZ = -32;
const lastGateZ = firstGateZ + (gateCount - 1) * gateStepZ;
const finishZ = lastGateZ - 50;
const courseLength = Math.abs(finishZ) + 20; // extra buffer

// 2.1. Smučarska proga: zelo široka in dolga "ploskev"
const slope = new Entity();
slope.addComponent(new Transform({
    translation: [0, -1.5, finishZ / 2],
    // X = širina, Y = debelina, Z = dolžina
    scale: [60, 0.2, courseLength],
}));
slope.addComponent(new Model({
    primitives: [createColoredPrimitive(1.0, 1.0, 1.0, 1)],
}));

// 2.2. Drevesa ob robu proge
function createTree(x, z, height = 4) {
    const tree = new Entity();
    tree.addComponent(new Transform({
        translation: [x, -0.5, z],
        scale: [0.9, height, 0.9],
    }));
    tree.addComponent(new Model({
        // rahlo zelenkast ton
        primitives: [createColoredPrimitive(0.2, 0.6, 0.2, 1)],
    }));
    return tree;
}

// Naključno razmetana drevesa z večjo variabilnostjo
const trees = [];
{
    let z = -20;
    while (z > finishZ - 30) { // Generate trees until just before finish
        // Naključna razdalja med drevesi (10-20 enot)
        const spacing = 10 + Math.random() * 10;
        z -= spacing;

        // Naključno levo/desno
        const side = Math.random() < 0.5 ? -1 : 1;

        // Večja variabilnost v X poziciji: 15-28 enot od centra
        const xBase = 15 + Math.random() * 13;
        const x = side * xBase;

        // Naključna višina med 2.5 in 7
        const height = 2.5 + Math.random() * 4.5;

        trees.push(createTree(x, z, height));
    }
}

// 2.3. Vratca – par palic iste barve (rdeča ali modra)
function createGatePair(zPos, centerX, isRedGate) {
    const gateHalfWidth  = 1.8;   // polovica razmika med količkoma
    const poleHeight     = 2.2;
    const poleThickness  = 0.12;

    const red  = [1.0, 0.1, 0.1, 1];
    const blue = [0.1, 0.3, 1.0, 1];

    // če je isRedGate = true → OBEDVI palici rdeči
    // če je isRedGate = false → OBEDVI palici modri
    const color = isRedGate ? red : blue;

    const leftGate = new Entity();
    leftGate.addComponent(new Transform({
        translation: [centerX - gateHalfWidth, -0.4, zPos],
        scale:       [poleThickness, poleHeight, poleThickness],
    }));
    leftGate.addComponent(new Model({
        primitives: [createColoredPrimitive(...color)],
    }));

    const rightGate = new Entity();
    rightGate.addComponent(new Transform({
        translation: [centerX + gateHalfWidth, -0.4, zPos],
        scale:       [poleThickness, poleHeight, poleThickness],
    }));
    rightGate.addComponent(new Model({
        primitives: [createColoredPrimitive(...color)],
    }));

    return { leftGate, rightGate, z: zPos, centerX, halfWidth: gateHalfWidth, isRedGate, passed: false };
}

// Naredimo več vratc po progi: rdeča, modra, rdeča, modra ...
const gatePairs = [];
{
    for (let i = 0; i < gateCount; i++) {
        const z = firstGateZ + i * gateStepZ; // gateStepZ je negativen
        const centerX = Math.sin(i * 0.55) * 10; // gladko vijuganje
        const isRedGate = (i % 2 === 0); // izmenično rdeča / modra
        const gatePair = createGatePair(z, centerX, isRedGate);
        gatePairs.push(gatePair);
    }
}

// Plosko polje vseh entitet vratc (levi + desni) za render in collision
const gateEntities = gatePairs.flatMap(g => [g.leftGate, g.rightGate]);

// 2.4. Ciljna črta (finish line)
const finishLine = new Entity();
finishLine.addComponent(new Transform({
    translation: [0, -0.4, finishZ],
    scale: [30, 0.5, 0.8], // široka črta
}));
finishLine.addComponent(new Model({
    primitives: [createColoredPrimitive(1.0, 0.8, 0.0, 1)], // zlata/rumena barva
}));

// 2.5. Smučar – zdaj z kontrolerjem za premikanje!
const skier = new Entity();
skier.addComponent(new Transform({
    translation: [0, 0.2, 8],
    scale: [0.7, 1.3, 0.7],
}));
skier.addComponent(new Model({
    primitives: [createColoredPrimitive(1.0, 0.9, 0.3, 1)], // rumenkast
}));

// Dodaj particle system za snežni pršec
const particleSystem = new ParticleSystem({
    maxParticles: 150,
    emissionRate: 30,       // začetna hitrost emisije (dinamično se spreminja)
    particleLifetime: 0.8,
    particleSize: 0.2,
    particleColor: [0.95, 0.95, 1.0, 0.7], // belo-modrinkast sneg
    spawnOffset: [0, -0.5, 0.3], // za smučarjem
    velocityRange: {
        x: [-3, 3],
        y: [0.2, 1.5],
        z: [1, 4]  // proti nazaj
    },
});
particleSystem.setMesh(resources.cubeMesh);
particleSystem.setTexture(snowTexture);
skier.addComponent(particleSystem);

// 2.5. Kamera – pogled od zgoraj, malo poševno
const cameraEntity = new Entity();

const cameraAngle = -0.4; // radiani; negativen = gleda navzdol
const half = cameraAngle / 2;
const cameraRotation = [
    Math.sin(half),  // x
    0,               // y
    0,               // z
    Math.cos(half),  // w
];

cameraEntity.addComponent(new Transform({
    translation: [0, 22, 40],   // višina in razdalja
    rotation: cameraRotation,
}));

cameraEntity.addComponent(new Camera({
    aspect: 1,   // v resize() nastavimo pravo razmerje
    fovy:   0.9,
    near:   0.1,
    far:    400.0,
}));

//
// 3) SCENA – seznam entitet
//
let scene = [
    slope,
    skier,
    ...trees,
    ...gateEntities,
    finishLine,
    cameraEntity,
];

// Function to get full scene including particle entities
function getFullScene() {
    return [...scene, ...particleSystem.getParticleEntities()];
}

//
// 4) RENDERER + SISTEMI + GAME STATE
//
const canvas = document.querySelector('canvas');
const renderer = new UnlitRenderer(canvas);
await renderer.initialize();

// Ustvari game state manager
const gameState = new GameState();

// Dodaj kontroler za premikanje smučarja z novimi fizikalnimi parametri
const skierController = new SkierController(skier, canvas, {
    maxSpeed: 25,           // maksimalna hitrost
    minSpeed: 8,            // začetna/minimalna hitrost
    acceleration: 8,        // pospeševanje
    deceleration: 12,       // zaviranje pri zavijanju
    lateralSpeed: 12,       // hitrost levo/desno
    maxX: 25,               // meja za rob proge
    turnRotationSpeed: 3.5, // hitrost rotacije
    tiltAmount: 0.35,       // nagib pri zavijanju
});
skier.addComponent(skierController);

// Dodaj restart funkcionalnost
document.getElementById('restartButton')?.addEventListener('click', () => {
    gameState.reset();
    
    // Reset skier position
    const skierTransform = skier.getComponentOfType(Transform);
    if (skierTransform) {
        skierTransform.translation = [0, 0.2, 8];
    }
    
    // Reset skier physics
    skierController.reset();
    
    // Clear particles
    particleSystem.clear();
    particleSystem.setEnabled(true);
    
    // Reset all gate passed flags
    for (const pair of gatePairs) {
        pair.passed = false;
    }
});

function update(t, dt) {
    // Preveri če igra še teče
    if (!gameState.isPlaying()) {
        // Disable particles when game over
        particleSystem.setEnabled(false);
        return; // Če je game over, ne posodabljaj več
    }
    
    const skierTransform = skier.getComponentOfType(Transform);
    
    // Update particle system BEFORE other components
    if (skierTransform) {
        // Dynamic emission rate based on speed and lateral input
        const currentSpeed = skierController.getCurrentSpeed();
        const speedRatio = currentSpeed / skierController.maxSpeed;
        
        // Check if turning
        const isTurning = skierController.keys['KeyA'] || skierController.keys['ArrowLeft'] ||
                         skierController.keys['KeyD'] || skierController.keys['ArrowRight'];
        
        // More particles when going fast or turning
        const baseRate = 20 + speedRatio * 40; // 20-60 particles/sec based on speed
        const turnBonus = isTurning ? 30 : 0;  // Extra 30 particles/sec when turning
        particleSystem.emissionRate = baseRate + turnBonus;
        
        // Update particle system
        particleSystem.update(t, dt, skierTransform);
    }
    
    // Univerzalni update za vse komponente, ki definirajo update()
    for (const entity of scene) {
        for (const component of entity.components) {
            component.update?.(t, dt);
        }
    }
    
    if (skierTransform) {
        // Posodobi game state (razdalja in hitrost)
        const currentSpeed = skierController.getCurrentSpeed();
        gameState.update(skierTransform.translation[2], currentSpeed);
        
        // Preveri trčenje z drevesi
        const hitTree = checkTreeCollisions(skier, trees);
        if (hitTree) {
            gameState.gameOver('tree');
            console.log('💥 Hit a tree!');
            return;
        }
        
        // Preveri trčenje z vratci
        const hitGate = checkGateCollisions(skier, gateEntities);
        if (hitGate) {
            gameState.gameOver('gate');
            console.log('💥 Hit a gate pole!');
            return;
        }
        
        // Preveri, če smo pravkar prešli katera še neobdelana vratca
        for (const pair of gatePairs) {
            if (pair.passed) continue;
            // Ko smučarjev Z gre za z vratc (z je negativen, skierZ bo manjši ali enak)
            if (skierTransform.translation[2] <= pair.z) {
                pair.passed = true; // obdelaj samo enkrat
                const x = skierTransform.translation[0];
                const withinGate = (x >= pair.centerX - pair.halfWidth) && (x <= pair.centerX + pair.halfWidth);
                if (withinGate) {
                    gameState.gatePassed();
                } else {
                    // Zgrešil vratca
                    gameState.gameOver('miss-gate');
                    console.log('❌ Missed a gate!');
                    return;
                }
            }
        }
        
        // Preveri, če je smučar prečkal ciljno črto
        if (skierTransform.translation[2] <= finishZ) {
            gameState.gameOver('finish');
            console.log('🏁 Finished the course!');
            return;
        }
    }

    // Kamera sledi smučarju
    const cameraTransform = cameraEntity.getComponentOfType(Transform);
    
    if (skierTransform && cameraTransform) {
        // Kamera sledi X poziciji smučarja (levo/desno)
        cameraTransform.translation[0] = skierTransform.translation[0];
        
        // Kamera sledi Z poziciji smučarja z offsetom (ostane za njim)
        cameraTransform.translation[2] = skierTransform.translation[2] + 32;
    }
}

function render() {
    renderer.render(getFullScene(), cameraEntity);
}

function resize({ displaySize: { width, height } }) {
    const cam = cameraEntity.getComponentOfType(Camera);
    cam.aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();
