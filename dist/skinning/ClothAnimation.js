import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { GUI, Mode } from "./ClothGui.js";
import { Floor } from "../lib/webglutils/Floor.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Vec3, Vec4, Mat4 } from "../lib/TSM.js";
import { Debugger } from "../lib/webglutils/Debugging.js";
import { clothVSText, clothFSText, clothWireframeVSText, clothWireframeFSText, springVSText, springFSText, pointVSText, pointFSText } from "./ClothShaders.js";
import { floorVSText, floorFSText, sBackVSText, sBackFSText } from "./Shaders.js";
import { Cloth, FabricType } from "./Cloth.js";
import { SphereCollider } from "./CollisionObjects.js";
var RenderMode;
(function (RenderMode) {
    RenderMode[RenderMode["SHADED"] = 0] = "SHADED";
    RenderMode[RenderMode["WIREFRAME"] = 1] = "WIREFRAME";
    RenderMode[RenderMode["POINTS"] = 2] = "POINTS";
    RenderMode[RenderMode["SPRINGS"] = 3] = "SPRINGS";
    RenderMode[RenderMode["DEBUG"] = 4] = "DEBUG";
})(RenderMode || (RenderMode = {}));
export class ClothAnimation extends CanvasAnimation {
    constructor(canvas) {
        super(canvas);
        this.renderMode = RenderMode.SHADED;
        // Cloth physics parameters
        this.timeStep = 1 / 60;
        this.accumulator = 0;
        this.clothWidth = 4;
        this.clothHeight = 4;
        this.clothRows = 15;
        this.clothCols = 15;
        this.fabricType = FabricType.COTTON;
        // Collision objects
        this.sphere = null;
        this.box = null;
        this.canvas2d = document.getElementById("textCanvas");
        this.ctx2 = this.canvas2d.getContext("2d");
        if (this.ctx2) {
            this.ctx2.font = "25px serif";
            this.ctx2.fillStyle = "#ffffffff";
        }
        this.ctx = Debugger.makeDebugContext(this.ctx);
        let gl = this.ctx;
        this.floor = new Floor();
        this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
        this.clothRenderPass = new RenderPass(this.extVAO, gl, clothVSText, clothFSText);
        this.wireframeRenderPass = new RenderPass(this.extVAO, gl, clothWireframeVSText, clothWireframeFSText);
        this.springRenderPass = new RenderPass(this.extVAO, gl, springVSText, springFSText);
        this.pointRenderPass = new RenderPass(this.extVAO, gl, pointVSText, pointFSText);
        this.gui = new GUI(this.canvas2d, this);
        this.lightPosition = new Vec4([-10, 10, -10, 1]);
        this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);
        this.initFloor();
        this.initCloth();
        // Status bar
        this.sBackRenderPass = new RenderPass(this.extVAO, gl, sBackVSText, sBackFSText);
        this.initGui();
        this.millis = new Date().getTime();
    }
    initGui() {
        // Status bar background
        let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
        this.sBackRenderPass.setIndexBufferData(new Uint32Array([1, 0, 2, 2, 0, 3]));
        this.sBackRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, verts);
        this.sBackRenderPass.setDrawData(this.ctx.TRIANGLES, 6, this.ctx.UNSIGNED_INT, 0);
        this.sBackRenderPass.setup();
    }
    /**
     * Setup the animation. This can be called again to reset the animation.
     */
    reset() {
        this.gui.reset();
        this.initCloth();
    }
    getCloth() {
        return this.cloth;
    }
    initFloor() {
        this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
        this.floorRenderPass.addAttribute("aVertPos", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.floor.positionsFlat());
        this.floorRenderPass.addUniform("uLightPos", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.floorRenderPass.addUniform("uWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.floorRenderPass.addUniform("uProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.floorRenderPass.addUniform("uView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.floorRenderPass.addUniform("uProjInv", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
        });
        this.floorRenderPass.addUniform("uViewInv", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
        });
        this.floorRenderPass.setDrawData(this.ctx.TRIANGLES, this.floor.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
        this.floorRenderPass.setup();
    }
    initCloth() {
        // Create new cloth
        this.cloth = new Cloth(this.clothWidth, this.clothHeight, this.clothRows, this.clothCols, this.fabricType);
        // Add collision objects
        this.sphere = new SphereCollider(new Vec3([0, 1, 0]), 1.0);
        this.cloth.addCollisionObject(this.sphere);
        // Initialize render passes
        this.initClothRenderPass();
        this.initWireframeRenderPass();
        this.initSpringRenderPass();
        this.initPointRenderPass();
    }
    // In ClothAnimation.ts, modify the initCloth method:
    // public initCloth(): void {
    //     // Create new cloth with more rows/columns for better draping
    //     this.cloth = new Cloth(
    //       this.clothWidth,
    //       this.clothHeight,
    //       20,  // More rows
    //       20,  // More columns
    //       this.fabricType
    //     );
    //     // Position the cloth higher above the ground
    //     for (let i = 0; i < this.cloth.particles.length; i++) {
    //       for (let j = 0; j < this.cloth.particles[i].length; j++) {
    //         // Move all particles up to start higher
    //         this.cloth.particles[i][j].position.y += 3.0;
    //         this.cloth.particles[i][j].oldPosition.y += 3.0;
    //         // Pin only the corners for a more dramatic drape
    //         if ((i === 0 && j === 0) || 
    //             (i === 0 && j === this.cloth.particles[0].length - 1) ||
    //             (i === this.cloth.particles.length - 1 && j === 0) ||
    //             (i === this.cloth.particles.length - 1 && j === this.cloth.particles[0].length - 1)) {
    //           this.cloth.particles[i][j].setFixed(true);
    //         } else {
    //           this.cloth.particles[i][j].setFixed(false);
    //         }
    //       }
    //     }
    //     // Create sphere as a collision object
    //     this.sphere = new SphereCollider(new Vec3([0, 1.0, 0]), 1.0);
    //     this.cloth.addCollisionObject(this.sphere);
    //     // Create box as another collision object
    //     this.box = new BoxCollider(new Vec3([2.0, 0.5, 0]), new Vec3([1.0, 1.0, 1.0]));
    //     this.cloth.addCollisionObject(this.box);
    //     // Initialize render passes
    //     this.initClothRenderPass();
    //     this.initWireframeRenderPass();
    //     this.initSpringRenderPass();
    //     this.initPointRenderPass();
    //     // Start in simulation mode so the cloth falls immediately
    //     this.gui.setMode(Mode.playback);
    //   }
    initClothRenderPass() {
        const meshData = this.cloth.generateMeshData();
        this.clothRenderPass.setIndexBufferData(meshData.indices);
        this.clothRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.positions);
        this.clothRenderPass.addAttribute("vertNormal", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.normals);
        this.clothRenderPass.addAttribute("vertUV", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.uvs);
        this.clothRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.clothRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.clothRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.clothRenderPass.addUniform("lightPosition", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.clothRenderPass.addUniform("materialColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.7, 0.7, 0.9])); // Cloth color
        });
        this.clothRenderPass.addUniform("ambientIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.2);
        });
        this.clothRenderPass.addUniform("diffuseIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.8);
        });
        this.clothRenderPass.addUniform("specularIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.5);
        });
        this.clothRenderPass.addUniform("shininess", (gl, loc) => {
            gl.uniform1f(loc, 32.0);
        });
        this.clothRenderPass.addUniform("cameraPosition", (gl, loc) => {
            gl.uniform3fv(loc, this.gui.cameraPosition().xyz);
        });
        this.clothRenderPass.addUniform("useTexture", (gl, loc) => {
            gl.uniform1i(loc, 0); // Not using textures initially
        });
        this.clothRenderPass.setDrawData(this.ctx.TRIANGLES, meshData.indices.length, this.ctx.UNSIGNED_INT, 0);
        this.clothRenderPass.setup();
    }
    initWireframeRenderPass() {
        const meshData = this.cloth.generateMeshData();
        this.wireframeRenderPass.setIndexBufferData(meshData.indices);
        this.wireframeRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.positions);
        this.wireframeRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.wireframeRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.wireframeRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.wireframeRenderPass.addUniform("wireColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.0, 0.0, 0.0])); // Black wireframe
        });
        this.wireframeRenderPass.setDrawData(this.ctx.LINE_STRIP, meshData.indices.length, this.ctx.UNSIGNED_INT, 0);
        this.wireframeRenderPass.setup();
    }
    initSpringRenderPass() {
        const springData = this.cloth.generateSpringMeshData();
        this.springRenderPass.setIndexBufferData(springData.indices);
        this.springRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, springData.positions);
        this.springRenderPass.addAttribute("vertColor", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, springData.colors);
        this.springRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.springRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.springRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.springRenderPass.setDrawData(this.ctx.LINES, springData.indices.length, this.ctx.UNSIGNED_INT, 0);
        this.springRenderPass.setup();
    }
    initPointRenderPass() {
        // Create arrays for particle rendering
        const rows = this.cloth.particles.length;
        const cols = this.cloth.particles[0].length;
        const numParticles = rows * cols;
        const positions = new Float32Array(numParticles * 3);
        const isFixed = new Float32Array(numParticles);
        const indices = new Uint32Array(numParticles);
        let index = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const particle = this.cloth.particles[i][j];
                positions[index * 3] = particle.position.x;
                positions[index * 3 + 1] = particle.position.y;
                positions[index * 3 + 2] = particle.position.z;
                isFixed[index] = particle.isFixed ? 1.0 : 0.0;
                indices[index] = index;
                index++;
            }
        }
        this.pointRenderPass.setIndexBufferData(indices);
        this.pointRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, positions);
        this.pointRenderPass.addAttribute("isFixed", 1, this.ctx.FLOAT, false, 1 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, isFixed);
        this.pointRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.pointRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.pointRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.pointRenderPass.addUniform("pointSize", (gl, loc) => {
            gl.uniform1f(loc, 10.0); // Size of points
        });
        this.pointRenderPass.addUniform("freeColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.0, 0.5, 0.9])); // Color for free particles
        });
        this.pointRenderPass.addUniform("fixedColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.9, 0.2, 0.2])); // Color for fixed particles
        });
        this.pointRenderPass.setDrawData(this.ctx.POINTS, indices.length, this.ctx.UNSIGNED_INT, 0);
        this.pointRenderPass.setup();
    }
    updateClothRenderPass() {
        // Get updated mesh data
        const meshData = this.cloth.generateMeshData();
        // Create completely new buffers instead of updating existing ones
        this.clothRenderPass = new RenderPass(this.extVAO, this.ctx, clothVSText, clothFSText);
        this.clothRenderPass.setIndexBufferData(meshData.indices);
        this.clothRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.positions);
        this.clothRenderPass.addAttribute("vertNormal", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.normals);
        this.clothRenderPass.addAttribute("vertUV", 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.uvs);
        // Re-add all uniforms
        this.clothRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.clothRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.clothRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.clothRenderPass.addUniform("lightPosition", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.clothRenderPass.addUniform("materialColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.7, 0.7, 0.9]));
        });
        this.clothRenderPass.addUniform("ambientIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.2);
        });
        this.clothRenderPass.addUniform("diffuseIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.8);
        });
        this.clothRenderPass.addUniform("specularIntensity", (gl, loc) => {
            gl.uniform1f(loc, 0.5);
        });
        this.clothRenderPass.addUniform("shininess", (gl, loc) => {
            gl.uniform1f(loc, 32.0);
        });
        this.clothRenderPass.addUniform("cameraPosition", (gl, loc) => {
            gl.uniform3fv(loc, this.gui.cameraPosition().xyz);
        });
        this.clothRenderPass.addUniform("useTexture", (gl, loc) => {
            gl.uniform1i(loc, 0);
        });
        this.clothRenderPass.setDrawData(this.ctx.TRIANGLES, meshData.indices.length, this.ctx.UNSIGNED_INT, 0);
        this.clothRenderPass.setup();
        // Do the same for wireframe render pass
        this.wireframeRenderPass = new RenderPass(this.extVAO, this.ctx, clothWireframeVSText, clothWireframeFSText);
        this.wireframeRenderPass.setIndexBufferData(meshData.indices);
        this.wireframeRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, meshData.positions);
        this.wireframeRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.wireframeRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.wireframeRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.wireframeRenderPass.addUniform("wireColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.0, 0.0, 0.0]));
        });
        this.wireframeRenderPass.setDrawData(this.ctx.LINE_STRIP, meshData.indices.length, this.ctx.UNSIGNED_INT, 0);
        this.wireframeRenderPass.setup();
        // Update point render pass
        const rows = this.cloth.particles.length;
        const cols = this.cloth.particles[0].length;
        const numParticles = rows * cols;
        const positions = new Float32Array(numParticles * 3);
        const isFixed = new Float32Array(numParticles);
        const indices = new Uint32Array(numParticles);
        let index = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const particle = this.cloth.particles[i][j];
                positions[index * 3] = particle.position.x;
                positions[index * 3 + 1] = particle.position.y;
                positions[index * 3 + 2] = particle.position.z;
                isFixed[index] = particle.isFixed ? 1.0 : 0.0;
                indices[index] = index;
                index++;
            }
        }
        this.pointRenderPass = new RenderPass(this.extVAO, this.ctx, pointVSText, pointFSText);
        this.pointRenderPass.setIndexBufferData(indices);
        this.pointRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, positions);
        this.pointRenderPass.addAttribute("isFixed", 1, this.ctx.FLOAT, false, 1 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, isFixed);
        this.pointRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.pointRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.pointRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.pointRenderPass.addUniform("pointSize", (gl, loc) => {
            gl.uniform1f(loc, 10.0);
        });
        this.pointRenderPass.addUniform("freeColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.0, 0.5, 0.9]));
        });
        this.pointRenderPass.addUniform("fixedColor", (gl, loc) => {
            gl.uniform3fv(loc, new Float32Array([0.9, 0.2, 0.2]));
        });
        this.pointRenderPass.setDrawData(this.ctx.POINTS, indices.length, this.ctx.UNSIGNED_INT, 0);
        this.pointRenderPass.setup();
        // Update spring data
        const springData = this.cloth.generateSpringMeshData();
        this.springRenderPass = new RenderPass(this.extVAO, this.ctx, springVSText, springFSText);
        this.springRenderPass.setIndexBufferData(springData.indices);
        this.springRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, springData.positions);
        this.springRenderPass.addAttribute("vertColor", 3, this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, springData.colors);
        this.springRenderPass.addUniform("mWorld", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
        });
        this.springRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.springRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.springRenderPass.setDrawData(this.ctx.LINES, springData.indices.length, this.ctx.UNSIGNED_INT, 0);
        this.springRenderPass.setup();
    }
    /** @internal
     * Draws a single frame
     */
    draw() {
        // Handle physics timestep
        const currentTime = new Date().getTime();
        let deltaTime = (currentTime - this.millis) / 1000; // Convert to seconds
        this.millis = currentTime;
        // Cap deltaTime to avoid instability with large gaps
        if (deltaTime > 0.05)
            deltaTime = 0.05;
        // Accumulate time and update physics in fixed timesteps
        this.accumulator += deltaTime;
        while (this.accumulator >= this.timeStep) {
            // Update cloth physics
            if (this.gui.getMode() === Mode.playback) {
                this.cloth.update(this.timeStep);
            }
            this.accumulator -= this.timeStep;
            this.gui.incrementTime(this.timeStep);
        }
        // Update render data to match physics state
        this.updateClothRenderPass();
        // Update GUI
        if (this.ctx2) {
            this.ctx2.clearRect(0, 0, this.ctx2.canvas.width, this.ctx2.canvas.height);
            this.ctx2.fillText(this.gui.getModeString(), 50, 710);
        }
        // Drawing
        const gl = this.ctx;
        const bg = this.backgroundColor;
        gl.clearColor(bg.r, bg.g, bg.b, bg.a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
        this.drawScene(0, 200, 800, 600);
        /* Draw status bar */
        gl.viewport(0, 0, 800, 200);
        this.sBackRenderPass.draw();
    }
    drawScene(x, y, width, height) {
        const gl = this.ctx;
        gl.viewport(x, y, width, height);
        // Draw floor (keep backface culling enabled for performance)
        gl.enable(gl.CULL_FACE);
        this.floorRenderPass.draw();
        // Disable backface culling for the cloth to see it from both sides
        gl.disable(gl.CULL_FACE);
        // Draw cloth based on render mode
        switch (this.renderMode) {
            case RenderMode.SHADED:
                this.clothRenderPass.draw();
                break;
            case RenderMode.WIREFRAME:
                this.wireframeRenderPass.draw();
                break;
            case RenderMode.POINTS:
                this.pointRenderPass.draw();
                break;
            case RenderMode.SPRINGS:
                this.springRenderPass.draw();
                break;
            case RenderMode.DEBUG:
                // Draw cloth with wireframe overlay
                this.clothRenderPass.draw();
                // Disable depth test for wireframe overlay
                gl.disable(gl.DEPTH_TEST);
                this.wireframeRenderPass.draw();
                // Draw particles on top
                this.pointRenderPass.draw();
                // Re-enable depth test
                gl.enable(gl.DEPTH_TEST);
                break;
        }
        // Re-enable backface culling for other objects
        gl.enable(gl.CULL_FACE);
        // Draw collision objects for debugging
        // (Would need additional render passes for sphere, box etc.)
    }
    // Methods to interact with the cloth simulation
    setRenderMode(mode) {
        this.renderMode = mode;
    }
    toggleWind(enable, strength = 5.0) {
        this.cloth.windStrength = enable ? strength : 0.0;
    }
    setWindDirection(direction) {
        this.cloth.windDirection = direction.normalize();
    }
    setFabricType(type) {
        this.fabricType = type;
        this.initCloth();
    }
    cutCloth(rayOrigin, rayDirection) {
        this.cloth.cutCloth(rayOrigin, rayDirection, 0.1);
    }
    pinParticle(row, col, fixed) {
        if (row >= 0 && row < this.cloth.particles.length &&
            col >= 0 && col < this.cloth.particles[0].length) {
            this.cloth.particles[row][col].setFixed(fixed);
        }
    }
    getGUI() {
        return this.gui;
    }
}
//# sourceMappingURL=ClothAnimation.js.map