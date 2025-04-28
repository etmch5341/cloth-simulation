import { Vec3 } from "../lib/TSM.js";
import { Particle } from "./Particle.js";
import { Spring, SpringType } from "./Spring.js";
export var FabricType;
(function (FabricType) {
    FabricType[FabricType["COTTON"] = 0] = "COTTON";
    FabricType[FabricType["SILK"] = 1] = "SILK";
    FabricType[FabricType["LEATHER"] = 2] = "LEATHER";
    FabricType[FabricType["RUBBER"] = 3] = "RUBBER";
})(FabricType || (FabricType = {}));
export const FABRIC_PRESETS = new Map([
    [FabricType.COTTON, {
            structuralStiffness: 5000,
            shearStiffness: 100,
            bendStiffness: 10,
            damping: 25,
            mass: 1.0,
            stretchFactor: 1.05
        }],
    [FabricType.SILK, {
            structuralStiffness: 1000,
            shearStiffness: 50,
            bendStiffness: 5,
            damping: 15,
            mass: 0.5,
            stretchFactor: 1.1
        }],
    [FabricType.LEATHER, {
            structuralStiffness: 10000,
            shearStiffness: 5000,
            bendStiffness: 1000,
            damping: 50,
            mass: 2.0,
            stretchFactor: 1.01
        }],
    [FabricType.RUBBER, {
            structuralStiffness: 500,
            shearStiffness: 200,
            bendStiffness: 100,
            damping: 5,
            mass: 1.5,
            stretchFactor: 1.5
        }]
]);
export class Cloth {
    constructor(width, height, rows, cols, fabricType = FabricType.COTTON) {
        // Physics parameters
        this.gravity = new Vec3([0, -9.8, 0]);
        this.windDirection = new Vec3([0, 0, 1]);
        this.windStrength = 0;
        // Collision objects
        this.collisionObjects = [];
        // Statistics for benchmarking
        this.totalEnergy = 0;
        this.width = width;
        this.height = height;
        this.rows = rows;
        this.cols = cols;
        this.fabricType = fabricType;
        this.particleSpacing = width / (cols - 1);
        this.particles = [];
        this.springs = [];
        // Create particles in a grid
        this.createParticleGrid(rows, cols);
        // Create springs between particles
        this.createSprings();
    }
    createParticleGrid(rows, cols) {
        // Initialize the grid
        for (let i = 0; i < rows; i++) {
            this.particles[i] = [];
            for (let j = 0; j < cols; j++) {
                // Calculate position in 3D space
                const x = (j * this.particleSpacing) - (this.width / 2);
                const y = 2; // Height above ground
                const z = (i * this.particleSpacing) - (this.height / 2);
                // Create the particle
                const particle = new Particle(new Vec3([x, y, z]), FABRIC_PRESETS.get(this.fabricType).mass);
                // Fix the top row particles
                if (i === 0 && (j === 0 || j === cols - 1)) {
                    particle.setFixed(true);
                }
                this.particles[i][j] = particle;
            }
        }
    }
    createSprings() {
        const props = FABRIC_PRESETS.get(this.fabricType);
        // Structural springs (horizontal and vertical)
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const current = this.particles[i][j];
                // Connect to right neighbor
                if (j < this.cols - 1) {
                    this.springs.push(new Spring(current, this.particles[i][j + 1], props.structuralStiffness, props.damping, SpringType.STRUCTURAL));
                }
                // Connect to bottom neighbor
                if (i < this.rows - 1) {
                    this.springs.push(new Spring(current, this.particles[i + 1][j], props.structuralStiffness, props.damping, SpringType.STRUCTURAL));
                }
                // Shear springs (diagonal)
                if (i < this.rows - 1 && j < this.cols - 1) {
                    this.springs.push(new Spring(current, this.particles[i + 1][j + 1], props.shearStiffness, props.damping, SpringType.SHEAR));
                }
                if (i < this.rows - 1 && j > 0) {
                    this.springs.push(new Spring(current, this.particles[i + 1][j - 1], props.shearStiffness, props.damping, SpringType.SHEAR));
                }
                // Bend springs (two particles away)
                if (j < this.cols - 2) {
                    this.springs.push(new Spring(current, this.particles[i][j + 2], props.bendStiffness, props.damping, SpringType.BEND));
                }
                if (i < this.rows - 2) {
                    this.springs.push(new Spring(current, this.particles[i + 2][j], props.bendStiffness, props.damping, SpringType.BEND));
                }
            }
        }
    }
    // Update cloth simulation using Verlet integration
    update(dt) {
        // Apply external forces
        this.applyGravity();
        if (this.windStrength > 0) {
            this.applyWind();
        }
        // Update springs
        for (const spring of this.springs) {
            spring.update();
        }
        // Update particles
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.particles[i][j].update(dt);
            }
        }
        // Handle collisions
        this.handleCollisions();
        // Solve position constraints
        this.solveConstraints(3);
        // Calculate total energy
        this.calculateTotalEnergy();
    }
    // Position-based dynamics update
    updatePBD(dt) {
        // Apply external forces
        this.applyGravity();
        if (this.windStrength > 0) {
            this.applyWind();
        }
        // Update predicted positions
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const particle = this.particles[i][j];
                if (!particle.isFixed) {
                    // Update velocity with forces
                    particle.velocity.add(particle.acceleration.copy().scale(dt));
                    // Store old position
                    particle.oldPosition = particle.position.copy();
                    // Update predicted position
                    particle.position.add(particle.velocity.copy().scale(dt));
                    // Reset acceleration
                    particle.acceleration = new Vec3([0, 0, 0]);
                }
            }
        }
        // Solve constraints
        this.solveConstraints(10);
        // Update velocities
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const particle = this.particles[i][j];
                if (!particle.isFixed) {
                    // Update velocity based on position change
                    particle.velocity = particle.position.copy().subtract(particle.oldPosition).scale(1.0 / dt);
                }
            }
        }
        // Handle collisions
        this.handleCollisions();
        // Calculate total energy
        this.calculateTotalEnergy();
    }
    solveConstraints(iterations) {
        for (let i = 0; i < iterations; i++) {
            for (const spring of this.springs) {
                spring.solveConstraint();
            }
        }
    }
    applyGravity() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const particle = this.particles[i][j];
                if (!particle.isFixed) {
                    particle.addForce(this.gravity.copy().scale(particle.mass));
                }
            }
        }
    }
    applyWind() {
        // Process each quad in the cloth mesh
        for (let i = 0; i < this.rows - 1; i++) {
            for (let j = 0; j < this.cols - 1; j++) {
                const p1 = this.particles[i][j];
                const p2 = this.particles[i][j + 1];
                const p3 = this.particles[i + 1][j + 1];
                const p4 = this.particles[i + 1][j];
                // Calculate quad normal (average of two triangles)
                const edge1 = p2.position.copy().subtract(p1.position);
                const edge2 = p4.position.copy().subtract(p1.position);
                const normal1 = Vec3.cross(edge1, edge2).normalize();
                const edge3 = p3.position.copy().subtract(p2.position);
                const edge4 = p4.position.copy().subtract(p3.position);
                const normal2 = Vec3.cross(edge3, edge4).normalize();
                const quadNormal = normal1.add(normal2).normalize();
                // Calculate area of the quad
                const area = Vec3.cross(edge1, edge2).length() * 0.5;
                // Wind force is proportional to normal component
                const windEffect = Vec3.dot(quadNormal, this.windDirection.normalize());
                // Force increases with square of windStrength to simulate realistic aerodynamics
                const forceMagnitude = windEffect * this.windStrength * this.windStrength * area;
                if (forceMagnitude > 0) { // Only apply force if wind is hitting the front of the cloth
                    const force = this.windDirection.copy().normalize().scale(forceMagnitude);
                    // Apply to all particles of this quad
                    p1.addForce(force.copy().scale(0.25));
                    p2.addForce(force.copy().scale(0.25));
                    p3.addForce(force.copy().scale(0.25));
                    p4.addForce(force.copy().scale(0.25));
                }
            }
        }
    }
    handleCollisions() {
        // Floor collision
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const particle = this.particles[i][j];
                // Floor collision at y=0
                if (particle.position.y < 0) {
                    particle.position.y = 0;
                    particle.velocity.y *= -0.5; // Bounce with energy loss
                    // Add friction
                    particle.velocity.x *= 0.9;
                    particle.velocity.z *= 0.9;
                }
            }
        }
        // Object collisions
        for (const collider of this.collisionObjects) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    const particle = this.particles[i][j];
                    const result = collider.checkCollision(particle.position, 0.01);
                    if (result.collides) {
                        particle.position.add(result.penetration);
                        // Update velocity to reflect bounce
                        const normal = result.penetration.normalize();
                        const velDotNormal = Vec3.dot(particle.velocity, normal);
                        if (velDotNormal < 0) {
                            const reflection = normal.scale(-2 * velDotNormal);
                            particle.velocity.add(reflection);
                            // Add some energy loss
                            particle.velocity.scale(0.8);
                        }
                    }
                }
            }
        }
        // Self-collision is handled in a separate method if needed
    }
    // Add a collision object to the simulation
    addCollisionObject(object) {
        this.collisionObjects.push(object);
    }
    // Remove all collision objects
    clearCollisionObjects() {
        this.collisionObjects = [];
    }
    // Cut cloth along a ray
    cutCloth(rayOrigin, rayDirection, cutRadius = 0.1) {
        const springsToRemove = [];
        // Find all springs intersecting the ray
        for (const spring of this.springs) {
            if (!spring.broken && this.rayIntersectsSpring(rayOrigin, rayDirection, spring, cutRadius)) {
                springsToRemove.push(spring);
            }
        }
        // Break springs
        for (const spring of springsToRemove) {
            spring.broken = true;
        }
    }
    rayIntersectsSpring(rayOrigin, rayDir, spring, radius) {
        // Get line segment points
        const p1 = spring.particleA.position;
        const p2 = spring.particleB.position;
        // Line segment vectors
        const v1 = rayDir;
        const v2 = p2.copy().subtract(p1);
        const v3 = p1.copy().subtract(rayOrigin);
        // Calculate parameters
        const crossV1V2 = Vec3.cross(v1, v2);
        const lengthCrossV1V2Squared = Vec3.dot(crossV1V2, crossV1V2);
        // If lines are parallel, check distance from ray origin to line segment
        if (lengthCrossV1V2Squared < 1e-10) {
            // Calculate projection of ray origin onto line segment
            const t = Vec3.dot(v3, v2) / Vec3.dot(v2, v2);
            const clampedT = Math.max(0, Math.min(1, t));
            const closestPoint = Vec3.sum(p1, v2.scale(clampedT));
            return Vec3.distance(rayOrigin, closestPoint) < radius;
        }
        // Calculate closest points
        const t1 = Vec3.dot(Vec3.cross(v3, v2), crossV1V2) / lengthCrossV1V2Squared;
        const t2 = Vec3.dot(Vec3.cross(v3, v1), crossV1V2) / lengthCrossV1V2Squared;
        // Check if closest point is within line segment
        if (t2 < 0 || t2 > 1) {
            return false;
        }
        // Calculate closest points on each line
        const closestPointOnRay = Vec3.sum(rayOrigin, v1.scale(t1));
        const closestPointOnSegment = Vec3.sum(p1, v2.scale(t2));
        // Check distance
        return Vec3.distance(closestPointOnRay, closestPointOnSegment) < radius;
    }
    // Calculate total energy of the system
    calculateTotalEnergy() {
        let energy = 0;
        // Kinetic energy
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const particle = this.particles[i][j];
                if (!particle.isFixed) {
                    energy += 0.5 * particle.mass * Vec3.dot(particle.velocity, particle.velocity);
                }
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
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const particle = this.particles[i][j];
                if (!particle.isFixed) {
                    energy += -particle.mass * Vec3.dot(this.gravity, particle.position);
                }
            }
        }
        this.totalEnergy = energy;
    }
    // Reset the cloth to its initial state
    reset() {
        // Clear existing particles and springs
        this.particles = [];
        this.springs = [];
        // Recreate the cloth
        this.createParticleGrid(this.rows, this.cols);
        this.createSprings();
    }
    // Generate mesh data for rendering
    generateMeshData() {
        // Create arrays for vertex data
        const vertexCount = this.rows * this.cols;
        const triangleCount = (this.rows - 1) * (this.cols - 1) * 2;
        const positions = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);
        const indices = new Uint32Array(triangleCount * 3);
        const uvs = new Float32Array(vertexCount * 2);
        // Fill positions and UVs
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const idx = i * this.cols + j;
                const particle = this.particles[i][j];
                // Position
                positions[idx * 3] = particle.position.x;
                positions[idx * 3 + 1] = particle.position.y;
                positions[idx * 3 + 2] = particle.position.z;
                // UVs
                uvs[idx * 2] = j / (this.cols - 1);
                uvs[idx * 2 + 1] = i / (this.rows - 1);
            }
        }
        // Fill indices (triangles)
        let index = 0;
        for (let i = 0; i < this.rows - 1; i++) {
            for (let j = 0; j < this.cols - 1; j++) {
                const topLeft = i * this.cols + j;
                const topRight = topLeft + 1;
                const bottomLeft = (i + 1) * this.cols + j;
                const bottomRight = bottomLeft + 1;
                // First triangle
                indices[index++] = topLeft;
                indices[index++] = bottomLeft;
                indices[index++] = topRight;
                // Second triangle
                indices[index++] = topRight;
                indices[index++] = bottomLeft;
                indices[index++] = bottomRight;
            }
        }
        // Calculate normals
        this.calculateNormals(positions, indices, normals);
        return { positions, normals, indices, uvs };
    }
    // Generate data for rendering springs
    generateSpringMeshData() {
        const springCount = this.springs.length;
        const positions = new Float32Array(springCount * 2 * 3); // 2 points per spring, 3 coords per point
        const colors = new Float32Array(springCount * 2 * 3); // RGB for each point
        const indices = new Uint32Array(springCount * 2); // 2 indices per spring
        let vertIndex = 0;
        let idxIndex = 0;
        for (let i = 0; i < springCount; i++) {
            const spring = this.springs[i];
            if (spring.broken) {
                // Skip broken springs or render them differently
                continue;
            }
            // First particle position
            positions[vertIndex] = spring.particleA.position.x;
            positions[vertIndex + 1] = spring.particleA.position.y;
            positions[vertIndex + 2] = spring.particleA.position.z;
            // Second particle position
            positions[vertIndex + 3] = spring.particleB.position.x;
            positions[vertIndex + 4] = spring.particleB.position.y;
            positions[vertIndex + 5] = spring.particleB.position.z;
            // Colors based on spring type
            let r = 0, g = 0, b = 0;
            switch (spring.type) {
                case SpringType.STRUCTURAL:
                    r = 1.0;
                    g = 0.0;
                    b = 0.0; // Red for structural
                    break;
                case SpringType.SHEAR:
                    r = 0.0;
                    g = 1.0;
                    b = 0.0; // Green for shear
                    break;
                case SpringType.BEND:
                    r = 0.0;
                    g = 0.0;
                    b = 1.0; // Blue for bend
                    break;
            }
            // First particle color
            colors[vertIndex] = r;
            colors[vertIndex + 1] = g;
            colors[vertIndex + 2] = b;
            // Second particle color
            colors[vertIndex + 3] = r;
            colors[vertIndex + 4] = g;
            colors[vertIndex + 5] = b;
            // Indices
            indices[idxIndex] = vertIndex / 3;
            indices[idxIndex + 1] = vertIndex / 3 + 1;
            vertIndex += 6;
            idxIndex += 2;
        }
        // If we skipped some broken springs, trim the arrays
        if (vertIndex < positions.length) {
            const actualPositions = new Float32Array(vertIndex);
            const actualColors = new Float32Array(vertIndex);
            const actualIndices = new Uint32Array(idxIndex);
            for (let i = 0; i < vertIndex; i++) {
                actualPositions[i] = positions[i];
                actualColors[i] = colors[i];
            }
            for (let i = 0; i < idxIndex; i++) {
                actualIndices[i] = indices[i];
            }
            return { positions: actualPositions, colors: actualColors, indices: actualIndices };
        }
        return { positions, colors, indices };
    }
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
            const normal = new Vec3([normals[i], normals[i + 1], normals[i + 2]]).normalize();
            normals[i] = normal.x;
            normals[i + 1] = normal.y;
            normals[i + 2] = normal.z;
        }
    }
    // Clone this cloth
    clone() {
        const newCloth = new Cloth(this.width, this.height, this.rows, this.cols, this.fabricType);
        // Copy particle data
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const srcParticle = this.particles[i][j];
                const destParticle = newCloth.particles[i][j];
                destParticle.position = srcParticle.position.copy();
                destParticle.oldPosition = srcParticle.oldPosition.copy();
                destParticle.velocity = srcParticle.velocity.copy();
                destParticle.isFixed = srcParticle.isFixed;
                destParticle.mass = srcParticle.mass;
            }
        }
        // Copy spring data
        for (let i = 0; i < this.springs.length; i++) {
            if (i < newCloth.springs.length) {
                newCloth.springs[i].broken = this.springs[i].broken;
            }
        }
        return newCloth;
    }
}
// Sphere collider implementation
export class SphereCollider {
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
    checkCollision(point, radius) {
        const direction = point.copy().subtract(this.center);
        const distance = direction.length();
        const minDistance = this.radius + radius;
        if (distance < minDistance) {
            // Calculate penetration vector
            direction.normalize();
            const penetration = direction.scale(minDistance - distance);
            return { collides: true, penetration };
        }
        return { collides: false, penetration: new Vec3([0, 0, 0]) };
    }
}
// Box collider implementation
export class BoxCollider {
    constructor(center, size) {
        this.center = center;
        this.size = size;
        this.halfSize = size.copy().scale(0.5);
    }
    checkCollision(point, radius) {
        // Transform point to box local space
        const localPoint = point.copy().subtract(this.center);
        // Find closest point on box
        const closestPoint = new Vec3([
            Math.max(-this.halfSize.x, Math.min(this.halfSize.x, localPoint.x)),
            Math.max(-this.halfSize.y, Math.min(this.halfSize.y, localPoint.y)),
            Math.max(-this.halfSize.z, Math.min(this.halfSize.z, localPoint.z))
        ]);
        // Calculate distance to closest point
        const direction = localPoint.copy().subtract(closestPoint);
        const distance = direction.length();
        // Check if point is inside the box (adjusted by radius)
        if (distance < radius) {
            // If distance is zero, point is inside box, choose arbitrary direction
            if (distance < 1e-6) {
                // Find closest face and push out in that direction
                let minDist = this.halfSize.x - Math.abs(localPoint.x);
                let axis = new Vec3([localPoint.x > 0 ? 1 : -1, 0, 0]);
                if (this.halfSize.y - Math.abs(localPoint.y) < minDist) {
                    minDist = this.halfSize.y - Math.abs(localPoint.y);
                    axis = new Vec3([0, localPoint.y > 0 ? 1 : -1, 0]);
                }
                if (this.halfSize.z - Math.abs(localPoint.z) < minDist) {
                    minDist = this.halfSize.z - Math.abs(localPoint.z);
                    axis = new Vec3([0, 0, localPoint.z > 0 ? 1 : -1]);
                }
                const penetration = axis.scale(radius + minDist);
                return { collides: true, penetration };
            }
            else {
                const penetration = direction.normalize().scale(radius - distance);
                return { collides: true, penetration };
            }
        }
        return { collides: false, penetration: new Vec3([0, 0, 0]) };
    }
}
//# sourceMappingURL=Cloth.js.map