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
 * Izračuna AABB (Axis-Aligned Bounding Box) za transform
 */
function getBoundingBox(transform) {
    const [x, y, z] = transform.translation;
    const [scaleX, scaleY, scaleZ] = transform.scale || [1, 1, 1];
    
    // Osnovna kocka ima velikost 2x2x2 (od -1 do +1)
    // Tako da moramo pomnožiti s scale in deliti z 2
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
 * Preveri ali je smučar trčil v katerakoli vratca (palice)
 */
export function checkGateCollisions(skier, gates) {
    for (const gate of gates) {
        if (checkCollision(skier, gate)) {
            return gate; // Vrni palico s katero se je zaletel
        }
    }
    return null;
}
