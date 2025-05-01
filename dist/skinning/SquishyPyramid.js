import { Vec3 } from "../lib/TSM.js";
import { Particle } from "./Particle.js";
import { SpringType } from "./Spring.js";
import { SquishyObject, SquishyShape, createEdge } from "./SquishyObject.js";
export class SquishyPyramid extends SquishyObject {
    constructor(position, baseSize, height, material) {
        super(position, new Vec3([baseSize, height, baseSize]), material, SquishyShape.PYRAMID);
    }
    // Create particles arranged in a pyramid shape
    createParticles() {
        const baseSize = this.scale.x;
        const height = this.scale.y;
        const resolution = Math.max(3, this.params.resolution); // Ensure at least 3 particles per edge
        // Create particles for the base (square)
        const baseParticles = [];
        const baseStep = baseSize / (resolution - 1);
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const x = this.position.x - baseSize / 2 + i * baseStep;
                const y = this.position.y - height / 2; // Base is at the bottom
                const z = this.position.z - baseSize / 2 + j * baseStep;
                this.particles.push(new Particle(new Vec3([x, y, z]), this.params.mass));
                baseParticles.push(this.particles.length - 1);
            }
        }
        // Create particles for the sides of the pyramid
        const layers = Math.ceil(resolution / 2);
        for (let layer = 1; layer < layers; layer++) {
            const layerSize = baseSize * (1 - layer / layers);
            const layerHeight = this.position.y - height / 2 + (height * layer / layers);
            const layerResolution = Math.max(2, resolution - 2 * layer);
            const layerStep = layerSize / (layerResolution - 1);
            for (let i = 0; i < layerResolution; i++) {
                for (let j = 0; j < layerResolution; j++) {
                    const x = this.position.x - layerSize / 2 + i * layerStep;
                    const y = layerHeight;
                    const z = this.position.z - layerSize / 2 + j * layerStep;
                    this.particles.push(new Particle(new Vec3([x, y, z]), this.params.mass));
                }
            }
        }
        // Create the apex (top) particle
        this.particles.push(new Particle(new Vec3([this.position.x, this.position.y + height / 2, this.position.z]), this.params.mass));
        // Create center particle for better volume preservation
        this.particles.push(new Particle(this.position.copy(), this.params.mass));
    }
    // Create springs connecting the particles
    createSprings() {
        const resolution = Math.max(3, this.params.resolution);
        const layers = Math.ceil(resolution / 2);
        const apexIndex = this.particles.length - 2;
        const centerIndex = this.particles.length - 1;
        // Helper function to get the index of a particle at position (layer, i, j)
        const getIndex = (layer, i, j) => {
            if (layer === 0) {
                // Base layer
                return i * resolution + j;
            }
            else if (layer < layers) {
                // Middle layers
                const layerResolution = Math.max(2, resolution - 2 * layer);
                if (i < 0 || i >= layerResolution || j < 0 || j >= layerResolution) {
                    return -1;
                }
                // Calculate offset: base particles + all previous layers
                let offset = resolution * resolution;
                for (let l = 1; l < layer; l++) {
                    const prevLayerRes = Math.max(2, resolution - 2 * l);
                    offset += prevLayerRes * prevLayerRes;
                }
                return offset + i * layerResolution + j;
            }
            else if (layer === layers) {
                // Apex
                return apexIndex;
            }
            return -1;
        };
        // Connect particles in the base (square)
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const current = getIndex(0, i, j);
                // Connect to center
                createEdge(this.particles, this.springs, current, centerIndex, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
                // Connect horizontally and vertically
                if (i < resolution - 1) {
                    createEdge(this.particles, this.springs, current, getIndex(0, i + 1, j), this.params.stiffness, this.params.damping);
                }
                if (j < resolution - 1) {
                    createEdge(this.particles, this.springs, current, getIndex(0, i, j + 1), this.params.stiffness, this.params.damping);
                }
                // Connect diagonally (shear springs)
                if (i < resolution - 1 && j < resolution - 1) {
                    createEdge(this.particles, this.springs, current, getIndex(0, i + 1, j + 1), this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                }
                if (i < resolution - 1 && j > 0) {
                    createEdge(this.particles, this.springs, current, getIndex(0, i + 1, j - 1), this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                }
                // Connect to next layer (if not in the center of the base)
                if (layers < layers - 1) {
                    const nextLayer = 1;
                    const nextLayerRes = Math.max(2, resolution - 2 * nextLayer);
                    // Map position to next layer (which is smaller)
                    const nextI = Math.min(nextLayerRes - 1, Math.floor(i * nextLayerRes / resolution));
                    const nextJ = Math.min(nextLayerRes - 1, Math.floor(j * nextLayerRes / resolution));
                    const nextIndex = getIndex(nextLayer, nextI, nextJ);
                    if (nextIndex !== -1) {
                        createEdge(this.particles, this.springs, current, nextIndex, this.params.stiffness, this.params.damping);
                    }
                }
            }
        }
        // Connect middle layers
        for (let layer = 1; layer < layers - 1; layer++) {
            const layerResolution = Math.max(2, resolution - 2 * layer);
            const nextLayerRes = Math.max(2, resolution - 2 * (layer + 1));
            for (let i = 0; i < layerResolution; i++) {
                for (let j = 0; j < layerResolution; j++) {
                    const current = getIndex(layer, i, j);
                    // Connect to center
                    createEdge(this.particles, this.springs, current, centerIndex, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
                    // Connect horizontally and vertically
                    if (i < layerResolution - 1) {
                        createEdge(this.particles, this.springs, current, getIndex(layer, i + 1, j), this.params.stiffness, this.params.damping);
                    }
                    if (j < layerResolution - 1) {
                        createEdge(this.particles, this.springs, current, getIndex(layer, i, j + 1), this.params.stiffness, this.params.damping);
                    }
                    // Connect diagonally (shear springs)
                    if (i < layerResolution - 1 && j < layerResolution - 1) {
                        createEdge(this.particles, this.springs, current, getIndex(layer, i + 1, j + 1), this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                    }
                    if (i < layerResolution - 1 && j > 0) {
                        createEdge(this.particles, this.springs, current, getIndex(layer, i + 1, j - 1), this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                    }
                    // Connect to next layer
                    const nextI = Math.min(nextLayerRes - 1, Math.floor(i * nextLayerRes / layerResolution));
                    const nextJ = Math.min(nextLayerRes - 1, Math.floor(j * nextLayerRes / layerResolution));
                    const nextIndex = getIndex(layer + 1, nextI, nextJ);
                    if (nextIndex !== -1) {
                        createEdge(this.particles, this.springs, current, nextIndex, this.params.stiffness, this.params.damping);
                    }
                }
            }
        }
        // Connect last layer to apex
        const lastLayer = layers - 1;
        if (lastLayer > 0) { // If we have at least one middle layer
            const lastLayerRes = Math.max(2, resolution - 2 * lastLayer);
            for (let i = 0; i < lastLayerRes; i++) {
                for (let j = 0; j < lastLayerRes; j++) {
                    const current = getIndex(lastLayer, i, j);
                    // Connect to apex
                    createEdge(this.particles, this.springs, current, apexIndex, this.params.stiffness, this.params.damping);
                    // Connect to center
                    createEdge(this.particles, this.springs, current, centerIndex, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
                }
            }
        }
        else {
            // If we don't have middle layers, connect base corners directly to apex
            const corners = [
                getIndex(0, 0, 0),
                getIndex(0, 0, resolution - 1),
                getIndex(0, resolution - 1, 0),
                getIndex(0, resolution - 1, resolution - 1)
            ];
            for (const corner of corners) {
                createEdge(this.particles, this.springs, corner, apexIndex, this.params.stiffness, this.params.damping);
            }
        }
        // Connect apex to center
        createEdge(this.particles, this.springs, apexIndex, centerIndex, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
    }
    // Create surface triangles for rendering and volume calculations
    createSurfaceTriangles() {
        const resolution = Math.max(3, this.params.resolution);
        const layers = Math.ceil(resolution / 2);
        const apexIndex = this.particles.length - 2;
        // Helper function to get the index of a particle at position (layer, i, j)
        const getIndex = (layer, i, j) => {
            if (layer === 0) {
                // Base layer
                return i * resolution + j;
            }
            else if (layer < layers) {
                // Middle layers
                const layerResolution = Math.max(2, resolution - 2 * layer);
                if (i < 0 || i >= layerResolution || j < 0 || j >= layerResolution) {
                    return -1;
                }
                // Calculate offset: base particles + all previous layers
                let offset = resolution * resolution;
                for (let l = 1; l < layer; l++) {
                    const prevLayerRes = Math.max(2, resolution - 2 * l);
                    offset += prevLayerRes * prevLayerRes;
                }
                return offset + i * layerResolution + j;
            }
            else if (layer === layers) {
                // Apex
                return apexIndex;
            }
            return -1;
        };
        // Create triangles for the base (pointing inward)
        for (let i = 0; i < resolution - 1; i++) {
            for (let j = 0; j < resolution - 1; j++) {
                const bl = getIndex(0, i, j);
                const br = getIndex(0, i, j + 1);
                const tl = getIndex(0, i + 1, j);
                const tr = getIndex(0, i + 1, j + 1);
                this.surfaceTriangles.push([bl, br, tl]);
                this.surfaceTriangles.push([br, tr, tl]);
            }
        }
        // Create triangles for the sides
        // Bottom row to apex (or to next layer if available)
        for (let j = 0; j < resolution - 1; j++) {
            // Front side (i = 0)
            const bottom1 = getIndex(0, 0, j);
            const bottom2 = getIndex(0, 0, j + 1);
            if (layers > 1) {
                // Connect to next layer
                const nextLayerRes = Math.max(2, resolution - 2);
                const nextJ1 = Math.floor(j * nextLayerRes / resolution);
                const nextJ2 = Math.floor((j + 1) * nextLayerRes / resolution);
                const top1 = getIndex(1, 0, nextJ1);
                const top2 = getIndex(1, 0, nextJ2);
                if (top1 !== -1 && top2 !== -1 && top1 !== top2) {
                    this.surfaceTriangles.push([bottom1, bottom2, top1]);
                    this.surfaceTriangles.push([bottom2, top2, top1]);
                }
                else if (top1 !== -1) {
                    this.surfaceTriangles.push([bottom1, bottom2, top1]);
                }
            }
            else {
                // Connect directly to apex
                this.surfaceTriangles.push([bottom1, bottom2, apexIndex]);
            }
            // Back side (i = resolution-1)
            const bottomBack1 = getIndex(0, resolution - 1, j);
            const bottomBack2 = getIndex(0, resolution - 1, j + 1);
            if (layers > 1) {
                // Connect to next layer
                const nextLayerRes = Math.max(2, resolution - 2);
                const nextJ1 = Math.floor(j * nextLayerRes / resolution);
                const nextJ2 = Math.floor((j + 1) * nextLayerRes / resolution);
                const topBack1 = getIndex(1, nextLayerRes - 1, nextJ1);
                const topBack2 = getIndex(1, nextLayerRes - 1, nextJ2);
                if (topBack1 !== -1 && topBack2 !== -1 && topBack1 !== topBack2) {
                    this.surfaceTriangles.push([bottomBack1, topBack1, bottomBack2]);
                    this.surfaceTriangles.push([bottomBack2, topBack1, topBack2]);
                }
                else if (topBack1 !== -1) {
                    this.surfaceTriangles.push([bottomBack1, topBack1, bottomBack2]);
                }
            }
            else {
                // Connect directly to apex
                this.surfaceTriangles.push([bottomBack1, apexIndex, bottomBack2]);
            }
        }
        // Left and right sides
        for (let i = 0; i < resolution - 1; i++) {
            // Left side (j = 0)
            const bottomLeft1 = getIndex(0, i, 0);
            const bottomLeft2 = getIndex(0, i + 1, 0);
            if (layers > 1) {
                // Connect to next layer
                const nextLayerRes = Math.max(2, resolution - 2);
                const nextI1 = Math.floor(i * nextLayerRes / resolution);
                const nextI2 = Math.floor((i + 1) * nextLayerRes / resolution);
                const topLeft1 = getIndex(1, nextI1, 0);
                const topLeft2 = getIndex(1, nextI2, 0);
                if (topLeft1 !== -1 && topLeft2 !== -1 && topLeft1 !== topLeft2) {
                    this.surfaceTriangles.push([bottomLeft1, topLeft1, bottomLeft2]);
                    this.surfaceTriangles.push([bottomLeft2, topLeft1, topLeft2]);
                }
                else if (topLeft1 !== -1) {
                    this.surfaceTriangles.push([bottomLeft1, topLeft1, bottomLeft2]);
                }
            }
            else {
                // Connect directly to apex
                this.surfaceTriangles.push([bottomLeft1, apexIndex, bottomLeft2]);
            }
            // Right side (j = resolution-1)
            const bottomRight1 = getIndex(0, i, resolution - 1);
            const bottomRight2 = getIndex(0, i + 1, resolution - 1);
            if (layers > 1) {
                // Connect to next layer
                const nextLayerRes = Math.max(2, resolution - 2);
                const nextI1 = Math.floor(i * nextLayerRes / resolution);
                const nextI2 = Math.floor((i + 1) * nextLayerRes / resolution);
                const topRight1 = getIndex(1, nextI1, nextLayerRes - 1);
                const topRight2 = getIndex(1, nextI2, nextLayerRes - 1);
                if (topRight1 !== -1 && topRight2 !== -1 && topRight1 !== topRight2) {
                    this.surfaceTriangles.push([bottomRight1, bottomRight2, topRight1]);
                    this.surfaceTriangles.push([bottomRight2, topRight2, topRight1]);
                }
                else if (topRight1 !== -1) {
                    this.surfaceTriangles.push([bottomRight1, bottomRight2, topRight1]);
                }
            }
            else {
                // Connect directly to apex
                this.surfaceTriangles.push([bottomRight1, bottomRight2, apexIndex]);
            }
        }
        // Connect middle layers
        for (let layer = 1; layer < layers - 1; layer++) {
            const layerResolution = Math.max(2, resolution - 2 * layer);
            const nextLayerRes = Math.max(2, resolution - 2 * (layer + 1));
            // Create side faces
            // Front side (i = 0)
            for (let j = 0; j < layerResolution - 1; j++) {
                const bottom1 = getIndex(layer, 0, j);
                const bottom2 = getIndex(layer, 0, j + 1);
                const nextJ1 = Math.floor(j * nextLayerRes / layerResolution);
                const nextJ2 = Math.floor((j + 1) * nextLayerRes / layerResolution);
                const top1 = getIndex(layer + 1, 0, nextJ1);
                const top2 = getIndex(layer + 1, 0, nextJ2);
                if (top1 !== -1 && top2 !== -1 && top1 !== top2) {
                    this.surfaceTriangles.push([bottom1, bottom2, top1]);
                    this.surfaceTriangles.push([bottom2, top2, top1]);
                }
                else if (top1 !== -1) {
                    this.surfaceTriangles.push([bottom1, bottom2, top1]);
                }
            }
            // Back side (i = layerResolution-1)
            for (let j = 0; j < layerResolution - 1; j++) {
                const bottom1 = getIndex(layer, layerResolution - 1, j);
                const bottom2 = getIndex(layer, layerResolution - 1, j + 1);
                const nextJ1 = Math.floor(j * nextLayerRes / layerResolution);
                const nextJ2 = Math.floor((j + 1) * nextLayerRes / layerResolution);
                const top1 = getIndex(layer + 1, nextLayerRes - 1, nextJ1);
                const top2 = getIndex(layer + 1, nextLayerRes - 1, nextJ2);
                if (top1 !== -1 && top2 !== -1 && top1 !== top2) {
                    this.surfaceTriangles.push([bottom1, top1, bottom2]);
                    this.surfaceTriangles.push([bottom2, top1, top2]);
                }
                else if (top1 !== -1) {
                    this.surfaceTriangles.push([bottom1, top1, bottom2]);
                }
            }
            // Left side (j = 0)
            for (let i = 0; i < layerResolution - 1; i++) {
                const bottom1 = getIndex(layer, i, 0);
                const bottom2 = getIndex(layer, i + 1, 0);
                const nextI1 = Math.floor(i * nextLayerRes / layerResolution);
                const nextI2 = Math.floor((i + 1) * nextLayerRes / layerResolution);
                const top1 = getIndex(layer + 1, nextI1, 0);
                const top2 = getIndex(layer + 1, nextI2, 0);
                if (top1 !== -1 && top2 !== -1 && top1 !== top2) {
                    this.surfaceTriangles.push([bottom1, top1, bottom2]);
                    this.surfaceTriangles.push([bottom2, top1, top2]);
                }
                else if (top1 !== -1) {
                    this.surfaceTriangles.push([bottom1, top1, bottom2]);
                }
            }
            // Right side (j = layerResolution-1)
            for (let i = 0; i < layerResolution - 1; i++) {
                const bottom1 = getIndex(layer, i, layerResolution - 1);
                const bottom2 = getIndex(layer, i + 1, layerResolution - 1);
                const nextI1 = Math.floor(i * nextLayerRes / layerResolution);
                const nextI2 = Math.floor((i + 1) * nextLayerRes / layerResolution);
                const top1 = getIndex(layer + 1, nextI1, nextLayerRes - 1);
                const top2 = getIndex(layer + 1, nextI2, nextLayerRes - 1);
                if (top1 !== -1 && top2 !== -1 && top1 !== top2) {
                    this.surfaceTriangles.push([bottom1, bottom2, top1]);
                    this.surfaceTriangles.push([bottom2, top2, top1]);
                }
                else if (top1 !== -1) {
                    this.surfaceTriangles.push([bottom1, bottom2, top1]);
                }
            }
        }
        // Connect last layer to apex
        const lastLayer = layers - 1;
        if (lastLayer > 0) {
            const lastLayerRes = Math.max(2, resolution - 2 * lastLayer);
            // Front side
            for (let j = 0; j < lastLayerRes - 1; j++) {
                const bottom1 = getIndex(lastLayer, 0, j);
                const bottom2 = getIndex(lastLayer, 0, j + 1);
                this.surfaceTriangles.push([bottom1, bottom2, apexIndex]);
            }
            // Back side
            for (let j = 0; j < lastLayerRes - 1; j++) {
                const bottom1 = getIndex(lastLayer, lastLayerRes - 1, j);
                const bottom2 = getIndex(lastLayer, lastLayerRes - 1, j + 1);
                this.surfaceTriangles.push([bottom1, apexIndex, bottom2]);
            }
            // Left side
            for (let i = 0; i < lastLayerRes - 1; i++) {
                const bottom1 = getIndex(lastLayer, i, 0);
                const bottom2 = getIndex(lastLayer, i + 1, 0);
                this.surfaceTriangles.push([bottom1, apexIndex, bottom2]);
            }
            // Right side
            for (let i = 0; i < lastLayerRes - 1; i++) {
                const bottom1 = getIndex(lastLayer, i, lastLayerRes - 1);
                const bottom2 = getIndex(lastLayer, i + 1, lastLayerRes - 1);
                this.surfaceTriangles.push([bottom1, bottom2, apexIndex]);
            }
        }
    }
}
//# sourceMappingURL=SquishyPyramid.js.map