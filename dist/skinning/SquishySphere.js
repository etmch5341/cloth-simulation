import { Vec3 } from "../lib/TSM.js";
import { Particle } from "./Particle.js";
import { SpringType } from "./Spring.js";
import { SquishyObject, SquishyShape, createEdge } from "./SquishyObject.js";
export class SquishySphere extends SquishyObject {
    constructor(position, radius, material) {
        super(position, new Vec3([radius, radius, radius]), material, SquishyShape.SPHERE);
    }
    // Create surface triangles for rendering and volume calculations
    createSurfaceTriangles() {
        const resolution = this.params.resolution;
        const particlesPerRing = resolution * 2;
        const topPoleIndex = 1;
        const bottomPoleIndex = this.particles.length - 1;
        // Create triangles for the top cap
        for (let i = 0; i < particlesPerRing; i++) {
            const current = 2 + i;
            const next = 2 + ((i + 1) % particlesPerRing);
            this.surfaceTriangles.push([topPoleIndex, current, next]);
        }
        // Create triangles for the middle rings
        for (let ring = 0; ring < resolution - 2; ring++) {
            const ringStart = 2 + (ring * particlesPerRing);
            const nextRingStart = ringStart + particlesPerRing;
            for (let i = 0; i < particlesPerRing; i++) {
                const current = ringStart + i;
                const next = ringStart + ((i + 1) % particlesPerRing);
                const nextRingCurrent = nextRingStart + i;
                const nextRingNext = nextRingStart + ((i + 1) % particlesPerRing);
                // Add two triangles to form a quad
                this.surfaceTriangles.push([current, nextRingCurrent, next]);
                this.surfaceTriangles.push([next, nextRingCurrent, nextRingNext]);
            }
        }
        // Create triangles for the bottom cap
        const lastRingStart = 2 + ((resolution - 2) * particlesPerRing);
        for (let i = 0; i < particlesPerRing; i++) {
            const current = lastRingStart + i;
            const next = lastRingStart + ((i + 1) % particlesPerRing);
            this.surfaceTriangles.push([bottomPoleIndex, next, current]);
        }
    }
    // Create particles arranged in a spherical shape
    createParticles() {
        const radius = this.scale.x; // Using x as the radius value
        const resolution = this.params.resolution;
        // Generate points on a sphere using spherical coordinates
        // We'll create rings of particles from top to bottom
        // Add center particle for better stability
        this.particles.push(new Particle(this.position.copy(), this.params.mass));
        // Add top pole
        const topPole = new Particle(new Vec3([
            this.position.x,
            this.position.y + radius,
            this.position.z
        ]), this.params.mass);
        this.particles.push(topPole);
        // Create rings of particles
        for (let ring = 1; ring < resolution; ring++) {
            const phi = (Math.PI * ring) / resolution;
            const y = radius * Math.cos(phi);
            const sliceRadius = radius * Math.sin(phi);
            // Create particles around this ring
            for (let slice = 0; slice < resolution * 2; slice++) {
                const theta = (2 * Math.PI * slice) / (resolution * 2);
                const x = sliceRadius * Math.cos(theta);
                const z = sliceRadius * Math.sin(theta);
                this.particles.push(new Particle(new Vec3([
                    this.position.x + x,
                    this.position.y + y,
                    this.position.z + z
                ]), this.params.mass));
            }
        }
        // Add bottom pole
        const bottomPole = new Particle(new Vec3([
            this.position.x,
            this.position.y - radius,
            this.position.z
        ]), this.params.mass);
        this.particles.push(bottomPole);
    }
    // Create springs connecting the particles
    createSprings() {
        const resolution = this.params.resolution;
        const particlesPerRing = resolution * 2;
        const centerIndex = 0;
        const topPoleIndex = 1;
        const bottomPoleIndex = this.particles.length - 1;
        // Connect center to poles for better stability
        createEdge(this.particles, this.springs, centerIndex, topPoleIndex, this.params.stiffness, this.params.damping);
        createEdge(this.particles, this.springs, centerIndex, bottomPoleIndex, this.params.stiffness, this.params.damping);
        // Connect top pole to first ring
        for (let i = 0; i < particlesPerRing; i++) {
            const firstRingIndex = 2 + i;
            createEdge(this.particles, this.springs, topPoleIndex, firstRingIndex, this.params.stiffness, this.params.damping);
            // Also connect to center for better stability
            createEdge(this.particles, this.springs, centerIndex, firstRingIndex, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
        }
        // Connect rings
        for (let ring = 0; ring < resolution - 1; ring++) {
            const ringStartIndex = 2 + (ring * particlesPerRing);
            // Connect particles within the same ring
            for (let i = 0; i < particlesPerRing; i++) {
                const currentIndex = ringStartIndex + i;
                const nextIndex = ringStartIndex + ((i + 1) % particlesPerRing);
                // Create structural springs around the ring
                createEdge(this.particles, this.springs, currentIndex, nextIndex, this.params.stiffness, this.params.damping);
                // Create bend springs for better stability (skipping one particle)
                const skipIndex = ringStartIndex + ((i + 2) % particlesPerRing);
                createEdge(this.particles, this.springs, currentIndex, skipIndex, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
                // Connect to next ring
                if (ring < resolution - 2) {
                    const nextRingIndex = currentIndex + particlesPerRing;
                    createEdge(this.particles, this.springs, currentIndex, nextRingIndex, this.params.stiffness, this.params.damping);
                    // Create shear springs to next ring
                    const nextRingNextIndex = ringStartIndex + particlesPerRing + ((i + 1) % particlesPerRing);
                    createEdge(this.particles, this.springs, currentIndex, nextRingNextIndex, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                    const nextRingPrevIndex = ringStartIndex + particlesPerRing + ((i - 1 + particlesPerRing) % particlesPerRing);
                    createEdge(this.particles, this.springs, currentIndex, nextRingPrevIndex, this.params.stiffness * 0.7, this.params.damping, SpringType.SHEAR);
                }
            }
        }
        // Connect bottom pole to last ring
        const lastRingStart = 2 + ((resolution - 2) * particlesPerRing);
        for (let i = 0; i < particlesPerRing; i++) {
            const lastRingIndex = lastRingStart + i;
            createEdge(this.particles, this.springs, bottomPoleIndex, lastRingIndex, this.params.stiffness, this.params.damping);
            // Also connect to center for better stability
            createEdge(this.particles, this.springs, centerIndex, lastRingIndex, this.params.stiffness * 0.5, this.params.damping, SpringType.BEND);
        }
    }
}
//# sourceMappingURL=SquishySphere.js.map