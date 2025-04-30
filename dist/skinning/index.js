// import { ClothAnimation } from "./ClothAnimation.js";
// export function initializeCanvas(): void {
//   const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
//   /* Start drawing */
//   const canvasAnimation: ClothAnimation = new ClothAnimation(canvas);
//   canvasAnimation.start();
// }
// initializeCanvas();
import { ClothAnimation } from "./ClothAnimation.js";
import { ClothControls } from "./ClothControls.js";
export function initializeCanvas() {
    const canvas = document.getElementById("glCanvas");
    /* Start cloth animation */
    const clothAnimation = new ClothAnimation(canvas);
    /* Initialize UI controls */
    const clothControls = new ClothControls(clothAnimation);
    /* Start animation loop */
    clothAnimation.start();
}
// Initialize when page loads
window.onload = initializeCanvas;
//# sourceMappingURL=index.js.map