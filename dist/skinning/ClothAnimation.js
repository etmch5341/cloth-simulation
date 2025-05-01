import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { GUI, Mode } from "./ClothGui.js";
import { Floor } from "../lib/webglutils/Floor.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Vec3, Vec4, Mat4 } from "../lib/TSM.js";
import { Debugger } from "../lib/webglutils/Debugging.js";
import { clothVSText, clothFSText, clothWireframeVSText, clothWireframeFSText, springVSText, springFSText, pointVSText, pointFSText, sphereVSText, sphereFSText, skyboxVSText, skyboxFSText } from "./ClothShaders.js";
import { floorVSText, floorFSText, sBackVSText, sBackFSText } from "./Shaders.js";
import { Cloth, FabricType, FABRIC_PRESETS } from "./Cloth.js";
import { SphereCollider } from "./CollisionObjects.js";
import { Skybox } from "./Skybox.js";
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
        // Current test tracker
        this.currentTestIndex = 0;
        // Mesh Test properties
        this.meshTestEnabled = false;
        this.meshTestTimer = null;
        this.meshTestFaceCounts = [1, 4, 16, 64, 256, 1024, 4096];
        this.testConfigurations = [
            {
                name: "Sphere Drop Test",
                fabricType: FabricType.COTTON,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: true,
                pinCenter: false,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 20,
                clothHeight: 4.0,
                windEnabled: true,
                windStrength: 20.0,
                windDirection: new Vec3([0, 0, 1])
            },
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
                clothDensity: 30,
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
                clothDensity: 10,
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
                clothDensity: 25,
                clothHeight: 4.0,
                windEnabled: false,
                windStrength: 0,
                windDirection: new Vec3([0, 0, 1])
            },
            {
                name: "Wind Test",
                fabricType: FabricType.COTTON,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: false,
                pinCenter: true,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 20,
                clothHeight: 4.0,
                windEnabled: true,
                windStrength: 75.0,
                windDirection: new Vec3([1, 0, 1]).normalize()
            },
            {
                name: "Centerpiece",
                fabricType: FabricType.COTTON,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: false,
                pinCenter: true,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 30,
                clothHeight: 4.0,
                windEnabled: false,
                windStrength: 1000.0,
                windDirection: new Vec3([0, 0, 1])
            },
            {
                name: "Progressive Mesh Test",
                fabricType: FabricType.COTTON,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: false,
                pinCenter: false,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 10, // This will be overridden
                clothHeight: 4.0,
                windEnabled: false,
                windStrength: 0,
                windDirection: new Vec3([0, 0, 1])
            },
            {
                name: "Custom Parameters",
                fabricType: FabricType.COTTON,
                sphereRadius: 1.5,
                spherePosition: new Vec3([0, 1.5, 0]),
                pinCorners: true,
                pinCenter: false,
                gravity: new Vec3([0, -9.8, 0]),
                clothDensity: 20,
                clothHeight: 4.0,
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
        // Initialize skybox 
        this.skybox = new Skybox();
        this.skyboxRenderPass = new RenderPass(this.extVAO, gl, skyboxVSText, skyboxFSText);
        this.skyboxSize = 800.0; // Make the skybox large enough to encompass the entire scene
        this.initSkyboxRenderPass();
        // this.initCloth();
        this.initSphereDropTest();
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
        // this.initSphereDropTest();
        // Stop progressive mesh test if running
        this.stopProgressiveMeshTest();
        this.runClothTest(this.currentTestIndex);
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
    /**
       * Sets up the skybox rendering
       */
    initSkyboxRenderPass() {
        this.skyboxRenderPass.setIndexBufferData(Skybox.indicesFlat());
        this.skyboxRenderPass.addAttribute("aVertPos", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, Skybox.positionsFlat());
        this.skyboxRenderPass.addAttribute("aNorm", 4, this.ctx.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, Skybox.normalsFlat());
        this.skyboxRenderPass.addAttribute("aUV", 3, // 3D texture coordinates for skybox
        this.ctx.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, Skybox.uvFlat());
        this.skyboxRenderPass.addUniform("uProj", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
        });
        this.skyboxRenderPass.addUniform("uView", (gl, loc) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
        });
        this.skyboxRenderPass.addUniform("uTime", (gl, loc) => {
            gl.uniform1f(loc, performance.now() / 1000.0);
        });
        this.skyboxRenderPass.setDrawData(this.ctx.TRIANGLES, Skybox.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
        this.skyboxRenderPass.setup();
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
            gl.uniform3fv(loc, new Float32Array([0.0, 1.0, 0.0])); // Green wireframe
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
                    color = new Float32Array([0.5, 0.7, 1.0]); // Brighter bluish
                    break;
                case FabricType.SILK:
                    color = new Float32Array([1.0, 1.0, 0.7]); // Brighter yellowish
                    break;
                case FabricType.LEATHER:
                    color = new Float32Array([1.0, 0.7, 0.4]); // Brighter brown
                    break;
                case FabricType.RUBBER:
                    color = new Float32Array([0.4, 1.0, 0.4]); // Brighter green
                    break;
                default:
                    color = new Float32Array([1.0, 0.5, 0.5]); // Brighter red
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
            gl.uniform3fv(loc, new Float32Array([0.0, 1.0, 0.0])); // Green wire
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
        // 1. Render skybox first
        // Disable depth writes (but keep depth testing)
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        // Disable depth testing for skybox
        gl.disable(gl.DEPTH_TEST);
        // Draw skybox
        this.skyboxRenderPass.draw();
        // Restore state for rest of scene
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.cullFace(gl.BACK);
        // Re-enable depth writes for regular scene geometry
        gl.depthMask(true);
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
    toggleWind(enable, strength = 0.0) {
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
        // Stop any existing progressive mesh test
        this.stopProgressiveMeshTest();
        // Store the current test index
        this.currentTestIndex = configIndex;
        // Check if this is the progressive mesh test
        if (configIndex === 7) { // Assuming it's the 8th item (index 7) in the array
            this.runProgressiveMeshTest();
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
        if (this.gui && this.gui.getClothControls) {
            const controls = this.gui.getClothControls();
            if (controls) {
                controls.updateControlsFromSimulation();
            }
        }
    }
    // Modify the runProgressiveMeshTest method to explicitly handle corner pinning
    runProgressiveMeshTest() {
        // Stop any existing test
        this.stopProgressiveMeshTest();
        // Enable mesh test mode
        this.meshTestEnabled = true;
        // Set mode to playback
        this.gui.setMode(Mode.playback);
        let currentIndex = 0;
        const runNextMeshTest = () => {
            if (!this.meshTestEnabled)
                return;
            const faceCount = this.meshTestFaceCounts[currentIndex];
            // Calculate rows and columns needed to achieve the desired face count
            // A cloth with R rows and C columns has (R-1)*(C-1)*2 triangular faces
            // For simplicity, we'll use a square cloth (R=C)
            // We solve (R-1)²*2 = faceCount for R
            const rowsCols = Math.max(2, Math.ceil(Math.sqrt(faceCount / 2) + 1));
            console.log(`Running mesh test with ${faceCount} faces (${rowsCols}x${rowsCols} grid)`);
            // Update GUI to display current face count
            this.gui.setMeshTestMode(true, faceCount);
            // Create the cloth with custom settings
            // Instead of using initSphereDropTest which has hardcoded corner pinning,
            // we'll create and configure the cloth directly
            // Create a new cloth with the calculated resolution
            this.cloth = new Cloth(this.clothWidth, this.clothHeight, rowsCols, rowsCols, FabricType.COTTON);
            // Configure the cloth based on test settings
            const config = this.testConfigurations[7]; // Progressive Mesh Test config
            // Set gravity
            this.cloth.gravity = config.gravity;
            // Position the cloth
            const clothStartY = config.spherePosition.y + config.sphereRadius + config.clothHeight;
            const clothSize = config.sphereRadius * 3.0;
            const stepSize = clothSize / (rowsCols - 1);
            // Position cloth particles
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
                    // By default, don't pin any particles
                    this.cloth.particles[i][j].setFixed(false);
                }
            }
            // Pin corners only if specified in config
            if (config.pinCorners) {
                const lastRow = this.cloth.particles.length - 1;
                const lastCol = this.cloth.particles[0].length - 1;
                this.cloth.particles[0][0].setFixed(true);
                this.cloth.particles[0][lastCol].setFixed(true);
                this.cloth.particles[lastRow][0].setFixed(true);
                this.cloth.particles[lastRow][lastCol].setFixed(true);
            }
            // Pin center if specified in config
            if (config.pinCenter) {
                const centerRow = Math.floor(this.cloth.particles.length / 2);
                const centerCol = Math.floor(this.cloth.particles[0].length / 2);
                this.cloth.particles[centerRow][centerCol].setFixed(true);
            }
            // Create sphere collider
            this.sphere = new SphereCollider(config.spherePosition, config.sphereRadius);
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
            // Move to next face count in 3 seconds
            currentIndex = (currentIndex + 1) % this.meshTestFaceCounts.length;
            this.meshTestTimer = window.setTimeout(runNextMeshTest, 3000);
        };
        // Start the first test
        runNextMeshTest();
    }
    stopProgressiveMeshTest() {
        this.meshTestEnabled = false;
        if (this.meshTestTimer !== null) {
            window.clearTimeout(this.meshTestTimer);
            this.meshTestTimer = null;
        }
        // Reset GUI state
        this.gui.setMeshTestMode(false);
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
    cycleRenderMode() {
        // Get the current render mode
        const currentMode = this.renderMode;
        // Cycle to the next mode
        switch (currentMode) {
            case RenderMode.SHADED:
                this.renderMode = RenderMode.WIREFRAME;
                console.log("Switched to Spring View (Wireframe)");
                break;
            case RenderMode.WIREFRAME:
                this.renderMode = RenderMode.POINTS;
                console.log("Switched to Particle View");
                break;
            case RenderMode.POINTS:
                this.renderMode = RenderMode.SPRINGS;
                console.log("Switched to Spring Network View");
                break;
            case RenderMode.SPRINGS:
                this.renderMode = RenderMode.SHADED;
                console.log("Switched to Normal View");
                break;
            default:
                this.renderMode = RenderMode.SHADED;
        }
    }
    // Add this getter method
    getRenderMode() {
        return this.renderMode;
    }
    updateCustomParameters(params) {
        // Store the current configuration index
        const currentIndex = this.currentTestIndex;
        // Update fabric properties
        if (params.fabricType !== undefined) {
            this.fabricType = params.fabricType;
        }
        // Update custom fabric presets if material properties are provided
        if (params.structuralStiffness !== undefined ||
            params.shearStiffness !== undefined ||
            params.bendStiffness !== undefined ||
            params.damping !== undefined ||
            params.mass !== undefined ||
            params.stretchFactor !== undefined) {
            // Create a custom fabric preset based on the current fabric type
            const currentProps = FABRIC_PRESETS.get(this.fabricType);
            const customProps = {
                structuralStiffness: params.structuralStiffness !== undefined ? params.structuralStiffness : currentProps.structuralStiffness,
                shearStiffness: params.shearStiffness !== undefined ? params.shearStiffness : currentProps.shearStiffness,
                bendStiffness: params.bendStiffness !== undefined ? params.bendStiffness : currentProps.bendStiffness,
                damping: params.damping !== undefined ? params.damping : currentProps.damping,
                mass: params.mass !== undefined ? params.mass : currentProps.mass,
                stretchFactor: params.stretchFactor !== undefined ? params.stretchFactor : currentProps.stretchFactor
            };
            // Override the current fabric type's properties
            FABRIC_PRESETS.set(this.fabricType, customProps);
        }
        // If we're changing cloth density, we need to recreate the cloth
        const recreateCloth = params.clothDensity !== undefined &&
            params.clothDensity !== this.testConfigurations[currentIndex].clothDensity;
        // Update test configuration
        if (params.pinCorners !== undefined) {
            this.testConfigurations[currentIndex].pinCorners = params.pinCorners;
        }
        if (params.pinCenter !== undefined) {
            this.testConfigurations[currentIndex].pinCenter = params.pinCenter;
        }
        if (params.clothDensity !== undefined) {
            this.testConfigurations[currentIndex].clothDensity = params.clothDensity;
        }
        if (params.windEnabled !== undefined) {
            this.testConfigurations[currentIndex].windEnabled = params.windEnabled;
            // Update wind strength based on enabled state
            if (params.windEnabled) {
                if (params.windStrength !== undefined) {
                    this.testConfigurations[currentIndex].windStrength = params.windStrength;
                }
                else if (this.testConfigurations[currentIndex].windStrength === 0) {
                    this.testConfigurations[currentIndex].windStrength = 20.0; // Default if previously 0
                }
            }
            else {
                this.testConfigurations[currentIndex].windStrength = 0;
            }
        }
        else if (params.windStrength !== undefined) {
            this.testConfigurations[currentIndex].windStrength = params.windStrength;
            // Enable wind if strength is set to non-zero
            if (params.windStrength > 0) {
                this.testConfigurations[currentIndex].windEnabled = true;
            }
            else {
                this.testConfigurations[currentIndex].windEnabled = false;
            }
        }
        if (params.windDirection !== undefined) {
            this.testConfigurations[currentIndex].windDirection = params.windDirection.normalize();
        }
        // Apply changes to the cloth
        if (recreateCloth) {
            // If we need to change cloth density, recreate the entire cloth
            this.runClothTest(currentIndex);
        }
        else {
            // Otherwise, just update the existing cloth
            // Update wind parameters
            this.cloth.windStrength = this.testConfigurations[currentIndex].windEnabled ?
                this.testConfigurations[currentIndex].windStrength : 0;
            this.cloth.windDirection = this.testConfigurations[currentIndex].windDirection;
            // Update pin status for corners and center
            //   this.updatePinStatus();
            if (params.resetPins === true) {
                this.updatePinStatus();
            }
        }
    }
    // Helper method to update pin status based on configuration
    updatePinStatus() {
        const config = this.testConfigurations[this.currentTestIndex];
        const rows = this.cloth.particles.length;
        const cols = this.cloth.particles[0].length;
        // Reset all pins
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                this.cloth.particles[i][j].setFixed(false);
            }
        }
        // Pin corners if specified
        if (config.pinCorners) {
            const lastRow = rows - 1;
            const lastCol = cols - 1;
            this.cloth.particles[0][0].setFixed(true);
            this.cloth.particles[0][lastCol].setFixed(true);
            this.cloth.particles[lastRow][0].setFixed(true);
            this.cloth.particles[lastRow][lastCol].setFixed(true);
        }
        // Pin center if specified
        if (config.pinCenter) {
            const centerRow = Math.floor(rows / 2);
            const centerCol = Math.floor(cols / 2);
            this.cloth.particles[centerRow][centerCol].setFixed(true);
        }
    }
    /**
   * Get the current fabric type
   */
    getFabricType() {
        return this.fabricType;
    }
    /**
     * Get the current test configuration
     */
    getCurrentTestConfig() {
        if (this.currentTestIndex < 0 || this.currentTestIndex >= this.testConfigurations.length) {
            return null;
        }
        return this.testConfigurations[this.currentTestIndex];
    }
}
//# sourceMappingURL=ClothAnimation.js.map