import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { GUI, Mode } from "./ClothGui.js";
import { Floor } from "../lib/webglutils/Floor.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Vec3, Vec4, Mat4 } from "../lib/TSM.js";
import { Debugger } from "../lib/webglutils/Debugging.js";
import { clothVSText, clothFSText, clothWireframeVSText, clothWireframeFSText, springVSText, springFSText, pointVSText, pointFSText, sphereVSText, sphereFSText } from "./ClothShaders.js";
import { floorVSText, floorFSText, sBackVSText, sBackFSText } from "./Shaders.js";
import { Cloth, FabricType, FABRIC_PRESETS } from "./Cloth.js";
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
        // Sphere properties
        this.sphereRadius = 1.5;
        this.spherePosition = new Vec3([0, 1.5, 0]);
        this.sphereVisible = true;
        this.testConfigurations = [
            {
                name: "Cotton Basic",
                fabricType: FabricType.COTTON,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: false,
                pinCenter: false,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 20,
                clothHeight: 4.0,
                windEnabled: false,
                windStrength: 0,
                windDirection: new Vec3([0, 0, 1])
            },
            {
                name: "Silk Drape",
                fabricType: FabricType.SILK,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: false,
                pinCenter: false,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 25,
                clothHeight: 4.0,
                windEnabled: false,
                windStrength: 0,
                windDirection: new Vec3([0, 0, 1])
            },
            {
                name: "Leather Stiff",
                fabricType: FabricType.LEATHER,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: false,
                pinCenter: false,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 15,
                clothHeight: 4.0,
                windEnabled: false,
                windStrength: 0,
                windDirection: new Vec3([0, 0, 1])
            },
            {
                name: "Rubber Stretch",
                fabricType: FabricType.RUBBER,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: false,
                pinCenter: false,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 15,
                clothHeight: 4.0,
                windEnabled: false,
                windStrength: 0,
                windDirection: new Vec3([0, 0, 1])
            },
            {
                name: "Wind Test",
                fabricType: FabricType.SILK,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: false,
                pinCenter: false,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 20,
                clothHeight: 4.0,
                windEnabled: true,
                windStrength: 10.0,
                windDirection: new Vec3([1, 0, 1]).normalize()
            },
            {
                name: "Centerpiece",
                fabricType: FabricType.COTTON,
                sphereRadius: 2.0,
                spherePosition: new Vec3([0, 2.0, 0]),
                pinCorners: false,
                pinCenter: true,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 30,
                clothHeight: 5.0,
                windEnabled: false,
                windStrength: 0,
                windDirection: new Vec3([0, 0, 1])
            }
        ];
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
        this.initSphereDropTest();
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
    // Generate sphere geometry
    generateSphereGeometry(radius, rings, sectors) {
        const positions = [];
        const normals = [];
        const indices = [];
        // Generate vertices
        for (let i = 0; i <= rings; i++) {
            const theta = i * Math.PI / rings;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            for (let j = 0; j <= sectors; j++) {
                const phi = j * 2 * Math.PI / sectors;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                // Position
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                // Scaled position
                positions.push(radius * x);
                positions.push(radius * y);
                positions.push(radius * z);
                // Normal (unit vector)
                normals.push(x);
                normals.push(y);
                normals.push(z);
            }
        }
        // Generate indices
        for (let i = 0; i < rings; i++) {
            for (let j = 0; j < sectors; j++) {
                const first = i * (sectors + 1) + j;
                const second = first + sectors + 1;
                // First triangle
                indices.push(first);
                indices.push(second);
                indices.push(first + 1);
                // Second triangle
                indices.push(second);
                indices.push(second + 1);
                indices.push(first + 1);
            }
        }
        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            indices: new Uint32Array(indices)
        };
    }
    // Initialize sphere rendering
    initSphereRenderPass() {
        const gl = this.ctx;
        // Generate sphere geometry
        const sphereGeometry = this.generateSphereGeometry(this.sphereRadius, 20, // rings
        30 // sectors
        );
        // Create render pass for sphere
        this.sphereRenderPass = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);
        // Set vertex buffer data
        this.sphereRenderPass.setIndexBufferData(sphereGeometry.indices);
        // Add attributes
        this.sphereRenderPass.addAttribute("vertPosition", 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, sphereGeometry.positions);
        this.sphereRenderPass.addAttribute("vertNormal", 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, sphereGeometry.normals);
        // Add uniforms
        this.sphereRenderPass.addUniform("mWorld", (gl, loc) => {
            // Create world matrix that positions the sphere
            const worldMatrix = new Mat4().setIdentity();
            worldMatrix.translate(this.spherePosition);
            gl.uniformMatrix4fv(loc, false, new Float32Array(worldMatrix.all()));
        });
        this.sphereRenderPass.addUniform("mView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.sphereRenderPass.addUniform("mProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.sphereRenderPass.addUniform("lightPosition", (gl, loc) => {
            gl.uniform4fv(loc, this.lightPosition.xyzw);
        });
        this.sphereRenderPass.addUniform("sphereColor", (gl, loc) => {
            // Choose color based on fabric type for visual distinction
            let color;
            switch (this.fabricType) {
                case FabricType.COTTON:
                    color = new Float32Array([0.5, 0.5, 0.8]); // Bluish
                    break;
                case FabricType.SILK:
                    color = new Float32Array([0.8, 0.8, 0.5]); // Yellowish
                    break;
                case FabricType.LEATHER:
                    color = new Float32Array([0.8, 0.5, 0.3]); // Brown
                    break;
                case FabricType.RUBBER:
                    color = new Float32Array([0.3, 0.8, 0.3]); // Green
                    break;
                default:
                    color = new Float32Array([0.8, 0.2, 0.2]); // Red
            }
            gl.uniform3fv(loc, color);
        });
        this.sphereRenderPass.addUniform("cameraPosition", (gl, loc) => {
            gl.uniform3fv(loc, this.gui.cameraPosition().xyz);
        });
        // Set draw data
        this.sphereRenderPass.setDrawData(gl.TRIANGLES, sphereGeometry.indices.length, gl.UNSIGNED_INT, 0);
        this.sphereRenderPass.setup();
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
        // If the sphere is active, update its render pass too
        if (this.sphereVisible && this.sphere) {
            this.initSphereRenderPass();
        }
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
        // Draw floor
        this.floorRenderPass.draw();
        // Draw sphere if visible
        if (this.sphereVisible && this.sphere) {
            this.sphereRenderPass.draw();
        }
        // Draw cloth (disable backface culling to see both sides)
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
        // Re-enable culling
        gl.enable(gl.CULL_FACE);
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
    // Sphere drop test methods
    initSphereDropTest(fabricType = FabricType.COTTON, clothDensity = 20, sphereRadius = 1.5, spherePosition = new Vec3([0, 1.5, 0]), clothHeight = 4.0) {
        // Update sphere properties
        this.sphereRadius = sphereRadius;
        this.spherePosition = spherePosition;
        this.fabricType = fabricType;
        // Create new cloth with specified density
        this.cloth = new Cloth(this.clothWidth, this.clothHeight, clothDensity, clothDensity, this.fabricType);
        // Customize cloth based on fabric type
        const fabricProps = FABRIC_PRESETS.get(this.fabricType);
        // Position the cloth higher above the sphere
        const clothStartY = spherePosition.y + sphereRadius + clothHeight;
        // Calculate cloth size to drape nicely over sphere
        const clothSize = sphereRadius * 3.0; // Cloth should be 3x sphere diameter
        const stepSize = clothSize / (clothDensity - 1);
        // Position cloth particles
        for (let i = 0; i < this.cloth.particles.length; i++) {
            for (let j = 0; j < this.cloth.particles[i].length; j++) {
                // Calculate position to center cloth over sphere
                const x = (j * stepSize) - (clothSize / 2) + spherePosition.x;
                const z = (i * stepSize) - (clothSize / 2) + spherePosition.z;
                this.cloth.particles[i][j].position.x = x;
                this.cloth.particles[i][j].position.y = clothStartY;
                this.cloth.particles[i][j].position.z = z;
                // Update old position to match
                this.cloth.particles[i][j].oldPosition.x = x;
                this.cloth.particles[i][j].oldPosition.y = clothStartY;
                this.cloth.particles[i][j].oldPosition.z = z;
                // Pin corners to create a hanging cloth effect
                if ((i === 0 && j === 0) ||
                    (i === 0 && j === this.cloth.particles[0].length - 1) ||
                    (i === this.cloth.particles.length - 1 && j === 0) ||
                    (i === this.cloth.particles.length - 1 && j === this.cloth.particles[0].length - 1)) {
                    this.cloth.particles[i][j].setFixed(true);
                }
                else {
                    this.cloth.particles[i][j].setFixed(false);
                }
            }
        }
        // Create sphere collider
        this.sphere = new SphereCollider(this.spherePosition, this.sphereRadius);
        this.cloth.clearCollisionObjects(); // Clear any existing colliders
        this.cloth.addCollisionObject(this.sphere);
        // Initialize render passes
        this.initClothRenderPass();
        this.initWireframeRenderPass();
        this.initSpringRenderPass();
        this.initPointRenderPass();
        this.initSphereRenderPass();
        // Start in simulation mode
        this.gui.setMode(Mode.playback);
        // Display fabric type in console
        console.log(`Testing ${FabricType[this.fabricType]} fabric on sphere`);
    }
    // Run a specific test configuration
    runClothTest(configIndex) {
        if (configIndex < 0 || configIndex >= this.testConfigurations.length) {
            console.error(`Invalid test configuration index: ${configIndex}`);
            return;
        }
        const config = this.testConfigurations[configIndex];
        console.log(`Running cloth test: ${config.name}`);
        // Set up basic parameters
        this.fabricType = config.fabricType;
        this.sphereRadius = config.sphereRadius;
        this.spherePosition = config.spherePosition;
        // Create cloth with specified density
        this.cloth = new Cloth(this.clothWidth, this.clothHeight, config.clothDensity, config.clothDensity, this.fabricType);
        // Set gravity
        this.cloth.gravity = config.gravity;
        // Calculate cloth dimensions and positioning
        const clothStartY = config.spherePosition.y + config.sphereRadius + config.clothHeight;
        const clothSize = config.sphereRadius * 3.0; // Cloth size proportional to sphere
        const stepSize = clothSize / (config.clothDensity - 1);
        // Position and configure cloth particles
        for (let i = 0; i < this.cloth.particles.length; i++) {
            for (let j = 0; j < this.cloth.particles[i].length; j++) {
                // Calculate position to center cloth over sphere
                const x = (j * stepSize) - (clothSize / 2) + config.spherePosition.x;
                const z = (i * stepSize) - (clothSize / 2) + config.spherePosition.z;
                this.cloth.particles[i][j].position.x = x;
                this.cloth.particles[i][j].position.y = clothStartY;
                this.cloth.particles[i][j].position.z = z;
                // Update old position to match
                this.cloth.particles[i][j].oldPosition.x = x;
                this.cloth.particles[i][j].oldPosition.y = clothStartY;
                this.cloth.particles[i][j].oldPosition.z = z;
                // Unpin all particles by default
                this.cloth.particles[i][j].setFixed(false);
                // Pin corners if specified
                if (config.pinCorners) {
                    if ((i === 0 && j === 0) ||
                        (i === 0 && j === this.cloth.particles[0].length - 1) ||
                        (i === this.cloth.particles.length - 1 && j === 0) ||
                        (i === this.cloth.particles.length - 1 && j === this.cloth.particles[0].length - 1)) {
                        this.cloth.particles[i][j].setFixed(true);
                    }
                }
                // Pin center if specified
                if (config.pinCenter &&
                    i === Math.floor(this.cloth.particles.length / 2) &&
                    j === Math.floor(this.cloth.particles[0].length / 2)) {
                    this.cloth.particles[i][j].setFixed(true);
                }
            }
        }
        // Create sphere collider
        this.sphere = new SphereCollider(this.spherePosition, this.sphereRadius);
        this.cloth.clearCollisionObjects();
        this.cloth.addCollisionObject(this.sphere);
        // Configure wind if enabled
        if (config.windEnabled) {
            this.cloth.windStrength = config.windStrength;
            this.cloth.windDirection = config.windDirection;
        }
        else {
            this.cloth.windStrength = 0;
        }
        // Initialize render passes
        this.initClothRenderPass();
        this.initWireframeRenderPass();
        this.initSpringRenderPass();
        this.initPointRenderPass();
        this.initSphereRenderPass();
        // Start simulation
        this.gui.setMode(Mode.playback);
    }
    // Run all test configurations in sequence
    runAllClothTests() {
        let currentIndex = 0;
        const testInterval = 8000; // 8 seconds per test
        const runNextTest = () => {
            if (currentIndex < this.testConfigurations.length) {
                this.runClothTest(currentIndex);
                currentIndex++;
                setTimeout(runNextTest, testInterval);
            }
        };
        runNextTest();
    }
    // Test all fabric types with different positions
    testFabricGrid() {
        // Create a grid of spheres with different fabric types
        const fabricTests = [
            { type: FabricType.COTTON, position: new Vec3([-3, 1.5, -3]) },
            { type: FabricType.SILK, position: new Vec3([3, 1.5, -3]) },
            { type: FabricType.LEATHER, position: new Vec3([-3, 1.5, 3]) },
            { type: FabricType.RUBBER, position: new Vec3([3, 1.5, 3]) }
        ];
        // We could use multiple cloth instances in a more complex simulation
        // For now, we'll just do consecutive tests
        let currentIndex = 0;
        const runNextTest = () => {
            if (currentIndex < fabricTests.length) {
                const test = fabricTests[currentIndex];
                this.initSphereDropTest(test.type, 20, // density
                1.5, // radius
                test.position, 4.0 // cloth height
                );
                currentIndex++;
                setTimeout(runNextTest, 5000); // 5 seconds between tests
            }
        };
        runNextTest();
    }
    // Create a fancy sphere test with interactive controls
    initFancySphereTest() {
        // Create high-resolution cloth
        const highResDensity = 30;
        // Position sphere in center
        const centerPosition = new Vec3([0, 2.0, 0]);
        // Create larger sphere
        const largeRadius = 2.0;
        // Use silk for smoother draping
        this.initSphereDropTest(FabricType.SILK, highResDensity, largeRadius, centerPosition, 5.0 // higher drop height for more dramatic effect
        );
        // Pin cloth at corners and some interior points for more interesting draping
        for (let i = 0; i < this.cloth.particles.length; i++) {
            for (let j = 0; j < this.cloth.particles[i].length; j++) {
                // Unpin everything first
                this.cloth.particles[i][j].setFixed(false);
                // Pin corners
                if ((i === 0 && j === 0) ||
                    (i === 0 && j === this.cloth.particles[0].length - 1) ||
                    (i === this.cloth.particles.length - 1 && j === 0) ||
                    (i === this.cloth.particles.length - 1 && j === this.cloth.particles[0].length - 1)) {
                    this.cloth.particles[i][j].setFixed(true);
                }
                // Add some pinned points near middle for more complex draping
                if (i === Math.floor(this.cloth.particles.length / 2) &&
                    j === Math.floor(this.cloth.particles[0].length / 2)) {
                    this.cloth.particles[i][j].setFixed(true);
                }
            }
        }
        // Adjust gravity for more realistic movement
        this.cloth.gravity = new Vec3([0, -12.0, 0]);
        // Start in simulation mode
        this.gui.setMode(Mode.playback);
    }
    // Analyze cloth behavior
    analyzeClothBehavior() {
        // This would be used to print statistics about the cloth simulation
        // For example, measuring how closely the cloth conforms to the sphere
        if (!this.cloth || !this.sphere)
            return;
        // Measure maximum penetration depth
        let maxPenetration = 0;
        let avgPenetration = 0;
        let penetrationCount = 0;
        // Analyze conformity to sphere
        for (let i = 0; i < this.cloth.particles.length; i++) {
            for (let j = 0; j < this.cloth.particles[i].length; j++) {
                const particle = this.cloth.particles[i][j];
                // Calculate distance from particle to sphere center
                const distToCenter = Vec3.distance(particle.position, this.spherePosition);
                // Check if particle is penetrating or touching the sphere
                if (distToCenter <= this.sphereRadius + 0.1) {
                    // Calculate penetration depth
                    const penetration = this.sphereRadius - distToCenter;
                    if (penetration > 0) {
                        maxPenetration = Math.max(maxPenetration, penetration);
                        avgPenetration += penetration;
                        penetrationCount++;
                    }
                }
            }
        }
        // Calculate average penetration
        if (penetrationCount > 0) {
            avgPenetration /= penetrationCount;
        }
        // Calculate total energy in the system
        const totalEnergy = this.cloth.totalEnergy;
        // Log analysis results
        console.log("Cloth Behavior Analysis:");
        console.log(`- Fabric Type: ${FabricType[this.fabricType]}`);
        console.log(`- Max Penetration: ${maxPenetration.toFixed(4)}`);
        console.log(`- Avg Penetration: ${avgPenetration.toFixed(4)}`);
        console.log(`- Particles Touching Sphere: ${penetrationCount}`);
        console.log(`- Total Energy: ${totalEnergy.toFixed(2)}`);
        // Different fabric types will show different behavior:
        // - Cotton: Moderate draping, balanced behavior
        // - Silk: Smoother draping, closer conformity to sphere
        // - Leather: Stiffer, less conformity, maintains shape
        // - Rubber: Stretchier, can penetrate more but bounces
    }
}
//# sourceMappingURL=ClothAnimation.js.map