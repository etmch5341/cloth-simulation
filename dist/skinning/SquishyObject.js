import { Vec3 } from "../lib/TSM.js";
import { Spring, SpringType } from "./Spring.js";
// Material types for squishy objects
export var SquishyMaterial;
(function (SquishyMaterial) {
    SquishyMaterial[SquishyMaterial["JELLY"] = 0] = "JELLY";
    SquishyMaterial[SquishyMaterial["RUBBER"] = 1] = "RUBBER";
    SquishyMaterial[SquishyMaterial["SLIME"] = 2] = "SLIME";
    SquishyMaterial[SquishyMaterial["WATER_BALLOON"] = 3] = "WATER_BALLOON";
})(SquishyMaterial || (SquishyMaterial = {}));
// Shape types for squishy objects
export var SquishyShape;
(function (SquishyShape) {
    SquishyShape[SquishyShape["SPHERE"] = 0] = "SPHERE";
    SquishyShape[SquishyShape["TORUS"] = 1] = "TORUS";
    SquishyShape[SquishyShape["CUBE"] = 2] = "CUBE";
    SquishyShape[SquishyShape["PYRAMID"] = 3] = "PYRAMID";
})(SquishyShape || (SquishyShape = {}));
// Preset physics profiles for different material types - REVISED VALUES
export const SQUISHY_PRESETS = new Map([
    [SquishyMaterial.JELLY, {
            stiffness: 100, // Reduced from 300
            damping: 5.0, // Increased from 0.8
            mass: 1.0,
            pressure: 1.0, // Reduced from 3.0
            collisionResponse: 0.3,
            resolution: 8
        }],
    [SquishyMaterial.RUBBER, {
            stiffness: 200, // Reduced from 1000
            damping: 7.0, // Reduced from 10
            mass: 1.5, // Reduced from 2.0
            pressure: 5.0, // Reduced from 20.0
            collisionResponse: 0.5, // Reduced from 0.7
            resolution: 10 // Reduced from 12
        }],
    [SquishyMaterial.SLIME, {
            stiffness: 30, // Reduced from 80
            damping: 2.0, // Reduced from 3
            mass: 0.8,
            pressure: 0.5, // Reduced from 2.0
            collisionResponse: 0.2, // Reduced from 0.3
            resolution: 8 // Reduced from 12
        }],
    [SquishyMaterial.WATER_BALLOON, {
            stiffness: 50, // Reduced from 150
            damping: 3.0, // Reduced from 5
            mass: 0.9, // Reduced from 1.0
            pressure: 7.0, // Reduced from 30.0
            collisionResponse: 0.4, // Reduced from 0.6
            resolution: 10 // Reduced from 12
        }]
]);
// Base class for squishy objects
export class SquishyObject {
    constructor(position, scale, material, shape) {
        // Particle system
        this.particles = [];
        this.springs = [];
        // Surface triangles for rendering and volume calculations
        this.surfaceTriangles = [];
        // Physics simulation properties
        this.gravity = new Vec3([0, -9.8, 0]);
        this.collisionObjects = [];
        this.lastVolume = 0;
        this.initialVolume = 0;
        this.pinConstraints = []; // Indices of fixed particles
        // For monitoring and stability
        this.totalEnergy = 0;
        this.velocityDamping = 0.99; // Global velocity damping
        this.position = position;
        this.scale = scale;
        this.material = material;
        this.shape = shape;
        this.params = SQUISHY_PRESETS.get(material);
        // Create the specific shape implementation
        this.createParticles();
        this.createSprings();
        this.createSurfaceTriangles();
        // Calculate initial volume
        this.initialVolume = this.calculateVolume();
        this.lastVolume = this.initialVolume;
    }
    // Update the squishy object simulation
    update(dt) {
        // Use a sub-step approach for more stable simulation
        const numSubsteps = 3; // Increase for more stability, at cost of performance
        const subDt = dt / numSubsteps;
        for (let i = 0; i < numSubsteps; i++) {
            this.updateSubstep(subDt);
        }
        // Calculate total energy
        this.calculateTotalEnergy();
        // Monitor system for extreme values
        this.enforceStability();
    }
    // Single substep of the simulation
    updateSubstep(dt) {
        // Reset accelerations
        for (const particle of this.particles) {
            particle.acceleration = new Vec3([0, 0, 0]);
        }
        // Apply external forces
        this.applyGravity();
        this.applyPressure();
        // Update springs
        for (const spring of this.springs) {
            spring.update();
        }
        // Apply velocity damping for stability
        for (const particle of this.particles) {
            if (!particle.isFixed) {
                particle.velocity.scale(this.velocityDamping);
            }
        }
        // Update particles
        for (const particle of this.particles) {
            particle.update(dt);
        }
        // Handle collisions
        this.handleCollisions();
        // Solve position constraints
        this.solveConstraints(3);
    }
    // Apply gravity to all particles
    applyGravity() {
        for (const particle of this.particles) {
            if (!particle.isFixed) {
                particle.addForce(this.gravity.copy().scale(particle.mass));
            }
        }
    }
    // Apply internal pressure force to maintain volume
    applyPressure() {
        if (this.params.pressure <= 0)
            return;
        // Calculate current volume
        const currentVolume = this.calculateVolume();
        // Prevent division by zero and limit extreme volume changes
        const safeCurrentVolume = Math.max(currentVolume, this.initialVolume * 0.01);
        // Calculate pressure force based on volume difference
        const volumeRatio = this.initialVolume / safeCurrentVolume;
        // Clamp pressure force to prevent explosion
        const maxPressureFactor = 5.0;
        const safePressureFactor = Math.min(volumeRatio - 1.0, maxPressureFactor);
        const pressureMagnitude = this.params.pressure * safePressureFactor;
        // Apply pressure forces to each surface triangle
        for (const triangle of this.surfaceTriangles) {
            const p1 = this.particles[triangle[0]];
            const p2 = this.particles[triangle[1]];
            const p3 = this.particles[triangle[2]];
            // Calculate triangle normal and area
            const edge1 = p2.position.copy().subtract(p1.position);
            const edge2 = p3.position.copy().subtract(p1.position);
            const normal = Vec3.cross(edge1, edge2);
            const area = normal.length() * 0.5;
            // Skip degenerate triangles
            if (area < 0.00001)
                continue;
            normal.normalize();
            // Force is proportional to area, pointing in normal direction
            const force = normal.scale(pressureMagnitude * area);
            // Distribute force to each particle
            p1.addForce(force.copy().scale(1 / 3));
            p2.addForce(force.copy().scale(1 / 3));
            p3.addForce(force.copy().scale(1 / 3));
        }
        this.lastVolume = currentVolume;
    }
    // Calculate the volume of the object using triangular mesh
    calculateVolume() {
        let volume = 0;
        // Calculate volume using the divergence theorem
        for (const triangle of this.surfaceTriangles) {
            const p1 = this.particles[triangle[0]].position;
            const p2 = this.particles[triangle[1]].position;
            const p3 = this.particles[triangle[2]].position;
            // Calculate signed volume of tetrahedron
            const v321 = p3.x * p2.y * p1.z;
            const v231 = p2.x * p3.y * p1.z;
            const v312 = p3.x * p1.y * p2.z;
            const v132 = p1.x * p3.y * p2.z;
            const v213 = p2.x * p1.y * p3.z;
            const v123 = p1.x * p2.y * p3.z;
            volume += (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
        }
        return Math.abs(volume);
    }
    // Solve constraints iteratively
    solveConstraints(iterations) {
        // Fixed particle constraints
        for (const particleIdx of this.pinConstraints) {
            const particle = this.particles[particleIdx];
            if (particle.isFixed) {
                // Keep fixed particles in place
                particle.position = particle.oldPosition.copy();
                particle.velocity = new Vec3([0, 0, 0]);
            }
        }
        // Spring constraints
        for (let i = 0; i < iterations; i++) {
            for (const spring of this.springs) {
                spring.solveConstraint();
            }
        }
    }
    // Handle collisions with objects and the ground
    handleCollisions() {
        // Basic ground collision at y=0
        for (const particle of this.particles) {
            if (!particle.isFixed) {
                // Floor collision at y=-2
                if (particle.position.y < -2.0) {
                    // Move back above floor
                    particle.position.y = -1.99; // Small offset to prevent oscillation
                    // Apply higher damping for floor collisions
                    particle.velocity.y *= -this.params.collisionResponse;
                    // Add stronger friction
                    particle.velocity.x *= 0.8;
                    particle.velocity.z *= 0.8;
                }
            }
        }
        // Handle collisions with other objects
        for (const collider of this.collisionObjects) {
            for (const particle of this.particles) {
                if (!particle.isFixed) {
                    const result = collider.checkCollision(particle.position, 0.1);
                    if (result.collides) {
                        particle.position.add(result.penetration);
                        // Update velocity to reflect bounce with energy loss
                        const normal = result.penetration.normalize();
                        const velDotNormal = Vec3.dot(particle.velocity, normal);
                        if (velDotNormal < 0) {
                            const reflection = normal.scale(-2 * velDotNormal * this.params.collisionResponse);
                            particle.velocity.add(reflection);
                        }
                    }
                }
            }
        }
    }
    // Add a collision object to interact with
    addCollisionObject(object) {
        this.collisionObjects.push(object);
    }
    // Check for stability and enforce limits to prevent explosion
    enforceStability() {
        const maxVelocity = 50.0;
        const maxDistance = 10.0 * Math.max(this.scale.x, this.scale.y, this.scale.z);
        let unstableParticles = false;
        // Check if any particles have extreme values
        for (const particle of this.particles) {
            if (!particle.isFixed) {
                // Check for NaN values
                if (isNaN(particle.position.x) || isNaN(particle.position.y) || isNaN(particle.position.z) ||
                    isNaN(particle.velocity.x) || isNaN(particle.velocity.y) || isNaN(particle.velocity.z)) {
                    unstableParticles = true;
                    break;
                }
                // Check distance from center
                const distFromCenter = Vec3.distance(particle.position, this.position);
                if (distFromCenter > maxDistance) {
                    unstableParticles = true;
                    break;
                }
                // Check velocity magnitude
                const velocityMag = particle.velocity.length();
                if (velocityMag > maxVelocity) {
                    // Scale down velocity to prevent explosion
                    particle.velocity.scale(maxVelocity / velocityMag);
                }
            }
        }
        // Reset the simulation if it's becoming unstable
        if (unstableParticles) {
            console.warn("Squishy object became unstable, resetting...");
            this.reset();
        }
    }
    // Implementation of collision interface
    checkCollision(point, radius) {
        // Find closest particle to the point
        let closestDist = Infinity;
        let closestPenetration = new Vec3([0, 0, 0]);
        let hasCollision = false;
        // Check collision with each surface triangle
        for (const triangle of this.surfaceTriangles) {
            const p1 = this.particles[triangle[0]].position;
            const p2 = this.particles[triangle[1]].position;
            const p3 = this.particles[triangle[2]].position;
            // Calculate closest point on triangle to the test point
            const result = this.closestPointOnTriangle(point, p1, p2, p3);
            const dist = Vec3.distance(result, point);
            if (dist < radius && dist < closestDist) {
                closestDist = dist;
                const direction = point.copy().subtract(result).normalize();
                closestPenetration = direction.scale(radius - dist);
                hasCollision = true;
            }
        }
        return { collides: hasCollision, penetration: closestPenetration };
    }
    // Calculate closest point on triangle to a point
    closestPointOnTriangle(p, a, b, c) {
        // Check if point is directly above/below triangle
        const ab = b.copy().subtract(a);
        const ac = c.copy().subtract(a);
        const normal = Vec3.cross(ab, ac).normalize();
        // Project point onto triangle plane
        const ap = p.copy().subtract(a);
        const projection = ap.copy().subtract(normal.copy().scale(Vec3.dot(ap, normal)));
        const projectedPoint = a.copy().add(projection);
        // Check if projected point is inside triangle
        const areaABC = Vec3.cross(ab, ac).length() * 0.5;
        const abp = Vec3.cross(ab, projectedPoint.copy().subtract(a));
        const acp = Vec3.cross(projectedPoint.copy().subtract(a), ac);
        const bcp = Vec3.cross(projectedPoint.copy().subtract(b), c.copy().subtract(b));
        if (Vec3.dot(abp, normal) >= 0 &&
            Vec3.dot(acp, normal) >= 0 &&
            Vec3.dot(bcp, normal) >= 0) {
            // Point is inside triangle
            return projectedPoint;
        }
        // Point is outside triangle, find closest edge or vertex
        const distToAB = this.closestPointOnSegment(p, a, b);
        const distToBC = this.closestPointOnSegment(p, b, c);
        const distToCA = this.closestPointOnSegment(p, c, a);
        const distToA = Vec3.distance(p, a);
        const distToB = Vec3.distance(p, b);
        const distToC = Vec3.distance(p, c);
        // Find minimum distance
        const minDist = Math.min(distToAB.dist, distToBC.dist, distToCA.dist, distToA, distToB, distToC);
        if (minDist === distToAB.dist)
            return distToAB.point;
        if (minDist === distToBC.dist)
            return distToBC.point;
        if (minDist === distToCA.dist)
            return distToCA.point;
        if (minDist === distToA)
            return a.copy();
        if (minDist === distToB)
            return b.copy();
        return c.copy();
    }
    // Find closest point on a line segment
    closestPointOnSegment(p, a, b) {
        const ab = b.copy().subtract(a);
        const ap = p.copy().subtract(a);
        const abLength2 = Vec3.dot(ab, ab);
        const apDotAb = Vec3.dot(ap, ab);
        // Calculate normalized projection parameter
        let t = apDotAb / abLength2;
        t = Math.max(0, Math.min(1, t)); // Clamp to segment
        const closest = a.copy().add(ab.scale(t));
        const dist = Vec3.distance(p, closest);
        return { point: closest, dist: dist };
    }
    // Calculate total energy of the system
    calculateTotalEnergy() {
        let energy = 0;
        // Kinetic energy
        for (const particle of this.particles) {
            if (!particle.isFixed) {
                energy += 0.5 * particle.mass * Vec3.dot(particle.velocity, particle.velocity);
            }
        }
        // Potential energy (springs)
        for (const spring of this.springs) {
            if (!spring.broken) {
                const currentLength = Vec3.distance(spring.particleA.position, spring.particleB.position);
                const stretch = currentLength - spring.restLength;
                energy += 0.5 * spring.stiffness * stretch * stretch;
            }
        }
        // Gravitational potential energy
        for (const particle of this.particles) {
            if (!particle.isFixed) {
                energy += -particle.mass * Vec3.dot(this.gravity, particle.position);
            }
        }
        this.totalEnergy = energy;
    }
    // Pin/unpin particles at specified indices
    pinParticle(index, fixed) {
        if (index >= 0 && index < this.particles.length) {
            this.particles[index].setFixed(fixed);
            // Add to pin constraints if not already there
            if (fixed && this.pinConstraints.indexOf(index) === -1) {
                this.pinConstraints.push(index);
            }
            else if (!fixed) {
                // Remove from pin constraints
                const idx = this.pinConstraints.indexOf(index);
                if (idx >= 0) {
                    this.pinConstraints.splice(idx, 1);
                }
            }
        }
    }
    // Reset the object to its original state
    reset() {
        // Recreate all particles and springs
        this.particles = [];
        this.springs = [];
        this.pinConstraints = [];
        this.surfaceTriangles = [];
        this.createParticles();
        this.createSprings();
        this.createSurfaceTriangles();
        // Recalculate initial volume
        this.initialVolume = this.calculateVolume();
        this.lastVolume = this.initialVolume;
    }
    // Generate mesh data for rendering
    generateMeshData() {
        const vertexCount = this.particles.length;
        const indexCount = this.surfaceTriangles.length * 3;
        const positions = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);
        const indices = new Uint32Array(indexCount);
        const colors = new Float32Array(vertexCount * 3);
        // Fill positions
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            positions[i * 3] = particle.position.x;
            positions[i * 3 + 1] = particle.position.y;
            positions[i * 3 + 2] = particle.position.z;
            // Default color - will be updated based on material
            colors[i * 3] = 0.7;
            colors[i * 3 + 1] = 0.2;
            colors[i * 3 + 2] = 0.8;
        }
        // Fill indices
        for (let i = 0; i < this.surfaceTriangles.length; i++) {
            const triangle = this.surfaceTriangles[i];
            indices[i * 3] = triangle[0];
            indices[i * 3 + 1] = triangle[1];
            indices[i * 3 + 2] = triangle[2];
        }
        // Calculate normals
        this.calculateNormals(positions, indices, normals);
        // Set colors based on material
        this.setMaterialColors(colors);
        return { positions, normals, indices, colors };
    }
    // Calculate vertex normals
    calculateNormals(positions, indices, normals) {
        // Initialize normals to zero
        for (let i = 0; i < normals.length; i++) {
            normals[i] = 0;
        }
        // Calculate normals for each triangle and add to vertex normals
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i];
            const i2 = indices[i + 1];
            const i3 = indices[i + 2];
            // Get vertices of the triangle
            const v1 = new Vec3([
                positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]
            ]);
            const v2 = new Vec3([
                positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]
            ]);
            const v3 = new Vec3([
                positions[i3 * 3], positions[i3 * 3 + 1], positions[i3 * 3 + 2]
            ]);
            // Calculate triangle normal
            const edge1 = v2.copy().subtract(v1);
            const edge2 = v3.copy().subtract(v1);
            const normal = Vec3.cross(edge1, edge2).normalize();
            // Add to vertex normals
            normals[i1 * 3] += normal.x;
            normals[i1 * 3 + 1] += normal.y;
            normals[i1 * 3 + 2] += normal.z;
            normals[i2 * 3] += normal.x;
            normals[i2 * 3 + 1] += normal.y;
            normals[i2 * 3 + 2] += normal.z;
            normals[i3 * 3] += normal.x;
            normals[i3 * 3 + 1] += normal.y;
            normals[i3 * 3 + 2] += normal.z;
        }
        // Normalize all vertex normals
        for (let i = 0; i < normals.length; i += 3) {
            const normal = new Vec3([normals[i], normals[i + 1], normals[i + 2]]);
            const length = normal.length();
            // Avoid division by zero
            if (length > 0.00001) {
                normal.normalize();
                normals[i] = normal.x;
                normals[i + 1] = normal.y;
                normals[i + 2] = normal.z;
            }
            else {
                // Default normal if degenerate
                normals[i] = 0;
                normals[i + 1] = 1;
                normals[i + 2] = 0;
            }
        }
    }
    // Set vertex colors based on material
    setMaterialColors(colors) {
        let r = 0.7, g = 0.2, b = 0.8; // Default purple
        switch (this.material) {
            case SquishyMaterial.JELLY:
                r = 0.9;
                g = 0.3;
                b = 0.3; // Red jelly
                break;
            case SquishyMaterial.RUBBER:
                r = 0.2;
                g = 0.7;
                b = 0.2; // Green rubber
                break;
            case SquishyMaterial.SLIME:
                r = 0.3;
                g = 0.9;
                b = 0.4; // Bright green slime
                break;
            case SquishyMaterial.WATER_BALLOON:
                r = 0.2;
                g = 0.4;
                b = 0.9; // Blue water balloon
                break;
        }
        // Set all vertices to this color
        for (let i = 0; i < colors.length; i += 3) {
            colors[i] = r;
            colors[i + 1] = g;
            colors[i + 2] = b;
        }
    }
    clearCollisionObjects() {
        this.collisionObjects = [];
    }
}
// Helper function to create edges between particles
export function createEdge(particles, springs, i, j, stiffness, damping, type = SpringType.STRUCTURAL) {
    if (i >= 0 && i < particles.length && j >= 0 && j < particles.length) {
        springs.push(new Spring(particles[i], particles[j], stiffness, damping, type));
    }
}
//# sourceMappingURL=SquishyObject.js.map