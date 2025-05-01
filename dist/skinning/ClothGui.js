import { Camera } from "../lib/webglutils/Camera.js";
import { Mat4, Vec3, Vec4, Vec2 } from "../lib/TSM.js";
import { FabricType } from "./Cloth.js";
export var Mode;
(function (Mode) {
    Mode[Mode["edit"] = 0] = "edit";
    Mode[Mode["playback"] = 1] = "playback";
})(Mode || (Mode = {}));
// Basic Ray wrapper
class Ray {
    constructor(position, direction) {
        this.position = position;
        this.direction = direction;
    }
}
/**
 * Handles Mouse and Button events along with
 * the the camera.
 */
export class GUI {
    /**
     *
     * @param canvas required to get the width and height of the canvas
     * @param animation required as a back pointer for some of the controls
     */
    constructor(canvas, animation) {
        // Mouse interaction state
        this.isDraggingParticle = false;
        this.selectedParticleRow = -1;
        this.selectedParticleCol = -1;
        this.mousePosition = new Vec2([0, 0]);
        // Cloth control parameters
        this.windEnabled = false;
        this.windStrength = 0.0;
        this.currentFabricType = FabricType.COTTON;
        // Mesh test properties
        this.isMeshTest = false;
        this.currentFaceCount = 0;
        // Cloth test property
        this.clothControls = null;
        this.height = canvas.height;
        this.viewPortHeight = this.height - 200;
        this.width = canvas.width;
        this.prevX = 0;
        this.prevY = 0;
        this.animation = animation;
        this.reset();
        this.registerEventListeners(canvas);
    }
    setMode(mode) {
        this.mode = mode;
    }
    getTime() {
        return this.time;
    }
    getMode() {
        return this.mode;
    }
    /**
     * Resets the state of the GUI
     */
    reset() {
        this.fps = false;
        this.dragging = false;
        this.time = 0;
        this.mode = Mode.edit;
        this.isDraggingParticle = false;
        this.selectedParticleRow = -1;
        this.selectedParticleCol = -1;
        this.camera = new Camera(new Vec3([0, 18, -12]), new Vec3([0, 0, 0]), new Vec3([0, 1, 0]), 45, this.width / this.viewPortHeight, 0.1, 1000.0);
    }
    /**
     * Sets the GUI's camera to the given camera
     * @param cam a new camera
     */
    setCamera(pos, target, upDir, fov, aspect, zNear, zFar) {
        this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
    }
    /**
     * Returns the view matrix of the camera
     */
    viewMatrix() {
        return this.camera.viewMatrix();
    }
    /**
     * Returns the projection matrix of the camera
     */
    projMatrix() {
        return this.camera.projMatrix();
    }
    /**
     * Returns the camera position
     */
    cameraPosition() {
        return this.camera.pos();
    }
    /**
     * Callback function for the start of a drag event.
     * @param mouse
     */
    dragStart(mouse) {
        if (mouse.offsetY > 600) {
            // outside the main panel
            return;
        }
        this.prevX = mouse.screenX;
        this.prevY = mouse.screenY;
        this.dragging = true;
        // Store mouse position for interaction
        this.mousePosition = new Vec2([mouse.offsetX, mouse.offsetY]);
        // Check if we're clicking on a particle
        if (mouse.button === 0) { // Left mouse button
            const ray = this.getRayFromScreen(mouse.offsetX, mouse.offsetY);
            const result = this.findClosestParticle(ray);
            if (result.found) {
                this.selectedParticleRow = result.row;
                this.selectedParticleCol = result.col;
                this.isDraggingParticle = true;
                // Toggle fixed status with shift key
                if (mouse.shiftKey) {
                    const cloth = this.animation.getCloth();
                    const particle = cloth.particles[result.row][result.col];
                    particle.setFixed(!particle.isFixed);
                }
            }
        }
    }
    incrementTime(dT) {
        if (this.mode === Mode.playback) {
            this.time += dT;
        }
    }
    /**
     * The callback function for a drag event.
     * This event happens after dragStart and
     * before dragEnd.
     * @param mouse
     */
    drag(mouse) {
        if (this.dragging) {
            const dx = mouse.screenX - this.prevX;
            const dy = mouse.screenY - this.prevY;
            this.prevX = mouse.screenX;
            this.prevY = mouse.screenY;
            // Update mouse position
            this.mousePosition = new Vec2([mouse.offsetX, mouse.offsetY]);
            // Handle particle dragging
            if (this.isDraggingParticle) {
                this.dragSelectedParticle();
                return;
            }
            /* Left button, or primary button */
            const mouseDir = this.camera.right();
            mouseDir.scale(-dx);
            mouseDir.add(this.camera.up().scale(dy));
            mouseDir.normalize();
            if (dx === 0 && dy === 0) {
                return;
            }
            // Regular camera movement
            switch (mouse.buttons) {
                case 1: {
                    let rotAxis = Vec3.cross(this.camera.forward(), mouseDir);
                    rotAxis = rotAxis.normalize();
                    if (this.fps) {
                        this.camera.rotate(rotAxis, GUI.rotationSpeed);
                    }
                    else {
                        this.camera.orbitTarget(rotAxis, GUI.rotationSpeed);
                    }
                    break;
                }
                case 2: {
                    /* Right button, or secondary button */
                    this.camera.offsetDist(Math.sign(mouseDir.y) * GUI.zoomSpeed);
                    break;
                }
                default: {
                    break;
                }
            }
        }
    }
    /**
     * Callback function for the end of a drag event
     * @param mouse
     */
    dragEnd(mouse) {
        this.dragging = false;
        this.isDraggingParticle = false;
        this.selectedParticleRow = -1;
        this.selectedParticleCol = -1;
        this.prevX = 0;
        this.prevY = 0;
    }
    /**
     * Callback function for a key press event
     * @param key
     */
    onKeydown(key) {
        switch (key.code) {
            case "KeyW": {
                this.camera.offset(this.camera.forward().negate(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyA": {
                this.camera.offset(this.camera.right().negate(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyS": {
                this.camera.offset(this.camera.forward(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyD": {
                this.camera.offset(this.camera.right(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyR": {
                this.animation.reset();
                break;
            }
            case "KeyT": {
                // Run the sphere drop test
                this.animation.initSphereDropTest();
                break;
            }
            case "KeyY": {
                // Test all fabric types in sequence
                this.animation.testFabricGrid();
                break;
            }
            case "KeyF": {
                // Run the fancy sphere test
                this.animation.initFancySphereTest();
                break;
            }
            case "KeyG": {
                // Run the fabric grid test
                this.animation.testFabricGrid();
                break;
            }
            case "KeyS": {
                // Toggle sphere visibility
                this.animation.sphereVisible = !this.animation.sphereVisible;
                break;
            }
            case "Digit1":
            case "Digit2":
            case "Digit3":
            case "Digit4":
            case "Digit5":
            case "Digit6": {
                // Run test 0-5 based on which number key was pressed
                const testIndex = parseInt(key.code.replace("Digit", "")) - 1;
                if (testIndex >= 0 && testIndex < 6) {
                    this.animation.runClothTest(testIndex);
                }
                break;
            }
            case "KeyZ": {
                // Analyze cloth behavior
                this.animation.analyzeClothBehavior();
                break;
            }
            case "ArrowLeft": {
                this.camera.roll(GUI.rollSpeed, false);
                break;
            }
            case "ArrowRight": {
                this.camera.roll(GUI.rollSpeed, true);
                break;
            }
            case "ArrowUp": {
                this.camera.offset(this.camera.up(), GUI.zoomSpeed, true);
                break;
            }
            case "ArrowDown": {
                this.camera.offset(this.camera.up().negate(), GUI.zoomSpeed, true);
                break;
            }
            case "KeyP": {
                // Toggle playback mode
                this.mode = this.mode === Mode.edit ? Mode.playback : Mode.edit;
                break;
            }
            //   case "KeyC": {
            //     // Cut cloth at mouse position
            //     const ray = this.getRayFromScreen(this.mousePosition.x, this.mousePosition.y);
            //     this.animation.cutCloth(ray.position, ray.direction);
            //     break;
            //   }
            case "KeyV": {
                // Cycle through render modes
                this.animation.cycleRenderMode();
                break;
            }
            //   case "KeyM": {
            //     // Toggle wind
            //     this.windEnabled = !this.windEnabled;
            //     this.animation.toggleWind(this.windEnabled, this.windStrength);
            //     break;
            //   }
            default: {
                console.log("Key : '", key.code, "' was pressed.");
                break;
            }
        }
    }
    getRayFromScreen(x, y) {
        // Convert screen coordinates to normalized device coordinates (NDC)
        const xNDC = (2 * x) / this.width - 1;
        const yNDC = 1 - (2 * y) / this.viewPortHeight;
        // Create near and far plane points in NDC space
        const nearPointNDC = new Vec4([xNDC, yNDC, -1, 1]); // Near plane
        // Convert from NDC to view space using inverse projection
        const invProj = new Mat4();
        this.camera.projMatrix().inverse(invProj);
        let nearPointView = invProj.multiplyVec4(nearPointNDC);
        // Convert from view space to world space using inverse view matrix
        const invView = new Mat4();
        this.camera.viewMatrix().inverse(invView);
        const nearPointWorld = invView.multiplyVec4(nearPointView);
        nearPointWorld.scale(1 / nearPointWorld.w);
        const rayOrigin = this.camera.pos();
        const dir = new Vec3([
            nearPointWorld.x - rayOrigin.x,
            nearPointWorld.y - rayOrigin.y,
            nearPointWorld.z - rayOrigin.z
        ]).normalize();
        return new Ray(rayOrigin, dir);
    }
    findClosestParticle(ray) {
        const cloth = this.animation.getCloth();
        let minDistance = Infinity;
        let closestRow = -1;
        let closestCol = -1;
        // Search for closest particle
        for (let i = 0; i < cloth.particles.length; i++) {
            for (let j = 0; j < cloth.particles[i].length; j++) {
                const particle = cloth.particles[i][j];
                const particlePos = particle.position;
                // Calculate distance from ray to particle
                const toParticle = new Vec3([
                    particlePos.x - ray.position.x,
                    particlePos.y - ray.position.y,
                    particlePos.z - ray.position.z
                ]);
                const projDist = Vec3.dot(toParticle, ray.direction);
                // Skip particles behind the ray
                if (projDist < 0)
                    continue;
                // Calculate closest point on ray
                const projPoint = new Vec3([
                    ray.position.x + ray.direction.x * projDist,
                    ray.position.y + ray.direction.y * projDist,
                    ray.position.z + ray.direction.z * projDist
                ]);
                // Calculate distance from closest point to particle
                const distance = Vec3.distance(projPoint, particlePos);
                // Check if this is the closest particle so far
                const selectionRadius = 0.5; // Adjust based on your needs
                if (distance < selectionRadius && projDist < minDistance) {
                    minDistance = projDist;
                    closestRow = i;
                    closestCol = j;
                }
            }
        }
        return {
            found: closestRow !== -1,
            row: closestRow,
            col: closestCol,
            distance: minDistance
        };
    }
    dragSelectedParticle() {
        if (!this.isDraggingParticle)
            return;
        const cloth = this.animation.getCloth();
        if (this.selectedParticleRow >= 0 && this.selectedParticleRow < cloth.particles.length &&
            this.selectedParticleCol >= 0 && this.selectedParticleCol < cloth.particles[0].length) {
            const ray = this.getRayFromScreen(this.mousePosition.x, this.mousePosition.y);
            const particle = cloth.particles[this.selectedParticleRow][this.selectedParticleCol];
            // Project current particle position onto camera plane
            const cameraPlaneNormal = this.camera.forward();
            const cameraPlanePoint = particle.position.copy();
            // Calculate intersection of ray with camera plane
            const t = Vec3.dot(Vec3.difference(cameraPlanePoint, ray.position), cameraPlaneNormal) /
                Vec3.dot(ray.direction, cameraPlaneNormal);
            if (t >= 0) {
                // Calculate intersection point
                const intersectionPoint = new Vec3([
                    ray.position.x + ray.direction.x * t,
                    ray.position.y + ray.direction.y * t,
                    ray.position.z + ray.direction.z * t
                ]);
                // Update particle position
                if (!particle.isFixed) {
                    particle.position = intersectionPoint;
                    particle.oldPosition = intersectionPoint.copy(); // Reset velocity
                    particle.velocity = new Vec3([0, 0, 0]); // Reset velocity
                }
            }
        }
    }
    setMeshTestMode(enabled, faceCount = 0) {
        this.isMeshTest = enabled;
        this.currentFaceCount = faceCount;
    }
    getModeString() {
        const cloth = this.animation.getCloth();
        const fabricNames = ["Cotton", "Silk", "Leather", "Rubber"];
        const fabricName = fabricNames[this.currentFabricType];
        if (this.isMeshTest) {
            return `Mode: Mesh Test | Faces: ${this.currentFaceCount} | Time: ${this.time.toFixed(2)}`;
        }
        switch (this.mode) {
            case Mode.edit: {
                return `Mode: Edit | Fabric: ${fabricName} | Wind: ${this.windEnabled ? "ON" : "OFF"}`;
            }
            case Mode.playback: {
                return `Mode: Simulation | Time: ${this.time.toFixed(2)} | Energy: ${cloth.totalEnergy.toFixed(2)}`;
            }
            default: {
                return "Unknown Mode";
            }
        }
    }
    /**
     * Registers all event listeners for the GUI
     * @param canvas The canvas being used
     */
    registerEventListeners(canvas) {
        /* Event listener for key controls */
        window.addEventListener("keydown", (key) => this.onKeydown(key));
        /* Event listener for mouse controls */
        canvas.addEventListener("mousedown", (mouse) => this.dragStart(mouse));
        canvas.addEventListener("mousemove", (mouse) => this.drag(mouse));
        canvas.addEventListener("mouseup", (mouse) => this.dragEnd(mouse));
        /* Event listener to stop the right click menu */
        canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    }
    getClothControls() {
        return this.clothControls;
    }
}
GUI.rotationSpeed = 0.05;
GUI.zoomSpeed = 0.1;
GUI.rollSpeed = 0.1;
GUI.panSpeed = 0.1;
//# sourceMappingURL=ClothGui.js.map