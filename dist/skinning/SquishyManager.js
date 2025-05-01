import { Vec3, Vec4, Mat4 } from "../lib/TSM.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { SquishyMaterial } from "./SquishyObject.js";
import { SquishySphere } from "./SquishySphere.js";
import { SquishyTorus } from "./SquishyTorus.js";
import { SquishyCube } from "./SquishyCube.js";
import { SquishyPyramid } from "./SquishyPyramid.js";
import { SphereCollider } from "./CollisionObjects.js";
// Shader imports (we'll implement these later)
import { squishyVSText, squishyFSText, squishyWireframeVSText, squishyWireframeFSText, squishyPointsVSText, squishyPointsFSText } from "./SquishyShaders.js";
// Enum for rendering modes
export var SquishyRenderMode;
(function (SquishyRenderMode) {
    SquishyRenderMode[SquishyRenderMode["SHADED"] = 0] = "SHADED";
    SquishyRenderMode[SquishyRenderMode["WIREFRAME"] = 1] = "WIREFRAME";
    SquishyRenderMode[SquishyRenderMode["POINTS"] = 2] = "POINTS";
})(SquishyRenderMode || (SquishyRenderMode = {}));
// Available squishy object types
export var SquishyObjectType;
(function (SquishyObjectType) {
    SquishyObjectType[SquishyObjectType["SPHERE"] = 0] = "SPHERE";
    SquishyObjectType[SquishyObjectType["TORUS"] = 1] = "TORUS";
    SquishyObjectType[SquishyObjectType["CUBE"] = 2] = "CUBE";
    SquishyObjectType[SquishyObjectType["PYRAMID"] = 3] = "PYRAMID";
})(SquishyObjectType || (SquishyObjectType = {}));
export var SquishyShape;
(function (SquishyShape) {
    SquishyShape[SquishyShape["SPHERE"] = 0] = "SPHERE";
    SquishyShape[SquishyShape["TORUS"] = 1] = "TORUS";
    SquishyShape[SquishyShape["CUBE"] = 2] = "CUBE";
    SquishyShape[SquishyShape["PYRAMID"] = 3] = "PYRAMID";
})(SquishyShape || (SquishyShape = {}));
// Class to manage all squishy objects in the simulation
export class SquishyManager {
    constructor(gl, extVAO) {
        // Current active object
        this.activeObject = null;
        // Rendering properties
        this.renderMode = SquishyRenderMode.SHADED;
        // Collision objects
        this.collisionObjects = [];
        // Physics parameters
        this.timeStep = 1 / 60;
        this.gravity = new Vec3([0, -9.8, 0]);
        // store matrices
        this.currentViewMatrix = Mat4.identity.copy();
        this.currentProjMatrix = Mat4.identity.copy();
        this.currentLightPos = new Vec4([0, 0, 0, 1]);
        this.gl = gl;
        this.extVAO = extVAO;
        // Initialize render passes
        this.shadedRenderPass = new RenderPass(extVAO, gl, squishyVSText, squishyFSText);
        this.wireframeRenderPass = new RenderPass(extVAO, gl, squishyWireframeVSText, squishyWireframeFSText);
        this.pointsRenderPass = new RenderPass(extVAO, gl, squishyPointsVSText, squishyPointsFSText);
        // Create initial object (default: jelly sphere)
        this.createSquishyObject(SquishyObjectType.SPHERE, SquishyMaterial.JELLY);
    }
    // Create a new squishy object of the specified type and material
    createSquishyObject(type, material) {
        // Default position at origin, slightly elevated
        const position = new Vec3([0, 3.0, 0]);
        // Create the appropriate object type
        switch (type) {
            case SquishyObjectType.SPHERE:
                this.activeObject = new SquishySphere(position, 1.5, material);
                break;
            case SquishyObjectType.TORUS:
                this.activeObject = new SquishyTorus(position, 1.5, 0.5, material);
                break;
            case SquishyObjectType.CUBE:
                this.activeObject = new SquishyCube(position, 2.0, material);
                break;
            case SquishyObjectType.PYRAMID:
                this.activeObject = new SquishyPyramid(position, 2.0, 2.0, material);
                break;
        }
        // Add existing collision objects
        for (const collider of this.collisionObjects) {
            this.activeObject.addCollisionObject(collider);
        }
        // Set gravity
        this.activeObject.gravity = this.gravity;
        // Update render passes for the new object
        this.updateRenderPasses();
    }
    // Update the object simulation
    update(dt) {
        if (this.activeObject) {
            // Accumulate time and update physics in fixed timesteps
            const steps = Math.floor(dt / this.timeStep);
            const remainder = dt % this.timeStep;
            for (let i = 0; i < steps; i++) {
                this.activeObject.update(this.timeStep);
            }
            if (remainder > 0) {
                this.activeObject.update(remainder);
            }
            // Update render data to match physics state
            this.updateRenderPasses();
        }
    }
    // Draw the object with the current render mode
    draw(viewMatrix, projMatrix, lightPosition) {
        if (!this.activeObject)
            return;
        this.currentViewMatrix = viewMatrix.copy();
        this.currentProjMatrix = projMatrix.copy();
        this.currentLightPos = lightPosition.copy();
        const gl = this.gl;
        // Choose the appropriate render pass based on render mode
        let renderPass;
        switch (this.renderMode) {
            case SquishyRenderMode.WIREFRAME:
                renderPass = this.wireframeRenderPass;
                // Don't use polygonMode - WebGL doesn't support it
                break;
            case SquishyRenderMode.POINTS:
                renderPass = this.pointsRenderPass;
                break;
            case SquishyRenderMode.SHADED:
            default:
                renderPass = this.shadedRenderPass;
                // Don't use polygonMode
                break;
        }
        // Disable backface culling to see both sides
        gl.disable(gl.CULL_FACE);
        // Draw the object
        renderPass.draw();
        // Re-enable culling
        gl.enable(gl.CULL_FACE);
    }
    // Update render pass data
    updateRenderPasses() {
        if (!this.activeObject)
            return;
        // Get mesh data from the object
        const meshData = this.activeObject.generateMeshData();
        // Update shaded render pass
        this.updateShadedRenderPass(meshData);
        // Update wireframe render pass
        this.updateWireframeRenderPass(meshData);
        // Update points render pass
        this.updatePointsRenderPass();
    }
    updateShadedRenderPass(meshData) {
        const gl = this.gl;
        // Set buffer data
        this.shadedRenderPass.setIndexBufferData(meshData.indices);
        this.shadedRenderPass.addAttribute("vertPosition", 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.positions);
        this.shadedRenderPass.addAttribute("vertNormal", 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.normals);
        this.shadedRenderPass.addAttribute("vertColor", 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.colors);
        // Add uniforms
        this.shadedRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.shadedRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.currentViewMatrix.all()));
        });
        this.shadedRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.currentProjMatrix.all()));
        });
        this.shadedRenderPass.addUniform("lightPosition", (gl, loc) => {
            gl.uniform4fv(loc, this.currentLightPos.xyzw);
        });
        this.shadedRenderPass.addUniform("ambientIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.2);
        });
        this.shadedRenderPass.addUniform("diffuseIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.7);
        });
        this.shadedRenderPass.addUniform("specularIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.4);
        });
        this.shadedRenderPass.addUniform("shininess", (gl, loc) => {
            gl.uniform1f(loc, 16.0);
        });
        this.shadedRenderPass.setDrawData(gl.TRIANGLES, meshData.indices.length, gl.UNSIGNED_INT, 0);
        this.shadedRenderPass.setup();
    }
    updateWireframeRenderPass(meshData) {
        const gl = this.gl;
        // Set buffer data
        this.wireframeRenderPass.setIndexBufferData(meshData.indices);
        this.wireframeRenderPass.addAttribute("vertPosition", 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.positions);
        // Add uniforms
        this.wireframeRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.wireframeRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.currentViewMatrix.all()));
        });
        this.wireframeRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.currentProjMatrix.all()));
        });
        this.wireframeRenderPass.addUniform("wireColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.0, 0.0, 0.0])); // Black wireframe
        });
        // Set as LINE_STRIP
        this.wireframeRenderPass.setDrawData(gl.LINE_STRIP, meshData.indices.length, gl.UNSIGNED_INT, 0);
        this.wireframeRenderPass.setup();
    }
    updatePointsRenderPass() {
        const gl = this.gl;
        if (!this.activeObject)
            return;
        // Get particles
        const particles = this.activeObject.particles;
        const numParticles = particles.length;
        // Create arrays for particle rendering
        const positions = new Float32Array(numParticles * 3);
        const isFixed = new Float32Array(numParticles);
        const indices = new Uint32Array(numParticles);
        // Fill arrays
        for (let i = 0; i < numParticles; i++) {
            const particle = particles[i];
            positions[i * 3] = particle.position.x;
            positions[i * 3 + 1] = particle.position.y;
            positions[i * 3 + 2] = particle.position.z;
            isFixed[i] = particle.isFixed ? 1.0 : 0.0;
            indices[i] = i;
        }
        // Update point render pass
        this.pointsRenderPass.setIndexBufferData(indices);
        this.pointsRenderPass.addAttribute("vertPosition", 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, positions);
        this.pointsRenderPass.addAttribute("isFixed", 1, gl.FLOAT, false, 1 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, isFixed);
        // Add uniforms
        this.pointsRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.pointsRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.currentViewMatrix.all()));
        });
        this.pointsRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.currentProjMatrix.all()));
        });
        this.pointsRenderPass.addUniform("pointSize", (gl, loc) => {
            gl.uniform1f(loc, 8.0); // Size of points
        });
        this.pointsRenderPass.addUniform("freeColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.0, 0.5, 0.9])); // Color for free particles
        });
        this.pointsRenderPass.addUniform("fixedColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.9, 0.2, 0.2])); // Color for fixed particles
        });
        this.pointsRenderPass.setDrawData(gl.POINTS, indices.length, gl.UNSIGNED_INT, 0);
        this.pointsRenderPass.setup();
    }
    // Pin/unpin a particle at the specified index
    pinParticle(index, fixed) {
        if (this.activeObject) {
            this.activeObject.pinParticle(index, fixed);
        }
    }
    // Add a collision sphere
    addCollisionSphere(center, radius) {
        const collider = new SphereCollider(center, radius);
        this.collisionObjects.push(collider);
        if (this.activeObject) {
            this.activeObject.addCollisionObject(collider);
        }
    }
    // Clear all collision objects
    clearCollisionObjects() {
        this.collisionObjects = [];
        if (this.activeObject) {
            // This assumes SquishyObject has a method to clear collision objects
            // which we need to add to that class
            this.activeObject.clearCollisionObjects();
        }
    }
    // Set render mode
    setRenderMode(mode) {
        this.renderMode = mode;
    }
    // Set gravity
    setGravity(gravity) {
        this.gravity = gravity;
        if (this.activeObject) {
            this.activeObject.gravity = gravity;
        }
    }
    // Reset the current object
    reset() {
        if (this.activeObject) {
            this.activeObject.reset();
            this.updateRenderPasses();
        }
    }
    // Get the current object for external inspection
    getActiveObject() {
        return this.activeObject;
    }
    // Add these methods to the SquishyManager class
    // Get current render mode
    getRenderMode() {
        return this.renderMode;
    }
    // Get current gravity value
    getGravity() {
        if (this.activeObject) {
            return this.activeObject.gravity;
        }
        return new Vec3([0, -9.8, 0]); // Default
    }
    // Pin a particle at a specific position
    pinParticleAtPosition(position, radius = 0.2) {
        if (!this.activeObject)
            return false;
        let closestDistance = radius;
        let closestIndex = -1;
        // Find closest particle to the position
        for (let i = 0; i < this.activeObject.particles.length; i++) {
            const particle = this.activeObject.particles[i];
            const distance = Vec3.distance(particle.position, position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        // If found a particle within range, toggle its fixed state
        if (closestIndex >= 0) {
            const particle = this.activeObject.particles[closestIndex];
            const newFixedState = !particle.isFixed;
            this.activeObject.pinParticle(closestIndex, newFixedState);
            return true;
        }
        return false;
    }
    // Create a complex scene with multiple squishy objects
    // (Note: This would require keeping track of multiple objects, 
    // which would be a larger implementation change)
    createComplexScene() {
        var _a;
        // Clear any existing objects
        this.clearCollisionObjects();
        // Create a new environment with floor and walls
        const floorHeight = -2.0;
        const wallDistance = 5.0;
        // Add floor collision (in a full implementation, we would add plane colliders)
        // For now, we'll just position the object above the floor
        (_a = this.activeObject) === null || _a === void 0 ? void 0 : _a.reset();
        // Position the object at the center
        if (this.activeObject) {
            for (const particle of this.activeObject.particles) {
                particle.position.y += 3.0;
                particle.oldPosition.y += 3.0;
            }
        }
        // Add collision spheres to create obstacles
        this.addCollisionSphere(new Vec3([3.0, 0.5, 3.0]), 1.0);
        this.addCollisionSphere(new Vec3([-3.0, 0.5, -3.0]), 1.0);
        this.addCollisionSphere(new Vec3([3.0, 0.5, -3.0]), 1.0);
        this.addCollisionSphere(new Vec3([-3.0, 0.5, 3.0]), 1.0);
        // In a full implementation, we would create other squishy objects
        // and render them as well
    }
    // Perform a stress test with extreme physics parameters
    performStressTest() {
        if (!this.activeObject)
            return;
        // Store original parameters to restore later
        const originalGravity = this.activeObject.gravity.copy();
        // Set extreme gravity
        this.activeObject.gravity = new Vec3([0, -30.0, 0]);
        // Apply random forces to create chaotic motion
        for (const particle of this.activeObject.particles) {
            if (!particle.isFixed) {
                const randomForce = new Vec3([
                    (Math.random() - 0.5) * 20.0,
                    (Math.random() - 0.5) * 20.0,
                    (Math.random() - 0.5) * 20.0
                ]);
                particle.addForce(randomForce);
            }
        }
        // Set a timer to restore normal gravity after a few seconds
        setTimeout(() => {
            if (this.activeObject) {
                this.activeObject.gravity = originalGravity;
            }
        }, 5000);
    }
    // Reset the physics simulation completely
    resetAll() {
        // Clear collision objects
        this.clearCollisionObjects();
        // Reset active object
        if (this.activeObject) {
            this.activeObject.reset();
        }
    }
}
//# sourceMappingURL=SquishyManager.js.map