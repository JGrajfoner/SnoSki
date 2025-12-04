import { vec3 } from 'glm';

/**
 * Generira normale za mesh, če jih nima
 * Uporablja Flat normal computation (normale po planarjih)
 */
export function ensureNormals(mesh) {
    // Preveri ali so normals prazni (vsi [0,0,0])
    let hasNormals = false;
    for (const vertex of mesh.vertices) {
        if (vertex.normal && (vertex.normal[0] !== 0 || vertex.normal[1] !== 0 || vertex.normal[2] !== 0)) {
            hasNormals = true;
            break;
        }
    }

    if (hasNormals) {
        return; // Normals so že prisotni
    }

    // Inicijaliziraj normals na 0
    for (const vertex of mesh.vertices) {
        vertex.normal = [0, 0, 0];
    }

    // Izračunaj normals po trikotnikih
    for (let i = 0; i < mesh.indices.length; i += 3) {
        const i0 = mesh.indices[i];
        const i1 = mesh.indices[i + 1];
        const i2 = mesh.indices[i + 2];

        const v0 = mesh.vertices[i0];
        const v1 = mesh.vertices[i1];
        const v2 = mesh.vertices[i2];

        // Izračunaj robove
        const edge1 = vec3.subtract(vec3.create(), v1.position, v0.position);
        const edge2 = vec3.subtract(vec3.create(), v2.position, v0.position);

        // Izračunaj normal s cross produktom
        const normal = vec3.cross(vec3.create(), edge1, edge2);

        // Prištej normal vsem verteksom tega trikotnika
        vec3.add(v0.normal, v0.normal, normal);
        vec3.add(v1.normal, v1.normal, normal);
        vec3.add(v2.normal, v2.normal, normal);
    }

    // Normaliziraj normals
    for (const vertex of mesh.vertices) {
        vec3.normalize(vertex.normal, vertex.normal);
    }
}
