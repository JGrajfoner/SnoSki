import { Transform } from 'engine/core/core.js';

/**
 * Preveri, ali se dva objekta (entity) sekata z uporabo AABB (Axis-Aligned Bounding Box)
 */
export function checkCollision(entity1, entity2) {
    const transform1 = entity1.getComponentOfType(Transform);
    const transform2 = entity2.getComponentOfType(Transform);
    
    if (!transform1 || !transform2) {
        return false;
    }
    
    // Izračunaj meje za vsak objekt (AABB)
    const box1 = getBoundingBox(transform1);
    const box2 = getBoundingBox(transform2);
    
    // Preveri ali se sekata na vseh treh oseh
    return (
        box1.minX <= box2.maxX &&
        box1.maxX >= box2.minX &&
        box1.minY <= box2.maxY &&
        box1.maxY >= box2.minY &&
        box1.minZ <= box2.maxZ &&
        box1.maxZ >= box2.minZ
    );
}

/**
 * Izračun AABB za transform
 */
function getBoundingBox(transform) {
    const [x, y, z] = transform.translation;
    const [scaleX, scaleY, scaleZ] = transform.scale || [1, 1, 1];
    
    // Osnovna kocka ima velikost 2x2x2 (od -1 do +1)
    const halfX = scaleX / 2;
    const halfY = scaleY / 2;
    const halfZ = scaleZ / 2;
    
    return {
        minX: x - halfX,
        maxX: x + halfX,
        minY: y - halfY,
        maxY: y + halfY,
        minZ: z - halfZ,
        maxZ: z + halfZ,
    };
}

/**
 * Preveri ali je smučar trčil v katera koli drevesa
 */
export function checkTreeCollisions(skier, trees) {
    for (const tree of trees) {
        if (checkCollision(skier, tree)) {
            return tree; // Vrni drevo s katerim se je zaletel
        }
    }
    return null;
}

/**
 * Preveri ali je smučar prešel skozi vratca (Z-axis check)
 * Vrne true če si prešel skozi vratca (ne samo x-check)
 */
export function checkGatePassing(skier, gatePair) {
    const skierTransform = skier.getComponentOfType(Transform);
    if (!skierTransform) return false;
    
    const skierX = skierTransform.translation[0];
    const gateZ = gatePair.z;
    const centerX = gatePair.centerX;
    const halfWidth = gatePair.halfWidth;
    
    // Preveri ali je X v vratcih (horizontalno)
    return (skierX >= centerX - halfWidth) && (skierX <= centerX + halfWidth);
}

/**
 * Preveri ali je smučar trčil v hlod
 * Če je smučar v zraku (skoči dovolj visoko), lahko preskoči hlod
 */
export function checkObstacleCollisions(skier, obstacles) {
    const skierTransform = skier.getComponentOfType(Transform);
    if (!skierTransform) return null;
    
    const skierY = skierTransform.translation[1];
    const isJumpingHigh = skierY > 1.0; // Mora biti vsaj 1.0 nad tlemi za preskočit hlod
    
    for (const obstacle of obstacles) {
        const obstacleTransform = obstacle.getComponentOfType(Transform);
        if (!obstacleTransform) continue;
        
        // Preveri horizontalno razdaljo (2D collision v X-Z ravnini)
        const dx = skierTransform.translation[0] - obstacleTransform.translation[0];
        const dz = skierTransform.translation[2] - obstacleTransform.translation[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        const hitboxRadius = obstacle.hitboxRadius || 1.2;
        
        if (distance < hitboxRadius + 0.5) { // 0.5 = približen polmer smučarja
            // Če skače dovolj visoko, lahko preskoči hlod
            if (isJumpingHigh) {
                continue; // Preskočil hlod!
            }
            return obstacle; // Trčil v hlod - game over
        }
    }
    return null;
}

export function checkGateCollision(skier, gatePair) {
    return (
        checkCollision(skier, gatePair.leftGate) ||
        checkCollision(skier, gatePair.rightGate)
    );
}

