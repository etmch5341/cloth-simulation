import { Vec3 } from "../lib/TSM.js";
import { Particle } from "./Particle.js";
import { SpringType } from "./Spring.js";
import { SquishyObject, SquishyShape, createEdge } from "./SquishyObject.js";
export class SquishyTorus extends SquishyObject {
    constructor(position, majorRadius, minorRadius, material) {
        super(position, new Vec3([majorRadius, minorRadius, majorRadius]), // x,z = major, y = minor
        material, SquishyShape.TORUS);
        this.majorRadius = majorRadius;
        this.minorRadius = minorRadius;
    }
    // Create particles arranged in a torus shape
    createParticles() {
        const resolution = this.params.resolution;
        const majorRes = resolution; // Resolution around the major circle
        const minorRes = resolution; // Resolution around the minor circle
        // Generate points on a torus
        for (let i = 0; i < majorRes; i++) {
            const theta = (2 * Math.PI * i) / majorRes;
            const centerX = this.position.x + this.majorRadius * Math.cos(theta);
            const centerZ = this.position.z + this.majorRadius * Math.sin(theta);
            for (let j = 0; j < minorRes; j++) {
                const phi = (2 * Math.PI * j) / minorRes;
                // Calculate position on the surface of the torus
                const x = centerX + this.minorRadius * Math.cos(phi) * Math.cos(theta);
                const y = this.position.y + this.minorRadius * Math.sin(phi);
                const z = centerZ + this.minorRadius * Math.cos(phi) * Math.sin(theta);
                this.particles.push(new Particle(new Vec3([x, y, z]), this.params.mass));
            }
        }
    }
    // Create springs connecting the particles
    createSprings() {
        const majorRes = this.params.resolution;
        const minorRes = this.params.resolution;
        // Connect particles within the same minor circle
        for (let i = 0; i < majorRes; i++) {
            const majorOffset = i * minorRes;
            for (let j = 0; j < minorRes; j++) {
                const current = majorOffset + j;
                const next = majorOffset + ((j + 1) % minorRes);
                // Structural springs around the minor circle
                createEdge(this.particles, this.springs, current, next, this.params.stiffness, this.params.damping);
                // Bend springs (skipping one particle)
                const skipOne = majorOffset + ((j + 2) % minorRes);
                createEdge(this.particles, this.springs, current, skipOne, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
            }
        }
        // Connect particles across major circles
        for (let i = 0; i < majorRes; i++) {
            const majorOffset = i * minorRes;
            const nextMajorOffset = ((i + 1) % majorRes) * minorRes;
            for (let j = 0; j < minorRes; j++) {
                const current = majorOffset + j;
                const nextMajor = nextMajorOffset + j;
                // Structural springs connecting adjacent major circles
                createEdge(this.particles, this.springs, current, nextMajor, this.params.stiffness, this.params.damping);
                // Shear springs across major circles
                const nextMajorNext = nextMajorOffset + ((j + 1) % minorRes);
                createEdge(this.particles, this.springs, current, nextMajorNext, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                const nextMajorPrev = nextMajorOffset + ((j - 1 + minorRes) % minorRes);
                createEdge(this.particles, this.springs, current, nextMajorPrev, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                // Bend springs across major circles (skipping one major circle)
                const skipMajorOffset = ((i + 2) % majorRes) * minorRes;
                const skipMajor = skipMajorOffset + j;
                createEdge(this.particles, this.springs, current, skipMajor, this.params.stiffness * 0.3, this.params.damping, SpringType.BEND);
            }
        }
    }
    // Create surface triangles for rendering and volume calculations
    createSurfaceTriangles() {
        const majorRes = this.params.resolution;
        const minorRes = this.params.resolution;
        // Create triangles for the torus surface
        for (let i = 0; i < majorRes; i++) {
            const majorOffset = i * minorRes;
            const nextMajorOffset = ((i + 1) % majorRes) * minorRes;
            for (let j = 0; j < minorRes; j++) {
                const current = majorOffset + j;
                const next = majorOffset + ((j + 1) % minorRes);
                const nextMajorCurrent = nextMajorOffset + j;
                const nextMajorNext = nextMajorOffset + ((j + 1) % minorRes);
                // Add two triangles to form a quad
                this.surfaceTriangles.push([current, nextMajorCurrent, next]);
                this.surfaceTriangles.push([next, nextMajorCurrent, nextMajorNext]);
            }
        }
    }
}
//# sourceMappingURL=SquishyTorus.js.map