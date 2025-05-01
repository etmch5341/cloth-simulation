import { Vec3 } from "../lib/TSM.js";
import { Particle } from "./Particle.js";
import { SpringType } from "./Spring.js";
import { SquishyObject, SquishyShape, createEdge } from "./SquishyObject.js";
export class SquishyCube extends SquishyObject {
    constructor(position, size, material) {
        super(position, new Vec3([size, size, size]), material, SquishyShape.CUBE);
    }
    // Create particles arranged in a cube shape
    createParticles() {
        const halfSize = this.scale.x / 2;
        const resolution = Math.max(2, Math.floor(this.params.resolution / 2)); // Use a smaller resolution for cubes
        // We need at least 2 particles per edge to form the cube
        const step = (2 * halfSize) / (resolution - 1);
        // Create a 3D grid of particles
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                for (let k = 0; k < resolution; k++) {
                    // Calculate position
                    const x = this.position.x - halfSize + i * step;
                    const y = this.position.y - halfSize + j * step;
                    const z = this.position.z - halfSize + k * step;
                    // Only add particles that are on the surface of the cube
                    if (i === 0 || i === resolution - 1 ||
                        j === 0 || j === resolution - 1 ||
                        k === 0 || k === resolution - 1) {
                        this.particles.push(new Particle(new Vec3([x, y, z]), this.params.mass));
                    }
                }
            }
        }
        // Add a center particle for better stability and pressure handling
        this.particles.push(new Particle(this.position.copy(), this.params.mass));
    }
    // Create springs connecting the particles
    createSprings() {
        const centerIndex = this.particles.length - 1;
        const resolution = Math.max(2, Math.floor(this.params.resolution / 2));
        // Function to calculate the index of a particle at grid position (i,j,k)
        const getIndex = (i, j, k) => {
            if (i < 0 || i >= resolution || j < 0 || j >= resolution || k < 0 || k >= resolution) {
                return -1;
            }
            // Only surface particles are stored
            if (i > 0 && i < resolution - 1 && j > 0 && j < resolution - 1 && k > 0 && k < resolution - 1) {
                return -1;
            }
            // Count particles up to this point
            let index = 0;
            for (let x = 0; x < resolution; x++) {
                for (let y = 0; y < resolution; y++) {
                    for (let z = 0; z < resolution; z++) {
                        if (x === 0 || x === resolution - 1 ||
                            y === 0 || y === resolution - 1 ||
                            z === 0 || z === resolution - 1) {
                            if (x === i && y === j && z === k) {
                                return index;
                            }
                            index++;
                        }
                    }
                }
            }
            return -1;
        };
        // Connect particles along the edges of the cube
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                for (let k = 0; k < resolution; k++) {
                    if (i === 0 || i === resolution - 1 ||
                        j === 0 || j === resolution - 1 ||
                        k === 0 || k === resolution - 1) {
                        const current = getIndex(i, j, k);
                        if (current === -1)
                            continue;
                        // Connect to center for better stability and volume preservation
                        createEdge(this.particles, this.springs, current, centerIndex, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
                        // Connect to neighbors along each axis
                        const neighbors = [
                            [i + 1, j, k],
                            [i - 1, j, k],
                            [i, j + 1, k],
                            [i, j - 1, k],
                            [i, j, k + 1],
                            [i, j, k - 1]
                        ];
                        for (const [ni, nj, nk] of neighbors) {
                            const neighbor = getIndex(ni, nj, nk);
                            if (neighbor !== -1) {
                                createEdge(this.particles, this.springs, current, neighbor, this.params.stiffness, this.params.damping);
                            }
                        }
                        // Add diagonal (shear) springs for faces
                        if (i === 0 || i === resolution - 1) {
                            const diag1 = getIndex(i, j + 1, k + 1);
                            const diag2 = getIndex(i, j + 1, k - 1);
                            const diag3 = getIndex(i, j - 1, k + 1);
                            const diag4 = getIndex(i, j - 1, k - 1);
                            if (diag1 !== -1)
                                createEdge(this.particles, this.springs, current, diag1, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag2 !== -1)
                                createEdge(this.particles, this.springs, current, diag2, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag3 !== -1)
                                createEdge(this.particles, this.springs, current, diag3, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag4 !== -1)
                                createEdge(this.particles, this.springs, current, diag4, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                        }
                        if (j === 0 || j === resolution - 1) {
                            const diag1 = getIndex(i + 1, j, k + 1);
                            const diag2 = getIndex(i + 1, j, k - 1);
                            const diag3 = getIndex(i - 1, j, k + 1);
                            const diag4 = getIndex(i - 1, j, k - 1);
                            if (diag1 !== -1)
                                createEdge(this.particles, this.springs, current, diag1, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag2 !== -1)
                                createEdge(this.particles, this.springs, current, diag2, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag3 !== -1)
                                createEdge(this.particles, this.springs, current, diag3, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag4 !== -1)
                                createEdge(this.particles, this.springs, current, diag4, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                        }
                        if (k === 0 || k === resolution - 1) {
                            const diag1 = getIndex(i + 1, j + 1, k);
                            const diag2 = getIndex(i + 1, j - 1, k);
                            const diag3 = getIndex(i - 1, j + 1, k);
                            const diag4 = getIndex(i - 1, j - 1, k);
                            if (diag1 !== -1)
                                createEdge(this.particles, this.springs, current, diag1, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag2 !== -1)
                                createEdge(this.particles, this.springs, current, diag2, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag3 !== -1)
                                createEdge(this.particles, this.springs, current, diag3, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                            if (diag4 !== -1)
                                createEdge(this.particles, this.springs, current, diag4, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                        }
                    }
                }
            }
        }
    }
    // Create surface triangles for rendering and volume calculations
    createSurfaceTriangles() {
        const resolution = Math.max(2, Math.floor(this.params.resolution / 2));
        // Function to calculate the index of a particle at grid position (i,j,k)
        const getIndex = (i, j, k) => {
            if (i < 0 || i >= resolution || j < 0 || j >= resolution || k < 0 || k >= resolution) {
                return -1;
            }
            // Only surface particles are stored
            if (i > 0 && i < resolution - 1 && j > 0 && j < resolution - 1 && k > 0 && k < resolution - 1) {
                return -1;
            }
            // Count particles up to this point
            let index = 0;
            for (let x = 0; x < resolution; x++) {
                for (let y = 0; y < resolution; y++) {
                    for (let z = 0; z < resolution; z++) {
                        if (x === 0 || x === resolution - 1 ||
                            y === 0 || y === resolution - 1 ||
                            z === 0 || z === resolution - 1) {
                            if (x === i && y === j && z === k) {
                                return index;
                            }
                            index++;
                        }
                    }
                }
            }
            return -1;
        };
        // Create triangles for each face of the cube
        // Front face (x = 0)
        for (let j = 0; j < resolution - 1; j++) {
            for (let k = 0; k < resolution - 1; k++) {
                const i = 0;
                const bl = getIndex(i, j, k);
                const br = getIndex(i, j, k + 1);
                const tl = getIndex(i, j + 1, k);
                const tr = getIndex(i, j + 1, k + 1);
                if (bl !== -1 && br !== -1 && tl !== -1 && tr !== -1) {
                    this.surfaceTriangles.push([bl, tl, br]);
                    this.surfaceTriangles.push([br, tl, tr]);
                }
            }
        }
        // Back face (x = resolution-1)
        for (let j = 0; j < resolution - 1; j++) {
            for (let k = 0; k < resolution - 1; k++) {
                const i = resolution - 1;
                const bl = getIndex(i, j, k);
                const br = getIndex(i, j, k + 1);
                const tl = getIndex(i, j + 1, k);
                const tr = getIndex(i, j + 1, k + 1);
                if (bl !== -1 && br !== -1 && tl !== -1 && tr !== -1) {
                    this.surfaceTriangles.push([bl, br, tl]);
                    this.surfaceTriangles.push([br, tr, tl]);
                }
            }
        }
        // Left face (k = 0)
        for (let i = 0; i < resolution - 1; i++) {
            for (let j = 0; j < resolution - 1; j++) {
                const k = 0;
                const bl = getIndex(i, j, k);
                const br = getIndex(i + 1, j, k);
                const tl = getIndex(i, j + 1, k);
                const tr = getIndex(i + 1, j + 1, k);
                if (bl !== -1 && br !== -1 && tl !== -1 && tr !== -1) {
                    this.surfaceTriangles.push([bl, br, tl]);
                    this.surfaceTriangles.push([br, tr, tl]);
                }
            }
        }
        // Right face (k = resolution-1)
        for (let i = 0; i < resolution - 1; i++) {
            for (let j = 0; j < resolution - 1; j++) {
                const k = resolution - 1;
                const bl = getIndex(i, j, k);
                const br = getIndex(i + 1, j, k);
                const tl = getIndex(i, j + 1, k);
                const tr = getIndex(i + 1, j + 1, k);
                if (bl !== -1 && br !== -1 && tl !== -1 && tr !== -1) {
                    this.surfaceTriangles.push([bl, tl, br]);
                    this.surfaceTriangles.push([br, tl, tr]);
                }
            }
        }
        // Bottom face (j = 0)
        for (let i = 0; i < resolution - 1; i++) {
            for (let k = 0; k < resolution - 1; k++) {
                const j = 0;
                const bl = getIndex(i, j, k);
                const br = getIndex(i, j, k + 1);
                const tl = getIndex(i + 1, j, k);
                const tr = getIndex(i + 1, j, k + 1);
                if (bl !== -1 && br !== -1 && tl !== -1 && tr !== -1) {
                    this.surfaceTriangles.push([bl, br, tl]);
                    this.surfaceTriangles.push([br, tr, tl]);
                }
            }
        }
        // Top face (j = resolution-1)
        for (let i = 0; i < resolution - 1; i++) {
            for (let k = 0; k < resolution - 1; k++) {
                const j = resolution - 1;
                const bl = getIndex(i, j, k);
                const br = getIndex(i, j, k + 1);
                const tl = getIndex(i + 1, j, k);
                const tr = getIndex(i + 1, j, k + 1);
                if (bl !== -1 && br !== -1 && tl !== -1 && tr !== -1) {
                    this.surfaceTriangles.push([bl, tl, br]);
                    this.surfaceTriangles.push([br, tl, tr]);
                }
            }
        }
    }
}
//# sourceMappingURL=SquishyCube.js.map