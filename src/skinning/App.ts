import { Debugger } from "../lib/webglutils/Debugging.js";
import {
  CanvasAnimation,
  WebGLUtilities
} from "../lib/webglutils/CanvasAnimation.js";
import { Floor } from "../lib/webglutils/Floor.js";
import { GUI, Mode } from "./Gui.js";
import {
  sceneFSText,
  sceneVSText,
  floorFSText,
  floorVSText,
  skeletonFSText,
  skeletonVSText,
  sBackVSText,
  sBackFSText,
  highlightBoneVSText,
  highlightBoneFSText,
  previewVSText,
  previewFSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { CLoader } from "./AnimationFileLoader.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Camera } from "../lib/webglutils/Camera.js";
import { generateCylinderGeometry } from "./Scene.js";

export class SkinningAnimation extends CanvasAnimation {
  private gui: GUI;
  private millis: number;

  private loadedScene: string;

  /* Floor Rendering Info */
  private floor: Floor;
  private floorRenderPass: RenderPass;

  /* Scene rendering info */
  private scene: CLoader;
  private sceneRenderPass: RenderPass;

  /* Skeleton rendering info */
  private skeletonRenderPass: RenderPass;

  /* Highlight bone rendering info */
  private highlightBoneRenderPass: RenderPass;

  /* Scrub bar background rendering info */
  private sBackRenderPass: RenderPass;

  /* Global Rendering Info */
  private lightPosition: Vec4;
  private backgroundColor: Vec4;

  private canvas2d: HTMLCanvasElement;
  private ctx2: CanvasRenderingContext2D | null;

  /* Preview fields*/
  private previewRenderPass: RenderPass;
  public keyframeTextures: WebGLTexture[] = [];
  private keyframeFramebuffers: WebGLFramebuffer[] = [];
  public previewScrollOffset: number = 0;
  private readonly keyframeTextureSize: number = 256; // Size of each keyframe texture

  public topKeyframe: number = -1;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.canvas2d = document.getElementById("textCanvas") as HTMLCanvasElement;
    this.ctx2 = this.canvas2d.getContext("2d");
    if (this.ctx2) {
      this.ctx2.font = "25px serif";
      this.ctx2.fillStyle = "#ffffffff";
    }

    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;

    this.floor = new Floor();

    this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
    this.sceneRenderPass = new RenderPass(this.extVAO, gl, sceneVSText, sceneFSText);
    this.skeletonRenderPass = new RenderPass(this.extVAO, gl, skeletonVSText, skeletonFSText);
    this.highlightBoneRenderPass = new RenderPass(this.extVAO, gl, highlightBoneVSText, highlightBoneFSText);
    this.previewRenderPass = new RenderPass(this.extVAO, gl, previewVSText, previewFSText);

    this.gui = new GUI(this.canvas2d, this);
    this.lightPosition = new Vec4([-10, 10, -10, 1]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);

    this.initFloor();
    this.scene = new CLoader("");

    // Initialize the preview render pass
    this.initPreviewRenderPass();

    // Status bar
    this.sBackRenderPass = new RenderPass(this.extVAO, gl, sBackVSText, sBackFSText);

    this.initGui();

    this.millis = new Date().getTime();
  }

  public getScene(): CLoader {
    return this.scene;
  }

  /**
   * Setup the animation. This can be called again to reset the animation.
   */
  public reset(): void {
    this.gui.reset();
    this.setScene(this.loadedScene);
    this.keyframeTextures = [];
    this.keyframeFramebuffers = [];
    this.gui.currentKeyframeIndex = 0;
  }

  public initGui(): void {

    // Status bar background
    let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
    this.sBackRenderPass.setIndexBufferData(new Uint32Array([1, 0, 2, 2, 0, 3]))
    this.sBackRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false,
      2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, verts);

    this.sBackRenderPass.setDrawData(this.ctx.TRIANGLES, 6, this.ctx.UNSIGNED_INT, 0);
    this.sBackRenderPass.setup();

  }

  public initScene(): void {
    if (this.scene.meshes.length === 0) { return; }
    this.initModel();
    this.initSkeleton();
    this.gui.reset();
  }

  /**
   * Sets up the mesh and mesh drawing
   */
  public initModel(): void {
    this.sceneRenderPass = new RenderPass(this.extVAO, this.ctx, sceneVSText, sceneFSText);

    let faceCount = this.scene.meshes[0].geometry.position.count / 3;
    let fIndices = new Uint32Array(faceCount * 3);
    for (let i = 0; i < faceCount * 3; i += 3) {
      fIndices[i] = i;
      fIndices[i + 1] = i + 1;
      fIndices[i + 2] = i + 2;
    }
    this.sceneRenderPass.setIndexBufferData(fIndices);

    this.sceneRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.position.values);
    this.sceneRenderPass.addAttribute("aNorm", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.normal.values);
    if (this.scene.meshes[0].geometry.uv) {
      this.sceneRenderPass.addAttribute("aUV", 2, this.ctx.FLOAT, false,
        2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.uv.values);
    } else {
      this.sceneRenderPass.addAttribute("aUV", 2, this.ctx.FLOAT, false,
        2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array(this.scene.meshes[0].geometry.normal.values.length));
    }

    this.sceneRenderPass.addAttribute("skinIndices", 4, this.ctx.FLOAT, false,
      4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.skinIndex.values);
    this.sceneRenderPass.addAttribute("skinWeights", 4, this.ctx.FLOAT, false,
      4 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.skinWeight.values);
    // this.sceneRenderPass.addAttribute("v0", 3, this.ctx.FLOAT, false,
    //   3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v0.values);
    // this.sceneRenderPass.addAttribute("v1", 3, this.ctx.FLOAT, false,
    //   3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v1.values);
    // this.sceneRenderPass.addAttribute("v2", 3, this.ctx.FLOAT, false,
    //   3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v2.values);
    // this.sceneRenderPass.addAttribute("v3", 3, this.ctx.FLOAT, false,
    //   3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].geometry.v3.values);

    this.sceneRenderPass.addUniform("lightPosition",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
      });
    this.sceneRenderPass.addUniform("mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(new Mat4().setIdentity().all()));
      });
    this.sceneRenderPass.addUniform("mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
      });
    this.sceneRenderPass.addUniform("mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
      });
    this.sceneRenderPass.addUniform("jTrans",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform3fv(loc, this.scene.meshes[0].getBoneTranslations());
      });
    this.sceneRenderPass.addUniform("jRots",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.scene.meshes[0].getBoneRotations());
      });

      this.sceneRenderPass.addUniform("jDQs",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.scene.meshes[0].getBoneDualQuaternions());
    });

    this.sceneRenderPass.setDrawData(this.ctx.TRIANGLES, this.scene.meshes[0].geometry.position.count, this.ctx.UNSIGNED_INT, 0);
    this.sceneRenderPass.setup();
  }

  /**
   * Sets up the skeleton drawing
   */
  public initSkeleton(): void {
    this.skeletonRenderPass.setIndexBufferData(this.scene.meshes[0].getBoneIndices());

    this.skeletonRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].getBonePositions());
    this.skeletonRenderPass.addAttribute("boneIndex", 1, this.ctx.FLOAT, false,
      1 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.scene.meshes[0].getBoneIndexAttribute());

    this.skeletonRenderPass.addUniform("mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
      });
    this.skeletonRenderPass.addUniform("mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
      });
    this.skeletonRenderPass.addUniform("mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
      });
    this.skeletonRenderPass.addUniform("bTrans",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform3fv(loc, this.getScene().meshes[0].getBoneTranslations());
      });
    this.skeletonRenderPass.addUniform("bRots",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.getScene().meshes[0].getBoneRotations());
      });

    this.skeletonRenderPass.setDrawData(this.ctx.LINES,
      this.scene.meshes[0].getBoneIndices().length, this.ctx.UNSIGNED_INT, 0);
    this.skeletonRenderPass.setup();
  }

  // Initialize cylinder geometry for highlighting bones
  public initHighlightBone(): void {
    if (this.scene.meshes.length === 0 || this.gui.getHighlightedBone() < 0) {
      return;
    }

    const highlightedBone = this.gui.getHighlightedBone();
    const bone = this.scene.meshes[0].bones[highlightedBone];

    // Generate cylinder geometry
    const cylinderGeometry = generateCylinderGeometry(bone, 0.08, 12);

    this.highlightBoneRenderPass.setIndexBufferData(cylinderGeometry.indices);

    this.highlightBoneRenderPass.addAttribute(
      "vertPosition",
      3,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      cylinderGeometry.positions
    );

    this.highlightBoneRenderPass.addUniform(
      "mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
      }
    );

    this.highlightBoneRenderPass.addUniform(
      "mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
      }
    );

    this.highlightBoneRenderPass.addUniform(
      "mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
      }
    );

    this.highlightBoneRenderPass.setDrawData(
      this.ctx.LINES,
      cylinderGeometry.indices.length,
      this.ctx.UNSIGNED_INT,
      0
    );

    this.highlightBoneRenderPass.setup();
  }

  /**
   * Sets up the floor drawing
   */
  public initFloor(): void {
    this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
    this.floorRenderPass.addAttribute("aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.floor.positionsFlat()
    );

    this.floorRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
      });
    this.floorRenderPass.addUniform("uWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
      });
    this.floorRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
      });
    this.floorRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
      });
    this.floorRenderPass.addUniform("uProjInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
      });
    this.floorRenderPass.addUniform("uViewInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
      });

    this.floorRenderPass.setDrawData(this.ctx.TRIANGLES, this.floor.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.floorRenderPass.setup();
  }

  // initialize the preview render pass
  public initPreviewRenderPass(): void {
    const gl = this.ctx;
    
    // Set up vertices for a quad
    const quadVertices = new Float32Array([
        // X, Y
        -1, -1,  // Bottom left
        1, -1,  // Bottom right
        1,  1,  // Top right
        -1,  1   // Top left
    ]);
    
    // Set up texture coordinates
    const texCoords = new Float32Array([
        // U, V
        0, 0,  // Bottom left
        1, 0,  // Bottom right
        1, 1,  // Top right
        0, 1   // Top left
    ]);
    
    // Set up indices
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
    
    // Set up render pass attributes and uniforms
    this.previewRenderPass.setIndexBufferData(indices);
    this.previewRenderPass.addAttribute("vertPosition", 2, gl.FLOAT, false, 
        2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, quadVertices);
    this.previewRenderPass.addAttribute("texCoord", 2, gl.FLOAT, false, 
        2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, texCoords);
        
    this.previewRenderPass.addUniform("mProj", 
        (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
            // Use orthographic projection for 2D rendering
            const orthoMatrix = new Mat4().setIdentity();
            orthoMatrix[0] = 2 / 320;
            orthoMatrix[5] = 2 / this.gui.fullHeight;
            orthoMatrix[12] = -1;
            orthoMatrix[13] = -1;
            gl.uniformMatrix4fv(loc, false, new Float32Array(orthoMatrix.all()));
        });
        
    this.previewRenderPass.addUniform("mWorld", 
        (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
            gl.uniformMatrix4fv(loc, false, new Float32Array(new Mat4().setIdentity().all()));
        });
        
    this.previewRenderPass.addUniform("uTexture", 
        (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
            gl.uniform1i(loc, 0); // Use texture unit 0
        });
        
    this.previewRenderPass.setDrawData(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);
    this.previewRenderPass.setup();
  }


  /** @internal
   * Draws a single frame
   *
   */
  public draw(): void {
    // Update skeleton state
    let curr = new Date().getTime();
    let deltaT = curr - this.millis;
    this.millis = curr;
    deltaT /= 1000;
    this.getGUI().incrementTime(deltaT);

    if (this.ctx2) {
      this.ctx2.clearRect(0, 0, this.ctx2.canvas.width, this.ctx2.canvas.height);
      if (this.scene.meshes.length > 0) {
        this.ctx2.fillText(this.getGUI().getModeString(), 50, 710);
      }
    }

    // Drawing
    const gl: WebGLRenderingContext = this.ctx;
    const bg: Vec4 = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
    this.drawScene(0, 200, 800, 600);

    /* Draw status bar */
    if (this.scene.meshes.length > 0) {
      gl.viewport(0, 0, 800, 200);
      this.sBackRenderPass.draw();
    }

    // Now render the preview panel if there are any keyframes
    if (this.scene.meshes.length > 0 && this.gui.getNumKeyFrames() > 0) {
      gl.scissor(800, 0, 320, this.gui.fullHeight);
      gl.enable(gl.SCISSOR_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      this.previewRender(this.gui.currentKeyframeIndex);
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  public previewRender(currentIndex: number): void{
    if (this.scene.meshes.length === 0 || this.gui.getNumKeyFrames() === 0) {
      return;
    }

    // Set up for rendering previews

    const gl = this.ctx;
    const numKeyframes = this.gui.getNumKeyFrames();
      
    // Calculate how many previews fit in the panel
    const previewSize = 225; // Size of each preview in pixels
    const previewSpacing = 10; // Space between previews
    // const maxVisiblePreviews = Math.floor(this.gui.fullHeight / (previewSize + previewSpacing));
    const maxVisiblePreviews = Math.min(3, numKeyframes - currentIndex);

    let posY = 590;
    const posX = this.gui.fullWidth - this.gui.previewWidth / 2;
    
    // Calculate which keyframes to show based on scroll position
    // const startIndex = Math.min(Math.max(0, this.previewScrollOffset), Math.max(0, numKeyframes - maxVisiblePreviews));
    // const startIndex = 590;
    // const endIndex = Math.min(startIndex + maxVisiblePreviews, numKeyframes);

    // Ensure we have textures for all visible keyframes
    for (let i = 0; i < maxVisiblePreviews; i++) {
      if (currentIndex + i >= this.keyframeTextures.length) {
        this.renderKeyframeToTexture(currentIndex + i);
      }


    posY = this.gui.fullHeight - (i + 1) * (previewSize + previewSpacing);
    
      // 800 x 600
      gl.viewport(posX - 150, posY, 300, 225);

      // Bind the keyframe texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.keyframeTextures[currentIndex + i]);

      this.previewRenderPass.draw();
    }
  }

  private drawScene(x: number, y: number, width: number, height: number): void {
    const gl: WebGLRenderingContext = this.ctx;
    gl.viewport(x, y, width, height);

    this.floorRenderPass.draw();

    /* Draw Scene */
    if (this.scene.meshes.length > 0) {
      this.sceneRenderPass.draw();
      gl.disable(gl.DEPTH_TEST);
      this.skeletonRenderPass.draw();

      // Draw highlighted bone if any
      if (this.gui.getHighlightedBone() >= 0) {
        this.initHighlightBone(); // Regenerate geometry if needed
        this.highlightBoneRenderPass.draw();
      }

      gl.enable(gl.DEPTH_TEST);
    }
  }

  public getGUI(): GUI {
    return this.gui;
  }

  /**
   * Loads and sets the scene from a Collada file
   * @param fileLocation URI for the Collada file
   */
  public setScene(fileLocation: string): void {
    this.loadedScene = fileLocation;
    this.scene = new CLoader(fileLocation);
    this.scene.load(() => this.initScene());
  }

  /* Preview functions*/

  public createFramebufferAndTexture(): { framebuffer: WebGLFramebuffer, texture: WebGLTexture } {
      const gl = this.ctx;
      
      // Create and set up the texture
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA, 
          this.keyframeTextureSize, this.keyframeTextureSize, 
          0, gl.RGBA, gl.UNSIGNED_BYTE, null
      );
      
      // Set texture parameters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      // Create and set up the framebuffer
      const framebuffer = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
          gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
          gl.TEXTURE_2D, texture, 0
      );
      
      // Create and set up depth buffer
      const depthBuffer = gl.createRenderbuffer()!;
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
      gl.renderbufferStorage(
          gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 
          this.keyframeTextureSize, this.keyframeTextureSize
      );
      gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, 
          gl.RENDERBUFFER, depthBuffer
      );
      
      // Check if framebuffer is complete
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          console.error("Framebuffer is not complete!");
      }
      
      // Reset state
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      
      return { framebuffer, texture };
  }

  // render a keyframe to a texture
  public renderKeyframeToTexture(keyframeIndex: number): void {
    if (keyframeIndex >= this.gui.getNumKeyFrames() || this.scene.meshes.length === 0) {
        return;
    }
    
    const gl = this.ctx;
    
    // Create framebuffer and texture for this keyframe if it doesn't exist
    if (keyframeIndex >= this.keyframeTextures.length) {
        const { framebuffer, texture } = this.createFramebufferAndTexture();
        this.keyframeFramebuffers.push(framebuffer);
        this.keyframeTextures.push(texture);
    }
    
    // Apply the keyframe to the mesh temporarily
    const mesh = this.scene.meshes[0];
    const currentMode = this.gui.mode;
    const currentTime = this.gui.getTime();
    
    // Store and temporarily apply the keyframe
    mesh.applyKeyframe(this.gui.getKeyframe(keyframeIndex));
    
    // Bind framebuffer and set viewport
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.keyframeFramebuffers[keyframeIndex]);
    gl.viewport(0, 0, this.keyframeTextureSize, this.keyframeTextureSize);
    
    // Clear color and depth
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Draw the scene with this keyframe applied
    this.drawScene(0, 0, this.keyframeTextureSize, this.keyframeTextureSize);
    
    // Reset state
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // Restore the original state
    if (currentMode === Mode.playback) {
        this.gui.time = currentTime;
        this.gui.updateAnimationPose();
    } else {
        // If in edit mode, restore to current pose
        if (keyframeIndex !== this.gui.getCurrentKeyframeIndex()) {
            mesh.applyKeyframe(this.gui.getKeyframe(this.gui.getCurrentKeyframeIndex()));
        }
    }
  }

  // public renderKeyframePreviews(): void {
  //   if (this.scene.meshes.length === 0 || this.gui.getNumKeyFrames() === 0) {
  //       return;
  //   }
    
  //   const gl = this.ctx;
  //   const numKeyframes = this.gui.getNumKeyFrames();

  //   // Render all keyframes to textures (only if needed)
  //   for (let i = 0; i < numKeyframes; i++) {
  //       if (i >= this.keyframeTextures.length) {
  //           this.renderKeyframeToTexture(i);
  //       }
  //   }
    
  //   // Calculate how many previews fit in the panel
  //   const previewSize = 150; // Size of each preview in pixels
  //   const previewSpacing = 10; // Space between previews
  //   const maxVisiblePreviews = Math.floor(this.gui.fullHeight / (previewSize + previewSpacing));
    
  //   // Calculate which keyframes to show based on scroll position
  //   const startIndex = Math.min(Math.max(0, this.previewScrollOffset), 
  //       Math.max(0, numKeyframes - maxVisiblePreviews));
  //   const endIndex = Math.min(startIndex + maxVisiblePreviews, numKeyframes);
    
  //   // Save the current scissor test state
  //   const scissorTestEnabled = gl.isEnabled(gl.SCISSOR_TEST);
    
  //   // Enable scissor test for the preview panel
  //   gl.enable(gl.SCISSOR_TEST);
    
  //   // Set scissor rectangle for the preview panel
  //   gl.scissor(800, 0, 320, this.gui.fullHeight);
    
  //   // Draw a background for the preview panel
  //   // gl.clearColor(0.9, 0.1, 0.1, 1.0);
  //   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
  //   // Draw each visible keyframe preview
  //   for (let i = startIndex; i < endIndex; i++) {
  //       // Calculate position for this preview
  //       const posY = this.gui.fullHeight - (i - startIndex + 1) * (previewSize + previewSpacing);
  //       const posX = this.gui.fullWidth - this.gui.previewWidth / 2;
        
  //       // Create world matrix for this preview's position and size
  //       const worldMatrix = new Mat4().setIdentity();
  //       worldMatrix.translate(new Vec3([posX, posY, 0]));
  //       worldMatrix.scale(new Vec3([previewSize / 2, previewSize / 2, 1]));
        
  //       // Update the mWorld uniform before drawing
  //       // Instead of directly accessing program, recreate the uniform setup
  //       this.previewRenderPass = new RenderPass(this.extVAO, gl, previewVSText, previewFSText);
        
  //       // Set up the preview render pass again (simplified for this keyframe)
  //       const quadVertices = new Float32Array([
  //           -1, -1, 1, -1, 1, 1, -1, 1
  //       ]);
        
  //       const texCoords = new Float32Array([
  //           0, 1, 1, 1, 1, 0, 0, 0
  //       ]);
        
  //       const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
        
  //       this.previewRenderPass.setIndexBufferData(indices);
  //       this.previewRenderPass.addAttribute("vertPosition", 2, gl.FLOAT, false, 
  //           2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, quadVertices);
  //       this.previewRenderPass.addAttribute("texCoord", 2, gl.FLOAT, false, 
  //           2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, texCoords);
            
  //       // Add uniforms with the current world matrix
  //       this.previewRenderPass.addUniform("mProj", 
  //           (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
  //               const orthoMatrix = new Mat4().setIdentity();
  //               orthoMatrix[0] = 2 / 320;
  //               orthoMatrix[5] = 2 / this.gui.fullHeight;
  //               orthoMatrix[12] = -1;
  //               orthoMatrix[13] = -1;
  //               gl.uniformMatrix4fv(loc, false, new Float32Array(orthoMatrix.all()));
  //           });
            
  //       this.previewRenderPass.addUniform("mWorld", 
  //           (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
  //               gl.uniformMatrix4fv(loc, false, new Float32Array(worldMatrix.all()));
  //           });
            
  //       this.previewRenderPass.addUniform("uTexture", 
  //           (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
  //               gl.uniform1i(loc, 0);
  //           });
            
  //       this.previewRenderPass.setDrawData(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);
  //       this.previewRenderPass.setup();
        
  //       // Bind the keyframe texture
  //       gl.activeTexture(gl.TEXTURE0);
  //       gl.bindTexture(gl.TEXTURE_2D, this.keyframeTextures[i]);
        
  //       // Draw the preview
  //       // this.previewRenderPass.draw();

  //       if (i < this.keyframeTextures.length && this.keyframeTextures[i]) {
  //         gl.activeTexture(gl.TEXTURE0);
  //         gl.bindTexture(gl.TEXTURE_2D, this.keyframeTextures[i]);
  //         this.previewRenderPass.draw();
  //       } else {
  //           console.warn(`No texture available for keyframe ${i}`);
  //       }
        
  //       // If this is the current keyframe in edit mode, highlight it
  //       if (this.gui.mode === Mode.edit && i === this.gui.getCurrentKeyframeIndex()) {
  //           // You could implement a highlight here if needed
  //       }
  //   }
    
  //   // Restore scissor test to its original state
  //   if (!scissorTestEnabled) {
  //       gl.disable(gl.SCISSOR_TEST);
  //   }
    
  //   // Reset scissor to full canvas if needed
  //   gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);
  // }

}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: SkinningAnimation = new SkinningAnimation(canvas);
  canvasAnimation.start();
  canvasAnimation.setScene("./static/assets/skinning/split_cube.dae");
}
