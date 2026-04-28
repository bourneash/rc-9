// Simple helpers for liquid droplet area/mass math
// Treat mass ~ area ~ r^2 for 2D blobs

export function massFromRadius(r) {
    r = Math.max(0, Number(r) || 0);
    return r * r;
}

export function radiusFromMass(m) {
    m = Math.max(0, Number(m) || 0);
    return Math.sqrt(m);
}

export function mergeDroplets(a, b) {
    // Mass-weighted average for position and velocity; sum masses
    const ma = Math.max(0, a.m || massFromRadius(a.r || 0));
    const mb = Math.max(0, b.m || massFromRadius(b.r || 0));
    const m = ma + mb || 1;
    const out = {
        x: (a.x * ma + b.x * mb) / m,
        y: (a.y * ma + b.y * mb) / m,
        vx: ((a.vx || 0) * ma + (b.vx || 0) * mb) / m,
        vy: ((a.vy || 0) * ma + (b.vy || 0) * mb) / m,
        m,
        r: Math.sqrt(m),
        falling: !!(a.falling || b.falling)
    };
    return out;
}
