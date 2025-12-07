import {
    Camera,
    Entity,
    Material,
    Model,
    Primitive,
    Sampler,
    Skybox,
    Texture,
    Transform,
    Parent,
} from 'engine/core/core.js';

import { UnlitRenderer } from 'engine/renderers/UnlitRenderer.js';
import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';
import { ParticleSystem } from 'engine/systems/ParticleSystem.js';
import { loadResources } from 'engine/loaders/resources.js';
import { SkierController } from 'engine/controllers/SkierController.js';

import { GameState } from './GameState.js';
import { checkTreeCollisions, checkGatePassing, checkObstacleCollisions, checkGateCollision } from './CollisionDetection.js';
import { GLTFLoader } from 'engine/loaders/GLTFLoader.js';
import { quatMultiply, quatFromAxisAngle } from '../engine/core/Quat.js';

let skierPrimitives = [];
let ghostSkier = null;
let ghostIndex = 0;

//
// 1) NALOŽIMO MESH IN SNEŽNO TEKSTURO
//d
const resources = await loadResources({
    cubeMesh: new URL('../models/cube/cube.json', import.meta.url),
    snowTex:  new URL('../models/snow/Snow010A_2K-JPG_Color.jpg', import.meta.url),
    alpsSkybox: new URL('../models/skybox/ozadje5.png', import.meta.url),  // Višja kvaliteta panorama
});

const treeLoader = new GLTFLoader();
await treeLoader.load(new URL('../models/tree/scene.gltf', import.meta.url));

const treePrimitives = [];
if (treeLoader.gltf.meshes) {
    for (let i = 0; i < treeLoader.gltf.meshes.length; i++) {
        const model = treeLoader.loadMesh(i); // vrne Model
        if (model && model.primitives) {
            treePrimitives.push(...model.primitives);
        }
    }
}

console.log('Loaded tree primitives:', treePrimitives.length);


const skierLoader = new GLTFLoader();
await skierLoader.load(new URL('../models/skier/scene.gltf', import.meta.url));




if (skierLoader.gltf.meshes) {
    for (let i = 0; i < skierLoader.gltf.meshes.length; i++) {
        const model = skierLoader.loadMesh(i); // vrne Model
        if (model && model.primitives) {
            skierPrimitives.push(...model.primitives);
        }
    }
}

const finishLoader = new GLTFLoader();
await finishLoader.load(new URL('../models/finish2/Untitled.gltf', import.meta.url));

let finishPrimitives = [];
if (finishLoader.gltf.meshes) {
    console.log('finish meshes:', finishLoader.gltf.meshes.length);
    for (let i = 0; i < finishLoader.gltf.meshes.length; i++) {
        const model = finishLoader.loadMesh(i);
        if (model && model.primitives) {
            finishPrimitives.push(...model.primitives);
        }
    }
}

console.log('Loaded finish gate primitives:', finishPrimitives.length);




const coinLoader = new GLTFLoader();
await coinLoader.load(new URL('../models/coin/scene.gltf', import.meta.url));

let coinPrimitives = [];
if (coinLoader.gltf.meshes) {
    console.log('coin meshes:', coinLoader.gltf.meshes.length);
    for (let i = 0; i < coinLoader.gltf.meshes.length; i++) {
        const model = coinLoader.loadMesh(i);
        if (model && model.primitives) {
            coinPrimitives.push(...model.primitives);
        }
    }
}

const trunkLoader = new GLTFLoader();
await trunkLoader.load(new URL('../models/trunk/dead_tree_trunk_02_1k.gltf', import.meta.url));

let trunkPrimitives = [];
if (trunkLoader.gltf.meshes) {
    console.log('trunk meshes:', trunkLoader.gltf.meshes.length);
    for (let i = 0; i < trunkLoader.gltf.meshes.length; i++) {
        const model = trunkLoader.loadMesh(i);
        if (model && model.primitives) {
            trunkPrimitives.push(...model.primitives);
        }
    }
}

console.log('Loaded trunk primitives:', trunkPrimitives.length);

//coin factory

function createCoin(x, z) {
    const coin = new Entity();

    coin.addComponent(new Transform({
        translation: [x, 0.2, z],
        rotation: [0, 0, 0, 1],
        scale: [1.5, 1.5, 1.5],
    }));

    coin.addComponent(new Model({
        primitives: coinPrimitives,
    }));

    coin.collected = false;

    return coin;
}

const coinsToRemove = [];


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

// Funkcija za posodobitev flash animacije vratc
function updateGateFlash(gatePair, dt) {
    if (gatePair.flashTime > 0) {
        gatePair.flashTime -= dt;
        
        // Izračunaj intenziteto flasha (1 na začetku, 0 na koncu)
        const flashIntensity = Math.max(0, gatePair.flashTime / gatePair.flashDuration);
        
        // Interpoliraj med originalno barvo in belo
        const [origR, origG, origB, origA] = gatePair.originalColor;
        const whiteR = 1.0, whiteG = 1.0, whiteB = 1.0;
        
        const flashR = origR + (whiteR - origR) * flashIntensity;
        const flashG = origG + (whiteG - origG) * flashIntensity;
        const flashB = origB + (whiteB - origB) * flashIntensity;
        
        // Posodobi barvo obeh palic
        const leftModel = gatePair.leftGate.getComponentOfType(Model);
        const rightModel = gatePair.rightGate.getComponentOfType(Model);
        
        if (leftModel && leftModel.primitives[0]) {
            leftModel.primitives[0].material.baseFactor = [flashR, flashG, flashB, origA];
        }
        if (rightModel && rightModel.primitives[0]) {
            rightModel.primitives[0].material.baseFactor = [flashR, flashG, flashB, origA];
        }
    }
}

//
// 2) ENTITETE – SVET
//

// Calculate course length based on gates (podaljšana proga - mega)
const gateCount = 22;
const firstGateZ = -40;
const gateStepZ = -32;
const lastGateZ = firstGateZ + (gateCount - 1) * gateStepZ;
const finishZ = lastGateZ - 70;
const courseLength = Math.abs(finishZ) + 20; // extra buffer

// 2.1. Smučarska proga: zelo široka in dolga "ploskev"
const slope = new Entity();
slope.addComponent(new Transform({
    translation: [0, -1.5, finishZ / 2],
    // X = širina, Y = debelina, Z = dolžina
    scale: [60, 0.2, courseLength],
}));
slope.addComponent(new Model({
    primitives: [
        new Primitive({
            mesh: resources.cubeMesh,
            material: new Material({
                baseTexture: snowTexture,
                baseFactor: [1, 1, 1, 1],
                uvScale: [12, 60], // Tile snow texture (X = width, Y = length)
            }),
        })
    ],
}));

/* 2.2. Drevesa ob robu proge
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
}*/

function createTree (x, z, height = 4) {
    const tree = new Entity();

    const baseHeight = 4;
    const uniformScale = height / baseHeight;

    tree.addComponent(new Transform({
        translation: [x, -0.2, z],
        // rotacija -90° okoli X osi - lokalni Z (drevo) postane svetovni +Y
        rotation: [-0.707, 0, 0, 0.707],
        scale: [uniformScale, uniformScale, uniformScale],
    }));

    tree.addComponent(new Model({
        primitives: treePrimitives,
    }));
    return tree;
}

// Factory za ovire (hlodi na progi)
function createObstacle(x, z) {
    const obstacle = new Entity();
    
    // Naključna velikost in rotacija hloda
    const scale = 0.8 + Math.random() * 0.6; // 0.8 - 1.4
    
    // Hlod je ležeč na progi - rotiran okoli X in Y osi
    const yRotation = Math.random() * Math.PI * 2; // random heading
    
    obstacle.addComponent(new Transform({
        translation: [x, -1.4, z], // Na površini proge
        rotation: [0, Math.sin(yRotation/2), 0, Math.cos(yRotation/2)], // naključna rotacija okoli Y
        scale: [scale, scale, scale],
    }));
    
    obstacle.addComponent(new Model({
        primitives: trunkPrimitives,
    }));
    
    // Hitbox za collision detection - hlod je dolg in širok
    obstacle.hitboxRadius = scale * 1.2;
    
    return obstacle;
}


// Naključno razmetana drevesa z večjo variabilnostjo (povečan spacing za performance)
const trees = [];
{
    let z = -20;
    while (z > finishZ - 30) { // Generate trees until just before finish
        // Naključna razdalja med drevesi (8-16 enot) - zmanjšano število
        const spacing = 8 + Math.random() * 8;
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

// Random ovire na progi (hlodi)
const obstacles = [];
{
    let z = -30;
    while (z > finishZ - 20) {
        // Pogostejši hlodi - več izziva!
        const spacing = 20 + Math.random() * 30; // 20-50 enot (prej 40-90)
        z -= spacing;
        
        // Pozicija ovire - lahko je na sredini proge (kjer moraš narediti manevro)
        const x = (Math.random() - 0.5) * 20; // -10 do +10 (centralno območje)
        
        obstacles.push(createObstacle(x, z));
    }
}

console.log('Spawned obstacles:', obstacles.length);

// 2.3. Vratca – par palic iste barve (rdeča ali modra)
function createGatePair(zPos, centerX, isRedGate) {
    const gateHalfWidth  = 1.8;   // polovica razmika med količkoma
    const poleHeight     = 2.2;
    const poleThickness  = 0.12;

    const red  = [1.0, 0.1, 0.1, 1];
    const blue = [0.1, 0.3, 1.0, 1];

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

    return { 
        leftGate, 
        rightGate, 
        z: zPos, 
        centerX, 
        halfWidth: gateHalfWidth, 
        isRedGate, 
        passed: false,
        originalColor: color,
        flashTime: 0,          // trenutna čas flasha
        flashDuration: 0.3,    // trajanje flasha (v sekundah)
    };
}

// Naredimo več vratc po progi: rdeča, modra, rdeča, modra ...
// Vsaka vrata ima naključno horizontalno pozicijo za večjo zanimivost
// Vratca ostanejo znotraj mejnih dreves (≈ ±15 enot od centra)
const gatePairs = [];
{
    const maxHorizontalRange = 14; // Ostani znotraj ±15 (približna pozicija najbližjih dreves)
    for (let i = 0; i < gateCount; i++) {
        const z = firstGateZ + i * gateStepZ; // gateStepZ je negativen
        // Naključna horizontalna pozicija med -14 in +14
        const centerX = (Math.random() - 0.5) * 2 * maxHorizontalRange;
        const isRedGate = (i % 2 === 0); // izmenično rdeča / modra
        const gatePair = createGatePair(z, centerX, isRedGate);
        gatePairs.push(gatePair);
    }
}

// Plosko polje vseh entitet vratc (levi + desni) za render in collision
const gateEntities = gatePairs.flatMap(g => [g.leftGate, g.rightGate]);



const coins = [];

function spawnCoins() {
    coins.length = 0;

    let z = -20;
    while (z > finishZ + 20) {
        z -= 20 + Math.random() * 20;
        const x = (Math.random() - 0.5) * 12;
        coins.push(createCoin(x, z));
    }
}

// 2.4. Ciljna črta (finish line)
const finishLine = new Entity();
finishLine.addComponent(new Transform({
    translation: [0, -1.45, finishZ],
    scale: [30, 0.2, 0.8], // široka črta
}));
finishLine.addComponent(new Model({
    primitives: [createColoredPrimitive(1.0, 0.8, 0.0, 1)], // zlata/rumena barva
}));


// 2.4b Finish gate (nad črto)
const finishGate = new Entity();
finishGate.addComponent(new Transform({
    translation: [0, 0.2, finishZ], 
    rotation: [0, 0, 0, 0.707],
    scale: [3, 3, 3],
}));
finishGate.addComponent(new Model({
    primitives: finishPrimitives,
}));

// 2.5. Smučar – zdaj z kontrolerjem za premikanje!
const skier = new Entity();
skier.addComponent(new Transform({
    translation: [0, 0.15, 8],
    rotation: [0, 0, 0, 1],     // nevtralna rotacija
    scale: [1, 1, 1],           // scale raje nastavljamo na child
}));

const skierModel = new Entity();
skierModel.name = "skierModel";
skierModel.addComponent(new Transform({
    translation: [0, 0, 0],
    rotation: [0, 0.707, 0.707, 0],   // -90° okoli X da stoji pokonci
    scale: [0.5, 0.5, 0.5],              // pravilna velikost smučarja
}));

skierModel.addComponent(new Model({
    primitives: skierPrimitives,
}));

function createGhostSkier() {
    const ghost = new Entity();

    ghost.addComponent(new Transform({
        translation: [0, 0, 0],
        rotation: [0, 0.707, 0.707, 0],   // -90° okoli X da stoji pokonci
        scale: [0.5, 0.5, 0.5],              // pravilna velikost smučarja
    }));

    // Use same skier mesh
    ghost.addComponent(new Model({
        primitives: skierPrimitives.map(p => {
            return new Primitive({
                mesh: p.mesh,
                material: new Material({
                    baseTexture: p.material.baseTexture,
                    baseFactor: [1, 1, 1, 0.2], // transparent ghost
                })
            });
        })
    }));

    return ghost;
}


// Poveži model pod glavno entiteto
skierModel.addComponent(new Parent(skier));
//scene.push(skierModel);


// Dodaj particle system za snežni pršec
const particleSystem = new ParticleSystem({
    maxParticles: 300,       // zmanjšano za boljše performanse
    emissionRate: 15,         // začetna hitrost emisije (dinamično se spreminja)
    particleLifetime: 0.5,
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

// 2.6. Kamera – pogled od zgoraj, malo poševno
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
    near:   0.3,
    far:    2000.0,  // dovolj za skybox, optimizirano za performance
}));

// 2.7. Skybox - alpsko ozadje
// Za zdaj uporabljamo gradient ali pa lahko kasneje dodaš pravo sliko alp
function createSkybox() {
    const skyboxSize = 2000; // Velik skybox - daleč nazaj
    const skybox = new Entity();
    
    skybox.addComponent(new Transform({
        translation: [0, 0, 0], // Centiran s kamero
        scale: [skyboxSize, skyboxSize, skyboxSize],
    }));
    
    // Ustvari material s teksturo alp
    // Namesto ogromne slike ponavljamo teksturo z UV skaliranjem + repeat samplerjem
    // (sliko shrani v 256x256 ali 512x512 WebP/JPEG/AVIF za manjšo velikost)
    const skyMaterial = new Material({
        baseTexture: new Texture({
            image: resources.alpsSkybox, // uporabi manjšo verzijo datoteke, če jo dodaš (npr. 512px WebP)
            sampler: new Sampler({
                magFilter: 'linear',
                minFilter: 'linear',
                mipmapFilter: 'linear',
                addressModeU: 'repeat',
                addressModeV: 'repeat',
                addressModeW: 'repeat',
            }),
        }),
        baseFactor: [1, 1, 1, 1],
        uvScale: [6, 2], // ponovi teksturo (X=6x okoli horizonta, Y=2x vertikalno)
    });
    
    skybox.addComponent(new Model({
        primitives: [
            new Primitive({
                mesh: resources.cubeMesh,
                material: skyMaterial,
            })
        ],
    }));
    
    skybox.addComponent(new Skybox({
        size: skyboxSize,
    }));
    
    return skybox;
}

const skybox = createSkybox();

//
// 3) SCENA – seznam entitet
//
let scene = [
    skybox,      // Skybox se renderira najprej (v ozadju)
    slope,
    skier,
    skierModel,
    ...trees,
    ...obstacles,
    ...gateEntities,
    finishGate,
    cameraEntity,
];

function removeCoinsFromScene() {
    for (const coin of coins) {
        const idx = scene.indexOf(coin);
        if (idx !== -1) scene.splice(idx, 1);
    }
}
spawnCoins();
//console.log('Spawned coins: ', coins.length);
scene.push(...coins);

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
    maxSpeed: 40,           // maksimalna hitrost (povečana)
    minSpeed: 12,            // začetna/minimalna hitrost (povečana)
    acceleration: 8,        // pospeševanje (povečano)
    deceleration: 14,       // zaviranje pri zavijanju (povečano)
    lateralSpeed: 18,       // hitrost levo/desno (povečana)
    maxX: 25,               // meja za rob proge
    turnRotationSpeed: 5.5, // hitrost rotacije (povečana)
    tiltAmount: 0.45,       // nagib pri zavijanju (povečan)
});
skier.addComponent(skierController);

// Dodaj restart funkcionalnost
document.getElementById('restartButton')?.addEventListener('click', () => {


     window.playMusicFromStart?.();
    
     // --- REMOVE OLD GHOST ---
    if (ghostSkier) {
        const idx = scene.indexOf(ghostSkier);
        if (idx !== -1) scene.splice(idx, 1);
        ghostSkier = null;
    }
    
    gameState.reset();
    
    // Reset skier position
    const skierTransform = skier.getComponentOfType(Transform);
    if (skierTransform) {
        skierTransform.translation = [0, 0.2, 8];
    }
    
    // Reset skier physics
    skierController.reset();

    //aktiviraj duha, če imamo najboljšo rundo igre
    if (gameState.bestRunPath && gameState.bestRunPath.length > 0) {
        ghostSkier = createGhostSkier();
        scene.push(ghostSkier);
        ghostIndex = 0;
    }
    removeCoinsFromScene();

    spawnCoins();
    scene.push(...coins);
    
    // Clear particles
    particleSystem.clear();
    particleSystem.setEnabled(true);
    
    // Reset all gate passed flags
    for (const pair of gatePairs) {
        pair.passed = false;
    }
});

// Function to start game
function startGameFromMenu() {
    window.playMusicFromStart?.();  
    if (window.autoStartTimeout) clearTimeout(window.autoStartTimeout);
    if (window.countdownInterval) clearInterval(window.countdownInterval);
    gameState.startGame();
    document.getElementById('restartButton')?.click();
}

// Listen for auto-start event from HTML
window.addEventListener('startGame', startGameFromMenu);

// Dodaj Enter in Space key za start
document.addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'Space') && gameState.showingMenu) {
        // Start game when Enter or Space is pressed on menu
        e.preventDefault();
        startGameFromMenu();
    } else if ((e.code === 'Enter' || e.code === 'Space') && !gameState.isPlaying() && !gameState.showingMenu) {
        // Restart pri game over
        e.preventDefault();
        document.getElementById('restartButton')?.click();
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

    if (gameState.isPlaying() && skierTransform) {
        gameState.currentRunPath.push({
            x: skierTransform.translation[0],
            y: skierTransform.translation[1],
            z: skierTransform.translation[2],
        })
    }
    
    // Update particle system BEFORE other components
    if (skierTransform) {
        // Dynamic emission rate based on speed and lateral input
        const currentSpeed = skierController.getCurrentSpeed();
        const speedRatio = currentSpeed / skierController.maxSpeed;
        
        // Check if turning
        const isTurning = skierController.keys['KeyA'] || skierController.keys['ArrowLeft'] ||
                         skierController.keys['KeyD'] || skierController.keys['ArrowRight'];
        
        // More particles when going fast or turning (optimized rates for performance)
        const baseRate = 8 + speedRatio * 20; // 8-28 particles/sec based on speed
        const turnBonus = isTurning ? 15 : 0;  // Extra 15 particles/sec when turning
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
    
    // Posodobi flash animacije vseh vratc
    for (const pair of gatePairs) {
        updateGateFlash(pair, dt);
    }

    // COIN UPDATE (spin + billboard yaw)
    const camTransform = cameraEntity.getComponentOfType(Transform);

    for (const coin of coins) {
        if (coin.collected) continue;

        const tr = coin.getComponentOfType(Transform);
        if (!tr || !camTransform) continue;

        // Billboard yaw
        const dx = camTransform.translation[0] - tr.translation[0];
        const dz = camTransform.translation[2] - tr.translation[2];
        const yaw = Math.atan2(dx, dz);   // angle around Y

        const billboardQ = quatFromAxisAngle([0, 1, 0], yaw);

        const spinSpeed = 2.0;           
        const spinQ = quatFromAxisAngle([0, 1, 0], t * spinSpeed);

        // Combined rotation = billboard * spin
        tr.rotation = quatMultiply(billboardQ, spinQ);
    }

    if (skierTransform) {
        // Posodobi game state (razdalja in hitrost)
        const currentSpeed = skierController.getCurrentSpeed();
        gameState.update(skierTransform.translation[2], currentSpeed);
        
        // Collision detection je onemogočena med prikazovanjem menuja
        if (!gameState.showingMenu) {
            // Preveri trčenje z drevesi
            const hitTree = checkTreeCollisions(skier, trees);
            if (hitTree) {
                window.playSound?.('end');
                window.stopMusic?.();
                gameState.gameOver('tree');
                console.log('Hit a tree!');
                return;
            }
            
            // Preveri, če smo pravkar prešli katera še neobdelana vratca
            for (const pair of gatePairs) {
                if (pair.passed) continue;
                // Ko smučarjev Z gre za z vratc (z je negativen, skierZ bo manjši ali enak)
                // Najprej preveri TRK s palico
                if (checkGateCollision(skier, pair)) {
                    window.playSound?.('end');
                    window.stopMusic?.();
                    pair.passed = true;
                    gameState.gameOver('gate');   // Zadel si vratca
                    return;
                }

                // Nato preveri PASSING (ko greš mimo Z)
                if (skierTransform.translation[2] <= pair.z) {
                    if (checkGatePassing(skier, pair)) {
                        pair.passed = true;
                        pair.flashTime = pair.flashDuration;
                        window.playSound?.('gate');
                        gameState.gatePassed();
                    } else {
                        window.playSound?.('end');
                        window.stopMusic?.();
                        pair.passed = true;
                        gameState.gameOver('miss-gate');
                        return;
                    }
                }
            }
            
            // Preveri trčenje z ovirami (kamni)
            const hitObstacle = checkObstacleCollisions(skier, obstacles);
            if (hitObstacle) {
                window.playSound?.('end');
                window.stopMusic?.();
                gameState.gameOver('obstacle');
                console.log('Hit an obstacle!');
                return;
            }
        }

        // --- COIN COLLISION ---
        for (const coin of coins) {
            if (coin.collected) continue;

            const tr = coin.getComponentOfType(Transform);

            const dx = tr.translation[0] - skierTransform.translation[0];
            const dz = tr.translation[2] - skierTransform.translation[2];

            // Simple hitbox (~1 meter)
            if (Math.abs(dx) < 1.0 && Math.abs(dz) < 1.0) {
                coin.collected = true;
                coinsToRemove.push(coin);   // mark for removal
                gameState.coins++;
                window.playSound?.('coin');
                console.log("Coin collected! Total:", gameState.coins);
            }
        }        
            // Preveri, če je smučar prečkal ciljno črto
        if (skierTransform.translation[2] <= finishZ) {
            window.playSound?.('victory');
            window.stopMusic?.();
            gameState.gameOver('finish');
            console.log('Finished the course!');
            return;
        }
    }

    // remove collected coins safely
    if (coinsToRemove.length > 0) {
        for (const coin of coinsToRemove) {
            const idxScene = scene.indexOf(coin);
            if (idxScene !== -1) scene.splice(idxScene, 1);

            const idxCoins = coins.indexOf(coin);
            if (idxCoins !== -1) coins.splice(idxCoins, 1);
        }
        coinsToRemove.length = 0;
    }

    // ghost replay - show best run
    if (ghostSkier && gameState.bestRunPath) {
        const frame = gameState.bestRunPath[ghostIndex];
        if (frame) {
            const tr = ghostSkier.getComponentOfType(Transform);
            tr.translation[0] = frame.x;
            tr.translation[1] = frame.y;
            tr.translation[2] = frame.z;
            ghostIndex++;
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
    
    // Skybox sledi kameri (vedno v centru kamere)
    const skyboxTransform = skybox.getComponentOfType(Transform);
    if (cameraTransform && skyboxTransform) {
        skyboxTransform.translation[0] = cameraTransform.translation[0];
        skyboxTransform.translation[1] = cameraTransform.translation[1] - 200; // Daleč nižje za bolj definirano ozadje
        skyboxTransform.translation[2] = cameraTransform.translation[2];
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
