import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Bone } from "./Scene.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { KeyFrame } from "./Scene.js"; 

/**
 * Might be useful for designing any animation GUI
 */
interface IGUI {
  viewMatrix(): Mat4;
  projMatrix(): Mat4;
  dragStart(me: MouseEvent): void;
  drag(me: MouseEvent): void;
  dragEnd(me: MouseEvent): void;
  onKeydown(ke: KeyboardEvent): void;
}

export enum Mode {
  playback,
  edit
}

// Basic Ray wrapper
class Ray {
  position: Vec3;
  direction: Vec3;

  constructor(position: Vec3, direction: Vec3) {
    this.position = position;
    this.direction = direction;
  }
}

/**
 * Handles Mouse and Button events along with
 * the the camera.
 */

export class GUI implements IGUI {
  private static readonly rotationSpeed: number = 0.05;
  private static readonly zoomSpeed: number = 0.1;
  private static readonly rollSpeed: number = 0.1;
  private static readonly panSpeed: number = 0.1;

  private camera: Camera;
  private dragging: boolean;
  private fps: boolean;
  private prevX: number;
  private prevY: number;

  public fullWidth: number;
  public fullHeight: number;
  public mainViewWidth: number;
  public mainViewHeight: number;
  public statusBarHeight: number = 200; // Height of the status bar area
  public previewWidth: number = 320; // Width of the new preview panel

  private animation: SkinningAnimation;

  // Added properties for bone manipulation
  private highlightedBoneIndex: number = -1;  // Currently highlighted bone (-1 means none) //selected bone
  private highlightedBone: Bone;
  private boneDragging: boolean = false; // Whether we're currently dragging a bone
  // private dragStartX: number = 0;        // Starting X coordinate for drag
  // private dragStartY: number = 0;        // Starting Y coordinate for drag
  private boneRadius: number = 0.1;      // Radius for bone picking

  public time: number;
  public mode: Mode;

  public hoverX: number = 0;
  public hoverY: number = 0;

  // Keyframe properties
  private keyframes: KeyFrame[] = [];
  private currentKeyframeTime: number = 0;
  private keyframeInterval: number = 1.0; // 1 second per keyframe

  // preview fields
  public currentKeyframeIndex: number = 0;

  /**
   *
   * @param canvas required to get the width and height of the canvas
   * @param animation required as a back pointer for some of the controls
   * @param sponge required for some of the controls
   */
  constructor(canvas: HTMLCanvasElement, animation: SkinningAnimation) {
    // Store full canvas dimensions
    this.fullWidth = canvas.width;
    this.fullHeight = canvas.height;

    // Calculate main view dimensions
    this.mainViewWidth = this.fullWidth - this.previewWidth; // e.g., 1120 - 320 = 800
    this.mainViewHeight = this.fullHeight - this.statusBarHeight; // e.g., 800 - 200 = 600

    this.prevX = 0;
    this.prevY = 0;

    this.animation = animation;
    this.keyframes = []; // Initialize empty keyframes array

    this.reset(); // Calls camera setup

    this.registerEventListeners(canvas);
  }

  // preview functions
  // methods to the GUI class for working with keyframes:
  public getCurrentKeyframeIndex(): number {
    return this.currentKeyframeIndex;
  }

  public getKeyframe(index: number): KeyFrame {
      if (index >= 0 && index < this.keyframes.length) {
          return this.keyframes[index];
      }
      // Return the current keyframe if the index is invalid
      return this.keyframes[this.currentKeyframeIndex];
  }

  // Update the addKeyframe method to also set the current keyframe index
  public addKeyframe(keyframe: KeyFrame): void {
      this.keyframes.push(keyframe);
      this.currentKeyframeIndex = this.keyframes.length - 1;
      
      // Render the new keyframe to texture
      // this.animation.renderKeyframeToTexture(this.currentKeyframeIndex);
  }

  // Add keyframe scrolling method
  public scrollKeyframePreviews(direction: number): void {
      // Positive direction scrolls up, negative scrolls down
      this.animation.previewScrollOffset += direction;
      
      // Ensure scroll offset stays within range
      const minOffset = 0;
      const maxOffset = Math.max(0, this.getNumKeyFrames() - 1);
      this.animation.previewScrollOffset = Math.min(Math.max(this.animation.previewScrollOffset, minOffset), maxOffset);
  }

  public getNumKeyFrames(): number {
    //TODO: Fix for the status bar in the GUI
    return this.keyframes.length;
  }

  public getTime(): number {
    return this.time;
  }

  public getMaxTime(): number {
    //TODO: The animation should stop after the last keyframe
    return Math.max(0, this.keyframes.length - 1) * this.keyframeInterval;
  }

  /**
   * Resets the state of the GUI
   */
  public reset(): void {
    this.fps = false;
    this.dragging = false;
    this.time = 0;
    this.mode = Mode.edit;
    this.highlightedBoneIndex = -1;
    this.boneDragging = false;
    this.keyframes = []; // Clear keyframes
    this.currentKeyframeTime = 0;

    this.camera = new Camera(
      new Vec3([0, 0, -6]),
      new Vec3([0, 0, 0]),
      new Vec3([0, 1, 0]),
      45,
      this.mainViewWidth / this.mainViewHeight,
      0.1,
      1000.0
    );
  }

  /**
   * Sets the GUI's camera to the given camera
   * @param cam a new camera
   */
  public setCamera(
    pos: Vec3,
    target: Vec3,
    upDir: Vec3,
    fov: number,
    // aspect: number, // Aspect is now calculated internally
    zNear: number,
    zFar: number
  ) {
    const aspect = this.mainViewWidth / this.mainViewHeight; // Recalculate aspect
    this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
  }

  /**
   * Returns the view matrix of the camera
   */
  public viewMatrix(): Mat4 {
    return this.camera.viewMatrix();
  }

  /**
   * Returns the projection matrix of the camera
   */
  public projMatrix(): Mat4 {
    return this.camera.projMatrix();
  }

  /**
   * Callback function for the start of a drag event.
   * @param mouse
   */
  public dragStart(mouse: MouseEvent): void {
    // Check if the event is outside the main view or in the status bar
    if (mouse.offsetX >= this.mainViewWidth || mouse.offsetY >= this.mainViewHeight) {
      this.dragging = false; // Ensure dragging stops if started outside
      this.boneDragging = false;
      return;
    }

    this.prevX = mouse.screenX;
    this.prevY = mouse.screenY;
    this.dragging = true;

    // Check bone dragging only if a bone is highlighted
    if (this.highlightedBoneIndex > -1) {
      this.boneDragging = true;
    } else {
        this.boneDragging = false;
    }
  }

  public incrementTime(dT: number): void {
    if (this.mode === Mode.playback) {
      const prevTime = this.time;
      this.time += dT;
      if (this.time >= this.getMaxTime()) {
        this.time = 0;
        this.mode = Mode.edit;
        return;
      }

      // Interpolate between keyframes
      this.updateAnimationPose();
    }
  }

  public updateAnimationPose(): void {
    if (this.keyframes.length < 2) return;
    
    // Calculate which keyframes we're between and the interpolation factor
    const keyframeIndex = Math.floor(this.time / this.keyframeInterval);
    const nextKeyframeIndex = Math.min(keyframeIndex + 1, this.keyframes.length - 1);
    const t = (this.time % this.keyframeInterval) / this.keyframeInterval;
    
    // Get the keyframes
    const keyframe1 = this.keyframes[keyframeIndex];
    const keyframe2 = this.keyframes[nextKeyframeIndex];
    
    // Interpolate between them
    const mesh = this.animation.getScene().meshes[0];
    mesh.interpolateKeyframes(keyframe1, keyframe2, t);
  }

  private projectToScreen(worldCoords: Vec3): Vec2 {
    // projection steps:
    // world coords --> view coords --> NDCs --> screen coords
    let viewCoords = this.camera.viewMatrix().multiplyVec4(new Vec4([worldCoords.x, worldCoords.y, worldCoords.z, 1.0]));
    let normDC = this.camera.projMatrix().multiplyVec4(viewCoords);
    normDC.scale(1 / normDC.w);
    
    let x = ((normDC.x + 1) * this.mainViewWidth) * 0.5;
    let y = ((1 - normDC.y) * this.mainViewHeight) * 0.5;

    return new Vec2([x, y]);
  }


  /**
   * The callback function for a drag event.
   * This event happens after dragStart and
   * before dragEnd.
   * @param mouse
   */
  public drag(mouse: MouseEvent): void {
    const x = mouse.offsetX;
    const y = mouse.offsetY;

    // Update hover coordinates for bone highlighting
    // this.hoverX = x;
    // this.hoverY = y;

    //check bone dragging for rotate
    if (this.boneDragging){
      // console.log("alsgjlsdjf");
      const boneScreenStartPos = this.projectToScreen(this.highlightedBone.position); //joint
      const boneScreenEndPos = this.projectToScreen(this.highlightedBone.endpoint);

      const prevMouseVec = new Vec2([boneScreenEndPos.x - boneScreenStartPos.x, boneScreenEndPos.y - boneScreenStartPos.y]);
      const curMouseVec = new Vec2([x - boneScreenStartPos.x, y - boneScreenStartPos.y]);

      const angle = Math.atan2(prevMouseVec.y, prevMouseVec.x) - Math.atan2(curMouseVec.y, curMouseVec.x);
      // const angle = Math.atan2(prevMouseVec.y - curMouseVec.y, prevMouseVec.x - curMouseVec.x); //check??
      const rotQuat = Quat.fromAxisAngle(this.camera.forward().normalize(), angle);
      const rotMatrix = rotQuat.toMat4();

      //call rotate on mesh to get parent to get matrices
      const mesh = this.animation.getScene().meshes[0];
      mesh.rotate(this.highlightedBoneIndex, rotMatrix, true);
    } else if (this.dragging) {
      const dx = mouse.screenX - this.prevX;
      const dy = mouse.screenY - this.prevY;
      this.prevX = mouse.screenX;
      this.prevY = mouse.screenY;

      /* Left button, or primary button */
      const mouseDir: Vec3 = this.camera.right();
      mouseDir.scale(-dx);
      mouseDir.add(this.camera.up().scale(dy));
      mouseDir.normalize();

      if (dx === 0 && dy === 0) {
        return;
      }
      // Regular camera movement
      switch (mouse.buttons) {
        case 1: {
          let rotAxis: Vec3 = Vec3.cross(this.camera.forward(), mouseDir);
          rotAxis = rotAxis.normalize();

          if (this.fps) {
            this.camera.rotate(rotAxis, GUI.rotationSpeed);
          } else {
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
    } else {
      const cursorRay = this.getRayFromScreen(x, y);

      let closestBone: Bone | null = null;
      let closestBoneIndex: number = -1;
      let minT = Infinity;
      const useMesh = this.animation.getScene().meshes[0];
      for (let mesh of this.animation.getScene().meshes) {
        let index = 0;
        for (let bone of mesh.bones) {
          let intersectionTime = this.rayIntersectsBone(cursorRay, bone, 0.1);
          if (intersectionTime < minT) {
            minT = intersectionTime;
            closestBoneIndex = index;
            closestBone = bone;
          }
          index += 1;
        }
      }

      if (closestBone != null && useMesh != null) { // need this check explicity
        this.highlightedBone = closestBone;
      }
      this.highlightedBoneIndex = closestBoneIndex;
      // this.animation.setHighlightedBone(this.highlightedBoneIndex);
    }
  }

    private rayIntersectsBone(ray: Ray, bone: Bone, radius: number): number {
      const p1_x = bone.position.copy(); // Bone start
      const p2_x = bone.endpoint.copy(); // Bone end

      const rayDirection = ray.direction; // Ray direction
      const cylAxis = p2_x.copy().subtract(p1_x.copy()).normalize(); // Bone axis vector
      const deltaP = ray.position.copy().subtract(p1_x.copy()); // Ray origin relative to bone start

      const m = Vec3.cross(rayDirection, cylAxis);
      const n = Vec3.cross(deltaP, cylAxis);

      const A = Vec3.dot(m, m);
      const B = 2 * Vec3.dot(m, n);
      const C = Vec3.dot(n, n) - radius * radius;

      // Solve for t using quadratic formula
      const discriminant = B * B - 4 * A * C;
      if (discriminant < 0) return Infinity; // No intersection

      const sqrtDisc = Math.sqrt(discriminant);
      let t1 = (-B - sqrtDisc) / (2 * A);
      let t2 = (-B + sqrtDisc) / (2 * A);

      // project p1, p2 from ray to cyl
      const p1 = ray.position.copy().add(rayDirection.copy().scale(t1));
      const p2 = ray.position.copy().add(rayDirection.copy().scale(t2)); 

      // take dot product with cylAxis but do px - cylStart and then do dot
      // ensure >= 0
      const p1Proj = Vec3.dot(p1.copy().subtract(p1_x), cylAxis);
      const p2Proj = Vec3.dot(p2.copy().subtract(p1_x), cylAxis);

      const boneLength = p2_x.copy().subtract(p1_x).length();

      const validT1 = (p1Proj >= 0) && (p1Proj <= boneLength);
      const validT2 = (p2Proj >= 0) && (p2Proj <= boneLength);

      if (validT1 && validT2) return Math.min(t1, t2);
      if (validT1) return t1;
      if (validT2) return t2;
      return Infinity;
      
  }

  // RAY TRACING HELPER FUNCTIONS
  private getRayFromScreen(x: number, y: number): Ray {
    // (1) Convert screen coordinates to normalized device coordinates (NDC)
    const xNDC = (2 * x) / this.mainViewWidth - 1;
    const yNDC = 1 - (2 * y) / this.mainViewHeight;

    // (2) Create near and far plane points in NDC space
    const nearPointNDC = new Vec4([xNDC, yNDC, -1, 1]); // Near plane

    // (3) Convert from NDC to view space using inverse projection
    const invProj = new Mat4();
    this.camera.projMatrix().inverse(invProj);
    let nearPointView = invProj.multiplyVec4(nearPointNDC);

    // (4) Convert from view space to world space using inverse view matrix
    const invView = new Mat4();
    this.camera.viewMatrix().inverse(invView);

    const nearPointWorld = invView.multiplyVec4(nearPointView);
    nearPointWorld.scale(1 / nearPointWorld.w);

    const rayOrigin_new = this.camera.pos();
    const pos = new Vec4([rayOrigin_new.x, rayOrigin_new.y, rayOrigin_new.z, 1]);    
    const dir = nearPointWorld.copy().subtract(pos).normalize();
    const rayDirection_new = new Vec3([dir.x, dir.y, dir.z]);

    return new Ray(rayOrigin_new, rayDirection_new);
  }

  public getModeString(): string {
    switch (this.mode) {
      case Mode.edit: { return "edit: " + this.getNumKeyFrames() + " keyframes"; }
      case Mode.playback: { return "playback: " + this.getTime().toFixed(2) + " / " + this.getMaxTime().toFixed(2); }
    }
  }

  /**
   * Callback function for the end of a drag event
   * @param mouse
   */
  public dragEnd(mouse: MouseEvent): void {
    this.dragging = false;
    this.boneDragging = false;
    this.prevX = 0;
    this.prevY = 0;
  }

  /**
   * Callback function for a key press event
   * @param key
   */
  public onKeydown(key: KeyboardEvent): void {
    switch (key.code) {
      case "Digit1": {
        this.animation.setScene("./static/assets/skinning/split_cube.dae");
        this.animation.reset();
        break;
      }
      case "Digit2": {
        this.animation.setScene("./static/assets/skinning/long_cubes.dae");
        this.animation.reset();
        break;
      }
      case "Digit3": {
        this.animation.setScene("./static/assets/skinning/simple_art.dae");
        this.animation.reset();
        break;
      }
      case "Digit4": {
        this.animation.setScene("./static/assets/skinning/mapped_cube.dae");
        this.animation.reset();
        break;
      }
      case "Digit5": {
        this.animation.setScene("./static/assets/skinning/robot.dae");
        this.animation.reset();
        break;
      }
      case "Digit6": {
        this.animation.setScene("./static/assets/skinning/head.dae");
        this.animation.reset();
        break;
      }
      case "Digit7": {
        this.animation.setScene("./static/assets/skinning/wolf.dae");
        this.animation.reset();
        break;
      }
      case "KeyW": {
        this.camera.offset(
          this.camera.forward().negate(),
          GUI.zoomSpeed,
          true
        );
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
      case "KeyK": {
        if (this.mode === Mode.edit) {
          const mesh = this.animation.getScene().meshes[0];
          if (mesh) {
            console.log("in if");
            // Capture current pose as a keyframe
            const keyframe = mesh.captureKeyframe();
            this.keyframes.push(keyframe);
            console.log(`Keyframe ${this.keyframes.length} added`);
          }
        }
        // Render the new keyframe to texture
        // this.animation.renderKeyframeToTexture(this.currentKeyframeIndex);
        this.animation.previewRender(this.currentKeyframeIndex);
        break;
      }
      case "KeyP": {
        if (this.mode === Mode.edit && this.getNumKeyFrames() > 1) {
          this.mode = Mode.playback;
          this.time = 0;
          console.log("Starting animation playback");
        } else if (this.mode === Mode.playback) {
          this.mode = Mode.edit;
          console.log("Stopping animation playback");
        }
        break;
      }
      case "KeyR": {
        this.animation.reset();
        break;
      }
      case "KeyM": {
        // Move to previous keyframe
        if (this.currentKeyframeIndex > 0) {
          this.currentKeyframeIndex -= 1;
          // Apply the previous keyframe
          const mesh = this.animation.getScene().meshes[0];
          if (mesh) {
            mesh.applyKeyframe(this.keyframes[this.currentKeyframeIndex]);
          }
          this.animation.previewRender(this.currentKeyframeIndex);
        }
        break;
      }
      case "KeyN": {
        // Move to next keyframe
        if (this.currentKeyframeIndex < this.keyframes.length - 1) {
          this.currentKeyframeIndex += 1;
          // Apply the next keyframe
          const mesh = this.animation.getScene().meshes[0];
          if (mesh) {
            mesh.applyKeyframe(this.keyframes[this.currentKeyframeIndex]);
          }
          this.animation.previewRender(this.currentKeyframeIndex);
        }
        break;
      }
      case "ArrowLeft": 
      case "ArrowRight":{
        if (this.highlightedBoneIndex!=-1) {
          let flip = key.code == "ArrowLeft";
          const mesh = this.animation.getScene().meshes[0];
          mesh.roll(this.highlightedBoneIndex, GUI.rollSpeed, flip);
        } else {
          if (key.code == "ArrowRight") {
            this.camera.roll(GUI.rollSpeed, true);
          } else {
            this.camera.roll(GUI.rollSpeed, false);
          }
        }
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
      default: {
        console.log("Key : '", key.code, "' was pressed.");
        break;
      }
    }
  }

  // Get the currently highlighted bone index
  public getHighlightedBone(): number {
    return this.highlightedBoneIndex;
  }

  // private registerKeyframePreviewListeners(canvas: HTMLCanvasElement): void {
  //   // Add mouse wheel listener for scrolling keyframe previews
  //   canvas.addEventListener("wheel", (event: WheelEvent) => {
  //       // Only handle wheel events in the preview panel area
  //       if (event.offsetX >= this.mainViewWidth) {
  //           const scrollDirection = event.deltaY > 0 ? 1 : -1;
  //           this.scrollKeyframePreviews(scrollDirection);
  //           event.preventDefault();
  //       }
  //   });
    
  //   // Add click listener for selecting keyframes
  //   canvas.addEventListener("click", (event: MouseEvent) => {
  //       // Only handle clicks in the preview panel area
  //       if (event.offsetX >= this.mainViewWidth && this.mode === Mode.edit) {
  //           // Calculate which keyframe was clicked based on position
  //           const previewSize = 150; // Same as in renderKeyframePreviews
  //           const previewSpacing = 10;
            
  //           // Calculate index based on Y position
  //           const clickY = event.offsetY;
  //           const indexFromBottom = Math.floor(clickY / (previewSize + previewSpacing));
  //           const maxVisiblePreviews = Math.floor(canvas.height / (previewSize + previewSpacing));
            
  //           // Convert to actual keyframe index
  //           const clickedIndex = this.animation.previewScrollOffset + 
  //               (maxVisiblePreviews - indexFromBottom - 1);
                
  //           // If valid index, select that keyframe
  //           if (clickedIndex >= 0 && clickedIndex < this.keyframes.length) {
  //               this.currentKeyframeIndex = clickedIndex;
                
  //               // Apply the selected keyframe
  //               const mesh = this.animation.getScene().meshes[0];
  //               if (mesh) {
  //                   mesh.applyKeyframe(this.keyframes[this.currentKeyframeIndex]);
  //               }
  //           }
  //       }
  //   });
  // }

  /**
   * Registers all event listeners for the GUI
   * @param canvas The canvas being used
   */
  private registerEventListeners(canvas: HTMLCanvasElement): void {
    /* Event listener for key controls */
    window.addEventListener("keydown", (key: KeyboardEvent) =>
      this.onKeydown(key)
    );

    /* Event listener for mouse controls */
    canvas.addEventListener("mousedown", (mouse: MouseEvent) =>
      this.dragStart(mouse)
    );

    canvas.addEventListener("mousemove", (mouse: MouseEvent) =>
      this.drag(mouse)
    );

    canvas.addEventListener("mouseup", (mouse: MouseEvent) =>
      this.dragEnd(mouse)
    );

    /* Event listener to stop the right click menu */
    canvas.addEventListener("contextmenu", (event: any) =>
      event.preventDefault()
    );

    // Register keyframe preview listeners
    // this.registerKeyframePreviewListeners(canvas);
  }
}