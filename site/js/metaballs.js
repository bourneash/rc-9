// Lightweight metaballs renderer using marching squares
// Exports: renderMetaballs(ctx, nodes, bounds, options)
// nodes: [{ x, y, r }] in canvas coordinates
// bounds: { x, y, w, h }
// options: { cell: number, threshold: number, fillStyle, strokeStyle }

export function renderMetaballs(ctx, nodes, bounds, options = {}) {
    if (!nodes || nodes.length === 0) return;
    const cell = Math.max(2, options.cell || 4);
    const threshold = options.threshold || 1.0;
    const bx = Math.floor(bounds.x);
    const by = Math.floor(bounds.y);
    const bw = Math.max(2, Math.ceil(bounds.w));
    const bh = Math.max(2, Math.ceil(bounds.h));
    const cols = Math.ceil(bw / cell) + 1;
    const rows = Math.ceil(bh / cell) + 1;

    // Precompute field values
    const field = new Float32Array(cols * rows);
    let idx = 0;
    for (let j = 0; j < rows; j++) {
        const y = by + j * cell;
        for (let i = 0; i < cols; i++, idx++) {
            const x = bx + i * cell;
            let v = 0;
            for (const n of nodes) {
                const dx = x - n.x;
                const dy = y - n.y;
                const d2 = dx * dx + dy * dy;
                const rr = Math.max(1, n.r * n.r);
                v += rr / d2; // classic metaball influence
            }
            field[idx] = v;
        }
    }

    const contours = marchingSquares(field, cols, rows, cell, bx, by, threshold);
    if (!contours || contours.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (const path of contours) {
        if (!path || path.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let k = 1; k < path.length; k++) {
            ctx.lineTo(path[k].x, path[k].y);
        }
        ctx.closePath();
        if (options.fillStyle) {
            ctx.fillStyle = options.fillStyle;
            ctx.fill();
        } else {
            // Default molten fill
            const g = ctx.createLinearGradient(bx, by, bx, by + bh);
            g.addColorStop(0, 'rgba(255,170,90,0.9)');
            g.addColorStop(1, 'rgba(255,110,50,0.85)');
            ctx.fillStyle = g;
            ctx.fill();
        }
        if (options.strokeStyle) {
            ctx.strokeStyle = options.strokeStyle;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    ctx.restore();
}

function marchingSquares(field, cols, rows, cell, offsetX, offsetY, threshold) {
    const contours = [];
    const at = (i, j) => field[j * cols + i];
    const interp = (x1, y1, v1, x2, y2, v2) => {
        const t = (threshold - v1) / ((v2 - v1) || 1e-6);
        return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    };

    // Visitation map for cell edges
    const visited = new Uint8Array((cols - 1) * (rows - 1));
    const cellIndex = (i, j) => j * (cols - 1) + i;

    const edgesForCase = [
        [],                         // 0
        [[3,0]],                    // 1
        [[0,1]],                    // 2
        [[3,1]],                    // 3
        [[1,2]],                    // 4
        [[3,0],[1,2]],              // 5 (ambiguous; two segments)
        [[0,2]],                    // 6
        [[3,2]],                    // 7
        [[2,3]],                    // 8
        [[0,2]],                    // 9
        [[1,3],[0,2]],              // 10 (ambiguous)
        [[1,3]],                    // 11
        [[1,3]],                    // 12
        [[0,1]],                    // 13
        [[3,0]],                    // 14
        []                          // 15
    ];

    const edgePoint = (i, j, edge) => {
        const x = offsetX + i * cell;
        const y = offsetY + j * cell;
        const vTL = at(i, j);
        const vTR = at(i + 1, j);
        const vBR = at(i + 1, j + 1);
        const vBL = at(i, j + 1);
        switch (edge) {
            case 0: // top: TL->TR
                return interp(x, y, vTL, x + cell, y, vTR);
            case 1: // right: TR->BR
                return interp(x + cell, y, vTR, x + cell, y + cell, vBR);
            case 2: // bottom: BR->BL
                return interp(x + cell, y + cell, vBR, x, y + cell, vBL);
            case 3: // left: BL->TL
                return interp(x, y + cell, vBL, x, y, vTL);
        }
    };

    function traceFrom(iStart, jStart) {
        // Find the first unused segment in this cell
        const stack = [];
        const pushSegments = (i, j) => {
            const idx = cellIndex(i, j);
            if (visited[idx]) return;
            const vTL = at(i, j) >= threshold;
            const vTR = at(i + 1, j) >= threshold;
            const vBR = at(i + 1, j + 1) >= threshold;
            const vBL = at(i, j + 1) >= threshold;
            const code = (vTL ? 8 : 0) | (vTR ? 4 : 0) | (vBR ? 2 : 0) | (vBL ? 1 : 0);
            const segs = edgesForCase[code];
            if (!segs || segs.length === 0) return;
            visited[idx] = 1;
            for (const [e1, e2] of segs) {
                const p1 = edgePoint(i, j, e1);
                const p2 = edgePoint(i, j, e2);
                stack.push({ i, j, p1, p2 });
            }
        };

        pushSegments(iStart, jStart);
        if (stack.length === 0) return null;

        // Build a polyline by linking segment endpoints
        const path = [];
        let current = stack.pop();
        path.push(current.p1, current.p2);
        let safety = 0;
        while (stack.length && safety++ < 10000) {
            const last = path[path.length - 1];
            let found = false;
            for (let s = 0; s < stack.length; s++) {
                const seg = stack[s];
                if (dist2(last, seg.p1) < 0.5) { // connect p1 -> p2
                    path.push(seg.p2);
                    stack.splice(s, 1);
                    found = true;
                    break;
                } else if (dist2(last, seg.p2) < 0.5) { // connect p2 -> p1
                    path.push(seg.p1);
                    stack.splice(s, 1);
                    found = true;
                    break;
                }
            }
            if (!found) {
                // Try neighboring cells to continue contour
                const nextCells = neighbors(current.i, current.j, cols - 1, rows - 1);
                for (const [ni, nj] of nextCells) pushSegments(ni, nj);
                // If still not found, break this contour
                if (!stack.length) break;
            }
        }
        return path;
    }

    for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
            const idx = cellIndex(i, j);
            if (visited[idx]) continue;
            const vTL = at(i, j) >= threshold;
            const vTR = at(i + 1, j) >= threshold;
            const vBR = at(i + 1, j + 1) >= threshold;
            const vBL = at(i, j + 1) >= threshold;
            const code = (vTL ? 8 : 0) | (vTR ? 4 : 0) | (vBR ? 2 : 0) | (vBL ? 1 : 0);
            if (code === 0 || code === 15) { visited[idx] = 1; continue; }
            const path = traceFrom(i, j);
            if (path && path.length >= 3) contours.push(path);
        }
    }
    return contours;
}

function neighbors(i, j, maxI, maxJ) {
    const out = [];
    if (i > 0) out.push([i - 1, j]);
    if (i < maxI) out.push([i + 1, j]);
    if (j > 0) out.push([i, j - 1]);
    if (j < maxJ) out.push([i, j + 1]);
    return out;
}

function dist2(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
}
