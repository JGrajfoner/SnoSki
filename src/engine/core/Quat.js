export function quatMultiply(a, b) {
    return [
        a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
        a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
        a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
        a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
    ];
}

export function quatFromAxisAngle(axis, angle) {
    const half = angle * 0.5;
    const s = Math.sin(half);
    return [
        axis[0] * s,
        axis[1] * s,
        axis[2] * s,
        Math.cos(half),
    ];
}
